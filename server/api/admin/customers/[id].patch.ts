import { and, eq } from 'drizzle-orm'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const customerIdParamSchema = z.string().uuid('顧客 id 格式不正確')
const CUSTOMER_STATUSES = ['active', 'disabled'] as const
const patchBodySchema = z.object({
  status: z.enum(CUSTOMER_STATUSES, { message: '顧客狀態不正確' }),
})

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = customerIdParamSchema.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({
      statusCode: 404,
      message: idParsed.error.issues[0]?.message ?? '顧客 id 格式不正確',
    })
  }
  const customerId = idParsed.data

  const parsed = patchBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const db = getDb(event)
  const [updated] = await db
    .update(schema.customers)
    .set({
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.customers.id, customerId),
        eq(schema.customers.tenantId, session.tenantId),
      ),
    )
    .returning({
      id: schema.customers.id,
      status: schema.customers.status,
      updatedAt: schema.customers.updatedAt,
    })

  if (!updated) {
    throw createError({ statusCode: 404, message: '找不到顧客' })
  }

  return {
    customer: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    },
  }
})
