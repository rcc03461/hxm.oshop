<script setup lang="ts">
import { platformNavLinks } from '~/data/siteNav'
import { SITE_NAME } from '~/constants/site'

const { user, refresh, logout } = useAuth()
const { customer, refresh: refreshCustomer, logout: logoutCustomer } = useCustomerAuth()
const tenantSlug = useState<string | null>('oshop-tenant-slug')
const { totalQty } = useStoreCart()
const { openCartDrawer } = useCartDrawer()
const { openMessagePopup } = useMessagePopup()
const requestFetch = useRequestFetch()

const route = useRoute()
const mobileOpen = ref(false)

type StoreNavItem = {
  id: string
  title: string
  href: string
  target: '_self' | '_blank'
  children: StoreNavItem[]
}

type StoreHomepageModule = {
  moduleType?: string
  component?: string
  isEnabled: boolean
  config?: Record<string, unknown>
  props?: Record<string, unknown>
}

const { data: storeNav } = await useAsyncData(
  () => `store-navigation-${tenantSlug.value || 'platform'}`,
  async () => {
    if (!tenantSlug.value) return [] as StoreNavItem[]
    try {
      const res = await requestFetch<{ items: StoreNavItem[] }>('/api/store/navigation')
      return res.items ?? []
    } catch {
      return [] as StoreNavItem[]
    }
  },
  { watch: [tenantSlug] },
)

const { data: storeHomepageModules } = await useAsyncData(
  () => `store-homepage-modules-nav-${tenantSlug.value || 'platform'}`,
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

const showTopNav = computed(() => {
  if (!tenantSlug.value) return true
  const navModule = (storeHomepageModules.value ?? []).find(
    (item) => item.moduleType === 'nav' || item.component === 'nav1',
  )
  if (!navModule || !navModule.isEnabled) return false
  const configShow =
    ((navModule.config as { show?: boolean } | undefined)?.show ??
      (navModule.props as { show?: boolean } | undefined)?.show)
  return configShow !== false
})

const { data: tenantInfo } = await useAsyncData(
  () => `store-tenant-info-${tenantSlug.value || 'platform'}`,
  async () => {
    if (!tenantSlug.value) {
      return null as null | {
        shopSlug: string
        displayName: string
        logoUrl: string | null
      }
    }
    try {
      return await requestFetch<{
        shopSlug: string
        displayName: string
        logoUrl: string | null
      }>('/api/store/tenant-info')
    } catch {
      return {
        shopSlug: tenantSlug.value,
        displayName: tenantSlug.value,
        logoUrl: null,
      }
    }
  },
  { watch: [tenantSlug] },
)

const isPlatform = computed(() => !tenantSlug.value)

const adminEntry = computed(() =>
  user.value ? useTenantAdminEntryUrl(user.value.shopSlug) : '',
)

const navLinkClass =
  'rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900'

const navLinkActiveClass =
  'rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100'

onMounted(() => {
  void refresh()
  void refreshCustomer()
})

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)

async function handleLogout() {
  await logout()
  await navigateTo('/')
}

async function handleCustomerLogout() {
  await logoutCustomer()
  await navigateTo('/')
}

function closeMobile() {
  mobileOpen.value = false
}
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md"
  >
    <div
      class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6"
    >
      <NuxtLink
        to="/"
        class="shrink-0 rounded-lg outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        @click="closeMobile"
      >
        <SiteLogo
          :name="isPlatform ? SITE_NAME : (tenantInfo?.displayName ?? SITE_NAME)"
          :logo-src="isPlatform ? undefined : (tenantInfo?.logoUrl ?? null)"
          :icon-only="!isPlatform && !!tenantInfo?.logoUrl"
        />
      </NuxtLink>

      <!-- 桌面導覽 -->
      <nav
        v-if="showTopNav"
        class="hidden flex-1 items-center justify-center gap-1 md:flex"
        aria-label="主要導覽"
      >
        <template v-if="isPlatform">
          <a
            v-for="link in platformNavLinks"
            :key="link.href"
            :href="link.href"
            :class="navLinkClass"
          >
            {{ link.label }}
          </a>
        </template>
        <template v-else>
          <NuxtLink to="/products" :class="navLinkClass">
            商品
          </NuxtLink>
          <a
            v-for="item in storeNav ?? []"
            :key="item.id"
            :href="item.href"
            :target="item.target"
            :rel="item.target === '_blank' ? 'noopener noreferrer' : undefined"
            :class="navLinkClass"
          >
            {{ item.title }}
          </a>
        </template>
      </nav>

      <!-- 桌面右側操作 -->
      <div
        v-if="showTopNav"
        class="hidden shrink-0 items-center gap-2 md:flex"
      >
        <template v-if="!isPlatform">
          <button
            type="button"
            :class="navLinkClass"
            @click="openMessagePopup"
          >
            留言
          </button>
          <button
            type="button"
            data-cart-trigger="true"
            class="relative"
            :class="navLinkClass"
            @click="openCartDrawer"
          >
            購物車
            <span
              v-if="totalQty > 0"
              class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold leading-none text-white"
            >
              {{ totalQty > 99 ? '99+' : totalQty }}
            </span>
          </button>
        </template>

        <template v-if="user">
          <NuxtLink
            v-if="tenantSlug && user.shopSlug === tenantSlug"
            to="/admin/dashboard"
            :class="navLinkClass"
          >
            後台
          </NuxtLink>
          <NuxtLink
            v-else-if="isPlatform"
            :to="adminEntry"
            external
            :class="navLinkClass"
          >
            商店後台
          </NuxtLink>
          <button
            type="button"
            :class="navLinkClass"
            @click="handleLogout"
          >
            登出
          </button>
        </template>
        <template v-else-if="customer && tenantSlug">
          <NuxtLink to="/profile" :class="navLinkClass">
            會員中心
          </NuxtLink>
          <button
            type="button"
            :class="navLinkClass"
            @click="handleCustomerLogout"
          >
            登出
          </button>
        </template>
        <template v-else>
          <NuxtLink
            :to="tenantSlug ? '/login' : '/admin/login'"
            :class="navLinkClass"
          >
            登入
          </NuxtLink>
          <NuxtLink
            :to="tenantSlug ? '/register' : '/admin/register'"
            class="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
          >
            {{ tenantSlug ? '會員註冊' : '免費開店' }}
          </NuxtLink>
        </template>
      </div>

      <!-- 手機選單按鈕 -->
      <button
        v-if="showTopNav"
        type="button"
        class="inline-flex items-center justify-center rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 md:hidden"
        :aria-expanded="mobileOpen"
        aria-controls="site-mobile-nav"
        aria-label="開啟選單"
        @click="mobileOpen = !mobileOpen"
      >
        <svg
          v-if="!mobileOpen"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg
          v-else
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>

    <!-- 手機展開選單 -->
    <div
      v-if="showTopNav && mobileOpen"
      id="site-mobile-nav"
      class="border-t border-neutral-200 bg-white md:hidden"
    >
      <nav class="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6" aria-label="手機導覽">
        <template v-if="isPlatform">
          <a
            v-for="link in platformNavLinks"
            :key="link.href"
            :href="link.href"
            :class="navLinkActiveClass"
            @click="closeMobile"
          >
            {{ link.label }}
          </a>
        </template>
        <template v-else>
          <NuxtLink to="/products" :class="navLinkActiveClass" @click="closeMobile">
            商品
          </NuxtLink>
          <a
            v-for="item in storeNav ?? []"
            :key="item.id"
            :href="item.href"
            :target="item.target"
            :rel="item.target === '_blank' ? 'noopener noreferrer' : undefined"
            :class="navLinkActiveClass"
            @click="closeMobile"
          >
            {{ item.title }}
          </a>
          <button
            type="button"
            :class="navLinkActiveClass + ' text-left'"
            @click="openMessagePopup(); closeMobile()"
          >
            留言
          </button>
          <button
            type="button"
            :class="navLinkActiveClass + ' text-left'"
            @click="openCartDrawer(); closeMobile()"
          >
            購物車
            <span v-if="totalQty > 0" class="ml-1 text-orange-600">({{ totalQty }})</span>
          </button>
        </template>

        <div class="mt-2 flex flex-col gap-2 border-t border-neutral-100 pt-3">
          <template v-if="user">
            <NuxtLink
              v-if="tenantSlug && user.shopSlug === tenantSlug"
              to="/admin/dashboard"
              :class="navLinkActiveClass"
              @click="closeMobile"
            >
              後台
            </NuxtLink>
            <NuxtLink
              v-else-if="isPlatform"
              :to="adminEntry"
              external
              :class="navLinkActiveClass"
              @click="closeMobile"
            >
              商店後台
            </NuxtLink>
            <button
              type="button"
              :class="navLinkActiveClass + ' text-left'"
              @click="handleLogout"
            >
              登出
            </button>
          </template>
          <template v-else-if="customer && tenantSlug">
            <NuxtLink to="/profile" :class="navLinkActiveClass" @click="closeMobile">
              會員中心
            </NuxtLink>
            <button
              type="button"
              :class="navLinkActiveClass + ' text-left'"
              @click="handleCustomerLogout"
            >
              登出
            </button>
          </template>
          <template v-else>
            <NuxtLink
              :to="tenantSlug ? '/login' : '/admin/login'"
              :class="navLinkActiveClass"
              @click="closeMobile"
            >
              登入
            </NuxtLink>
            <NuxtLink
              :to="tenantSlug ? '/register' : '/admin/register'"
              class="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-orange-600"
              @click="closeMobile"
            >
              {{ tenantSlug ? '會員註冊' : '免費開店' }}
            </NuxtLink>
          </template>
        </div>
      </nav>
    </div>
  </header>
</template>
