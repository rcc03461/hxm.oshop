<script setup lang="ts">
import {
  Chart,
  registerables,
  type ChartConfiguration,
  type ChartType,
} from 'chart.js'

Chart.register(...registerables)

const props = defineProps<{
  type: ChartType
  config: Omit<ChartConfiguration, 'type'>
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function renderChart() {
  if (!canvasRef.value) return
  chart?.destroy()
  chart = new Chart(canvasRef.value, {
    type: props.type,
    ...props.config,
  })
}

watch(
  () => [props.type, props.config] as const,
  () => renderChart(),
  { deep: true },
)

onMounted(() => renderChart())
onUnmounted(() => {
  chart?.destroy()
  chart = null
})
</script>

<template>
  <div class="relative h-full min-h-[220px] w-full">
    <canvas ref="canvasRef" class="max-h-full max-w-full" />
  </div>
</template>
