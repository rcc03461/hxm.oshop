import { z } from 'zod'

/** 商店子網域 slug：小寫、數字、連字號 */
export const shopSlugSchema = z
  .string()
  .trim()
  .min(2, '商店代號至少 2 字元')
  .max(64, '商店代號過長')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '商店代號只能使用小寫英文、數字與連字號')

export const registerBodySchema = z.object({
  shopSlug: shopSlugSchema,
  email: z.string().trim().email('請輸入有效的電子郵件'),
  password: z.string().min(8, '密碼至少 8 字元'),
})

export const loginBodySchema = z.object({
  email: z.string().trim().email('請輸入有效的電子郵件'),
  password: z.string().min(1, '請輸入密碼'),
})
