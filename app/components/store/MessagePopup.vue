<script setup lang="ts">
const route = useRoute()
const requestFetch = useRequestFetch()
const { customer } = useCustomerAuth()
const { isOpen, closeMessagePopup } = useMessagePopup()

const name = ref('')
const email = ref('')
const phone = ref('')
const message = ref('')
const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

let originalOverflow = ''

function resetForm() {
  errorMessage.value = null
  successMessage.value = null
  message.value = ''
  if (customer.value) {
    name.value = customer.value.fullName?.trim() || ''
    email.value = customer.value.email
    phone.value = customer.value.phone?.trim() || ''
    return
  }
  name.value = ''
  email.value = ''
  phone.value = ''
}

watch(isOpen, (open) => {
  if (!import.meta.client) return
  if (open) {
    resetForm()
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = originalOverflow
})

watch(
  () => customer.value,
  () => {
    if (isOpen.value) resetForm()
  },
)

watch(
  () => route.fullPath,
  () => {
    closeMessagePopup()
  },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    closeMessagePopup()
  }
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = originalOverflow
})

async function submit() {
  errorMessage.value = null
  successMessage.value = null
  submitting.value = true
  try {
    await requestFetch('/api/store/messages', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim() || undefined,
        message: message.value.trim(),
      },
    })
    successMessage.value = '留言已送出，我們會盡快回覆您。'
    message.value = ''
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    errorMessage.value = x?.data?.message || x?.message || '提交失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="message-popup-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-label="留言視窗"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/40"
          aria-label="關閉留言視窗"
          @click="closeMessagePopup"
        />
        <div
          class="relative w-full max-w-md rounded-lg bg-white shadow-2xl message-popup-panel"
          @click.stop
        >
          <header class="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 class="text-base font-semibold text-neutral-900">
                留言給我們
              </h2>
              <p class="mt-0.5 text-xs text-neutral-500">
                填寫聯絡方式與留言內容，我們會盡快回覆。
              </p>
            </div>
            <button
              type="button"
              class="rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50"
              @click="closeMessagePopup"
            >
              關閉
            </button>
          </header>

          <form class="px-5 py-4" @submit.prevent="submit">
            <p
              v-if="customer"
              class="mb-4 rounded-md bg-violet-50 px-3 py-2 text-xs text-violet-800"
            >
              已為您自動填入會員聯絡資料。
            </p>

            <p
              v-if="errorMessage"
              class="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {{ errorMessage }}
            </p>
            <p
              v-if="successMessage"
              class="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              {{ successMessage }}
            </p>

            <label class="block text-sm">
              <span class="font-medium text-neutral-700">姓名</span>
              <input
                v-model="name"
                type="text"
                required
                maxlength="120"
                autocomplete="name"
                class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
              >
            </label>

            <label class="mt-4 block text-sm">
              <span class="font-medium text-neutral-700">電郵</span>
              <input
                v-model="email"
                type="email"
                required
                maxlength="255"
                autocomplete="email"
                class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
              >
            </label>

            <label class="mt-4 block text-sm">
              <span class="font-medium text-neutral-700">電話（選填）</span>
              <input
                v-model="phone"
                type="tel"
                maxlength="32"
                autocomplete="tel"
                class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
              >
            </label>

            <label class="mt-4 block text-sm">
              <span class="font-medium text-neutral-700">留言</span>
              <textarea
                v-model="message"
                required
                rows="5"
                maxlength="5000"
                placeholder="請描述您的查詢或需求…"
                class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <div class="mt-5 flex gap-2">
              <button
                type="button"
                class="flex-1 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                @click="closeMessagePopup"
              >
                取消
              </button>
              <button
                type="submit"
                class="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                :disabled="submitting || !!successMessage"
              >
                {{ submitting ? '提交中…' : '送出留言' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.message-popup-fade-enter-active,
.message-popup-fade-leave-active {
  transition: opacity 200ms ease;
}

.message-popup-fade-enter-from,
.message-popup-fade-leave-to {
  opacity: 0;
}

.message-popup-fade-enter-active .message-popup-panel,
.message-popup-fade-leave-active .message-popup-panel {
  transition: transform 200ms ease, opacity 200ms ease;
}

.message-popup-fade-enter-from .message-popup-panel,
.message-popup-fade-leave-to .message-popup-panel {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}
</style>
