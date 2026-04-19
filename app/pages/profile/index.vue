<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const { customer, refresh } = useCustomerAuth()
const requestFetch = useRequestFetch()
const fullName = ref('')
const phone = ref('')
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

await refresh()

if (!tenantSlug.value) {
  await navigateTo('/')
}

if (!customer.value) {
  await navigateTo('/login?redirect=/profile')
}

const { data, error, refresh: refreshProfile } = await useAsyncData(
  'store-profile',
  () => requestFetch<{ profile: { fullName: string; email: string; phone: string } }>('/api/store/profile'),
)

watch(
  () => data.value,
  (v) => {
    if (!v) return
    fullName.value = v.profile.fullName
    phone.value = v.profile.phone
  },
  { immediate: true },
)

async function onSubmit() {
  errorMessage.value = null
  successMessage.value = null
  saving.value = true
  try {
    await requestFetch('/api/store/profile', {
      method: 'PATCH',
      body: {
        fullName: fullName.value,
        phone: phone.value,
      },
    })
    await refreshProfile()
    await refresh()
    successMessage.value = '會員資料已更新'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMessage.value = err.data?.message || err.message || '更新失敗'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <h1 class="text-2xl font-semibold tracking-tight text-neutral-900">
      會員中心
    </h1>
    <p class="mt-2 text-sm text-neutral-600">管理你的聯絡資料。</p>

    <p v-if="error" class="mt-6 text-sm text-red-600">
      {{ error.message }}
    </p>

    <form v-else class="mt-6 space-y-4 rounded-lg border border-neutral-200 bg-white p-5" @submit.prevent="onSubmit">
      <div>
        <label class="block text-xs font-medium text-neutral-700" for="email">電子郵件（不可修改）</label>
        <input
          id="email"
          :value="data?.profile.email || customer?.email || ''"
          disabled
          class="mt-1 w-full rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
        >
      </div>

      <div>
        <label class="block text-xs font-medium text-neutral-700" for="fullName">姓名</label>
        <input
          id="fullName"
          v-model="fullName"
          required
          maxlength="120"
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        >
      </div>

      <div>
        <label class="block text-xs font-medium text-neutral-700" for="phone">電話（選填）</label>
        <input
          id="phone"
          v-model="phone"
          maxlength="32"
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        >
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
      <p v-if="successMessage" class="text-sm text-emerald-700">{{ successMessage }}</p>

      <button
        type="submit"
        class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        :disabled="saving"
      >
        {{ saving ? '儲存中...' : '儲存資料' }}
      </button>
    </form>
  </div>
</template>
