import { and, eq, inArray } from 'drizzle-orm'
import { createError } from 'h3'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

type Db = PostgresJsDatabase<typeof schema>

export function dedupeProductIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/** 覆寫優惠碼適用商品；空陣列表示全店商品皆可計入 */
export async function syncCouponProducts(
  db: Db,
  tenantId: string,
  couponId: string,
  productIds: string[],
) {
  const uniqueOrdered = dedupeProductIds(productIds)

  if (uniqueOrdered.length > 0) {
    const rows = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.tenantId, tenantId),
          inArray(schema.products.id, uniqueOrdered),
        ),
      )
    if (rows.length !== uniqueOrdered.length) {
      throw createError({
        statusCode: 400,
        message: '部分商品不存在或不屬於此商店',
      })
    }
  }

  await db
    .delete(schema.couponProducts)
    .where(eq(schema.couponProducts.couponId, couponId))

  if (uniqueOrdered.length > 0) {
    await db.insert(schema.couponProducts).values(
      uniqueOrdered.map((productId, i) => ({
        couponId,
        productId,
        sortOrder: i,
      })),
    )
  }

  await db
    .update(schema.coupons)
    .set({ updatedAt: new Date() })
    .where(
      and(eq(schema.coupons.id, couponId), eq(schema.coupons.tenantId, tenantId)),
    )
}
