import { AUTH_COOKIE } from '../../utils/authJwt'

export default defineEventHandler(async (event) => {
  deleteCookie(event, AUTH_COOKIE, { path: '/' })
  return { ok: true as const }
})
