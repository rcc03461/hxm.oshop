import { and, eq, isNull } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('附件 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsedId = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({ statusCode: 404, message: parsedId.error.issues[0]?.message })
  }

  const db = getDb(event)
  const [deleted] = await db
    .update(schema.attachments)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.attachments.id, parsedId.data),
        eq(schema.attachments.tenantId, session.tenantId),
        isNull(schema.attachments.deletedAt),
      ),
    )
    .returning({ id: schema.attachments.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: '找不到附件' })
  }

  return { ok: true }
})
