import { z } from 'zod'

export const CUSTOMER_MESSAGE_STATUSES = [
  'pending',
  'processing',
  'completed',
] as const

export type CustomerMessageStatus = (typeof CUSTOMER_MESSAGE_STATUSES)[number]

export function isCustomerMessageStatus(v: string): v is CustomerMessageStatus {
  return (CUSTOMER_MESSAGE_STATUSES as readonly string[]).includes(v)
}

export function parseCustomerMessageStatuses(
  raw: unknown,
): CustomerMessageStatus[] {
  const values = Array.isArray(raw)
    ? raw.flatMap((item) => String(item).split(','))
    : typeof raw === 'string'
      ? raw.split(',')
      : []

  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter((item): item is CustomerMessageStatus =>
          isCustomerMessageStatus(item),
        ),
    ),
  )
}

export const storeMessageBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '請填寫姓名')
    .max(120, '姓名過長'),
  email: z
    .string()
    .trim()
    .min(1, '請填寫電郵')
    .max(255, '電郵過長')
    .email('電郵格式不正確'),
  phone: z
    .string()
    .trim()
    .max(32, '電話過長')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  message: z
    .string()
    .trim()
    .min(1, '請填寫留言內容')
    .max(5000, '留言內容過長'),
})

export const adminMessagePatchBodySchema = z
  .object({
    status: z
      .enum(CUSTOMER_MESSAGE_STATUSES, { message: '留言狀態不正確' })
      .optional(),
    remark: z
      .string()
      .max(5000, '備註過長')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.remark !== undefined,
    { message: '請提供要更新的欄位' },
  )
