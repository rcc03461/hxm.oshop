<script setup lang="ts">
import type { HomepageImageSliderModuleConfig } from '../../../types/homepage'

const props = defineProps<{
  config: HomepageImageSliderModuleConfig
}>()

const { uploadImageFile } = useAdminAttachments()
const adding = ref(false)
const uploading = ref<Record<number, boolean>>({})
const errorMsg = ref<string | null>(null)

function addSlide() {
  props.config.slides.push({
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    imageUrl: '',
    alt: '',
    linkUrl: '',
  })
}

function removeSlide(index: number) {
  props.config.slides.splice(index, 1)
}

async function onUpload(index: number, event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return

  errorMsg.value = null
  uploading.value[index] = true
  try {
    const uploaded = await uploadImageFile(file)
    props.config.slides[index]!.imageUrl = uploaded.publicUrl ?? ''
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err?.data?.message || err?.message || '圖片上傳失敗'
  } finally {
    uploading.value[index] = false
    if (input) input.value = ''
  }
}
</script>

<template>
  <div class="space-y-3">
    <label class="text-sm text-neutral-700">
      <span class="mb-1 block text-xs text-neutral-500">區塊標題</span>
      <input
        v-model="config.title"
        type="text"
        class="w-full rounded-md border border-neutral-300 px-3 py-2"
      >
    </label>

    <div class="grid gap-2 rounded-md border border-neutral-200 p-3 md:grid-cols-3">
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">自動播放</span>
        <input v-model="config.ui.autoplay" type="checkbox" class="h-4 w-4 rounded border-neutral-300">
      </label>
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">輪播間隔 (ms)</span>
        <input
          v-model.number="config.ui.intervalMs"
          type="number"
          min="1000"
          step="500"
          class="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
      </label>
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">循環播放</span>
        <input v-model="config.ui.loop" type="checkbox" class="h-4 w-4 rounded border-neutral-300">
      </label>
    </div>

    <div class="rounded-md border border-neutral-200 p-3">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-xs font-medium text-neutral-500">輪播圖片</p>
        <button
          type="button"
          class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          :disabled="adding"
          @click="addSlide"
        >
          新增圖片
        </button>
      </div>

      <p v-if="errorMsg" class="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{{ errorMsg }}</p>

      <div class="space-y-3">
        <div
          v-for="(slide, index) in config.slides"
          :key="slide.id || index"
          class="rounded-md border border-neutral-200 p-3"
        >
          <div class="grid gap-2 md:grid-cols-[140px_1fr]">
            <div class="overflow-hidden rounded border border-neutral-200 bg-neutral-50">
              <img
                v-if="slide.imageUrl"
                :src="slide.imageUrl"
                :alt="slide.alt || `slide-${index + 1}`"
                class="h-24 w-full object-cover"
              >
              <div v-else class="flex h-24 items-center justify-center text-xs text-neutral-400">
                無圖片
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm text-neutral-700">
                <span class="mb-1 block text-xs text-neutral-500">圖片網址</span>
                <input
                  v-model="slide.imageUrl"
                  type="text"
                  class="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  placeholder="https://..."
                >
              </label>
              <label class="inline-flex cursor-pointer items-center rounded border border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50">
                {{ uploading[index] ? '上傳中…' : '上傳圖片' }}
                <input
                  type="file"
                  class="hidden"
                  accept="image/*"
                  :disabled="uploading[index]"
                  @change="onUpload(index, $event)"
                >
              </label>
            </div>
          </div>

          <div class="mt-2 grid gap-2 md:grid-cols-2">
            <label class="text-sm text-neutral-700">
              <span class="mb-1 block text-xs text-neutral-500">文字（alt）</span>
              <input
                v-model="slide.alt"
                type="text"
                class="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                placeholder="圖片說明文字"
              >
            </label>
            <label class="text-sm text-neutral-700">
              <span class="mb-1 block text-xs text-neutral-500">連結（link）</span>
              <input
                v-model="slide.linkUrl"
                type="text"
                class="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                placeholder="/products 或 https://..."
              >
            </label>
          </div>

          <div class="mt-2 text-right">
            <button
              type="button"
              class="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              @click="removeSlide(index)"
            >
              刪除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
