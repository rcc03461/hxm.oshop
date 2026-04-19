export type CustomerAuthUser = {
  id: string
  email: string
  fullName: string | null
}

export function useCustomerAuth() {
  const customer = useState<CustomerAuthUser | null>('oshop-customer-user', () => null)

  async function refresh() {
    try {
      const res = await $fetch<{ customer: CustomerAuthUser | null }>(
        '/api/store/auth/me',
      )
      customer.value = res.customer
    } catch {
      customer.value = null
    }
  }

  async function logout() {
    await $fetch('/api/store/auth/logout', { method: 'POST' })
    customer.value = null
  }

  return { customer, refresh, logout }
}
