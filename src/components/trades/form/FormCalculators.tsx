import React from 'react';
import { Trade } from '@/lib/types';

interface FormCalculatorsProps {
  formData: Partial<Trade>;
  isForex: boolean;
  errors: Record<string, string>;
  onChange: (field: string, value: unknown) => void;
}

export const FormCalculators: React.FC<FormCalculatorsProps> = ({
  formData,
  isForex,
  errors,
  onChange,
}) => {
  const handleChange = (field: string, value: unknown) => {
    onChange(field, value);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
        <h2 className="text-base font-bold text-gray-950 dark:text-white uppercase tracking-wider">Trade Details</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#0d0e16] rounded-xl border border-black/10 dark:border-white/[0.06] p-4 transition-all">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Entry Price</label>
          <input
            type="number"
            step="any"
            value={formData.entry_price ?? ''}
            onChange={e => handleChange('entry_price', e.target.value)}
            placeholder="0.00"
            className={`w-full bg-transparent text-gray-900 dark:text-white text-xl font-bold placeholder-gray-400 dark:placeholder-gray-700 focus:outline-none ${errors.entry_price ? 'text-red-500 dark:text-red-400' : ''}`}
          />
          {errors.entry_price && <p className="text-xs text-red-500 mt-1">{errors.entry_price}</p>}
        </div>
        <div className="bg-white dark:bg-[#0d0e16] rounded-xl border border-black/10 dark:border-white/[0.06] p-4 transition-all">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Exit Price</label>
          <input
            type="number"
            step="any"
            value={formData.exit_price ?? ''}
            onChange={e => handleChange('exit_price', e.target.value)}
            placeholder="0.00"
            className={`w-full bg-transparent text-gray-900 dark:text-white text-xl font-bold placeholder-gray-400 dark:placeholder-gray-700 focus:outline-none ${errors.exit_price ? 'text-red-500 dark:text-red-400' : ''}`}
          />
          {errors.exit_price && <p className="text-xs text-red-500 mt-1">{errors.exit_price}</p>}
        </div>
        <div className="bg-white dark:bg-[#0d0e16] rounded-xl border border-black/10 dark:border-white/[0.06] p-4 transition-all">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">{isForex ? 'Lots' : 'Quantity'}</label>
          <input
            type="number"
            step="any"
            value={isForex ? (formData.lots ?? '') : (formData.quantity ?? '')}
            onChange={e => handleChange(isForex ? 'lots' : 'quantity', e.target.value)}
            placeholder={isForex ? "0.01" : "1.0"}
            className={`w-full bg-transparent text-gray-900 dark:text-white text-xl font-bold placeholder-gray-400 dark:placeholder-gray-700 focus:outline-none ${errors.quantity ? 'text-red-500 dark:text-red-400' : ''}`}
          />
          {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
        </div>
        <div className="bg-white dark:bg-[#0d0e16] rounded-xl border border-black/10 dark:border-white/[0.06] p-4 transition-all">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Pips</label>
          <div className="flex items-center">
            <input
              type="number"
              step="any"
              value={formData.pips ?? ''}
              onChange={e => handleChange('pips', e.target.value)}
              placeholder="0.0"
              className="w-full bg-transparent text-indigo-600 dark:text-indigo-400 text-xl font-bold placeholder-gray-400 dark:placeholder-gray-700 focus:outline-none"
            />
            <span className="text-[10px] font-bold text-indigo-500/50 ml-1 uppercase">Pips</span>
          </div>
        </div>
      </div>
      <div className="mt-3 bg-white dark:bg-[#0d0e16] rounded-xl border border-black/10 dark:border-white/[0.06] p-4 transition-all">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Date</label>
        <input
          type="date"
          value={formData.entry_time || ''}
          onChange={e => { handleChange('entry_time', e.target.value); handleChange('exit_time', e.target.value); }}
          className={`w-full bg-transparent text-gray-900 dark:text-white text-base font-medium focus:outline-none dark:[color-scheme:dark] ${errors.entry_time ? 'text-red-500 dark:text-red-400' : ''}`}
        />
        {errors.entry_time && <p className="text-xs text-red-500 mt-1">{errors.entry_time}</p>}
      </div>
    </div>
  );
};
