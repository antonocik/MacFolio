<script setup>
import { computed, ref } from 'vue'
import Sparkline from './Sparkline.vue'
import {
  costBasis,
  formatCurrency,
  formatPercent,
  marketValue,
  unrealisedPnl,
  unrealisedPnlPct,
} from '../composables/portfolio.js'

const props = defineProps({
  holdings: { type: Array, required: true },
})

const sortKey = ref('value')
const ascending = ref(false)

const columns = [
  { key: 'symbol', label: 'Symbol', numeric: false },
  { key: 'quantity', label: 'Qty', numeric: true },
  { key: 'avgCost', label: 'Avg cost', numeric: true },
  { key: 'price', label: 'Price', numeric: true },
  { key: 'value', label: 'Value', numeric: true },
  { key: 'pnl', label: 'P&L', numeric: true },
  { key: 'trend', label: 'Trend', numeric: false },
]

const rows = computed(() => {
  const enriched = props.holdings.map((holding) => ({
    ...holding,
    value: marketValue(holding),
    cost: costBasis(holding),
    pnl: unrealisedPnl(holding),
    pnlPct: unrealisedPnlPct(holding),
  }))

  const sorted = enriched.sort((a, b) => {
    const key = sortKey.value
    if (key === 'trend') return 0
    const left = a[key]
    const right = b[key]
    if (typeof left === 'string') return left.localeCompare(right)
    return left - right
  })

  return ascending.value ? sorted : sorted.reverse()
})

function toggleSort(key) {
  if (key === 'trend') return
  if (sortKey.value === key) {
    ascending.value = !ascending.value
  } else {
    sortKey.value = key
    ascending.value = key === 'symbol'
  }
}
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :class="{ numeric: column.numeric, active: sortKey === column.key }"
            @click="toggleSort(column.key)"
          >
            {{ column.label }}
            <span v-if="sortKey === column.key" class="caret">{{ ascending ? '▲' : '▼' }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.symbol">
          <td>
            <span class="symbol">{{ row.symbol }}</span>
            <span class="name">{{ row.name }}</span>
          </td>
          <td class="numeric">{{ row.quantity }}</td>
          <td class="numeric">{{ formatCurrency(row.avgCost) }}</td>
          <td class="numeric">{{ formatCurrency(row.price) }}</td>
          <td class="numeric">{{ formatCurrency(row.value) }}</td>
          <td class="numeric" :class="row.pnl >= 0 ? 'up' : 'down'">
            <div>{{ formatCurrency(row.pnl) }}</div>
            <div class="pct">{{ formatPercent(row.pnlPct) }}</div>
          </td>
          <td>
            <Sparkline :seed="row.symbol" :positive="row.pnl >= 0" />
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!holdings.length" class="empty">No open positions.</p>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

th {
  text-align: left;
  padding: 10px 12px;
  color: #8b949e;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #30363d;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

th.numeric {
  text-align: right;
}

th.active {
  color: #58a6ff;
}

.caret {
  font-size: 0.65rem;
}

td {
  padding: 12px;
  border-bottom: 1px solid #21262d;
  font-variant-numeric: tabular-nums;
}

td.numeric {
  text-align: right;
}

.symbol {
  display: block;
  font-weight: 700;
  color: #e6edf3;
}

.name {
  display: block;
  font-size: 0.75rem;
  color: #8b949e;
}

.up {
  color: #3fb950;
}

.down {
  color: #f85149;
}

.pct {
  font-size: 0.75rem;
  opacity: 0.85;
}

.empty {
  text-align: center;
  color: #8b949e;
  padding: 24px;
}
</style>
