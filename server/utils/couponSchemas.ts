import { z } from 'zod'
import { decimalStringSchema } from './productSchemas'

export const couponStatusSchema = z.enum(['active', 'inactive'], {
  message: '優惠碼狀態不正確',
})

export const couponDiscountTypeSchema = z.enum(['fixed', 'percent'], {
  message: '折扣類型不正確',
})

/** 優惠碼代號：英數與連字號，儲存時轉大寫 */
export const couponCodeSchema = z
  .string()
  .trim()
  .min(2, '優惠碼至少 2 個字元')
  .max(64, '優惠碼過長')
  .regex(/^[A-Za-z0-9-]+$/, '優惠碼只能使用英文、數字與連字號')
  .transform((v) => v.toUpperCase())

const isoDateSchema = z
  .string()
  .trim()
  .min(1, '請填寫日期時間')
  .refine((v) => !Number.isNaN(Date.parse(v)), '日期時間格式不正確')
  .transform((v) => new Date(v))

const optionalMinOrderSchema = z
  .union([decimalStringSchema, z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v))

const productIdsSchema = z.array(z.string().uuid()).max(500, '適用商品過多')

function validateDiscount(
  discountType: 'fixed' | 'percent',
  discountValue: string,
  ctx: z.RefinementCtx,
) {
  if (discountType === 'fixed') {
    const n = Number(discountValue)
    if (!(n > 0)) {
      ctx.addIssue({
        code: 'custom',
        message: '減免金額須大於 0',
        path: ['discountValue'],
      })
    }
    return
  }
  const n = Number(discountValue)
  if (!(n > 0 && n <= 100)) {
    ctx.addIssue({
      code: 'custom',
      message: '折扣百分比須介於 0 與 100 之間',
      path: ['discountValue'],
    })
  }
}

function validatePeriod(startsAt: Date, endsAt: Date, ctx: z.RefinementCtx) {
  if (endsAt.getTime() < startsAt.getTime()) {
    ctx.addIssue({
      code: 'custom',
      message: '結束時間不可早於開始時間',
      path: ['endsAt'],
    })
  }
}

const couponBodyBase = z.object({
  name: z.string().trim().min(1, '請填寫名稱').max(255),
  code: couponCodeSchema,
  description: z
    .string()
    .trim()
    .max(20000)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  minOrderAmount: optionalMinOrderSchema,
  discountType: couponDiscountTypeSchema,
  discountValue: decimalStringSchema,
  status: couponStatusSchema.optional().default('active'),
  productIds: productIdsSchema.optional().default([]),
})

export const adminCreateCouponBodySchema = couponBodyBase.superRefine(
  (data, ctx) => {
    validatePeriod(data.startsAt, data.endsAt, ctx)
    validateDiscount(data.discountType, data.discountValue, ctx)
  },
)

export const adminPatchCouponBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    code: couponCodeSchema.optional(),
    description: z
      .string()
      .trim()
      .max(20000)
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
    startsAt: isoDateSchema.optional(),
    endsAt: isoDateSchema.optional(),
    minOrderAmount: optionalMinOrderSchema,
    discountType: couponDiscountTypeSchema.optional(),
    discountValue: decimalStringSchema.optional(),
    status: couponStatusSchema.optional(),
    productIds: productIdsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt) {
      validatePeriod(data.startsAt, data.endsAt, ctx)
    }
    if (data.discountType && data.discountValue) {
      validateDiscount(data.discountType, data.discountValue, ctx)
    }
  })
