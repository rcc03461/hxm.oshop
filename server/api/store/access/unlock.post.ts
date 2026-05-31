import { eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import {
  getStoreVisibilityFlags,
  setStoreViewCookie,
  verifyStoreViewPassword,
} from '../../../utils/storeAccess'
import { requireStoreTenant } from '../../../utils/storeTenant'

const bodySchema = z.object({
  password: z.string().min(1, '請輸入密碼').max(128),
})

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const db = getDb(event)
  const [row] = await db
    .select({ settings: schema.tenants.settings })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenant.id))
    .limit(1)

  const settings =
    row?.settings && typeof row.settings === 'object'
      ? (row.settings as Record<string, unknown>)
      : {}

  const { hasPassword, storeViewPasswordHash } = getStoreVisibilityFlags(settings)
  if (!hasPassword) {
    throw createError({ statusCode: 400, message: '此商店未設定看店密碼' })
  }

  const ok = await verifyStoreViewPassword(
    parsed.data.password,
    storeViewPasswordHash,
  )
  if (!ok) {
    throw createError({ statusCode: 401, message: '密碼不正確' })
  }

  await setStoreViewCookie(event, tenant.id)

  return { ok: true as const }
})
