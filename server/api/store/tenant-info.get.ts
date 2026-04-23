import { and, eq, inArray, isNull } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { requireStoreTenant } from '../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const db = getDb(event)

  const [row] = await db
    .select({
      shopSlug: schema.tenants.shopSlug,
      settings: schema.tenants.settings,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenant.id))
    .limit(1)

  if (!row) {
    return {
      shopSlug: tenant.shopSlug,
      displayName: tenant.shopSlug,
      logoUrl: null as string | null,
    }
  }

  const settings = (row.settings ?? {}) as Record<string, unknown>
  const displayNameRaw = settings.displayName
  const displayName =
    typeof displayNameRaw === 'string' && displayNameRaw.trim()
      ? displayNameRaw.trim()
      : row.shopSlug

  const logoId = typeof settings.logoAttachmentId === 'string' ? settings.logoAttachmentId : null
  let logoUrl: string | null = null

  if (logoId) {
    const rows = await db
      .select({
        publicUrl: schema.attachments.publicUrl,
      })
      .from(schema.attachments)
      .where(
        and(
          eq(schema.attachments.tenantId, tenant.id),
          isNull(schema.attachments.deletedAt),
          inArray(schema.attachments.id, [logoId]),
        ),
      )
      .limit(1)

    logoUrl = rows[0]?.publicUrl ?? null
  }

  return {
    shopSlug: row.shopSlug,
    displayName,
    logoUrl,
  }
})
