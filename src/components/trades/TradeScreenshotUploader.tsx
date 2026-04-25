import { TradingViewAnalysisResult, analyzeTradingScreenshot } from "@/lib/ai/aiService";
import React, { useState, useRef, useEffect } from 'react';
import NextImage from 'next/image';

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
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Generate previews when screenshots change
  useEffect(() => {
    previews.forEach(preview => URL.revokeObjectURL(preview));
    const newPreviews = screenshots.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    onScreenshotsChange(screenshots);
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
  
  // Process uploaded files (no compression)
  const handleFiles = async (files: File[]) => {
    setUploadError(null);
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files are allowed.');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size exceeds 10MB limit.');
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;
    setScreenshots(prev => [...prev, ...validFiles]);
    if (validFiles.length > 0) {
      analyzeScreenshot(validFiles[0]);
      setSelectedPreviewIndex(screenshots.length);
    }
  };
  
  // Remove a screenshot
  const handleRemove = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    
    if (selectedPreviewIndex === index) {
      setSelectedPreviewIndex(null);
    } else if (selectedPreviewIndex !== null && selectedPreviewIndex > index) {
      setSelectedPreviewIndex(selectedPreviewIndex - 1);
    }
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

  // Close preview modal
  const closePreview = () => {
    setSelectedPreviewIndex(null);
  };
  
  // View image in full screen preview modal
  const openPreview = (index: number) => {
    setSelectedPreviewIndex(index);
  };
  
  // Navigate between images in preview
  const navigatePreview = (direction: 'prev' | 'next') => {
    if (selectedPreviewIndex === null || previews.length <= 1) return;
    
    if (direction === 'prev') {
      setSelectedPreviewIndex(prev => 
        prev === 0 ? previews.length - 1 : (prev ?? 1) - 1
      );
    } else {
      setSelectedPreviewIndex(prev => 
        prev === previews.length - 1 ? 0 : (prev ?? -1) + 1
      );
    }
  };
  
  return (
    <div className={`bg-[#0f1117] rounded-lg overflow-hidden ${className} rounded-[2.5rem]`}>
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
          or click to browse (maximum 10MB per file)
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
                  <img
                    src={preview}
                    alt={`Screenshot ${index + 1}`}
                    className="object-cover w-full h-full"
                    onClick={() => openPreview(index)}
                  />
                  
                  {/* Screenshot Controls */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview(index);
                      }}
                      className="px-3 py-1.5 bg-blue-600/80 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManualAnalysis(index);
                      }}
                      className="px-3 py-1.5 bg-green-600/80 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
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
                
                <div className="p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300 truncate">Screenshot {index + 1}</span>
                    <span className="text-gray-500 text-xs">
                      {(screenshots[index].size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Hidden canvas for image compression */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Full-screen preview modal */}
      {selectedPreviewIndex !== null && selectedPreviewIndex < previews.length && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full relative">
            {/* Close button */}
            <button
              onClick={closePreview}
              className="absolute top-2 right-2 bg-gray-800 rounded-full p-2 text-white z-10"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Image container */}
            <div className="relative max-h-[80vh] flex items-center justify-center">
              <img
                src={previews[selectedPreviewIndex]}
                alt={`Screenshot ${selectedPreviewIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
            
            {/* Navigation buttons */}
            {previews.length > 1 && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between">
                <button
                  onClick={() => navigatePreview('prev')}
                  className="ml-4 bg-gray-800 rounded-full p-2 text-white"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={() => navigatePreview('next')}
                  className="mr-4 bg-gray-800 rounded-full p-2 text-white"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Image info */}
            <div className="text-center text-white mt-4">
              Screenshot {selectedPreviewIndex + 1} of {previews.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeScreenshotUploader; 
