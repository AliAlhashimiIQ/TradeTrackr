import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { analyzeTradingScreenshot, TradingViewAnalysisResult } from '@/lib/aiService';

interface TradeScreenshotUploaderProps {
  onScreenshotsChange: (files: File[]) => void;
  onAnalysisComplete: (result: TradingViewAnalysisResult) => void;
  initialScreenshots?: File[];
  className?: string;
}

const TradeScreenshotUploader: React.FC<TradeScreenshotUploaderProps> = ({
  onScreenshotsChange,
  onAnalysisComplete,
  initialScreenshots = [],
  className = '',
}) => {
  const [screenshots, setScreenshots] = useState<File[]>(initialScreenshots);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TradingViewAnalysisResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  
  // Generate previews when screenshots change
  useEffect(() => {
    // Clean up old previews
    previews.forEach(preview => URL.revokeObjectURL(preview));
    
    // Generate new previews
    const newPreviews = screenshots.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    
    // Notify parent component
    onScreenshotsChange(screenshots);
    
    // Clean up function
    return () => {
      newPreviews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [screenshots, onScreenshotsChange]);
  
  // Set up drag and drop event listeners
  useEffect(() => {
    const dropArea = dropAreaRef.current;
    if (!dropArea) return;
    
    const preventDefault = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    const handleDragOver = (e: DragEvent) => {
      preventDefault(e);
      setIsDragging(true);
    };
    
    const handleDragLeave = (e: DragEvent) => {
      preventDefault(e);
      setIsDragging(false);
    };
    
    const handleDrop = (e: DragEvent) => {
      preventDefault(e);
      setIsDragging(false);
      
      if (e.dataTransfer?.files) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    };
    
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    
    return () => {
      dropArea.removeEventListener('dragover', handleDragOver);
      dropArea.removeEventListener('dragleave', handleDragLeave);
      dropArea.removeEventListener('drop', handleDrop);
    };
  }, []);
  
  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };
  
  // Process uploaded files
  const handleFiles = (files: File[]) => {
    // Reset error state
    setUploadError(null);
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files are allowed.');
        return false;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadError('File size exceeds 5MB limit.');
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    // Add new screenshots
    setScreenshots(prev => [...prev, ...validFiles]);
    
    // Auto-analyze the first uploaded screenshot
    if (validFiles.length > 0) {
      analyzeScreenshot(validFiles[0]);
    }
  };
  
  // Remove a screenshot
  const handleRemove = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  // Analyze screenshot with AI
  const analyzeScreenshot = async (file: File) => {
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeTradingScreenshot(file);
      setAnalysisResult(result);
      onAnalysisComplete(result);
    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      setUploadError('Failed to analyze screenshot. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Manually trigger analysis
  const handleManualAnalysis = (index: number) => {
    if (index >= 0 && index < screenshots.length) {
      analyzeScreenshot(screenshots[index]);
    }
  };
  
  // Trigger file input click
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className={`bg-[#0f1117] rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-white text-sm font-semibold flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Chart Screenshots
        </h3>
        <p className="text-gray-400 text-xs mt-1">
          Upload trading chart screenshots to help document your trades
        </p>
      </div>
      
      {/* Upload Area */}
      <div 
        ref={dropAreaRef}
        className={`p-8 border-2 border-dashed rounded-lg m-4 transition-colors flex flex-col items-center justify-center cursor-pointer ${
          isDragging 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/20'
        }`}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        
        <p className="text-sm text-gray-300 mb-1">
          Drag & drop your chart screenshots here
        </p>
        <p className="text-xs text-gray-500">
          or click to browse (maximum 5MB per file)
        </p>
      </div>
      
      {/* Error Message */}
      {uploadError && (
        <div className="mx-4 mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <div className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{uploadError}</span>
          </div>
        </div>
      )}
      
      {/* Screenshot Preview Area */}
      {previews.length > 0 && (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden bg-[#151823] border border-gray-800 group">
                <div className="aspect-video relative">
                  <Image
                    src={preview}
                    alt={`Screenshot ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Screenshot Controls */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManualAnalysis(index);
                      }}
                      className="px-3 py-1.5 bg-blue-600/80 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Analyze
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      className="px-3 py-1.5 bg-red-600/80 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Screenshot Info */}
                <div className="p-2 text-xs text-gray-400 flex justify-between items-center">
                  <span>Screenshot {index + 1}</span>
                  <span>{(screenshots[index].size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* AI Analysis Status */}
      {isAnalyzing && (
        <div className="m-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center">
            <div className="mr-3">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
            <div>
              <p className="text-blue-400 text-sm font-medium">Analyzing screenshot...</p>
              <p className="text-gray-500 text-xs mt-0.5">Using AI to extract trade details</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Analysis Results */}
      {analysisResult && !isAnalyzing && (
        <div className="m-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
          <h4 className="text-green-400 text-sm font-medium mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Analysis Complete
          </h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {analysisResult.symbol && (
              <div className="bg-[#1a1f2c] p-2 rounded">
                <span className="text-gray-400">Symbol:</span>
                <span className="text-white ml-1.5">{analysisResult.symbol}</span>
              </div>
            )}
            
            {analysisResult.tradeType && (
              <div className="bg-[#1a1f2c] p-2 rounded">
                <span className="text-gray-400">Type:</span>
                <span className={`ml-1.5 ${
                  analysisResult.tradeType === 'Long' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {analysisResult.tradeType}
                </span>
              </div>
            )}
            
            {analysisResult.entryPrice && (
              <div className="bg-[#1a1f2c] p-2 rounded">
                <span className="text-gray-400">Entry Price:</span>
                <span className="text-white ml-1.5">${analysisResult.entryPrice}</span>
              </div>
            )}
            
            {analysisResult.takeProfitPrice && (
              <div className="bg-[#1a1f2c] p-2 rounded">
                <span className="text-gray-400">Take Profit:</span>
                <span className="text-white ml-1.5">${analysisResult.takeProfitPrice}</span>
              </div>
            )}
            
            {analysisResult.patterns && analysisResult.patterns.length > 0 && (
              <div className="bg-[#1a1f2c] p-2 rounded col-span-2">
                <span className="text-gray-400">Patterns:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysisResult.patterns.map((pattern, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-purple-900/30 text-purple-400 rounded">
                      {pattern.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {analysisResult.suggestedTags && analysisResult.suggestedTags.length > 0 && (
              <div className="bg-[#1a1f2c] p-2 rounded col-span-2">
                <span className="text-gray-400">Suggested Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysisResult.suggestedTags.map((tag, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-blue-900/30 text-blue-400 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Add Image Button */}
      <div className="p-4 pt-0">
        <button
          type="button"
          onClick={openFileDialog}
          className="w-full p-2 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Screenshot
        </button>
      </div>
    </div>
  );
};

export default TradeScreenshotUploader; 