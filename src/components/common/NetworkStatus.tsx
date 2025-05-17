'use client';

import React, { useState, useEffect } from 'react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Initialize with current status
    setIsOnline(navigator.onLine);
    
    // Setup event listeners for online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      // Show the "back online" message briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true); // Keep offline banner visible
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Don't render anything if online and banner not showing
  if (isOnline && !showBanner) return null;
  
  return (
    <div 
      className={`fixed bottom-4 left-0 right-0 mx-auto w-auto max-w-md px-4 py-2 rounded-lg shadow-lg text-white font-medium text-center transition-all transform z-50 ${
        isOnline 
          ? 'bg-green-600 animate-pulse' 
          : 'bg-red-600'
      }`}
    >
      {isOnline ? (
        <div className="flex items-center justify-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          You're back online
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          You're offline. Please check your connection.
        </div>
      )}
    </div>
  );
} 