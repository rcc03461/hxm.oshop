import { z } from 'zod'

export const storeProfilePatchSchema = z.object({
  fullName: z.string().trim().min(1, '請輸入姓名').max(120, '姓名過長'),
  phone: z
    .string()
    .trim()
    .max(32, '電話過長')
    .optional()
    .transform((v) => v ?? ''),
})
