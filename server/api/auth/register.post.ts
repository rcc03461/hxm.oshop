import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { AUTH_COOKIE, signSessionToken } from '../../utils/authJwt'
import { getDb } from '../../utils/db'
import { registerBodySchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = registerBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const { shopSlug, email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()
  const db = getDb(event)

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const result = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(schema.tenants)
        .values({ shopSlug })
        .returning()

      if (!tenant) {
        throw createError({ statusCode: 500, message: '建立租戶失敗' })
      }

      const [user] = await tx
        .insert(schema.users)
        .values({
          tenantId: tenant.id,
          email: normalizedEmail,
          passwordHash,
        })
        .returning()

      if (!user) {
        throw createError({ statusCode: 500, message: '建立帳號失敗' })
      }

      return { tenant, user }
    })

    const token = await signSessionToken(event, {
      sub: result.user.id,
      email: normalizedEmail,
      tenantId: result.tenant.id,
      shopSlug: result.tenant.shopSlug,
    })

    setCookie(event, AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    })

    return {
      ok: true as const,
      tenant: { shopSlug: result.tenant.shopSlug },
      user: { email: normalizedEmail },
    }
  } catch (e: unknown) {
    if (isPostgresUniqueViolation(e)) {
      const slugTaken = await db
        .select({ id: schema.tenants.id })
        .from(schema.tenants)
        .where(eq(schema.tenants.shopSlug, shopSlug))
        .limit(1)
      if (slugTaken.length) {
        throw createError({ statusCode: 409, message: '此商店代號已被使用' })
      }
      throw createError({ statusCode: 409, message: '此電子郵件已被註冊' })
    }
    throw e
  }
})

function isPostgresUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: string }).code === '23505'
  )
}
