import { createError } from 'h3'
import { getDb } from '../../../utils/db'
import { listHomepageModules } from '../../../utils/homepageModules'
import { requireStoreTenant } from '../../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const db = getDb(event)
  const items = await listHomepageModules(db, tenant.id, 'published')

  if (!items.length) {
    throw createError({ statusCode: 404, message: '尚未發佈首頁模組' })
  }

  return {
    version: 'published' as const,
    items,
  }
})
