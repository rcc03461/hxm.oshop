<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type Row = {
  id: string
  name: string
  code: string
  startsAt: string
  endsAt: string
  minOrderAmount: string | null
  discountType: string
  discountValue: string
  status: string
  updatedAt: string
  productCount: number
  appliesToAllProducts: boolean
  maxUses: number | null
  usedCount: number
}

type CouponStatus = 'active' | 'inactive'
type PeriodFilter = 'scheduled' | 'ongoing' | 'expired'

const COUPON_STATUS_OPTIONS: Array<{ value: CouponStatus; label: string }> = [
  { value: 'active', label: '啟用' },
  { value: 'inactive', label: '停用' },
]

const PERIOD_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: 'ongoing', label: '進行中' },
  { value: 'scheduled', label: '未開始' },
  { value: 'expired', label: '已結束' },
]

const q = ref('')
const page = ref(1)
const pageSize = ref(20)
const status = ref<CouponStatus[]>([])
const period = ref<PeriodFilter[]>([])
const updatingStatusId = ref<string | null>(null)
const drawerOpen = ref(false)
const editingCouponId = ref<string | null>(null)

const requestFetch = useRequestFetch()

const { data, pending, refresh, error } = await useAsyncData(
  () =>
    [
      'admin-coupons',
      page.value,
      pageSize.value,
      status.value.join(',') || 'all-status',
      period.value.join(',') || 'all-period',
      q.value.trim() || '-',
    ].join('-'),
  async () => {
    return await requestFetch<{
      items: Row[]
      page: number
      pageSize: number
      total: number
    }>('/api/admin/coupons', {
      credentials: 'include',
      query: {
        page: page.value,
        pageSize: pageSize.value,
        ...(status.value.length > 0 ? { status: status.value.join(',') } : {}),
        ...(period.value.length > 0 ? { period: period.value.join(',') } : {}),
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

function formatDiscount(row: Row) {
  if (row.discountType === 'percent') {
    return `${row.discountValue}%`
  }
  return `減 $${row.discountValue}`
}

function formatMinAmount(amount: string | null) {
  if (!amount) return '無門檻'
  return `滿 $${amount}`
}

function formatProducts(row: Row) {
  if (row.appliesToAllProducts) return '全店商品'
  return `${row.productCount} 件商品`
}

function formatUsage(row: Row) {
  if (row.maxUses == null) {
    return `已用 ${row.usedCount}（無上限）`
  }
  return `${row.usedCount} / ${row.maxUses}`
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void refresh()
  }, 300)
}

function onFilterChange() {
  page.value = 1
  void refresh()
}

async function toggleStatus(row: Row, enabled: boolean) {
  const nextStatus: CouponStatus = enabled ? 'active' : 'inactive'
  if (row.status === nextStatus || updatingStatusId.value === row.id) return

  updatingStatusId.value = row.id
  try {
    await requestFetch(`/api/admin/coupons/${row.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { status: nextStatus },
    })
    row.status = nextStatus
  } catch (e) {
    console.error('[admin/coupons] toggle status failed', e)
  } finally {
    updatingStatusId.value = null
  }
}

const drawerTitle = computed(() => (editingCouponId.value ? '編輯優惠碼' : '新增優惠碼'))
const drawerSubtitle = computed(() =>
  editingCouponId.value
    ? `優惠碼 id：${editingCouponId.value}`
    : '建立後會立即更新列表',
)

function openCreateDrawer() {
  editingCouponId.value = null
  drawerOpen.value = true
}

function openEditDrawer(id: string) {
  editingCouponId.value = id
  drawerOpen.value = true
}

async function onFormSaved() {
  await refresh()
  drawerOpen.value = false
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">優惠碼</h1>
        <p class="mt-1 text-sm text-neutral-600">
          設定滿額門檻、固定減額或百分比折扣；可限定適用商品。
        </p>
      </div>
      <button
        type="button"
        class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        @click="openCreateDrawer"
      >
        新增優惠碼
      </button>
    </div>

    <div class="mt-4 flex max-w-md gap-2">
      <input
        v-model="q"
        type="search"
        placeholder="搜尋名稱或優惠碼…"
        class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
        @input="onSearchInput"
      />
    </div>

    <div class="mt-4 space-y-3">
      <AdminFilterRow
        v-model="status"
        label="狀態"
        :options="COUPON_STATUS_OPTIONS"
        :disabled="pending"
        clear-label="清除"
        @change="onFilterChange"
      />
      <AdminFilterRow
        v-model="period"
        label="期間"
        :options="PERIOD_OPTIONS"
        :disabled="pending"
        clear-label="清除"
        @change="onFilterChange"
      />
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-600">
      無法載入列表，請確認已登入租戶後台。
    </p>

    <div
      v-else
      class="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
    >
      <table class="min-w-full divide-y divide-neutral-200 text-sm">
        <thead class="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
          <tr>
            <th class="px-4 py-3">名稱</th>
            <th class="px-4 py-3">代號</th>
            <th class="px-4 py-3">優惠期間</th>
            <th class="px-4 py-3">門檻／折扣</th>
            <th class="px-4 py-3">適用商品</th>
            <th class="px-4 py-3">使用次數</th>
            <th class="px-4 py-3">狀態</th>
            <th class="px-4 py-3">更新</th>
            <th class="px-4 py-3" />
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
              尚無優惠碼
            </td>
          </tr>
          <tr
            v-for="row in data?.items ?? []"
            :key="row.id"
            class="hover:bg-neutral-50"
          >
            <td class="px-4 py-3 font-medium text-neutral-900">
              {{ row.name }}
            </td>
            <td class="px-4 py-3 font-mono text-xs text-neutral-700">
              {{ row.code }}
            </td>
            <td class="px-4 py-3 text-xs text-neutral-600">
              <div>{{ formatTime(row.startsAt) }}</div>
              <div class="text-neutral-400">至</div>
              <div>{{ formatTime(row.endsAt) }}</div>
            </td>
            <td class="px-4 py-3 text-neutral-700">
              <div>{{ formatMinAmount(row.minOrderAmount) }}</div>
              <div class="text-neutral-900">{{ formatDiscount(row) }}</div>
            </td>
            <td class="px-4 py-3 text-neutral-700">
              {{ formatProducts(row) }}
            </td>
            <td class="px-4 py-3 text-neutral-700">
              {{ formatUsage(row) }}
            </td>
            <td class="whitespace-nowrap px-4 py-3">
              <AdminStatusSwitch
                :model-value="row.status === 'active'"
                :disabled="updatingStatusId === row.id"
                @update:model-value="(value) => void toggleStatus(row, value)"
              />
            </td>
            <td class="px-4 py-3 text-xs text-neutral-600">
              {{ formatTime(row.updatedAt) }}
            </td>
            <td class="px-4 py-3 text-right">
              <button
                type="button"
                class="text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                @click="openEditDrawer(row.id)"
              >
                編輯
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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

    <AdminEntityDrawer
      v-model:open="drawerOpen"
      :title="drawerTitle"
      :subtitle="drawerSubtitle"
      width-class="max-w-2xl"
    >
      <AdminCouponUpsertForm
        :coupon-id="editingCouponId"
        @saved="onFormSaved"
        @cancelled="drawerOpen = false"
      />
    </AdminEntityDrawer>
  </div>
</template>
