import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { adminCreateCouponBodySchema } from '../../../utils/couponSchemas'
import { syncCouponProducts } from '../../../utils/couponProductSync'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const body = await readBody(event)
  const parsed = adminCreateCouponBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const data = parsed.data
  const db = getDb(event)

  try {
    const [row] = await db
      .insert(schema.coupons)
      .values({
        tenantId: session.tenantId,
        name: data.name,
        code: data.code,
        description: data.description ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        minOrderAmount: data.minOrderAmount ?? null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        status: data.status,
        updatedAt: new Date(),
      })
      .returning()

    if (!row) {
      throw createError({ statusCode: 500, message: '建立優惠碼失敗' })
    }

    await syncCouponProducts(
      db,
      session.tenantId,
      row.id,
      data.productIds ?? [],
    )

    return { coupon: row }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此優惠碼代號已被使用' })
    }
    console.error('[admin/coupons POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立優惠碼失敗' })
  }
})
