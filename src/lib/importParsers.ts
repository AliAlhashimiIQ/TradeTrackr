/**
 * Phase 5: Import Parsers
 * Uses regex-based HTML parsing (not DOMParser) to handle MT5's UTF-16 HTML correctly.
 */

export interface ParsedTrade {
  symbol: string; type: 'Long' | 'Short'
  entry_time: string; exit_time: string
  entry_price: number; exit_price: number
  quantity: number; lots: number
  profit_loss: number; commission?: number; swap?: number; notes?: string
  _key: string
}

export interface ParseResult {
  trades: ParsedTrade[]; errors: string[]; source: 'mt5' | 'csv'
}

import { getSymbolMultiplier } from './forexUtils'

// ── Regex HTML table extractor ────────────────────────────────────────────────
// Bypasses DOMParser entirely — works even when textContent returns empty.

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ').trim()
}

/** Returns array-of-tables, each being array-of-rows, each being array-of-cell-texts */
function extractTables(html: string): string[][][] {
  const tables: string[][][] = []
  // Use non-greedy match on each table block
  for (const tableM of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows: string[][] = []
    for (const rowM of tableM[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells: string[] = []
      for (const cellM of rowM[0].matchAll(/<t[dh]\b([^>]*?)>([\s\S]*?)<\/t[dh]>/gi)) {
        const tagAttrs = cellM[1]
        const content = cellM[2]
        if (/\bclass=["']?hidden\b/i.test(tagAttrs)) {
          continue // skip hidden columns/cells to keep layout aligned
        }
        cells.push(stripTags(content))
      }
      if (cells.length > 0) rows.push(cells)
    }
    if (rows.length > 0) tables.push(rows)
  }
  return tables
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNum(s: string): number {
  if (!s) return 0
  return parseFloat(s.replace(/[^\d.,-]/g, '').replace(/,(\d{3})/g, '$1').replace(',', '.')) || 0
}

function parseMT5Date(s: string): string {
  if (!s || s === '-') return new Date().toISOString()
  const d = new Date(s.trim().replace(/\./g, '-').replace(' ', 'T'))
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function makeKey(symbol: string, t: string, lots: number) {
  return `${symbol}|${t}|${lots}`
}

/** All indices where header matches any of the patterns */
function allCols(headers: string[], ...pats: string[]): number[] {
  return headers.reduce<number[]>((a, h, i) => {
    if (pats.some(p => h.includes(p))) a.push(i)
    return a
  }, [])
}

function firstCol(headers: string[], ...pats: string[]): number {
  return allCols(headers, ...pats)[0] ?? -1
}

function isJunk(sym: string): boolean {
  if (!sym || sym.length < 2) return true
  if (/^(BALANCE|DEPOSIT|WITHDRAWAL|CREDIT|TOTAL|SUBTOTAL|GROSS|EXPECTED|SHARPE|FACTOR)/i.test(sym)) return true
  if (/[:()]/.test(sym) && !/^[A-Z0-9]{2,10}[.\-_A-Z0-9]*$/i.test(sym)) return true
  if (/^\d[\d.()\s%,]+$/.test(sym)) return true
  return false
}

// ── Positions table parser ────────────────────────────────────────────────────
// MT5 header: Time|Position|Symbol|Type|Volume|Price|S/L|T/P|Time|Price|Commission|Swap|Profit
// "Time" and "Price" appear TWICE → use first/second occurrence

function parsePositions(rows: string[][]): ParsedTrade[] {
  // Find header row (first row with ≥5 non-empty cells)
  let hdrIdx = -1
  let headers: string[] = []
  for (let i = 0; i < rows.length; i++) {
    const nonEmpty = rows[i].filter(c => c.length > 0)
    if (nonEmpty.length >= 5) { headers = rows[i].map(h => h.toLowerCase()); hdrIdx = i; break }
  }
  if (hdrIdx < 0) return []

  // Must be a positions table (not deals)
  const hasSymbol  = firstCol(headers, 'symbol', 'instrument') >= 0
  const hasProfit  = firstCol(headers, 'profit') >= 0
  const hasPosition = firstCol(headers, 'position') >= 0
  const hasDeal    = headers.some(h => h === 'deal')
  const hasDir     = firstCol(headers, 'direction') >= 0
  if (!hasSymbol || !hasProfit) return []
  if (hasDeal || (hasDir && !hasPosition)) return []  // it's a deals table

  const timeCols  = allCols(headers, 'time')
  const priceCols = allCols(headers, 'price')

  const idx = {
    sym:    firstCol(headers, 'symbol', 'instrument'),
    type:   firstCol(headers, 'type', 'direction', 'side'),
    vol:    firstCol(headers, 'volume', 'lots', 'size', 'qty'),
    openT:  timeCols[0]  ?? -1,   // first "time"  = open
    closeT: timeCols[1]  ?? -1,   // second "time" = close
    openP:  priceCols[0] ?? -1,   // first "price" = open
    closeP: priceCols[1] ?? -1,   // second "price" = close
    comm:   firstCol(headers, 'commission', 'comm', 'fee'),
    swap:   firstCol(headers, 'swap'),
    profit: allCols(headers, 'profit').slice(-1)[0] ?? -1,  // last "profit" col
  }

  const results: ParsedTrade[] = []
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length === 0) continue

    const firstCell = (r[0] ?? '').trim()
    if (r.length <= 2 && /^(Positions|Orders|Deals|Results|Equity|Summary|Working|Trades)/i.test(firstCell)) {
      break
    }

    const sym = (r[idx.sym] ?? '').toUpperCase().trim()
    if (isJunk(sym)) continue

    const rawType = (r[idx.type] ?? '').toLowerCase()
    const type: 'Long' | 'Short' = rawType.includes('sell') || rawType.includes('short') ? 'Short' : 'Long'
    const lots   = idx.vol    >= 0 ? parseNum(r[idx.vol])   : 0.01
    const entryT = idx.openT  >= 0 ? parseMT5Date(r[idx.openT])  : new Date().toISOString()
    const exitT  = idx.closeT >= 0 ? parseMT5Date(r[idx.closeT]) : entryT
    const entryP = idx.openP  >= 0 ? parseNum(r[idx.openP])  : 0
    const exitP  = idx.closeP >= 0 ? parseNum(r[idx.closeP]) : 0
    const profit = idx.profit >= 0 ? parseNum(r[idx.profit]) : 0
    const comm   = idx.comm   >= 0 ? parseNum(r[idx.comm])   : 0
    const swap   = idx.swap   >= 0 ? parseNum(r[idx.swap])   : 0

    results.push({
      symbol: sym, type,
      entry_time: entryT, exit_time: exitT,
      entry_price: entryP, exit_price: exitP,
      quantity: lots * getSymbolMultiplier(sym), lots,
      profit_loss: profit, commission: comm, swap,
      _key: makeKey(sym, entryT, lots),
    })
  }
  return results
}

// ── Deals table parser (pairs IN/OUT by position ID) ─────────────────────────

function parseDeals(rows: string[][]): ParsedTrade[] {
  let hdrIdx = -1
  let headers: string[] = []
  for (let i = 0; i < rows.length; i++) {
    const nonEmpty = rows[i].filter(c => c.length > 0)
    if (nonEmpty.length >= 5) { headers = rows[i].map(h => h.toLowerCase()); hdrIdx = i; break }
  }
  if (hdrIdx < 0) return []

  const hasDir = firstCol(headers, 'direction', 'entry') >= 0
  const hasDeal = headers.some(h => h === 'deal')
  if (!hasDir && !hasDeal) return []

  const idx = {
    sym:    firstCol(headers, 'symbol', 'instrument'),
    dir:    firstCol(headers, 'direction', 'entry'),
    pos:    firstCol(headers, 'position'),
    deal:   headers.findIndex(h => h === 'deal' || h === '#'),
    time:   firstCol(headers, 'time', 'date'),
    vol:    firstCol(headers, 'volume', 'lots', 'size'),
    price:  firstCol(headers, 'price'),
    profit: allCols(headers, 'profit').slice(-1)[0] ?? -1,
    comm:   firstCol(headers, 'commission', 'comm'),
    swap:   firstCol(headers, 'swap'),
  }
  if (idx.sym < 0) return []

  type D = {
    sym: string; lots: number; entryT: string; exitT: string
    entryP: number; exitP: number; type: 'Long' | 'Short'
    profit: number; comm: number; swap: number; seq: number
    in: boolean; out: boolean
  }
  const deals: Record<string, D> = {}
  let seq = 0

  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length === 0) continue

    const firstCell = (r[0] ?? '').trim()
    if (r.length <= 2 && /^(Positions|Orders|Deals|Results|Equity|Summary|Working|Trades)/i.test(firstCell)) {
      break
    }

    const sym = (r[idx.sym] ?? '').toUpperCase().trim()
    if (isJunk(sym)) continue

    const key = idx.pos >= 0 ? r[idx.pos] : idx.deal >= 0 ? r[idx.deal] : String(seq)
    if (!key) continue

    const rawDir = (r[idx.dir] ?? '').toLowerCase()
    const isIn  = rawDir === 'in'  || rawDir.startsWith('buy')
    const isOut = rawDir === 'out' || rawDir.startsWith('sell')

    if (!deals[key]) deals[key] = { sym, lots: 0, entryT: '', exitT: '', entryP: 0, exitP: 0, type: 'Long', profit: 0, comm: 0, swap: 0, seq: seq++, in: false, out: false }
    const d = deals[key]
    if (sym) d.sym = sym

    const price  = parseNum(r[idx.price]  ?? '')
    const time   = parseMT5Date(r[idx.time] ?? '')
    const lots   = parseNum(r[idx.vol]   ?? '')
    const profit = parseNum(r[idx.profit] ?? '')
    const comm   = parseNum(r[idx.comm]  ?? '')
    const swap   = parseNum(r[idx.swap]  ?? '')

    if (isIn && !d.in) {
      d.entryP = price; d.entryT = time; d.lots = lots || d.lots
      d.type = rawDir.includes('sell') ? 'Short' : 'Long'; d.comm += comm; d.in = true
    } else if (isOut && !d.out) {
      d.exitP = price; d.exitT = time; d.profit += profit; d.comm += comm; d.swap += swap; d.out = true
    } else {
      d.profit += profit
    }
  }

  return Object.values(deals)
    .filter(d => d.sym && (d.in || d.profit !== 0))
    .sort((a, b) => a.seq - b.seq)
    .map(d => ({
      symbol: d.sym, type: d.type,
      entry_time: d.entryT || new Date().toISOString(),
      exit_time:  d.exitT  || d.entryT || new Date().toISOString(),
      entry_price: d.entryP, exit_price: d.exitP,
      quantity: d.lots * getSymbolMultiplier(d.sym || ''), lots: d.lots,
      profit_loss: d.profit, commission: d.comm, swap: d.swap,
      _key: makeKey(d.sym, d.entryT, d.lots),
    }))
}

// ── Main MT5 Parser ───────────────────────────────────────────────────────────

export function parseMT5Html(html: string): ParseResult {
  const errors: string[] = []
  try {
    const cleanHtml = html.replace(/^\uFEFF/, '').replace(/\u0000/g, '')
    const tables = extractTables(cleanHtml)

    if (tables.length === 0) {
      errors.push('No tables found. Export via: Account History → Right-click → Save as Detailed Report')
      return { trades: [], errors, source: 'mt5' }
    }

    // Try positions table first (closed trade summaries)
    for (const table of tables) {
      const trades = parsePositions(table)
      if (trades.length > 0) return { trades, errors, source: 'mt5' }
    }

    // Fallback: reconstruct from deals
    for (const table of tables) {
      const trades = parseDeals(table)
      if (trades.length > 0) return { trades, errors, source: 'mt5' }
    }

    // Diagnostic
    const summary = tables.map((t, i) => {
      const hdr = t.find(r => r.filter(c => c).length >= 4)
      return hdr ? `Table ${i + 1}: [${hdr.slice(0, 13).join(' | ')}]` : null
    }).filter(Boolean).join('\n')

    errors.push(`No trades found. Headers:\n${summary || '(none)'}`)
  } catch (e: unknown) {
    errors.push(`Parse error: ${e instanceof Error ? e.message : String(e)}`)
  }
  return { trades: [], errors, source: 'mt5' }
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

export interface CsvColumnMapping {
  symbol: string; type: string; entry_time: string; exit_time: string
  entry_price: string; exit_price: string; lots: string; profit_loss: string
}

export const DEFAULT_CSV_MAPPING: CsvColumnMapping = {
  symbol: 'symbol', type: 'type', entry_time: 'entry_time', exit_time: 'exit_time',
  entry_price: 'entry_price', exit_price: 'exit_price', lots: 'lots', profit_loss: 'profit_loss',
}

export const PRESET_MAPPINGS: Record<string, CsvColumnMapping> = {
  generic: DEFAULT_CSV_MAPPING,
  ctrader: { symbol: 'Symbol', type: 'Trade Side', entry_time: 'Open Time', exit_time: 'Close Time', entry_price: 'Open Price', exit_price: 'Close Price', lots: 'Volume (lots)', profit_loss: 'Net Profit' },
  thinkorswim: { symbol: 'Symbol', type: 'Side', entry_time: 'Time Opened', exit_time: 'Time Closed', entry_price: 'Avg Entry Price', exit_price: 'Avg Exit Price', lots: 'Qty', profit_loss: 'P/L Open' },
}

export function parseCsv(csvText: string, mapping: CsvColumnMapping = DEFAULT_CSV_MAPPING): ParseResult {
  const errors: string[] = []
  const trades: ParsedTrade[] = []
  try {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) { errors.push('CSV has no data rows.'); return { trades, errors, source: 'csv' } }
    const delim = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(delim).map(h => h.trim().replace(/["']/g, ''))
    const colIdx = {} as Record<keyof CsvColumnMapping, number>
    for (const [field, colName] of Object.entries(mapping) as [keyof CsvColumnMapping, string][]) {
      const i = headers.findIndex(h => h.toLowerCase() === colName.toLowerCase())
      if (i < 0) errors.push(`Column "${colName}" not found. Available: ${headers.join(', ')}`)
      colIdx[field] = i
    }
    if (errors.length > 0) return { trades, errors, source: 'csv' }
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(delim).map(c => c.trim().replace(/["']/g, ''))
      if (cells.length < 3) continue
      const get = (f: keyof CsvColumnMapping) => colIdx[f] >= 0 ? cells[colIdx[f]] ?? '' : ''
      const symbol = get('symbol').toUpperCase()
      if (!symbol) continue
      const lots = parseNum(get('lots'))
      const entryTime = normDate(get('entry_time'))
      const exitTime  = normDate(get('exit_time')) || entryTime
      const rawType = get('type').toLowerCase()
      trades.push({
        symbol, type: rawType.includes('sell') || rawType.includes('short') ? 'Short' : 'Long',
        entry_time: entryTime, exit_time: exitTime,
        entry_price: parseNum(get('entry_price')), exit_price: parseNum(get('exit_price')),
        lots, quantity: lots * getSymbolMultiplier(symbol), profit_loss: parseNum(get('profit_loss')),
        _key: makeKey(symbol, entryTime, lots),
      })
    }
  } catch (e: unknown) { errors.push(`CSV error: ${e instanceof Error ? e.message : String(e)}`) }
  return { trades, errors, source: 'csv' }
}

function normDate(s: string): string {
  if (!s) return new Date().toISOString()
  const d = new Date(s.replace(/\./g, '-').replace(' ', 'T'))
  if (!isNaN(d.getTime())) return d.toISOString()
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(.*)/)
  if (m) { const d2 = new Date(`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}T${m[4]||'00:00:00'}`); if (!isNaN(d2.getTime())) return d2.toISOString() }
  return new Date().toISOString()
}
