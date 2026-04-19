import { eq } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { requireStoreCustomerSession } from '../../utils/requireStoreCustomerSession'
import { storeProfilePatchSchema } from '../../utils/storeProfileSchemas'

export default defineEventHandler(async (event) => {
  const { customer } = await requireStoreCustomerSession(event)
  const raw = await readBody(event)
  const parsed = storeProfilePatchSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const db = getDb(event)
  const [updated] = await db
    .update(schema.customers)
    .set({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.customers.id, customer.id))
    .returning({
      id: schema.customers.id,
      email: schema.customers.email,
      fullName: schema.customers.fullName,
      phone: schema.customers.phone,
    })

  if (!updated) {
    throw createError({ statusCode: 500, message: '更新會員資料失敗' })
  }

  return {
    ok: true as const,
    profile: {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName ?? '',
      phone: updated.phone ?? '',
    },
  }
})
