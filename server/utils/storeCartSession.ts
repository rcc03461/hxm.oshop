import { randomUUID } from 'node:crypto'
import { getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'

export const STORE_CART_COOKIE = 'oshop_store_cart_key'

export function getOrCreateStoreCartSessionKey(event: H3Event): string {
  const existing = getCookie(event, STORE_CART_COOKIE)
  if (existing && existing.trim()) return existing
  const key = randomUUID()
  setCookie(event, STORE_CART_COOKIE, key, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  })
  return key
}
