<script setup lang="ts">
const { user, refresh, logout } = useAuth()

onMounted(() => {
  void refresh()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white text-neutral-900">
    <header class="border-b border-neutral-200">
      <div
        class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <NuxtLink to="/" class="text-sm font-semibold tracking-tight">
          OShop
        </NuxtLink>
        <nav class="flex items-center gap-3 text-sm">
          <template v-if="user">
            <span class="hidden text-neutral-600 sm:inline">
              {{ user.email }}
            </span>
            <span class="text-neutral-500">·</span>
            <span class="text-neutral-600">{{ user.shopSlug }}</span>
            <button
              type="button"
              class="rounded-md border border-neutral-300 px-3 py-1.5 font-medium text-neutral-800 hover:bg-neutral-50"
              @click="logout().then(() => navigateTo('/'))"
            >
              登出
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="rounded-md px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
            >
              登入
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white hover:bg-neutral-800"
            >
              開店註冊
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-neutral-200">
      <div
        class="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-neutral-500 sm:px-6"
      >
        © {{ new Date().getFullYear() }} OShop · oshop.com.hk
      </div>
    </footer>
  </div>
</template>
