<script setup>
import { computed, reactive, ref } from 'vue'
import { applyTrade, formatCurrency } from '../composables/portfolio.js'

const props = defineProps({
  holdings: { type: Array, required: true },
  watchlist: { type: Array, default: () => [] },
})

const emit = defineEmits(['trade'])

const form = reactive({ symbol: '', side: 'buy', quantity: 1, price: 0 })
const error = ref('')

const symbols = computed(() => {
  const held = props.holdings.map((h) => h.symbol)
  const watched = props.watchlist.map((w) => w.symbol)
  return [...new Set([...held, ...watched])].sort()
})

function onSymbolChange() {
  const match =
    props.holdings.find((h) => h.symbol === form.symbol) ||
    props.watchlist.find((w) => w.symbol === form.symbol)
  if (match) form.price = match.price
}

function submit() {
  error.value = ''
  const quantity = form.side === 'buy' ? Math.abs(form.quantity) : -Math.abs(form.quantity)

  try {
    const next = applyTrade(props.holdings, {
      symbol: form.symbol,
      quantity,
      price: Number(form.price),
    })
    emit('trade', next, {
      date: new Date().toISOString().slice(0, 10),
      symbol: form.symbol,
      side: form.side,
      quantity: Math.abs(form.quantity),
      price: Number(form.price),
    })
    form.quantity = 1
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <form class="trade-ticket" @submit.prevent="submit">
    <h2>Trade ticket</h2>

    <label>
      Symbol
      <select v-model="form.symbol" required @change="onSymbolChange">
        <option disabled value="">Select…</option>
        <option v-for="symbol in symbols" :key="symbol" :value="symbol">{{ symbol }}</option>
      </select>
    </label>

    <div class="row">
      <label>
        Side
        <select v-model="form.side">
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </label>
      <label>
        Quantity
        <input v-model.number="form.quantity" type="number" min="1" step="1" required />
      </label>
    </div>

    <label>
      Price
      <input v-model.number="form.price" type="number" min="0.01" step="0.01" required />
    </label>

    <p class="notional">
      Notional <strong>{{ formatCurrency(form.quantity * form.price || 0) }}</strong>
    </p>

    <button type="submit" :disabled="!form.symbol">Submit {{ form.side }} order</button>

    <p v-if="error" class="error">{{ error }}</p>
  </form>
</template>

<style scoped>
.trade-ticket {
  display: grid;
  gap: 12px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 18px;
}

h2 {
  margin: 0;
  font-size: 1rem;
}

label {
  display: grid;
  gap: 6px;
  font-size: 0.8rem;
  color: #8b949e;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

input,
select {
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #e6edf3;
  font: inherit;
  font-size: 0.9rem;
}

.notional {
  margin: 0;
  font-size: 0.85rem;
  color: #8b949e;
}

.notional strong {
  color: #e6edf3;
}

button {
  padding: 11px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #58a6ff, #a371f7);
  color: #0d1117;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin: 0;
  color: #f85149;
  font-size: 0.8rem;
}
</style>
