import { createError } from 'h3'

export function decimalMul(price: string, qty: number): string {
  const n = Number(price) * qty
  if (!Number.isFinite(n)) {
    throw createError({ statusCode: 400, message: '價格計算異常' })
  }
  return n.toFixed(4)
}

export function sumDecimals(values: string[]): string {
  const s = values.reduce((a, b) => a + Number(b), 0)
  return s.toFixed(4)
}

export function decimalSub(a: string, b: string): string {
  const n = Number(a) - Number(b)
  if (!Number.isFinite(n) || n < 0) {
    throw createError({ statusCode: 400, message: '金額計算異常' })
  }
  return n.toFixed(4)
}

export function compareDecimal(a: string, b: string): number {
  return Number(a) - Number(b)
}

export function decimalMin(a: string, b: string): string {
  return compareDecimal(a, b) <= 0 ? a : b
}
