import { and, count, eq, inArray, ne } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../database/schema'
import type { ShopDb } from './storeCheckoutResolveLines'

/** 付款失敗的訂單不計入已使用次數 */
const COUPON_USE_EXCLUDED_ORDER_STATUS = 'payment_failed'

export async function countCouponUses(db: ShopDb, couponId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.couponId, couponId),
        ne(schema.shopOrders.status, COUPON_USE_EXCLUDED_ORDER_STATUS),
      ),
    )
  return Number(row?.total ?? 0)
}

export async function countCouponUsesByIds(
  db: ShopDb,
  couponIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (couponIds.length === 0) return map

  const rows = await db
    .select({
      couponId: schema.shopOrders.couponId,
      total: count(),
    })
    .from(schema.shopOrders)
    .where(
      and(
        inArray(schema.shopOrders.couponId, couponIds),
        ne(schema.shopOrders.status, COUPON_USE_EXCLUDED_ORDER_STATUS),
      ),
    )
    .groupBy(schema.shopOrders.couponId)

  for (const row of rows) {
    if (row.couponId) {
      map.set(row.couponId, Number(row.total ?? 0))
    }
  }
  return map
}

export async function assertCouponUsesAvailable(
  db: ShopDb,
  couponId: string,
  maxUses: number | null,
): Promise<number> {
  if (maxUses == null) {
    return countCouponUses(db, couponId)
  }

  const usedCount = await countCouponUses(db, couponId)
  if (usedCount >= maxUses) {
    throw createError({
      statusCode: 400,
      message: `此優惠碼已達使用上限（${maxUses} 次）`,
    })
  }
  return usedCount
}

export async function assertMaxUsesNotBelowUsed(
  db: ShopDb,
  couponId: string,
  maxUses: number | null,
) {
  if (maxUses == null) return
  const usedCount = await countCouponUses(db, couponId)
  if (usedCount > maxUses) {
    throw createError({
      statusCode: 400,
      message: `使用次數上限不可低於已使用次數（已使用 ${usedCount} 次）`,
    })
  }
}
