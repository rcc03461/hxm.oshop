<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const { refresh } = useAuth()

async function onSubmit() {
  errorMessage.value = null
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await refresh()
    await navigateTo('/')
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
      '登入失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-16 sm:px-6">
    <h1 class="text-xl font-semibold tracking-tight text-neutral-900">
      登入
    </h1>
    <p class="mt-2 text-sm text-neutral-600">
      使用註冊時的電子郵件與密碼登入平台。
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
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
          autocomplete="current-password"
          required
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-900 focus:border-neutral-900 focus:ring-1"
        >
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? '登入中…' : '登入' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-neutral-600">
      還沒有帳號？
      <NuxtLink to="/register" class="font-medium text-neutral-900 underline">
        前往註冊
      </NuxtLink>
    </p>
  </div>
</template>
