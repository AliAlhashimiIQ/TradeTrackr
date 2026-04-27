'use client';

import React, { useState } from 'react';
import { Trade } from '@/lib/types';
import TradeNotes from './TradeNotes';
import Image from 'next/image';
import { isForexPair, formatLots, formatPips } from '@/lib/forexUtils';

interface TradeDetailProps {
  trade: Trade;
  onClose: () => void;
}

export default function TradeDetail({ trade, onClose }: TradeDetailProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'screenshots'>('details');
  const isForex = isForexPair(trade.symbol);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  // Format currency
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
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  // Calculate trade duration
  const calculateDuration = (entry: string, exit: string): string => {
    const entryDate = new Date(entry);
    const exitDate = new Date(exit);
    const diffInMinutes = Math.floor((exitDate.getTime() - entryDate.getTime()) / 1000 / 60);
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      const mins = diffInMinutes % 60;
      return `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      const hours = Math.floor((diffInMinutes % 1440) / 60);
      return `${days}d ${hours}h`;
    }
  };

  // Calculate percentage change
  const calculatePercentageChange = (entry: number, exit: number): string => {
    const change = ((exit - entry) / entry) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  // Open screenshot in modal
  const openScreenshot = (screenshotUrl: string) => {
    setSelectedScreenshot(screenshotUrl);
    setZoomLevel(1);
    setDragPosition({ x: 0, y: 0 });
  };

  // Close screenshot modal
  const closeScreenshot = () => {
    setSelectedScreenshot(null);
  };

  // Handle zoom in and out
  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
      // Limit zoom range
      return Math.min(Math.max(newZoom, 0.5), 5);
    });
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setDragPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset zoom and position
  const resetZoom = () => {
    setZoomLevel(1);
    setDragPosition({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="card bg-[#0f1117] rounded-lg shadow-2xl border border-gray-800 w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              {trade.symbol}
              <span className={`ml-3 px-2 py-1 rounded text-sm ${
                trade.type === 'Long' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
              }`}>
                {trade.type}
              </span>
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {formatTime(trade.entry_time)}
            </p>
          </div>
          
          {/* Floating action buttons */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('screenshots')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'screenshots'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              Screenshots
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              Notes
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
                      <div className="text-gray-400 text-xs">{isForex ? 'Lots' : 'Quantity'}</div>
                      <div className="text-white font-mono text-lg">
                        {isForex ? formatLots(trade.lots) : trade.quantity}
                      </div>
                    </div>
                    {isForex && trade.pips !== undefined && trade.pips !== null && (
                      <div>
                        <div className="text-gray-400 text-xs">Pips</div>
                        <div className={`font-mono text-lg ${(trade.pips ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPips(trade.pips)}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-400 text-xs">Profit/Loss</div>
                      <div className={`font-mono text-lg ${
                        trade.profit_loss > 0 ? 'text-green-400' : trade.profit_loss < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {trade.profit_loss > 0 ? '+' : ''}{formatCurrency(trade.profit_loss)}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {calculatePercentageChange(trade.entry_price, trade.exit_price)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="bg-[#1a1f2c] rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm mb-3">Additional Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-400 text-xs">Duration</div>
                      <div className="text-white text-lg">
                        {calculateDuration(trade.entry_time, trade.exit_time)}
                      </div>
                    </div>
                    {trade.r_multiple !== undefined && trade.r_multiple !== null && (
                      <div>
                        <div className="text-gray-400 text-xs">R Multiple</div>
                        <div className={`text-lg ${
                          (trade.r_multiple || 0) > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {(trade.r_multiple || 0) > 0 ? '+' : ''}{trade.r_multiple?.toFixed(2)}R
                        </div>
                      </div>
                    )}
                    {trade.risk !== undefined && (
                      <div>
                        <div className="text-gray-400 text-xs">Risk Amount</div>
                        <div className="text-white font-mono">
                          {formatCurrency(trade.risk)}
                        </div>
                      </div>
                    )}
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
                          className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mistakes */}
                {trade.mistakes && trade.mistakes.length > 0 && (
                  <div className="bg-[#1a1f2c] rounded-lg p-4 border border-red-900/20">
                    <h3 className="text-red-400/70 text-sm mb-3 font-semibold uppercase tracking-wider">Mistakes Logged</h3>
                    <div className="flex flex-wrap gap-2">
                      {trade.mistakes.map((mistake, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs font-medium border border-red-900/40"
                        >
                          {mistake}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Additional Information */}
              <div className="space-y-6">
                {trade.emotional_state && (
                  <div className="bg-[#1a1f2c] rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-3">Emotional State</h3>
                    <p className="text-white capitalize">{trade.emotional_state}</p>
                  </div>
                )}

                {trade.screenshot_url && typeof trade.screenshot_url === 'string' && (
                  <div className="bg-[#1a1f2c] rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-3">Screenshot</h3>
                    <a href={trade.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View Screenshot</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'screenshots' && (
            <div>
              {trade.screenshot_url ? (
                <div className="space-y-6">
                  {/* Screenshot Gallery */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.isArray(trade.screenshot_url) ? (
                      trade.screenshot_url.map((url: string, index: number) => (
                        <div
                          key={index}
                          onClick={() => openScreenshot(url ?? '')}
                          className="relative aspect-video rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                        >
                          <Image
                            src={url ?? ''}
                            alt={`Trade Screenshot ${index + 1}`}
                            layout="fill"
                            objectFit="cover"
                            className="transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="p-2 rounded-full bg-blue-600/80 text-white">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        onClick={() => openScreenshot(trade.screenshot_url ?? '')}
                        className="relative aspect-video rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                      >
                        <Image
                          src={trade.screenshot_url ?? ''}
                          alt="Trade Screenshot"
                          layout="fill"
                          objectFit="cover"
                          className="transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="p-2 rounded-full bg-blue-600/80 text-white">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-4 text-gray-500">No screenshots available for this trade</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <TradeNotes tradeId={trade.id} userId={trade.user_id} />
            </div>
          )}
        </div>
      </div>

      {/* Zoomable Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
             onClick={closeScreenshot}>
          <div className="absolute top-4 right-4 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoom('in');
              }}
              className="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoom('out');
              }}
              className="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6" />
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
              }}
              className="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
            </button>
          </div>
          
          <div 
            className="relative overflow-hidden cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={selectedScreenshot ?? undefined}
              alt="Trade Screenshot"
              className="max-h-[85vh] transition-transform"
              style={{
                transform: `scale(${zoomLevel}) translate(${dragPosition.x}px, ${dragPosition.y}px)`,
                transformOrigin: 'center'
              }}
              draggable="false"
            />
          </div>
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/80 py-2 px-4 rounded-lg text-white text-sm">
            {Math.round(zoomLevel * 100)}% zoom
          </div>
        </div>
      )}
    </div>
  );
} 
