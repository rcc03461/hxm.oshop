type PgLikeError = {
  code?: string
  message?: string
}

function asPgError(err: unknown): PgLikeError | null {
  if (!err || typeof err !== 'object') return null
  return err as PgLikeError
}

export function isMissingRelationError(err: unknown, relationName: string): boolean {
  const pg = asPgError(err)
  if (!pg) return false
  if (pg.code !== '42P01') return false
  const msg = String(pg.message ?? '').toLowerCase()
  return msg.includes(`relation "${relationName.toLowerCase()}" does not exist`)
}
