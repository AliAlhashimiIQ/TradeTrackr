import React from 'react';
import Link from 'next/link';

export default function DashboardActions() {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Link 
        href="/trades/new"
        className="inline-flex items-center px-4 py-2 bg-white dark:bg-[#1d2333] hover:bg-gray-100 dark:hover:bg-[#272e42] border border-black/10 dark:border-transparent text-gray-850 dark:text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
      >
        <svg className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
        </svg>
        Quick Journal
      </Link>
      
      <Link 
        href="/trades/new"
        className="inline-flex items-center px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        Add Trade
      </Link>
    </div>
  );
}
