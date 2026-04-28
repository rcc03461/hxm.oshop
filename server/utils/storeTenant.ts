import { createError, getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import { parseTenantSlugFromHost } from '../../app/utils/tenantHost'
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
