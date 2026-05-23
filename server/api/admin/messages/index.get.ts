import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import {
  CUSTOMER_MESSAGE_STATUSES,
  isCustomerMessageStatus,
  parseCustomerMessageStatuses,
  type CustomerMessageStatus,
} from '../../../utils/customerMessageSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function searchCondition(search: string): SQL | undefined {
  if (!search) return undefined
  return or(
    ilike(schema.customerMessages.name, `%${search}%`),
    ilike(schema.customerMessages.email, `%${search}%`),
    ilike(schema.customerMessages.phone, `%${search}%`),
    ilike(schema.customerMessages.message, `%${search}%`),
  )
}

function truncateMessage(text: string, max = 80) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
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
  const selectedStatuses = parseCustomerMessageStatuses(q.status)

  const tenantId = session.tenantId
  const db = getDb(event)

  const baseParts: SQL[] = [eq(schema.customerMessages.tenantId, tenantId)]
  const sc = searchCondition(search)
  if (sc) baseParts.push(sc)
  const baseWhereClause =
    baseParts.length === 1 ? baseParts[0]! : and(...baseParts)!

  const parts = [...baseParts]
  if (selectedStatuses.length === 1) {
    parts.push(eq(schema.customerMessages.status, selectedStatuses[0]!))
  } else if (selectedStatuses.length > 1) {
    parts.push(inArray(schema.customerMessages.status, selectedStatuses))
  }
  const whereClause = parts.length === 1 ? parts[0]! : and(...parts)!

  const [totalRow, statusCountRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(schema.customerMessages)
      .where(whereClause),
    db
      .select({
        status: schema.customerMessages.status,
        total: count(),
      })
      .from(schema.customerMessages)
      .where(baseWhereClause)
      .groupBy(schema.customerMessages.status),
  ])

  const total = Number(totalRow[0]?.total ?? 0)
  const statusCounts = CUSTOMER_MESSAGE_STATUSES.reduce(
    (acc, s) => {
      acc[s] = 0
      return acc
    },
    {} as Record<CustomerMessageStatus, number>,
  )
  for (const row of statusCountRows) {
    if (isCustomerMessageStatus(row.status)) {
      statusCounts[row.status] = Number(row.total ?? 0)
    }
  }

  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: schema.customerMessages.id,
      customerId: schema.customerMessages.customerId,
      name: schema.customerMessages.name,
      email: schema.customerMessages.email,
      phone: schema.customerMessages.phone,
      message: schema.customerMessages.message,
      remark: schema.customerMessages.remark,
      status: schema.customerMessages.status,
      createdAt: schema.customerMessages.createdAt,
      updatedAt: schema.customerMessages.updatedAt,
    })
    .from(schema.customerMessages)
    .where(whereClause)
    .orderBy(
      desc(schema.customerMessages.createdAt),
      asc(schema.customerMessages.id),
    )
    .limit(pageSize)
    .offset(offset)

  return {
    items: rows.map((r) => ({
      ...r,
      messagePreview: truncateMessage(r.message),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    statusCounts,
  }
})
