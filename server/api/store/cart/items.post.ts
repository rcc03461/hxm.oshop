import { and, eq, isNull } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import {
  fetchProductSnapshots,
  getStoreCartLines,
  resolveStoreCartContext,
} from '../../../utils/storeCartService'
import { storeCartAddItemSchema } from '../../../utils/storeCartSchemas'

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = storeCartAddItemSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const input = parsed.data
  const ctx = await resolveStoreCartContext(event)
  const snapshot = await fetchProductSnapshots(
    event,
    ctx.tenantId,
    input.productId,
    input.variantId ?? null,
  )
  if (!snapshot) {
    throw createError({ statusCode: 404, message: '商品或規格不存在' })
  }

  const db = getDb(event)
  const matched = await db
    .select({
      id: schema.shopCartLines.id,
      qty: schema.shopCartLines.quantity,
    })
    .from(schema.shopCartLines)
    .where(
      and(
        eq(schema.shopCartLines.cartId, ctx.cartId),
        eq(schema.shopCartLines.productId, snapshot.productId),
        snapshot.variantId
          ? eq(schema.shopCartLines.productVariantId, snapshot.variantId)
          : isNull(schema.shopCartLines.productVariantId),
      ),
    )
    .limit(1)

  const existed = matched[0]
  if (existed) {
    await db
      .update(schema.shopCartLines)
      .set({
        quantity: Math.min(99, existed.qty + input.quantity),
        updatedAt: new Date(),
      })
      .where(eq(schema.shopCartLines.id, existed.id))
  } else {
    await db.insert(schema.shopCartLines).values({
      cartId: ctx.cartId,
      productId: snapshot.productId,
      productVariantId: snapshot.variantId,
      quantity: input.quantity,
      titleSnapshot: snapshot.title,
      productSlugSnapshot: snapshot.productSlug,
      unitPriceSnapshot: snapshot.unitPrice,
      optionSummary: input.optionSummary ?? null,
    })
  }

  const lines = await getStoreCartLines(event, ctx.tenantId, ctx.cartId)
  return { ok: true as const, lines }
})
