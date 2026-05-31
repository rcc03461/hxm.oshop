/**
 * 商店前台存取控制：未開放或未通過看店密碼時導向 /store-gate。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/admin')) return
  if (to.path === '/store-gate') return

  const tenantSlug = useState<string | null>('oshop-tenant-slug')
  if (!tenantSlug.value) return

  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const requestFetch = useRequestFetch()

  try {
    const status = await requestFetch<{
      hasAccess: boolean
    }>('/api/store/access-status', {
      headers,
      credentials: import.meta.client ? 'include' : 'same-origin',
    })

    if (status.hasAccess) return
  } catch {
    return navigateTo('/store-gate')
  }

  const redirect = to.fullPath !== '/' ? to.fullPath : undefined
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
  return navigateTo(`/store-gate${query}`)
})
