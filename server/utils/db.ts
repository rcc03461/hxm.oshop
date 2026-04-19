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
    databaseUrl: config.databaseUrl as string,
    dbHost: config.dbHost as string,
    dbUser: config.dbUser as string,
    dbPassword: config.dbPassword as string,
    dbName: config.dbName as string,
    dbPort: config.dbPort as string,
    dbSslmode: config.dbSslmode as string,
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
