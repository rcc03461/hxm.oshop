import { z } from 'zod'
import { couponCodeSchema } from './couponSchemas'

export const storeCheckoutItemSchema = z.object({
  productId: z.string().uuid('商品 id 格式不正確'),
  variantId: z.union([z.string().uuid(), z.null()]).optional(),
  quantity: z.number().int().min(1).max(99),
})

export const storeCheckoutBodySchema = z.object({
  provider: z.enum(['stripe', 'paypal']),
  customerEmail: z
    .union([z.string().email(), z.literal('')])
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  shipping: z
    .object({
      method: z
        .union([z.string().max(64), z.literal('')])
        .optional()
        .transform((v) => (v && v.trim() ? v.trim() : undefined)),
      name: z
        .union([z.string().max(120), z.literal('')])
        .optional()
        .transform((v) => (v && v.trim() ? v.trim() : undefined)),
      email: z
        .union([z.string().email(), z.literal('')])
        .optional()
        .transform((v) => (v && v.trim() ? v.trim() : undefined)),
      phone: z
        .union([z.string().max(64), z.literal('')])
        .optional()
        .transform((v) => (v && v.trim() ? v.trim() : undefined)),
      address: z
        .union([z.string().max(2000), z.literal('')])
        .optional()
        .transform((v) => (v && v.trim() ? v.trim() : undefined)),
      remarks: z
        .union([z.string().max(2000), z.literal('')])
        .optional()
        .transform((v) => (v && v.trim() ? v.trim() : undefined)),
    })
    .optional(),
  items: z.array(storeCheckoutItemSchema).min(1).max(50),
  couponCode: z
    .union([couponCodeSchema, z.literal('')])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
})

export const storeCouponPreviewBodySchema = z.object({
  code: couponCodeSchema,
  items: z.array(storeCheckoutItemSchema).min(1).max(50),
})

export type StoreCheckoutBody = z.infer<typeof storeCheckoutBodySchema>
