import React from 'react';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0c0d14] to-[#0f1117] px-4">
      <div className="max-w-xl w-full bg-[#151823] rounded-2xl shadow-2xl p-8 border border-indigo-900/20 mt-12">
        <h1 className="text-3xl font-bold text-white mb-4 text-center">🥳 Welcome to TradeJournal!</h1>
        <p className="text-gray-300 mb-8 text-center">Here's how to get started and make the most of your trading journal.</p>
        <ol className="list-decimal list-inside space-y-4 text-gray-200">
          <li>
            <b>Complete Your Profile</b><br/>
            <span className="text-gray-400">Click your profile icon in the top right. Add your name and any other details you want.</span>
          </li>
          <li>
            <b>Add Your First Trade</b><br/>
            <span className="text-gray-400">Click the "+" New Trade" button on the Dashboard or Trades page. Fill in the trade details (symbol, entry, exit, quantity, etc.). Optionally, upload a screenshot or video.</span>
          </li>
          <li>
            <b>Connect the Chrome Extension (Optional)</b><br/>
            <span className="text-gray-400">Install the TradeJournal Chrome extension from the Chrome Web Store. Log in to the web app in your browser. Use the extension to record and upload trades directly from TradingView.</span>
          </li>
          <li>
            <b>Explore Your Dashboard</b><br/>
            <span className="text-gray-400">View your performance metrics, analytics, and calendar. Use filters to analyze your trading history.</span>
          </li>
          <li>
            <b>Stay Secure</b><br/>
            <span className="text-gray-400">Your data is private and protected by Row Level Security (RLS). Only you can see and manage your trades.</span>
          </li>
          <li>
            <b>Need Help?</b><br/>
            <span className="text-gray-400">Visit the Help/FAQ section in the app. Contact support via the "Help" button or email.</span>
          </li>
        </ol>
        <div className="mt-8 flex flex-col items-center">
          <div className="text-blue-400 font-semibold mb-2">Quick Tips</div>
          <ul className="list-disc list-inside text-gray-400 mb-6">
            <li>Only your trades are visible to you.</li>
            <li>You must be logged in to upload trades via the extension.</li>
            <li>For best results, keep your profile up to date.</li>
          </ul>
          <Link href="/dashboard">
            <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-medium hover:from-indigo-500 hover:to-blue-500 transition-all text-lg">
              Go to Dashboard
            </button>
          </Link>
        </div>
        <div className="mt-8 text-center text-gray-500 text-xs">Happy trading! 🚀</div>
      </div>
    </div>
  );
} 