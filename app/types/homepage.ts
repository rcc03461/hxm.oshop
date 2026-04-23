import type { LandingCategory, LandingHero, LandingProductCard } from '~/types/landing'

export const HOMEPAGE_MODULE_TYPES = ['nav', 'banner', 'category', 'products', 'footer'] as const
export type HomepageModuleType = (typeof HOMEPAGE_MODULE_TYPES)[number]

export const HOMEPAGE_VERSION_STATES = ['draft', 'published'] as const
export type HomepageVersionState = (typeof HOMEPAGE_VERSION_STATES)[number]

export type HomepageNavModuleConfig = {
  show: boolean
}

export type HomepageBannerModuleConfig = {
  hero: LandingHero
}

export type HomepageCategoryModuleConfig = {
  title: string
  categories: LandingCategory[]
}

export type HomepageProductsModuleConfig = {
  title: string
  categories: LandingCategory[]
  products: LandingProductCard[]
}

export type HomepageFooterModuleConfig = {
  text: string
}

export type HomepageModuleConfigMap = {
  nav: HomepageNavModuleConfig
  banner: HomepageBannerModuleConfig
  category: HomepageCategoryModuleConfig
  products: HomepageProductsModuleConfig
  footer: HomepageFooterModuleConfig
}

export type HomepageModule<T extends HomepageModuleType = HomepageModuleType> = {
  moduleKey: string
  moduleType: T
  sortOrder: number
  isEnabled: boolean
  config: HomepageModuleConfigMap[T]
}
