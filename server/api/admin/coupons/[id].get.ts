import { and, asc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('優惠碼 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }
  const couponId = idParsed.data

  const db = getDb(event)

  const [row] = await db
    .select()
    .from(schema.coupons)
    .where(
      and(
        eq(schema.coupons.id, couponId),
        eq(schema.coupons.tenantId, session.tenantId),
      ),
    )
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, message: '找不到優惠碼' })
  }

  const productRows = await db
    .select({
      productId: schema.couponProducts.productId,
      title: schema.products.title,
    })
    .from(schema.couponProducts)
    .innerJoin(
      schema.products,
      eq(schema.couponProducts.productId, schema.products.id),
    )
    .where(eq(schema.couponProducts.couponId, couponId))
    .orderBy(
      asc(schema.couponProducts.sortOrder),
      asc(schema.products.title),
    )

  return {
    coupon: row,
    productIds: productRows.map((p) => p.productId),
    products: productRows.map((p) => ({
      id: p.productId,
      title: p.title,
    })),
  }
})
