// @ts-ignore Bun test types are not configured in this repository yet.
import { describe, expect, test } from 'bun:test'
import { resolveCartLineImageUrl } from './storeCartService'

describe('storeCartService', () => {
  test('購物車圖片優先使用規格圖，否則使用商品封面', () => {
    expect(resolveCartLineImageUrl('/uploads/cover.jpg', '/uploads/variant.jpg')).toBe(
      '/uploads/variant.jpg',
    )
    expect(resolveCartLineImageUrl('/uploads/cover.jpg', null)).toBe('/uploads/cover.jpg')
    expect(resolveCartLineImageUrl(null, null)).toBeNull()
  })
})
