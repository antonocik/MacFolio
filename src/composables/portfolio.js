/**
 * Portfolio domain logic.
 *
 * Kept free of Vue component concerns so it can be unit tested directly and
 * reused by any UI layer.
 */

/**
 * Round half away from zero at a fixed number of digits.
 *
 * Shifting through exponential notation avoids the binary representation
 * error that makes `1.005 * 100` equal `100.49999999999999`, and the explicit
 * sign keeps `-1.005` rounding to `-1.01` rather than `Math.round`'s `-1.00`.
 */
export const round = (value, digits = 2) => {
  if (!Number.isFinite(value)) return value
  const shifted = Number(`${value}e${digits}`)
  const rounded = Math.sign(shifted) * Math.round(Math.abs(shifted))
  return Number(`${rounded}e-${digits}`)
}

/** Cost basis of a single position. */
export const costBasis = (holding) => holding.quantity * holding.avgCost

/** Current market value of a single position. */
export const marketValue = (holding) => holding.quantity * holding.price

/** Unrealised profit or loss of a single position. */
export const unrealisedPnl = (holding) => marketValue(holding) - costBasis(holding)

/** Unrealised return of a single position, as a percentage. */
export const unrealisedPnlPct = (holding) => {
  const basis = costBasis(holding)
  if (basis === 0) return 0
  return (unrealisedPnl(holding) / basis) * 100
}

/**
 * Apply a trade to a position list, returning a new list.
 *
 * Buying adds to the position and blends the average cost. Selling reduces
 * quantity and realises nothing here; the position is dropped at zero.
 */
export function applyTrade(holdings, { symbol, quantity, price }) {
  if (!symbol) throw new Error('symbol is required')
  if (!Number.isFinite(quantity) || quantity === 0) {
    throw new Error('quantity must be a non-zero number')
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('price must be a positive number')
  }

  const next = holdings.map((h) => ({ ...h }))
  const existing = next.find((h) => h.symbol === symbol)

  if (!existing) {
    if (quantity < 0) throw new Error(`cannot sell ${symbol}: no open position`)
    next.push({
      symbol,
      name: symbol,
      quantity,
      avgCost: price,
      price,
    })
    return next
  }

  if (quantity < 0 && Math.abs(quantity) > existing.quantity) {
    throw new Error(`cannot sell ${Math.abs(quantity)} of ${symbol}: only ${existing.quantity} held`)
  }

  if (quantity > 0) {
    const totalCost = existing.avgCost * existing.quantity + price * quantity
    const totalQuantity = existing.quantity + quantity
    existing.avgCost = round(totalCost / totalQuantity, 4)
    existing.quantity = round(totalQuantity, 4)
  } else {
    existing.quantity = round(existing.quantity + quantity, 4)
  }

  return next.filter((h) => h.quantity > 0)
}

/** Aggregate totals across all positions. */
export function summarise(holdings) {
  const totalValue = holdings.reduce((sum, h) => sum + marketValue(h), 0)
  const totalCost = holdings.reduce((sum, h) => sum + costBasis(h), 0)
  const totalPnl = totalValue - totalCost

  return {
    totalValue: round(totalValue),
    totalCost: round(totalCost),
    totalPnl: round(totalPnl),
    totalPnlPct: totalCost === 0 ? 0 : round((totalPnl / totalCost) * 100),
    positions: holdings.length,
    best: holdings.length ? holdings.reduce((a, b) => (unrealisedPnlPct(a) >= unrealisedPnlPct(b) ? a : b)) : null,
    worst: holdings.length ? holdings.reduce((a, b) => (unrealisedPnlPct(a) <= unrealisedPnlPct(b) ? a : b)) : null,
  }
}

/** Value-weighted allocation, sorted from largest to smallest. */
export function allocation(holdings) {
  const total = holdings.reduce((sum, h) => sum + marketValue(h), 0)
  if (total === 0) return []

  return holdings
    .map((h) => ({
      symbol: h.symbol,
      value: round(marketValue(h)),
      pct: round((marketValue(h) / total) * 100, 2),
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Deterministic pseudo-random walk.
 *
 * Seeded so charts are stable between renders and reproducible in tests.
 */
export function priceSeries(seed, { points = 30, start = 100, volatility = 0.02 } = {}) {
  let state = 0
  for (let i = 0; i < String(seed).length; i += 1) {
    state = (state * 31 + String(seed).charCodeAt(i)) >>> 0
  }

  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0xffffffff
  }

  const series = [start]
  for (let i = 1; i < points; i += 1) {
    const drift = (next() - 0.48) * volatility
    series.push(round(series[i - 1] * (1 + drift), 2))
  }
  return series
}

/** Build an SVG path string from a numeric series. */
export function sparklinePath(series, width = 100, height = 30) {
  if (series.length < 2) return ''
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1

  return series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * width
      const y = height - ((value - min) / span) * height
      return `${index === 0 ? 'M' : 'L'}${round(x, 2)},${round(y, 2)}`
    })
    .join(' ')
}

/** Convex-safe donut slice path for an allocation chart. */
export function donutSlice(cx, cy, radius, innerRadius, startAngle, endAngle) {
  const polar = (angle) => [
    round(cx + radius * Math.cos(angle), 3),
    round(cy + radius * Math.sin(angle), 3),
  ]
  const polarInner = (angle) => [
    round(cx + innerRadius * Math.cos(angle), 3),
    round(cy + innerRadius * Math.sin(angle), 3),
  ]

  const [x1, y1] = polar(startAngle)
  const [x2, y2] = polar(endAngle)
  const [x3, y3] = polarInner(endAngle)
  const [x4, y4] = polarInner(startAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

  return [
    `M${x1},${y1}`,
    `A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2}`,
    `L${x3},${y3}`,
    `A${innerRadius},${innerRadius} 0 ${largeArc} 0 ${x4},${y4}`,
    'Z',
  ].join(' ')
}

/** Format a number as currency. */
export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Format a signed percentage, always showing the sign. */
export function formatPercent(value) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${round(value, 2).toFixed(2)}%`
}
