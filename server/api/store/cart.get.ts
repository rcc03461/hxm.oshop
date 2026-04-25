import { getStoreCartLines, resolveStoreCartContext } from '../../utils/storeCartService'

export default defineEventHandler(async (event) => {
  const ctx = await resolveStoreCartContext(event)
  const lines = await getStoreCartLines(event, ctx.tenantId, ctx.cartId)
  return { lines }
})
