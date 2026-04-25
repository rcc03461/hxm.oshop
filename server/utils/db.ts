import { drizzle } from 'drizzle-orm/postgres-js'
import type { H3Event } from 'h3'
import postgres from 'postgres'
import { buildDatabaseUrl } from '../database/connectionUrl'
import { getPostgresJsSslOptions } from '../database/postgresOptions'
import * as schema from '../database/schema'

let sql: ReturnType<typeof postgres> | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb(event: H3Event) {
  const config = useRuntimeConfig(event)
  const url = buildDatabaseUrl({
    databaseUrl: (config.databaseUrl as string) || process.env.DATABASE_URL,
    dbHost: (config.dbHost as string) || process.env.db_host || process.env.DB_HOST,
    dbUser: (config.dbUser as string) || process.env.db_user || process.env.DB_USER,
    dbPassword:
      (config.dbPassword as string) ||
      process.env.db_password ||
      process.env.DB_PASSWORD,
    dbName: (config.dbName as string) || process.env.db_name || process.env.DB_NAME,
    dbPort: (config.dbPort as string) || process.env.db_port || process.env.DB_PORT,
    dbSslmode: (config.dbSslmode as string) || process.env.DB_SSLMODE,
  })

  if (!sql) {
    sql = postgres(url, {
      max: 10,
      prepare: false,
      ...getPostgresJsSslOptions(),
    })
    db = drizzle(sql, { schema })
  }

  return db!
}
