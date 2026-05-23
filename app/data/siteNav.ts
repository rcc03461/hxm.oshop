export type SiteNavLink = {
  label: string
  href: string
  external?: boolean
}

/** 平台首頁（無租戶）頂部導覽 */
export const platformNavLinks: SiteNavLink[] = [
  { label: '功能', href: '#features' },
  { label: '展示', href: '#showcase' },
]
