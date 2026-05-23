<script setup lang="ts">
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (process.client) {
  gsap.registerPlugin(ScrollTrigger)
}

interface Feature {
  num: string
  title: string
  subtitle: string
  description: string
}

defineProps<{
  features: Feature[]
}>()

const sectionRef = ref(null)
const featureItems = ref<HTMLElement[]>([])

onMounted(() => {
  if (!process.client) return

  gsap.from(featureItems.value, {
    scrollTrigger: {
      trigger: sectionRef.value,
      start: 'top 80%',
    },
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.2,
    ease: 'power3.out'
  })
})
</script>

<template>
  <section id="features" ref="sectionRef" class="relative mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:py-32">
    <!-- 裝飾性六邊形 -->
    <div class="absolute -right-10 top-20 -z-10 text-orange-100 opacity-40">
      <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 7.77V16.23L12 22L2 16.23V7.77L12 2Z"/></svg>
    </div>

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
      <div v-for="feature in features" :key="feature.num" ref="featureItems" class="relative group">
        <div class="mb-4 transition-transform duration-300 group-hover:-translate-y-1">
          <span class="font-mono text-sm font-semibold tracking-wider text-orange-500">
            {{ feature.num }}
          </span>
          <span class="ml-2 text-sm font-medium tracking-wide text-neutral-500">
            {{ feature.subtitle }}
          </span>
        </div>
        <h3 class="mt-2 text-xl font-bold text-neutral-900 group-hover:text-orange-600 transition-colors">
          {{ feature.title }}
        </h3>
        <p class="mt-4 text-base leading-relaxed text-neutral-600">
          {{ feature.description }}
        </p>
      </div>
    </div>
  </section>
</template>
