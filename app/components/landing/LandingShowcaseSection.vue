<script setup lang="ts">
interface ShowcaseItem {
  id: string
  title: string
  description: string
  imageUrl: string
}

defineProps<{
  items: ShowcaseItem[]
}>()
</script>

<template>
  <section id="showcase" class="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:py-32">
    <div class="text-center mb-16 sm:mb-24">
      <h2 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        需要功能齊全，<br class="hidden sm:block" />又懶得從頭打造的時刻。
      </h2>
    </div>

    <div class="space-y-24 sm:space-y-32">
      <div 
        v-for="(item, index) in items" 
        :key="item.id" 
        class="flex flex-col gap-8 lg:items-center lg:gap-16"
        :class="index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'"
      >
        <!-- 文字說明 -->
        <div class="flex-1 lg:max-w-md">
          <div class="flex items-center gap-4 mb-4">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600">
              0{{ index + 1 }}
            </span>
          </div>
          <h3 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            {{ item.title }}
          </h3>
          <p class="mt-4 text-lg text-neutral-600">
            {{ item.description }}
          </p>
        </div>

        <!-- 圖片展示 Placeholder -->
        <div class="flex-1 w-full relative">
          <div class="aspect-[4/3] sm:aspect-[3/2] lg:aspect-square overflow-hidden rounded-2xl bg-neutral-100 shadow-xl ring-1 ring-neutral-900/10">
            <img 
              :src="item.imageUrl" 
              :alt="item.title"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
          <!-- 裝飾用六邊形 -->
          <div class="absolute -bottom-6 -right-6 -z-10 text-orange-200 opacity-50 hidden md:block">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 7.77V16.23L12 22L2 16.23V7.77L12 2Z"/></svg>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
