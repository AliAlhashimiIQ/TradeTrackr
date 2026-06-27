import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trade } from '@/lib/types';
import { getTagStyle, TAG_COLORS } from '@/lib/utils';

export interface InlineTagPopoverProps {
  trade: Trade;
  isMistake: boolean;
  onClose: () => void;
  onToggleTag: (trade: Trade, tag: string, isMistake: boolean) => void;
  presetsList: string[];
  onDeleteTagGlobally: (tag: string, isMistake: boolean) => void;
  /** @deprecated - kept for API compat, direction is now auto-calculated */
  renderUp?: boolean;
  userTagsConfig: any[];
  fetchUserTags: () => Promise<void>;
  user: any;
  onRenameTagGlobally: (oldName: string, newName: string, isMistake: boolean) => Promise<void>;
  onUpdateTagColor: (tag: string, colorHex: string, isMistake: boolean) => Promise<void>;
  userStrategies?: { id: string; name: string; rules?: string | null }[];
  /** The trigger button element to anchor the portal popover */
  anchorEl?: HTMLElement | null;
}

/** Renders the popover content into document.body via portal so it escapes overflow:hidden containers */
function PortalPopover({
  anchorEl,
  onClose,
  children,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; renderUp: boolean } | null>(null);

  const recalc = useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const POPOVER_WIDTH = 280;
    const POPOVER_EST_HEIGHT = 420;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.left;

    const renderUp = spaceBelow < POPOVER_EST_HEIGHT && rect.top > POPOVER_EST_HEIGHT;
    const left = spaceRight < POPOVER_WIDTH
      ? Math.max(8, rect.right - POPOVER_WIDTH)
      : rect.left;

    setPos({
      top: renderUp ? rect.top - 8 : rect.bottom + 8,
      left,
      renderUp,
    });
  }, [anchorEl]);

  useEffect(() => {
    recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [recalc]);

  // Click-outside to close
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        target.closest('.tag-popover-portal') ||
        target.closest('.popover-trigger')
      ) return;
      onClose();
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      className="tag-popover-portal"
      style={{
        position: 'fixed',
        top: pos.renderUp ? 'auto' : pos.top,
        bottom: pos.renderUp ? window.innerHeight - pos.top - (anchorEl?.getBoundingClientRect().height ?? 0) : 'auto',
        left: pos.left,
        zIndex: 9999,
        width: 280,
        transformOrigin: pos.renderUp ? 'bottom left' : 'top left',
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export const InlineTagPopover: React.FC<InlineTagPopoverProps> = ({
  trade,
  isMistake,
  onClose,
  onToggleTag,
  presetsList,
  onDeleteTagGlobally,
  renderUp = false,
  userTagsConfig,
  onRenameTagGlobally,
  onUpdateTagColor,
  userStrategies,
  anchorEl,
}) => {
  const [searchTag, setSearchTag] = useState('');
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [newTagNameInput, setNewTagNameInput] = useState('');
  
  // Notion-style tag editing states
  const [editingTag, setEditingTag] = useState<{ id?: string; name: string; color?: string } | null>(null);
  const [tagBeingEdited, setTagBeingEdited] = useState<string>('');

  const currentList = isMistake ? (trade.mistakes || []) : (trade.tags || []);

  const selectedStrategy = React.useMemo(() => {
    return userStrategies?.find(s => s.name === trade.strategy) || null;
  }, [userStrategies, trade.strategy]);

  const strategyRules = React.useMemo<string[]>(() => {
    if (!selectedStrategy?.rules) return [];
    try {
      const parsed = JSON.parse(selectedStrategy.rules);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }, [selectedStrategy]);

  const handleUpdateColor = async (colorHex: string) => {
    if (!editingTag) return;
    await onUpdateTagColor(tagBeingEdited, colorHex, isMistake);
    setEditingTag(prev => prev ? { ...prev, color: colorHex } : null);
  };

  const handleRenameTag = async () => {
    if (!editingTag) return;
    const newName = editingTag.name.trim();
    if (!newName || newName === tagBeingEdited) return;
    await onRenameTagGlobally(tagBeingEdited, newName, isMistake);
    setEditingTag(null);
  };

  const handleDeleteTag = async () => {
    if (!editingTag) return;
    await onDeleteTagGlobally(tagBeingEdited, isMistake);
    setEditingTag(null);
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, y: renderUp ? -6 : 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: renderUp ? -6 : 6, scale: 0.95 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="popover-container rounded-2xl p-4 text-left"
      style={{
        backgroundColor: 'var(--tooltip-bg, #131520)',
        border: '1px solid var(--card-border, rgba(255,255,255,0.07))',
        boxShadow: '0 16px 40px -8px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
        width: '280px',
      }}
    >
      {editingTag ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="text-left"
        >
          {/* Header with Back button */}
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setEditingTag(null)}
              className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors"
              title="Back"
            >
              ← Back
            </button>
            <span className="text-xs font-bold text-gray-200">Edit {isMistake ? 'Mistake' : 'Tag'}</span>
          </div>

          {/* Rename Input */}
          <div className="mb-4">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.08em] block mb-1">Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editingTag.name}
                onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                className="flex-1 px-2.5 py-1.5 bg-gray-50 dark:bg-[#0d0e16] border border-black/10 dark:border-white/[0.06] rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-450 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                placeholder="Tag name"
                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameTag(); }}
              />
              <button
                type="button"
                onClick={handleRenameTag}
                className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-300 text-xs rounded-lg transition-colors font-medium border border-indigo-500/30"
              >
                Save
              </button>
            </div>
          </div>

          {/* Color Palette */}
          <div className="mb-4">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.08em] block mb-2">Color</label>
            <div className="grid grid-cols-5 gap-2">
              {TAG_COLORS.map(colorPreset => {
                const isSelected = editingTag.color?.toLowerCase() === colorPreset.hex.toLowerCase() || editingTag.color?.toLowerCase() === colorPreset.name.toLowerCase();
                return (
                  <button
                    key={colorPreset.name}
                    type="button"
                    onClick={() => handleUpdateColor(colorPreset.hex)}
                    className="w-6 h-6 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: colorPreset.bg,
                      borderColor: isSelected ? '#ffffff' : colorPreset.border,
                      boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                    }}
                    title={colorPreset.name}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorPreset.hex }} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/[0.06] my-3" />

          <button
            type="button"
            onClick={handleDeleteTag}
            className="w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs rounded-lg border border-red-500/20 transition-all font-medium flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Globally
          </button>
        </motion.div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-200">{isMistake ? 'Mistakes' : 'Tags'}</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all active:scale-95"
              title="Close"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Tags */}
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.08em] mb-2">Current {isMistake ? 'Mistakes' : 'Tags'}</div>
          <div className="flex flex-wrap gap-1.5 mb-3 items-center">
            {currentList.map((tag) => {
              const tc = userTagsConfig.find(c => c.name.toLowerCase() === tag.toLowerCase());
              const style = getTagStyle(tc?.color, isMistake);
              return (
                <span
                  key={tag}
                  style={style}
                  className="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onToggleTag(trade, tag, isMistake)}
                    className="hover:opacity-80 text-[10px] font-bold transition-opacity"
                  >
                    ✕
                  </button>
                </span>
              );
            })}

            {isAddingCustomTag ? (
              <input
                type="text"
                placeholder="New Tag..."
                value={newTagNameInput}
                onChange={e => setNewTagNameInput(e.target.value)}
                onBlur={() => { if (!newTagNameInput.trim()) setIsAddingCustomTag(false); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTagNameInput.trim()) {
                      onToggleTag(trade, newTagNameInput.trim(), isMistake);
                      setNewTagNameInput('');
                      setIsAddingCustomTag(false);
                    }
                  } else if (e.key === 'Escape') {
                    setIsAddingCustomTag(false);
                  }
                }}
                className="px-2.5 py-1 bg-gray-50 dark:bg-[#0d0e16] border border-black/10 dark:border-white/[0.08] rounded-full text-xs text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 w-24 placeholder-gray-450 dark:placeholder-gray-700 font-sans"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingCustomTag(true)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 hover:text-white border border-dashed border-white/[0.1] transition-all flex items-center gap-1"
              >
                <span>+ Create Tag</span>
              </button>
            )}
          </div>

          {/* Strategy Checklist Rules */}
          {strategyRules.length > 0 && !isMistake && (
            <>
              <div className="border-t border-white/[0.06] my-2.5" />
              <div className="p-3 bg-black/[0.015] dark:bg-[#0d0e16]/60 border border-black/5 dark:border-white/[0.04] rounded-xl space-y-2">
                <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                  Strategy Checklist ({trade.strategy})
                </div>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {strategyRules.map((rule) => {
                    const isChecked = currentList.includes(rule);
                    return (
                      <button
                        key={rule}
                        type="button"
                        onClick={() => onToggleTag(trade, rule, isMistake)}
                        className="w-full flex items-center justify-between text-left p-1 rounded-lg text-xs font-medium hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                            isChecked ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-700 text-transparent'
                          }`}>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7"/></svg>
                          </div>
                          <span className="text-gray-300 text-[11px] truncate">{rule}</span>
                        </div>
                        {isChecked && <span className="text-indigo-400 font-bold text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-white/[0.04] pt-1.5 flex justify-between text-[9px] text-gray-500">
                  <span>Rules Met:</span>
                  <span>{strategyRules.filter(r => currentList.includes(r)).length} / {strategyRules.length}</span>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-white/[0.06] my-2.5" />

          {/* Select a Tag */}
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.08em] mb-2">Select a {isMistake ? 'Mistake' : 'Tag'}</div>
          <input
            type="text"
            placeholder={`Search ${isMistake ? 'mistakes' : 'tags'}...`}
            value={searchTag}
            onChange={e => setSearchTag(e.target.value)}
            className="w-full px-2.5 py-1.5 mb-2.5 bg-gray-50 dark:bg-[#0d0e16] border border-black/10 dark:border-white/[0.06] rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-450 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />

          <div className="max-h-[160px] overflow-y-auto space-y-1 scrollbar-thin pr-1">
            {presetsList
              .filter(tag => tag.toLowerCase().includes(searchTag.toLowerCase()))
              .map(tag => {
                const isSelected = currentList.includes(tag);
                const tc = userTagsConfig.find(c => c.name.toLowerCase() === tag.toLowerCase());
                const style = getTagStyle(tc?.color, isMistake);
                return (
                  <div
                    key={tag}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors group/item cursor-pointer"
                    onClick={() => onToggleTag(trade, tag, isMistake)}
                  >
                    <span style={style} className="text-[11px] px-2.5 py-0.5 rounded-full border font-medium">
                      {tag}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isSelected && <span className="text-indigo-400 font-bold text-xs">✓</span>}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const tagConfig = userTagsConfig.find(tc => tc.name.toLowerCase() === tag.toLowerCase());
                          setTagBeingEdited(tag);
                          setEditingTag({
                            id: tagConfig?.id,
                            name: tag,
                            color: tagConfig?.color || (isMistake ? '#ef4444' : '#6366f1')
                          });
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all"
                        title="Edit tag"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

            {searchTag.trim() && !presetsList.some(t => t.toLowerCase() === searchTag.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={() => {
                  onToggleTag(trade, searchTag.trim(), isMistake);
                  setSearchTag('');
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 font-semibold transition-colors"
              >
                + Create "{searchTag.trim()}"
              </button>
            )}
          </div>
        </>
      )}
    </motion.div>
  );

  // If anchorEl is provided render via portal, otherwise fall back to old absolute positioning
  if (anchorEl) {
    return (
      <PortalPopover anchorEl={anchorEl} onClose={onClose}>
        <AnimatePresence mode="wait">
          {content}
        </AnimatePresence>
      </PortalPopover>
    );
  }

  // Legacy fallback (absolute positioned inside relative parent)
  return (
    <motion.div
      initial={{ opacity: 0, y: renderUp ? -6 : 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: renderUp ? -6 : 6, scale: 0.95 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`popover-container absolute left-0 z-40 rounded-2xl p-4 text-left ${
        renderUp ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
      }`}
      style={{
        backgroundColor: 'var(--tooltip-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(12px)',
        width: '280px',
      }}
    >
      {content}
    </motion.div>
  );
};

export default InlineTagPopover;
