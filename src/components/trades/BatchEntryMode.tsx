import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface BatchTradeEntry {
  id: string;
  symbol: string;
  type: 'Long' | 'Short';
  entry_price: string;
  exit_price: string;
  quantity: string;
  entry_time: string;
  exit_time: string;
  profit_loss?: number;
  notes?: string;
}

interface BatchEntryModeProps {
  onSubmitBatch: (trades: Partial<Trade>[]) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

/**
 * BatchEntryMode component allows users to enter multiple trades at once
 */
const BatchEntryMode: React.FC<BatchEntryModeProps> = ({
  onSubmitBatch,
  onCancel,
  className = ''
}) => {
  const [batchEntries, setBatchEntries] = useState<BatchTradeEntry[]>([
    createEmptyEntry()
  ]);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  function createEmptyEntry(): BatchTradeEntry {
    const today = new Date().toISOString().split('T')[0];
    return {
      id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      symbol: '',
      type: 'Long',
      entry_price: '',
      exit_price: '',
      quantity: '',
      entry_time: today,
      exit_time: today,
      notes: ''
    };
  }
  
  // Focus the first input of a new row
  useEffect(() => {
    const lastEntry = batchEntries[batchEntries.length - 1];
    if (lastEntry && batchEntries.length > 1) {
      const inputElement = document.getElementById(`symbol-${lastEntry.id}`);
      if (inputElement) {
        inputElement.focus();
      }
    }
  }, [batchEntries.length]);
  
  const handleAddRow = () => {
    setBatchEntries([...batchEntries, createEmptyEntry()]);
  };
  
  const handleRemoveRow = (id: string) => {
    if (batchEntries.length > 1) {
      setBatchEntries(batchEntries.filter(entry => entry.id !== id));
    }
  };
  
  const handleChangeField = (id: string, field: keyof BatchTradeEntry, value: string) => {
    setBatchEntries(batchEntries.map(entry => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };
        
        // Auto-calculate P&L
        if (field === 'entry_price' || field === 'exit_price' || field === 'quantity' || field === 'type') {
          const entryPrice = parseFloat(updatedEntry.entry_price);
          const exitPrice = parseFloat(updatedEntry.exit_price);
          const quantity = parseFloat(updatedEntry.quantity);
          
          if (!isNaN(entryPrice) && !isNaN(exitPrice) && !isNaN(quantity)) {
            updatedEntry.profit_loss = updatedEntry.type === 'Long'
              ? (exitPrice - entryPrice) * quantity
              : (entryPrice - exitPrice) * quantity;
          }
        }
        
        return updatedEntry;
      }
      return entry;
    }));
  };
  
  const handleBulkSymbol = (symbol: string) => {
    if (!symbol.trim()) {
      setErrorMessage("Please enter a symbol in the first row before copying");
      return;
    }
    
    setErrorMessage(null);
    setBatchEntries(batchEntries.map(entry => ({
      ...entry,
      symbol
    })));
  };
  
  const handleBulkType = (type: 'Long' | 'Short') => {
    setBatchEntries(batchEntries.map(entry => ({
      ...entry,
      type
    })));
  };
  
  const handleBulkDate = (field: 'entry_time' | 'exit_time', value: string) => {
    if (!value) {
      setErrorMessage("Please select a valid date");
      return;
    }
    
    setErrorMessage(null);
    setBatchEntries(batchEntries.map(entry => ({
      ...entry,
      [field]: value
    })));
  };
  
  const validateEntries = (): boolean => {
    // Find entries with incomplete required fields
    const incompleteEntries = batchEntries.filter(
      entry => entry.symbol.trim() === '' || 
             !entry.entry_price || 
             !entry.exit_price || 
             !entry.quantity ||
             !entry.entry_time ||
             !entry.exit_time
    );
    
    if (incompleteEntries.length === batchEntries.length) {
      setErrorMessage('Please fill in at least one complete trade entry');
      return false;
    }
    
    // Check for invalid dates
    const invalidDateEntries = batchEntries.filter(entry => {
      if (!entry.symbol.trim()) return false; // Skip incomplete entries
      
      const entryDate = new Date(entry.entry_time);
      const exitDate = new Date(entry.exit_time);
      
      return isNaN(entryDate.getTime()) || isNaN(exitDate.getTime()) || entryDate > exitDate;
    });
    
    if (invalidDateEntries.length > 0) {
      setErrorMessage('One or more trades have invalid dates or exit date before entry date');
      return false;
    }
    
    return true;
  };
  
  const handleSubmitBatch = async () => {
    if (!validateEntries()) {
      return;
    }
    
    setIsPending(true);
    setErrorMessage(null);
    
    try {
      // Filter out incomplete entries
      const filteredEntries = batchEntries.filter(entry => 
        entry.symbol.trim() && entry.entry_price && entry.exit_price && entry.quantity
      );
      
      const formattedTrades = filteredEntries.map(entry => ({
        symbol: entry.symbol.trim().toUpperCase(),
        type: entry.type,
        entry_price: parseFloat(entry.entry_price),
        exit_price: parseFloat(entry.exit_price),
        quantity: parseFloat(entry.quantity),
        entry_time: new Date(entry.entry_time).toISOString(),
        exit_time: new Date(entry.exit_time).toISOString(),
        profit_loss: entry.profit_loss || 0,
        notes: entry.notes || `Batch entry trade for ${entry.symbol}`
      }));
      
      // Submit the trades
      await onSubmitBatch(formattedTrades);
      
      // Reset form after successful submission
      setBatchEntries([createEmptyEntry()]);
    } catch (error) {
      console.error('Error submitting batch trades:', error);
      setErrorMessage('Failed to submit trades. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={`bg-gradient-to-b from-[#111827] to-[#0f1117] rounded-xl shadow-xl border border-indigo-900/20 overflow-hidden ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-base font-medium flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Batch Trade Entry
          </h3>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddRow}
            disabled={isPending}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 text-indigo-300 rounded-lg text-sm border border-indigo-600/30 hover:shadow-md transition-all flex items-center"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Row
          </motion.button>
        </div>

        {/* Bulk Actions */}
        <div className="mb-4 p-4 bg-gradient-to-r from-indigo-900/10 to-blue-900/10 rounded-lg border border-indigo-900/20">
          <h4 className="text-sm font-medium text-indigo-300 mb-3">Bulk Actions</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-indigo-300/70 mb-1.5">Symbol</label>
              <input
                type="text"
                placeholder="Apply to all"
                onChange={(e) => handleBulkSymbol(e.target.value)}
                className="w-full py-2 px-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs text-indigo-300/70 mb-1.5">Type</label>
              <select
                onChange={(e) => handleBulkType(e.target.value as 'Long' | 'Short')}
                className="w-full py-2 px-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
              >
                <option value="">Select type</option>
                <option value="Long">Long</option>
                <option value="Short">Short</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-indigo-300/70 mb-1.5">Entry Date</label>
              <input
                type="date"
                onChange={(e) => handleBulkDate('entry_time', e.target.value)}
                className="w-full py-2 px-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs text-indigo-300/70 mb-1.5">Exit Date</label>
              <input
                type="date"
                onChange={(e) => handleBulkDate('exit_time', e.target.value)}
                className="w-full py-2 px-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-900/20 border border-red-900/30 rounded-lg text-red-400 text-sm flex items-start"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trades Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-indigo-900/20">
                <th className="pb-3 text-xs font-medium text-indigo-300">Symbol</th>
                <th className="pb-3 text-xs font-medium text-indigo-300">Type</th>
                <th className="pb-3 text-xs font-medium text-indigo-300">Entry Price</th>
                <th className="pb-3 text-xs font-medium text-indigo-300">Exit Price</th>
                <th className="pb-3 text-xs font-medium text-indigo-300">Quantity</th>
                <th className="pb-3 text-xs font-medium text-indigo-300">Entry Date</th>
                <th className="pb-3 text-xs font-medium text-indigo-300">Exit Date</th>
                <th className="pb-3 text-xs font-medium text-indigo-300">P/L</th>
                <th className="pb-3 text-xs font-medium text-indigo-300"></th>
              </tr>
            </thead>
            <tbody>
              {batchEntries.map((entry, index) => (
                <tr key={entry.id} className="border-b border-indigo-900/10 last:border-0">
                  <td className="py-3 pr-4">
                    <input
                      id={`symbol-${entry.id}`}
                      type="text"
                      value={entry.symbol}
                      onChange={(e) => handleChangeField(entry.id, 'symbol', e.target.value)}
                      placeholder="AAPL"
                      className="w-full py-2 px-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
                      disabled={isPending}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={entry.type}
                      onChange={(e) => handleChangeField(entry.id, 'type', e.target.value as 'Long' | 'Short')}
                      className="w-full py-2 px-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
                      disabled={isPending}
                    >
                      <option value="Long">Long</option>
                      <option value="Short">Short</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        value={entry.entry_price}
                        onChange={(e) => handleChangeField(entry.id, 'entry_price', e.target.value)}
                        step="0.01"
                        placeholder="0.00"
                        className="w-full py-2 pl-7 pr-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
                        disabled={isPending}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        value={entry.exit_price}
                        onChange={(e) => handleChangeField(entry.id, 'exit_price', e.target.value)}
                        step="0.01"
                        placeholder="0.00"
                        className="w-full py-2 pl-7 pr-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
                        disabled={isPending}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="number"
                      value={entry.quantity}
                      onChange={(e) => handleChangeField(entry.id, 'quantity', e.target.value)}
                      step="0.01"
                      placeholder="0"
                      className="w-full py-2 px-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
                      disabled={isPending}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="date"
                      value={entry.entry_time}
                      onChange={(e) => handleChangeField(entry.id, 'entry_time', e.target.value)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
                      disabled={isPending}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="date"
                      value={entry.exit_time}
                      onChange={(e) => handleChangeField(entry.id, 'exit_time', e.target.value)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-[#171f31] to-[#1a202e] border border-indigo-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-inner text-sm"
                      disabled={isPending}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <div className={`py-2 px-3 rounded-lg text-sm font-medium ${
                      entry.profit_loss
                        ? entry.profit_loss > 0
                          ? 'bg-green-900/20 text-green-400 border border-green-900/30'
                          : 'bg-red-900/20 text-red-400 border border-red-900/30'
                        : 'bg-gray-900/20 text-gray-400 border border-gray-900/30'
                    }`}>
                      {entry.profit_loss
                        ? `${entry.profit_loss > 0 ? '+' : ''}${entry.profit_loss.toFixed(2)}`
                        : '--'}
                    </div>
                  </td>
                  <td className="py-3">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemoveRow(entry.id)}
                      disabled={isPending || batchEntries.length === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        batchEntries.length === 1
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-red-400 hover:bg-red-900/20'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-900/20 via-blue-900/20 to-purple-900/20 border-t border-indigo-900/20">
        <div className="flex justify-end space-x-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 bg-[#1e293b] text-indigo-300 rounded-lg hover:bg-[#252f3f] transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-2 focus:ring-offset-[#0f1117] border border-indigo-900/20"
          >
            Cancel
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmitBatch}
            disabled={isPending}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-medium hover:from-indigo-500 hover:to-blue-500 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0f1117] flex items-center"
          >
            {isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Submit Batch'
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default BatchEntryMode; 