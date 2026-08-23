'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sun, 
  Moon, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Star, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Target, 
  Layers, 
  Calendar, 
  Zap, 
  ShieldCheck, 
  Save, 
  Sparkles,
  Link2,
  AlertCircle
} from 'lucide-react';

export interface JournalEntry {
  id?: string;
  user_id: string;
  date: string;
  market_bias: 'Bullish' | 'Bearish' | 'Neutral';
  confidence_rating: number; // 1-5
  daily_goal?: string;
  key_levels?: string;
  economic_notes?: string;
  discipline_grade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  post_market_reflection?: string;
  rules_checklist?: { text: string; checked: boolean }[];
  chart_url?: string;
  created_at?: string;
}

interface DailyPrepFormProps {
  date: string;
  tradesCount: number;
  netPnL: number;
  onSaved?: () => void;
}

const DEFAULT_RULES = [
  { text: 'Checked 4H / 1H higher timeframe market structure & trend', checked: false },
  { text: 'Reviewed economic calendar for high-impact red folder news', checked: false },
  { text: 'Defined max daily loss stop ($500 / 1% equity cap)', checked: false },
  { text: 'Confirmed minimum 1:2 Risk-to-Reward ratio before entry', checked: false },
];

const PRE_MARKET_PROMPTS = [
  'Only take setups at key 15m orderblocks',
  'No entries before 9:30 AM NY Open',
  'Max 2 executions today',
  'Wait for liquidity sweep before entering',
];

const LEVEL_PROMPTS = [
  'PDH / PDL Liquidity',
  'Asia Session Range Sweep',
  '1H Fair Value Gap (FVG)',
  'Daily Orderblock',
];

const POST_MARKET_PROMPTS = [
  'Followed trade plan 100%',
  'Cut losers quickly with zero hesitation',
  'Felt slight FOMO on the morning breakout',
  'Great patience waiting for confirmation',
];

export default function DailyPrepForm({ date, tradesCount, netPnL, onSaved }: DailyPrepFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pre-market' | 'post-market'>('pre-market');

  const [marketBias, setMarketBias] = useState<'Bullish' | 'Bearish' | 'Neutral'>('Neutral');
  const [confidence, setConfidence] = useState(3);
  const [dailyGoal, setDailyGoal] = useState('');
  const [keyLevels, setKeyLevels] = useState('');
  const [economicNotes, setEconomicNotes] = useState('');
  const [disciplineGrade, setDisciplineGrade] = useState<'A+' | 'A' | 'B' | 'C' | 'D' | 'F'>('A');
  const [reflection, setReflection] = useState('');
  const [chartUrl, setChartUrl] = useState('');
  const [showAddRuleInput, setShowAddRuleInput] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');

  const [checklist, setChecklist] = useState<{ text: string; checked: boolean }[]>(DEFAULT_RULES);

  // Fetch journal entry for selected date
  useEffect(() => {
    async function loadJournalEntry() {
      if (!user) return;
      setLoading(true);
      try {
        const { data } = await (supabase.from as any)('daily_journals')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', date)
          .maybeSingle();

        if (data) {
          setMarketBias(data.market_bias || 'Neutral');
          setConfidence(data.confidence_rating || 3);
          setDailyGoal(data.daily_goal || '');
          setKeyLevels(data.key_levels || '');
          setEconomicNotes(data.economic_notes || '');
          setDisciplineGrade(data.discipline_grade || 'A');
          setReflection(data.post_market_reflection || '');
          setChartUrl(data.chart_url || '');
          if (data.rules_checklist && Array.isArray(data.rules_checklist) && data.rules_checklist.length > 0) {
            setChecklist(data.rules_checklist);
          } else {
            setChecklist(DEFAULT_RULES);
          }
        } else {
          setMarketBias('Neutral');
          setConfidence(3);
          setDailyGoal('');
          setKeyLevels('');
          setEconomicNotes('');
          setDisciplineGrade('A');
          setReflection('');
          setChartUrl('');
          setChecklist(DEFAULT_RULES);
        }
      } catch (err) {
        console.error('Failed to load journal entry:', err);
      } finally {
        setLoading(false);
      }
    }

    loadJournalEntry();
  }, [user, date]);

  const handleToggleChecklist = (index: number) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleAddChecklistItem = () => {
    if (!newRuleText.trim()) return;
    setChecklist((prev) => [...prev, { text: newRuleText.trim(), checked: false }]);
    setNewRuleText('');
    setShowAddRuleInput(false);
    toast.success('Discipline rule added');
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  const completedRulesCount = checklist.filter((c) => c.checked).length;
  const checklistPct = checklist.length > 0 ? Math.round((completedRulesCount / checklist.length) * 100) : 0;

  const handleSaveJournal = async () => {
    if (!user) {
      toast.error('You must be logged in to save journal entries');
      return;
    }

    setSaving(true);
    try {
      const payload: JournalEntry = {
        user_id: user.id,
        date,
        market_bias: marketBias,
        confidence_rating: confidence,
        daily_goal: dailyGoal,
        key_levels: keyLevels,
        economic_notes: economicNotes,
        discipline_grade: disciplineGrade,
        post_market_reflection: reflection,
        rules_checklist: checklist,
        chart_url: chartUrl,
      };

      const { error } = await (supabase.from as any)('daily_journals')
        .upsert(payload, { onConflict: 'user_id,date' });

      if (error) {
        localStorage.setItem(`journal_${user.id}_${date}`, JSON.stringify(payload));
      }

      toast.success(`Session journal saved for ${date}`);
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error('Error saving journal:', err);
      localStorage.setItem(`journal_${user?.id}_${date}`, JSON.stringify({
        market_bias: marketBias,
        confidence_rating: confidence,
        daily_goal: dailyGoal,
        key_levels: keyLevels,
        economic_notes: economicNotes,
        discipline_grade: disciplineGrade,
        post_market_reflection: reflection,
        rules_checklist: checklist,
        chart_url: chartUrl,
      }));
      toast.success(`Journal entry saved locally for ${date}`);
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceLabel = (rating: number) => {
    switch (rating) {
      case 1: return '1/5 · Defensive / Cautious';
      case 2: return '2/5 · Weak Setup Conviction';
      case 3: return '3/5 · Moderate Conviction';
      case 4: return '4/5 · High Probability Setup';
      case 5: return '5/5 · A+ Prime Conviction';
      default: return 'Conviction Rating';
    }
  };

  const getGradeDesc = (grade: string) => {
    switch (grade) {
      case 'A+': return 'Flawless Execution & Risk Discipline';
      case 'A':  return 'Followed Plan & Respected Risk Limits';
      case 'B':  return 'Good Session with Minor Hesitation';
      case 'C':  return 'Average Session, Slipped on Minor Rules';
      case 'D':  return 'Rule Breach / Impulsive Entries';
      case 'F':  return 'Tilt, Revenge Trading, or Oversized';
      default:   return '';
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400 font-mono text-xs animate-pulse bg-white dark:bg-[#0c0f1d] rounded-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
        <Sparkles className="w-6 h-6 mx-auto mb-3 text-indigo-500 animate-spin" />
        Loading session prep &amp; macro intelligence for {date}...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0c0f1d] border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 text-slate-900 dark:text-slate-100 shadow-xl space-y-7 font-sans">
      
      {/* Top Session Telemetry Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Macro Prep &amp; Execution Hub
            </h2>
            <span className="text-xs px-3 py-1 rounded-xl font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
              {date}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Pre-market bias, economic events, technical levels, and disciplined execution debrief.
          </p>
        </div>

        {/* Trade & P&L Summary Micro-Pill */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] px-4 py-2.5 rounded-2xl text-xs font-mono self-start lg:self-center shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-500 uppercase font-bold text-[10px]">Trades</span>
            <span className="text-slate-900 dark:text-white font-black text-sm">{tradesCount}</span>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-500 uppercase font-bold text-[10px]">Net P&amp;L</span>
            <span className={`font-black text-sm ${netPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Modern Segmented Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-4">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveTab('pre-market')}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'pre-market'
                ? 'bg-white dark:bg-[#181c2e] text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-white/[0.08]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sun className={`w-4 h-4 ${activeTab === 'pre-market' ? 'text-amber-500' : 'text-slate-400'}`} />
            <span>1. Pre-Market Preparation</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('post-market')}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'post-market'
                ? 'bg-white dark:bg-[#181c2e] text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-white/[0.08]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Moon className={`w-4 h-4 ${activeTab === 'post-market' ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span>2. Post-Market Review</span>
          </button>
        </div>

        {/* Readiness Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Plan Readiness:</span>
          <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
            checklistPct === 100
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : checklistPct >= 50
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
          }`}>
            {checklistPct}% Ready
          </span>
        </div>
      </div>

      {/* ─── TAB 1: PRE-MARKET PREPARATION ─── */}
      {activeTab === 'pre-market' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Bias & Conviction Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Session Market Bias (7 cols) */}
            <div className="lg:col-span-7 bg-slate-50/70 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Session Market Bias
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'Bullish', label: 'Bullish Bias', sub: 'Long Setups', icon: TrendingUp, color: 'emerald' },
                  { id: 'Bearish', label: 'Bearish Bias', sub: 'Short Setups', icon: TrendingDown, color: 'rose' },
                  { id: 'Neutral', label: 'Neutral / Range', sub: 'Defensive Mode', icon: Activity, color: 'indigo' },
                ].map((b) => {
                  const isSel = marketBias === b.id;
                  const Icon = b.icon;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setMarketBias(b.id as any)}
                      className={`p-3.5 rounded-2xl text-xs font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                        isSel
                          ? b.color === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                            : b.color === 'rose'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/50 shadow-md shadow-rose-500/10'
                            : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                          : 'bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${
                        isSel
                          ? b.color === 'emerald' ? 'text-emerald-500' : b.color === 'rose' ? 'text-rose-500' : 'text-indigo-500'
                          : 'text-slate-400'
                      }`} />
                      <span className="font-extrabold">{b.label}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{b.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bias Conviction Rating (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/70 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200/80 dark:border-white/[0.06] space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Conviction Meter
                </label>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {getConfidenceLabel(confidence)}
                </span>
              </div>

              {/* 5-Star Segmented Meter */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setConfidence(star)}
                    aria-label={`Set conviction level ${star} of 5`}
                    className={`flex-1 py-3 rounded-2xl transition-all duration-200 flex justify-center items-center active:scale-95 border ${
                      star <= confidence
                        ? 'text-amber-400 bg-amber-500/15 border-amber-500/40 shadow-sm shadow-amber-500/10'
                        : 'text-slate-300 dark:text-slate-600 bg-white dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.06] hover:text-slate-400'
                    }`}
                  >
                    <Star className={`w-5 h-5 ${star <= confidence ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>

              <div className="w-full bg-slate-200 dark:bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${(confidence / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Goals & Key Technical Levels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Daily Process Goal */}
            <div className="p-5 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  Daily Process Goal &amp; Execution Plan
                </label>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap gap-1.5">
                {PRE_MARKET_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setDailyGoal((prev) => (prev ? `${prev}\n• ${prompt}` : `• ${prompt}`))}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-medium transition-colors text-left"
                  >
                    + {prompt}
                  </button>
                ))}
              </div>

              <textarea
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                placeholder="Structure your session rules. What setups are valid? What timeframes? E.g. Only take setups on 15m orderblocks after 9:30 AM open..."
                rows={3}
                className="w-full bg-white dark:bg-[#121524] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner leading-relaxed"
              />
            </div>

            {/* Key Technical Levels */}
            <div className="p-5 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Key Technical Levels &amp; Liquidity Pools
                </label>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap gap-1.5">
                {LEVEL_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setKeyLevels((prev) => (prev ? `${prev} | ${prompt}` : prompt))}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-medium transition-colors text-left"
                  >
                    + {prompt}
                  </button>
                ))}
              </div>

              <textarea
                value={keyLevels}
                onChange={(e) => setKeyLevels(e.target.value)}
                placeholder="EURUSD Key Levels: 1.0820 Support, 1.0895 FVG. NQ Liquidity: 20,450 PDH sweep..."
                rows={3}
                className="w-full bg-white dark:bg-[#121524] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all shadow-inner leading-relaxed"
              />
            </div>
          </div>

          {/* Economic Calendar Events */}
          <div className="p-5 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Economic Calendar Events &amp; Macro Drivers
            </label>
            <textarea
              value={economicNotes}
              onChange={(e) => setEconomicNotes(e.target.value)}
              placeholder="e.g. 8:30 AM Core CPI Release (High Impact) · 2:00 PM FOMC Minutes · Expect elevated volatility during NY open..."
              rows={2}
              className="w-full bg-white dark:bg-[#121524] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner leading-relaxed"
            />
          </div>

          {/* Discipline Rules Checklist */}
          <div className="bg-slate-50/70 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200/80 dark:border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Session Discipline Rules Checklist
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Completed {completedRulesCount} of {checklist.length} rules ({checklistPct}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRuleInput(!showAddRuleInput)}
                className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden p-0.5">
              <div
                style={{ width: `${checklistPct}%` }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              />
            </div>

            {/* Quick Add Inline Rule Input */}
            {showAddRuleInput && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  placeholder="Enter custom discipline rule..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                  className="flex-1 bg-white dark:bg-[#121524] border border-slate-200 dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95"
                >
                  Save Rule
                </button>
              </motion.div>
            )}

            {/* Checklist Items */}
            <div className="space-y-2.5">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 shadow-sm ${
                    item.checked
                      ? 'bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08] border-emerald-500/30'
                      : 'bg-white dark:bg-[#121524] border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12]'
                  }`}
                >
                  <label className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggleChecklist(idx)}
                      className="w-4 h-4 rounded text-emerald-600 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <span className={`text-xs font-semibold truncate ${item.checked ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.text}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(idx)}
                    className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Remove Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── TAB 2: POST-MARKET REVIEW ─── */}
      {activeTab === 'post-market' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Discipline Execution Grade */}
          <div className="bg-slate-50/70 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200/80 dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Session Execution Grade
              </label>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                {getGradeDesc(disciplineGrade)}
              </span>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
              {(['A+', 'A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
                const isSel = disciplineGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setDisciplineGrade(grade)}
                    className={`py-3.5 rounded-2xl text-sm font-black font-mono border transition-all duration-200 active:scale-95 shadow-sm ${
                      isSel
                        ? grade.startsWith('A')
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/15'
                          : grade === 'B' || grade === 'C'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/15'
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50 shadow-md shadow-rose-500/15'
                        : 'bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300'
                    }`}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post-Market Reflection */}
          <div className="p-5 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-500" />
                Post-Market Reflection &amp; Behavioral Review
              </label>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5">
              {POST_MARKET_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setReflection((prev) => (prev ? `${prev}\n• ${prompt}` : `• ${prompt}`))}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-medium transition-colors text-left"
                >
                  + {prompt}
                </button>
              ))}
            </div>

            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Reflect honestly on today's trading. Did you stick to your plan? Were stops respected? What psychological lessons did you learn for tomorrow?"
              rows={5}
              className="w-full bg-white dark:bg-[#121524] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner leading-relaxed"
            />
          </div>

          {/* Chart Screenshot Link Input */}
          <div className="p-5 rounded-3xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Link2 className="w-4 h-4 text-slate-400" />
              TradingView / Chart Screenshot Link (Optional)
            </label>
            <input
              type="text"
              value={chartUrl}
              onChange={(e) => setChartUrl(e.target.value)}
              placeholder="https://www.tradingview.com/x/..."
              className="w-full bg-white dark:bg-[#121524] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono shadow-inner"
            />
          </div>
        </motion.div>
      )}

      {/* Bottom Save Action Bar */}
      <div className="pt-6 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Auto-syncs with your TradeTrackr cloud account
        </span>
        
        <button
          type="button"
          onClick={handleSaveJournal}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black tracking-wide rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Session Journal'}</span>
        </button>
      </div>
    </div>
  );
}
