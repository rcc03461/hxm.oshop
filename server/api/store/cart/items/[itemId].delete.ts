import { and, eq } from 'drizzle-orm'
import * as schema from '../../../../database/schema'
import { getDb } from '../../../../utils/db'
import {
  getStoreCartLines,
  resolveStoreCartContext,
} from '../../../../utils/storeCartService'

export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'itemId')
  if (!itemId) {
    throw createError({ statusCode: 400, message: '缺少 itemId' })
  }

  const ctx = await resolveStoreCartContext(event)
  const db = getDb(event)

  await db
    .delete(schema.shopCartLines)
    .where(
      and(
        eq(schema.shopCartLines.id, itemId),
        eq(schema.shopCartLines.cartId, ctx.cartId),
      ),
    )

  const lines = await getStoreCartLines(event, ctx.cartId)
  return { ok: true as const, lines }
})
