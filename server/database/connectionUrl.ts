/**
 * 組合 PostgreSQL 連線字串（供 Nitro runtime 與 drizzle-kit 共用）
 */
export type DatabaseUrlInput = {
  databaseUrl?: string
  dbHost?: string
  dbUser?: string
  dbPassword?: string
  dbName?: string
  dbPort?: string
  dbSslmode?: string
}

export function buildDatabaseUrl(input: DatabaseUrlInput): string {
  const direct = input.databaseUrl?.trim()
  if (direct) return direct

  const host = input.dbHost?.trim()
  const user = input.dbUser?.trim()
  const password = input.dbPassword ?? ''
  const name = input.dbName?.trim()
  const port = (input.dbPort?.trim() || '5432').trim()
  // 預設 prefer：先嘗試 TLS，對方不支援時退回明文，避免誤用 require 連到非 TLS 實例時握手被 RST。
  // 正式環境建議在 .env 明確設定 DB_SSLMODE=require。
  const sslmode = (input.dbSslmode?.trim() || 'prefer').trim()

  if (!host || !user || !name) {
    throw new Error(
      '缺少資料庫設定：請設定 DATABASE_URL，或 db_host / db_user / db_password / db_name',
    )
  }

  const q = (s: string) => encodeURIComponent(s)
  return `postgresql://${q(user)}:${q(String(password))}@${q(host)}:${q(port)}/${q(name)}?sslmode=${q(sslmode)}`
}

/** 讀取 process.env（供 drizzle.config 等 Node 腳本使用） */
export function buildDatabaseUrlFromEnv(): string {
  return buildDatabaseUrl({
    databaseUrl: process.env.DATABASE_URL,
    dbHost: process.env.db_host || process.env.DB_HOST,
    dbUser: process.env.db_user || process.env.DB_USER,
    dbPassword: process.env.db_password || process.env.DB_PASSWORD,
    dbName: process.env.db_name || process.env.DB_NAME,
    dbPort: process.env.db_port || process.env.DB_PORT,
    dbSslmode: process.env.DB_SSLMODE,
  })
}
