<script setup lang="ts">
const tenantSlug = useState<string | null>('oshop-tenant-slug')
const route = useRoute()

const nav = [
  {
    to: '/admin/dashboard',
    label: '總覽',
    icon: 'M3 13h8V3H3v10Zm10 8h8v-6h-8v6ZM3 21h8v-6H3v6Zm10-8h8V3h-8v10Z',
  },
  {
    to: '/admin/homepage',
    label: '首頁模組',
    icon: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z',
  },
  {
    to: '/admin/navigation',
    label: '菜單',
    icon: 'M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h10v2H4v-2Z',
  },
  {
    to: '/admin/media-assets',
    label: 'Media Assets',
    icon: 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 10h10l-3.2-4.2-2.4 3.1-1.7-2.1L7 15Zm1.5-5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  },
  {
    to: '/admin/pages',
    label: '頁面',
    icon: 'M6 3h9l5 5v13H6V3Zm8 1.5V9h4.5L14 4.5ZM8 13h8v2H8v-2Zm0 4h8v2H8v-2Z',
  },
  {
    to: '/admin/categories',
    label: '分類',
    icon: 'M4 5h7v7H4V5Zm9 0h7v7h-7V5ZM4 14h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  },
  {
    to: '/admin/products',
    label: '商品',
    icon: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Zm8 2.2 4.2-2.4L12 5 7.8 7.3 12 9.7Zm-6 6 5 2.8v-7.1L6 8.6v7.1Zm7 2.8 5-2.8V8.6l-5 2.8v7.1Z',
  },
  {
    to: '/admin/orders',
    label: '訂單',
    icon: 'M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V3Zm3 5h6v2H9V8Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z',
  },
  {
    to: '/admin/customers',
    label: '顧客',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0H5Z',
  },
  {
    to: '/admin/settings',
    label: '設定',
    icon: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm8.7 5.2a8.8 8.8 0 0 0 0-2.4l2-1.5-2-3.5-2.4 1a8.6 8.6 0 0 0-2-1.2L16 3h-4l-.3 2.6a8.6 8.6 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a8.8 8.8 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a8.6 8.6 0 0 0 2 1.2L12 21h4l.3-2.6a8.6 8.6 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5Z',
  },
]

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <div class="flex min-h-screen bg-neutral-50 text-neutral-900">
    <aside
      class="hidden w-52 shrink-0 border-r border-neutral-200 bg-white md:block"
    >
      <div class="border-b border-neutral-200 px-4 py-4">
        <p class="text-xs font-medium uppercase tracking-wide text-neutral-500">
          租戶後台
        </p>
        <p class="mt-1 font-mono text-sm font-semibold text-neutral-900">
          {{ tenantSlug || '—' }}
        </p>
      </div>
      <nav class="flex flex-col gap-0.5 p-2">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition"
          :class="
            isActive(item.to)
              ? 'bg-neutral-900 font-semibold text-white shadow-sm'
              : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
          "
        >
          <svg
            class="size-4 shrink-0"
            :class="isActive(item.to) ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-700'"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path :d="item.icon" />
          </svg>
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="p-2">
        <NuxtLink
          to="/"
          class="block rounded-md px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          ← 返回店舖首頁
        </NuxtLink>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="border-b border-neutral-200 bg-white md:hidden"
      >
        <div class="flex items-center justify-between gap-3 px-4 py-3">
          <span class="font-mono text-sm font-semibold">{{ tenantSlug }}</span>
          <NuxtLink to="/" class="text-xs text-neutral-500">首頁</NuxtLink>
        </div>
        <nav
          class="flex gap-1 overflow-x-auto border-t border-neutral-100 px-2 pb-2 pt-1"
          aria-label="後台選單"
        >
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition"
            :class="
              isActive(item.to)
                ? 'bg-neutral-900 font-semibold text-white shadow-sm'
                : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
            "
          >
            <svg
              class="size-3.5 shrink-0"
              :class="isActive(item.to) ? 'text-white' : 'text-neutral-400'"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path :d="item.icon" />
            </svg>
            {{ item.label }}
          </NuxtLink>
        </nav>
      </header>
      <main class="flex-1 p-4 md:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
