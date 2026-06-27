import React from 'react';
import { Trade } from '@/lib/types';

interface FormTagsProps {
  formData: Partial<Trade>;
  userStrategies: { id: string; name: string; rules?: string | null }[];
  showAddStratForm: boolean;
  setShowAddStratForm: (show: boolean) => void;
  newStratName: string;
  setNewStratName: (name: string) => void;
  onQuickCreateStrategy: () => Promise<void>;
  onStrategyChange: (strategyName: string | null) => void;
  strategyRules: string[];
  onToggleTag: (tag: string) => void;
  onToggleMistake: (mistake: string) => void;
  onChange: (field: string, value: unknown) => void;
  customTag: string;
  setCustomTag: (tag: string) => void;
  customMistake: string;
  setCustomMistake: (mistake: string) => void;
  PRESET_TAGS: string[];
  PRESET_MISTAKES: string[];
  EMOTIONS: { value: string; label: string; color: string }[];
}

export const FormTags: React.FC<FormTagsProps> = ({
  formData,
  userStrategies,
  showAddStratForm,
  setShowAddStratForm,
  newStratName,
  setNewStratName,
  onQuickCreateStrategy,
  onStrategyChange,
  strategyRules,
  onToggleTag,
  onToggleMistake,
  onChange,
  customTag,
  setCustomTag,
  customMistake,
  setCustomMistake,
  PRESET_TAGS,
  PRESET_MISTAKES,
  EMOTIONS,
}) => {
  return (
    <div className="space-y-5 text-gray-900 dark:text-white">
      {/* Mood/Emotions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-gray-500 rounded-full" />
          <h2 className="text-base font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Mood</h2>
        </div>
        <div className="flex gap-2">
          {EMOTIONS.map(e => (
            <button
              key={e.value}
              type="button"
              onClick={() => onChange('emotional_state', formData.emotional_state === e.value ? undefined : e.value)}
              className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border transition-all ${
                formData.emotional_state === e.value
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold scale-105 shadow-sm'
                  : 'bg-white dark:bg-[#0d0e16] border-black/10 dark:border-transparent hover:bg-gray-50 dark:hover:bg-[#151823] text-gray-600 dark:text-gray-400'
              }`}
            >
              <span className="text-sm font-semibold">{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Strategy */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-indigo-500 rounded-full" />
          <h2 className="text-base font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Primary Strategy</h2>
        </div>
        <div className="flex gap-2">
          <select
            value={formData.strategy || ''}
            onChange={e => onStrategyChange(e.target.value || null)}
            className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#0d0e16] border border-black/10 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white text-base focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          >
            <option value="">No Strategy</option>
            {userStrategies.map(strat => (
              <option key={strat.id} value={strat.name}>
                {strat.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAddStratForm(!showAddStratForm)}
            className="px-3.5 py-2.5 bg-white dark:bg-[#0d0e16] border border-black/10 dark:border-white/[0.06] rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-base transition-colors"
          >
            {showAddStratForm ? 'Cancel' : 'New'}
          </button>
        </div>

        {showAddStratForm && (
          <div className="mt-3 p-4 bg-gray-50 dark:bg-[#0d0e16] border border-black/5 dark:border-white/[0.06] rounded-xl space-y-3">
            <input
              type="text"
              value={newStratName}
              onChange={e => setNewStratName(e.target.value)}
              placeholder="New strategy name..."
              className="w-full px-3.5 py-2 bg-white dark:bg-[#06070a] border border-black/10 dark:border-white/[0.06] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowAddStratForm(false); setNewStratName(''); }}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onQuickCreateStrategy}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {strategyRules.length > 0 && (
          <div className="mt-3.5 p-4 bg-gray-50 dark:bg-[#07080e] border border-black/[0.04] dark:border-white/[0.04] rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] pb-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                Strategy Entry Checklist
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                {formData.tags?.filter(t => strategyRules.includes(t))?.length || 0} / {strategyRules.length} met
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {strategyRules.map((rule: string, idx: number) => {
                const isChecked = formData.tags?.includes(rule) ?? false;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onToggleTag(rule)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isChecked
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-750 dark:text-white shadow-md'
                        : 'bg-white/40 dark:bg-[#0d0e16]/40 border-black/5 dark:border-white/[0.03] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-[#0d0e16]/60'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                      isChecked
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'border-slate-350 dark:border-slate-700 text-transparent'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold select-none">{rule}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-gray-500 rounded-full" />
          <h2 className="text-base font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Strategy Tags</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                formData.tags?.includes(tag)
                  ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                  : 'bg-white dark:bg-[#0d0e16] text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 border-black/10 dark:border-transparent hover:border-black/20 dark:hover:border-white/[0.06]'
              }`}
            >
              {formData.tags?.includes(tag) && '✓ '}{tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTag}
            onChange={e => setCustomTag(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (customTag.trim()) {
                  onToggleTag(customTag.trim());
                  setCustomTag('');
                }
              }
            }}
            placeholder="Custom tag..."
            className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#0d0e16] border border-black/10 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white text-base placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
          <button
            type="button"
            onClick={() => {
              if (customTag.trim()) {
                onToggleTag(customTag.trim());
                setCustomTag('');
              }
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-[#0d0e16] border border-black/10 dark:border-white/[0.06] rounded-lg text-gray-650 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white text-base transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Mistakes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-red-600 rounded-full" />
          <h2 className="text-base font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Mistakes Logged</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_MISTAKES.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onToggleMistake(m)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                formData.mistakes?.includes(m)
                  ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
                  : 'bg-white dark:bg-[#0d0e16] text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 border-black/10 dark:border-transparent hover:border-black/20 dark:hover:border-white/[0.06]'
              }`}
            >
              {formData.mistakes?.includes(m) && '✕ '}{m}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customMistake}
            onChange={e => setCustomMistake(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (customMistake.trim()) {
                  onToggleMistake(customMistake.trim());
                  setCustomMistake('');
                }
              }
            }}
            placeholder="Custom mistake..."
            className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#0d0e16] border border-black/10 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white text-base placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500/50"
          />
          <button
            type="button"
            onClick={() => {
              if (customMistake.trim()) {
                onToggleMistake(customMistake.trim());
                setCustomMistake('');
              }
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-[#0d0e16] border border-black/10 dark:border-white/[0.06] rounded-lg text-gray-650 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white text-base transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
