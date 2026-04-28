import { and, eq, isNotNull } from 'drizzle-orm'
import { getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import { normalizeRequestHostname } from '../../app/utils/hostNormalize'
import { parseTenantSlugFromHost } from '../../app/utils/tenantHost'
import * as schema from '../database/schema'
import { getDb } from './db'

export type ResolvedStoreTenant = {
  id: string
  shopSlug: string
  match: 'custom_domain' | 'subdomain'
}

export async function tryResolveStoreTenant(
  event: H3Event,
): Promise<ResolvedStoreTenant | null> {
  const root = String(
    useRuntimeConfig(event).public.tenantRootDomain || 'shopgo.com.hk',
  )
  const rawHost = getRequestURL(event).host
  const host = normalizeRequestHostname(rawHost)
  if (!host) return null

  const db = getDb(event)

  const [fromCustom] = await db
    .select({
      id: schema.tenants.id,
      shopSlug: schema.tenants.shopSlug,
    })
    .from(schema.tenantCustomDomains)
    .innerJoin(
      schema.tenants,
      eq(schema.tenantCustomDomains.tenantId, schema.tenants.id),
    )
    .where(
      and(
        eq(schema.tenantCustomDomains.hostname, host),
        isNotNull(schema.tenantCustomDomains.verifiedAt),
      ),
    )
    .limit(1)

  if (fromCustom?.id && fromCustom?.shopSlug) {
    return {
      id: fromCustom.id,
      shopSlug: fromCustom.shopSlug,
      match: 'custom_domain',
    }
  }

  const slug = parseTenantSlugFromHost(rawHost, root)
  if (!slug) return null

  const [tenant] = await db
    .select({
      id: schema.tenants.id,
      shopSlug: schema.tenants.shopSlug,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.shopSlug, slug))
    .limit(1)

  if (!tenant?.id || !tenant?.shopSlug) return null

  return {
    id: tenant.id,
    shopSlug: tenant.shopSlug,
    match: 'subdomain',
  }
}
