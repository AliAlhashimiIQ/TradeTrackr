const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ReportHistory-80142705.html');
const content = fs.readFileSync(filePath, 'utf16le');

const cleanHtml = content.replace(/^\uFEFF/, '').replace(/\u0000/g, '');

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ').trim();
}

function extractTables(html) {
  const tables = []
  for (const tableM of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = []
    for (const rowM of tableM[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = []
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

const tables = extractTables(cleanHtml);
console.log('Number of tables:', tables.length);

function parseNum(s) {
  if (!s) return 0
  return parseFloat(s.replace(/[^\d.,-]/g, '').replace(/,(\d{3})/g, '$1').replace(',', '.')) || 0
}

function parseMT5Date(s) {
  if (!s || s === '-') return new Date().toISOString()
  const d = new Date(s.trim().replace(/\./g, '-').replace(' ', 'T'))
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function allCols(headers, ...pats) {
  return headers.reduce((a, h, i) => {
    if (pats.some(p => h.includes(p))) a.push(i)
    return a
  }, [])
}

function firstCol(headers, ...pats) {
  return allCols(headers, ...pats)[0] ?? -1
}

function isJunk(sym) {
  if (!sym || sym.length < 2) return true
  if (/^(BALANCE|DEPOSIT|WITHDRAWAL|CREDIT|TOTAL|SUBTOTAL|GROSS|EXPECTED|SHARPE|FACTOR)/i.test(sym)) return true
  if (/[:()]/.test(sym) && !/^[A-Z0-9]{2,10}[.\-_A-Z0-9]*$/i.test(sym)) return true
  if (/^\d[\d.()\s%,]+$/.test(sym)) return true
  return false
}

function parsePositions(rows) {
  let hdrIdx = -1
  let headers = []
  for (let i = 0; i < rows.length; i++) {
    const nonEmpty = rows[i].filter(c => c.length > 0)
    if (nonEmpty.length >= 5) { headers = rows[i].map(h => h.toLowerCase()); hdrIdx = i; break }
  }
  if (hdrIdx < 0) return []

  const hasSymbol  = firstCol(headers, 'symbol', 'instrument') >= 0
  const hasProfit  = firstCol(headers, 'profit') >= 0
  const hasPosition = firstCol(headers, 'position') >= 0
  const hasDeal    = headers.some(h => h === 'deal')
  const hasDir     = firstCol(headers, 'direction') >= 0
  if (!hasSymbol || !hasProfit) return []
  if (hasDeal || (hasDir && !hasPosition)) return []

  const timeCols  = allCols(headers, 'time')
  const priceCols = allCols(headers, 'price')

  const idx = {
    sym:    firstCol(headers, 'symbol', 'instrument'),
    type:   firstCol(headers, 'type', 'direction', 'side'),
    vol:    firstCol(headers, 'volume', 'lots', 'size', 'qty'),
    openT:  timeCols[0]  ?? -1,
    closeT: timeCols[1]  ?? -1,
    openP:  priceCols[0] ?? -1,
    closeP: priceCols[1] ?? -1,
    comm:   firstCol(headers, 'commission', 'comm', 'fee'),
    swap:   firstCol(headers, 'swap'),
    profit: allCols(headers, 'profit').slice(-1)[0] ?? -1,
  }

  const results = []
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length === 0) continue

    const firstCell = (r[0] ?? '').trim()
    if (r.length <= 2 && /^(Positions|Orders|Deals|Results|Equity|Summary|Working)/i.test(firstCell)) {
      console.log(`Breaking at row ${i} in parsePositions: section "${firstCell}" detected`);
      break
    }

    const sym = (r[idx.sym] ?? '').toUpperCase().trim()
    if (isJunk(sym)) continue

    const rawType = (r[idx.type] ?? '').toLowerCase()
    const type = rawType.includes('sell') || rawType.includes('short') ? 'Short' : 'Long'
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
      lots, profit_loss: profit, commission: comm, swap,
    })
  }
  return results
}

const trades = parsePositions(tables[0]);
console.log('Parsed trades count:', trades.length);
if (trades.length > 0) {
  console.log('First trade:', trades[0]);
  console.log('Last trade:', trades[trades.length - 1]);
}
