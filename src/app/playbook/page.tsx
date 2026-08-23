'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Trade } from '@/lib/types';
import { getPLColorClasses } from '@/lib/utils';
import { useSettings } from '@/providers/SettingsProvider';
import TradeDetail from '@/components/trades/TradeDetail';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Plus, 
  Target, 
  Trash2, 
  Save, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ShieldCheck, 
  BarChart3, 
  Clock, 
  X, 
  ArrowUpRight, 
  CheckCircle2, 
  Sparkles,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface StrategyTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  rules: string | null;
  created_at: string;
}

export default function PlaybookPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { colorblindMode } = useSettings();

  const [tags, setTags] = useState<StrategyTag[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Strategy form states
  const [description, setDescription] = useState('');
  const [rulesList, setRulesList] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New Strategy Tag form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStratName, setNewStratName] = useState('');
  const [newStratColor, setNewStratColor] = useState('#6366f1');
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load tags and trades
  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // 1. Fetch strategies
      const { data: strategiesData, error: strategiesError } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (strategiesError) throw strategiesError;

      // 2. Fetch trades
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_time', { ascending: false });

      if (tradesError) throw tradesError;

      // 3. Fetch tags and junction so we can attach tags to trades for display
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id);

      if (tagsError) throw tagsError;

      const { data: junctionData, error: junctionError } = await supabase
        .from('trade_tags')
        .select('trade_id, tag_id');

      if (junctionError) throw junctionError;

      // Map tags to trades in memory for display
      const tagMap = new Map((tagsData || []).map(t => [t.id, t]));
      const tradeTagsMap: Record<string, string[]> = {};
      
      (junctionData || []).forEach(row => {
        if (row.tag_id && row.trade_id) {
          const tag = tagMap.get(row.tag_id);
          if (tag) {
            if (!tradeTagsMap[row.trade_id]) {
              tradeTagsMap[row.trade_id] = [];
            }
            tradeTagsMap[row.trade_id].push(tag.name);
          }
        }
      });

      const tradesWithTags = (tradesData || []).map(trade => ({
        ...trade,
        tags: tradeTagsMap[trade.id] || []
      })) as unknown as Trade[];

      const validTags = (strategiesData as unknown as StrategyTag[]) || [];
      setTags(validTags);
      setTrades(tradesWithTags);

      // Auto-select first strategy if none selected
      if (validTags.length > 0 && !selectedTagId) {
        setSelectedTagId(validTags[0].id);
      }
    } catch (err) {
      console.error('Error loading playbook data:', err);
      toast.error('Failed to load playbook data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // Selected strategy tag details
  const selectedTag = useMemo(() => {
    return tags.find(t => t.id === selectedTagId) || null;
  }, [tags, selectedTagId]);

  // Sync edit state fields when selected strategy changes
  useEffect(() => {
    if (selectedTag) {
      setDescription(selectedTag.description || '');
      try {
        const parsedRules = selectedTag.rules ? JSON.parse(selectedTag.rules) : [];
        setRulesList(Array.isArray(parsedRules) ? parsedRules : []);
      } catch (e) {
        setRulesList(selectedTag.rules ? [selectedTag.rules] : []);
      }
    } else {
      setDescription('');
      setRulesList([]);
    }
  }, [selectedTag]);

  // Calculate stats for a given strategy
  const getStrategyStats = (strategyName: string) => {
    const strategyTrades = trades.filter(t => t.strategy === strategyName);
    
    if (strategyTrades.length === 0) {
      return {
        tradesCount: 0,
        winRate: 0,
        totalPnL: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        expectancy: 0,
        tradesList: []
      };
    }

    const wins = strategyTrades.filter(t => t.profit_loss > 0);
    const losses = strategyTrades.filter(t => t.profit_loss < 0);
    
    const winRate = (wins.length / strategyTrades.length) * 100;
    const totalPnL = strategyTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    
    const totalWinVal = wins.reduce((sum, t) => sum + t.profit_loss, 0);
    const totalLossVal = Math.abs(losses.reduce((sum, t) => sum + t.profit_loss, 0));
    const profitFactor = totalLossVal > 0 ? totalWinVal / totalLossVal : totalWinVal > 0 ? 99.9 : 0;
    
    const avgWin = wins.length > 0 ? totalWinVal / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossVal / losses.length : 0;
    const expectancy = totalPnL / strategyTrades.length;

    return {
      tradesCount: strategyTrades.length,
      winRate,
      totalPnL,
      profitFactor,
      avgWin,
      avgLoss,
      expectancy,
      tradesList: strategyTrades
    };
  };

  // Stats for the active selected strategy tag
  const activeStats = useMemo(() => {
    if (!selectedTag) return null;
    return getStrategyStats(selectedTag.name);
  }, [selectedTag, trades]);

  // Filtered tags list by search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter(t => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  // Save description & rules to database
  const handleSaveStrategy = async () => {
    if (!selectedTagId) return;
    setIsSaving(true);
    try {
      const rulesString = JSON.stringify(rulesList);

      const { error } = await supabase
        .from('strategies')
        .update({
          description,
          rules: rulesString,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTagId);

      if (error) throw error;

      // Update local state
      setTags(prev => prev.map(t => t.id === selectedTagId ? { ...t, description, rules: rulesString } : t));
      toast.success('Strategy playbook updated!');
    } catch (err) {
      console.error('Error saving playbook:', err);
      toast.error('Failed to save playbook details.');
    } finally {
      setIsSaving(false);
    }
  };

  // Add rule to list
  const handleAddRule = () => {
    if (newRule.trim() === '') return;
    setRulesList(prev => [...prev, newRule.trim()]);
    setNewRule('');
  };

  // Remove rule from list
  const handleRemoveRule = (index: number) => {
    setRulesList(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Strategy Tag Creation
  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStratName.trim() || !user) return;
    setIsCreating(true);

    try {
      const nameLower = newStratName.trim().toLowerCase();
      const exists = tags.some(t => t.name.toLowerCase() === nameLower);
      if (exists) {
        toast.error('A strategy with this name already exists.');
        setIsCreating(false);
        return;
      }

      const { data, error } = await supabase
        .from('strategies')
        .insert({
          name: newStratName.trim(),
          color: newStratColor,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const created = data as unknown as StrategyTag;
      setTags(prev => [...prev, created]);
      setSelectedTagId(created.id);
      setNewStratName('');
      setShowAddModal(false);
      toast.success('New strategy playbook created!');
    } catch (err) {
      console.error('Error creating strategy tag:', err);
      toast.error('Failed to create strategy playbook.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Strategy Tag Deletion
  const executeDeleteStrategy = async () => {
    if (!selectedTagId) return;

    try {
      if (selectedTag) {
        await supabase
          .from('trades')
          .update({ strategy: null })
          .eq('strategy', selectedTag.name);
      }
      
      const { error } = await supabase.from('strategies').delete().eq('id', selectedTagId);
      if (error) throw error;

      toast.success('Strategy playbook deleted.');
      const remainingTags = tags.filter(t => t.id !== selectedTagId);
      setTags(remainingTags);
      
      if (remainingTags.length > 0) {
        setSelectedTagId(remainingTags[0].id);
      } else {
        setSelectedTagId(null);
      }
    } catch (err) {
      console.error('Error deleting strategy:', err);
      toast.error('Failed to delete strategy playbook.');
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-sm font-mono text-slate-400">Loading your playbook &amp; edge analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Trading Playbook &amp; Edge Catalog
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Define algorithmic and discretionary edges, enforce pre-trade execution rules, and monitor win-rate telemetry.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 flex items-center gap-2 self-start md:self-center hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Strategy</span>
        </button>
      </div>

      {tags.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 dark:border-white/[0.08] rounded-3xl p-8 bg-white dark:bg-[#0c0f1d] shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Create Your First Strategy Playbook</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1.5 mb-6 leading-relaxed">
            Document your core execution models (like Orderblock Sweeps, Breakouts, or Mean Reversions) to track real-time win rate, profit factor, and checklist adherence.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-all shadow-md active:scale-95"
          >
            Create Strategy
          </button>
        </div>
      ) : (
        /* 2-Column Institutional Terminal Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          
          {/* Left Strategy Catalog (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Playbook Catalog
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.06]">
                {tags.length} Models
              </span>
            </div>

            {/* Strategy Search if multiple */}
            {tags.length > 3 && (
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search strategies..."
                className="w-full bg-white dark:bg-[#0c0f1d] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            )}

            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              {filteredTags.map(tag => {
                const stats = getStrategyStats(tag.name);
                const isSelected = tag.id === selectedTagId;
                const pnlColors = getPLColorClasses(stats.totalPnL, colorblindMode);
                
                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`w-full text-left p-4 rounded-3xl border transition-all duration-200 relative overflow-hidden group shadow-sm ${
                      isSelected
                        ? 'bg-white dark:bg-[#121524] border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20'
                        : 'bg-white dark:bg-[#0c0f1d] border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.15] hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Glowing Left Indicator Strip */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 w-1.5" 
                      style={{ backgroundColor: tag.color || '#6366f1' }}
                    />
                    
                    <div className="pl-2.5">
                      <div className="flex justify-between items-start gap-2 mb-2.5">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {tag.name}
                        </span>
                        
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                          stats.winRate >= 60 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' 
                            : stats.winRate >= 45 
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                        }`}>
                          {stats.winRate.toFixed(0)}% WR
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          {stats.tradesCount} {stats.tradesCount === 1 ? 'trade' : 'trades'} logged
                        </span>
                        <span className={`text-sm font-black font-mono ${pnlColors.text}`}>
                          {stats.totalPnL > 0 ? '+' : ''}{formatCurrency(stats.totalPnL)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Strategy Workspace (8 cols) */}
          <div className="lg:col-span-8">
            {selectedTag && activeStats ? (
              <div className="rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c0f1d] shadow-xl space-y-7">
                
                {/* Workspace Header & Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-white/[0.06] pb-5">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm" 
                      style={{ backgroundColor: selectedTag.color || '#6366f1' }}
                    />
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {selectedTag.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 rounded-xl transition-all active:scale-95"
                    >
                      Delete Playbook
                    </button>
                    
                    <button
                      onClick={handleSaveStrategy}
                      disabled={isSaving}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      {isSaving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>

                {/* 4 Performance Telemetry Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Net Realized Profit',
                      value: formatCurrency(activeStats.totalPnL),
                      color: activeStats.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                      icon: activeStats.totalPnL >= 0 ? TrendingUp : TrendingDown,
                    },
                    {
                      label: 'Win Rate',
                      value: `${activeStats.winRate.toFixed(1)}%`,
                      color: activeStats.winRate >= 50 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400',
                      icon: Target,
                    },
                    {
                      label: 'Profit Factor',
                      value: activeStats.profitFactor.toFixed(2),
                      color: activeStats.profitFactor >= 1.5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white',
                      icon: BarChart3,
                    },
                    {
                      label: 'Expectancy / Trade',
                      value: formatCurrency(activeStats.expectancy),
                      color: activeStats.expectancy >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                      icon: Clock,
                    },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div 
                        key={i}
                        className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.04] bg-slate-50/70 dark:bg-white/[0.02] shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {stat.label}
                          </span>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xl font-black font-mono tracking-tight ${stat.color}`}>
                          {stat.value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Setup Rules & Strategy Description 2-Col Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Setup Rules & Entry Criteria Checklist */}
                  <div className="p-5 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        Setup Rules &amp; Entry Checklist
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                        {rulesList.length} Rules
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {rulesList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">
                          No entry criteria defined yet. Add rules below.
                        </p>
                      ) : (
                        rulesList.map((rule, idx) => (
                          <div 
                            key={idx}
                            className="flex justify-between items-center p-3 rounded-2xl bg-white dark:bg-[#121524] border border-slate-200/80 dark:border-white/[0.06] shadow-sm group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className="w-5 h-5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-mono font-black shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {rule}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRule(idx)}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick Add Rule Input */}
                    <div className="flex gap-2 pt-2 border-t border-slate-200/80 dark:border-white/[0.04]">
                      <input
                        type="text"
                        value={newRule}
                        onChange={e => setNewRule(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddRule(); } }}
                        placeholder="Add new rule..."
                        className="flex-1 bg-white dark:bg-[#121524] border border-slate-200/80 dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                      <button
                        type="button"
                        onClick={handleAddRule}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Strategy Description Specification */}
                  <div className="p-5 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      Strategy Specification &amp; Logic
                    </h3>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Document setup logic, timeframe parameters, invalidation points, and target criteria..."
                      rows={9}
                      className="w-full bg-white dark:bg-[#121524] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 leading-relaxed shadow-inner"
                    />
                  </div>
                </div>

                {/* Strategy Trades Execution Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      Strategy Executions ({activeStats.tradesList.length})
                    </h3>
                  </div>

                  <div className="border border-slate-200/80 dark:border-white/[0.06] rounded-3xl overflow-hidden bg-white dark:bg-[#0c0f1d] shadow-sm">
                    {activeStats.tradesList.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400 italic">
                        No trades tagged with this strategy yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[340px]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/80 dark:bg-white/[0.02]">
                              <th className="py-3.5 px-4">Date</th>
                              <th className="py-3.5 px-4">Asset</th>
                              <th className="py-3.5 px-4 text-center">Type</th>
                              <th className="py-3.5 px-4 text-right">Volume</th>
                              <th className="py-3.5 px-4 text-right">P&amp;L</th>
                              <th className="py-3.5 px-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                            {activeStats.tradesList.map(trade => {
                              const tradePnL = trade.profit_loss ?? 0;
                              const pnlColors = getPLColorClasses(tradePnL, colorblindMode);
                              const isLong = trade.type === 'Long';
                              
                              return (
                                <tr 
                                  key={trade.id} 
                                  onClick={() => setActiveTrade(trade)}
                                  className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] cursor-pointer transition-colors duration-150 group"
                                >
                                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                                    {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </td>
                                  <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                                    {trade.symbol}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase ${
                                      isLong ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {trade.type}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400">
                                    {trade.lots ? `${trade.lots} Lot` : '—'}
                                  </td>
                                  <td className="py-3 px-4 text-right font-black font-mono">
                                    <span className={pnlColors.text}>
                                      {tradePnL > 0 ? '+' : ''}{formatCurrency(tradePnL)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center justify-center gap-0.5">
                                      View <ArrowUpRight className="w-3 h-3" />
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[50vh] text-slate-400 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-3xl bg-white dark:bg-[#0c0f1d]">
                Select a strategy to view playbook workspace
              </div>
            )}
          </div>

        </div>
      )}

      {/* Trade Detail Modal Popup */}
      {activeTrade && (
        <TradeDetail 
          trade={activeTrade} 
          onClose={() => {
            setActiveTrade(null);
            loadData();
          }} 
        />
      )}

      {/* Add Strategy Modal Popup */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xl flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl bg-white dark:bg-[#0c0f1d] text-slate-900 dark:text-white"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Create Strategy Playbook
              </h2>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateStrategy} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Strategy Name
                </label>
                <input
                  type="text"
                  required
                  value={newStratName}
                  onChange={e => setNewStratName(e.target.value)}
                  placeholder="e.g. ICT Orderblock Sweep"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-white/[0.08] rounded-2xl text-sm bg-slate-50/80 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Accent Color
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="color"
                    value={newStratColor}
                    onChange={e => setNewStratColor(e.target.value)}
                    className="w-12 h-10 border border-slate-200 dark:border-white/[0.08] rounded-xl cursor-pointer p-1 bg-slate-50 dark:bg-white/[0.03]"
                  />
                  <input
                    type="text"
                    value={newStratColor}
                    onChange={e => setNewStratColor(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/[0.08] rounded-2xl text-xs font-mono bg-slate-50/80 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-white/[0.04] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  {isCreating ? 'Creating...' : 'Create Strategy'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Strategy Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-[#0c0f1d] border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-2xl max-w-md w-full text-center space-y-4 text-slate-900 dark:text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete Strategy Playbook?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete this strategy playbook? Linked trades will not be deleted, but their strategy tag will be unassigned.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all border border-slate-200 dark:border-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  executeDeleteStrategy();
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
