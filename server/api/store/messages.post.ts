import { eq } from 'drizzle-orm'
import { createError, readBody } from 'h3'
import * as schema from '../../database/schema'
import { storeMessageBodySchema } from '../../utils/customerMessageSchemas'
import { getDb } from '../../utils/db'
import { getOptionalStoreCustomerSession } from '../../utils/optionalStoreCustomerSession'
import { requireStoreTenant } from '../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const raw = await readBody(event)
  const parsed = storeMessageBodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '驗證失敗',
    })
  }

  const db = getDb(event)
  const customerSession = await getOptionalStoreCustomerSession(
    event,
    tenant.id,
    tenant.shopSlug,
  )

  let customerId: string | null = customerSession?.customerId ?? null
  let name = parsed.data.name
  let email = parsed.data.email
  let phone = parsed.data.phone ?? null

  if (customerSession) {
    const [customer] = await db
      .select({
        id: schema.customers.id,
        fullName: schema.customers.fullName,
        email: schema.customers.email,
        phone: schema.customers.phone,
      })
      .from(schema.customers)
      .where(eq(schema.customers.id, customerSession.customerId))
      .limit(1)

    if (customer) {
      customerId = customer.id
      name = customer.fullName?.trim() || name
      email = customer.email
      phone = customer.phone?.trim() || phone
    }
  }

  const [created] = await db
    .insert(schema.customerMessages)
    .values({
      tenantId: tenant.id,
      customerId,
      name,
      email,
      phone,
      message: parsed.data.message,
      status: 'pending',
    })
    .returning({
      id: schema.customerMessages.id,
      createdAt: schema.customerMessages.createdAt,
    })

  if (!created) {
    throw createError({ statusCode: 500, message: '提交留言失敗' })
  }

  return {
    id: created.id,
    createdAt: created.createdAt.toISOString(),
  }
})
