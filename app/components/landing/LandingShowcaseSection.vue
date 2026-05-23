<script setup lang="ts">
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (process.client) {
  gsap.registerPlugin(ScrollTrigger)
}

interface ShowcaseItem {
  id: string
  title: string
  description: string
  imageUrl: string
}

defineProps<{
  items: ShowcaseItem[]
}>()

const sectionRef = ref(null)
const showcaseRows = ref<HTMLElement[]>([])

onMounted(() => {
  if (!process.client) return

  showcaseRows.value.forEach((row, index) => {
    const isEven = index % 2 === 0
    const [text, image] = isEven 
      ? [row.querySelector('.flex-1:first-child'), row.querySelector('.flex-1:last-child')]
      : [row.querySelector('.flex-1:last-child'), row.querySelector('.flex-1:first-child')]

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: row,
        start: 'top 80%',
      }
    })

    tl.from(text, {
      x: isEven ? -100 : 100,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    })
    .from(image, {
      x: isEven ? 100 : -100,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    }, '-=0.8')
  })
})
</script>

<template>
  <section id="showcase" ref="sectionRef" class="relative mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:py-32">
    <!-- 裝飾性六邊形 -->
    <div class="absolute -left-20 bottom-40 -z-10 text-orange-50 opacity-30">
      <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 7.77V16.23L12 22L2 16.23V7.77L12 2Z"/></svg>
    </div>

    <div class="text-center mb-16 sm:mb-24">
      <h2 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        需要功能齊全，<br class="hidden sm:block" />又懶得從頭打造的時刻。
      </h2>
    </div>

    <div class="space-y-24 sm:space-y-32 overflow-hidden">
      <div 
        v-for="(item, index) in items" 
        :key="item.id" 
        ref="showcaseRows"
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
          <div class="aspect-[4/3] sm:aspect-[3/2] lg:aspect-square overflow-hidden rounded-2xl bg-neutral-100 shadow-xl ring-1 ring-neutral-900/10 transition-all duration-500 hover:shadow-orange-500/10">
            <img 
              :src="item.imageUrl" 
              :alt="item.title"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
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
