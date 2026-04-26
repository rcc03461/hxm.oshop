<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

function toggle() {
  if (props.disabled) return
  const next = !props.modelValue
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-disabled="disabled"
    class="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-50"
    :class="modelValue ? 'bg-emerald-500' : 'bg-neutral-300'"
    :disabled="disabled"
    @click="toggle"
  >
    <span
      aria-hidden="true"
      class="h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
      :class="modelValue ? 'translate-x-4' : 'translate-x-0.5'"
    />
  </button>
</template>
