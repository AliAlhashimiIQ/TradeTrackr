'use client';

import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';
import TradeNotes from './TradeNotes';
import Image from 'next/image';

interface TradeDetailProps {
  trade: Trade;
  onClose: () => void;
}

export default function TradeDetail({ trade, onClose }: TradeDetailProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'screenshots'>('details');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format time
  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Reset image states when switching trades
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [trade.id]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#151823] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              {trade.symbol}
              <span className={`px-2 py-1 rounded-lg text-sm font-medium ${
                trade.type === 'Long' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
              }`}>
                {trade.type}
              </span>
            </h2>
            <p className="text-gray-400 text-sm mt-1">{formatTime(trade.entry_time)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-3 border-b border-gray-800">
          <div className="flex space-x-4">
            <button
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'screenshots'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'text-gray-400 hover:text-white'
              } ${!trade.screenshot_url ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => trade.screenshot_url && setActiveTab('screenshots')}
            >
              Screenshots
              {trade.screenshot_url && (
                <span className="ml-2 w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
              )}
            </button>
            <button
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'text-gray-400 hover:text-white'
              } ${!trade.notes ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => trade.notes && setActiveTab('notes')}
            >
              Notes
              {trade.notes && (
                <span className="ml-2 w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Trade Details */}
              <div className="space-y-6">
                <div className="bg-[#1a1f2c] rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm mb-3">Trade Information</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-gray-400 text-xs">Entry</div>
                      <div className="text-white font-mono text-lg">{formatCurrency(trade.entry_price)}</div>
                      <div className="text-gray-500 text-xs">{formatTime(trade.entry_time)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Exit</div>
                      <div className="text-white font-mono text-lg">{formatCurrency(trade.exit_price)}</div>
                      <div className="text-gray-500 text-xs">{formatTime(trade.exit_time)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Quantity</div>
                      <div className="text-white font-mono text-lg">{trade.quantity}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Profit/Loss</div>
                      <div className={`font-mono text-lg ${
                        trade.profit_loss > 0 ? 'text-green-400' : trade.profit_loss < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {trade.profit_loss > 0 ? '+' : ''}{formatCurrency(trade.profit_loss)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {trade.tags && trade.tags.length > 0 && (
                  <div className="bg-[#1a1f2c] rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {trade.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-900/30 text-blue-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Additional Info */}
              <div className="space-y-6">
                {trade.strategy && (
                  <div className="bg-[#1a1f2c] rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-2">Strategy</h3>
                    <p className="text-white">{trade.strategy}</p>
                  </div>
                )}

                {trade.emotional_state && (
                  <div className="bg-[#1a1f2c] rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-2">Emotional State</h3>
                    <p className="text-white capitalize">{trade.emotional_state}</p>
                  </div>
                )}

                {trade.risk && (
                  <div className="bg-[#1a1f2c] rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-2">Risk Management</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400 text-xs">Risk Amount:</span>
                        <span className="text-white ml-2 font-mono">{formatCurrency(trade.risk)}</span>
                      </div>
                      {trade.r_multiple && (
                        <div>
                          <span className="text-gray-400 text-xs">R Multiple:</span>
                          <span className={`ml-2 font-mono ${
                            trade.r_multiple > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trade.r_multiple > 0 ? '+' : ''}{trade.r_multiple.toFixed(2)}R
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'screenshots' && (
            <div className="space-y-6">
              {trade.screenshot_url ? (
                <div className="relative">
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1f2c] rounded-lg">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {imageError ? (
                    <div className="bg-[#1a1f2c] rounded-lg p-8 text-center">
                      <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-400 text-lg mb-2">Failed to load screenshot</p>
                      <p className="text-gray-500 text-sm">The image might be unavailable or the URL is invalid</p>
                    </div>
                  ) : (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-[#1a1f2c]">
                      <Image
                        src={trade.screenshot_url}
                        alt={`Screenshot of ${trade.symbol} trade`}
                        fill
                        className="object-contain"
                        onLoadingComplete={() => setImageLoading(false)}
                        onError={() => {
                          setImageError(true);
                          setImageLoading(false);
                        }}
                      />
                    </div>
                  )}
                  <div className="mt-4 text-sm text-gray-400">
                    Screenshot taken on {formatTime(trade.entry_time)}
                  </div>
                </div>
              ) : (
                <div className="bg-[#1a1f2c] rounded-lg p-8 text-center">
                  <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400 text-lg mb-2">No screenshot available</p>
                  <p className="text-gray-500 text-sm">This trade doesn't have any screenshots attached</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6">
              {trade.notes ? (
                <div className="bg-[#1a1f2c] rounded-lg p-4">
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-300">{trade.notes}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No notes available for this trade
                </div>
              )}
              <TradeNotes tradeId={trade.id} userId={trade.user_id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 