import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

type Db = PostgresJsDatabase<typeof schema>

export type AdminAttachmentInsert = {
  tenantId: string
  type: string
  mimetype: string
  filename: string
  extension: string
  size: number
  storageKey: string | null
  publicUrl: string | null
}

/** 後台建立附件列（供 JSON 建立與檔案上傳共用） */
export async function insertAdminAttachment(db: Db, row: AdminAttachmentInsert) {
  const [created] = await db
    .insert(schema.attachments)
    .values({
      tenantId: row.tenantId,
      type: row.type,
      mimetype: row.mimetype,
      filename: row.filename,
      extension: row.extension,
      size: row.size,
      storageKey: row.storageKey,
      publicUrl: row.publicUrl,
      updatedAt: new Date(),
    })
    .returning()

  return created ?? null
}
