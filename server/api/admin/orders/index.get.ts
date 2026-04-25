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
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'payment_failed',
  'shipping',
  'signed',
] as const
type OrderStatus = (typeof ORDER_STATUSES)[number]

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v)
}

function parseOrderStatuses(raw: unknown): OrderStatus[] {
  const values = Array.isArray(raw)
    ? raw.flatMap((item) => String(item).split(','))
    : typeof raw === 'string'
      ? raw.split(',')
      : []

  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter((item): item is OrderStatus => isOrderStatus(item)),
    ),
  )
}

function searchCondition(search: string): SQL | undefined {
  if (!search) return undefined
  if (UUID_RE.test(search)) {
    return or(
      eq(schema.shopOrders.id, search),
      eq(schema.shopOrders.invoicePublicId, search),
    )
  }
  return ilike(schema.shopOrders.customerEmail, `%${search}%`)
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
  const selectedStatuses = parseOrderStatuses(q.status)

  const tenantId = session.tenantId
  const db = getDb(event)

  const baseParts: SQL[] = [eq(schema.shopOrders.tenantId, tenantId)]
  const sc = searchCondition(search)
  if (sc) baseParts.push(sc)
  const baseWhereClause =
    baseParts.length === 1 ? baseParts[0]! : and(...baseParts)!

  const parts = [...baseParts]
  if (selectedStatuses.length === 1) {
    parts.push(eq(schema.shopOrders.status, selectedStatuses[0]!))
  } else if (selectedStatuses.length > 1) {
    parts.push(inArray(schema.shopOrders.status, selectedStatuses))
  }
  const whereClause = parts.length === 1 ? parts[0]! : and(...parts)!

  const [totalRow, statusCountRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(schema.shopOrders)
      .where(whereClause),
    db
      .select({
        status: schema.shopOrders.status,
        total: count(),
      })
      .from(schema.shopOrders)
      .where(baseWhereClause)
      .groupBy(schema.shopOrders.status),
  ])

  const total = Number(totalRow[0]?.total ?? 0)
  const statusCounts = ORDER_STATUSES.reduce(
    (acc, s) => {
      acc[s] = 0
      return acc
    },
    {} as Record<OrderStatus, number>,
  )
  for (const row of statusCountRows) {
    if (isOrderStatus(row.status)) {
      statusCounts[row.status] = Number(row.total ?? 0)
    }
  }
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: schema.shopOrders.id,
      invoicePublicId: schema.shopOrders.invoicePublicId,
      status: schema.shopOrders.status,
      paymentProvider: schema.shopOrders.paymentProvider,
      currency: schema.shopOrders.currency,
      subtotal: schema.shopOrders.subtotal,
      total: schema.shopOrders.total,
      customerEmail: schema.shopOrders.customerEmail,
      createdAt: schema.shopOrders.createdAt,
      updatedAt: schema.shopOrders.updatedAt,
    })
    .from(schema.shopOrders)
    .where(whereClause)
    .orderBy(desc(schema.shopOrders.createdAt), asc(schema.shopOrders.id))
    .limit(pageSize)
    .offset(offset)

  return {
    items: rows.map((r) => ({
      ...r,
      subtotal: String(r.subtotal),
      total: String(r.total),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    statusCounts,
  }
})
