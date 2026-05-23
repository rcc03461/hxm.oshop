import { getDb } from '../../../utils/db'
import { fetchDashboardAnalytics } from '../../../utils/dashboardAnalytics'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)
  return await fetchDashboardAnalytics(db, session.tenantId)
})
