import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { setCustomerSessionCookie } from '../../../utils/customerAuthCookie'
import { signCustomerSessionToken } from '../../../utils/customerAuthJwt'
import { getDb } from '../../../utils/db'
import { requireTenantStoreContext } from '../../../utils/requireTenantStoreContext'
import { mergeSessionCartIntoCustomerCart } from '../../../utils/storeCartService'
import { storeCustomerLoginBodySchema } from '../../../utils/storeCustomerAuthSchemas'
import { isMissingRelationError } from '../../../utils/postgresGuards'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = storeCustomerLoginBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const tenant = await requireTenantStoreContext(event)
  const db = getDb(event)
  const email = parsed.data.email.toLowerCase()

  const rows = await db
    .select({
      id: schema.customers.id,
      email: schema.customers.email,
      fullName: schema.customers.fullName,
      passwordHash: schema.customers.passwordHash,
    })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.tenantId, tenant.tenantId),
        eq(schema.customers.email, email),
      ),
    )
    .limit(1)
  const customer = rows[0]
  if (!customer) {
    throw createError({ statusCode: 401, message: '帳號或密碼不正確' })
  }

  const passOk = await bcrypt.compare(parsed.data.password, customer.passwordHash)
  if (!passOk) {
    throw createError({ statusCode: 401, message: '帳號或密碼不正確' })
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
      '[store/auth/login] shop_carts 尚未建立，略過 cart merge（請先執行 db:migrate）',
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
