import { parseTenantSlugFromHost } from '~/utils/tenantHost'
import { getRequestHostForMiddleware } from '~/utils/requestHost'

/**
 * 依 Host 解析租戶 slug：子網域直接解析；否則向 API 取得 canonical slug（自訂網域）
 */
export default defineNuxtRouteMiddleware(async () => {
  const state = useState<string | null>('oshop-tenant-slug', () => null)
  if (import.meta.client) {
    const nuxtApp = useNuxtApp()
    // SSR 頁面 hydration 期間沿用注水狀態；CSR-only route 沒有 SSR state，仍須從 window.location 解析。
    if (nuxtApp.isHydrating && nuxtApp.payload.serverRendered) return
  }

  const config = useRuntimeConfig()
  const root = String(config.public.tenantRootDomain || 'shopgo.com.hk')
  const host = getRequestHostForMiddleware()
  const slug = parseTenantSlugFromHost(host, root)
  if (slug !== null) {
    state.value = slug
    return
  }

  const requestFetch = useRequestFetch()
  try {
    const res = await requestFetch<{ shopSlug: string | null }>('/api/store/host-context')
    state.value = res.shopSlug ?? null
  } catch {
    state.value = null
  }
})
