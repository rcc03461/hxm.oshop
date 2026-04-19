import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { setCustomerSessionCookie } from '../../../utils/customerAuthCookie'
import { signCustomerSessionToken } from '../../../utils/customerAuthJwt'
import { getDb } from '../../../utils/db'
import { mergeSessionCartIntoCustomerCart } from '../../../utils/storeCartService'
import { requireTenantStoreContext } from '../../../utils/requireTenantStoreContext'
import { storeCustomerRegisterBodySchema } from '../../../utils/storeCustomerAuthSchemas'
import { isMissingRelationError } from '../../../utils/postgresGuards'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = storeCustomerRegisterBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const tenant = await requireTenantStoreContext(event)
  const db = getDb(event)
  const email = parsed.data.email.toLowerCase()

  const exists = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.tenantId, tenant.tenantId),
        eq(schema.customers.email, email),
      ),
    )
    .limit(1)

  if (exists.length > 0) {
    throw createError({ statusCode: 409, message: '此電子郵件已被註冊' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const inserted = await db
    .insert(schema.customers)
    .values({
      tenantId: tenant.tenantId,
      email,
      passwordHash,
      fullName: parsed.data.fullName,
    })
    .returning({
      id: schema.customers.id,
      email: schema.customers.email,
      fullName: schema.customers.fullName,
    })
  const customer = inserted[0]
  if (!customer) {
    throw createError({ statusCode: 500, message: '建立會員失敗' })
  }

  const token = await signCustomerSessionToken(event, {
    sub: customer.id,
    email: customer.email,
    tenantId: tenant.tenantId,
    shopSlug: tenant.shopSlug,
  })
  setCustomerSessionCookie(event, token)
  try {
    await mergeSessionCartIntoCustomerCart(event, tenant.tenantId, customer.id)
  } catch (err) {
    if (!isMissingRelationError(err, 'shop_carts')) throw err
    console.warn(
      '[store/auth/register] shop_carts 尚未建立，略過 cart merge（請先執行 db:migrate）',
    )
  }

  return {
    ok: true as const,
    customer: {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
    },
  }
})
