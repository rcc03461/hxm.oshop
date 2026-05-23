import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const COUPON_STATUSES = ['active', 'inactive'] as const
type CouponStatus = (typeof COUPON_STATUSES)[number]

const PERIOD_FILTERS = ['scheduled', 'ongoing', 'expired'] as const
type PeriodFilter = (typeof PERIOD_FILTERS)[number]

function parseCouponStatuses(raw: unknown): CouponStatus[] {
  const values = Array.isArray(raw)
    ? raw.flatMap((item) => String(item).split(','))
    : typeof raw === 'string'
      ? raw.split(',')
      : []
  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter((item): item is CouponStatus =>
          (COUPON_STATUSES as readonly string[]).includes(item),
        ),
    ),
  )
}

function parsePeriodFilters(raw: unknown): PeriodFilter[] {
  const values = Array.isArray(raw)
    ? raw.flatMap((item) => String(item).split(','))
    : typeof raw === 'string'
      ? raw.split(',')
      : []
  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter((item): item is PeriodFilter =>
          (PERIOD_FILTERS as readonly string[]).includes(item),
        ),
    ),
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
  const selectedStatuses = parseCouponStatuses(q.status)
  const selectedPeriods = parsePeriodFilters(q.period)

  const db = getDb(event)
  const tenantId = session.tenantId
  const now = sql`now()`

  const whereParts = [eq(schema.coupons.tenantId, tenantId)]
  if (search) {
    whereParts.push(
      or(
        ilike(schema.coupons.name, `%${search}%`),
        ilike(schema.coupons.code, `%${search}%`),
      )!,
    )
  }
  if (selectedStatuses.length === 1) {
    whereParts.push(eq(schema.coupons.status, selectedStatuses[0]))
  } else if (selectedStatuses.length > 1) {
    whereParts.push(inArray(schema.coupons.status, selectedStatuses))
  }

  if (selectedPeriods.length > 0) {
    const periodClauses = selectedPeriods.map((p) => {
      if (p === 'scheduled') return gt(schema.coupons.startsAt, now)
      if (p === 'expired') return lt(schema.coupons.endsAt, now)
      return and(lte(schema.coupons.startsAt, now), gte(schema.coupons.endsAt, now))!
    })
    if (periodClauses.length === 1) {
      whereParts.push(periodClauses[0]!)
    } else {
      whereParts.push(or(...periodClauses)!)
    }
  }

  const whereClause = and(...whereParts)!

  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.coupons)
    .where(whereClause)

  const total = Number(totalRow?.total ?? 0)
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: schema.coupons.id,
      name: schema.coupons.name,
      code: schema.coupons.code,
      startsAt: schema.coupons.startsAt,
      endsAt: schema.coupons.endsAt,
      minOrderAmount: schema.coupons.minOrderAmount,
      discountType: schema.coupons.discountType,
      discountValue: schema.coupons.discountValue,
      status: schema.coupons.status,
      updatedAt: schema.coupons.updatedAt,
    })
    .from(schema.coupons)
    .where(whereClause)
    .orderBy(desc(schema.coupons.updatedAt), asc(schema.coupons.name))
    .limit(pageSize)
    .offset(offset)

  const couponIds = rows.map((r) => r.id)
  const productCountMap = new Map<string, number>()
  if (couponIds.length > 0) {
    const countRows = await db
      .select({
        couponId: schema.couponProducts.couponId,
        total: count(),
      })
      .from(schema.couponProducts)
      .where(inArray(schema.couponProducts.couponId, couponIds))
      .groupBy(schema.couponProducts.couponId)
    for (const c of countRows) {
      productCountMap.set(c.couponId, Number(c.total ?? 0))
    }
  }

  return {
    items: rows.map((r) => {
      const productCount = productCountMap.get(r.id) ?? 0
      return {
        ...r,
        productCount,
        appliesToAllProducts: productCount === 0,
      }
    }),
    page,
    pageSize,
    total,
  }
})
