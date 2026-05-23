<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type MessageStatus = 'pending' | 'processing' | 'completed'

const route = useRoute()
const id = computed(() => String(route.params.id))
const requestFetch = useRequestFetch()

type Detail = {
  message: {
    id: string
    customerId: string | null
    name: string
    email: string
    phone: string | null
    message: string
    remark: string | null
    status: MessageStatus
    createdAt: string
    updatedAt: string
  }
}

const { data, error, refresh } = await useAsyncData(
  () => `admin-message-detail-${id.value}`,
  async () => {
    return await requestFetch<Detail>(`/api/admin/messages/${id.value}`, {
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
  if (s === 'pending') return '待處理'
  if (s === 'processing') return '處理中'
  if (s === 'completed') return '已完成'
  return s
}

function statusPillClass(s: string) {
  if (s === 'pending') return 'bg-amber-50 text-amber-800 ring-amber-200'
  if (s === 'processing') return 'bg-blue-50 text-blue-800 ring-blue-200'
  if (s === 'completed') return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  return 'bg-neutral-100 text-neutral-800 ring-neutral-200'
}

const statusDraft = ref<MessageStatus>('pending')
const remarkDraft = ref('')
const saving = ref(false)
const saveErr = ref<string | null>(null)
const saveOk = ref(false)

watch(
  () => data.value?.message,
  (msg) => {
    if (!msg) return
    statusDraft.value = msg.status
    remarkDraft.value = msg.remark ?? ''
  },
  { immediate: true },
)

async function save() {
  saveErr.value = null
  saveOk.value = false
  saving.value = true
  try {
    await requestFetch(`/api/admin/messages/${id.value}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        status: statusDraft.value,
        remark: remarkDraft.value.trim() || null,
      },
    })
    saveOk.value = true
    await refresh()
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    saveErr.value = x?.data?.message || x?.message || '儲存失敗'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/admin/messages"
        class="text-sm text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        ← 返回留言列表
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-6 text-sm text-red-600">
      無法載入留言（可能不存在或無權限）。
    </p>

    <template v-else-if="data?.message">
      <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold tracking-tight">
            留言詳情
          </h1>
          <p class="mt-1 text-sm text-neutral-600">
            {{ data.message.name }} · {{ data.message.email }}
          </p>
        </div>
        <span
          class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset"
          :class="statusPillClass(data.message.status)"
        >
          {{ statusLabel(data.message.status) }}
        </span>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section class="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <dl class="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                姓名
              </dt>
              <dd class="mt-1 text-neutral-900">
                {{ data.message.name }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                電郵
              </dt>
              <dd class="mt-1 break-all text-neutral-900">
                {{ data.message.email }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                電話
              </dt>
              <dd class="mt-1 text-neutral-900">
                {{ data.message.phone || '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                來源
              </dt>
              <dd class="mt-1">
                <NuxtLink
                  v-if="data.message.customerId"
                  :to="`/admin/customers/${data.message.customerId}`"
                  class="font-medium text-violet-700 underline-offset-2 hover:underline"
                >
                  註冊會員
                </NuxtLink>
                <span v-else class="text-neutral-900">訪客</span>
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                建立時間
              </dt>
              <dd class="mt-1 text-neutral-900">
                {{ formatTime(data.message.createdAt) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
                最後更新
              </dt>
              <dd class="mt-1 text-neutral-900">
                {{ formatTime(data.message.updatedAt) }}
              </dd>
            </div>
          </dl>

          <div class="mt-6 border-t border-neutral-100 pt-6">
            <p class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              留言內容
            </p>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
              {{ data.message.message }}
            </p>
          </div>
        </section>

        <aside class="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 class="text-base font-semibold text-neutral-900">
            後台處理
          </h2>
          <p class="mt-1 text-sm text-neutral-600">
            更新處理狀態與內部備註。
          </p>

          <p
            v-if="saveErr"
            class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {{ saveErr }}
          </p>
          <p
            v-if="saveOk"
            class="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            已儲存。
          </p>

          <label class="mt-4 block text-sm">
            <span class="font-medium text-neutral-700">狀態</span>
            <select
              v-model="statusDraft"
              class="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <option value="pending">
                待處理
              </option>
              <option value="processing">
                處理中
              </option>
              <option value="completed">
                已完成
              </option>
            </select>
          </label>

          <label class="mt-4 block text-sm">
            <span class="font-medium text-neutral-700">備註（內部）</span>
            <textarea
              v-model="remarkDraft"
              rows="6"
              placeholder="僅後台可見的處理備註…"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
            />
          </label>

          <button
            type="button"
            class="mt-4 w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </aside>
      </div>
    </template>
  </div>
</template>
