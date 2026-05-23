<script setup lang="ts">
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (process.client) {
  gsap.registerPlugin(ScrollTrigger)
}

const sectionRef = ref(null)
const titleRef = ref(null)
const contentRef = ref(null)
const buttonRef = ref(null)

onMounted(() => {
  if (!process.client) return

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.value,
      start: 'top 80%',
    }
  })

  tl.from(titleRef.value, {
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out'
  })
  .from(contentRef.value, {
    y: 30,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out'
  }, '-=0.4')
  .from(buttonRef.value, {
    scale: 0.8,
    opacity: 0,
    duration: 0.6,
    ease: 'back.out(1.7)'
  }, '-=0.4')
})
</script>

<template>
  <section ref="sectionRef" class="relative overflow-hidden bg-orange-600 py-24 sm:py-32">
    <!-- 背景裝飾六邊形 -->
    <div class="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 text-orange-500/20">
      <svg width="400" height="400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 7.77V16.23L12 22L2 16.23V7.77L12 2Z"/></svg>
    </div>
    <div class="absolute right-0 bottom-0 translate-x-1/3 translate-y-1/3 text-orange-400/20">
      <svg width="600" height="600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 7.77V16.23L12 22L2 16.23V7.77L12 2Z"/></svg>
    </div>

    <div class="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
      <h2 ref="titleRef" class="text-3xl font-bold tracking-tight text-white sm:text-5xl">
        準備好開啟您的電商之旅了嗎？
      </h2>
      <p ref="contentRef" class="mx-auto mt-6 max-w-2xl text-lg leading-8 text-orange-100">
        加入 shopgo，體驗最純粹、最自由的開店方式。您的數據，您的程式碼，您的未來。
      </p>
      <div ref="buttonRef" class="mt-10 flex items-center justify-center gap-x-6">
        <NuxtLink
          to="/admin/register"
          class="rounded-full bg-white px-10 py-4 text-lg font-semibold text-orange-600 shadow-xl hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all hover:scale-105 active:scale-95"
        >
          立即免費註冊
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
