import { and, eq } from 'drizzle-orm'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const orderIdParamSchema = z.string().uuid('訂單 id 格式不正確')

const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'payment_failed',
  'shipping',
  'signed',
] as const
const patchBodySchema = z.object({
  status: z.enum(ORDER_STATUSES, { message: '訂單狀態不正確' }),
})

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)

  const idParsed = orderIdParamSchema.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({
      statusCode: 404,
      message: idParsed.error.issues[0]?.message ?? '訂單 id 格式不正確',
    })
  }
  const orderId = idParsed.data

  const parsed = patchBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const db = getDb(event)
  const [updated] = await db
    .update(schema.shopOrders)
    .set({
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.shopOrders.id, orderId),
        eq(schema.shopOrders.tenantId, session.tenantId),
      ),
    )
    .returning({
      id: schema.shopOrders.id,
      status: schema.shopOrders.status,
      updatedAt: schema.shopOrders.updatedAt,
    })

  if (!updated) {
    throw createError({ statusCode: 404, message: '找不到訂單' })
  }

  return {
    order: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    },
  }
})
