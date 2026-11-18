# 📈 MacFolio

A portfolio trading and analytics dashboard built with Vue 3 and Vite. Track positions, see live profit and loss, break down allocation, and submit trades that update the book immediately.

<p align="center">
  <img alt="Vue" src="https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white">
  <img alt="Tests" src="https://img.shields.io/badge/tests-27%20passed-3fb950?style=flat-square">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square">
</p>

## Features

- **Portfolio overview** — total value, cost basis, unrealised P&L, and best/worst performers.
- **Holdings table** — sortable by any column, with per-position sparklines.
- **Allocation donut** — value-weighted breakdown rendered as inline SVG.
- **Trade ticket** — buy or sell; average cost is blended on buys and positions close at zero. Selling more than you hold is rejected.
- **Watchlist and activity log** — recent trades, newest first.
- **No chart library** — sparklines and the donut are generated as SVG paths in `src/composables/portfolio.js`.

## Quick start

```bash
git clone https://github.com/antonocik/MacFolio.git
cd MacFolio
npm install
npm run dev
```

Open <http://localhost:5173>.

```bash
npm run build     # production bundle in dist/
npm run preview   # serve the build locally
npm test          # run the unit tests
```

## Screenshots

The dashboard is a single responsive page: summary cards on top, holdings and the trade ticket below, then allocation, watchlist and recent activity.

## Architecture

```
src/
  App.vue                      dashboard layout, state, trade handling
  components/
    AllocationChart.vue        donut chart + legend
    HoldingsTable.vue          sortable positions table
    Sparkline.vue              inline SVG trend line
    TradeTicket.vue            order entry form with validation
  composables/
    portfolio.js               all domain logic (pure, testable)
  data/
    portfolio.js               sample holdings, watchlist, transactions
tests/
  portfolio.test.js            27 unit tests
```

All financial maths lives in `src/composables/portfolio.js` and is free of Vue imports, so it is tested directly without mounting components.

### Core functions

| Function | Purpose |
|---|---|
| `costBasis(h)` | `quantity × avgCost` |
| `marketValue(h)` | `quantity × price` |
| `unrealisedPnl(h)` | market value − cost basis |
| `unrealisedPnlPct(h)` | P&L as a percentage of cost basis |
| `applyTrade(holdings, order)` | returns a new holdings list with the order applied |
| `summarise(holdings)` | portfolio totals plus best and worst performer |
| `allocation(holdings)` | value-weighted weights, largest first |
| `priceSeries(seed, opts)` | deterministic seeded random walk |
| `sparklinePath(series, w, h)` | SVG path for a trend line |
| `donutSlice(...)` | SVG path for one donut segment |

`applyTrade` blends average cost on buys:

```
newAvgCost = (avgCost × quantity + price × bought) / (quantity + bought)
```

and never mutates its input, so it is safe to call from a `computed`.

### Why the seeded price series?

Charts need data, but a demo should not ship a market data dependency or produce a different picture on every render. `priceSeries` is a seeded linear congruential generator, so a given symbol always draws the same line — stable across renders and reproducible in tests.

## Testing

```bash
npm test
```

```
 ✓ tests/portfolio.test.js (27 tests) 21ms

 Test Files  1 passed (1)
      Tests  27 passed (27)
```

Coverage includes position maths, aggregate totals, allocation weights, trade application (blending, closing, rejection paths), input immutability, series determinism, and SVG path construction.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Vue 3 (`<script setup>` SFCs) |
| Build | Vite 6 |
| Tests | Vitest |
| Charts | Hand-rolled SVG — no chart library |
| Styling | Scoped CSS with CSS custom properties |

## Disclaimer

MacFolio is a demo application. Market data is simulated and nothing here is investment advice.

## License

MIT — see [LICENSE](LICENSE).
