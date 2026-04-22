<script setup lang="ts">
import { Draggable } from '@he-tree/vue'
import '@he-tree/vue/style/default.css'
import AdminInlineEditName from './AdminInlineEditName.vue'
import type { AdminMenuNode } from './AdminMenuTreeItem.vue'

const props = withDefaults(
  defineProps<{
    maxDepth?: number
    busy?: boolean
  }>(),
  {
    maxDepth: 3,
    busy: false,
  },
)

const items = defineModel<AdminMenuNode[]>('items', { required: true })

const emit = defineEmits<{
  changed: []
  toggleVisible: [item: AdminMenuNode]
  edit: [item: AdminMenuNode]
  remove: [item: AdminMenuNode]
  rename: [item: AdminMenuNode, title: string]
  addChild: [item: AdminMenuNode]
}>()

function linkPreview(item: AdminMenuNode) {
  if (item.linkType === 'custom') {
    return item.customUrl?.trim() || '未設定連結'
  }
  if (item.pageSlug) {
    return `/p/${item.pageSlug}`
  }
  return '未連結頁面'
}

function onChange() {
  emit('changed')
}
</script>

<template>
  <div class="he-tree-wrapper">
    <Draggable
      v-model="items"
      :max-level="maxDepth"
      text-key="title"
      class="he-tree-container"
      @change="onChange"
    >
      <template #default="{ node, stat }">
        <div class="rounded-lg border border-neutral-300 bg-white px-3 py-2 transition-all duration-150 mb-2 hover:border-neutral-400">
          <div class="flex items-center gap-2">
            <!-- Toggle icon -->
            <button
              v-if="stat.children && stat.children.length > 0"
              type="button"
              class="shrink-0 text-neutral-400 hover:text-neutral-600 w-5 h-5 flex items-center justify-center rounded bg-neutral-100"
              @click="stat.open = !stat.open"
            >
              {{ stat.open ? '▼' : '▶' }}
            </button>
            <span v-else class="shrink-0 w-5 inline-block"></span>

            <!-- Drag Handle -->
            <span class="cursor-grab select-none text-neutral-400 px-1" title="按住拖曳">⋮⋮</span>
            
            <AdminInlineEditName
              :value="node.text || node.title"
              :disabled="busy"
              @save="(title) => emit('rename', node, title)"
            />
            
            <span class="max-w-[20rem] truncate text-xs text-neutral-400">
              {{ linkPreview(node) }}
            </span>
            <span class="shrink-0 text-[11px] text-neutral-500">
              {{ node.linkType === 'page' ? '頁面' : '自訂' }}
            </span>
            
            <div class="ml-auto flex items-center gap-1">
              <button
                type="button"
                class="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                :title="node.isVisible ? '隱藏' : '顯示'"
                :disabled="busy"
                @click="emit('toggleVisible', node)"
              >
                <!-- {{ node.isVisible ? '👁' : '🙈' }} -->
                <svg v-if="node.isVisible" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                <!-- {{ node.isVisible ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>` }} -->
              </button>
              <button
                v-if="stat.level < maxDepth"
                type="button"
                class="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                :disabled="busy"
                @click="emit('addChild', node)"
              >
                子項
              </button>
              <button
                type="button"
                class="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                :disabled="busy"
                @click="emit('edit', node)"
              >
                編輯
              </button>
              <button
                type="button"
                class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                :disabled="busy"
                @click="emit('remove', node)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Custom Placeholder for Drop -->
      <template #placeholder>
        <div class="drag-placeholder-inner border-2 border-dashed border-blue-400 bg-blue-50/50 rounded-lg min-h-[46px] mb-2 flex items-center justify-center text-sm font-medium text-blue-600">
          放開滑鼠即可移至此處
        </div>
      </template>
    </Draggable>
  </div>
</template>

<style scoped>
.he-tree-container {
  padding: 4px;
}
/* Override default placeholder style slightly if needed */
:deep(.drag-placeholder) {
  background: transparent !important;
  border: none !important;
}
</style>
