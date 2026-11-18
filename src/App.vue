<script setup>
import { computed, ref } from 'vue'
import AllocationChart from './components/AllocationChart.vue'
import HoldingsTable from './components/HoldingsTable.vue'
import Sparkline from './components/Sparkline.vue'
import TradeTicket from './components/TradeTicket.vue'
import { HOLDINGS, TRANSACTIONS, WATCHLIST } from './data/portfolio.js'
import { formatCurrency, formatPercent, summarise } from './composables/portfolio.js'

const holdings = ref(HOLDINGS.map((h) => ({ ...h })))
const trades = ref([...TRANSACTIONS])

const stats = computed(() => summarise(holdings.value))
const portfolioSeries = computed(() => {
  const value = stats.value.totalValue
  return Array.from(
    { length: 40 },
    (_, i) => value * (1 - 0.06) * (1 + (i / 39) * 0.06 + Math.sin(i / 3) * 0.004),
  )
})
const dayChange = computed(() => {
  const series = portfolioSeries.value
  const previous = series[series.length - 2]
  return ((series[series.length - 1] - previous) / previous) * 100
})

function onTrade(next, record) {
  holdings.value = next
  trades.value = [record, ...trades.value].slice(0, 12)
}
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="logo">▚</span>
        <div>
          <h1>MacFolio</h1>
          <p>Portfolio trading &amp; analytics</p>
        </div>
      </div>
      <div class="market">
        <span class="dot" />
        Market open · <strong>{{ new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</strong>
      </div>
    </header>

    <section class="cards">
      <article class="card primary">
        <span class="label">Total value</span>
        <strong class="value">{{ formatCurrency(stats.totalValue) }}</strong>
        <span class="delta" :class="stats.totalPnl >= 0 ? 'up' : 'down'">
          {{ formatCurrency(stats.totalPnl) }} ({{ formatPercent(stats.totalPnlPct) }})
        </span>
        <Sparkline seed="portfolio" :points="40" :width="260" :height="48" :positive="stats.totalPnl >= 0" />
      </article>

      <article class="card">
        <span class="label">Day change</span>
        <strong class="value" :class="dayChange >= 0 ? 'up' : 'down'">{{ formatPercent(dayChange) }}</strong>
        <span class="muted">{{ formatCurrency(stats.totalValue * (dayChange / 100)) }}</span>
      </article>

      <article class="card">
        <span class="label">Cost basis</span>
        <strong class="value">{{ formatCurrency(stats.totalCost) }}</strong>
        <span class="muted">{{ stats.positions }} open positions</span>
      </article>

      <article class="card">
        <span class="label">Best performer</span>
        <strong class="value up">{{ stats.best?.symbol ?? '—' }}</strong>
        <span class="muted">{{ stats.best ? formatPercent((stats.best.price / stats.best.avgCost - 1) * 100) : '—' }}</span>
      </article>

      <article class="card">
        <span class="label">Worst performer</span>
        <strong class="value down">{{ stats.worst?.symbol ?? '—' }}</strong>
        <span class="muted">{{ stats.worst ? formatPercent((stats.worst.price / stats.worst.avgCost - 1) * 100) : '—' }}</span>
      </article>
    </section>

    <div class="grid">
      <section class="panel wide">
        <h2>Holdings</h2>
        <HoldingsTable :holdings="holdings" />
      </section>

      <aside class="side">
        <TradeTicket :holdings="holdings" :watchlist="WATCHLIST" @trade="onTrade" />

        <section class="panel">
          <h2>Allocation</h2>
          <AllocationChart :holdings="holdings" />
        </section>
      </aside>

      <section class="panel">
        <h2>Watchlist</h2>
        <ul class="watchlist">
          <li v-for="item in WATCHLIST" :key="item.symbol">
            <div>
              <span class="symbol">{{ item.symbol }}</span>
              <span class="name">{{ item.name }}</span>
            </div>
            <div class="right">
              <span>{{ formatCurrency(item.price) }}</span>
              <span :class="item.change >= 0 ? 'up' : 'down'">{{ formatPercent(item.change) }}</span>
            </div>
          </li>
        </ul>
      </section>

      <section class="panel wide">
        <h2>Recent activity</h2>
        <table class="activity">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Side</th>
              <th class="numeric">Quantity</th>
              <th class="numeric">Price</th>
              <th class="numeric">Notional</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(trade, index) in trades" :key="index">
              <td>{{ trade.date }}</td>
              <td class="symbol">{{ trade.symbol }}</td>
              <td>
                <span class="pill" :class="trade.side">{{ trade.side }}</span>
              </td>
              <td class="numeric">{{ trade.quantity }}</td>
              <td class="numeric">{{ formatCurrency(trade.price) }}</td>
              <td class="numeric">{{ formatCurrency(trade.quantity * trade.price) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <footer>
      <p>MacFolio is a demo application. Market data is simulated and not investment advice.</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 20px 64px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 26px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo {
  font-size: 2rem;
  background: linear-gradient(135deg, #58a6ff, #a371f7);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.brand h1 {
  margin: 0;
  font-size: 1.35rem;
}

.brand p {
  margin: 0;
  color: #8b949e;
  font-size: 0.8rem;
}

.market {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: #8b949e;
}

.market .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3fb950;
  box-shadow: 0 0 8px #3fb950;
}

.cards {
  display: grid;
  grid-template-columns: 1.6fr repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 22px;
}

.card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 16px;
  display: grid;
  gap: 6px;
  align-content: start;
}

.card .label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8b949e;
}

.card .value {
  font-size: 1.5rem;
  color: #e6edf3;
  font-variant-numeric: tabular-nums;
}

.card.primary .value {
  font-size: 2rem;
}

.card .delta,
.card .muted {
  font-size: 0.82rem;
  color: #8b949e;
}

.grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 18px;
}

.panel {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 18px;
}

.panel.wide {
  grid-column: 1 / -1;
}

.panel h2 {
  margin: 0 0 14px;
  font-size: 0.95rem;
  color: #e6edf3;
}

.side {
  display: grid;
  gap: 18px;
  align-content: start;
}

.watchlist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.watchlist li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #21262d;
}

.watchlist li:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.watchlist .symbol {
  display: block;
  font-weight: 700;
  color: #e6edf3;
}

.watchlist .name {
  display: block;
  font-size: 0.75rem;
  color: #8b949e;
}

.watchlist .right {
  text-align: right;
  display: grid;
  gap: 2px;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.activity {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.activity th {
  text-align: left;
  color: #8b949e;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px 10px;
  border-bottom: 1px solid #30363d;
}

.activity th.numeric,
.activity td.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.activity td {
  padding: 10px;
  border-bottom: 1px solid #21262d;
}

.pill {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.pill.buy {
  background: rgba(63, 185, 80, 0.15);
  color: #3fb950;
}

.pill.sell {
  background: rgba(248, 81, 73, 0.15);
  color: #f85149;
}

.up {
  color: #3fb950;
}

.down {
  color: #f85149;
}

footer {
  margin-top: 30px;
  color: #6e7681;
  font-size: 0.78rem;
  text-align: center;
}

@media (max-width: 900px) {
  .cards {
    grid-template-columns: 1fr 1fr;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
