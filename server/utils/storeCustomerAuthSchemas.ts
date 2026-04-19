import { z } from 'zod'

export const storeCustomerRegisterBodySchema = z.object({
  email: z.string().trim().email('請輸入有效的電子郵件'),
  password: z.string().min(8, '密碼至少 8 字元'),
  fullName: z.string().trim().min(1, '請輸入暱稱').max(120, '暱稱過長'),
})

export const storeCustomerLoginBodySchema = z.object({
  email: z.string().trim().email('請輸入有效的電子郵件'),
  password: z.string().min(1, '請輸入密碼'),
})
