import { requireStoreCustomerSession } from '../../utils/requireStoreCustomerSession'

export default defineEventHandler(async (event) => {
  const { customer } = await requireStoreCustomerSession(event)
  return {
    profile: {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName ?? '',
      phone: customer.phone ?? '',
    },
  }
})
