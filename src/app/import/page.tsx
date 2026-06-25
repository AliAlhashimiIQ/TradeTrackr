'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import { parseMT5Html, parseCsv, ParsedTrade, PRESET_MAPPINGS, CsvColumnMapping } from '@/lib/importParsers'
import { bulkInsertTrades, getImportHistory, deleteImportRecord, ImportRecord } from '@/lib/tradingApi'
import { useAccount } from '@/hooks/useAccount'

type ImportStep = 'upload' | 'preview' | 'done'
type FileFormat = 'mt5' | 'csv'

const COLUMN_PRESETS = [
  { id: 'generic', label: 'Generic CSV' },
  { id: 'ctrader', label: 'cTrader' },
  { id: 'thinkorswim', label: 'ThinkorSwim' },
]

const CSV_FIELDS: (keyof CsvColumnMapping)[] = [
  'symbol', 'type', 'entry_time', 'exit_time',
  'entry_price', 'exit_price', 'lots', 'profit_loss',
]

const FIELD_LABELS: Record<keyof CsvColumnMapping, string> = {
  symbol: 'Symbol', type: 'Trade Type (Buy/Sell)',
  entry_time: 'Entry Time', exit_time: 'Exit Time',
  entry_price: 'Entry Price', exit_price: 'Exit Price',
  lots: 'Lots / Volume', profit_loss: 'Profit / Loss',
}

export default function ImportPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const { accounts, selectedAccountIds } = useAccount()
  const [targetAccountId, setTargetAccountId] = useState<string>('all')

  useEffect(() => {
    if (selectedAccountIds !== 'all' && (selectedAccountIds as string[]).length === 1) {
      setTargetAccountId((selectedAccountIds as string[])[0])
    } else if (accounts.length > 0) {
      setTargetAccountId(accounts[0].id)
    } else {
      setTargetAccountId('all')
    }
  }, [selectedAccountIds, accounts])

  const [step, setStep] = useState<ImportStep>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileFormat, setFileFormat] = useState<FileFormat>('mt5')
  const [csvPreset, setCsvPreset] = useState('generic')
  const [csvMapping, setCsvMapping] = useState<CsvColumnMapping>({ ...PRESET_MAPPINGS.generic })
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [parsed, setParsed] = useState<ParsedTrade[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [history, setHistory] = useState<ImportRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  // Broker server timezone offset — most MT5 brokers run UTC+2 or UTC+3
  const [brokerOffsetHours, setBrokerOffsetHours] = useState<number>(3)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    getImportHistory(user.id).then((h) => {
      setHistory(h)
      setHistoryLoading(false)
    })
  }, [user, step]) // refresh when step changes (after import done)

  /**
   * Reads a file as text, auto-detecting UTF-16 LE/BE (used by MT5 HTML exports).
   * Falls back to UTF-8 for normal CSV/HTML files.
   */
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const buf = e.target?.result as ArrayBuffer
        const bytes = new Uint8Array(buf)

        // Check for BOM
        let encoding = 'utf-8'
        if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
          encoding = 'utf-16le'  // MT5 default: UTF-16 Little Endian
        } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
          encoding = 'utf-16be'
        }

        const decoder = new TextDecoder(encoding)
        resolve(decoder.decode(buf))
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setParseErrors([])
    setParsed([])
    setSelectedKeys(new Set())

    const isHtml = file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')

    const detectedFormat: FileFormat = isHtml ? 'mt5' : 'csv'
    setFileFormat(detectedFormat)

    // Use BOM-aware reader instead of file.text() (which always decodes as UTF-8)
    const text = await readFileAsText(file)

    const result = detectedFormat === 'mt5'
      ? parseMT5Html(text, brokerOffsetHours)
      : parseCsv(text, csvMapping)

    // Filter out zero P&L trades (open positions, balance lines, etc.)
    const validTrades = result.trades.filter(t => t.profit_loss !== 0)
    const zeroPnLCount = result.trades.length - validTrades.length

    const warnings = [...result.errors]
    if (zeroPnLCount > 0) {
      warnings.push(`Skipped ${zeroPnLCount} rows with $0.00 P&L (open positions or summary lines).`)
    }

    setParseErrors(warnings)
    setParsed(validTrades)
    setSelectedKeys(new Set(validTrades.map((t) => t._key)))
    if (validTrades.length > 0 || warnings.length > 0) {
      setStep('preview')
    }
  }, [csvMapping])


  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleCsvPresetChange = (preset: string) => {
    setCsvPreset(preset)
    setCsvMapping({ ...PRESET_MAPPINGS[preset] })
  }

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedKeys.size === parsed.length) setSelectedKeys(new Set())
    else setSelectedKeys(new Set(parsed.map((t) => t._key)))
  }

  const handleImport = async () => {
    if (!user) return
    setImporting(true)
    const toImport = parsed.filter((t) => selectedKeys.has(t._key))
    const res = await bulkInsertTrades(
      user.id,
      toImport,
      fileFormat,
      fileName,
      targetAccountId === 'all' ? null : targetAccountId
    )
    setResult({ imported: res.imported, skipped: res.skipped, errors: res.errors })
    setImporting(false)
    setStep('done')
  }

  const reset = () => {
    setStep('upload')
    setFileName('')
    setParsed([])
    setParseErrors([])
    setSelectedKeys(new Set())
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDeleteHistory = async (id: string) => {
    await deleteImportRecord(id)
    setHistory((h) => h.filter((r) => r.id !== id))
  }

  if (loading) return null

  const selectedCount = selectedKeys.size
  const profitTrades = parsed.filter((t) => t.profit_loss > 0).length
  const lossTrades = parsed.filter((t) => t.profit_loss < 0).length
  const totalPnL = parsed.filter((t) => selectedKeys.has(t._key)).reduce((s, t) => s + t.profit_loss, 0)

  return (
    <AuthenticatedLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Import Trades</h1>
          <p className="text-gray-400 text-sm">
            Import from MT5 HTML statements or any CSV file. Duplicates are detected and skipped automatically.
          </p>
        </div>

        {/* Step: Upload */}
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              {/* Format Tabs */}
              <div className="flex items-center gap-2">
                {(['mt5', 'csv'] as FileFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFileFormat(fmt)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      fileFormat === fmt
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.07] border border-white/[0.07]'
                    }`}
                  >
                    {fmt === 'mt5' ? 'MT5 HTML Statement' : 'CSV File'}
                  </button>
                ))}
              </div>

              {/* CSV Column Mapping */}
              <AnimatePresence>
                {fileFormat === 'csv' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="card p-6 space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Column Mapping</h3>
                      <div className="flex gap-2">
                        {COLUMN_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleCsvPresetChange(p.id)}
                            className={`px-3 py-1 text-xs rounded-lg transition-all ${
                              csvPreset === p.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.07]'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {CSV_FIELDS.map((field) => (
                        <div key={field}>
                          <label className="block text-xs text-gray-500 mb-1">{FIELD_LABELS[field]}</label>
                          <input
                            className="input text-xs py-1.5"
                            value={csvMapping[field]}
                            onChange={(e) =>
                              setCsvMapping((prev) => ({ ...prev, [field]: e.target.value }))
                            }
                            placeholder={`CSV column name`}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed
                  cursor-pointer transition-all duration-300 py-20 px-8 text-center
                  ${dragging
                    ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-indigo-500/50 hover:bg-white/[0.04]'
                  }
                `}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${dragging ? 'bg-indigo-500/20' : 'bg-white/[0.05]'}`}>
                  <svg className={`w-8 h-8 transition-colors ${dragging ? 'text-indigo-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold">
                    {dragging ? 'Drop to parse…' : 'Drop your file here or click to browse'}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {fileFormat === 'mt5'
                      ? 'Accepts MT5 .html or .htm statement files'
                      : 'Accepts .csv files with your configured column names'}
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={fileFormat === 'mt5' ? '.html,.htm' : '.csv'}
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* MT5 Export Instructions */}
              {fileFormat === 'mt5' && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    How to export from MT5
                  </h3>
                  <ol className="space-y-1.5 text-sm text-gray-400">
                    <li className="flex gap-2"><span className="text-indigo-400 font-bold">1.</span> Open MetaTrader 5 → Account History tab</li>
                    <li className="flex gap-2"><span className="text-indigo-400 font-bold">2.</span> Right-click anywhere in the history panel</li>
                    <li className="flex gap-2"><span className="text-indigo-400 font-bold">3.</span> Select <span className="text-white font-medium">"Save as Detailed Report"</span></li>
                    <li className="flex gap-2"><span className="text-indigo-400 font-bold">4.</span> Save as HTML and drag it here</li>
                  </ol>
                </div>
              )}

              {/* Broker Timezone Selector — MT5 only */}
              {fileFormat === 'mt5' && (
                <div className="card p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white mb-0.5">Broker Server Timezone</h3>
                      <p className="text-xs text-gray-500 mb-3">
                        MT5 exports use your broker&apos;s server time. Select the correct offset so trade times are stored accurately.
                        Most brokers use <span className="text-amber-400 font-medium">GMT+2</span> or <span className="text-amber-400 font-medium">GMT+3</span>.
                      </p>
                      <select
                        value={brokerOffsetHours}
                        onChange={(e) => setBrokerOffsetHours(Number(e.target.value))}
                        className="input text-sm py-1.5 w-full sm:w-64 bg-[#0a0b0f] border-white/[0.06] focus:border-amber-500/50 [color-scheme:dark]"
                      >
                        <option value={-5}>GMT-5 (US Eastern, NYSE)</option>
                        <option value={-4}>GMT-4 (US Eastern DST)</option>
                        <option value={0}>GMT+0 (UTC)</option>
                        <option value={1}>GMT+1 (CET)</option>
                        <option value={2}>GMT+2 (EET — common broker)</option>
                        <option value={3}>GMT+3 (EEST — common broker)</option>
                        <option value={4}>GMT+4</option>
                        <option value={5}>GMT+5</option>
                        <option value={8}>GMT+8 (SGT/HKT)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              {/* Parse Errors */}
              {parseErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm space-y-1">
                  <p className="font-semibold">Parse Warnings</p>
                  {parseErrors.map((e, i) => <p key={i} className="opacity-80">• {e}</p>)}
                </div>
              )}

              {parsed.length === 0 ? (
                <div className="card p-10 text-center">
                  <p className="text-gray-400">No trades were found in the file.</p>
                  <button onClick={reset} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm">← Try a different file</button>
                </div>
              ) : (
                <>
                  {/* Target Account Selector */}
                  <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Target Trading Account</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Select the account these trades should be imported into.</p>
                    </div>
                    <div className="w-full sm:w-64">
                      <select
                        value={targetAccountId}
                        onChange={(e) => setTargetAccountId(e.target.value)}
                        className="input w-full text-sm py-2 bg-[#0a0b0f] border-white/[0.06] focus:border-indigo-500/50"
                      >
                        <option value="all">Default (Unassociated)</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.account_number})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary bar */}
                  <div className="card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">File</p>
                      <p className="text-sm text-white font-medium truncate">{fileName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Parsed</p>
                      <p className="text-lg font-bold text-white">{parsed.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Selected</p>
                      <p className="text-lg font-bold text-indigo-400">{selectedCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total P&L (selected)</p>
                      <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Trade Table */}
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-white/[0.06]">
                          <tr>
                            <th className="p-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedKeys.size === parsed.length}
                                onChange={toggleAll}
                                className="w-4 h-4 rounded border-gray-600 bg-white/5 text-indigo-600 focus:ring-indigo-500/50"
                              />
                            </th>
                            {['Symbol', 'Type', 'Entry', 'Exit', 'Lots', 'P&L'].map((h) => (
                              <th key={h} className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {parsed.map((t, i) => {
                            const selected = selectedKeys.has(t._key)
                            return (
                              <tr
                                key={`${t._key}-${i}`}
                                onClick={() => toggleRow(t._key)}
                                className={`cursor-pointer transition-colors ${selected ? 'bg-indigo-500/5' : 'opacity-50 hover:opacity-70'}`}
                              >
                                <td className="p-3">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleRow(t._key)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 rounded border-gray-600 bg-white/5 text-indigo-600 focus:ring-indigo-500/50"
                                  />
                                </td>
                                <td className="p-3 font-semibold text-white">{t.symbol}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    t.type === 'Long'
                                      ? 'bg-blue-500/15 text-blue-400'
                                      : 'bg-red-500/15 text-red-400'
                                  }`}>{t.type}</span>
                                </td>
                                <td className="p-3 text-gray-400 text-xs">
                                  {new Date(t.entry_time).toLocaleDateString()}
                                </td>
                                <td className="p-3 text-gray-400 text-xs">
                                  {new Date(t.exit_time).toLocaleDateString()}
                                </td>
                                <td className="p-3 text-gray-300">{t.lots.toFixed(2)}</td>
                                <td className={`p-3 font-semibold ${t.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {t.profit_loss >= 0 ? '+' : ''}{t.profit_loss.toFixed(2)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3">
                    <button onClick={reset} className="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors">
                      ← Back
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing || selectedCount === 0}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {importing ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Importing…
                        </>
                      ) : (
                        `Import ${selectedCount} trade${selectedCount !== 1 ? 's' : ''}`
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-10 text-center space-y-6"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                result.errors.length > 0 ? 'bg-amber-500/15' : 'bg-emerald-500/15'
              }`}>
                {result.errors.length > 0 ? (
                  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.27 16A2 2 0 005.07 19z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Import Complete</h2>
                <p className="text-gray-400">Your trades have been added to your journal.</p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                <div className="bg-emerald-500/10 rounded-xl p-4">
                  <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
                  <p className="text-xs text-gray-500 mt-1">Imported</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-300">{result.skipped}</p>
                  <p className="text-xs text-gray-500 mt-1">Skipped</p>
                </div>
                <div className={`${result.errors.length > 0 ? 'bg-red-500/10' : 'bg-white/[0.04]'} rounded-xl p-4`}>
                  <p className={`text-2xl font-bold ${result.errors.length > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    {result.errors.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Errors</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="text-left p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm space-y-1">
                  {result.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button onClick={reset} className="px-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.07] text-gray-300 hover:text-white rounded-xl transition-all">
                  Import Another File
                </button>
                <button onClick={() => router.push('/trades')} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl transition-all">
                  View Trades →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Import History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Import History</h2>
          {historyLoading ? (
            <div className="card p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-gray-500 text-sm">No imports yet. Your import history will appear here.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.06]">
                  <tr>
                    {['File', 'Source', 'Imported', 'Skipped', 'Date', ''].map((h) => (
                      <th key={h} className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {history.map((rec) => (
                    <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-white font-medium max-w-[200px] truncate">{rec.file_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          rec.source === 'mt5'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-violet-500/15 text-violet-400'
                        }`}>
                          {rec.source === 'mt5' ? 'MT5' : 'CSV'}
                        </span>
                      </td>
                      <td className="p-4 text-emerald-400 font-semibold">{rec.trades_imported}</td>
                      <td className="p-4 text-gray-400">{rec.duplicates_skipped}</td>
                      <td className="p-4 text-gray-500 text-xs">
                        {new Date(rec.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleDeleteHistory(rec.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors"
                          title="Delete record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
