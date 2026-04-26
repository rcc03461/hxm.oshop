import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const CUSTOMER_STATUSES = ['active', 'disabled'] as const
type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]

function parseCustomerStatuses(raw: unknown): CustomerStatus[] {
  const values = Array.isArray(raw)
    ? raw.flatMap((item) => String(item).split(','))
    : typeof raw === 'string'
      ? raw.split(',')
      : []
  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter((item): item is CustomerStatus =>
          (CUSTOMER_STATUSES as readonly string[]).includes(item),
        ),
    ),
  )
}

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
  const selectedStatuses = parseCustomerStatuses(q.status)

  const db = getDb(event)
  const parts: SQL[] = [eq(schema.customers.tenantId, session.tenantId)]
  const sc = searchCondition(search)
  if (sc) parts.push(sc)
  if (selectedStatuses.length === 1) {
    parts.push(eq(schema.customers.status, selectedStatuses[0]))
  } else if (selectedStatuses.length > 1) {
    parts.push(or(...selectedStatuses.map((s) => eq(schema.customers.status, s)))!)
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
