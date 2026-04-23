<script setup lang="ts">
import type { HomepageModule } from '~/types/homepage'

const props = defineProps<{
  module: HomepageModule
}>()
</script>

<template>
  <section v-if="module.moduleType === 'banner'" class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <LandingHeroSection :hero="module.config.hero" />
  </section>

  <section
    v-else-if="module.moduleType === 'category'"
    class="mx-auto max-w-5xl border-t border-neutral-200 px-4 py-10 sm:px-6"
  >
    <div class="mb-4">
      <h2 class="text-xl font-semibold tracking-tight text-neutral-900">
        {{ module.config.title }}
      </h2>
    </div>
    <div class="flex flex-wrap gap-2">
      <span
        v-for="category in module.config.categories"
        :key="category.id"
        class="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-700"
      >
        {{ category.label }}
      </span>
    </div>
  </section>

  <section v-else-if="module.moduleType === 'products'" class="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
    <div class="mb-4">
      <h2 class="text-xl font-semibold tracking-tight text-neutral-900">
        {{ module.config.title }}
      </h2>
    </div>
    <LandingCategoriesProductsSection
      :categories="module.config.categories"
      :products="module.config.products"
    />
  </section>

  <section
    v-else-if="module.moduleType === 'footer'"
    class="mx-auto max-w-5xl border-t border-neutral-200 px-4 py-10 text-xs text-neutral-500 sm:px-6"
  >
    {{ module.config.text }}
  </section>
</template>
