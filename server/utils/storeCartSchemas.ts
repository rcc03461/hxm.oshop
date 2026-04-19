import { z } from 'zod'

export const storeCartAddItemSchema = z.object({
  productId: z.string().uuid('商品 id 格式不正確'),
  variantId: z.string().uuid('規格 id 格式不正確').nullable().optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  optionSummary: z.string().trim().max(255).optional(),
})

export const storeCartPatchItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
})
