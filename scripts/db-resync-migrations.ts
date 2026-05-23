/**
 * 將 __drizzle_migrations 的 hash 與目前 migration 檔案對齊（不執行 SQL）。
 * 用於資料庫 schema 已存在，但 migration 檔案曾被重新產生導致 hash 全部不符的情況。
 *
 * 依 public schema 內「標記表」判斷已套用到哪一版，只補寫該版（含）以前的 hash。
 *
 * 用法：
 *   bun run db:resync-migrations          # 執行
 *   bun run db:resync-migrations --dry-run
 */
import './load-env-from-dotenv.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import postgres from 'postgres'
import { buildDatabaseUrlFromEnv } from '../server/database/connectionUrl'
import { getPostgresJsSslOptions } from '../server/database/postgresOptions'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = join(__dirname, '../server/database/migrations')
const isDryRun = process.argv.includes('--dry-run')

/** 僅列「會新建代表表」的 migration；純 ALTER 版次靠後續版次推斷 */
const SENTINEL_TABLE_BY_FOLDER_MILLIS: Record<number, string> = {
  1776584929576: 'tenants',
  1776591343357: 'products',
  1776600000000: 'attachments',
  1776610000000: 'categories',
  1776620000000: 'product_categories',
  1776640000000: 'tenant_payment_providers',
  1776650000000: 'shop_orders',
  1776660000000: 'customers',
  1776670000000: 'shop_carts',
  1777081200000: 'pages',
  1777167600000: 'shop_menus',
  1777248000000: 'tenant_homepage_modules',
  1777440000000: 'shop_order_change_logs',
  1777444800000: 'tenant_custom_domains',
  1777447200000: 'customer_messages',
  1777449600000: 'coupons',
}

/** 由最新版往回找第一個「標記表已存在」的 migration index */
function findLastAppliedIndex(
  migrations: ReturnType<typeof readMigrationFiles>,
  existingTables: Set<string>,
): number {
  for (let i = migrations.length - 1; i >= 0; i--) {
    const m = migrations[i]!
    const sentinel = SENTINEL_TABLE_BY_FOLDER_MILLIS[m.folderMillis]
    if (sentinel && existingTables.has(sentinel)) {
      return i
    }
  }
  return -1
}

async function main() {
  const migrations = readMigrationFiles({ migrationsFolder })
  const sql = postgres(buildDatabaseUrlFromEnv(), {
    max: 1,
    prepare: false,
    ...getPostgresJsSslOptions(),
  })

  try {
    const tableRows = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
    `
    const existingTables = new Set(tableRows.map((r) => r.table_name))

    const lastIdx = findLastAppliedIndex(migrations, existingTables)
    if (lastIdx < 0) {
      console.error(
        '[db-resync-migrations] 找不到任何標記表，無法判斷已套用版本。若為全新資料庫請直接 bun run db:migrate',
      )
      process.exit(1)
      return
    }

    const toRecord = migrations.slice(0, lastIdx + 1)
    const pendingAfter = migrations.slice(lastIdx + 1)

    console.info(
      `[db-resync-migrations] 偵測 schema 已套用至 index ${lastIdx}（folderMillis=${migrations[lastIdx]!.folderMillis}）`,
    )
    console.info(
      `[db-resync-migrations] 將寫入 ${toRecord.length} 筆 hash；之後 db:migrate 尚待套用 ${pendingAfter.length} 則`,
    )
    if (pendingAfter.length > 0) {
      console.info(
        '[db-resync-migrations] 待套用：',
        pendingAfter.map((m) => m.folderMillis).join(', '),
      )
    }

    if (isDryRun) {
      console.info('[db-resync-migrations] dry-run：未變更資料庫')
      return
    }

    await sql.begin(async (tx) => {
      await tx`delete from public.__drizzle_migrations`
      for (const migration of toRecord) {
        await tx`
          insert into public.__drizzle_migrations ("hash", "created_at")
          values (${migration.hash}, ${migration.folderMillis})
        `
      }
    })

    console.info('[db-resync-migrations] 完成。請執行：bun run db:migrate')
  } catch (e) {
    console.error('[db-resync-migrations] 失敗:', e)
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main()
