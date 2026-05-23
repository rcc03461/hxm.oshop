<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type MessageStatus = 'pending' | 'processing' | 'completed'

type Row = {
  id: string
  customerId: string | null
  name: string
  email: string
  phone: string | null
  messagePreview: string
  remark: string | null
  status: MessageStatus
  createdAt: string
}

const MESSAGE_STATUS_OPTIONS: Array<{ value: MessageStatus; label: string }> = [
  { value: 'pending', label: '待處理' },
  { value: 'processing', label: '處理中' },
  { value: 'completed', label: '已完成' },
]

const q = ref('')
const page = ref(1)
const pageSize = ref(20)
const status = ref<MessageStatus[]>([])

const requestFetch = useRequestFetch()

const { data, pending, refresh, error } = await useAsyncData(
  () =>
    `admin-messages-${page.value}-${pageSize.value}-${status.value.join(',') || 'all'}-${q.value.trim() || '-'}`,
  async () => {
    return await requestFetch<{
      items: Row[]
      page: number
      pageSize: number
      total: number
      statusCounts: Record<MessageStatus, number>
    }>('/api/admin/messages', {
      credentials: 'include',
      query: {
        page: page.value,
        pageSize: pageSize.value,
        ...(status.value.length > 0 ? { status: status.value.join(',') } : {}),
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
  if (s === 'pending') return '待處理'
  if (s === 'processing') return '處理中'
  if (s === 'completed') return '已完成'
  return s
}

function statusClass(s: string) {
  if (s === 'pending') return 'text-amber-700'
  if (s === 'processing') return 'text-blue-700'
  if (s === 'completed') return 'text-emerald-700'
  return 'text-neutral-700'
}

function sourceLabel(row: Row) {
  return row.customerId ? '註冊會員' : '訪客'
}

function sourceClass(row: Row) {
  return row.customerId
    ? 'bg-violet-50 text-violet-700 ring-violet-200'
    : 'bg-neutral-100 text-neutral-600 ring-neutral-200'
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

const statusFilterOptions = computed(() => {
  const counts = data.value?.statusCounts
  return MESSAGE_STATUS_OPTIONS.map((option) => ({
    ...option,
    count: counts?.[option.value] ?? 0,
  }))
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">
          用戶留言
        </h1>
        <p class="mt-1 text-sm text-neutral-600">
          依建立時間排序；可搜尋姓名、電郵、電話或留言內容。
        </p>
      </div>
    </div>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex max-w-md flex-1 gap-2">
        <input
          v-model="q"
          type="search"
          placeholder="姓名、電郵、電話或留言…"
          class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
          @input="onSearchInput"
        />
      </div>
    </div>

    <AdminFilterRow
      v-model="status"
      label="狀態"
      class="mt-4"
      :options="statusFilterOptions"
      :disabled="pending"
      clear-label="清除"
      @change="onStatusChange"
    />

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
              <th class="whitespace-nowrap px-4 py-3">
                時間
              </th>
              <th class="whitespace-nowrap px-4 py-3">
                來源
              </th>
              <th class="whitespace-nowrap px-4 py-3">
                姓名
              </th>
              <th class="whitespace-nowrap px-4 py-3">
                電郵
              </th>
              <th class="whitespace-nowrap px-4 py-3">
                電話
              </th>
              <th class="min-w-[12rem] px-4 py-3">
                留言
              </th>
              <th class="min-w-[8rem] px-4 py-3">
                備註
              </th>
              <th class="whitespace-nowrap px-4 py-3">
                狀態
              </th>
              <th class="whitespace-nowrap px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200">
            <tr v-if="pending">
              <td colspan="9" class="px-4 py-6 text-center text-neutral-500">
                載入中…
              </td>
            </tr>
            <tr v-else-if="!data?.items.length">
              <td colspan="9" class="px-4 py-6 text-center text-neutral-500">
                尚無留言
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
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                  :class="sourceClass(row)"
                >
                  {{ sourceLabel(row) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 font-medium text-neutral-900">
                {{ row.name }}
              </td>
              <td class="max-w-[12rem] truncate px-4 py-3 text-neutral-800">
                {{ row.email }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-neutral-700">
                {{ row.phone || '—' }}
              </td>
              <td class="max-w-[16rem] truncate px-4 py-3 text-neutral-700">
                {{ row.messagePreview }}
              </td>
              <td class="max-w-[10rem] truncate px-4 py-3 text-neutral-500">
                {{ row.remark || '—' }}
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="['text-sm font-medium', statusClass(row.status)]">
                  {{ statusLabel(row.status) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right">
                <NuxtLink
                  :to="`/admin/messages/${row.id}`"
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
