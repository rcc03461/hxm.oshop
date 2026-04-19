<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type Row = {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  status: string
  createdAt: string
  updatedAt: string
}

const q = ref('')
const page = ref(1)
const pageSize = ref(20)
/** all | active | disabled */
const status = ref<string>('all')

const requestFetch = useRequestFetch()

const { data, pending, refresh, error } = await useAsyncData(
  () =>
    `admin-customers-${page.value}-${pageSize.value}-${status.value}-${q.value.trim() || '-'}`,
  async () => {
    return await requestFetch<{
      items: Row[]
      page: number
      pageSize: number
      total: number
    }>('/api/admin/customers', {
      credentials: 'include',
      query: {
        page: page.value,
        pageSize: pageSize.value,
        status: status.value,
        ...(q.value.trim() ? { q: q.value.trim() } : {}),
      },
    })
  },
  { watch: [page, pageSize] },
)

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-HK')
  } catch {
    return iso
  }
}

function statusLabel(s: string) {
  if (s === 'active') return '啟用'
  if (s === 'disabled') return '停用'
  return s
}

function statusClass(s: string) {
  if (s === 'active') return 'text-emerald-700'
  if (s === 'disabled') return 'text-red-700'
  return 'text-neutral-700'
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void refresh()
  }, 300)
}

function onStatusChange() {
  page.value = 1
  void refresh()
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">顧客</h1>
        <p class="mt-1 text-sm text-neutral-600">
          可依 Email、姓名、電話搜尋，並管理顧客狀態。
        </p>
      </div>
    </div>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex max-w-md flex-1 gap-2">
        <input
          v-model="q"
          type="search"
          placeholder="Email / 姓名 / 電話…"
          class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
          @input="onSearchInput"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-neutral-500">狀態</label>
        <select
          v-model="status"
          class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
          @change="onStatusChange"
        >
          <option value="all">全部</option>
          <option value="active">啟用</option>
          <option value="disabled">停用</option>
        </select>
      </div>
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-600">
      無法載入列表，請確認已登入租戶後台。
    </p>

    <div
      v-else
      class="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-neutral-200 text-sm">
          <thead class="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
            <tr>
              <th class="whitespace-nowrap px-4 py-3">建立時間</th>
              <th class="whitespace-nowrap px-4 py-3">Email</th>
              <th class="whitespace-nowrap px-4 py-3">姓名</th>
              <th class="whitespace-nowrap px-4 py-3">電話</th>
              <th class="whitespace-nowrap px-4 py-3">狀態</th>
              <th class="whitespace-nowrap px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200">
            <tr v-if="pending">
              <td colspan="6" class="px-4 py-6 text-center text-neutral-500">
                載入中…
              </td>
            </tr>
            <tr v-else-if="!data?.items.length">
              <td colspan="6" class="px-4 py-6 text-center text-neutral-500">
                尚無顧客
              </td>
            </tr>
            <tr
              v-for="row in data?.items ?? []"
              :key="row.id"
              class="hover:bg-neutral-50"
            >
              <td class="whitespace-nowrap px-4 py-3 text-xs text-neutral-600">
                {{ formatTime(row.createdAt) }}
              </td>
              <td class="max-w-[16rem] truncate px-4 py-3 text-neutral-900">
                {{ row.email }}
              </td>
              <td class="px-4 py-3 text-neutral-800">
                {{ row.fullName || '—' }}
              </td>
              <td class="px-4 py-3 text-neutral-700">
                {{ row.phone || '—' }}
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="['text-sm font-medium', statusClass(row.status)]">
                  {{ statusLabel(row.status) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right">
                <NuxtLink
                  :to="`/admin/customers/${row.id}`"
                  class="text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                >
                  詳情
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="data && data.total > data.pageSize"
      class="mt-4 flex items-center justify-between text-sm text-neutral-600"
    >
      <span>共 {{ data.total }} 筆</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 disabled:opacity-40"
          :disabled="page <= 1 || pending"
          @click="page--; refresh()"
        >
          上一頁
        </button>
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 disabled:opacity-40"
          :disabled="page * pageSize >= data.total || pending"
          @click="page++; refresh()"
        >
          下一頁
        </button>
      </div>
    </div>
  </div>
</template>
