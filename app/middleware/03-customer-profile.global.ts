/**
 * 保護會員中心路由：/profile* 必須在租戶子網域且已登入會員。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/profile')) return

  const tenantSlug = useState<string | null>('oshop-tenant-slug')
  if (!tenantSlug.value) {
    return navigateTo('/')
  }

  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const me = await $fetch<{ customer: { id: string } | null }>('/api/store/auth/me', {
    headers,
    credentials: import.meta.client ? 'include' : 'same-origin',
  })

  if (!me.customer) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
