import { and, eq, isNull } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { adminUpdateAttachmentBodySchema } from '../../../utils/attachmentSchemas'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('附件 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsedId = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({ statusCode: 404, message: parsedId.error.issues[0]?.message })
  }

  const body = await readBody(event)
  const parsedBody = adminUpdateAttachmentBodySchema.safeParse(body)
  if (!parsedBody.success) {
    const msg = parsedBody.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const db = getDb(event)
  const [updated] = await db
    .update(schema.attachments)
    .set({
      filename: parsedBody.data.filename,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.attachments.id, parsedId.data),
        eq(schema.attachments.tenantId, session.tenantId),
        isNull(schema.attachments.deletedAt),
      ),
    )
    .returning({
      id: schema.attachments.id,
      type: schema.attachments.type,
      mimetype: schema.attachments.mimetype,
      filename: schema.attachments.filename,
      extension: schema.attachments.extension,
      size: schema.attachments.size,
      publicUrl: schema.attachments.publicUrl,
      createdAt: schema.attachments.createdAt,
      updatedAt: schema.attachments.updatedAt,
    })

  if (!updated) {
    throw createError({ statusCode: 404, message: '找不到附件' })
  }

  return { attachment: updated }
})
