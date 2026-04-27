"use client";

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#06070b] text-white px-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[200px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Error Illustration */}
      <div className="relative mb-8">
        <svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Broken chart */}
          <path d="M20 100L45 75L65 85L80 55" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          <path d="M90 75L110 60L135 80" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" opacity="0.15" strokeDasharray="4 3" />
          
          {/* Warning triangle */}
          <path d="M80 30L110 80H50L80 30Z" stroke="url(#error-grad)" strokeWidth="2.5" strokeLinejoin="round" fill="none">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
          </path>
          
          {/* Exclamation mark */}
          <line x1="80" y1="45" x2="80" y2="62" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <circle cx="80" cy="70" r="2" fill="#ef4444" opacity="0.8" />
          
          {/* Spark particles */}
          <circle cx="45" cy="45" r="1.5" fill="#f59e0b" opacity="0.4">
            <animate attributeName="opacity" values="0;0.6;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="120" cy="50" r="1" fill="#ef4444" opacity="0.3">
            <animate attributeName="opacity" values="0;0.5;0" dur="2s" repeatCount="indefinite" begin="0.5s" />
          </circle>
          <circle cx="55" cy="95" r="1.5" fill="#6366f1" opacity="0.3">
            <animate attributeName="opacity" values="0;0.4;0" dur="1.8s" repeatCount="indefinite" begin="0.3s" />
          </circle>

          <defs>
            <linearGradient id="error-grad" x1="50" y1="30" x2="110" y2="80">
              <stop stopColor="#ef4444" />
              <stop offset="1" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400 mb-3">
        Something Went Wrong
      </h1>
      <p className="text-gray-500 text-sm max-w-md text-center mb-8 leading-relaxed">
        An unexpected error occurred. Don&apos;t worry — your data is safe. Try refreshing the page, or head back to the dashboard.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/20 transition-all"
        >
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-2.5 bg-white/[0.06] border border-white/[0.08] text-gray-300 text-sm font-semibold rounded-xl hover:bg-white/[0.1] transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
