import './load-env-from-dotenv.js'
import postgres from 'postgres'
import { buildDatabaseUrlFromEnv } from '../server/database/connectionUrl'
import { getPostgresJsSslOptions } from '../server/database/postgresOptions'

async function main() {
  const sql = postgres(buildDatabaseUrlFromEnv(), {
    max: 1,
    prepare: false,
    ...getPostgresJsSslOptions(),
  })

  try {
    console.info('[db-repair:custom-domains] 開始檢查並修復 tenant_custom_domains…')

    await sql.begin(async (tx) => {
      await tx.unsafe(`
        ALTER TABLE public.tenant_custom_domains
        ADD COLUMN IF NOT EXISTS verification_token text
      `)
      await tx.unsafe(`
        ALTER TABLE public.tenant_custom_domains
        ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone
      `)
      await tx.unsafe(`
        ALTER TABLE public.tenant_custom_domains
        ADD COLUMN IF NOT EXISTS created_at timestamp with time zone
      `)
      await tx.unsafe(`
        ALTER TABLE public.tenant_custom_domains
        ADD COLUMN IF NOT EXISTS cf_custom_hostname_id varchar(64)
      `)

      await tx.unsafe(`
        UPDATE public.tenant_custom_domains
        SET created_at = now()
        WHERE created_at IS NULL
      `)

      await tx.unsafe(`
        ALTER TABLE public.tenant_custom_domains
        ALTER COLUMN created_at SET DEFAULT now()
      `)
      await tx.unsafe(`
        ALTER TABLE public.tenant_custom_domains
        ALTER COLUMN created_at SET NOT NULL
      `)

      await tx.unsafe(`
        CREATE INDEX IF NOT EXISTS tenant_custom_domains_tenant_id_idx
          ON public.tenant_custom_domains (tenant_id)
      `)
      await tx.unsafe(`
        CREATE INDEX IF NOT EXISTS tenant_custom_domains_hostname_verified_partial_idx
          ON public.tenant_custom_domains (hostname)
          WHERE verified_at IS NOT NULL
      `)
    })

    console.info('[db-repair:custom-domains] 修復完成')
  } catch (e) {
    console.error('[db-repair:custom-domains] 失敗:', e)
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main()
