import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createError, isError, readMultipartFormData, assertMethod } from 'h3'
import { getDb } from '../../../utils/db'
import { insertAdminAttachment } from '../../../utils/insertAdminAttachment'
import { summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const MAX_BYTES = 10 * 1024 * 1024

/** multipart 欄位 type → 副檔名（僅允許常見圖片） */
const IMAGE_EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function safeDisplayFilename(raw: string | undefined, fallback: string) {
  const base = (raw ?? fallback).replace(/[/\\]/g, '').trim() || fallback
  return base.slice(0, 255)
}

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST')
  const session = await requireTenantSession(event)
  const parts = await readMultipartFormData(event)
  const filePart = parts?.find((p) => p.name === 'file' && p.filename && p.data?.length)

  if (!filePart?.data?.length) {
    throw createError({ statusCode: 400, message: '請上傳圖片檔（欄位名 file）' })
  }

  const mime = (filePart.type || 'application/octet-stream').toLowerCase()
  const ext = IMAGE_EXT_BY_MIME[mime]
  if (!ext) {
    throw createError({ statusCode: 400, message: '不支援的圖片格式（請用 JPEG、PNG、WebP、GIF）' })
  }

  if (filePart.data.length > MAX_BYTES) {
    throw createError({ statusCode: 400, message: `檔案過大（上限 ${MAX_BYTES / 1024 / 1024}MB）` })
  }

  const storedName = `${randomUUID()}.${ext}`
  const tenantDir = join(process.cwd(), 'public', 'uploads', session.tenantId)
  const absolutePath = join(tenantDir, storedName)
  const publicUrl = `/uploads/${session.tenantId}/${storedName}`
  const displayName = safeDisplayFilename(filePart.filename, storedName)

  await mkdir(tenantDir, { recursive: true })
  await writeFile(absolutePath, filePart.data)

  const db = getDb(event)
  try {
    const row = await insertAdminAttachment(db, {
      tenantId: session.tenantId,
      type: 'image',
      mimetype: mime,
      filename: displayName,
      extension: ext,
      size: filePart.data.length,
      storageKey: null,
      publicUrl,
    })

    if (!row) {
      throw createError({ statusCode: 500, message: '建立附件失敗' })
    }

    return { attachment: row }
  } catch (e: unknown) {
    await unlink(absolutePath).catch(() => {})
    if (isError(e)) throw e
    console.error('[admin/attachments/upload POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立附件失敗' })
  }
})
