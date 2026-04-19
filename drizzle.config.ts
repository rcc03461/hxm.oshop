import { defineConfig } from 'drizzle-kit'
import { buildDatabaseUrlFromEnv } from './server/database/connectionUrl'

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: buildDatabaseUrlFromEnv(),
  },
})
