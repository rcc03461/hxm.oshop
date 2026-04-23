import { getDb } from '../../../../utils/db'
import { resetDraftFromPublished } from '../../../../utils/homepageModules'
import { requireTenantSession } from '../../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)
  await resetDraftFromPublished(db, session.tenantId)
  return { ok: true }
})
