import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../database/schema'
import { couponCodeSchema } from './couponSchemas'
import {
  compareDecimal,
  decimalMin,
  decimalSub,
  sumDecimals,
} from './decimalMoney'
import type { ResolvedOrderLine } from './storeCheckoutResolveLines'
import type { ShopDb } from './storeCheckoutResolveLines'

export type CouponApplyResult = {
  couponId: string
  code: string
  name: string
  discountType: 'fixed' | 'percent'
  eligibleSubtotal: string
  discountAmount: string
  subtotal: string
  total: string
}

function normalizeCouponCode(raw: string): string {
  const parsed = couponCodeSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '優惠碼格式不正確',
    })
  }
  return parsed.data
}

function computeDiscountAmount(
  discountType: string,
  discountValue: string,
  eligibleSubtotal: string,
): string {
  if (compareDecimal(eligibleSubtotal, '0') <= 0) {
    return '0.0000'
  }
  if (discountType === 'fixed') {
    return decimalMin(discountValue, eligibleSubtotal)
  }
  const raw = Number(eligibleSubtotal) * (Number(discountValue) / 100)
  if (!Number.isFinite(raw) || raw < 0) {
    throw createError({ statusCode: 400, message: '折扣計算異常' })
  }
  return Math.min(Number(eligibleSubtotal), raw).toFixed(4)
}

export async function applyCouponToCheckout(
  db: ShopDb,
  tenantId: string,
  codeInput: string,
  lines: ResolvedOrderLine[],
): Promise<CouponApplyResult> {
  const code = normalizeCouponCode(codeInput)
  const subtotal = sumDecimals(lines.map((l) => l.lineTotal))

  const [coupon] = await db
    .select()
    .from(schema.coupons)
    .where(and(eq(schema.coupons.tenantId, tenantId), eq(schema.coupons.code, code)))
    .limit(1)

  if (!coupon) {
    throw createError({ statusCode: 400, message: '優惠碼不存在' })
  }
  if (coupon.status !== 'active') {
    throw createError({ statusCode: 400, message: '此優惠碼已停用' })
  }

  const now = Date.now()
  if (now < coupon.startsAt.getTime() || now > coupon.endsAt.getTime()) {
    throw createError({ statusCode: 400, message: '優惠碼不在有效期限內' })
  }

  const restricted = await db
    .select({ productId: schema.couponProducts.productId })
    .from(schema.couponProducts)
    .where(eq(schema.couponProducts.couponId, coupon.id))

  const restrictedSet =
    restricted.length > 0 ? new Set(restricted.map((r) => r.productId)) : null

  const eligibleLines = restrictedSet
    ? lines.filter((l) => restrictedSet.has(l.productId))
    : lines

  if (restrictedSet && eligibleLines.length === 0) {
    throw createError({
      statusCode: 400,
      message: '購物車內沒有適用此優惠碼的商品',
    })
  }

  const eligibleSubtotal = sumDecimals(eligibleLines.map((l) => l.lineTotal))

  if (coupon.minOrderAmount) {
    const min = String(coupon.minOrderAmount)
    if (compareDecimal(eligibleSubtotal, min) < 0) {
      throw createError({
        statusCode: 400,
        message: `未達最低消費 $${min}（適用商品小計 $${eligibleSubtotal}）`,
      })
    }
  }

  const discountAmount = computeDiscountAmount(
    coupon.discountType,
    String(coupon.discountValue),
    eligibleSubtotal,
  )

  if (compareDecimal(discountAmount, '0') <= 0) {
    throw createError({ statusCode: 400, message: '此訂單無法套用優惠' })
  }

  const total = decimalSub(subtotal, discountAmount)

  return {
    couponId: coupon.id,
    code: coupon.code,
    name: coupon.name,
    discountType: coupon.discountType === 'percent' ? 'percent' : 'fixed',
    eligibleSubtotal,
    discountAmount,
    subtotal,
    total,
  }
}

/** 將折扣按比例分攤到各列，使 lineTotal 加總等於 paymentTotal（供 Stripe 等金流使用） */
export function scaleOrderLinesToPaymentTotal(
  lines: ResolvedOrderLine[],
  paymentTotal: string,
): ResolvedOrderLine[] {
  const subtotal = sumDecimals(lines.map((l) => l.lineTotal))
  if (subtotal === paymentTotal) {
    return lines.map((l) => ({ ...l }))
  }
  if (compareDecimal(subtotal, '0') <= 0) {
    return lines.map((l) => ({ ...l }))
  }

  const target = Number(paymentTotal)
  const source = Number(subtotal)
  if (!Number.isFinite(target) || !Number.isFinite(source) || target < 0) {
    throw createError({ statusCode: 400, message: '結帳金額異常' })
  }

  const ratio = target / source
  const scaled: ResolvedOrderLine[] = []
  let allocated = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (i === lines.length - 1) {
      const lineTotal = (target - allocated).toFixed(4)
      const unitPrice = (Number(lineTotal) / line.quantity).toFixed(4)
      scaled.push({ ...line, lineTotal, unitPrice })
      break
    }
    const lineTotal = (Number(line.lineTotal) * ratio).toFixed(4)
    allocated += Number(lineTotal)
    const unitPrice = (Number(lineTotal) / line.quantity).toFixed(4)
    scaled.push({ ...line, lineTotal, unitPrice })
  }

  return scaled
}
