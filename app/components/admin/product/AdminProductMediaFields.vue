<script setup lang="ts">
import type { ProductMediaItem } from '~/types/productMedia'

const coverAttachmentId = defineModel<string | null>('coverAttachmentId', {
  default: null,
})

const galleryItems = defineModel<ProductMediaItem[]>('galleryItems', {
  default: () => [],
})

const props = defineProps<{
  /** 封面若不在圖庫列表時，用於顯示預覽 */
  coverPreview?: ProductMediaItem | null
}>()

const { createFromPublicUrl, uploadImageFile } = useAdminAttachments()

const newUrl = ref('')
const adding = ref(false)
const uploading = ref(false)
const localErr = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const coverItem = computed<ProductMediaItem | null>(() => {
  const id = coverAttachmentId.value
  if (!id) return null
  const inGallery = galleryItems.value.find((g) => g.id === id)
  if (inGallery) return inGallery
  if (props.coverPreview?.id === id) return props.coverPreview
  return { id, publicUrl: null, filename: id }
})

function thumbSrc(item: ProductMediaItem): string | null {
  return item.publicUrl
}

async function addFromUrl() {
  const url = newUrl.value.trim()
  if (!url) {
    localErr.value = '請輸入 URL'
    return
  }
  adding.value = true
  localErr.value = null
  try {
    const item = await createFromPublicUrl(url)
    galleryItems.value = [...galleryItems.value, item]
    newUrl.value = ''
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    localErr.value = x?.data?.message || x?.message || '新增失敗'
  } finally {
    adding.value = false
  }
}

function triggerFilePick() {
  fileInputRef.value?.click()
}

async function onFilesChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const list = input.files
  if (!list?.length) return

  uploading.value = true
  localErr.value = null
  try {
    for (const file of Array.from(list)) {
      const item = await uploadImageFile(file)
      galleryItems.value = [...galleryItems.value, item]
    }
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    localErr.value = x?.data?.message || x?.message || '上傳失敗'
  } finally {
    input.value = ''
    uploading.value = false
  }
}

function removeGallery(id: string) {
  galleryItems.value = galleryItems.value.filter((x) => x.id !== id)
  if (coverAttachmentId.value === id) {
    coverAttachmentId.value = null
  }
}

function setCover(id: string) {
  coverAttachmentId.value = id
}
</script>

<template>
  <div class="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4">
    <div>
      <h3 class="text-sm font-semibold text-neutral-900">商品圖片</h3>
      <p class="mt-0.5 text-xs text-neutral-500">
        上傳檔案會存到本機 public/uploads；亦可用公開網址建立附件。圖庫可點「設為封面」。
      </p>
    </div>

    <p
      v-if="localErr"
      class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700"
    >
      {{ localErr }}
    </p>

    <!-- 封面：方形預覽 -->
    <div>
      <p class="text-xs font-medium text-neutral-600">封面</p>
      <div class="mt-2 flex flex-wrap items-start gap-4">
        <div
          class="relative aspect-square w-28 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
        >
          <img
            v-if="coverItem && thumbSrc(coverItem)"
            :src="thumbSrc(coverItem)!"
            :alt="coverItem.filename"
            class="h-full w-full object-cover"
          />
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-neutral-100 p-2 text-center text-[11px] text-neutral-400"
          >
            {{ coverItem ? '無預覽 URL' : '未設定' }}
          </div>
          <span
            v-if="coverAttachmentId"
            class="absolute left-1 top-1 rounded bg-neutral-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white"
          >
            封面
          </span>
        </div>
        <div class="min-w-0 flex-1 space-y-2">
          <p v-if="coverAttachmentId" class="truncate font-mono text-[11px] text-neutral-500">
            {{ coverAttachmentId }}
          </p>
          <p v-else class="text-xs text-neutral-500">從下方圖庫選一張設為封面。</p>
          <button
            v-if="coverAttachmentId"
            type="button"
            class="text-xs text-red-600 hover:underline"
            @click="coverAttachmentId = null"
          >
            清除封面
          </button>
        </div>
      </div>
    </div>

    <!-- 上傳 + 網址 -->
    <div class="flex flex-wrap gap-2">
      <input
        ref="fileInputRef"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        multiple
        @change="onFilesChange"
      />
      <button
        type="button"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
        :disabled="uploading"
        @click="triggerFilePick"
      >
        {{ uploading ? '上傳中…' : '上傳圖片' }}
      </button>
    </div>

    <AdminFormField label="從網址新增到圖庫" hint="建立一筆以 publicUrl 指向該網址的附件">
      <div class="flex flex-wrap gap-2">
        <input
          v-model="newUrl"
          type="url"
          placeholder="https://…"
          class="min-w-[12rem] flex-1 rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs shadow-sm"
          @keydown.enter.prevent="addFromUrl"
        />
        <button
          type="button"
          class="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="adding"
          @click="addFromUrl"
        >
          {{ adding ? '新增中…' : '新增' }}
        </button>
      </div>
    </AdminFormField>

    <!-- 圖庫：方形縮圖網格 -->
    <div v-if="galleryItems.length">
      <p class="text-xs font-medium text-neutral-600">圖庫</p>
      <ul class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        <li
          v-for="g in galleryItems"
          :key="g.id"
          class="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
        >
          <img
            v-if="thumbSrc(g)"
            :src="thumbSrc(g)!"
            :alt="g.filename"
            class="h-full w-full object-cover"
          />
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-neutral-100 p-2 text-center text-[10px] text-neutral-400"
          >
            {{ g.filename }}
          </div>
          <div
            class="absolute inset-x-0 bottom-0 flex gap-1 bg-black/60 p-1.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
          >
            <button
              type="button"
              class="flex-1 rounded bg-white/95 px-1 py-1 text-[10px] font-medium text-neutral-900 hover:bg-white"
              @click="setCover(g.id)"
            >
              封面
            </button>
            <button
              type="button"
              class="flex-1 rounded bg-red-600/95 px-1 py-1 text-[10px] font-medium text-white hover:bg-red-600"
              @click="removeGallery(g.id)"
            >
              移除
            </button>
          </div>
          <span
            v-if="coverAttachmentId === g.id"
            class="absolute left-1 top-1 rounded bg-emerald-700/90 px-1.5 py-0.5 text-[10px] font-medium text-white"
          >
            封面
          </span>
        </li>
      </ul>
    </div>
    <p v-else class="text-xs text-neutral-500">圖庫為空，請上傳或從網址新增。</p>
  </div>
</template>
