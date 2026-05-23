<script setup lang="ts">
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import type { LandingHero } from '~/types/landing'

defineProps<{
  hero: LandingHero
}>()

const badgeRef = ref(null)
const titleRef = ref(null)
const subtitleRef = ref(null)
const ctaRef = ref(null)
const imageRef = ref(null)

onMounted(() => {
  if (!process.client) return

  const tl = gsap.timeline()

  tl.from(badgeRef.value, { opacity: 0, y: -20, duration: 0.6, ease: 'power3.out' })
    .from(titleRef.value, { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' }, '-=0.3')
    .from(subtitleRef.value, { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out' }, '-=0.5')
    .from(ctaRef.value, { opacity: 0, scale: 0.9, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.4')
    .from(imageRef.value, { opacity: 0, y: 100, duration: 1, ease: 'power4.out' }, '-=0.2')
})
</script>

<template>
  <section class="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:py-32">
    <!-- 標題區塊 -->
    <div ref="badgeRef" class="flex justify-center mb-6">
      <span class="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 ring-1 ring-inset ring-orange-500/20">
        {{ hero.badge }}
      </span>
    </div>
    
    <h1 ref="titleRef" class="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
      {{ hero.title }}
    </h1>
    
    <p ref="subtitleRef" class="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
      {{ hero.subtitle }}
    </p>
    
    <div ref="ctaRef" class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <NuxtLink
        :to="hero.primaryCta.to"
        class="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-orange-500 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 transition-all hover:scale-105 active:scale-95"
      >
        {{ hero.primaryCta.label }}
      </NuxtLink>
      <NuxtLink
        :to="hero.secondaryCta.to"
        class="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-all hover:scale-105 active:scale-95"
      >
        <svg class="mr-2 h-4 w-4 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        {{ hero.secondaryCta.label }}
      </NuxtLink>
    </div>

    <!-- 視覺截圖區塊 Placeholder -->
    <div ref="imageRef" class="mt-16 sm:mt-24 lg:mt-32">
      <div class="-m-2 rounded-xl bg-neutral-900/5 p-2 ring-1 ring-inset ring-neutral-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
        <img
          src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=2400&q=80"
          alt="shopgo 後台預覽"
          width="2400"
          height="1600"
          class="rounded-md shadow-2xl ring-1 ring-neutral-900/10 block object-cover w-full h-auto aspect-video sm:aspect-[2/1] transition-transform duration-700 hover:scale-[1.02]"
        />
      </div>
    </div>
  </section>
</template>
