import { describe, expect, it } from 'vitest'
import {
  allocation,
  applyTrade,
  costBasis,
  donutSlice,
  formatCurrency,
  formatPercent,
  marketValue,
  priceSeries,
  round,
  sparklinePath,
  summarise,
  unrealisedPnl,
  unrealisedPnlPct,
} from '../src/composables/portfolio.js'

const HOLDINGS = [
  { symbol: 'AAPL', name: 'Apple', quantity: 10, avgCost: 100, price: 120 },
  { symbol: 'TSLA', name: 'Tesla', quantity: 5, avgCost: 200, price: 180 },
]

describe('position maths', () => {
  it('computes cost basis, market value and pnl', () => {
    const apple = HOLDINGS[0]
    expect(costBasis(apple)).toBe(1000)
    expect(marketValue(apple)).toBe(1200)
    expect(unrealisedPnl(apple)).toBe(200)
    expect(unrealisedPnlPct(apple)).toBe(20)
  })

  it('reports negative pnl for a losing position', () => {
    const tesla = HOLDINGS[1]
    expect(unrealisedPnl(tesla)).toBe(-100)
    expect(unrealisedPnlPct(tesla)).toBe(-10)
  })

  it('returns zero percent when cost basis is zero', () => {
    expect(unrealisedPnlPct({ quantity: 0, avgCost: 0, price: 10 })).toBe(0)
  })
})

describe('summarise', () => {
  it('aggregates totals', () => {
    const result = summarise(HOLDINGS)
    expect(result.totalValue).toBe(2100)
    expect(result.totalCost).toBe(2000)
    expect(result.totalPnl).toBe(100)
    expect(result.totalPnlPct).toBe(5)
    expect(result.positions).toBe(2)
  })

  it('identifies best and worst performers', () => {
    const result = summarise(HOLDINGS)
    expect(result.best.symbol).toBe('AAPL')
    expect(result.worst.symbol).toBe('TSLA')
  })

  it('handles an empty portfolio', () => {
    const result = summarise([])
    expect(result.totalValue).toBe(0)
    expect(result.totalPnlPct).toBe(0)
    expect(result.best).toBeNull()
    expect(result.worst).toBeNull()
  })
})

describe('allocation', () => {
  it('sorts by value and percentages sum to 100', () => {
    const rows = allocation(HOLDINGS)
    expect(rows[0].symbol).toBe('AAPL')
    expect(rows.reduce((sum, r) => sum + r.pct, 0)).toBeCloseTo(100, 1)
  })

  it('returns an empty array when there is nothing to allocate', () => {
    expect(allocation([])).toEqual([])
  })
})

describe('applyTrade', () => {
  it('blends average cost when buying more of an existing position', () => {
    const next = applyTrade(HOLDINGS, { symbol: 'AAPL', quantity: 10, price: 140 })
    const apple = next.find((h) => h.symbol === 'AAPL')
    expect(apple.quantity).toBe(20)
    expect(apple.avgCost).toBe(120)
  })

  it('opens a new position', () => {
    const next = applyTrade(HOLDINGS, { symbol: 'NVDA', quantity: 3, price: 50 })
    expect(next).toHaveLength(3)
    expect(next.find((h) => h.symbol === 'NVDA').avgCost).toBe(50)
  })

  it('reduces quantity when selling', () => {
    const next = applyTrade(HOLDINGS, { symbol: 'AAPL', quantity: -4, price: 130 })
    expect(next.find((h) => h.symbol === 'AAPL').quantity).toBe(6)
  })

  it('removes a position when fully sold', () => {
    const next = applyTrade(HOLDINGS, { symbol: 'TSLA', quantity: -5, price: 190 })
    expect(next.find((h) => h.symbol === 'TSLA')).toBeUndefined()
  })

  it('does not mutate the input list', () => {
    const snapshot = JSON.stringify(HOLDINGS)
    applyTrade(HOLDINGS, { symbol: 'AAPL', quantity: 10, price: 140 })
    expect(JSON.stringify(HOLDINGS)).toBe(snapshot)
  })

  it('rejects selling more than is held', () => {
    expect(() => applyTrade(HOLDINGS, { symbol: 'AAPL', quantity: -99, price: 120 })).toThrow(
      /only 10 held/,
    )
  })

  it('rejects selling a symbol that is not held', () => {
    expect(() => applyTrade(HOLDINGS, { symbol: 'AMD', quantity: -1, price: 100 })).toThrow(
      /no open position/,
    )
  })

  it('rejects a zero quantity', () => {
    expect(() => applyTrade(HOLDINGS, { symbol: 'AAPL', quantity: 0, price: 100 })).toThrow(
      /non-zero/,
    )
  })

  it('rejects a non-positive price', () => {
    expect(() => applyTrade(HOLDINGS, { symbol: 'AAPL', quantity: 1, price: 0 })).toThrow(
      /positive/,
    )
  })

  it('rejects a missing symbol', () => {
    expect(() => applyTrade(HOLDINGS, { quantity: 1, price: 10 })).toThrow(/symbol is required/)
  })
})

describe('priceSeries', () => {
  it('is deterministic for the same seed', () => {
    expect(priceSeries('AAPL')).toEqual(priceSeries('AAPL'))
  })

  it('differs between seeds', () => {
    expect(priceSeries('AAPL')).not.toEqual(priceSeries('MSFT'))
  })

  it('honours the requested length and stays positive', () => {
    const series = priceSeries('NVDA', { points: 12 })
    expect(series).toHaveLength(12)
    expect(series.every((value) => value > 0)).toBe(true)
  })
})

describe('chart helpers', () => {
  it('builds a path starting with a move command', () => {
    const path = sparklinePath([1, 2, 3], 100, 30)
    expect(path.startsWith('M')).toBe(true)
    expect(path.split(' ')).toHaveLength(3)
  })

  it('returns an empty path for too few points', () => {
    expect(sparklinePath([1])).toBe('')
  })

  it('builds a closed donut slice path', () => {
    const path = donutSlice(60, 60, 50, 30, 0, Math.PI / 2)
    expect(path.startsWith('M')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
    expect(path).toContain('A50,50')
  })
})

describe('formatting', () => {
  it('formats currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats signed percentages', () => {
    expect(formatPercent(2.5)).toBe('+2.50%')
    expect(formatPercent(-1.005)).toBe('-1.01%')
  })

  it('rounds to a fixed number of digits', () => {
    expect(round(1.23456, 3)).toBe(1.235)
  })
})
