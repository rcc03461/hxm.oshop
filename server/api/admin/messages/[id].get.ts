import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const messageIdParamSchema = z.string().uuid('留言 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = messageIdParamSchema.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({
      statusCode: 404,
      message: idParsed.error.issues[0]?.message ?? '留言 id 格式不正確',
    })
  }
  const messageId = idParsed.data

  const db = getDb(event)
  const [row] = await db
    .select({
      id: schema.customerMessages.id,
      customerId: schema.customerMessages.customerId,
      name: schema.customerMessages.name,
      email: schema.customerMessages.email,
      phone: schema.customerMessages.phone,
      message: schema.customerMessages.message,
      remark: schema.customerMessages.remark,
      status: schema.customerMessages.status,
      createdAt: schema.customerMessages.createdAt,
      updatedAt: schema.customerMessages.updatedAt,
    })
    .from(schema.customerMessages)
    .where(
      and(
        eq(schema.customerMessages.id, messageId),
        eq(schema.customerMessages.tenantId, session.tenantId),
      ),
    )
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, message: '找不到留言' })
  }

  return {
    message: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  }
})
