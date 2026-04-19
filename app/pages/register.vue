<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')

if (!tenantSlug.value) {
  await navigateTo('/admin/register')
}

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const { refresh } = useCustomerAuth()

async function onSubmit() {
  errorMessage.value = null
  loading.value = true
  try {
    await $fetch('/api/store/auth/register', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
        fullName: name.value,
      },
    })
    await refresh()
    await navigateTo('/profile')
  } catch (e: unknown) {
    const err = e as {
      data?: { message?: string }
      message?: string
      statusMessage?: string
    }
    errorMessage.value =
      err.data?.message ||
      err.statusMessage ||
      err.message ||
      '註冊失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-16 sm:px-6">
    <h1 class="text-xl font-semibold tracking-tight text-neutral-900">
      會員註冊
    </h1>
    <p class="mt-2 text-sm text-neutral-600">
      建立 <span class="font-mono">{{ tenantSlug }}</span> 商店會員帳號。
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label
          class="block text-xs font-medium text-neutral-700"
          for="name"
        >
          暱稱
        </label>
        <input
          id="name"
          v-model="name"
          type="text"
          autocomplete="name"
          required
          placeholder="例如 王小明"
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-900 focus:border-neutral-900 focus:ring-1"
        >
      </div>
      <div>
        <label class="block text-xs font-medium text-neutral-700" for="email">
          電子郵件
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-900 focus:border-neutral-900 focus:ring-1"
        >
      </div>
      <div>
        <label
          class="block text-xs font-medium text-neutral-700"
          for="password"
        >
          密碼
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
          minlength="8"
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-900 focus:border-neutral-900 focus:ring-1"
        >
        <p class="mt-1 text-xs text-neutral-500">至少 8 字元。</p>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? '建立中…' : '會員註冊' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-neutral-600">
      已經有帳號？
      <NuxtLink to="/login" class="font-medium text-neutral-900 underline">
        登入
      </NuxtLink>
    </p>
    <p class="mt-2 text-center text-xs text-neutral-500">
      若你要建立商店，請改用
      <NuxtLink to="/admin/register" class="font-medium underline">
        /admin/register
      </NuxtLink>
    </p>
  </div>
</template>
