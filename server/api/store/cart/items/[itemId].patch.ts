import { and, eq } from 'drizzle-orm'
import * as schema from '../../../../database/schema'
import { getDb } from '../../../../utils/db'
import {
  getStoreCartLines,
  resolveStoreCartContext,
} from '../../../../utils/storeCartService'
import { storeCartPatchItemSchema } from '../../../../utils/storeCartSchemas'

export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'itemId')
  if (!itemId) {
    throw createError({ statusCode: 400, message: '缺少 itemId' })
  }

  const raw = await readBody(event)
  const parsed = storeCartPatchItemSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const ctx = await resolveStoreCartContext(event)
  const db = getDb(event)
  const existed = await db
    .select({ id: schema.shopCartLines.id })
    .from(schema.shopCartLines)
    .where(
      and(
        eq(schema.shopCartLines.id, itemId),
        eq(schema.shopCartLines.cartId, ctx.cartId),
      ),
    )
    .limit(1)
  if (!existed[0]) {
    throw createError({ statusCode: 404, message: '找不到購物車項目' })
  }

  await db
    .update(schema.shopCartLines)
    .set({
      quantity: parsed.data.quantity,
      updatedAt: new Date(),
    })
    .where(eq(schema.shopCartLines.id, itemId))

  const lines = await getStoreCartLines(event, ctx.tenantId, ctx.cartId)
  return { ok: true as const, lines }
})
