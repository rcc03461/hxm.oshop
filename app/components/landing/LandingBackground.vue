<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const mouseX = ref(0)
const mouseY = ref(0)
const container = ref<HTMLElement | null>(null)

const handleMouseMove = (e: MouseEvent) => {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  mouseX.value = e.clientX - rect.left
  mouseY.value = e.clientY - rect.top
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <div ref="container" class="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
    <!-- 基礎網格紋理 -->
    <div class="absolute inset-0 opacity-[0.05]" 
      style="background-image: radial-gradient(#000 1px, transparent 1px); background-size: 24px 24px;">
    </div>

    <!-- 六邊形背景網格 (CSS Pattern) -->
    <div class="absolute inset-0 opacity-[0.04]" 
      style="background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgNTYgMTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0yOCA2NkwwIDUwTDI4IDM0TDU2IDUwTDI4IDY2WiBNMjggMTZMMCAwTDI4IC0xNkw1NiAwTDI4IDE2WiBNMjggMTE2TDAgMTAwTDI4IDg0TDU2IDEwMEwyOCAxMTZaIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg=='); background-size: 56px 100px;">
    </div>

    <!-- 噪點紋理 (Noise Texture) -->
    <div class="absolute inset-0 opacity-[0.03] pointer-events-none"
      style="background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAybackAAAAAElFTkSuQmCC'); background-repeat: repeat;">
    </div>

    <!-- 滑鼠跟隨聚光燈效果 -->
    <div 
      class="absolute inset-0 transition-opacity duration-300"
      :style="{
        background: `radial-gradient(800px circle at ${mouseX}px ${mouseY}px, rgba(254, 127, 26, 0.15), transparent 80%)`
      }"
    ></div>

    <!-- 隨機漂浮的六邊形 -->
    <div class="absolute top-[10%] left-[5%] animate-float-slow text-orange-500/20">
      <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 7.77V16.23L12 22L2 16.23V7.77L12 2Z"/></svg>
    </div>
    <div class="absolute top-[60%] right-[10%] animate-float text-orange-600/10" style="animation-delay: -2s;">
      <svg width="180" height="180" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 7.77V16.23L12 22L2 16.23V7.77L12 2Z"/></svg>
    </div>
    <div class="absolute bottom-[15%] left-[15%] animate-float-fast text-orange-400/20" style="animation-delay: -5s;">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 7.77V16.23L12 22L2 16.23V7.77L12 2Z"/></svg>
    </div>
    <div class="absolute top-[30%] right-[25%] animate-pulse text-orange-300/10">
      <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 7.77V16.23L12 22L2 16.23V7.77L12 2Z"/></svg>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}
@keyframes float-slow {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-30px) rotate(-3deg); }
}
@keyframes float-fast {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-15px) rotate(10deg); }
}
.animate-float {
  animation: float 8s ease-in-out infinite;
}
.animate-float-slow {
  animation: float-slow 12s ease-in-out infinite;
}
.animate-float-fast {
  animation: float-fast 5s ease-in-out infinite;
}
</style>
