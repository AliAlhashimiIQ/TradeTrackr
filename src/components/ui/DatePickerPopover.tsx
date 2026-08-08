'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DatePickerPopoverProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
}

export default function DatePickerPopover({ selectedDate, onChange }: DatePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse currently selected date safely
  const parsedDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  
  // Track displayed view month & year
  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth()); // 0-11

  // Update view when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [selectedDate]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(parsedDate);
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    const d = new Date(parsedDate);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
  };

  const handleSelectToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    onChange(todayStr);
    setViewYear(yyyy);
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  // Generate calendar grid for viewYear & viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const todayObj = new Date();
  const todayYMD = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const formattedDisplay = parsedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Date Control Toolbar */}
      <div className="flex items-center gap-1.5 bg-white dark:bg-[var(--surface-1)] border border-slate-200/80 dark:border-white/[0.08] p-1.5 rounded-2xl shadow-sm">
        {/* Prev Day Arrow */}
        <button
          type="button"
          onClick={handlePrevDay}
          className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all font-semibold text-xs"
          title="Previous Day"
          aria-label="Previous Day"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Date Display / Popover Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 border ${
            isOpen
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : 'bg-slate-50 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/[0.08] hover:border-indigo-500/50'
          }`}
        >
          <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formattedDisplay}</span>
        </button>

        {/* Today Jump Button */}
        <button
          type="button"
          onClick={handleSelectToday}
          className="px-3.5 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl transition-all font-extrabold text-xs"
        >
          Today
        </button>

        {/* Next Day Arrow */}
        <button
          type="button"
          onClick={handleNextDay}
          className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all font-semibold text-xs"
          title="Next Day"
          aria-label="Next Day"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Floating Interactive Mini Calendar Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 z-50 w-72 bg-white/95 dark:bg-[var(--surface-1)] border border-slate-200/90 dark:border-white/[0.12] rounded-3xl p-4 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-slate-100"
          >
            {/* Month & Year Navigation Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                title="Previous Month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-xs font-black tracking-wide text-slate-900 dark:text-white">
                {monthNames[viewMonth]} {viewYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                title="Next Month"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <span key={day} className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase">
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Empty leading padding cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8 w-8" />
              ))}

              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const mm = String(viewMonth + 1).padStart(2, '0');
                const dd = String(dayNum).padStart(2, '0');
                const dateStr = `${viewYear}-${mm}-${dd}`;

                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayYMD;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={`h-8 w-8 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105'
                        : isToday
                        ? 'border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10'
                        : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions Footer */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Jump to Today
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
