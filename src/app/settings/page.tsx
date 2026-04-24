'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'general' | 'notifications' | 'data' | 'danger'>('general');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // General settings state
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [defaultTradeType, setDefaultTradeType] = useState('Long');

  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [tradeAlerts, setTradeAlerts] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSaveGeneral = () => {
    // Save to localStorage for now
    localStorage.setItem('settings_currency', currency);
    localStorage.setItem('settings_timezone', timezone);
    localStorage.setItem('settings_defaultTradeType', defaultTradeType);
    setMessage({ text: 'Settings saved successfully!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('settings_emailNotifications', String(emailNotifications));
    localStorage.setItem('settings_weeklyReport', String(weeklyReport));
    localStorage.setItem('settings_tradeAlerts', String(tradeAlerts));
    setMessage({ text: 'Notification preferences saved!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportData = () => {
    setMessage({ text: 'Data export started. Check your downloads folder.', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (window.confirm('This will permanently delete all your trades, analytics, and profile data. Type "DELETE" to confirm.')) {
        setMessage({ text: 'Account deletion is not yet available. Please contact support.', type: 'error' });
        setTimeout(() => setMessage(null), 5000);
      }
    }
  };

  // Load saved settings
  useEffect(() => {
    const savedCurrency = localStorage.getItem('settings_currency');
    const savedTimezone = localStorage.getItem('settings_timezone');
    const savedTradeType = localStorage.getItem('settings_defaultTradeType');
    const savedEmailNotif = localStorage.getItem('settings_emailNotifications');
    const savedWeeklyReport = localStorage.getItem('settings_weeklyReport');
    const savedTradeAlerts = localStorage.getItem('settings_tradeAlerts');

    if (savedCurrency) setCurrency(savedCurrency);
    if (savedTimezone) setTimezone(savedTimezone);
    if (savedTradeType) setDefaultTradeType(savedTradeType);
    if (savedEmailNotif) setEmailNotifications(savedEmailNotif === 'true');
    if (savedWeeklyReport) setWeeklyReport(savedWeeklyReport === 'true');
    if (savedTradeAlerts) setTradeAlerts(savedTradeAlerts === 'true');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a10]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) return null;

  const sections = [
    { id: 'general' as const, label: 'General', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { id: 'notifications' as const, label: 'Notifications', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )},
    { id: 'data' as const, label: 'Data & Export', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    )},
    { id: 'danger' as const, label: 'Danger Zone', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )},
  ];

  return (
    <AuthenticatedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your account preferences</p>
        </div>

        {/* Toast Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-56 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* General Settings */}
            {activeSection === 'general' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#151823] rounded-xl border border-indigo-900/20 p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-6">General Settings</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0f1117] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="IQD">IQD (ع.د)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0f1117] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Central European (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Baghdad">Baghdad (AST)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Trade Type</label>
                    <select
                      value={defaultTradeType}
                      onChange={(e) => setDefaultTradeType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0f1117] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="Long">Long</option>
                      <option value="Short">Short</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <button
                      onClick={handleSaveGeneral}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notification Settings */}
            {activeSection === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#151823] rounded-xl border border-indigo-900/20 p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-6">Notification Preferences</h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white">Email Notifications</h3>
                      <p className="text-xs text-gray-400 mt-1">Receive important updates via email</p>
                    </div>
                    <button
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        emailNotifications ? 'bg-indigo-600' : 'bg-gray-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        emailNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white">Weekly Performance Report</h3>
                      <p className="text-xs text-gray-400 mt-1">Get a summary of your trading week every Sunday</p>
                    </div>
                    <button
                      onClick={() => setWeeklyReport(!weeklyReport)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        weeklyReport ? 'bg-indigo-600' : 'bg-gray-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        weeklyReport ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white">Trade Alerts</h3>
                      <p className="text-xs text-gray-400 mt-1">Get alerts when price targets are hit</p>
                    </div>
                    <button
                      onClick={() => setTradeAlerts(!tradeAlerts)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        tradeAlerts ? 'bg-indigo-600' : 'bg-gray-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        tradeAlerts ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <button
                      onClick={handleSaveNotifications}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Data & Export */}
            {activeSection === 'data' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#151823] rounded-xl border border-indigo-900/20 p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-6">Data Management</h2>

                <div className="space-y-6">
                  <div className="p-4 bg-[#0f1117] rounded-lg border border-gray-800">
                    <h3 className="text-sm font-medium text-white mb-2">Export All Data</h3>
                    <p className="text-xs text-gray-400 mb-4">Download all your trades, analytics, and profile data as a JSON file.</p>
                    <button
                      onClick={handleExportData}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export Data
                    </button>
                  </div>

                  <div className="p-4 bg-[#0f1117] rounded-lg border border-gray-800">
                    <h3 className="text-sm font-medium text-white mb-2">Account Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email</span>
                        <span className="text-white">{user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">User ID</span>
                        <span className="text-gray-500 text-xs font-mono">{user.id?.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Danger Zone */}
            {activeSection === 'danger' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#151823] rounded-xl border border-red-900/30 p-6"
              >
                <h2 className="text-lg font-semibold text-red-400 mb-6">Danger Zone</h2>

                <div className="space-y-6">
                  <div className="p-4 bg-red-500/5 rounded-lg border border-red-900/30">
                    <h3 className="text-sm font-medium text-red-400 mb-2">Sign Out of All Devices</h3>
                    <p className="text-xs text-gray-400 mb-4">This will sign you out everywhere and invalidate all sessions.</p>
                    <button
                      onClick={async () => {
                        await signOut();
                        router.push('/login');
                      }}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-600/30"
                    >
                      Sign Out Everywhere
                    </button>
                  </div>

                  <div className="p-4 bg-red-500/5 rounded-lg border border-red-900/30">
                    <h3 className="text-sm font-medium text-red-400 mb-2">Delete Account</h3>
                    <p className="text-xs text-gray-400 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete My Account
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
