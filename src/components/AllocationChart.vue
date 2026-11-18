<script setup>
import { computed } from 'vue'
import { allocation, donutSlice, formatCurrency } from '../composables/portfolio.js'

const props = defineProps({
  holdings: { type: Array, required: true },
})

const PALETTE = ['#58a6ff', '#a371f7', '#3fb950', '#d29922', '#f85149', '#39c5cf']

const slices = computed(() => {
  const rows = allocation(props.holdings)
  let angle = -Math.PI / 2

  return rows.map((row, index) => {
    const sweep = (row.pct / 100) * Math.PI * 2
    const slice = {
      ...row,
      color: PALETTE[index % PALETTE.length],
      path: donutSlice(60, 60, 52, 34, angle, angle + sweep),
    }
    angle += sweep
    return slice
  })
})
</script>

<template>
  <div class="allocation">
    <svg viewBox="0 0 120 120" class="donut" role="img" aria-label="Portfolio allocation">
      <path
        v-for="slice in slices"
        :key="slice.symbol"
        :d="slice.path"
        :fill="slice.color"
        stroke="#0d1117"
        stroke-width="1.5"
      />
      <text x="60" y="56" class="donut-label" text-anchor="middle">Positions</text>
      <text x="60" y="72" class="donut-value" text-anchor="middle">{{ slices.length }}</text>
    </svg>

    <ul class="legend">
      <li v-for="slice in slices" :key="slice.symbol">
        <span class="dot" :style="{ background: slice.color }" />
        <span class="symbol">{{ slice.symbol }}</span>
        <span class="pct">{{ slice.pct.toFixed(2) }}%</span>
        <span class="value">{{ formatCurrency(slice.value) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.allocation {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 20px;
  align-items: center;
}

.donut {
  width: 160px;
  height: 160px;
}

.donut-label {
  fill: #8b949e;
  font-size: 7px;
}

.donut-value {
  fill: #e6edf3;
  font-size: 14px;
  font-weight: 700;
}

.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.legend li {
  display: grid;
  grid-template-columns: 10px 1fr auto auto;
  gap: 10px;
  align-items: center;
  font-size: 0.85rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.symbol {
  font-weight: 600;
  color: #e6edf3;
}

.pct {
  color: #8b949e;
  font-variant-numeric: tabular-nums;
}

.value {
  color: #e6edf3;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 560px) {
  .allocation {
    grid-template-columns: 1fr;
    justify-items: center;
  }
}
</style>
