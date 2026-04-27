import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#06070b] text-white px-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[200px] bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />
      
      {/* 404 Illustration */}
      <div className="relative mb-8">
        <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chart lines in background */}
          <path d="M20 100L50 80L80 90L110 50L140 70L170 40" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
          <path d="M20 110L50 95L80 105L110 75L140 85L170 60" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.1" />
          
          {/* Big 404 */}
          <text x="100" y="85" textAnchor="middle" fontSize="72" fontWeight="800" fill="url(#notfound-grad)" opacity="0.9">
            404
          </text>
          
          {/* Broken line on the 0 */}
          <path d="M85 55L115 95" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
          </path>
          
          <defs>
            <linearGradient id="notfound-grad" x1="40" y1="40" x2="160" y2="100">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400 mb-3">
        Page Not Found
      </h1>
      <p className="text-gray-500 text-sm max-w-md text-center mb-8 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved. Let&apos;s get you back on track.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/20 transition-all"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/trades"
          className="px-6 py-2.5 bg-white/[0.06] border border-white/[0.08] text-gray-300 text-sm font-semibold rounded-xl hover:bg-white/[0.1] transition-all"
        >
          View Trades
        </Link>
      </div>
    </div>
  );
}
