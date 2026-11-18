<script setup>
import { computed } from 'vue'
import { priceSeries, sparklinePath, round } from '../composables/portfolio.js'

const props = defineProps({
  seed: { type: String, required: true },
  points: { type: Number, default: 30 },
  width: { type: Number, default: 120 },
  height: { type: Number, default: 36 },
  positive: { type: Boolean, default: true },
})

const series = computed(() => priceSeries(props.seed, { points: props.points }))
const path = computed(() => sparklinePath(series.value, props.width, props.height))
const areaPath = computed(
  () => `${path.value} L${props.width},${props.height} L0,${props.height} Z`,
)
const change = computed(() => {
  const first = series.value[0]
  const last = series.value[series.value.length - 1]
  return round(((last - first) / first) * 100, 2)
})
const gradientId = computed(() => `spark-${props.seed.replace(/[^a-z0-9]/gi, '')}`)
const up = computed(() => change.value >= 0)
</script>

<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    class="sparkline"
    role="img"
    :aria-label="`Price trend, ${up ? 'up' : 'down'} ${Math.abs(change)} percent`"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="up ? '#3fb950' : '#f85149'" stop-opacity="0.35" />
        <stop offset="100%" :stop-color="up ? '#3fb950' : '#f85149'" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path :d="areaPath" :fill="`url(#${gradientId})`" />
    <path
      :d="path"
      fill="none"
      :stroke="up ? '#3fb950' : '#f85149'"
      stroke-width="1.5"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.sparkline {
  display: block;
  overflow: visible;
}
</style>
