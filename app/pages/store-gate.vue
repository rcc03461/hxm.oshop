<script setup lang="ts">
definePageMeta({
  layout: false,
})

const route = useRoute()
const requestFetch = useRequestFetch()

type AccessStatus = {
  shopSlug: string
  displayName: string
  logoUrl: string | null
  storeEnabled: boolean
  storeViewPasswordSet: boolean
  requiresPassword: boolean
  hasAccess: boolean
  reason: 'closed' | 'password_required' | null
}

const { data: status, error, refresh } = await useAsyncData(
  'store-access-status',
  async () => {
    return await requestFetch<AccessStatus>('/api/store/access-status', {
      credentials: 'include',
    })
  },
)

watch(
  () => status.value?.hasAccess,
  (hasAccess) => {
    if (!hasAccess) return
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/'
    navigateTo(redirect)
  },
  { immediate: true },
)

const password = ref('')
const unlocking = ref(false)
const unlockErr = ref<string | null>(null)

async function unlock() {
  unlocking.value = true
  unlockErr.value = null
  try {
    await $fetch('/api/store/access/unlock', {
      method: 'POST',
      credentials: 'include',
      body: { password: password.value },
    })
    await refresh()
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    unlockErr.value = x?.data?.message || x?.message || '解鎖失敗'
  } finally {
    unlocking.value = false
  }
}

useHead({
  title: status.value?.displayName ? `${status.value.displayName} · 商店預覽` : '商店預覽',
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
    <div class="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div v-if="error" class="text-center text-sm text-red-600">
        無法載入商店狀態。
      </div>

      <template v-else-if="status">
        <div class="flex flex-col items-center text-center">
          <div
            class="mb-4 flex h-20 w-32 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50"
          >
            <img
              v-if="status.logoUrl"
              :src="status.logoUrl"
              :alt="status.displayName"
              class="max-h-full max-w-full object-contain"
            >
            <span v-else class="text-xs text-neutral-400">商店</span>
          </div>
          <h1 class="text-lg font-semibold text-neutral-900">
            {{ status.displayName }}
          </h1>
        </div>

        <div
          v-if="status.reason === 'closed'"
          class="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          商店尚未對外開放，請稍後再訪。
        </div>

        <form
          v-else-if="status.requiresPassword"
          class="mt-6 space-y-4"
          @submit.prevent="unlock"
        >
          <p class="text-sm text-neutral-600">
            {{
              status.storeEnabled
                ? '此商店設有看店密碼，請輸入後繼續瀏覽。'
                : '商店尚在準備中，請輸入看店密碼預覽。'
            }}
          </p>
          <label class="block">
            <span class="text-xs font-medium text-neutral-700">看店密碼</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              required
            >
          </label>
          <p
            v-if="unlockErr"
            class="text-sm text-red-600"
          >
            {{ unlockErr }}
          </p>
          <button
            type="submit"
            class="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            :disabled="unlocking"
          >
            {{ unlocking ? '驗證中…' : '進入商店' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>
