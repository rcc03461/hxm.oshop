import { and, eq } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireStoreCustomerSession } from '../../../utils/requireStoreCustomerSession'

export default defineEventHandler(async (event) => {
  const orderUuid = getRouterParam(event, 'orderUuid')
  if (!orderUuid) {
    throw createError({ statusCode: 400, message: '缺少 orderUuid' })
  }

  const { tenant, customer } = await requireStoreCustomerSession(event)
  const db = getDb(event)

  const orderRows = await db
    .select({
      id: schema.shopOrders.id,
      orderUuid: schema.shopOrders.invoicePublicId,
      status: schema.shopOrders.status,
      currency: schema.shopOrders.currency,
      subtotal: schema.shopOrders.subtotal,
      total: schema.shopOrders.total,
      customerEmail: schema.shopOrders.customerEmail,
      paymentProvider: schema.shopOrders.paymentProvider,
      createdAt: schema.shopOrders.createdAt,
    })
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.tenantId, tenant.tenantId),
        eq(schema.shopOrders.customerId, customer.id),
        eq(schema.shopOrders.invoicePublicId, orderUuid),
      ),
    )
    .limit(1)
  const order = orderRows[0]
  if (!order) {
    throw createError({ statusCode: 404, message: '找不到訂單' })
  }

  const lines = await db
    .select({
      id: schema.shopOrderLines.id,
      title: schema.shopOrderLines.titleSnapshot,
      sku: schema.shopOrderLines.skuSnapshot,
      unitPrice: schema.shopOrderLines.unitPrice,
      quantity: schema.shopOrderLines.quantity,
      lineTotal: schema.shopOrderLines.lineTotal,
    })
    .from(schema.shopOrderLines)
    .where(eq(schema.shopOrderLines.orderId, order.id))

  return { order: { ...order, lines } }
})
