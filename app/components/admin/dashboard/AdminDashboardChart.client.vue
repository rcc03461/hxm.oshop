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

/** Chart.js 不接受 Vue reactive proxy，且須等 canvas 掛載後再繪製 */
function buildChartConfig(): ChartConfiguration {
  const raw = toRaw(props.config)
  return {
    type: props.type,
    data: structuredClone(toRaw(raw.data)),
    options: raw.options ? toRaw(raw.options) : undefined,
    plugins: raw.plugins ? toRaw(raw.plugins) : undefined,
  }
}

async function renderChart() {
  await nextTick()
  if (!canvasRef.value) return
  chart?.destroy()
  chart = new Chart(canvasRef.value, buildChartConfig())
  requestAnimationFrame(() => chart?.resize())
}

watch(
  () => [props.type, props.config] as const,
  () => void renderChart(),
  { deep: true, flush: 'post' },
)

onMounted(() => void renderChart())
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
