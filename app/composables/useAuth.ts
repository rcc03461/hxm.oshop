export type AuthUser = {
  id: string
  email: string
  tenantId: string
  shopSlug: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('oshop-auth-user', () => null)

  async function refresh() {
    try {
      const res = await $fetch<{ user: AuthUser | null }>('/api/auth/me')
      user.value = res.user
    } catch {
      user.value = null
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, refresh, logout }
}
