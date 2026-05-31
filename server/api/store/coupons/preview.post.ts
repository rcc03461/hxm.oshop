import { createError, readBody } from 'h3'
import { getDb } from '../../../utils/db'
import { applyCouponToCheckout } from '../../../utils/storeCouponApply'
import { resolveCheckoutLines } from '../../../utils/storeCheckoutResolveLines'
import { storeCouponPreviewBodySchema } from '../../../utils/storeCheckoutSchemas'
import { requireAccessibleStoreTenant } from '../../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireAccessibleStoreTenant(event)
  const raw = await readBody(event)
  const parsed = storeCouponPreviewBodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '驗證失敗',
    })
  }

  const db = getDb(event)
  const { lines } = await resolveCheckoutLines(db, tenant.id, parsed.data.items)
  const applied = await applyCouponToCheckout(db, tenant.id, parsed.data.code, lines)

  return {
    ok: true as const,
    coupon: {
      id: applied.couponId,
      code: applied.code,
      name: applied.name,
      discountType: applied.discountType,
    },
    subtotal: applied.subtotal,
    eligibleSubtotal: applied.eligibleSubtotal,
    discountAmount: applied.discountAmount,
    total: applied.total,
  }
})
