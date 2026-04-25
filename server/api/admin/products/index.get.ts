import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
} from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const PRODUCT_STATUSES = ['active', 'inactive'] as const
type ProductStatus = (typeof PRODUCT_STATUSES)[number]
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isProductStatus(v: string): v is ProductStatus {
  return (PRODUCT_STATUSES as readonly string[]).includes(v)
}

function parseCsvValues(raw: unknown) {
  return Array.isArray(raw)
    ? raw.flatMap((item) => String(item).split(','))
    : typeof raw === 'string'
      ? raw.split(',')
      : []
}

function parseProductStatuses(raw: unknown): ProductStatus[] {
  return Array.from(
    new Set(
      parseCsvValues(raw)
        .map((item) => item.trim())
        .filter((item): item is ProductStatus => isProductStatus(item)),
    ),
  )
}

function parseUuidList(raw: unknown) {
  return Array.from(
    new Set(
      parseCsvValues(raw)
        .map((item) => item.trim())
        .filter((item) => UUID_RE.test(item)),
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
  const selectedStatuses = parseProductStatuses(q.status)
  const selectedCategoryIds = parseUuidList(q.categoryId)

  const db = getDb(event)
  const tenantId = session.tenantId

  const searchClause = search
    ? or(
        ilike(schema.products.title, `%${search}%`),
        ilike(schema.products.slug, `%${search}%`),
      )
    : undefined

  const statusClause =
    selectedStatuses.length === 1
      ? eq(schema.products.status, selectedStatuses[0]!)
      : selectedStatuses.length > 1
        ? inArray(schema.products.status, selectedStatuses)
        : undefined

  const categoryClause =
    selectedCategoryIds.length > 0
      ? exists(
          db
            .select({ n: sql`1` })
            .from(schema.productCategories)
            .where(
              and(
                eq(schema.productCategories.productId, schema.products.id),
                inArray(schema.productCategories.categoryId, selectedCategoryIds),
              ),
            ),
        )
      : undefined

  const baseParts: SQL[] = [eq(schema.products.tenantId, tenantId)]
  if (searchClause) baseParts.push(searchClause)

  const parts = [...baseParts]
  if (statusClause) parts.push(statusClause)
  if (categoryClause) parts.push(categoryClause)
  const whereClause = and(...parts)

  const statusCountParts = [...baseParts]
  if (categoryClause) statusCountParts.push(categoryClause)
  const statusCountWhereClause = and(...statusCountParts)

  const categoryCountParts = [...baseParts]
  if (statusClause) categoryCountParts.push(statusClause)
  const categoryCountWhereClause = and(...categoryCountParts)

  const [totalRow, statusCountRows, categoryCountRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(schema.products)
      .where(whereClause),
    db
      .select({
        status: schema.products.status,
        total: count(),
      })
      .from(schema.products)
      .where(statusCountWhereClause)
      .groupBy(schema.products.status),
    db
      .select({
        categoryId: schema.productCategories.categoryId,
        total: count(),
      })
      .from(schema.productCategories)
      .innerJoin(
        schema.products,
        eq(schema.productCategories.productId, schema.products.id),
      )
      .where(categoryCountWhereClause)
      .groupBy(schema.productCategories.categoryId),
  ])

  const total = Number(totalRow[0]?.total ?? 0)
  const statusCounts = PRODUCT_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0
      return acc
    },
    {} as Record<ProductStatus, number>,
  )
  for (const row of statusCountRows) {
    if (isProductStatus(row.status)) {
      statusCounts[row.status] = Number(row.total ?? 0)
    }
  }
  const categoryCounts = Object.fromEntries(
    categoryCountRows.map((row) => [row.categoryId, Number(row.total ?? 0)]),
  )
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: schema.products.id,
      slug: schema.products.slug,
      title: schema.products.title,
      status: schema.products.status,
      basePrice: schema.products.basePrice,
      originalPrice: schema.products.originalPrice,
      coverAttachmentId: schema.products.coverAttachmentId,
      updatedAt: schema.products.updatedAt,
    })
    .from(schema.products)
    .where(whereClause)
    .orderBy(desc(schema.products.updatedAt), asc(schema.products.id))
    .limit(pageSize)
    .offset(offset)

  const ids = rows.map((r) => r.id)
  const variantCountMap = new Map<string, number>()
  if (ids.length > 0) {
    const cnt = await db
      .select({
        productId: schema.productVariants.productId,
        c: count(),
      })
      .from(schema.productVariants)
      .where(inArray(schema.productVariants.productId, ids))
      .groupBy(schema.productVariants.productId)
    for (const row of cnt) {
      variantCountMap.set(row.productId, Number(row.c))
    }
  }

  const categoryNamesByProduct = new Map<string, string[]>()
  const categoryIdsByProduct = new Map<string, string[]>()
  if (ids.length > 0) {
    const catRows = await db
      .select({
        productId: schema.productCategories.productId,
        categoryId: schema.productCategories.categoryId,
        name: schema.categories.name,
      })
      .from(schema.productCategories)
      .innerJoin(
        schema.categories,
        eq(schema.productCategories.categoryId, schema.categories.id),
      )
      .where(inArray(schema.productCategories.productId, ids))
      .orderBy(
        asc(schema.productCategories.sortOrder),
        asc(schema.productCategories.id),
      )
    for (const r of catRows) {
      const list = categoryNamesByProduct.get(r.productId) ?? []
      list.push(r.name)
      categoryNamesByProduct.set(r.productId, list)

      const idsList = categoryIdsByProduct.get(r.productId) ?? []
      idsList.push(r.categoryId)
      categoryIdsByProduct.set(r.productId, idsList)
    }
  }

  const coverIds = [
    ...new Set(
      rows
        .map((r) => r.coverAttachmentId)
        .filter((x): x is string => typeof x === 'string' && x.length > 0),
    ),
  ]
  const coverUrlById = new Map<string, string | null>()
  if (coverIds.length > 0) {
    const covers = await db
      .select({
        id: schema.attachments.id,
        publicUrl: schema.attachments.publicUrl,
      })
      .from(schema.attachments)
      .where(
        and(
          eq(schema.attachments.tenantId, tenantId),
          inArray(schema.attachments.id, coverIds),
          isNull(schema.attachments.deletedAt),
        ),
      )
    for (const cover of covers) {
      coverUrlById.set(cover.id, cover.publicUrl)
    }
  }

  function formatCategorySummary(names: string[]) {
    if (names.length === 0) return '—'
    const head = names.slice(0, 4)
    const rest = names.length - head.length
    return rest > 0 ? `${head.join('、')} 等 ${names.length} 個` : head.join('、')
  }

  return {
    items: rows.map((r) => {
      const catNames = categoryNamesByProduct.get(r.id) ?? []
      return {
        ...r,
        basePrice: String(r.basePrice),
        originalPrice: r.originalPrice ? String(r.originalPrice) : null,
        coverUrl: r.coverAttachmentId ? (coverUrlById.get(r.coverAttachmentId) ?? null) : null,
        variantCount: variantCountMap.get(r.id) ?? 0,
        categoryIds: categoryIdsByProduct.get(r.id) ?? [],
        categoryCount: catNames.length,
        categorySummary: formatCategorySummary(catNames),
      }
    }),
    page,
    pageSize,
    total,
    statusCounts,
    categoryCounts,
  }
})
