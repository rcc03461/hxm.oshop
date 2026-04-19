import type { H3Event } from 'h3'
import { deleteCookie, getRequestHeader, setCookie } from 'h3'
import { CUSTOMER_AUTH_COOKIE } from './customerAuthJwt'

const SESSION_MAX_AGE = 60 * 60 * 24 * 14

function resolveSessionCookieDomain(event: H3Event): string | undefined {
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

export function setCustomerSessionCookie(event: H3Event, token: string) {
  const domain = resolveSessionCookieDomain(event)
  const secure = process.env.NODE_ENV === 'production'

  setCookie(event, CUSTOMER_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: SESSION_MAX_AGE,
    ...(domain ? { domain } : {}),
  })
}

export function clearCustomerSessionCookie(event: H3Event) {
  const domain = resolveSessionCookieDomain(event)
  deleteCookie(event, CUSTOMER_AUTH_COOKIE, {
    path: '/',
  })

  if (domain) {
    deleteCookie(event, CUSTOMER_AUTH_COOKIE, {
      path: '/',
      domain,
    })

    const normalized = domain.startsWith('.') ? domain.slice(1) : domain
    if (normalized) {
      deleteCookie(event, CUSTOMER_AUTH_COOKIE, {
        path: '/',
        domain: normalized,
      })
    }
  }
}
