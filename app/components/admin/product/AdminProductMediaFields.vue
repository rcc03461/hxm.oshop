<script setup lang="ts">
import type { ProductMediaItem } from '~/types/productMedia'

const coverAttachmentId = defineModel<string | null>('coverAttachmentId', {
  default: null,
})

const galleryItems = defineModel<ProductMediaItem[]>('galleryItems', {
  default: () => [],
})

const props = defineProps<{
  /** 封面若不在圖庫列表時，載入後併入圖庫最前 */
  coverPreview?: ProductMediaItem | null
}>()

const { createFromPublicUrl, uploadImageFile } = useAdminAttachments()

const IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif'

const newUrl = ref('')
const adding = ref(false)
const uploading = ref(false)
const dragOver = ref(false)
const localErr = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
let dragDepth = 0

function thumbSrc(item: ProductMediaItem): string | null {
  return item.publicUrl
}

function syncCoverFromGallery() {
  coverAttachmentId.value = galleryItems.value[0]?.id ?? null
}

function moveToFront(id: string) {
  const idx = galleryItems.value.findIndex((g) => g.id === id)
  if (idx <= 0) return
  const next = [...galleryItems.value]
  const [item] = next.splice(idx, 1)
  next.unshift(item!)
  galleryItems.value = next
  syncCoverFromGallery()
}

function normalizeGalleryOrder() {
  const coverId = coverAttachmentId.value
  if (!coverId) {
    syncCoverFromGallery()
    return
  }
  const idx = galleryItems.value.findIndex((g) => g.id === coverId)
  if (idx > 0) {
    moveToFront(coverId)
    return
  }
  if (idx === -1 && props.coverPreview?.id === coverId) {
    const rest = galleryItems.value.filter((g) => g.id !== coverId)
    galleryItems.value = [props.coverPreview, ...rest]
  }
  syncCoverFromGallery()
}

watch(
  () => [galleryItems.value.length, coverAttachmentId.value, props.coverPreview?.id],
  () => normalizeGalleryOrder(),
  { flush: 'post' },
)

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
    syncCoverFromGallery()
    newUrl.value = ''
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    localErr.value = x?.data?.message || x?.message || '新增失敗'
  } finally {
    adding.value = false
  }
}

function isImageFile(file: File) {
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name)
}

function isFileDrag(ev: DragEvent) {
  return ev.dataTransfer?.types.some((t) => t === 'Files' || t === 'application/x-moz-file')
}

function triggerFilePick() {
  if (uploading.value) return
  fileInputRef.value?.click()
}

async function uploadFiles(files: File[]) {
  const images = files.filter(isImageFile)
  if (!images.length) {
    localErr.value = '請拖曳或選擇 JPEG、PNG、WebP、GIF 圖片'
    return
  }

  uploading.value = true
  localErr.value = null
  try {
    for (const file of images) {
      const item = await uploadImageFile(file)
      galleryItems.value = [...galleryItems.value, item]
    }
    syncCoverFromGallery()
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    localErr.value = x?.data?.message || x?.message || '上傳失敗'
  } finally {
    uploading.value = false
  }
}

async function onFilesChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const list = input.files
  if (!list?.length) return
  await uploadFiles(Array.from(list))
  input.value = ''
}

function onDragEnter(ev: DragEvent) {
  if (!isFileDrag(ev)) return
  ev.preventDefault()
  dragDepth += 1
  dragOver.value = true
}

function onDragLeave(ev: DragEvent) {
  if (!isFileDrag(ev)) return
  ev.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragOver.value = false
}

function onDragOver(ev: DragEvent) {
  if (!isFileDrag(ev)) return
  ev.preventDefault()
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy'
}

async function onDrop(ev: DragEvent) {
  ev.preventDefault()
  dragDepth = 0
  dragOver.value = false
  if (uploading.value) return
  const list = ev.dataTransfer?.files
  if (!list?.length) return
  await uploadFiles(Array.from(list))
}

function removeGallery(id: string) {
  galleryItems.value = galleryItems.value.filter((x) => x.id !== id)
  syncCoverFromGallery()
}
</script>

<template>
  <div
    class="relative space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 class="text-sm font-semibold text-neutral-900">商品圖片</h3>
        <p class="mt-0.5 text-xs text-neutral-500">
          第一張為封面；拖曳圖片至此區上傳，或點擊上傳。
        </p>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        class="sr-only"
        :accept="IMAGE_ACCEPT"
        multiple
        @change="onFilesChange"
      />
      <button
        type="button"
        class="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
        :disabled="uploading"
        @click="triggerFilePick"
      >
        {{ uploading ? '上傳中…' : '上傳圖片' }}
      </button>
    </div>

    <div
      v-if="dragOver || uploading"
      class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-900 bg-neutral-900/5 px-4 py-6 text-center"
    >
      <p class="text-sm font-medium text-neutral-900">
        {{ uploading ? '上傳中…' : '放開即可上傳' }}
      </p>
      <p v-if="dragOver && !uploading" class="mt-1 text-xs text-neutral-600">
        JPEG、PNG、WebP、GIF
      </p>
    </div>

    <p
      v-if="localErr"
      class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700"
    >
      {{ localErr }}
    </p>

    <ul
      v-if="galleryItems.length"
      class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
    >
      <li
        v-for="(g, index) in galleryItems"
        :key="g.id"
        class="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
        :class="index === 0 ? 'ring-2 ring-neutral-900/20' : ''"
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
            v-if="index !== 0"
            type="button"
            class="flex-1 rounded bg-white/95 px-1 py-1 text-[10px] font-medium text-neutral-900 hover:bg-white"
            @click="moveToFront(g.id)"
          >
            設為封面
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
          v-if="index === 0"
          class="absolute left-1 top-1 rounded bg-neutral-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white"
        >
          封面
        </span>
      </li>
    </ul>
    <p v-else class="py-6 text-center text-xs text-neutral-500">
      尚無圖片
    </p>

    <AdminFormField label="從網址新增" hint="建立一筆以 publicUrl 指向該網址的附件">
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
  </div>
</template>
