'use client'

import React, { useState, useEffect } from 'react';
import { TradingViewAnalysisResult, storeUserCorrection, getTrainingStatistics, TrainingStatistics } from '@/lib/aiService';

interface ChartAnalysisPanelProps {
  analysis: TradingViewAnalysisResult;
  onApply?: (
    field: keyof TradingViewAnalysisResult | 'patterns' | 'tag' | 'suggestedTags',
    value: string | number | string[] | number[] | TradingViewAnalysisResult['patterns'] | undefined
  ) => void;
  className?: string;
  screenshotUrl?: string; // Add URL to display screenshot
  screenshotId?: string; // Add ID for corrections tracking
}

/**
 * Enhanced component for displaying detailed chart analysis from AI
 * Now includes side-by-side comparison and verification UI
 */
const ChartAnalysisPanel: React.FC<ChartAnalysisPanelProps> = ({
  analysis,
  onApply,
  className = '',
  screenshotUrl,
  screenshotId = 'screenshot_' + Date.now()
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState<TradingViewAnalysisResult>({...analysis});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [trainingStats, setTrainingStats] = useState<TrainingStatistics | null>(null);
  const [showTrainingInfo, setShowTrainingInfo] = useState(false);
  
  // Load training statistics
  useEffect(() => {
    try {
      const stats = getTrainingStatistics();
      setTrainingStats(stats);
    } catch (error) {
      console.error('Error loading training statistics:', error);
    }
  }, []);
  
  // Update edited analysis when original analysis changes
  useEffect(() => {
    setEditedAnalysis({...analysis});
  }, [analysis]);
  
  // Add cleanup for patterns
  useEffect(() => {
    return () => {
      // Cleanup patterns when component unmounts
      if (editedAnalysis.patterns) {
        editedAnalysis.patterns = [];
      }
    };
  }, []);
  
  if (!analysis) return null;
  
  const handleApplyValue = (
    field: keyof TradingViewAnalysisResult | 'patterns' | 'tag' | 'suggestedTags',
    value: string | number | string[] | number[] | TradingViewAnalysisResult['patterns'] | undefined
  ) => {
    if (onApply) {
      onApply(field, value);
    }
  };
  
  // Handle editing an analysis value
  const handleEditValue = (
    field: keyof TradingViewAnalysisResult,
    value: string | number | TradingViewAnalysisResult['patterns'] | undefined
  ) => {
    setEditedAnalysis(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Fixed add pattern function
  const handleAddPattern = (name: string, confidence: number) => {
    const newPattern = { name, confidence };
    const patterns = editedAnalysis.patterns || [];
    setEditedAnalysis(prev => ({
      ...prev,
      patterns: [...patterns, newPattern]
    }));
  };
  
  // Fixed delete pattern function
  const handleDeletePattern = (index: number) => {
    try {
      const patterns = [...(editedAnalysis.patterns || [])];
      patterns.splice(index, 1);
      setEditedAnalysis(prev => ({
        ...prev,
        patterns
      }));
    } catch (error) {
      console.error('Error deleting pattern:', error);
      // Show error to user
      setShowSuccessMessage(false);
    }
  };
  
  // Fixed save corrections function
  const handleSaveCorrections = () => {
    try {
      // Ensure we have valid patterns array
      if (!editedAnalysis.patterns) {
        editedAnalysis.patterns = [];
      }
      
      // Store the correction
      storeUserCorrection(analysis, editedAnalysis, screenshotId);
      
      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      // Update local training stats
      try {
        const updatedStats = getTrainingStatistics();
        setTrainingStats(updatedStats);
      } catch (error) {
        console.error('Error updating training stats:', error);
      }
      
      // Apply all corrections at once if onApply is available
      if (onApply) {
        if (editedAnalysis.symbol !== analysis.symbol) {
          onApply('symbol', editedAnalysis.symbol);
        }
        if (editedAnalysis.tradeType !== analysis.tradeType) {
          onApply('tradeType', editedAnalysis.tradeType);
        }
        if (editedAnalysis.entryPrice !== analysis.entryPrice) {
          onApply('entryPrice', editedAnalysis.entryPrice);
        }
        if (editedAnalysis.takeProfitPrice !== analysis.takeProfitPrice) {
          onApply('takeProfitPrice', editedAnalysis.takeProfitPrice);
        }
        if (editedAnalysis.stopLossPrice !== analysis.stopLossPrice) {
          onApply('stopLossPrice', editedAnalysis.stopLossPrice);
        }
        if (editedAnalysis.notes !== analysis.notes) {
          onApply('notes', editedAnalysis.notes);
        }
        // Also ensure patterns are applied correctly
        if (editedAnalysis.patterns && editedAnalysis.patterns.length > 0) {
          onApply('patterns', editedAnalysis.patterns.map(p => p.name));
        }
      }
      
      console.log('Corrections saved successfully', {
        original: analysis,
        corrected: editedAnalysis
      });
    } catch (error) {
      console.error('Error saving corrections:', error);
      alert('There was an error saving your corrections. Please try again.');
    }
  };
  
  // Calculate confidence color
  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return 'text-green-400';
    if (score >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  // Get badge color for confidence
  const getConfidenceBadge = (score: number) => {
    if (score >= 0.85) return 'bg-green-900/30 text-green-400 border border-green-800/50';
    if (score >= 0.7) return 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50';
    return 'bg-red-900/30 text-red-400 border border-red-800/50';
  };
  
  // Format a pattern name for display
  const formatPatternName = (name: string): string => {
    // Help distinguish FVG and OB patterns with special formatting
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('fvg') || lowerName.includes('fair value gap')) {
      return '✧ ' + name; // Star symbol for FVG
    }
    
    if (lowerName.includes('ob') || lowerName.includes('order block')) {
      return '■ ' + name; // Square symbol for Order Block
    }
    
    if (lowerName.includes('liquidity')) {
      return '⚬ ' + name; // Circle symbol for liquidity
    }
    
    return name;
  };
  
  return (
    <div className={`bg-[#0f1117] border border-indigo-800/30 rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-lg font-medium text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Chart Analysis
        </h3>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center ${getConfidenceColor(analysis.confidenceScore)}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              {(analysis.confidenceScore * 100).toFixed(0)}% Confidence
            </span>
          </div>
          
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center px-3 py-1 text-xs rounded-md ${
              editMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {editMode ? (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit Training Mode
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Train the AI
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowTrainingInfo(!showTrainingInfo)}
            className="px-1 py-1 text-gray-400 hover:text-gray-300"
            aria-label="Show training info"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Training info panel */}
      {showTrainingInfo && (
        <div className="p-4 bg-indigo-900/10 border-b border-indigo-800/30">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium text-indigo-400 mb-2">How AI Training Works</h4>
            <button
              onClick={() => setShowTrainingInfo(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-xs text-gray-300 mb-3">
            When you correct the AI's analysis using Training Mode, your corrections are saved to improve future analyses.
            Each time you make corrections, the system learns from your feedback to get better at:
          </p>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#1a1f2c]/50 p-2 rounded text-xs">
              <span className="text-blue-400">✓</span> Identifying trade direction
            </div>
            <div className="bg-[#1a1f2c]/50 p-2 rounded text-xs">
              <span className="text-blue-400">✓</span> Extracting exact price levels
            </div>
            <div className="bg-[#1a1f2c]/50 p-2 rounded text-xs">
              <span className="text-blue-400">✓</span> Recognizing FVGs and Order Blocks
            </div>
            <div className="bg-[#1a1f2c]/50 p-2 rounded text-xs">
              <span className="text-blue-400">✓</span> Understanding support/resistance
            </div>
          </div>
          
          {trainingStats && (
            <div className="bg-[#1a1f2c] rounded p-2 text-xs">
              <div className="text-gray-400 mb-1">Training Statistics</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>Total corrections: <span className="text-blue-400">{trainingStats.totalCorrections}</span></div>
                <div>Avg improvement: <span className="text-blue-400">{(trainingStats.averageImprovement * 100).toFixed(1)}%</span></div>
                <div>Price corrections: <span className="text-blue-400">{trainingStats.fieldsImproved.entryPrice + trainingStats.fieldsImproved.takeProfitPrice + trainingStats.fieldsImproved.stopLossPrice}</span></div>
                <div>Pattern corrections: <span className="text-blue-400">{trainingStats.fieldsImproved.patterns}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Side-by-side comparison view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Chart notes - Display prominently above the comparison on small screens */}
        {(analysis.notes || editMode) && (
          <div className="p-4 bg-indigo-900/10 border-b border-gray-700 md:hidden">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-indigo-400">Chart Analysis</span>
              {!editMode && (
                <button 
                  onClick={() => handleApplyValue('notes', analysis.notes)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
                >
                  Apply Notes
                </button>
              )}
            </div>
            {editMode ? (
              <textarea
                value={editedAnalysis.notes || ''}
                onChange={(e) => handleEditValue('notes', e.target.value)}
                className="w-full p-3 bg-[#1a1f2c] border border-gray-700 rounded text-white h-24"
              />
            ) : (
              <div className="bg-[#1a1f2c] p-3 rounded-lg">
                <p className="text-white text-sm whitespace-pre-line">{analysis.notes || 'No analysis provided by AI'}</p>
              </div>
            )}
          </div>
        )}
      
        {/* Screenshot column */}
        {screenshotUrl && (
          <div className="p-4 border-r border-gray-800">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Trading Chart Screenshot</h4>
            <div className="relative">
              <img 
                src={screenshotUrl} 
                alt="Trading Chart" 
                className="w-full h-auto max-h-[400px] object-contain rounded border border-gray-700" 
              />
              
              {/* Overlay highlights for detected areas - would be implemented with coordinates in real version */}
              {!editMode && analysis.entryPrice && (
                <div 
                  className="absolute left-1/4 top-1/2 w-6 h-6 rounded-full border-2 border-blue-500 animate-pulse"
                  title={`Entry Price: ${analysis.entryPrice}`}
                />
              )}
              
              {!editMode && analysis.takeProfitPrice && (
                <div 
                  className="absolute left-3/4 top-1/3 w-6 h-6 rounded-full border-2 border-green-500 animate-pulse"
                  title={`Take Profit: ${analysis.takeProfitPrice}`}
                />
              )}
              
              {!editMode && analysis.stopLossPrice && (
                <div 
                  className="absolute left-1/4 top-2/3 w-6 h-6 rounded-full border-2 border-red-500 animate-pulse"
                  title={`Stop Loss: ${analysis.stopLossPrice}`}
                />
              )}
              
              {/* Pattern markers - for demonstration */}
              {!editMode && analysis.patterns && analysis.patterns.map((pattern, idx) => {
                // Position patterns randomly for demo - in production would use actual coordinates
                const positions = [
                  { left: '20%', top: '30%' },
                  { right: '30%', top: '40%' },
                  { left: '45%', bottom: '30%' },
                  { right: '20%', bottom: '40%' }
                ];
                const pos = positions[idx % positions.length];
                
                // Different styles based on pattern type
                let style = 'border-purple-500';
                let bg = 'bg-purple-500/20';
                
                if (pattern.name.toLowerCase().includes('fvg')) {
                  style = 'border-amber-500';
                  bg = 'bg-amber-500/20';
                } else if (pattern.name.toLowerCase().includes('ob')) {
                  style = 'border-blue-500';
                  bg = 'bg-blue-500/20';
                } else if (pattern.name.toLowerCase().includes('liquidity')) {
                  style = 'border-green-500';
                  bg = 'bg-green-500/20';
                }
                
                return (
                  <div 
                    key={idx}
                    className={`absolute ${bg} border ${style} rounded-sm px-1 py-0.5 text-xs text-white`}
                    style={pos}
                    title={`${pattern.name} (${(pattern.confidence * 100).toFixed(0)}% confidence)`}
                  >
                    {pattern.name.length > 10 ? pattern.name.substring(0, 10) + '...' : pattern.name}
                  </div>
                );
              })}
            </div>
            
            {/* Confidence notes */}
            {analysis.confidenceNotes && (
              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800/30 rounded text-sm text-blue-300">
                <p className="font-medium text-blue-400 mb-1">AI Confidence Notes:</p>
                <p>{analysis.confidenceNotes}</p>
              </div>
            )}
            
            {/* Chart notes - Hide on small screens, where it's shown at the top */}
            {(analysis.notes || editMode) && (
              <div className="mt-3 p-3 bg-indigo-900/10 border border-indigo-800/30 rounded hidden md:block">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-indigo-400">Chart Analysis</span>
                  {!editMode && (
                    <button 
                      onClick={() => handleApplyValue('notes', analysis.notes)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
                    >
                      Apply Notes
                    </button>
                  )}
                </div>
                {editMode ? (
                  <textarea
                    value={editedAnalysis.notes || ''}
                    onChange={(e) => handleEditValue('notes', e.target.value)}
                    className="w-full p-3 bg-[#1a1f2c] border border-gray-700 rounded text-white h-24"
                  />
                ) : (
                  <div className="bg-[#1a1f2c] p-3 rounded-lg">
                    <p className="text-white text-sm whitespace-pre-line">{analysis.notes || 'No analysis provided by AI'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Analysis results column */}
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2 flex justify-between">
            <span>{editMode ? 'Training Mode - Make Corrections' : 'Detected Trading Data'}</span>
            {editMode && (
              <button
                onClick={handleSaveCorrections}
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Save Corrections
              </button>
            )}
          </h4>
          
          {editMode && (
            <div className="mb-3 p-2 bg-indigo-900/20 border border-indigo-800/50 rounded text-xs text-indigo-300">
              <p className="font-medium text-indigo-400 mb-1">Training Mode</p>
              <p>Correct any inaccurate values to help the AI learn from your expertise.</p>
            </div>
          )}
          
          {showSuccessMessage && (
            <div className="mb-3 p-2 bg-green-900/30 border border-green-800/50 rounded text-xs text-green-400">
              Corrections saved successfully! The AI will learn from your feedback.
            </div>
          )}
          
          <div className="space-y-4">
            {/* Symbol */}
            {(analysis.symbol || editMode) && (
              <div className="p-3 bg-[#1a1f2c] rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">Symbol</span>
                  {!editMode && (
                    <button 
                      onClick={() => handleApplyValue('symbol', analysis.symbol)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {editMode ? (
                  <input
                    type="text"
                    value={editedAnalysis.symbol || ''}
                    onChange={(e) => handleEditValue('symbol', e.target.value)}
                    className="w-full p-2 bg-[#252a36] border border-gray-700 rounded text-white"
                  />
                ) : (
                  <div className="text-lg font-semibold text-white">{analysis.symbol}</div>
                )}
              </div>
            )}
            
            {/* Trade Direction */}
            {(analysis.tradeType || editMode) && (
              <div className="p-3 bg-[#1a1f2c] rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">Trade Direction</span>
                  {!editMode && (
                    <button 
                      onClick={() => handleApplyValue('tradeType', analysis.tradeType)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {editMode ? (
                  <select
                    value={editedAnalysis.tradeType || 'Long'}
                    onChange={(e) => handleEditValue('tradeType', e.target.value as 'Long' | 'Short')}
                    className="w-full p-2 bg-[#252a36] border border-gray-700 rounded text-white"
                  >
                    <option value="Long">Long</option>
                    <option value="Short">Short</option>
                  </select>
                ) : (
                  <div className={`text-lg font-semibold ${
                    analysis.tradeType === 'Long' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {analysis.tradeType}
                  </div>
                )}
              </div>
            )}
            
            {/* Entry Price */}
            {(analysis.entryPrice !== undefined || editMode) && (
              <div className="p-3 bg-[#1a1f2c] rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">Entry Price</span>
                  {!editMode && (
                    <button 
                      onClick={() => handleApplyValue('entryPrice', analysis.entryPrice)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {editMode ? (
                  <input
                    type="number"
                    step="0.00001"
                    value={editedAnalysis.entryPrice === undefined ? '' : editedAnalysis.entryPrice}
                    onChange={(e) => handleEditValue('entryPrice', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    className="w-full p-2 bg-[#252a36] border border-gray-700 rounded text-white"
                  />
                ) : (
                  <div className="text-lg font-mono text-white">{analysis.entryPrice}</div>
                )}
              </div>
            )}
            
            {/* Take Profit */}
            {(analysis.takeProfitPrice !== undefined || editMode) && (
              <div className="p-3 bg-[#1a1f2c] rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">Take Profit</span>
                  {!editMode && (
                    <button 
                      onClick={() => handleApplyValue('takeProfitPrice', analysis.takeProfitPrice)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {editMode ? (
                  <input
                    type="number"
                    step="0.00001"
                    value={editedAnalysis.takeProfitPrice === undefined ? '' : editedAnalysis.takeProfitPrice}
                    onChange={(e) => handleEditValue('takeProfitPrice', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    className="w-full p-2 bg-[#252a36] border border-gray-700 rounded text-white"
                  />
                ) : (
                  <div className="text-lg font-mono text-green-400">{analysis.takeProfitPrice}</div>
                )}
              </div>
            )}
            
            {/* Stop Loss */}
            {(analysis.stopLossPrice !== undefined || editMode) && (
              <div className="p-3 bg-[#1a1f2c] rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">Stop Loss</span>
                  {!editMode && (
                    <button 
                      onClick={() => handleApplyValue('stopLossPrice', analysis.stopLossPrice)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {editMode ? (
                  <input
                    type="number"
                    step="0.00001"
                    value={editedAnalysis.stopLossPrice === undefined ? '' : editedAnalysis.stopLossPrice}
                    onChange={(e) => handleEditValue('stopLossPrice', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    className="w-full p-2 bg-[#252a36] border border-gray-700 rounded text-white"
                  />
                ) : (
                  <div className="text-lg font-mono text-red-400">{analysis.stopLossPrice}</div>
                )}
              </div>
            )}
            
            {/* Risk/Reward calculation - only show if we have all necessary prices */}
            {analysis.entryPrice !== undefined && 
             analysis.takeProfitPrice !== undefined && 
             analysis.stopLossPrice !== undefined &&
             analysis.tradeType && (
              <div className="p-3 bg-[#1a1f2c] rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">Risk/Reward Ratio</span>
                </div>
                <div className="text-lg font-semibold text-amber-400">
                  {calculateRiskReward(
                    analysis.entryPrice,
                    analysis.takeProfitPrice,
                    analysis.stopLossPrice,
                    analysis.tradeType
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Detected Patterns */}
      {(analysis.patterns?.length > 0 || editMode) && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Detected Chart Patterns</span>
            {!editMode && (
              <button 
                onClick={() => handleApplyValue('patterns', analysis.patterns.map(p => p.name))}
                className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
              >
                Add All Tags
              </button>
            )}
          </div>
          
          {editMode && (
            <div className="mb-3 p-2 bg-gray-800/30 border border-gray-700/50 rounded text-xs text-gray-300">
              Click patterns to toggle them. Add new patterns by typing and adjusting confidence.
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mb-3">
            {(editedAnalysis.patterns || []).map((pattern, idx) => (
              <div 
                key={idx} 
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center ${getConfidenceBadge(pattern.confidence)}`}
              >
                <span>{formatPatternName(pattern.name)}</span>
                <span className="ml-2 text-xs bg-gray-700/50 px-1.5 py-0.5 rounded">
                  {(pattern.confidence * 100).toFixed(0)}%
                </span>
                {editMode ? (
                  <button
                    className="ml-1 text-gray-400 hover:text-red-400"
                    onClick={() => handleDeletePattern(idx)}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <button
                    className="ml-1 text-gray-400 hover:text-white"
                    onClick={() => handleApplyValue('tag', pattern.name.toLowerCase().replace(/\s+/g, '-'))}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* Pattern legend to help user understand what patterns mean */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2 bg-[#1a1f2c]/50 p-2 rounded-lg">
            <div className="text-xs text-gray-300 flex items-center">
              <span className="w-3 h-3 bg-amber-900/30 border border-amber-700 rounded-sm mr-1"></span>
              <span>FVG (Fair Value Gap)</span>
            </div>
            <div className="text-xs text-gray-300 flex items-center">
              <span className="w-3 h-3 bg-blue-900/30 border border-blue-700 rounded-sm mr-1"></span>
              <span>OB (Order Block)</span>
            </div>
            <div className="text-xs text-gray-300 flex items-center">
              <span className="w-3 h-3 bg-green-900/30 border border-green-700 rounded-sm mr-1"></span>
              <span>Liquidity Pool/Zone</span>
            </div>
            <div className="text-xs text-gray-300 flex items-center">
              <span className="w-3 h-3 bg-purple-900/30 border border-purple-700 rounded-sm mr-1"></span>
              <span>Other Patterns</span>
            </div>
          </div>
          
          {/* In edit mode, allow adding new patterns - Fixed implementation */}
          {editMode && (
            <div className="mt-3 space-y-3">
              <PatternInput onAddPattern={handleAddPattern} />
              <PatternSelector onAddPattern={handleAddPattern} />
              
              {/* Pattern verification section */}
              <div className="mt-2 p-2 bg-gray-800/40 border border-gray-700/50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-300">Pattern verification</span>
                  <button
                    onClick={() => {
                      // Add a test pattern to verify functionality
                      const testPattern = { name: "Test Pattern", confidence: 0.85 };
                      const patterns = editedAnalysis.patterns || [];
                      
                      setEditedAnalysis(prev => ({
                        ...prev,
                        patterns: [...patterns, testPattern]
                      }));
                      
                      // Show success message
                      alert("Test pattern added successfully. Check if it appears in the pattern list above.");
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
                  >
                    Test Add Pattern
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Having trouble? Click 'Test Add Pattern' to verify if pattern adding is working correctly.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Suggested Tags */}
      {(analysis.suggestedTags?.length > 0 || editMode) && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Suggested Tags</span>
            {!editMode && (
              <button 
                onClick={() => handleApplyValue('suggestedTags', analysis.suggestedTags)}
                className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded"
              >
                Apply All Tags
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.suggestedTags?.map((tag, idx) => (
              <div 
                key={idx} 
                className="px-3 py-1 bg-[#1a1f2c] rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-[#1e263a]"
                onClick={() => !editMode && handleApplyValue('tag', tag)}
              >
                #{tag}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Calculate risk-reward ratio based on entry, take profit, and stop loss
 */
function calculateRiskReward(
  entry: number, 
  takeProfit: number, 
  stopLoss: number,
  tradeType: 'Long' | 'Short'
): string {
  let reward, risk;
  
  if (tradeType === 'Long') {
    reward = takeProfit - entry;
    risk = entry - stopLoss;
  } else {
    reward = entry - takeProfit;
    risk = stopLoss - entry;
  }
  
  if (risk <= 0) return 'Invalid (Stop not set correctly)';
  
  const ratio = reward / risk;
  return `${ratio.toFixed(2)}:1`;
}

// Enhanced pattern input component
const PatternInput = ({ onAddPattern }: { onAddPattern: (name: string, confidence: number) => void }) => {
  const [patternName, setPatternName] = useState('');
  const [confidence, setConfidence] = useState(0.8);
  const [error, setError] = useState('');
  
  const validateAndAddPattern = () => {
    if (patternName.trim() === '') {
      setError('Pattern name is required');
      return;
    }
    
    // Clear any previous error
    setError('');
    
    // Add the pattern with the specified confidence
    onAddPattern(patternName, confidence);
    
    // Reset the input field
    setPatternName('');
  };
  
  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <div className="flex-grow">
          <input
            type="text"
            value={patternName}
            onChange={(e) => {
              setPatternName(e.target.value);
              if (error) setError(''); // Clear error when typing
            }}
            placeholder="New pattern name (e.g., bullish FVG)"
            className={`p-2 w-full bg-[#252a36] border ${error ? 'border-red-500' : 'border-gray-700'} rounded text-white text-sm`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                validateAndAddPattern();
              }
            }}
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <div className="w-24">
          <select
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="p-2 w-full bg-[#252a36] border border-gray-700 rounded text-white text-sm"
          >
            <option value="0.95">95%</option>
            <option value="0.9">90%</option>
            <option value="0.8">80%</option>
            <option value="0.7">70%</option>
            <option value="0.6">60%</option>
          </select>
        </div>
        <button
          onClick={validateAndAddPattern}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm flex items-center"
        >
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
    </div>
  );
};

// Enhanced preset pattern selector
const PatternSelector = ({ onAddPattern }: { onAddPattern: (name: string, confidence: number) => void }) => {
  const [selectedPattern, setSelectedPattern] = useState('');
  const [confidence, setConfidence] = useState(0.9);

  const handleAddSelectedPattern = () => {
    if (selectedPattern) {
      onAddPattern(selectedPattern, confidence);
      setSelectedPattern(''); // Reset selection
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <div className="flex-grow">
          <select
            className="p-2 w-full bg-[#252a36] border border-gray-700 rounded text-white text-sm"
            onChange={(e) => setSelectedPattern(e.target.value)}
            value={selectedPattern}
          >
            <option value="">Select common pattern</option>
            <optgroup label="Fair Value Gaps">
              <option value="bullish FVG">Bullish FVG</option>
              <option value="bearish FVG">Bearish FVG</option>
            </optgroup>
            <optgroup label="Order Blocks">
              <option value="bullish OB">Bullish OB</option>
              <option value="bearish OB">Bearish OB</option>
            </optgroup>
            <optgroup label="Liquidity">
              <option value="liquidity pool">Liquidity Pool</option>
              <option value="liquidity grab">Liquidity Grab</option>
            </optgroup>
            <optgroup label="Support/Resistance">
              <option value="support level">Support Level</option>
              <option value="resistance level">Resistance Level</option>
            </optgroup>
          </select>
        </div>
        <div className="w-24">
          <select
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="p-2 w-full bg-[#252a36] border border-gray-700 rounded text-white text-sm"
          >
            <option value="0.95">95%</option>
            <option value="0.9">90%</option>
            <option value="0.8">80%</option>
            <option value="0.7">70%</option>
          </select>
        </div>
        <button
          onClick={handleAddSelectedPattern}
          disabled={!selectedPattern}
          className={`p-2 text-white rounded text-sm flex items-center ${
            selectedPattern 
              ? 'bg-indigo-600 hover:bg-indigo-700' 
              : 'bg-gray-600 cursor-not-allowed'
          }`}
        >
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
    </div>
  );
};

export default ChartAnalysisPanel; 