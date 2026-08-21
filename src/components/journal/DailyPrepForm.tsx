'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Star, X, Check } from 'lucide-react';

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

  const [checklist, setChecklist] = useState<{ text: string; checked: boolean }[]>([
    { text: 'Checked 4H/1H higher timeframe market structure', checked: false },
    { text: 'Reviewed economic calendar for high-impact news', checked: false },
    { text: 'Maximum daily loss limit defined ($500 / 1%)', checked: false },
    { text: 'Max 3 trades limit set for today session', checked: false },
  ]);

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
          if (data.rules_checklist && Array.isArray(data.rules_checklist)) {
            setChecklist(data.rules_checklist);
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
      case 1: return 'Low Conviction (Caution)';
      case 2: return 'Weak Bias';
      case 3: return 'Moderate Conviction';
      case 4: return 'High Conviction';
      case 5: return 'A+ Ultra High Conviction';
      default: return 'Conviction Rating';
    }
  };

  const getGradeDesc = (grade: string) => {
    switch (grade) {
      case 'A+': return 'Flawless Execution & Risk Discipline';
      case 'A':  return 'Followed Plan & Sticking to Rules';
      case 'B':  return 'Good Session with Minor Hesitation';
      case 'C':  return 'Average Session, Minor Impatience';
      case 'D':  return 'Rule Breach / Poor Execution';
      case 'F':  return 'Revenge Traded or Oversized';
      default:   return '';
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-mono text-xs animate-pulse bg-white dark:bg-[var(--surface-1)] rounded-3xl border border-slate-200 dark:border-white/[0.08]">
        Loading prep journal for {date}...
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-[var(--surface-1)] border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 text-slate-900 dark:text-slate-100 shadow-xl backdrop-blur-xl space-y-6 font-sans">
      
      {/* Top Session Metrics Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Macro Prep & Session Execution
            </h2>
            <span className="text-xs px-3 py-1 rounded-full font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {date}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pre-market bias, economic events, technical levels, and post-market review.
          </p>
        </div>

        {/* Trade & P&L Summary Badge */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] px-4 py-2.5 rounded-2xl text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Trades:</span>
            <span className="text-slate-900 dark:text-white font-extrabold">{tradesCount}</span>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Net P&L:</span>
            <span className={`font-extrabold ${netPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Modern Tab Bar Switcher */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pre-market')}
            className={`px-5 py-2.5 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 ${
              activeTab === 'pre-market'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>1. Pre-Market Preparation</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('post-market')}
            className={`px-5 py-2.5 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 ${
              activeTab === 'post-market'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span>2. Post-Market Review</span>
          </button>
        </div>

        {/* Readiness Pill */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Discipline Score:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
            {checklistPct}% Ready
          </span>
        </div>
      </div>

      {/* TAB 1: PRE-MARKET PREPARATION */}
      {activeTab === 'pre-market' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Market Bias & Conviction Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Market Bias Cards */}
            <div className="bg-slate-50/70 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Session Market Bias
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'Bullish', label: 'Bullish', icon: '▲', color: 'emerald' },
                  { id: 'Bearish', label: 'Bearish', icon: '▼', color: 'rose' },
                  { id: 'Neutral', label: 'Neutral', icon: '◄ ►', color: 'indigo' },
                ].map((b) => {
                  const isSel = marketBias === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setMarketBias(b.id as any)}
                      className={`py-3 px-2 rounded-xl text-xs font-extrabold border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                        isSel
                          ? b.color === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 ring-2 ring-emerald-500/20 shadow-md'
                            : b.color === 'rose'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-2 ring-rose-500/20 shadow-md'
                            : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/50 ring-2 ring-indigo-500/20 shadow-md'
                          : 'bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <span className="text-sm font-black">{b.icon}</span>
                      <span>{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bias Conviction Rating */}
            <div className="bg-slate-50/70 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Bias Conviction Rating
                </label>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {getConfidenceLabel(confidence)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setConfidence(star)}
                    aria-label={`Rate conviction ${star} out of 5 stars`}
                    className={`flex-1 py-2.5 rounded-xl transition-all duration-200 flex justify-center items-center ${
                      star <= confidence
                        ? 'text-amber-400 bg-amber-500/15 border border-amber-500/40 shadow-sm shadow-amber-500/10 scale-[1.02]'
                        : 'text-slate-300 dark:text-slate-700 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] hover:text-slate-400 dark:hover:text-slate-500'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Goals & Key Technical Levels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Daily Process Goal */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Daily Process Goal & Plan
              </label>
              <textarea
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                placeholder="e.g. Only take setups on 15m orderblocks. Do not trade before 9:30 AM EST open..."
                rows={3}
                className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Key Technical Levels */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Key Technical Levels
              </label>
              <textarea
                value={keyLevels}
                onChange={(e) => setKeyLevels(e.target.value)}
                placeholder="e.g. EURUSD Support: 1.0820, Resistance: 1.0890. XAUUSD Liquidity Pool: 2365..."
                rows={3}
                className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
              />
            </div>
          </div>

          {/* Economic Calendar Events */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Economic Calendar Events & Macro Drivers
            </label>
            <textarea
              value={economicNotes}
              onChange={(e) => setEconomicNotes(e.target.value)}
              placeholder="e.g. 8:30 AM Core CPI release (High impact). CPI expected 0.3% MoM..."
              rows={2}
              className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Discipline Rules Checklist & Live Progress Bar */}
          <div className="bg-slate-50/70 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Session Discipline Rules Checklist
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Completed {completedRulesCount} of {checklist.length} rules ({checklistPct}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRuleInput(!showAddRuleInput)}
                className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-1"
              >
                + Add Rule
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                style={{ width: `${checklistPct}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              />
            </div>

            {/* Quick Add Inline Rule Input */}
            {showAddRuleInput && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  placeholder="Enter custom discipline rule..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                  className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-500 transition-all"
                >
                  Add
                </button>
              </div>
            )}

            {/* Checklist Items */}
            <div className="space-y-2.5">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                    item.checked
                      ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border-emerald-500/30'
                      : 'bg-white dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12]'
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
                    className="text-slate-400 hover:text-rose-500 p-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
                    title="Remove Rule"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: POST-MARKET REVIEW */}
      {activeTab === 'post-market' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Discipline Execution Grade */}
          <div className="bg-slate-50/70 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Session Execution Grade
              </label>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                {getGradeDesc(disciplineGrade)}
              </span>
            </div>
            
            <div className="grid grid-cols-6 gap-3 pt-1">
              {(['A+', 'A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
                const isSel = disciplineGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setDisciplineGrade(grade)}
                    className={`py-3 rounded-xl text-sm font-black font-mono border transition-all duration-200 ${
                      isSel
                        ? grade.startsWith('A')
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 ring-2 ring-emerald-500/20 shadow-md'
                          : grade === 'B' || grade === 'C'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 ring-2 ring-amber-500/20 shadow-md'
                          : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-2 ring-rose-500/20 shadow-md'
                        : 'bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-slate-300'
                    }`}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post-Market Reflection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Post-Market Reflection & Takeaways
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Reflect on today's execution. Did you stick to your plan? Were stop losses respected? What will you improve tomorrow?"
              rows={5}
              className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Chart Screenshot Link Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              TradingView / Chart Screenshot Link (Optional)
            </label>
            <input
              type="text"
              value={chartUrl}
              onChange={(e) => setChartUrl(e.target.value)}
              placeholder="https://www.tradingview.com/x/..."
              className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono"
            />
          </div>
        </motion.div>
      )}

      {/* Bottom Save Action Bar */}
      <div className="pt-6 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Auto-syncs with your TradeTrackr account
        </span>
        
        <button
          type="button"
          onClick={handleSaveJournal}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-extrabold tracking-wide rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
          <span>{saving ? 'Saving...' : 'Save Session Journal'}</span>
        </button>
      </div>
    </div>
  );
}
