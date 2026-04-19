import { and, eq } from 'drizzle-orm'
import { getCookie } from 'h3'
import * as schema from '../../../database/schema'
import { CUSTOMER_AUTH_COOKIE, verifyCustomerSessionToken } from '../../../utils/customerAuthJwt'
import { getDb } from '../../../utils/db'
import { requireTenantStoreContext } from '../../../utils/requireTenantStoreContext'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, CUSTOMER_AUTH_COOKIE)
  if (!token) return { customer: null as null }

  try {
    const session = await verifyCustomerSessionToken(event, token)
    const tenant = await requireTenantStoreContext(event)
    if (
      session.tenantId !== tenant.tenantId ||
      session.shopSlug !== tenant.shopSlug
    ) {
      return { customer: null as null }
    }

    const db = getDb(event)
    const rows = await db
      .select({
        id: schema.customers.id,
        email: schema.customers.email,
        fullName: schema.customers.fullName,
      })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, session.sub),
          eq(schema.customers.tenantId, session.tenantId),
        ),
      )
      .limit(1)
    const customer = rows[0]
    if (!customer) return { customer: null as null }
    return { customer }
  } catch {
    return { customer: null as null }
  }
})
