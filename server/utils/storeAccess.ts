import bcrypt from 'bcryptjs'
import { createError, getCookie, getRequestHeader, setCookie, deleteCookie } from 'h3'
import type { H3Event } from 'h3'
import { SignJWT, jwtVerify } from 'jose'
import { AUTH_COOKIE, verifySessionToken } from './authJwt'
import { tryResolveStoreTenant } from './resolveStoreTenantFromHost'

export const STORE_VIEW_COOKIE = 'oshop_store_view'

export type StoreAccessReason = 'closed' | 'password_required'

export type StoreAccessStatus = {
  storeEnabled: boolean
  requiresPassword: boolean
  hasAccess: boolean
  reason?: StoreAccessReason
}

function getSecret(event: H3Event) {
  const fromConfig = useRuntimeConfig(event).jwtSecret as string | undefined
  const secret =
    fromConfig?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.NUXT_JWT_SECRET?.trim() ||
    ''
  if (!secret) {
    throw createError({
      statusCode: 500,
      message:
        '伺服器未設定 JWT_SECRET：請在 .env 設定後重新啟動；正式環境亦可使用 NUXT_JWT_SECRET',
    })
  }
  return new TextEncoder().encode(secret)
}

function resolveStoreViewCookieDomain(event: H3Event): string | undefined {
  const config = useRuntimeConfig(event)
  const root = (config.public?.tenantRootDomain as string | undefined)
    ?.trim()
    .toLowerCase()
  if (!root) return undefined

  const raw = getRequestHeader(event, 'host') || ''
  const host = raw.split(':')[0]?.toLowerCase() || ''
  if (!host || host === 'localhost' || host === '127.0.0.1') return undefined

  if (host === root || host.endsWith(`.${root}`)) {
    return `.${root}`
  }
  return undefined
}

export function getStoreVisibilityFlags(settings: Record<string, unknown>) {
  const storeEnabled = settings.storeEnabled === true
  const storeViewPasswordHash =
    typeof settings.storeViewPasswordHash === 'string'
      ? settings.storeViewPasswordHash
      : ''
  const hasPassword = storeViewPasswordHash.length > 0
  return { storeEnabled, hasPassword, storeViewPasswordHash }
}

async function tryGetAdminSessionForStore(event: H3Event) {
  const token = getCookie(event, AUTH_COOKIE)
  if (!token) return null
  try {
    const session = await verifySessionToken(event, token)
    const resolved = await tryResolveStoreTenant(event)
    if (
      !resolved ||
      resolved.id !== session.tenantId ||
      resolved.shopSlug !== session.shopSlug
    ) {
      return null
    }
    return session
  } catch {
    return null
  }
}

async function hasValidStoreViewCookie(event: H3Event, tenantId: string) {
  const token = getCookie(event, STORE_VIEW_COOKIE)
  if (!token) return false
  try {
    const secret = getSecret(event)
    const { payload } = await jwtVerify(token, secret)
    return payload.tenantId === tenantId && payload.purpose === 'store_view'
  } catch {
    return false
  }
}

export async function getStoreAccessStatus(
  event: H3Event,
  tenantId: string,
  settings: Record<string, unknown>,
): Promise<StoreAccessStatus> {
  const { storeEnabled, hasPassword } = getStoreVisibilityFlags(settings)

  const adminSession = await tryGetAdminSessionForStore(event)
  if (adminSession?.tenantId === tenantId) {
    return { storeEnabled, requiresPassword: hasPassword, hasAccess: true }
  }

  if (await hasValidStoreViewCookie(event, tenantId)) {
    return { storeEnabled, requiresPassword: hasPassword, hasAccess: true }
  }

  if (storeEnabled && !hasPassword) {
    return { storeEnabled: true, requiresPassword: false, hasAccess: true }
  }

  if (!storeEnabled && !hasPassword) {
    return {
      storeEnabled: false,
      requiresPassword: false,
      hasAccess: false,
      reason: 'closed',
    }
  }

  return {
    storeEnabled,
    requiresPassword: true,
    hasAccess: false,
    reason: 'password_required',
  }
}

export async function assertStoreAccess(
  event: H3Event,
  tenantId: string,
  settings: Record<string, unknown>,
) {
  const status = await getStoreAccessStatus(event, tenantId, settings)
  if (status.hasAccess) return

  throw createError({
    statusCode: 403,
    message:
      status.reason === 'closed' ? '商店尚未開放' : '請輸入看店密碼',
    data: { code: status.reason },
  })
}

export async function verifyStoreViewPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (!plain || !hash) return false
  return bcrypt.compare(plain, hash)
}

export async function hashStoreViewPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function setStoreViewCookie(event: H3Event, tenantId: string) {
  const secret = getSecret(event)
  const token = await new SignJWT({ tenantId, purpose: 'store_view' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)

  const domain = resolveStoreViewCookieDomain(event)
  const secure = process.env.NODE_ENV === 'production'

  setCookie(event, STORE_VIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: 60 * 60 * 24 * 30,
    ...(domain ? { domain } : {}),
  })
}

export function clearStoreViewCookie(event: H3Event) {
  deleteCookie(event, STORE_VIEW_COOKIE, { path: '/' })
  const domain = resolveStoreViewCookieDomain(event)
  if (domain) {
    deleteCookie(event, STORE_VIEW_COOKIE, { path: '/', domain })
    const normalized = domain.startsWith('.') ? domain.slice(1) : domain
    if (normalized) {
      deleteCookie(event, STORE_VIEW_COOKIE, { path: '/', domain: normalized })
    }
  }
}
