<script setup lang="ts">
interface Feature {
  num: string
  title: string
  subtitle: string
  description: string
}

defineProps<{
  features: Feature[]
}>()
</script>

<template>
  <section id="features" class="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:py-32">
    <div class="mb-16">
      <h2 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        為什麼選擇 shopgo？
      </h2>
      <p class="mt-4 text-lg text-neutral-600">
        和大型開店平台相同的體驗，<br class="hidden sm:block" />
        但完全開源、資料完全屬於你。
      </p>
    </div>

    <div class="grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="feature in features" :key="feature.num" class="relative">
        <div class="mb-4">
          <span class="font-mono text-sm font-semibold tracking-wider text-orange-500">
            {{ feature.num }}
          </span>
          <span class="ml-2 text-sm font-medium tracking-wide text-neutral-500">
            {{ feature.subtitle }}
          </span>
        </div>
        <h3 class="mt-2 text-xl font-bold text-neutral-900">
          {{ feature.title }}
        </h3>
        <p class="mt-4 text-base leading-relaxed text-neutral-600">
          {{ feature.description }}
        </p>
      </div>
    </div>
  </section>
</template>
