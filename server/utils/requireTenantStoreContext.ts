import { createError, getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import { parseTenantSlugFromHost } from '../../app/utils/tenantHost'
import { tryResolveStoreTenant } from './resolveStoreTenantFromHost'

export async function requireTenantStoreContext(event: H3Event): Promise<{
  tenantId: string
  shopSlug: string
}> {
  const config = useRuntimeConfig(event)
  const root = String(config.public.tenantRootDomain || 'shopgo.com.hk')
  const rawHost = getRequestURL(event).host

  const resolved = await tryResolveStoreTenant(event)
  if (!resolved?.id || !resolved?.shopSlug) {
    const slug = parseTenantSlugFromHost(rawHost, root)
    if (slug) {
      throw createError({ statusCode: 404, message: '找不到對應商店' })
    }
    throw createError({
      statusCode: 403,
      message: '此功能僅限租戶子網域使用',
    })
  }

  return { tenantId: resolved.id, shopSlug: resolved.shopSlug }
}
