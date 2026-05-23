import { and, eq } from 'drizzle-orm'
import { createError, isError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { adminPatchCouponBodySchema } from '../../../utils/couponSchemas'
import { syncCouponProducts } from '../../../utils/couponProductSync'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('優惠碼 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }
  const couponId = idParsed.data

  const body = await readBody(event)
  const parsed = adminPatchCouponBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, message: '沒有要更新的欄位' })
  }

  const db = getDb(event)

  try {
    const [existing] = await db
      .select()
      .from(schema.coupons)
      .where(
        and(
          eq(schema.coupons.id, couponId),
          eq(schema.coupons.tenantId, session.tenantId),
        ),
      )
      .limit(1)

    if (!existing) {
      throw createError({ statusCode: 404, message: '找不到優惠碼' })
    }

    const nextStarts = patch.startsAt ?? existing.startsAt
    const nextEnds = patch.endsAt ?? existing.endsAt
    if (nextEnds.getTime() < nextStarts.getTime()) {
      throw createError({ statusCode: 400, message: '結束時間不可早於開始時間' })
    }

    const nextDiscountType = patch.discountType ?? existing.discountType
    const nextDiscountValue = patch.discountValue ?? existing.discountValue
    if (nextDiscountType === 'fixed') {
      if (!(Number(nextDiscountValue) > 0)) {
        throw createError({ statusCode: 400, message: '減免金額須大於 0' })
      }
    } else {
      const n = Number(nextDiscountValue)
      if (!(n > 0 && n <= 100)) {
        throw createError({
          statusCode: 400,
          message: '折扣百分比須介於 0 與 100 之間',
        })
      }
    }

    const next: Partial<typeof schema.coupons.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (patch.name !== undefined) next.name = patch.name
    if (patch.code !== undefined) next.code = patch.code
    if (patch.description !== undefined) next.description = patch.description
    if (patch.startsAt !== undefined) next.startsAt = patch.startsAt
    if (patch.endsAt !== undefined) next.endsAt = patch.endsAt
    if ('minOrderAmount' in patch) next.minOrderAmount = patch.minOrderAmount ?? null
    if (patch.discountType !== undefined) next.discountType = patch.discountType
    if (patch.discountValue !== undefined) next.discountValue = patch.discountValue
    if (patch.status !== undefined) next.status = patch.status

    const [updated] = await db
      .update(schema.coupons)
      .set(next)
      .where(
        and(
          eq(schema.coupons.id, couponId),
          eq(schema.coupons.tenantId, session.tenantId),
        ),
      )
      .returning()

    if (!updated) {
      throw createError({ statusCode: 404, message: '找不到優惠碼' })
    }

    if (patch.productIds !== undefined) {
      await syncCouponProducts(
        db,
        session.tenantId,
        couponId,
        patch.productIds,
      )
    }

    return { coupon: updated }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此優惠碼代號已被使用' })
    }
    console.error('[admin/coupons PATCH]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '更新優惠碼失敗' })
  }
})
