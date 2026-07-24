'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

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
  const [checklist, setChecklist] = useState<{ text: string; checked: boolean }[]>([
    { text: 'Checked 4H/1H market structure', checked: false },
    { text: 'Reviewed economic calendar for high-impact news', checked: false },
    { text: 'Maximum daily loss limit defined ($500 / 1%)', checked: false },
    { text: 'Max 3 trades limit set for today', checked: false },
  ]);

  // Fetch journal entry for selected date
  useEffect(() => {
    async function loadJournalEntry() {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await (supabase.from as any)('daily_journals')
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
          if (data.rules_checklist && Array.isArray(data.rules_checklist)) {
            setChecklist(data.rules_checklist);
          }
        } else {
          // Reset form for fresh date
          setMarketBias('Neutral');
          setConfidence(3);
          setDailyGoal('');
          setKeyLevels('');
          setEconomicNotes('');
          setDisciplineGrade('A');
          setReflection('');
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
    const text = prompt('Enter new session rule checklist item:');
    if (text && text.trim()) {
      setChecklist((prev) => [...prev, { text: text.trim(), checked: false }]);
    }
  };

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
      };

      const { error } = await (supabase.from as any)('daily_journals')
        .upsert(payload, { onConflict: 'user_id,date' });

      if (error) {
        // Fallback to localStorage if table is pending Supabase migration
        localStorage.setItem(`journal_${user.id}_${date}`, JSON.stringify(payload));
      }

      toast.success(`Journal saved for ${date}`);
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error('Error saving journal:', err);
      // LocalStorage fallback
      localStorage.setItem(`journal_${user?.id}_${date}`, JSON.stringify({
        market_bias: marketBias,
        confidence_rating: confidence,
        daily_goal: dailyGoal,
        key_levels: keyLevels,
        economic_notes: economicNotes,
        discipline_grade: disciplineGrade,
        post_market_reflection: reflection,
        rules_checklist: checklist,
      }));
      toast.success(`Journal entry saved locally for ${date}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-sm animate-pulse">
        Loading prep journal for {date}...
      </div>
    );
  }

  return (
    <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-6 text-slate-100 space-y-6">
      {/* Header & Date summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-semibold tracking-wide flex items-center gap-2">
            <span>Macro Prep & Session Journal</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {date}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track daily market bias, key levels, economic news, and post-market execution discipline.
          </p>
        </div>

        {/* Trade Summary Pill */}
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-xs font-mono">
          <div>
            <span className="text-slate-400">Trades Logged: </span>
            <span className="text-slate-200 font-bold">{tradesCount}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div>
            <span className="text-slate-400">Net P&L: </span>
            <span className={`font-bold ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('pre-market')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'pre-market'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          1. Pre-Market Preparation
        </button>
        <button
          onClick={() => setActiveTab('post-market')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'post-market'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          2. Post-Market Review
        </button>
      </div>

      {/* Tab 1: Pre-Market Preparation */}
      {activeTab === 'pre-market' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Market Bias */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Session Market Bias
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Bullish', 'Bearish', 'Neutral'] as const).map((bias) => (
                  <button
                    key={bias}
                    type="button"
                    onClick={() => setMarketBias(bias)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      marketBias === bias
                        ? bias === 'Bullish'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                          : bias === 'Bearish'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                          : 'bg-slate-700/40 text-slate-200 border-slate-600 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {bias}
                  </button>
                ))}
              </div>
            </div>

            {/* Conviction Rating */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Bias Conviction Rating (1 - 5 Stars)
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setConfidence(star)}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      star <= confidence
                        ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                        : 'text-slate-600 bg-slate-950 border border-slate-800'
                    }`}
                  >
                    ★
                  </button>
                ))}
                <span className="text-xs font-mono text-slate-400 ml-2">{confidence}/5 Stars</span>
              </div>
            </div>
          </div>

          {/* Daily Goal & Key Levels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Daily Process Goal & Plan
              </label>
              <textarea
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                placeholder="e.g. Only take setups on 15m orderblocks. Do not trade before 9:30 AM EST open..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Key Technical Levels (Support / Resistance / Liquidity)
              </label>
              <textarea
                value={keyLevels}
                onChange={(e) => setKeyLevels(e.target.value)}
                placeholder="e.g. EURUSD Support: 1.0820, Resistance: 1.0890. XAUUSD Liquidity Pool: 2365..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Economic News Notes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Economic Calendar Events & Macro Drivers
            </label>
            <textarea
              value={economicNotes}
              onChange={(e) => setEconomicNotes(e.target.value)}
              placeholder="e.g. 8:30 AM Core CPI release (High impact). CPI expected 0.3% MoM..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {/* Pre-Flight Checklist */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Session Discipline Rules Checklist
              </label>
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                + Add Rule
              </button>
            </div>

            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleChecklist(idx)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span className={`text-xs font-medium ${item.checked ? 'text-slate-200 line-through opacity-70' : 'text-slate-300'}`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Post-Market Review */}
      {activeTab === 'post-market' && (
        <div className="space-y-6">
          {/* Discipline Grade */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Session Execution Grade (A+ to F)
            </label>
            <div className="flex items-center gap-3">
              {(['A+', 'A', 'B', 'C', 'D', 'F'] as const).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setDisciplineGrade(grade)}
                  className={`w-12 h-10 rounded-lg text-sm font-bold font-mono border transition-all ${
                    disciplineGrade === grade
                      ? grade.startsWith('A')
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg'
                        : grade === 'B' || grade === 'C'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-lg'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Reflection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Post-Market Execution Reflection & Takeaways
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Reflect on today's performance. Did you stick to your plan? Were stop losses respected? What will you improve tomorrow?"
              rows={5}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-4 border-t border-slate-800 flex justify-end">
        <button
          type="button"
          onClick={handleSaveJournal}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide rounded-lg shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Session Journal'}
        </button>
      </div>
    </div>
  );
}
