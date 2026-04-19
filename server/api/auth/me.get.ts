import { getCookie } from 'h3'
import { AUTH_COOKIE, verifySessionToken } from '../../utils/authJwt'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, AUTH_COOKIE)
  if (!token) {
    return { user: null as null }
  }

  try {
    const session = await verifySessionToken(event, token)
    return {
      user: {
        id: session.sub,
        email: session.email,
        tenantId: session.tenantId,
        shopSlug: session.shopSlug,
      },
    }
  } catch {
    return { user: null as null }
  }
})
