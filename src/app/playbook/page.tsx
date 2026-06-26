'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Trade } from '@/lib/types';
import { getPLColorClasses } from '@/lib/utils';
import { formatPips } from '@/lib/forexUtils';
import { useSettings } from '@/providers/SettingsProvider';
import TradeDetail from '@/components/trades/TradeDetail';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Strategy form states
  const [description, setDescription] = useState('');
  const [rulesList, setRulesList] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New Strategy Tag form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStratName, setNewStratName] = useState('');
  const [newStratColor, setNewStratColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);

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

      setTags((strategiesData as unknown as StrategyTag[]) || []);
      setTrades(tradesWithTags);

      // Auto-select first strategy if none selected
      if (strategiesData && strategiesData.length > 0 && !selectedTagId) {
        setSelectedTagId(strategiesData[0].id);
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
        // Fallback if rules is stored as plain text
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

    return {
      tradesCount: strategyTrades.length,
      winRate,
      totalPnL,
      profitFactor,
      avgWin,
      avgLoss,
      tradesList: strategyTrades
    };
  };

  // Stats for the active selected strategy tag
  const activeStats = useMemo(() => {
    if (!selectedTag) return null;
    return getStrategyStats(selectedTag.name);
  }, [selectedTag, trades]);

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
      // Check if tag name already exists
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
  const handleDeleteStrategy = async () => {
    if (!selectedTagId) return;
    if (!confirm('Are you sure you want to delete this strategy playbook? Linked trades will not be deleted, but their strategy field will be cleared.')) return;

    try {
      // 1. Clear strategy from trades that had it
      if (selectedTag) {
        await supabase
          .from('trades')
          .update({ strategy: null })
          .eq('strategy', selectedTag.name);
      }
      
      // 2. Delete strategy itself
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
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading your playbook...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <svg className="w-7 h-7 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Trading Playbook
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Define strategies, write rules/checklists, and analyze performance metrics for your playbook.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
          Add Strategy
        </button>
      </div>

      {tags.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-16 text-center border border-black/[0.06] dark:border-slate-800 rounded-3xl p-8"
          style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="w-16 h-16 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center mb-5 text-slate-500 shadow-xl shadow-black/10"
            style={{ backgroundColor: 'var(--table-header-bg)' }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Create your first strategy</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-2 mb-6">
            Document your playbook strategies (like Breakouts, Trend trades, or Range reversals) to track their win rate and check off rules before entering.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all"
          >
            Get Started
          </button>
        </div>
      ) : (
        // Grid Workspace Layout
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Strategy list */}
          <div className="lg:col-span-1 space-y-3.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Playbook Catalog</div>
            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
              {tags.map(tag => {
                const stats = getStrategyStats(tag.name);
                const isSelected = tag.id === selectedTagId;
                const pnlColors = getPLColorClasses(stats.totalPnL, colorblindMode);
                
                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                      isSelected
                        ? 'border-indigo-500/50 shadow-lg shadow-indigo-950/10'
                        : 'border-black/[0.06] dark:border-white/[0.04] hover:border-indigo-300/50 dark:hover:border-white/[0.08]'
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--table-header-bg)'
                        : 'var(--card-bg)',
                    }}
                  >
                    {/* Tag Indicator Line */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 w-1.5" 
                      style={{ backgroundColor: tag.color || '#3b82f6' }}
                    />
                    
                    <div className="pl-2">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="font-bold text-base group-hover:text-indigo-500 transition-colors" style={{ color: 'var(--foreground)' }}>
                          {tag.name}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          stats.winRate >= 60 ? 'bg-emerald-500/10 text-emerald-500' : stats.winRate >= 50 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {stats.winRate.toFixed(0)}% WR
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-slate-400">
                          {stats.tradesCount} trades logged
                        </div>
                        <div className={`text-sm font-bold ${pnlColors.text}`}>
                          {stats.totalPnL > 0 ? '+' : ''}{formatCurrency(stats.totalPnL)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right strategy detail workspace */}
          <div className="lg:col-span-2">
            {selectedTag && activeStats ? (
              <div className="rounded-3xl p-6 lg:p-8 border border-black/[0.06] dark:border-white/[0.04] shadow-xl shadow-black/10"
                style={{ backgroundColor: 'var(--card-bg)' }}>
                
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/[0.06] dark:border-white/[0.06] pb-5 mb-6">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow" 
                      style={{ backgroundColor: selectedTag.color || '#3b82f6' }}
                    />
                    <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{selectedTag.name} Workspace</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDeleteStrategy}
                      className="text-xs text-red-500 hover:text-red-600 px-3 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl transition-all"
                    >
                      Delete Playbook
                    </button>
                    <button
                      onClick={handleSaveStrategy}
                      disabled={isSaving}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow"
                    >
                      {isSaving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                      )}
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Metrics Stats Banner */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    {
                      label: 'Net Profit',
                      value: <span className={getPLColorClasses(activeStats.totalPnL, colorblindMode).text}>
                        {activeStats.totalPnL > 0 ? '+' : ''}{formatCurrency(activeStats.totalPnL)}
                      </span>
                    },
                    {
                      label: 'Win Rate',
                      value: <span className="text-indigo-500">{activeStats.winRate.toFixed(1)}%</span>
                    },
                    {
                      label: 'Profit Factor',
                      value: <span style={{ color: 'var(--foreground)' }}>{activeStats.profitFactor.toFixed(2)}</span>
                    },
                    {
                      label: 'Average P&L',
                      value: <span style={{ color: 'var(--foreground)' }}>
                        {activeStats.tradesCount > 0 ? formatCurrency(activeStats.totalPnL / activeStats.tradesCount) : '$0.00'}
                      </span>
                    },
                  ].map((stat, i) => (
                    <div key={i}
                      className="border border-black/[0.06] dark:border-white/[0.04] p-4 rounded-2xl text-center"
                      style={{ backgroundColor: 'var(--table-header-bg)' }}
                    >
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{stat.label}</div>
                      <div className="text-lg font-bold">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-8">
                  {/* Setup Rules List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                        Setup Rules / Checklist
                      </h3>
                      <span className="text-[10px] text-slate-400 font-bold px-2 py-0.5 rounded-full border border-black/[0.06] dark:border-white/[0.04]"
                        style={{ backgroundColor: 'var(--table-header-bg)' }}>
                        {rulesList.length} criteria
                      </span>
                    </div>

                    <div className="border border-black/[0.06] dark:border-white/[0.04] p-4 rounded-2xl space-y-3.5 min-h-[220px]"
                      style={{ backgroundColor: 'var(--table-header-bg)' }}>
                      {rulesList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-8 text-center">No entry criteria documented yet. Add some rules below!</p>
                      ) : (
                        <div className="space-y-2.5">
                          {rulesList.map((rule, idx) => (
                            <div key={idx}
                              className="flex justify-between items-center border border-black/[0.04] dark:border-white/[0.02] p-2.5 rounded-xl group/item"
                              style={{ backgroundColor: 'var(--card-bg)' }}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-5 h-5 rounded-md border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center text-[10px] font-bold text-indigo-500">
                                  {idx + 1}
                                </div>
                                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{rule}</span>
                              </div>
                              <button
                                onClick={() => handleRemoveRule(idx)}
                                className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                title="Remove rule"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rule Input */}
                      <div className="flex gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.04]">
                        <input
                          type="text"
                          value={newRule}
                          onChange={e => setNewRule(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddRule(); } }}
                          placeholder="Add new rule..."
                          className="flex-1 px-3 py-2 border border-black/[0.08] dark:border-white/[0.06] rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--foreground)' }}
                        />
                        <button
                          type="button"
                          onClick={handleAddRule}
                          className="px-3 py-2 border border-black/[0.08] dark:border-white/[0.06] rounded-xl text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-white transition-colors"
                          style={{ backgroundColor: 'var(--card-bg)' }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Description */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                      Strategy Description
                    </h3>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Write notes about this strategy. When does it work best? What market conditions? What are the targets and invalidation points?"
                      className="w-full h-[220px] border border-black/[0.08] dark:border-white/[0.04] rounded-2xl p-4 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500/40 resize-none font-medium leading-relaxed"
                      style={{ backgroundColor: 'var(--table-header-bg)', color: 'var(--foreground)' }}
                    />
                  </div>
                </div>

                {/* Logged Trades Table */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                    Strategy Trades ({activeStats.tradesList.length})
                  </h3>

                  <div className="border border-black/[0.06] dark:border-white/[0.04] rounded-2xl overflow-hidden"
                    style={{ backgroundColor: 'var(--card-bg)' }}>
                    {activeStats.tradesList.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 italic">No trades tagged with this strategy yet.</div>
                    ) : (
                      <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-black/[0.06] dark:border-white/[0.04] text-slate-400 font-bold uppercase tracking-wider"
                              style={{ backgroundColor: 'var(--table-header-bg)' }}>
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4">Asset</th>
                              <th className="py-3 px-4 text-center">Type</th>
                              <th className="py-3 px-4 text-right">Pips/Points</th>
                              <th className="py-3 px-4 text-right">P&L</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.02]">
                            {activeStats.tradesList.map(trade => {
                              const tradePnL = trade.profit_loss ?? 0;
                              const pnlColors = getPLColorClasses(tradePnL, colorblindMode);
                              const typeColors = trade.type === 'Long' ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10';
                              
                              return (
                                <tr 
                                  key={trade.id} 
                                  onClick={() => setActiveTrade(trade)}
                                  className="hover:bg-indigo-500/[0.03] cursor-pointer transition-colors duration-150"
                                >
                                  <td className="py-3.5 px-4 font-medium text-slate-400">
                                    {new Date(trade.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </td>
                                  <td className="py-3.5 px-4 font-bold" style={{ color: 'var(--foreground)' }}>{trade.symbol}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${typeColors}`}>
                                      {trade.type}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-semibold text-slate-400 font-mono">
                                    {trade.pips !== undefined && trade.pips !== null ? formatPips(trade.pips) : '—'}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-bold font-mono">
                                    <span 
                                      className="px-2 py-0.5 rounded-md"
                                      style={{ color: pnlColors.hexColor, backgroundColor: pnlColors.hexBg }}
                                    >
                                      {tradePnL > 0 ? '+' : ''}{formatCurrency(tradePnL)}
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
              <div className="flex items-center justify-center min-h-[50vh] text-slate-400 border border-black/[0.06] dark:border-slate-800 rounded-3xl border-dashed"
                style={{ backgroundColor: 'var(--card-bg)' }}>
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
            loadData(); // reload stats in case trade tags changed in detail
          }} 
        />
      )}

      {/* Add Strategy Modal Popup */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-black/[0.08] dark:border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Create Strategy Playbook</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateStrategy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Strategy Name</label>
                <input
                  type="text"
                  required
                  value={newStratName}
                  onChange={e => setNewStratName(e.target.value)}
                  placeholder="e.g. Trendline Bounce, VWAP Break"
                  className="w-full px-4 py-2.5 border border-black/[0.08] dark:border-white/[0.06] rounded-xl text-base placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  style={{ backgroundColor: 'var(--table-header-bg)', color: 'var(--foreground)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Color Code</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newStratColor}
                    onChange={e => setNewStratColor(e.target.value)}
                    className="w-12 h-10 border border-black/[0.08] dark:border-white/[0.06] rounded-xl cursor-pointer p-1"
                    style={{ backgroundColor: 'var(--table-header-bg)' }}
                  />
                  <input
                    type="text"
                    value={newStratColor}
                    onChange={e => setNewStratColor(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-black/[0.08] dark:border-white/[0.06] rounded-xl text-base font-mono focus:outline-none"
                    style={{ backgroundColor: 'var(--table-header-bg)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.04] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-black/[0.08] dark:border-white/[0.06] text-slate-500 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                  style={{ backgroundColor: 'var(--table-header-bg)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
