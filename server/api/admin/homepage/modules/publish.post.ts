import { createError } from 'h3'
import { getDb } from '../../../../utils/db'
import { ensureDraftModules, publishDraftModules } from '../../../../utils/homepageModules'
import { homepageModuleSchema } from '../../../../utils/homepageSchemas'
import { requireTenantSession } from '../../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)
  const draftItems = await ensureDraftModules(db, session.tenantId)

  for (const item of draftItems) {
    const parsed = homepageModuleSchema.safeParse(item)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: parsed.error.issues[0]?.message ?? `模組 ${item.moduleKey} 設定不正確`,
      })
    }
  }

  await publishDraftModules(db, session.tenantId)

  return {
    ok: true,
    publishedAt: new Date().toISOString(),
  }
})
