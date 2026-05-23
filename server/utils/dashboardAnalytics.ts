import { and, asc, count, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

const HK = 'Asia/Hong_Kong'

/** 計入營業額的訂單狀態（已付款及後續流程） */
export const REVENUE_ORDER_STATUSES = ['paid', 'shipping', 'signed'] as const

export type PeriodMetric = {
  revenue: string
  orderCount: number
  newCustomers: number
}

export type PeriodComparison = PeriodMetric & {
  previousRevenue: string
  previousOrderCount: number
  previousNewCustomers: number
}

export type DailyPoint = {
  date: string
  revenue: string
  orderCount: number
}

export type HourPoint = {
  hour: number
  orderCount: number
}

export type DashboardAnalytics = {
  currency: string
  generatedAt: string
  today: PeriodMetric
  thisWeek: PeriodComparison
  thisMonth: PeriodComparison
  pendingPaymentOrders: number
  statusCounts: Record<string, number>
  dailyLast30Days: DailyPoint[]
  ordersByHour: HourPoint[]
  recentOrders: Array<{
    id: string
    invoicePublicId: string
    status: string
    total: string
    currency: string
    customerEmail: string | null
    createdAt: string
  }>
  catalog: {
    products: number
    categories: number
    customers: number
    openMessages: number
  }
}

type Bounds = {
  todayStart: Date
  tomorrowStart: Date
  thisWeekStart: Date
  lastWeekStart: Date
  thisMonthStart: Date
  lastMonthStart: Date
  last30DaysStart: Date
  last90DaysStart: Date
}

function getHkYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function hkMidnightUtc(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+08:00`)
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00+08:00`)
  d.setUTCDate(d.getUTCDate() + days)
  return getHkYmd(d)
}

function getHkWeekdayIndex(date: Date): number {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: HK,
    weekday: 'short',
  }).format(date)
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }
  return map[wd] ?? 0
}

function firstDayOfMonthYmd(ymd: string): string {
  const [y, m] = ymd.split('-')
  return `${y}-${m}-01`
}

function previousMonthStartYmd(ymd: string): string {
  const monthStart = firstDayOfMonthYmd(ymd)
  return addDaysYmd(monthStart, -1).slice(0, 8) + '01'
}

export function computePeriodBounds(now = new Date()): Bounds {
  const todayYmd = getHkYmd(now)
  const todayStart = hkMidnightUtc(todayYmd)
  const tomorrowStart = hkMidnightUtc(addDaysYmd(todayYmd, 1))
  const weekday = getHkWeekdayIndex(now)
  const thisWeekStart = hkMidnightUtc(addDaysYmd(todayYmd, -weekday))
  const lastWeekStart = hkMidnightUtc(addDaysYmd(todayYmd, -weekday - 7))
  const thisMonthStart = hkMidnightUtc(firstDayOfMonthYmd(todayYmd))
  const lastMonthStart = hkMidnightUtc(previousMonthStartYmd(todayYmd))
  const last30DaysStart = hkMidnightUtc(addDaysYmd(todayYmd, -29))
  const last90DaysStart = hkMidnightUtc(addDaysYmd(todayYmd, -89))

  return {
    todayStart,
    tomorrowStart,
    thisWeekStart,
    lastWeekStart,
    thisMonthStart,
    lastMonthStart,
    last30DaysStart,
    last90DaysStart,
  }
}

function buildLast30DayLabels(todayYmd: string): string[] {
  const labels: string[] = []
  for (let i = 29; i >= 0; i--) {
    labels.push(addDaysYmd(todayYmd, -i))
  }
  return labels
}

async function sumOrdersInRange(
  db: PostgresJsDatabase<typeof schema>,
  tenantId: string,
  start: Date,
  end: Date,
  revenueOnly: boolean,
) {
  const parts = [
    eq(schema.shopOrders.tenantId, tenantId),
    gte(schema.shopOrders.createdAt, start),
    lt(schema.shopOrders.createdAt, end),
  ]
  if (revenueOnly) {
    parts.push(inArray(schema.shopOrders.status, [...REVENUE_ORDER_STATUSES]))
  }

  const [row] = await db
    .select({
      revenue: sql<string>`coalesce(sum(${schema.shopOrders.total}), 0)::text`,
      orderCount: count(),
    })
    .from(schema.shopOrders)
    .where(and(...parts))

  return {
    revenue: row?.revenue ?? '0',
    orderCount: Number(row?.orderCount ?? 0),
  }
}

async function countNewCustomersInRange(
  db: PostgresJsDatabase<typeof schema>,
  tenantId: string,
  start: Date,
  end: Date,
) {
  const [row] = await db
    .select({ total: count() })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.tenantId, tenantId),
        gte(schema.customers.createdAt, start),
        lt(schema.customers.createdAt, end),
      ),
    )
  return Number(row?.total ?? 0)
}

async function fetchPeriodMetric(
  db: PostgresJsDatabase<typeof schema>,
  tenantId: string,
  start: Date,
  end: Date,
) {
  const [orders, newCustomers] = await Promise.all([
    sumOrdersInRange(db, tenantId, start, end, true),
    countNewCustomersInRange(db, tenantId, start, end),
  ])
  return { ...orders, newCustomers }
}

export async function fetchDashboardAnalytics(
  db: PostgresJsDatabase<typeof schema>,
  tenantId: string,
): Promise<DashboardAnalytics> {
  const now = new Date()
  const bounds = computePeriodBounds(now)
  const todayYmd = getHkYmd(now)

  const orderTenant = eq(schema.shopOrders.tenantId, tenantId)
  const revenueStatus = inArray(schema.shopOrders.status, [
    ...REVENUE_ORDER_STATUSES,
  ])

  const [
    today,
    thisWeekCurrent,
    thisWeekPrevious,
    thisMonthCurrent,
    thisMonthPrevious,
    pendingPaymentRow,
    statusRows,
    dailyRows,
    hourRows,
    recentRows,
    productRow,
    categoryRow,
    customerRow,
    openMessageRow,
  ] = await Promise.all([
    fetchPeriodMetric(
      db,
      tenantId,
      bounds.todayStart,
      bounds.tomorrowStart,
    ),
    fetchPeriodMetric(
      db,
      tenantId,
      bounds.thisWeekStart,
      bounds.tomorrowStart,
    ),
    fetchPeriodMetric(
      db,
      tenantId,
      bounds.lastWeekStart,
      bounds.thisWeekStart,
    ),
    fetchPeriodMetric(
      db,
      tenantId,
      bounds.thisMonthStart,
      bounds.tomorrowStart,
    ),
    fetchPeriodMetric(
      db,
      tenantId,
      bounds.lastMonthStart,
      bounds.thisMonthStart,
    ),
    db
      .select({ total: count() })
      .from(schema.shopOrders)
      .where(
        and(orderTenant, eq(schema.shopOrders.status, 'pending_payment')),
      ),
    db
      .select({
        status: schema.shopOrders.status,
        total: count(),
      })
      .from(schema.shopOrders)
      .where(orderTenant)
      .groupBy(schema.shopOrders.status),
    db
      .select({
        date: sql<string>`to_char(
          (${schema.shopOrders.createdAt} AT TIME ZONE ${sql.raw(`'${HK}'`)})::date,
          'YYYY-MM-DD'
        )`,
        revenue: sql<string>`coalesce(sum(${schema.shopOrders.total}) filter (where ${schema.shopOrders.status} in ('paid', 'shipping', 'signed')), 0)::text`,
        orderCount: count(),
      })
      .from(schema.shopOrders)
      .where(
        and(
          orderTenant,
          gte(schema.shopOrders.createdAt, bounds.last30DaysStart),
          lt(schema.shopOrders.createdAt, bounds.tomorrowStart),
        ),
      )
      .groupBy(
        sql`(${schema.shopOrders.createdAt} AT TIME ZONE ${sql.raw(`'${HK}'`)})::date`,
      )
      .orderBy(
        asc(
          sql`(${schema.shopOrders.createdAt} AT TIME ZONE ${sql.raw(`'${HK}'`)})::date`,
        ),
      ),
    db
      .select({
        hour: sql<number>`extract(hour from ${schema.shopOrders.createdAt} AT TIME ZONE ${sql.raw(`'${HK}'`)})::int`,
        orderCount: count(),
      })
      .from(schema.shopOrders)
      .where(
        and(
          orderTenant,
          gte(schema.shopOrders.createdAt, bounds.last90DaysStart),
          lt(schema.shopOrders.createdAt, bounds.tomorrowStart),
        ),
      )
      .groupBy(
        sql`extract(hour from ${schema.shopOrders.createdAt} AT TIME ZONE ${sql.raw(`'${HK}'`)})`,
      )
      .orderBy(
        asc(
          sql`extract(hour from ${schema.shopOrders.createdAt} AT TIME ZONE ${sql.raw(`'${HK}'`)})`,
        ),
      ),
    db
      .select({
        id: schema.shopOrders.id,
        invoicePublicId: schema.shopOrders.invoicePublicId,
        status: schema.shopOrders.status,
        total: schema.shopOrders.total,
        currency: schema.shopOrders.currency,
        customerEmail: schema.shopOrders.customerEmail,
        createdAt: schema.shopOrders.createdAt,
      })
      .from(schema.shopOrders)
      .where(orderTenant)
      .orderBy(desc(schema.shopOrders.createdAt))
      .limit(8),
    db
      .select({ total: count() })
      .from(schema.products)
      .where(eq(schema.products.tenantId, tenantId)),
    db
      .select({ total: count() })
      .from(schema.categories)
      .where(eq(schema.categories.tenantId, tenantId)),
    db
      .select({ total: count() })
      .from(schema.customers)
      .where(eq(schema.customers.tenantId, tenantId)),
    db
      .select({ total: count() })
      .from(schema.customerMessages)
      .where(
        and(
          eq(schema.customerMessages.tenantId, tenantId),
          inArray(schema.customerMessages.status, ['pending', 'processing']),
        ),
      ),
  ])

  const dailyMap = new Map(
    dailyRows.map((r) => [
      r.date,
      { revenue: r.revenue, orderCount: Number(r.orderCount ?? 0) },
    ]),
  )
  const dailyLast30Days: DailyPoint[] = buildLast30DayLabels(todayYmd).map(
    (date) => {
      const hit = dailyMap.get(date)
      return {
        date,
        revenue: hit?.revenue ?? '0',
        orderCount: hit?.orderCount ?? 0,
      }
    },
  )

  const hourMap = new Map(
    hourRows.map((r) => [Number(r.hour), Number(r.orderCount ?? 0)]),
  )
  const ordersByHour: HourPoint[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    orderCount: hourMap.get(hour) ?? 0,
  }))

  const statusCounts: Record<string, number> = {}
  for (const row of statusRows) {
    statusCounts[row.status] = Number(row.total ?? 0)
  }

  const [currencyRow] = await db
    .select({ currency: schema.shopOrders.currency })
    .from(schema.shopOrders)
    .where(and(orderTenant, revenueStatus))
    .orderBy(desc(schema.shopOrders.createdAt))
    .limit(1)

  return {
    currency: currencyRow?.currency ?? 'HKD',
    generatedAt: now.toISOString(),
    today,
    thisWeek: {
      ...thisWeekCurrent,
      previousRevenue: thisWeekPrevious.revenue,
      previousOrderCount: thisWeekPrevious.orderCount,
      previousNewCustomers: thisWeekPrevious.newCustomers,
    },
    thisMonth: {
      ...thisMonthCurrent,
      previousRevenue: thisMonthPrevious.revenue,
      previousOrderCount: thisMonthPrevious.orderCount,
      previousNewCustomers: thisMonthPrevious.newCustomers,
    },
    pendingPaymentOrders: Number(pendingPaymentRow[0]?.total ?? 0),
    statusCounts,
    dailyLast30Days,
    ordersByHour,
    recentOrders: recentRows.map((r) => ({
      id: r.id,
      invoicePublicId: r.invoicePublicId,
      status: r.status,
      total: String(r.total),
      currency: r.currency,
      customerEmail: r.customerEmail,
      createdAt: r.createdAt.toISOString(),
    })),
    catalog: {
      products: Number(productRow[0]?.total ?? 0),
      categories: Number(categoryRow[0]?.total ?? 0),
      customers: Number(customerRow[0]?.total ?? 0),
      openMessages: Number(openMessageRow[0]?.total ?? 0),
    },
  }
}
