import { tryResolveStoreTenant } from '../../utils/resolveStoreTenantFromHost'

export default defineEventHandler(async (event) => {
  const t = await tryResolveStoreTenant(event)
  return { shopSlug: t?.shopSlug ?? null }
})
