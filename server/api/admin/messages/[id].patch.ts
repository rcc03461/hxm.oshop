import { and, eq } from 'drizzle-orm'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { adminMessagePatchBodySchema } from '../../../utils/customerMessageSchemas'
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

  const parsed = adminMessagePatchBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const updates: Partial<typeof schema.customerMessages.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status
  }
  if (parsed.data.remark !== undefined) {
    updates.remark = parsed.data.remark
  }

  const db = getDb(event)
  const [updated] = await db
    .update(schema.customerMessages)
    .set(updates)
    .where(
      and(
        eq(schema.customerMessages.id, messageId),
        eq(schema.customerMessages.tenantId, session.tenantId),
      ),
    )
    .returning({
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

  if (!updated) {
    throw createError({ statusCode: 404, message: '找不到留言' })
  }

  return {
    message: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  }
})
