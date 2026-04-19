/**
 * 遠端 PostgreSQL 常見憑證問題：若連線報 SSL / certificate 錯誤，可在 .env 設
 * DB_SSL_REJECT_UNAUTHORIZED=false（僅建議開發環境）。
 */
export function getPostgresJsSslOptions():
  | { ssl: { rejectUnauthorized: boolean } }
  | Record<PropertyKey, never> {
  const v = (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase()
  if (v === 'false' || v === '0') {
    return { ssl: { rejectUnauthorized: false } }
  }
  return {}
}
