import { createError } from 'h3'
import { getDb } from '../../../utils/db'
import { saveDraftModules } from '../../../utils/homepageModules'
import { homepageModulePutBodySchema } from '../../../utils/homepageSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsed = homepageModulePutBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '首頁模組資料不正確',
    })
  }

  const db = getDb(event)
  await saveDraftModules(db, session.tenantId, parsed.data.items)

  return { ok: true }
})
