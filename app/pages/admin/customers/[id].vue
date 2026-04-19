<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const id = computed(() => String(route.params.id))
const requestFetch = useRequestFetch()

type Detail = {
  customer: {
    id: string
    email: string
    fullName: string | null
    phone: string | null
    status: string
    createdAt: string
    updatedAt: string
  }
  stats: {
    totalOrders: number
  }
}

const { data, error, refresh } = await useAsyncData(
  () => `admin-customer-detail-${id.value}`,
  async () => {
    return await requestFetch<Detail>(`/api/admin/customers/${id.value}`, {
      credentials: 'include',
    })
  },
  { watch: [id] },
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

function statusPillClass(s: string) {
  if (s === 'active') return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  if (s === 'disabled') return 'bg-red-50 text-red-800 ring-red-200'
  return 'bg-neutral-100 text-neutral-800 ring-neutral-200'
}

const statusDraft = ref<'active' | 'disabled'>('active')
const savingStatus = ref(false)
const saveStatusErr = ref<string | null>(null)
const saveStatusOk = ref(false)

watch(
  () => data.value?.customer.status,
  (v) => {
    if (v === 'active' || v === 'disabled') {
      statusDraft.value = v
    }
  },
  { immediate: true },
)

async function saveStatus() {
  if (!data.value) return
  savingStatus.value = true
  saveStatusErr.value = null
  saveStatusOk.value = false
  try {
    await $fetch(`/api/admin/customers/${data.value.customer.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { status: statusDraft.value },
    })
    await refresh()
    saveStatusOk.value = true
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    saveStatusErr.value = x?.data?.message || x?.message || '更新狀態失敗'
  } finally {
    savingStatus.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/admin/customers"
        class="text-sm text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        ← 返回顧客列表
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-6 text-sm text-red-600">
      無法載入顧客（可能不存在或無權限）。
    </p>

    <template v-else-if="data">
      <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold tracking-tight">顧客詳情</h1>
          <p class="mt-1 font-mono text-xs text-neutral-500">
            {{ data.customer.id }}
          </p>
        </div>
        <span
          class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset"
          :class="statusPillClass(data.customer.status)"
        >
          {{ statusLabel(data.customer.status) }}
        </span>
      </div>

      <dl
        class="mt-8 grid gap-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Email
          </dt>
          <dd class="mt-1 break-all text-sm text-neutral-900">
            {{ data.customer.email }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            姓名
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ data.customer.fullName || '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            電話
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ data.customer.phone || '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            訂單數
          </dt>
          <dd class="mt-1 text-sm font-medium text-neutral-900">
            {{ data.stats.totalOrders }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            建立時間
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ formatTime(data.customer.createdAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            最後更新
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ formatTime(data.customer.updatedAt) }}
          </dd>
        </div>
      </dl>

      <section class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-semibold text-neutral-900">顧客狀態</h2>
        <p class="mt-1 text-sm text-neutral-600">
          可手動停用可疑帳號，降低風險操作。
        </p>
        <p
          v-if="saveStatusErr"
          class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ saveStatusErr }}
        </p>
        <p
          v-if="saveStatusOk"
          class="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          顧客狀態已更新。
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <select
            v-model="statusDraft"
            class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="active">啟用</option>
            <option value="disabled">停用</option>
          </select>
          <button
            type="button"
            :disabled="savingStatus || statusDraft === data.customer.status"
            class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            @click="saveStatus"
          >
            {{ savingStatus ? '更新中…' : '更新狀態' }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
