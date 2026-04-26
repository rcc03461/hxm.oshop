import { and, asc, count, eq, ilike, inArray, or } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const CATEGORY_STATUSES = ['active', 'hidden'] as const
type CategoryStatus = (typeof CATEGORY_STATUSES)[number]

function parseCategoryStatuses(raw: unknown): CategoryStatus[] {
  const values = Array.isArray(raw)
    ? raw.flatMap((item) => String(item).split(','))
    : typeof raw === 'string'
      ? raw.split(',')
      : []
  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter((item): item is CategoryStatus =>
          (CATEGORY_STATUSES as readonly string[]).includes(item),
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
  const selectedStatuses = parseCategoryStatuses(q.status)

  const db = getDb(event)
  const tenantId = session.tenantId

  const whereParts = [eq(schema.categories.tenantId, tenantId)]
  if (search) {
    whereParts.push(
      or(
        ilike(schema.categories.name, `%${search}%`),
        ilike(schema.categories.slug, `%${search}%`),
      )!,
    )
  }
  if (selectedStatuses.length === 1) {
    whereParts.push(eq(schema.categories.status, selectedStatuses[0]))
  } else if (selectedStatuses.length > 1) {
    whereParts.push(inArray(schema.categories.status, selectedStatuses))
  }
  const whereClause = and(...whereParts)!

  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.categories)
    .where(whereClause)

  const total = Number(totalRow?.total ?? 0)
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: schema.categories.id,
      parentId: schema.categories.parentId,
      sortOrder: schema.categories.sortOrder,
      slug: schema.categories.slug,
      name: schema.categories.name,
      status: schema.categories.status,
      updatedAt: schema.categories.updatedAt,
    })
    .from(schema.categories)
    .where(whereClause)
    .orderBy(
      asc(schema.categories.sortOrder),
      asc(schema.categories.name),
      asc(schema.categories.id),
    )
    .limit(pageSize)
    .offset(offset)

  const parentIds = [
    ...new Set(rows.map((r) => r.parentId).filter((x): x is string => !!x)),
  ]
  const parentNameMap = new Map<string, string>()
  if (parentIds.length > 0) {
    const parents = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
      })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.tenantId, tenantId),
          inArray(schema.categories.id, parentIds),
        ),
      )
    for (const p of parents) {
      parentNameMap.set(p.id, p.name)
    }
  }

  return {
    items: rows.map((r) => ({
      ...r,
      parentName: r.parentId ? (parentNameMap.get(r.parentId) ?? null) : null,
    })),
    page,
    pageSize,
    total,
  }
})
