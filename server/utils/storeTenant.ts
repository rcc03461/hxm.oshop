import { eq } from 'drizzle-orm'
import { createError, getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import { parseTenantSlugFromHost } from '../../app/utils/tenantHost'
import * as schema from '../database/schema'
import { getDb } from './db'
import { assertStoreAccess } from './storeAccess'
import { tryResolveStoreTenant } from './resolveStoreTenantFromHost'

/**
 * 公開店舖 API：依請求 Host 解析子網域 slug 並載入租戶（無需登入）。
 */
export async function requireStoreTenant(event: H3Event) {
  const config = useRuntimeConfig(event)
  const root = String(config.public.tenantRootDomain || 'shopgo.com.hk')
  const rawHost = getRequestURL(event).host

  const resolved = await tryResolveStoreTenant(event)
  if (!resolved?.id || !resolved?.shopSlug) {
    const slug = parseTenantSlugFromHost(rawHost, root)
    if (slug) {
      throw createError({ statusCode: 404, message: '找不到商店' })
    }
    throw createError({
      statusCode: 404,
      message: '請使用商店子網域存取',
    })
  }

  return { id: resolved.id, shopSlug: resolved.shopSlug }
}

/** 公開店舖 API：解析租戶並確認商店已開放或已通過看店密碼。 */
export async function requireAccessibleStoreTenant(event: H3Event) {
  const tenant = await requireStoreTenant(event)
  const db = getDb(event)

  const [row] = await db
    .select({ settings: schema.tenants.settings })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenant.id))
    .limit(1)

  const settings =
    row && typeof row.settings === 'object' && row.settings
      ? (row.settings as Record<string, unknown>)
      : {}

  await assertStoreAccess(event, tenant.id, settings)

  return { ...tenant, settings }
}
