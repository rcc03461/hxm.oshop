<script setup lang="ts">
import type { HomepageModule } from '~/types/homepage'

definePageMeta({
  layout: 'admin',
})

const requestFetch = useRequestFetch()
const saving = ref(false)
const publishing = ref(false)
const saveError = ref<string | null>(null)
const draftItems = ref<HomepageModule[]>([])

const { data, pending, error, refresh } = await useAsyncData(
  'admin-homepage-modules',
  async () => {
    return await requestFetch<{ items: HomepageModule[]; hasPublished: boolean }>(
      '/api/admin/homepage/modules',
      { credentials: 'include' },
    )
  },
)

watchEffect(() => {
  draftItems.value = (data.value?.items ?? []).map((item) => structuredClone(item))
})

function moveItem(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= draftItems.value.length) return
  const copied = [...draftItems.value]
  const [item] = copied.splice(index, 1)
  if (!item) return
  copied.splice(target, 0, item)
  draftItems.value = copied.map((module, idx) => ({ ...module, sortOrder: idx }))
}

async function saveDraft() {
  saveError.value = null
  saving.value = true
  try {
    const payload = draftItems.value.map((item, idx) => ({ ...item, sortOrder: idx }))
    await $fetch('/api/admin/homepage/modules', {
      method: 'PUT',
      credentials: 'include',
      body: { items: payload },
    })
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err?.data?.message || err?.message || '儲存草稿失敗'
  } finally {
    saving.value = false
  }
}

async function publishDraft() {
  saveError.value = null
  publishing.value = true
  try {
    await $fetch('/api/admin/homepage/modules/publish', {
      method: 'POST',
      credentials: 'include',
    })
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err?.data?.message || err?.message || '發佈失敗'
  } finally {
    publishing.value = false
  }
}

async function resetDraft() {
  saveError.value = null
  saving.value = true
  try {
    await $fetch('/api/admin/homepage/modules/reset-draft', {
      method: 'POST',
      credentials: 'include',
    })
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err?.data?.message || err?.message || '還原草稿失敗'
  } finally {
    saving.value = false
  }
}

function updateModuleConfig(module: HomepageModule, value: string) {
  try {
    module.config = JSON.parse(value) as HomepageModule['config']
    saveError.value = null
  } catch {
    saveError.value = `模組 ${module.moduleKey} JSON 格式錯誤`
  }
}
</script>

<template>
  <div class="max-w-5xl space-y-4">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">首頁模組</h1>
      <p class="mt-1 text-sm text-neutral-600">
        編輯草稿後按「發佈」才會套用到店舖首頁。可調整模組順序、啟用狀態與設定內容。
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="saveDraft"
      >
        儲存草稿
      </button>
      <button
        type="button"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="publishDraft"
      >
        發佈
      </button>
      <button
        type="button"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="resetDraft"
      >
        放棄草稿改動
      </button>
      <span class="ml-auto text-xs text-neutral-500">
        已發佈版本：{{ data?.hasPublished ? '有' : '尚未建立' }}
      </span>
    </div>

    <p v-if="saveError" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ saveError }}</p>
    <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">讀取首頁模組失敗，請重整再試。</p>

    <div class="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
      <p v-if="pending" class="px-2 py-4 text-sm text-neutral-500">載入中…</p>
      <div v-else class="space-y-3">
        <article
          v-for="(module, index) in draftItems"
          :key="module.moduleKey"
          class="rounded-lg border border-neutral-200 p-4"
        >
          <div class="flex items-center gap-3">
            <div>
              <p class="text-sm font-semibold text-neutral-900">{{ module.moduleType }}</p>
              <p class="text-xs text-neutral-500">{{ module.moduleKey }}</p>
            </div>
            <label class="ml-auto flex items-center gap-2 text-sm text-neutral-700">
              <input v-model="module.isEnabled" type="checkbox" class="h-4 w-4 rounded border-neutral-300">
              啟用
            </label>
            <button
              type="button"
              class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
              @click="moveItem(index, -1)"
            >
              上移
            </button>
            <button
              type="button"
              class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
              @click="moveItem(index, 1)"
            >
              下移
            </button>
          </div>

          <div class="mt-3">
            <p class="mb-1 text-xs text-neutral-500">模組設定（JSON）</p>
            <textarea
              :value="JSON.stringify(module.config, null, 2)"
              rows="8"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none"
              @input="(event) => updateModuleConfig(module, (event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
