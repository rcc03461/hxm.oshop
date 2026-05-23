<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type AttachmentRow = {
  id: string
  type: string
  mimetype: string
  filename: string
  extension: string
  size: number
  publicUrl: string | null
  createdAt: string
  updatedAt: string
}

type AttachmentListResponse = {
  items: AttachmentRow[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

const PAGE_SIZE = 24

const items = ref<AttachmentRow[]>([])
const page = ref(1)
const total = ref(0)
const hasMore = ref(true)
const pending = ref(false)
const err = ref<string | null>(null)

const drawerOpen = ref(false)
const selected = ref<AttachmentRow | null>(null)
const editMode = ref(false)
const editFilename = ref('')
const drawerErr = ref<string | null>(null)
const drawerOk = ref<string | null>(null)
const saving = ref(false)
const deleting = ref(false)

const lightboxOpen = ref(false)
const lightboxUrl = ref<string | null>(null)

const requestFetch = useRequestFetch()
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function isImageItem(item: AttachmentRow) {
  return item.mimetype.startsWith('image/') || item.type === 'image'
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-HK')
  } catch {
    return iso
  }
}

async function loadPage(targetPage: number) {
  if (pending.value) return
  if (!hasMore.value && targetPage > 1) return
  pending.value = true
  err.value = null
  try {
    const res = await requestFetch<AttachmentListResponse>('/api/admin/attachments', {
      credentials: 'include',
      query: { page: targetPage, pageSize: PAGE_SIZE },
    })
    if (targetPage === 1) {
      items.value = res.items
    } else {
      items.value.push(...res.items)
    }
    page.value = res.page
    total.value = res.total
    hasMore.value = res.hasMore
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || '載入媒體資源失敗'
  } finally {
    pending.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || pending.value) return
  await loadPage(page.value + 1)
}

function openDrawer(item: AttachmentRow) {
  selected.value = item
  editMode.value = false
  editFilename.value = item.filename
  drawerErr.value = null
  drawerOk.value = null
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  editMode.value = false
}

function onDrawerOpenChange(open: boolean) {
  if (!open) {
    selected.value = null
    editMode.value = false
  }
}

function openLightbox(url: string) {
  lightboxUrl.value = url
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
  lightboxUrl.value = null
}

async function copyLink(url: string) {
  if (!import.meta.client) return
  drawerErr.value = null
  try {
    await navigator.clipboard.writeText(url)
    drawerOk.value = '連結已複製'
  } catch {
    drawerErr.value = '無法複製到剪貼簿，請手動選取。'
  }
}

function startEdit() {
  if (!selected.value) return
  editFilename.value = selected.value.filename
  editMode.value = true
  drawerErr.value = null
  drawerOk.value = null
}

function cancelEdit() {
  editMode.value = false
  if (selected.value) editFilename.value = selected.value.filename
}

async function saveEdit() {
  if (!selected.value) return
  const name = editFilename.value.trim()
  if (!name) {
    drawerErr.value = '請輸入檔名'
    return
  }
  saving.value = true
  drawerErr.value = null
  drawerOk.value = null
  try {
    const res = await requestFetch<{ attachment: AttachmentRow }>(
      `/api/admin/attachments/${selected.value.id}`,
      {
        method: 'PATCH',
        credentials: 'include',
        body: { filename: name },
      },
    )
    const idx = items.value.findIndex((i) => i.id === res.attachment.id)
    if (idx >= 0) items.value[idx] = res.attachment
    selected.value = res.attachment
    editMode.value = false
    drawerOk.value = '已儲存'
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    drawerErr.value = x?.data?.message || x?.message || '儲存失敗'
  } finally {
    saving.value = false
  }
}

async function deleteSelected() {
  if (!selected.value) return
  if (!import.meta.client) return
  if (!window.confirm(`確定刪除「${selected.value.filename}」？`)) return

  deleting.value = true
  drawerErr.value = null
  drawerOk.value = null
  try {
    await requestFetch(`/api/admin/attachments/${selected.value.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const id = selected.value.id
    items.value = items.value.filter((i) => i.id !== id)
    total.value = Math.max(0, total.value - 1)
    closeDrawer()
    selected.value = null
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    drawerErr.value = x?.data?.message || x?.message || '刪除失敗'
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await loadPage(1)
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      void loadMore()
    },
    { root: null, rootMargin: '240px 0px', threshold: 0 },
  )
  if (sentinelRef.value) observer.observe(sentinelRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">媒體庫</h1>
        <p class="mt-1 text-sm text-neutral-600">
          顯示此租戶所有上傳檔案，向下捲動自動載入更多。
        </p>
      </div>
      <p class="text-xs text-neutral-500">共 {{ total }} 個檔案</p>
    </div>

    <p v-if="err" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ err }}
    </p>

    <div class="mt-5 flex flex-wrap gap-3">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="flex w-full max-w-[300px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white text-left transition hover:border-neutral-300 hover:shadow-sm"
        @click="openDrawer(item)"
      >
        <div class="aspect-square w-full bg-neutral-100">
          <img
            v-if="item.publicUrl && isImageItem(item)"
            :src="item.publicUrl"
            :alt="item.filename"
            loading="lazy"
            class="h-full w-full object-cover"
          />
          <div
            v-else
            class="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-center text-xs text-neutral-500"
          >
            <span class="text-lg font-medium uppercase text-neutral-400">
              {{ item.extension || '?' }}
            </span>
            <span>無預覽</span>
          </div>
        </div>
        <div class="border-t border-neutral-100 px-3 py-2">
          <p class="truncate text-xs font-medium text-neutral-900" :title="item.filename">
            {{ item.filename }}
          </p>
          <p class="mt-0.5 text-[11px] text-neutral-500">
            {{ formatBytes(item.size) }}
          </p>
        </div>
      </button>
    </div>

    <p
      v-if="pending"
      class="mt-4 text-center text-sm text-neutral-500"
    >
      載入中…
    </p>
    <p
      v-else-if="!items.length"
      class="mt-6 text-center text-sm text-neutral-500"
    >
      尚未上傳任何檔案
    </p>
    <p
      v-else-if="!hasMore"
      class="mt-6 text-center text-xs text-neutral-400"
    >
      已載入全部檔案
    </p>

    <div ref="sentinelRef" class="h-8 w-full" aria-hidden="true" />

    <AdminEntityDrawer
      v-model:open="drawerOpen"
      :title="selected?.filename ?? '媒體詳情'"
      width-class="max-w-md"
      @update:open="onDrawerOpenChange"
    >
      <template v-if="selected">
        <div
          v-if="selected.publicUrl && isImageItem(selected)"
          class="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
        >
          <button
            type="button"
            class="block w-full cursor-zoom-in"
            @click="openLightbox(selected.publicUrl!)"
          >
            <img
              :src="selected.publicUrl"
              :alt="selected.filename"
              class="max-h-72 w-full object-contain"
            />
          </button>
          <p class="border-t border-neutral-200 px-3 py-1.5 text-center text-[11px] text-neutral-500">
            點擊圖片放大預覽
          </p>
        </div>
        <div
          v-else
          class="flex aspect-video items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500"
        >
          無圖片預覽
        </div>

        <div class="mt-4 space-y-3 text-sm">
          <p
            v-if="drawerErr"
            class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {{ drawerErr }}
          </p>
          <p
            v-if="drawerOk"
            class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            {{ drawerOk }}
          </p>

          <div v-if="editMode" class="space-y-2">
            <label class="block text-xs font-medium text-neutral-600">檔名</label>
            <input
              v-model="editFilename"
              type="text"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                :disabled="saving"
                @click="saveEdit"
              >
                {{ saving ? '儲存中…' : '儲存' }}
              </button>
              <button
                type="button"
                class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                :disabled="saving"
                @click="cancelEdit"
              >
                取消
              </button>
            </div>
          </div>

          <dl v-else class="space-y-2 text-neutral-700">
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">類型</dt>
              <dd class="text-right">{{ selected.type }} · {{ selected.mimetype }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">副檔名</dt>
              <dd>{{ selected.extension.toUpperCase() }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">大小</dt>
              <dd>{{ formatBytes(selected.size) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">上傳時間</dt>
              <dd class="text-right text-xs">{{ formatTime(selected.createdAt) }}</dd>
            </div>
            <div v-if="selected.publicUrl" class="pt-1">
              <dt class="mb-1 text-neutral-500">公開連結</dt>
              <dd class="break-all rounded-md bg-neutral-50 px-2 py-1.5 text-xs text-neutral-800">
                {{ selected.publicUrl }}
              </dd>
            </div>
          </dl>

          <div v-if="!editMode" class="flex flex-wrap gap-2 pt-1">
            <button
              v-if="selected.publicUrl"
              type="button"
              class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
              @click="copyLink(selected.publicUrl!)"
            >
              複製連結
            </button>
            <button
              type="button"
              class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
              @click="startEdit"
            >
              編輯
            </button>
            <button
              type="button"
              class="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              :disabled="deleting"
              @click="deleteSelected"
            >
              {{ deleting ? '刪除中…' : '刪除' }}
            </button>
          </div>
        </div>
      </template>
    </AdminEntityDrawer>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="lightboxOpen && lightboxUrl"
          class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="圖片預覽"
          @click="closeLightbox"
        >
          <button
            type="button"
            class="absolute right-4 top-4 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            @click.stop="closeLightbox"
          >
            關閉
          </button>
          <img
            :src="lightboxUrl"
            alt=""
            class="max-h-[90vh] max-w-full object-contain"
            @click.stop
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
