import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function searchCondition(search: string): SQL | undefined {
  if (!search) return undefined
  return or(
    ilike(schema.customers.email, `%${search}%`),
    ilike(schema.customers.fullName, `%${search}%`),
    ilike(schema.customers.phone, `%${search}%`),
  )
}

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(q.pageSize) || DEFAULT_PAGE_SIZE),
  )
  const search =
    typeof q.q === 'string' && q.q.trim().length > 0 ? q.q.trim() : ''
  const statusRaw = typeof q.status === 'string' ? q.status.trim() : 'all'

  const db = getDb(event)
  const parts: SQL[] = [eq(schema.customers.tenantId, session.tenantId)]
  const sc = searchCondition(search)
  if (sc) parts.push(sc)
  if (statusRaw === 'active' || statusRaw === 'disabled') {
    parts.push(eq(schema.customers.status, statusRaw))
  }
  const whereClause = parts.length === 1 ? parts[0]! : and(...parts)!

  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.customers)
    .where(whereClause)
  const total = Number(totalRow?.total ?? 0)
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: schema.customers.id,
      email: schema.customers.email,
      fullName: schema.customers.fullName,
      phone: schema.customers.phone,
      status: schema.customers.status,
      createdAt: schema.customers.createdAt,
      updatedAt: schema.customers.updatedAt,
    })
    .from(schema.customers)
    .where(whereClause)
    .orderBy(desc(schema.customers.createdAt), asc(schema.customers.id))
    .limit(pageSize)
    .offset(offset)

  return {
    items: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    page,
    pageSize,
    total,
  }
})
