import { getStoreCartLines, mergeSessionCartIntoCustomerCart, resolveStoreCartContext } from '../../../utils/storeCartService'

export default defineEventHandler(async (event) => {
  const ctx = await resolveStoreCartContext(event)
  if (!ctx.customerId) {
    throw createError({ statusCode: 401, message: '尚未登入會員' })
  }

  await mergeSessionCartIntoCustomerCart(event, ctx.tenantId, ctx.customerId)
  const refreshed = await resolveStoreCartContext(event)
  const lines = await getStoreCartLines(event, refreshed.tenantId, refreshed.cartId)
  return { ok: true as const, lines }
})
