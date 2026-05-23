<script setup lang="ts">
import type { ChartConfiguration } from 'chart.js'
import {
  percentChange,
  type DashboardAnalytics,
} from '~/utils/dashboardMetrics'

definePageMeta({
  layout: 'admin',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const requestFetch = useRequestFetch()

const { data: analytics, error, pending } = await useAsyncData(
  'admin-dashboard-analytics',
  () =>
    requestFetch<DashboardAnalytics>('/api/admin/dashboard/analytics', {
      credentials: 'include',
    }),
)

function formatMoney(amount: string, currency = 'HKD') {
  const n = Number(amount)
  if (Number.isNaN(n)) return amount
  try {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${amount} ${currency}`
  }
}

function formatDelta(current: number, previous: number) {
  const pct = percentChange(current, previous)
  if (pct === null) return { text: '新', className: 'text-emerald-600' }
  if (pct === 0) return { text: '—', className: 'text-neutral-500' }
  const sign = pct > 0 ? '+' : ''
  const className =
    pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-neutral-500'
  return { text: `${sign}${pct.toFixed(1)}%`, className }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })
  } catch {
    return iso
  }
}

function formatShortDate(ymd: string) {
  const [, m, d] = ymd.split('-')
  return `${Number(m)}/${Number(d)}`
}

function statusLabel(s: string) {
  if (s === 'paid') return '已付款'
  if (s === 'pending_payment') return '待付款'
  if (s === 'payment_failed') return '付款失敗'
  if (s === 'shipping') return '運送中'
  if (s === 'signed') return '已簽收'
  return s
}

function statusClass(s: string) {
  if (s === 'paid') return 'text-emerald-700'
  if (s === 'pending_payment') return 'text-amber-700'
  if (s === 'payment_failed') return 'text-red-700'
  if (s === 'shipping') return 'text-blue-700'
  if (s === 'signed') return 'text-violet-700'
  return 'text-neutral-700'
}

const currency = computed(() => analytics.value?.currency ?? 'HKD')

const weekRevenueDelta = computed(() => {
  const a = analytics.value
  if (!a) return null
  return formatDelta(
    Number(a.thisWeek.revenue),
    Number(a.thisWeek.previousRevenue),
  )
})

const monthRevenueDelta = computed(() => {
  const a = analytics.value
  if (!a) return null
  return formatDelta(
    Number(a.thisMonth.revenue),
    Number(a.thisMonth.previousRevenue),
  )
})

const revenueTrendConfig = computed((): Omit<ChartConfiguration, 'type'> | null => {
  const a = analytics.value
  if (!a) return null
  const labels = a.dailyLast30Days.map((p) => formatShortDate(p.date))
  const values = a.dailyLast30Days.map((p) => Number(p.revenue))
  return {
    data: {
      labels,
      datasets: [
        {
          label: '營業額',
          data: values,
          borderColor: '#171717',
          backgroundColor: 'rgba(23, 23, 23, 0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y
              return ` ${formatMoney(String(v ?? 0), currency.value)}`
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 8, font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 11 },
            callback(value) {
              const n = Number(value)
              if (n >= 10000) return `${(n / 1000).toFixed(0)}k`
              return n
            },
          },
        },
      },
    },
  }
})

const ordersByHourConfig = computed((): Omit<ChartConfiguration, 'type'> | null => {
  const a = analytics.value
  if (!a) return null
  return {
    data: {
      labels: a.ordersByHour.map((p) => `${p.hour}:00`),
      datasets: [
        {
          label: '訂單數',
          data: a.ordersByHour.map((p) => p.orderCount),
          backgroundColor: 'rgba(59, 130, 246, 0.65)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 12, font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 11 } },
        },
      },
    },
  }
})

const statusChartConfig = computed((): Omit<ChartConfiguration, 'type'> | null => {
  const a = analytics.value
  if (!a) return null
  const entries = Object.entries(a.statusCounts).filter(([, n]) => n > 0)
  if (entries.length === 0) return null
  const colorMap: Record<string, string> = {
    pending_payment: '#d97706',
    paid: '#059669',
    payment_failed: '#dc2626',
    shipping: '#2563eb',
    signed: '#7c3aed',
  }
  return {
    data: {
      labels: entries.map(([s]) => statusLabel(s)),
      datasets: [
        {
          data: entries.map(([, n]) => n),
          backgroundColor: entries.map(([s]) => colorMap[s] ?? '#a3a3a3'),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11 } },
        },
      },
    },
  }
})

const dailyOrdersConfig = computed((): Omit<ChartConfiguration, 'type'> | null => {
  const a = analytics.value
  if (!a) return null
  const last7 = a.dailyLast30Days.slice(-7)
  return {
    data: {
      labels: last7.map((p) => formatShortDate(p.date)),
      datasets: [
        {
          label: '訂單',
          data: last7.map((p) => p.orderCount),
          backgroundColor: 'rgba(23, 23, 23, 0.75)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  }
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">
          總覽
        </h1>
        <p class="mt-1 text-sm text-neutral-600">
          <span class="font-mono">{{ tenantSlug }}</span>
          的營運數據（香港時間）
        </p>
      </div>
      <p v-if="analytics?.generatedAt" class="text-xs text-neutral-500">
        更新：{{ formatTime(analytics.generatedAt) }}
      </p>
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-600">
      無法載入統計，請確認已登入。
    </p>

    <div v-if="pending && !analytics" class="mt-8 text-sm text-neutral-500">
      載入中…
    </div>

    <template v-else-if="analytics">
      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-neutral-500">
            今日營業額
          </p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-neutral-900">
            {{ formatMoney(analytics.today.revenue, currency) }}
          </p>
          <p class="mt-1 text-xs text-neutral-500">
            {{ analytics.today.orderCount }} 筆已付款訂單
          </p>
        </div>

        <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-neutral-500">
            本週營業額
          </p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-neutral-900">
            {{ formatMoney(analytics.thisWeek.revenue, currency) }}
          </p>
          <p class="mt-1 text-xs text-neutral-500">
            較上週
            <span
              v-if="weekRevenueDelta"
              :class="weekRevenueDelta.className"
              class="font-medium"
            >{{ weekRevenueDelta.text }}</span>
            · {{ analytics.thisWeek.newCustomers }} 位新顧客
          </p>
        </div>

        <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-neutral-500">
            本月營業額
          </p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-neutral-900">
            {{ formatMoney(analytics.thisMonth.revenue, currency) }}
          </p>
          <p class="mt-1 text-xs text-neutral-500">
            較上月
            <span
              v-if="monthRevenueDelta"
              :class="monthRevenueDelta.className"
              class="font-medium"
            >{{ monthRevenueDelta.text }}</span>
            · {{ analytics.thisMonth.orderCount }} 筆訂單
          </p>
        </div>

        <NuxtLink
          to="/admin/orders"
          class="rounded-lg border border-amber-200 bg-amber-50/60 p-4 shadow-sm transition hover:border-amber-300"
        >
          <p class="text-xs font-medium text-amber-800">
            待付款訂單
          </p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-amber-900">
            {{ analytics.pendingPaymentOrders }}
          </p>
          <p class="mt-1 text-xs text-amber-700/80">
            需要跟進 →
          </p>
        </NuxtLink>
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-3">
        <section class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 class="text-sm font-semibold text-neutral-900">
            近 30 日營業額
          </h2>
          <p class="mt-0.5 text-xs text-neutral-500">
            已付款、運送中、已簽收訂單
          </p>
          <div class="mt-4 h-56">
            <ClientOnly>
              <AdminDashboardChart
                v-if="revenueTrendConfig"
                type="line"
                :config="revenueTrendConfig"
              />
            </ClientOnly>
          </div>
        </section>

        <section class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 class="text-sm font-semibold text-neutral-900">
            訂單狀態
          </h2>
          <p class="mt-0.5 text-xs text-neutral-500">
            全部訂單分佈
          </p>
          <div class="mt-4 h-56">
            <ClientOnly>
              <AdminDashboardChart
                v-if="statusChartConfig"
                type="doughnut"
                :config="statusChartConfig"
              />
              <p v-else class="flex h-full items-center justify-center text-sm text-neutral-400">
                尚無訂單
              </p>
            </ClientOnly>
          </div>
        </section>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <section class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 class="text-sm font-semibold text-neutral-900">
            下單時段（近 90 日）
          </h2>
          <p class="mt-0.5 text-xs text-neutral-500">
            依香港時間統計每小時訂單量
          </p>
          <div class="mt-4 h-52">
            <ClientOnly>
              <AdminDashboardChart
                v-if="ordersByHourConfig"
                type="bar"
                :config="ordersByHourConfig"
              />
            </ClientOnly>
          </div>
        </section>

        <section class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 class="text-sm font-semibold text-neutral-900">
            近 7 日訂單數
          </h2>
          <p class="mt-0.5 text-xs text-neutral-500">
            含所有狀態
          </p>
          <div class="mt-4 h-52">
            <ClientOnly>
              <AdminDashboardChart
                v-if="dailyOrdersConfig"
                type="bar"
                :config="dailyOrdersConfig"
              />
            </ClientOnly>
          </div>
        </section>
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-3">
        <section class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-neutral-900">
              最新訂單
            </h2>
            <NuxtLink
              to="/admin/orders"
              class="text-xs text-neutral-500 hover:text-neutral-800"
            >
              全部訂單 →
            </NuxtLink>
          </div>
          <div v-if="analytics.recentOrders.length === 0" class="mt-4 text-sm text-neutral-500">
            尚無訂單
          </div>
          <ul v-else class="mt-3 divide-y divide-neutral-100">
            <li
              v-for="order in analytics.recentOrders"
              :key="order.id"
            >
              <NuxtLink
                :to="`/admin/orders/${order.id}`"
                class="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm transition hover:bg-neutral-50 -mx-2 px-2 rounded"
              >
                <div class="min-w-0">
                  <p class="truncate font-medium text-neutral-900">
                    {{ order.customerEmail || '訪客' }}
                  </p>
                  <p class="text-xs text-neutral-500">
                    {{ formatTime(order.createdAt) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="font-medium tabular-nums text-neutral-900">
                    {{ formatMoney(order.total, order.currency) }}
                  </p>
                  <p class="text-xs" :class="statusClass(order.status)">
                    {{ statusLabel(order.status) }}
                  </p>
                </div>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 class="text-sm font-semibold text-neutral-900">
            快捷入口
          </h2>
          <ul class="mt-3 space-y-2 text-sm">
            <li>
              <NuxtLink
                to="/admin/orders"
                class="flex justify-between rounded-md border border-neutral-100 px-3 py-2 hover:border-neutral-200 hover:bg-neutral-50"
              >
                <span>訂單</span>
                <span class="tabular-nums text-neutral-600">{{ Object.values(analytics.statusCounts).reduce((a, b) => a + b, 0) }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/admin/products"
                class="flex justify-between rounded-md border border-neutral-100 px-3 py-2 hover:border-neutral-200 hover:bg-neutral-50"
              >
                <span>商品</span>
                <span class="tabular-nums text-neutral-600">{{ analytics.catalog.products }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/admin/customers"
                class="flex justify-between rounded-md border border-neutral-100 px-3 py-2 hover:border-neutral-200 hover:bg-neutral-50"
              >
                <span>顧客</span>
                <span class="tabular-nums text-neutral-600">{{ analytics.catalog.customers }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/admin/messages"
                class="flex justify-between rounded-md border border-neutral-100 px-3 py-2 hover:border-neutral-200 hover:bg-neutral-50"
              >
                <span>待處理留言</span>
                <span
                  class="tabular-nums"
                  :class="analytics.catalog.openMessages > 0 ? 'font-medium text-amber-700' : 'text-neutral-600'"
                >
                  {{ analytics.catalog.openMessages }}
                </span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/admin/categories"
                class="flex justify-between rounded-md border border-neutral-100 px-3 py-2 hover:border-neutral-200 hover:bg-neutral-50"
              >
                <span>分類</span>
                <span class="tabular-nums text-neutral-600">{{ analytics.catalog.categories }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
