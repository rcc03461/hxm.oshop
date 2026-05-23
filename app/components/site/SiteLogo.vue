<script setup lang="ts">
import { SITE_LOGO_SRC, SITE_NAME } from '~/constants/site'

const props = withDefaults(
  defineProps<{
    name?: string
    /** undefined = 平台 logo；null = 無圖僅文字；字串 = 租戶 logo */
    logoSrc?: string | null
    /** 僅圖示、不顯示文字（租戶有自訂 logo 時可用） */
    iconOnly?: boolean
  }>(),
  {
    name: SITE_NAME,
    iconOnly: false,
  },
)

const displayName = computed(() => props.name || SITE_NAME)

const effectiveLogoSrc = computed(() => {
  if (props.logoSrc === null) return null
  if (props.logoSrc) return props.logoSrc
  return SITE_LOGO_SRC
})

const isPlatformLogo = computed(() => effectiveLogoSrc.value === SITE_LOGO_SRC)
const showWordmark = computed(
  () => !props.iconOnly && (!effectiveLogoSrc.value || !isPlatformLogo.value),
)
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-2.5">
    <img
      v-if="effectiveLogoSrc"
      :src="effectiveLogoSrc"
      :alt="`${displayName} logo`"
      class="shrink-0 object-contain object-left"
      :class="isPlatformLogo ? 'h-8 w-auto sm:h-9' : 'h-8 w-8 rounded-md object-cover sm:h-9 sm:w-9'"
    >
    <span
      v-if="showWordmark"
      class="truncate text-sm font-semibold tracking-tight text-neutral-900 sm:text-base"
    >
      {{ displayName }}
    </span>
  </span>
</template>
