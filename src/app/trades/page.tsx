'use client'

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAccount } from '@/hooks/useAccount'
import { Trade, TradingAccount } from '@/lib/types'
import { getPagedTrades, deleteTrade, deleteTradesBulk, addTrade, updateTrade, getFilteredTradeMetrics, getTradingAccounts, getUserTags, updateTag } from '@/lib/tradingApi'
import { uploadTradeScreenshot, supabase } from '@/lib/supabaseClient'
import EnhancedTradeForm from '@/components/trades/EnhancedTradeForm'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import TradeDetail from '@/components/trades/TradeDetail'
import TagModal from '@/components/trades/TagModal'
import ExportModal from '@/components/trades/ExportModal'
import TradeAIChatBox from '@/components/trades/TradeAIChatBox'
import { calculatePerformanceMetrics } from '@/lib/tradeMetrics'
import { TradesListSkeleton } from '@/components/ui/SkeletonLoader'
import toast from 'react-hot-toast'
import { resolveTradingViewUrl } from '@/lib/utils'
import Confetti from 'react-confetti'

// Extracted Subcomponents
import TradesHeader from '@/components/trades/TradesHeader'
import TradesFilters from '@/components/trades/TradesFilters'
import TradesTable, { DEFAULT_COLUMN_WIDTHS } from '@/components/trades/TradesTable'
import { motion } from 'framer-motion'
import { isForexPair, getSymbolMultiplier } from '@/lib/forexUtils'

type SavedView = 'all' | 'forex' | 'mistakes' | 'winners' | 'losers' | 'review'
type TableDensity = 'comfortable' | 'compact'
type ReviewReason = 'fomo' | 'oversized' | 'no-plan' | 'large-loss'

const getTradeReviewReasons = (trade: Trade): ReviewReason[] => {
  const reasons: ReviewReason[] = []
  const tags = (trade.tags || []).map(t => t.toLowerCase())
  const mistakes = (trade.mistakes || []).map(m => m.toLowerCase())
  const notes = (trade.notes || '').toLowerCase()

  const hasFomo = tags.includes('fomo') || mistakes.some(m => m.includes('fomo')) || notes.includes('fomo')
  const hasNoPlan = mistakes.some(m => m.includes('no plan')) || (!tags.includes('plan') && !notes.includes('plan') && (trade.notes || '').trim().length === 0)
  const hasOversized = mistakes.some(m => m.includes('too large')) || mistakes.some(m => m.includes('oversized'))
  const hasLargeLoss = (trade.profit_loss ?? 0) <= -100

  if (hasFomo) reasons.push('fomo')
  if (hasOversized) reasons.push('oversized')
  if (hasNoPlan) reasons.push('no-plan')
  if (hasLargeLoss) reasons.push('large-loss')

  return reasons
}

const getTradeQualityScore = (trade: Trade): number => {
  let score = 100
  const reasons = getTradeReviewReasons(trade)
  if (reasons.includes('fomo')) score -= 30
  if (reasons.includes('oversized')) score -= 25
  if (reasons.includes('no-plan')) score -= 20
  if (reasons.includes('large-loss')) score -= 15
  if ((trade.tags || []).length === 0) score -= 10
  if (!(trade.notes || '').trim()) score -= 8
  return Math.max(0, score)
}

const calculateTradesPerWeek = (trades: Trade[]): number => {
  if (!trades.length) return 0;
  const oldestTradeDate = new Date(Math.min(...trades.map(t => new Date(t.entry_time).getTime())));
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - oldestTradeDate.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks > 0 ? trades.length / diffWeeks : trades.length;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

export default function Trades() {
  return (
    <Suspense fallback={<TradesListSkeleton />}>
      <TradesContent />
    </Suspense>
  )
}

function TradesContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      const handleResize = () => {
        setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const [trades, setTrades] = useState<Trade[]>([])
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedDetailTrade, setSelectedDetailTrade] = useState<Trade | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '')
  const [symbolFilter, setSymbolFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'All' | 'Long' | 'Short'>('All')
  const [dateFilter, setDateFilter] = useState<'All' | '7d' | '30d' | '90d' | '1y'>('All')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const { accounts, selectedAccountIds, selectAccount } = useAccount()
  // Derive accountIds array for API calls: undefined means 'all'
  const accountIds: string[] | undefined =
    selectedAccountIds === 'all' ? undefined : selectedAccountIds as string[]
  // Derived single-string for legacy TradesFilters dropdown: null = all, string = one account selected
  const accountFilter: string | null =
    accountIds && accountIds.length === 1 ? accountIds[0] : null
  const setAccountFilter = (id: string | null) => selectAccount(id || 'all')
  const [userAccounts, setUserAccounts] = useState<TradingAccount[]>([])
  const [startingBalance, setStartingBalance] = useState<number>(10000)
  const [sortField, setSortField] = useState<keyof Trade>('entry_time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.pageSize')
      if (saved) {
        const parsed = Number(saved)
        if (!isNaN(parsed) && parsed > 0) return parsed
      }
    }
    return 10
  })
  const [totalPages, setTotalPages] = useState(1)
  const [quickMetrics, setQuickMetrics] = useState({ winRate: 0, profitFactor: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, tradesPerWeek: 0 })
  const [showTagModal, setShowTagModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null)
  const [screenshotEditTrade, setScreenshotEditTrade] = useState<Trade | null>(null)
  const [screenshotEditTab, setScreenshotEditTab] = useState<'upload' | 'embed'>('upload')
  const [screenshotEditEmbedUrl, setScreenshotEditEmbedUrl] = useState('')
  const [userTagsConfig, setUserTagsConfig] = useState<any[]>([])
  const [activeView, setActiveView] = useState<SavedView>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.activeView')
      if (saved) return saved as SavedView
    }
    return 'all'
  })
  const [showIntelligence, setShowIntelligence] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.showIntelligence')
      if (saved !== null) return saved === 'true'
    }
    return false
  })
  const [tableDensity, setTableDensity] = useState<TableDensity>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.tableDensity')
      if (saved) return saved as TableDensity
    }
    return 'comfortable'
  })
const DEFAULT_VISIBLE_COLUMNS = {
  side: true,
  entry: true,
  exit: true,
  lots: true,
  pips: true,
  pnl: true,
  date: true,
  strategy: true,
  mindset: true,
  tags: true,
  mistakes: true,
  notes: true,
  openTime: false,
  closeTime: false,
  commission: false,
  netProfit: false,
  percentGain: false,
  holdTime: false,
  stopLoss: false,
  takeProfit: false,
  account: false,
};

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.visibleColumns')
      if (saved) {
        try {
          return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
        } catch {}
      }
    }
    return DEFAULT_VISIBLE_COLUMNS;
  })

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.columnWidths')
      if (saved) {
        try {
          return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) }
        } catch {}
      }
    }
    return DEFAULT_COLUMN_WIDTHS
  })

  const [wrapTags, setWrapTags] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('trades.wrapTags')
      return saved !== null ? saved === 'true' : true
    }
    return true
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('trades.columnWidths', JSON.stringify(columnWidths))
    }
  }, [columnWidths])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('trades.wrapTags', String(wrapTags))
    }
  }, [wrapTags])

  const [inlineNewRowIndex, setInlineNewRowIndex] = useState<number | null>(null)
  const [inlineRowData, setInlineRowData] = useState<Partial<Trade> | null>(null)
  const [inlineScreenshotFile, setInlineScreenshotFile] = useState<File | null>(null)
  const [uploadingTradeId, setUploadingTradeId] = useState<string | null>(null)
  const [deletedPresets, setDeletedPresets] = useState<string[]>([]);
  const [deletedMistakePresets, setDeletedMistakePresets] = useState<string[]>([]);
  const [notesModalTrade, setNotesModalTrade] = useState<Trade | null>(null);
  const [notesModalText, setNotesModalText] = useState('');
  const [userStrategies, setUserStrategies] = useState<{ id: string; name: string; rules?: string | null }[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.activeView', activeView)
  }, [activeView])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.tableDensity', tableDensity)
  }, [tableDensity])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.showIntelligence', String(showIntelligence))
  }, [showIntelligence])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.visibleColumns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('trades.pageSize', String(pageSize))
  }, [pageSize])

  useEffect(() => { if (!loading && !user) router.push('/login') }, [user, loading, router])

  const fetchUserTags = useCallback(async () => {
    if (!user?.id) return;
    try {
      const tags = await getUserTags(user.id);
      setUserTagsConfig(tags);
    } catch (err) {
      console.error('Error fetching user tags:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      getTradingAccounts(user.id).then(setUserAccounts)
      fetchUserTags();
      
      // Fetch starting balance from profile settings
      const loadProfileSettings = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', user.id)
            .single();
          const settings = (data?.settings as any) || {};
          const profileStartingBalance = Number(settings.startingBalance);
          if (!isNaN(profileStartingBalance) && profileStartingBalance > 0) {
            setStartingBalance(profileStartingBalance);
          }
        } catch (err) {
          console.error('Error fetching profile settings:', err);
        }
      };
      loadProfileSettings();
      // Fetch user strategies
      const fetchStrategies = async () => {
        try {
          const { data } = await supabase
            .from('strategies')
            .select('id, name, rules')
            .eq('user_id', user.id)
            .order('name');
          setUserStrategies(data || []);
        } catch (err) {
          console.error('Error fetching strategies:', err);
        }
      };
      fetchStrategies();
    }
  }, [user?.id, fetchUserTags])

  const fetchPagedTrades = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { trades: page, total } = await getPagedTrades({
        userId: user.id,
        page: currentPage,
        pageSize,
        search: searchTerm || undefined,
        symbol: symbolFilter || undefined,
        type: typeFilter,
        dateFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortField: String(sortField),
        sortDirection,
        accountIds,
      });
      const enrichedPage = page.map(t => {
        return {
          ...t,
          notes: t.notes ? t.notes.replace(/\[SL=([\d.-]+)?;TP=([\d.-]+)?;Comm=([\d.-]+)?;Swap=([\d.-]+)?\]/, '').trim() : '',
          stop_loss: t.stop_loss ?? undefined,
          take_profit: t.take_profit ?? undefined,
          commission: t.commission ?? undefined,
          swap: t.swap ?? undefined,
        };
      });
      setTrades(enrichedPage);
      setFilteredTrades(enrichedPage);
      setTotalPages(Math.ceil(total / pageSize));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [user?.id, currentPage, pageSize, searchTerm, symbolFilter, typeFilter, dateFilter, startDate, endDate, sortField, sortDirection, accountIds]);

  const fetchGlobalMetrics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fullTrades = await getFilteredTradeMetrics({
        userId: user.id,
        search: searchTerm || undefined,
        symbol: symbolFilter || undefined,
        type: typeFilter,
        dateFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        accountIds,
      });
      
      let result = [...fullTrades];
      if (activeView === 'forex') result = result.filter(t => isForexPair(t.symbol));
      if (activeView === 'mistakes') result = result.filter(t => (t.mistakes?.length || 0) > 0);
      if (activeView === 'winners') result = result.filter(t => (t.profit_loss ?? 0) > 0);
      if (activeView === 'losers') result = result.filter(t => (t.profit_loss ?? 0) < 0);
      if (activeView === 'review') result = result.filter(t => getTradeReviewReasons(t).length > 0);

      if (result.length > 0) {
        const metrics = calculatePerformanceMetrics(result);
        setQuickMetrics({ 
          winRate: metrics.winRate, 
          profitFactor: metrics.profitFactor, 
          totalPnL: metrics.totalPnL, 
          avgWin: metrics.averageWin, 
          avgLoss: metrics.averageLoss, 
          tradesPerWeek: calculateTradesPerWeek(result) 
        });
      } else {
        setQuickMetrics({ winRate: 0, profitFactor: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, tradesPerWeek: 0 });
      }
    } catch (err) { console.error(err); }
  }, [user?.id, searchTerm, symbolFilter, typeFilter, dateFilter, startDate, endDate, activeView, accountIds]);

  useEffect(() => { if (user?.id) fetchPagedTrades(); }, [fetchPagedTrades, user?.id]);
  useEffect(() => { if (user?.id) fetchGlobalMetrics(); }, [fetchGlobalMetrics, user?.id]);
  
  useEffect(() => {
    if (!trades.length) { setFilteredTrades([]); return; }
    let result = [...trades];
    if (activeView === 'forex') result = result.filter(t => isForexPair(t.symbol));
    if (activeView === 'mistakes') result = result.filter(t => (t.mistakes?.length || 0) > 0);
    if (activeView === 'winners') result = result.filter(t => (t.profit_loss ?? 0) > 0);
    if (activeView === 'losers') result = result.filter(t => (t.profit_loss ?? 0) < 0);
    if (activeView === 'review') result = result.filter(t => getTradeReviewReasons(t).length > 0);
    setFilteredTrades(result);
  }, [trades, activeView]);

  const uniqueSymbols = useMemo(() => Array.from(new Set(trades.map(t => t.symbol))), [trades]);
  const accountsMap = useMemo(() => new Map(userAccounts.map(a => [a.id, a.name])), [userAccounts]);

  const reviewQueue = useMemo(() =>
    trades
      .map(trade => ({ trade, reasons: getTradeReviewReasons(trade), quality: getTradeQualityScore(trade) }))
      .filter(item => item.reasons.length > 0)
      .sort((a, b) => (a.quality - b.quality) || ((a.trade.profit_loss ?? 0) - (b.trade.profit_loss ?? 0)))
      .slice(0, 5),
    [trades]
  );

  const topMistakeCost = useMemo(() => {
    const mistakeCost = trades.reduce<Record<string, number>>((acc, trade) => {
      const pnl = trade.profit_loss ?? 0
      if (pnl >= 0 || !trade.mistakes?.length) return acc
      trade.mistakes.forEach(mistake => {
        acc[mistake] = (acc[mistake] || 0) + Math.abs(pnl)
      })
      return acc
    }, {});
    return Object.entries(mistakeCost).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [trades]);

  const handleDeleteTrade = async (tradeId: string) => {
    if (!window.confirm('Delete this trade?')) return;
    setIsDeleting(tradeId);
    try {
      await deleteTrade(tradeId);
      await fetchPagedTrades();
      await fetchGlobalMetrics();
      toast.success('Trade deleted successfully');
    } catch (e) { console.error(e); toast.error('Failed to delete trade'); } finally { setIsDeleting(null); }
  };

  const handleTradeFormSubmit = async (tradeData: Partial<Trade>) => {
    if (selectedTrade && tradeData.id) {
      await updateTrade({ ...selectedTrade, ...tradeData } as Trade);
      await fetchPagedTrades();
      await fetchGlobalMetrics();
      setShowForm(false); setSelectedTrade(null);
      toast.success('Trade updated');
    } else {
      if (!user) return;
      const isFirst = trades.length === 0;
      await addTrade({ ...tradeData, user_id: user.id } as Trade);
      await fetchPagedTrades();
      await fetchGlobalMetrics();
      setShowForm(false); setSelectedTrade(null);
      toast.success('Trade saved successfully');
      if (isFirst) {
        setShowConfetti(true);
      }
    }
  };

  const handleLoadDemoTrades = async () => {
    if (!user?.id) return;
    setIsDemoLoading(true);
    try {
      const demoTrades: Partial<Trade>[] = [
        {
          symbol: 'EURUSD',
          type: 'Long',
          entry_price: 1.08520,
          exit_price: 1.08940,
          lots: 1.5,
          quantity: 1.5,
          profit_loss: 630.00,
          entry_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          notes: 'Took trade at VWAP support. Exit near resistance. Good discipline.',
          tags: ['Breakout', 'Trend'],
          mistakes: [],
          pips: 42.0,
          emotional_state: 'confident'
        },
        {
          symbol: 'XAUUSD',
          type: 'Short',
          entry_price: 2320.50,
          exit_price: 2312.00,
          lots: 1.0,
          quantity: 1.0,
          profit_loss: 850.00,
          entry_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          notes: 'Short at double top on Gold. Quick 85 pips scalp.',
          tags: ['Reversal', 'Sniper Entry'],
          mistakes: [],
          pips: 85.0,
          emotional_state: 'calm'
        },
        {
          symbol: 'GBPUSD',
          type: 'Long',
          entry_price: 1.26420,
          exit_price: 1.26120,
          lots: 2.0,
          quantity: 2.0,
          profit_loss: -600.00,
          entry_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          notes: 'Tried to catch falling knife. Did not wait for confirmation.',
          tags: [],
          mistakes: ['FOMO Entry', 'Late Entry'],
          pips: -30.0,
          emotional_state: 'anxious'
        },
        {
          symbol: 'US100',
          type: 'Long',
          entry_price: 19520.00,
          exit_price: 19610.00,
          lots: 0.5,
          quantity: 0.5,
          profit_loss: 450.00,
          entry_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          notes: 'Rode the indices momentum after CPI release.',
          tags: ['Breakout', 'News'],
          mistakes: [],
          pips: 90.0,
          emotional_state: 'greed'
        },
        {
          symbol: 'BTCUSD',
          type: 'Short',
          entry_price: 66420.00,
          exit_price: 66550.00,
          lots: 0.1,
          quantity: 0.1,
          profit_loss: -13.00,
          entry_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          exit_time: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
          notes: 'Tiny scalp attempt on Bitcoin. Stopped out quickly.',
          tags: ['Scalp'],
          mistakes: [],
          pips: -130.0,
          emotional_state: 'neutral'
        }
      ];

      const targetAccountId = (
        selectedAccountIds !== 'all' && (selectedAccountIds as string[]).length === 1
          ? (selectedAccountIds as string[])[0]
          : (accounts[0]?.id || null)
      );
      for (const t of demoTrades) {
        await addTrade({ ...t, user_id: user.id, account_id: targetAccountId } as Trade);
      }
      toast.success('5 demo trades loaded successfully!');
      await fetchPagedTrades();
      await fetchGlobalMetrics();
    } catch (e) {
      console.error(e);
      toast.error('Failed to load demo trades');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleStartInlineAdd = (index: number) => {
    setInlineNewRowIndex(index);
    setInlineScreenshotFile(null);
    setInlineRowData({
      symbol: '',
      type: 'Long',
      entry_price: 0,
      exit_price: 0,
      lots: 0.10,
      quantity: 10,
      profit_loss: 0,
      entry_time: new Date().toISOString(),
      exit_time: new Date().toISOString(),
      tags: [],
      mistakes: [],
      notes: '',
      emotional_state: 'neutral',
      stop_loss: undefined,
      take_profit: undefined,
      commission: undefined,
    });
  };

  const handleInlineChange = (field: keyof Trade, value: any) => {
    setInlineRowData(prev => {
      if (!prev) return null;
      const next = { ...prev, [field]: value };
      
      if (['entry_price', 'exit_price', 'quantity', 'type', 'lots', 'symbol'].includes(field as string)) {
        const entry = parseFloat(String(next.entry_price)) || 0;
        const exit = parseFloat(String(next.exit_price)) || 0;
        const lotsVal = parseFloat(String(next.lots)) || 0;
        const qtyVal = parseFloat(String(next.quantity)) || 0;
        const qty = lotsVal > 0 ? lotsVal : (qtyVal > 0 ? qtyVal : 1);
        const dir = next.type || 'Long';
        
        if (entry > 0 && exit > 0 && qty > 0) {
          let pnl = 0;
          if (isForexPair(next.symbol || '')) {
            const lotSize = getSymbolMultiplier(next.symbol || '');
            pnl = (dir === 'Long' ? (exit - entry) : (entry - exit)) * lotSize * (lotsVal > 0 ? lotsVal : 0.1);
          } else {
            pnl = (dir === 'Long' ? (exit - entry) : (entry - exit)) * qty;
          }
          next.profit_loss = Math.round(pnl * 100) / 100;
        }

        if (entry > 0 && exit > 0 && isForexPair(next.symbol || '')) {
          const isJpy = (next.symbol || '').toUpperCase().includes('JPY');
          const pipMultiplier = isJpy ? 100 : 10000;
          const calculatedPips = (dir === 'Long' ? (exit - entry) : (entry - exit)) * pipMultiplier;
          next.pips = Math.round(calculatedPips * 10) / 10;
        }
      }
      return next;
    });
  };

  const handleInlineSave = async () => {
    if (!user) return;
    if (!inlineRowData?.symbol) {
      toast.error('Symbol is required');
      return;
    }
    
    setIsLoading(true);
    try {
      const isFirst = trades.length === 0;
      const newTrade = {
        ...inlineRowData,
        user_id: user.id,
      } as Trade;
      
      const savedTrade = await addTrade(newTrade);
      
      if (inlineScreenshotFile && savedTrade?.id) {
        try {
          const url = await uploadTradeScreenshot(inlineScreenshotFile, user.id, savedTrade.id);
          if (url) {
            await updateTrade({ ...savedTrade, screenshot_url: url });
          }
        } catch (uploadError) {
          console.error('Failed to upload inline screenshot:', uploadError);
          toast.error('Trade saved, but screenshot upload failed');
        }
      }
      
      toast.success('Trade saved inline successfully!');
      setInlineScreenshotFile(null);
      await fetchPagedTrades();
      await fetchGlobalMetrics();
      setInlineNewRowIndex(null);
      setInlineRowData(null);
      if (isFirst) {
        setShowConfetti(true);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to save trade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInlineCancel = () => {
    setInlineNewRowIndex(null);
    setInlineRowData(null);
    setInlineScreenshotFile(null);
  };

  const handleDeleteTagGlobally = async (tag: string, isMistake = false) => {
    if (!window.confirm(`Delete tag "${tag}" globally?`)) return;
    if (isMistake) setDeletedMistakePresets(prev => [...prev, tag]);
    else setDeletedPresets(prev => [...prev, tag]);

    const updated = trades.map(t => {
      const current = isMistake ? (t.mistakes || []) : (t.tags || []);
      const next = current.filter(x => x !== tag);
      return { ...t, [isMistake ? 'mistakes' : 'tags']: next };
    });
    setTrades(updated);

    try {
      if (user) {
        await supabase.from('tags').delete().eq('user_id', user.id).eq('name', tag);
        if (isMistake) {
          const { data } = await supabase.from('trades').select('id, mistakes').eq('user_id', user.id).contains('mistakes', [tag]);
          if (data) {
            for (const tradeRow of data) {
              const updatedMistakes = (tradeRow.mistakes || []).filter((m: string) => m !== tag);
              await supabase.from('trades').update({ mistakes: updatedMistakes }).eq('id', tradeRow.id);
            }
          }
        }
      }
      toast.success(`Tag "${tag}" deleted globally`);
      await fetchUserTags();
    } catch (e) { console.error(e); toast.error('Failed to delete tag'); }
  };

  const handleUpdateTagColor = async (tag: string, colorHex: string, isMistake = false) => {
    if (!user) return;
    try {
      const existing = userTagsConfig.find(tc => tc.name.toLowerCase() === tag.toLowerCase());
      if (existing) await updateTag(existing.id, { color: colorHex });
      else await supabase.from('tags').insert({ name: tag, user_id: user.id, color: colorHex });
      await fetchUserTags();
      toast.success('Color updated');
    } catch (e) { console.error(e); toast.error('Failed to update color'); }
  };

  const handleRenameTagGlobally = async (oldName: string, newName: string, isMistake = false) => {
    if (!user) return;
    try {
      const existing = userTagsConfig.find(tc => tc.name.toLowerCase() === oldName.toLowerCase());
      if (existing) await updateTag(existing.id, { name: newName });
      else await supabase.from('tags').insert({ name: newName, user_id: user.id, color: isMistake ? '#ef4444' : '#6366f1' });

      const updated = trades.map(t => {
        const current = isMistake ? (t.mistakes || []) : (t.tags || []);
        if (current.includes(oldName)) {
          const next = current.map(x => x === oldName ? newName : x);
          return { ...t, [isMistake ? 'mistakes' : 'tags']: next };
        }
        return t;
      });
      setTrades(updated);

      if (isMistake) {
        const { data } = await supabase.from('trades').select('id, mistakes').eq('user_id', user.id).contains('mistakes', [oldName]);
        if (data) {
          for (const tradeRow of data) {
            const updatedMistakes = (tradeRow.mistakes || []).map((m: string) => m === oldName ? newName : m);
            await supabase.from('trades').update({ mistakes: updatedMistakes }).eq('id', tradeRow.id);
          }
        }
      }

      await fetchUserTags();
      toast.success(`Tag renamed to "${newName}"`);
    } catch (e) { console.error(e); toast.error('Failed to rename tag'); }
  };

  const handleUpdateStrategy = async (trade: Trade, strategyName: string | null) => {
    // Find previous strategy rules to remove them from tags
    const prevStrategy = userStrategies.find(s => s.name === trade.strategy);
    let updatedTags = [...(trade.tags || [])];
    
    if (prevStrategy?.rules) {
      try {
        const prevRules = JSON.parse(prevStrategy.rules);
        if (Array.isArray(prevRules)) {
          updatedTags = updatedTags.filter(t => !prevRules.includes(t));
        }
      } catch (e) {}
    }
    
    const updated = trades.map(t => t.id === trade.id ? { ...t, strategy: strategyName, tags: updatedTags } : t);
    setTrades(updated);
    
    try {
      await updateTrade({ ...trade, strategy: strategyName, tags: updatedTags });
      toast.success('Strategy updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update strategy');
    }
  };

  const handleToggleTag = async (trade: Trade, tag: string, isMistake = false) => {
    if (tag === 'EMOTION_UPDATE_DUMMY_TAG') {
      const updated = trades.map(t => t.id === trade.id ? trade : t);
      setTrades(updated);
      try {
        await updateTrade(trade);
        toast.success('Mindset updated');
      } catch (e) { console.error(e); toast.error('Failed to update mindset'); }
      return;
    }

    if (!trade.id || trade.id === 'new-row') {
      const current = isMistake ? (inlineRowData?.mistakes || []) : (inlineRowData?.tags || []);
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
      setInlineRowData(prev => prev ? { ...prev, [isMistake ? 'mistakes' : 'tags']: next } : null);
      return;
    }

    const current = isMistake ? (trade.mistakes || []) : (trade.tags || []);
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    
    const updated = trades.map(t => t.id === trade.id ? { ...t, [isMistake ? 'mistakes' : 'tags']: next } : t);
    setTrades(updated);
    
    try {
      await updateTrade({ ...trade, [isMistake ? 'mistakes' : 'tags']: next });
      toast.success(isMistake ? 'Mistake tag updated' : 'Strategy tag updated');
      if (!isMistake && !userTagsConfig.some(t => t.name.toLowerCase() === tag.toLowerCase())) {
        fetchUserTags();
      }
    } catch (error) { console.error(error); toast.error('Failed to update tags'); }
  };

  const handleUploadScreenshot = async (trade: Trade, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploadingTradeId(trade.id);
    try {
      const url = await uploadTradeScreenshot(file, user?.id || '', trade.id);
      if (url) {
        const updated = trades.map(t => t.id === trade.id ? { ...t, screenshot_url: url } : t);
        setTrades(updated);
        await updateTrade({ ...trade, screenshot_url: url });
        toast.success('Screenshot uploaded successfully!');
      } else { toast.error('Upload failed'); }
    } catch (error) { console.error(error); toast.error('Failed to upload screenshot'); }
    finally { setUploadingTradeId(null); }
  };

  const handleUpdateScreenshot = async (trade: Trade, url: string) => {
    const updated = trades.map(t => t.id === trade.id ? { ...t, screenshot_url: url } : t);
    setTrades(updated);
    try {
      await updateTrade({ ...trade, screenshot_url: url });
      toast.success('Screenshot updated');
    } catch (error) { console.error(error); toast.error('Failed to update screenshot'); }
  };

  const handleBulkAction = async (action: 'delete' | 'export' | 'tag') => {
    if (!selectedTradeIds.length) return;
    if (action === 'delete') {
      if (!window.confirm(`Delete ${selectedTradeIds.length} trades?`)) return;
      setIsLoading(true);
      await deleteTradesBulk(selectedTradeIds);
      await fetchPagedTrades();
      await fetchGlobalMetrics();
      setSelectedTradeIds([]); setIsLoading(false);
      toast.success(`${selectedTradeIds.length} trades deleted`);
    } else if (action === 'export') setShowExportModal(true);
    else if (action === 'tag') setShowTagModal(true);
  };

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setIsProcessing(true);
    const selected = trades.filter(t => selectedTradeIds.includes(t.id));
    if (format === 'csv') {
      const headers = ['Symbol','Type','Entry','Exit','Qty','P/L','Entry Time','Exit Time','Tags','Notes'];
      const rows = selected.map(t => [t.symbol,t.type,t.entry_price,t.exit_price,t.quantity,t.profit_loss,t.entry_time,t.exit_time,t.tags?.join(';')||'',t.notes||'']);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'trades.csv'; a.click(); URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'trades.json'; a.click(); URL.revokeObjectURL(url);
    }
    setShowExportModal(false); setIsProcessing(false);
    toast.success(`Exported ${selected.length} trades as ${format.toUpperCase()}`);
  };

  const handleAddTag = async (tag: string) => {
    setIsProcessing(true);
    try {
      const selectedTrades = trades.filter(t => selectedTradeIds.includes(t.id))
      await Promise.all(
        selectedTrades.map(trade => {
          const nextTags = Array.from(new Set([...(trade.tags || []), tag]))
          return updateTrade({ ...trade, tags: nextTags } as Trade)
        })
      )
      await fetchPagedTrades();
      await fetchGlobalMetrics();
      setSelectedTradeIds([]); setShowTagModal(false);
      toast.success(`Tag "${tag}" added to ${selectedTrades.length} trades`)
    } catch (error) { console.error('Failed to add tag:', error); toast.error('Failed to add tag'); }
    finally { setIsProcessing(false); }
  };

  const handleSort = (field: keyof Trade) => {
    if (field === sortField) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const allExistingTags = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => (t.tags || []).forEach(tag => set.add(tag)));
    ['Breakout', 'Reversal', 'Trend', 'Scalp', 'Swing', 'News', 'Supply/Demand', 'Prop Firm', 'Sniper Entry'].forEach(tag => set.add(tag));
    return Array.from(set).filter(t => !deletedPresets.includes(t));
  }, [trades, deletedPresets]);

  const allExistingMistakes = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => (t.mistakes || []).forEach(m => set.add(m)));
    ['FOMO Entry', 'Revenge Trade', 'Moved Stop Loss', 'Too Large Size', 'Early Exit', 'Late Entry', 'No Plan', 'Overtrading', 'Held Through News'].forEach(m => set.add(m));
    return Array.from(set).filter(m => !deletedMistakePresets.includes(m));
  }, [trades, deletedMistakePresets]);

  const selectedTradesForAI = trades.filter(t => selectedTradeIds.includes(t.id));

  if (loading || isLoading) {
    return (
      <AuthenticatedLayout>
        <TradesListSkeleton />
      </AuthenticatedLayout>
    )
  }

  return (
    <>
      <AuthenticatedLayout>
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={300}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}
      <motion.div 
        initial={{ opacity: 0, y: 4 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        
        {/* Extracted Header Component */}
        <TradesHeader
          quickMetrics={quickMetrics}
          tradesCount={trades.length}
          filteredTradesCount={filteredTrades.length}
          filteredTrades={filteredTrades}
          onLogTradeClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth >= 768) {
              handleStartInlineAdd(0);
            } else {
              setSelectedTrade(null);
              setShowForm(true);
            }
          }}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          formatCurrency={formatCurrency}
        />

        {/* Extracted Filters Component */}
        <TradesFilters
          activeView={activeView}
          onViewChange={view => { setActiveView(view); setCurrentPage(1); }}
          tableDensity={tableDensity}
          onDensityChange={setTableDensity}
          visibleColumns={visibleColumns}
          onToggleColumn={col => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
          wrapTags={wrapTags}
          onToggleWrapTags={() => setWrapTags(!wrapTags)}
          showIntelligence={showIntelligence}
          onToggleIntelligence={() => setShowIntelligence(prev => !prev)}
          topMistakeCost={topMistakeCost}
          reviewQueue={reviewQueue}
          onReviewClick={setSelectedDetailTrade}
          showFilters={showFilters}
          symbolFilter={symbolFilter}
          typeFilter={typeFilter}
          dateFilter={dateFilter}
          accountFilter={accountFilter}
          uniqueSymbols={uniqueSymbols}
          userAccounts={userAccounts}
          startDate={startDate}
          endDate={endDate}
          onFilterChange={(field, val) => {
            if (field === 'symbolFilter') setSymbolFilter(val);
            else if (field === 'typeFilter') setTypeFilter(val);
            else if (field === 'dateFilter') { setDateFilter(val); if (val !== 'All') { setStartDate(''); setEndDate(''); } }
            else if (field === 'accountFilter') setAccountFilter(val);
            else if (field === 'startDate') { setStartDate(val || ''); setDateFilter('All'); }
            else if (field === 'endDate') { setEndDate(val || ''); setDateFilter('All'); }
          }}
          onResetFilters={() => { setSearchTerm(''); setSymbolFilter(null); setTypeFilter('All'); setDateFilter('All'); setStartDate(''); setEndDate(''); setAccountFilter(null); }}
          selectedTradeIds={selectedTradeIds}
          onBulkAction={handleBulkAction}
          onClearSelection={() => setSelectedTradeIds([])}
        />

        {/* Extracted Table Component */}
        <TradesTable
          filteredTrades={filteredTrades}
          tableDensity={tableDensity}
          visibleColumns={visibleColumns}
          wrapTags={wrapTags}
          columnWidths={columnWidths}
          onColumnWidthChange={(col, val) => setColumnWidths(prev => ({ ...prev, [col]: val }))}
          onResetColumnWidth={col => setColumnWidths(prev => ({ ...prev, [col]: DEFAULT_COLUMN_WIDTHS[col] }))}
          selectedTradeIds={selectedTradeIds}
          onToggleSelectAll={checked => setSelectedTradeIds(checked ? filteredTrades.map(t => t.id) : [])}
          onToggleSelectTrade={(id, checked) => setSelectedTradeIds(checked ? [...selectedTradeIds, id] : selectedTradeIds.filter(x => x !== id))}
          onStartInlineAdd={handleStartInlineAdd}
          inlineNewRowIndex={inlineNewRowIndex}
          inlineRowData={inlineRowData}
          inlineScreenshotFile={inlineScreenshotFile}
          onInlineScreenshotFileChange={setInlineScreenshotFile}
          onInlineChange={handleInlineChange}
          onInlineSave={handleInlineSave}
          onInlineCancel={handleInlineCancel}
          onToggleTag={handleToggleTag}
          userStrategies={userStrategies}
          onUpdateStrategy={handleUpdateStrategy}
          allExistingTags={allExistingTags}
          allExistingMistakes={allExistingMistakes}
          userTagsConfig={userTagsConfig}
          fetchUserTags={fetchUserTags}
          user={user}
          onRenameTagGlobally={handleRenameTagGlobally}
          onUpdateTagColor={handleUpdateTagColor}
          onDeleteTagGlobally={handleDeleteTagGlobally}
          onUploadScreenshot={handleUploadScreenshot}
          onUpdateScreenshot={handleUpdateScreenshot}
          onDeleteTrade={handleDeleteTrade}
          onEditTradeClick={t => { setSelectedTrade(t); setShowForm(true); }}
          onDetailTradeClick={setSelectedDetailTrade}
          onScreenshotClick={setSelectedScreenshotUrl}
          onScreenshotEditClick={t => { setScreenshotEditTrade(t); setScreenshotEditTab('upload'); setScreenshotEditEmbedUrl(''); }}
          onNotesEditClick={t => { setNotesModalTrade(t); setNotesModalText(t.notes || ''); }}
          isDeleting={isDeleting}
          uploadingTradeId={uploadingTradeId}
          userAccounts={userAccounts}
          startingBalance={startingBalance}
          accountsMap={accountsMap}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={onPage => { setCurrentPage(onPage); }}
          onPageSizeChange={onPageSize => { setPageSize(onPageSize); setCurrentPage(1); }}
          formatCurrency={formatCurrency}
          onManualLogClick={() => { setSelectedTrade(null); setShowForm(true); }}
          onLoadDemoClick={handleLoadDemoTrades}
          isDemoLoading={isDemoLoading}
        />
      </motion.div>
      </AuthenticatedLayout>

      {/* Edit Trade Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-auto flex items-start justify-center p-4 pt-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0b12] rounded-2xl border border-white/[0.08] w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-white/[0.06] flex justify-between items-center sticky top-0 bg-[#0a0b12] z-10">
              <h2 className="text-lg font-bold text-white">{selectedTrade ? 'Edit Trade' : 'Add Trade'}</h2>
              <button onClick={() => { setShowForm(false); setSelectedTrade(null); }} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <EnhancedTradeForm initialTrade={selectedTrade || undefined} onSubmit={handleTradeFormSubmit} onCancel={() => { setShowForm(false); setSelectedTrade(null); }} />
            </div>
          </motion.div>
        </div>
      )}
      
      {selectedDetailTrade && (
        <TradeDetail 
          trade={selectedDetailTrade} 
          onClose={() => setSelectedDetailTrade(null)} 
          onEdit={() => {
            setSelectedTrade(selectedDetailTrade);
            setSelectedDetailTrade(null);
            setShowForm(true);
          }}
          onDelete={() => handleDeleteTrade(selectedDetailTrade.id)}
        />
      )}
      <TagModal isOpen={showTagModal} onClose={() => setShowTagModal(false)} onConfirm={handleAddTag} isLoading={isProcessing} />
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onConfirm={handleExport} isLoading={isProcessing} />

      {/* Screenshot Preview Modal */}
      {selectedScreenshotUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedScreenshotUrl(null)}>
          <div className="max-w-4xl w-full relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedScreenshotUrl(null)} className="absolute -top-10 right-0 text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={resolveTradingViewUrl(selectedScreenshotUrl)} alt="Trade Screenshot" className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto" />
          </div>
        </div>
      )}

      {/* Screenshot Upload/Embed Modal */}
      {screenshotEditTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setScreenshotEditTrade(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#0d0e16] rounded-2xl border border-white/[0.08] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center bg-[#0d0e16]">
              <h2 className="text-base font-bold text-white">Add Screenshot to {screenshotEditTrade.symbol}</h2>
              <button onClick={() => setScreenshotEditTrade(null)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex border-b border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setScreenshotEditTab('upload')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    screenshotEditTab === 'upload'
                      ? 'text-indigo-400 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setScreenshotEditTab('embed')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    screenshotEditTab === 'embed'
                      ? 'text-indigo-400 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Embed Link
                </button>
              </div>
              
              <div>
                {screenshotEditTab === 'upload' ? (
                  <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-dashed border-white/[0.08] hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all cursor-pointer">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-400">Choose an image file or <span className="text-indigo-400 font-semibold">browse</span></span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await handleUploadScreenshot(screenshotEditTrade, file);
                          setScreenshotEditTrade(null);
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={screenshotEditEmbedUrl}
                      onChange={e => setScreenshotEditEmbedUrl(e.target.value)}
                      placeholder="Paste TradingView link (e.g. https://www.tradingview.com/x/pCPdcgL4/)"
                      className="w-full px-3 py-2.5 bg-[#06070b] border border-white/[0.06] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (screenshotEditEmbedUrl.trim()) {
                          const resolved = resolveTradingViewUrl(screenshotEditEmbedUrl);
                          await handleUpdateScreenshot(screenshotEditTrade, resolved);
                          setScreenshotEditEmbedUrl('');
                          setScreenshotEditTrade(null);
                        }
                      }}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                      Embed Link
                    </button>
                    <p className="text-[10px] text-gray-500 text-center">Supports direct image links and TradingView chart sharing URLs (which auto-convert to direct image PNGs).</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Learnings Modal */}
      {notesModalTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setNotesModalTrade(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl p-6 text-left border relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%), #0d0e16',
              borderColor: 'rgba(255,255,255,0.08)',
              boxShadow: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 24px 48px -12px rgba(0,0,0,0.8), 0 4px 16px -4px rgba(0,0,0,0.5)',
            }}
          >
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Learnings & Notes
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Trade: <span className="text-gray-300 font-semibold">{notesModalTrade.symbol}</span> · {notesModalTrade.type === 'Long' ? 'BUY' : 'SELL'} · P&L: <span className={notesModalTrade.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(notesModalTrade.profit_loss || 0)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setNotesModalTrade(null)}
                  className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 flex-grow">
                <textarea
                  value={notesModalText}
                  onChange={e => setNotesModalText(e.target.value)}
                  className="w-full h-64 p-4 bg-black/40 border border-white/[0.08] focus:border-indigo-500/50 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 resize-none font-sans leading-relaxed"
                  placeholder="What did you learn from this trade? Detail your strategy, emotional triggers, entry/exit criteria, and potential mistakes..."
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-4">
                <button
                  onClick={() => setNotesModalTrade(null)}
                  className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const currentTrade = notesModalTrade;
                    const text = notesModalText;
                    
                    setTrades(prev => prev.map(t => t.id === currentTrade.id ? { ...t, notes: text } : t));
                    setNotesModalTrade(null);
                    
                    try {
                      await updateTrade({ ...currentTrade, notes: text });
                      toast.success('Learnings note updated');
                    } catch (error) {
                      console.error(error);
                      toast.error('Failed to update note');
                    }
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <TradeAIChatBox selectedTrades={selectedTradesForAI.length > 0 ? selectedTradesForAI : filteredTrades} />
    </>
  )
}

// Vercel deployment trigger: 2026-06-19
