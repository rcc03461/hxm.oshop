<script setup lang="ts">
const selectedIds = defineModel<string[]>({ default: () => [] })

const requestFetch = useRequestFetch()
const productSearch = ref('')

const { data: list, pending } = await useAsyncData(
  'admin-coupon-product-options',
  () =>
    requestFetch<{
      items: Array<{ id: string; title: string; slug: string; status: string }>
    }>('/api/admin/products', {
      credentials: 'include',
      query: { page: 1, pageSize: 500, status: 'active' },
    }),
)

const options = computed(() => {
  const items = list.value?.items ?? []
  return [...items].sort((a, b) => a.title.localeCompare(b.title, 'zh-HK'))
})

const filteredOptions = computed(() => {
  const keyword = productSearch.value.trim().toLowerCase()
  if (!keyword) return options.value
  return options.value.filter((p) => {
    const haystack = `${p.title} ${p.slug} ${p.id}`.toLowerCase()
    return haystack.includes(keyword)
  })
})

function selectAll() {
  selectedIds.value = options.value.map((p) => p.id)
}

function clearAll() {
  selectedIds.value = []
}
</script>

<template>
  <AdminFormField
    label="限定適用商品（可選）"
    hint="未勾選任何商品時，全店商品皆可計入優惠；有勾選則僅這些商品計入"
  >
    <p v-if="pending" class="text-sm text-neutral-500">
      載入商品…
    </p>
    <template v-else>
      <div class="mb-2 flex flex-wrap gap-2">
        <input
          v-model="productSearch"
          type="search"
          placeholder="搜尋商品名稱或 slug…"
          class="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm shadow-sm"
        />
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          @click="selectAll"
        >
          全選
        </button>
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          @click="clearAll"
        >
          清除
        </button>
      </div>
      <div
        v-if="!options.length"
        class="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600"
      >
        尚無商品可選。
      </div>
      <ul
        v-else
        class="max-h-52 space-y-2 overflow-y-auto rounded-md border border-neutral-200 bg-white px-3 py-2"
      >
        <li v-for="p in filteredOptions" :key="p.id">
          <label
            class="flex cursor-pointer items-start gap-2 text-sm text-neutral-800"
          >
            <input
              v-model="selectedIds"
              type="checkbox"
              class="mt-0.5 rounded border-neutral-300"
              :value="p.id"
            />
            <span>
              {{ p.title }}
              <span class="font-mono text-xs text-neutral-500">{{ p.slug }}</span>
            </span>
          </label>
        </li>
        <li
          v-if="options.length && !filteredOptions.length"
          class="text-xs text-neutral-500"
        >
          沒有符合搜尋條件的商品。
        </li>
      </ul>
      <p class="mt-1 text-xs text-neutral-500">
        已選 {{ selectedIds.length }} 件
        <span v-if="selectedIds.length === 0">（全店適用）</span>
      </p>
    </template>
  </AdminFormField>
</template>
