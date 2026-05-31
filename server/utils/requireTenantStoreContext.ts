import type { H3Event } from 'h3'
import { requireAccessibleStoreTenant } from './storeTenant'

export async function requireTenantStoreContext(event: H3Event): Promise<{
  tenantId: string
  shopSlug: string
}> {
  const tenant = await requireAccessibleStoreTenant(event)
  return { tenantId: tenant.id, shopSlug: tenant.shopSlug }
}
