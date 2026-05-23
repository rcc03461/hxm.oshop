<script setup lang="ts">
import { SITE_NAME } from '~/constants/site'

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const route = useRoute()
const requestFetch = useRequestFetch()

type StoreHomepageModule = {
  moduleType?: string
  component?: string
  isEnabled: boolean
}

const { data: storeHomepageModules } = await useAsyncData(
  () => `store-homepage-modules-footer-${tenantSlug.value || 'platform'}`,
  async () => {
    if (!tenantSlug.value) return [] as StoreHomepageModule[]
    try {
      const res = await requestFetch<{ items?: StoreHomepageModule[]; dynamicItems?: StoreHomepageModule[] }>(
        '/api/store/homepage/modules',
      )
      return (res.dynamicItems?.length ? res.dynamicItems : res.items) ?? []
    } catch {
      return [] as StoreHomepageModule[]
    }
  },
  { watch: [tenantSlug] },
)

const shouldShowDefaultFooter = computed(() => {
  if (!tenantSlug.value || route.path !== '/') return true
  const footerModule = (storeHomepageModules.value ?? []).find(
    (item) => item.moduleType === 'footer' || item.component === 'footer1',
  )
  return !footerModule?.isEnabled
})

useHead({
  titleTemplate: (title) => (title ? `${title} · ${SITE_NAME}` : SITE_NAME),
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white text-neutral-900">
    <SiteHeader />

    <main class="flex-1">
      <slot />
    </main>

    <StoreCartDrawer />
    <StoreMessagePopup />

    <footer v-if="shouldShowDefaultFooter" class="border-t border-neutral-200">
      <div
        class="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-neutral-500 sm:px-6"
      >
        © {{ new Date().getFullYear() }} {{ SITE_NAME }}
      </div>
    </footer>
  </div>
</template>
