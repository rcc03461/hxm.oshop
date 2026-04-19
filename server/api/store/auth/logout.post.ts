import { clearCustomerSessionCookie } from '../../../utils/customerAuthCookie'

export default defineEventHandler(async (event) => {
  clearCustomerSessionCookie(event)
  return { ok: true as const }
})
