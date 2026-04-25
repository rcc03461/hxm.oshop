<script setup lang="ts">
type FilterOption = {
  value: string
  label: string
  count?: number
}

const props = defineProps<{
  modelValue: string[]
  label: string
  options: FilterOption[]
  disabled?: boolean
  clearLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  change: [value: string[]]
}>()

function isSelected(value: string) {
  return props.modelValue.includes(value)
}

function emitSelection(value: string[]) {
  emit('update:modelValue', value)
  emit('change', value)
}

function clearSelection() {
  if (props.disabled || props.modelValue.length === 0) return
  emitSelection([])
}

function selectOption(value: string, event: MouseEvent) {
  if (props.disabled) return

  if (event.shiftKey) {
    const next = isSelected(value)
      ? props.modelValue.filter((item) => item !== value)
      : [...props.modelValue, value]
    emitSelection(next)
    return
  }

  if (props.modelValue.length === 1 && props.modelValue[0] === value) return
  emitSelection([value])
}
</script>

<template>
  <div class="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-neutral-200">
    <div class="flex items-center gap-4 overflow-x-auto px-4 py-3 text-sm">
      <div class="flex shrink-0 items-center gap-2">
        <div class="text-neutral-500">
          {{ label }}
        </div>
        <button
          type="button"
          class="rounded-full border border-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="disabled || modelValue.length === 0"
          @click="clearSelection"
        >
          {{ clearLabel ?? 'Clear' }}
        </button>
      </div>
      <div class="flex min-w-max items-center gap-6">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="inline-flex items-center gap-1.5 whitespace-nowrap font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            isSelected(option.value)
              ? 'text-blue-700'
              : 'text-neutral-600 hover:text-neutral-950'
          "
          :disabled="disabled"
          @click="selectOption(option.value, $event)"
        >
          <span>{{ option.label }}</span>
          <span
            v-if="typeof option.count === 'number'"
            class="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none"
            :class="
              isSelected(option.value)
                ? 'bg-blue-100 text-blue-700'
                : 'bg-neutral-100 text-neutral-500'
            "
          >
            {{ option.count }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
