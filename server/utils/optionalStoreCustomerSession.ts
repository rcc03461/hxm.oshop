import { getCookie } from 'h3'
import type { H3Event } from 'h3'
import { CUSTOMER_AUTH_COOKIE, verifyCustomerSessionToken } from './customerAuthJwt'

export async function getOptionalStoreCustomerSession(event: H3Event): Promise<{
  customerId: string
  email: string
} | null> {
  const token = getCookie(event, CUSTOMER_AUTH_COOKIE)
  if (!token) return null
  try {
    const session = await verifyCustomerSessionToken(event, token)
    return {
      customerId: session.sub,
      email: session.email,
    }
  } catch {
    return null
  }
}
