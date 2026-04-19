import { and, desc, eq } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireStoreCustomerSession } from '../../../utils/requireStoreCustomerSession'

export default defineEventHandler(async (event) => {
  const { tenant, customer } = await requireStoreCustomerSession(event)
  const db = getDb(event)
  const rows = await db
    .select({
      id: schema.shopOrders.id,
      orderUuid: schema.shopOrders.invoicePublicId,
      status: schema.shopOrders.status,
      currency: schema.shopOrders.currency,
      total: schema.shopOrders.total,
      createdAt: schema.shopOrders.createdAt,
    })
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.tenantId, tenant.tenantId),
        eq(schema.shopOrders.customerId, customer.id),
      ),
    )
    .orderBy(desc(schema.shopOrders.createdAt))
    .limit(100)

  return { orders: rows }
})
