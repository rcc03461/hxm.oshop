/**
 * 套用 Drizzle migrations。
 * 內建 `migrate()` 會先執行 `CREATE SCHEMA`，許多雲端「僅應用程式」帳號沒有此權限；
 * 此腳本改為只在 `public` 建立 `__drizzle_migrations` 表並套用 SQL，錯誤會完整印出。
 *
 * 用法：bun run db:migrate
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
const isBaselineMode = process.argv.includes('--baseline')

async function main() {
  let url: string
  try {
    url = buildDatabaseUrlFromEnv()
  } catch (e) {
    console.error('[db-migrate] 無法組合連線字串:', e)
    process.exit(1)
    return
  }

  const sslOpts = getPostgresJsSslOptions()
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    ...sslOpts,
  })

  try {
    console.info('[db-migrate] 套用 migrations…', migrationsFolder)

    const migrations = readMigrationFiles({ migrationsFolder })

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `)

    // 以 hash 判斷是否已套用（與 journal 內容一致），勿僅用 max(created_at) 與 folderMillis 比較——
    // 若 DB 內 created_at 與 journal 的 `when` 曾不一致，會誤判為「已跟上」而略過新 migration。
    const appliedRows = await sql<{ hash: string }[]>`
      select hash from public.__drizzle_migrations
    `
    const applied = new Set(appliedRows.map((r) => r.hash))
    const pending = migrations.filter((m) => !applied.has(m.hash))
    console.info(
      `[db-migrate] 已套用 ${applied.size}/${migrations.length} 則 migration，待套用 ${pending.length} 則`,
    )

    if (isBaselineMode) {
      if (pending.length === 0) {
        console.info('[db-migrate] baseline 模式：無待寫入 migration 記錄')
      } else {
        await sql.begin(async (tx) => {
          for (const migration of pending) {
            await tx`
              insert into public.__drizzle_migrations ("hash", "created_at")
              values (${migration.hash}, ${migration.folderMillis})
              on conflict do nothing
            `
          }
        })
        console.info(
          `[db-migrate] baseline 模式：已補寫 ${pending.length} 筆 migration 記錄（未執行 SQL）`,
        )
      }
      console.info('[db-migrate] 完成')
      return
    }

    await sql.begin(async (tx) => {
      for (const migration of migrations) {
        if (applied.has(migration.hash)) {
          continue
        }
        for (const stmt of migration.sql) {
          const trimmed = stmt.trim()
          if (trimmed.length > 0) {
            await tx.unsafe(trimmed)
          }
        }
        await tx`
          insert into public.__drizzle_migrations ("hash", "created_at")
          values (${migration.hash}, ${migration.folderMillis})
        `
      }
    })

    console.info('[db-migrate] 完成')
  } catch (e) {
    console.error('[db-migrate] 失敗:', e)
    const err = e as { cause?: { code?: string; message?: string } }
    const code = err.cause?.code
    if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
      console.error(
        '\n[db-migrate] 連線中斷常見原因：主機／埠錯誤、防火牆未開放，或 SSL 模式與伺服器不符。',
      )
      console.error(
        '可嘗試在 .env 調整：DB_SSLMODE=prefer 或 DB_SSLMODE=disable（僅限確定伺服器不加密時）；',
      )
      console.error(
        '若為憑證驗證失敗，可試：DB_SSL_REJECT_UNAUTHORIZED=false（僅建議開發環境）。\n',
      )
    }
    if (code === '42501') {
      console.error(
        '\n[db-migrate] 權限不足（42501）：請確認帳號可在 public schema 建表並執行 migration SQL；',
      )
      console.error(
        '或由 DBA 執行：GRANT CREATE ON SCHEMA public TO 你的角色;（依主機商政策而定）。\n',
      )
    }
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main()
