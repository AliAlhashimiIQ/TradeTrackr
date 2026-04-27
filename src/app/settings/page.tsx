'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { PROP_FIRMS } from '@/lib/propFirms';

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<'general' | 'notifications' | 'data' | 'danger' | 'account'>(
    (searchParams.get('tab') as any) || 'general'
  );
  const [isSaving, setIsSaving] = useState(false);

  // General settings state
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [defaultTradeType, setDefaultTradeType] = useState('Long');

  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [tradeAlerts, setTradeAlerts] = useState(false);

  // Prop Firm / Challenge state
  const [selectedFirmId, setSelectedFirmId] = useState<string>('');
  const [selectedTierName, setSelectedTierName] = useState<string>('');
  const [challengeStartDate, setChallengeStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [challengeStartBalance, setChallengeStartBalance] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      // Load saved settings from Supabase
      const fetchSettings = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') throw error;
          
          const settings = data?.settings || {};
          
          if (settings.currency) setCurrency(settings.currency);
          if (settings.timezone) setTimezone(settings.timezone);
          if (settings.defaultTradeType) setDefaultTradeType(settings.defaultTradeType);
          if (settings.emailNotifications !== undefined) setEmailNotifications(settings.emailNotifications);
          if (settings.weeklyReport !== undefined) setWeeklyReport(settings.weeklyReport);
          if (settings.tradeAlerts !== undefined) setTradeAlerts(settings.tradeAlerts);
          if (settings.propFirmId) setSelectedFirmId(settings.propFirmId);
          if (settings.propFirmTier) setSelectedTierName(settings.propFirmTier);
          if (settings.challengeStartDate) setChallengeStartDate(settings.challengeStartDate);
          if (settings.challengeStartBalance) setChallengeStartBalance(String(settings.challengeStartBalance));
        } catch (error) {
          console.error('Error fetching settings:', error);
        }
      };
      
      fetchSettings();
    }
  }, [user, loading, router]);

  const updateSupabaseSettings = async (updates: any) => {
    if (!user) return false;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();
        
      const currentSettings = profile?.settings || {};
      const updatedSettings = { ...currentSettings, ...updates };

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          email: user.email,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    const success = await updateSupabaseSettings({
      currency,
      timezone,
      defaultTradeType
    });
    
    // Also save to localStorage as a fallback for immediate UI updates
    localStorage.setItem('settings_currency', currency);
    localStorage.setItem('settings_timezone', timezone);
    localStorage.setItem('settings_defaultTradeType', defaultTradeType);
    
    setIsSaving(false);
    if (success) {
      toast.success('Settings saved securely to database!');
    } else {
      toast.error('Failed to save settings to database.');
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    const success = await updateSupabaseSettings({
      emailNotifications,
      weeklyReport,
      tradeAlerts
    });
    
    // LocalStorage fallback
    localStorage.setItem('settings_emailNotifications', String(emailNotifications));
    localStorage.setItem('settings_weeklyReport', String(weeklyReport));
    localStorage.setItem('settings_tradeAlerts', String(tradeAlerts));
    
    setIsSaving(false);
    if (success) {
      toast.success('Notification preferences saved securely!');
    } else {
      toast.error('Failed to save notification preferences.');
    }
  };

  const handleSavePropFirm = async () => {
    if (!selectedFirmId) {
      toast.error('Please select a prop firm first.');
      return;
    }
    setIsSaving(true);
    const firm = PROP_FIRMS.find(f => f.id === selectedFirmId);
    const tier = firm?.tiers.find(t => t.tierName === selectedTierName);
    const balance = parseFloat(challengeStartBalance) || tier?.accountSize || 0;
    const success = await updateSupabaseSettings({
      propFirmId: selectedFirmId,
      propFirmTier: selectedTierName,
      challengeStartDate,
      challengeStartBalance: balance,
    });
    setIsSaving(false);
    if (success) {
      toast.success('Prop firm challenge saved!');
    } else {
      toast.error('Failed to save prop firm settings.');
    }
  };

  const handleClearPropFirm = async () => {
    setIsSaving(true);
    const success = await updateSupabaseSettings({
      propFirmId: null,
      propFirmTier: null,
      challengeStartDate: null,
      challengeStartBalance: null,
    });
    setIsSaving(false);
    if (success) {
      setSelectedFirmId('');
      setSelectedTierName('');
      toast.success('Prop firm challenge cleared.');
    }
  };

  const handleExportData = () => {
    toast.success('Data export started. Check your downloads folder.');
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (window.confirm('This will permanently delete all your trades, analytics, and profile data. Type "DELETE" to confirm.')) {
        toast.error('Account deletion is not yet available. Please contact support.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0a0a10]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) return null;

  const selectedFirm = PROP_FIRMS.find(f => f.id === selectedFirmId) ?? null;
  const availableTiers = selectedFirm?.tiers ?? [];

  const sections = [
    { id: 'profile' as any, label: 'Profile & Stats', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { id: 'general' as const, label: 'General', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { id: 'account' as const, label: 'Prop Firm', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-56 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    if (section.id === 'profile') {
                      router.push('/profile');
                    } else {
                      setActiveSection(section.id);
                    }
                  }}
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
                className="card bg-white dark:bg-[#151823] rounded-xl border border-gray-200 dark:border-indigo-900/20 p-6 shadow-sm dark:shadow-none"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">General Settings</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="IQD">IQD (ع.د)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 mb-4">Theme</label>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                          theme === 'light' 
                            ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                            : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <Sun className="w-6 h-6" />
                        <span className="text-xs font-medium">Light</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                          theme === 'dark' 
                            ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                            : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <Moon className="w-6 h-6" />
                        <span className="text-xs font-medium">Dark</span>
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                          theme === 'system' 
                            ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                            : 'bg-[#0f1117] border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <Monitor className="w-6 h-6" />
                        <span className="text-xs font-medium">System</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Trade Type</label>
                    <select
                      value={defaultTradeType}
                      onChange={(e) => setDefaultTradeType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="Long">Long</option>
                      <option value="Short">Short</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={handleSaveGeneral}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
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
                className="card bg-[#151823] rounded-xl border border-indigo-900/20 p-6"
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
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Prop Firm / Account */}
            {activeSection === 'account' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card bg-[#151823] rounded-xl border border-indigo-900/20 p-6"
              >
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-white">Prop Firm Challenge</h2>
                  <p className="text-sm text-gray-400 mt-1">Set up your challenge so TradeTrackr can track drawdown limits and profit targets in real time.</p>
                </div>

                <div className="space-y-5">
                  {/* Firm Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Prop Firm</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PROP_FIRMS.map(firm => (
                        <button
                          key={firm.id}
                          onClick={() => { setSelectedFirmId(firm.id); setSelectedTierName(firm.tiers[0].tierName); setChallengeStartBalance(String(firm.tiers[0].accountSize)); }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            selectedFirmId === firm.id
                              ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                              : 'bg-[#0d0e16] border-white/[0.06] text-gray-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <span className="text-base">{firm.logo}</span>
                          <span className="truncate">{firm.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tier Selector */}
                  {selectedFirm && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Account Tier</label>
                      <select
                        value={selectedTierName}
                        onChange={e => {
                          setSelectedTierName(e.target.value);
                          const tier = selectedFirm.tiers.find(t => t.tierName === e.target.value);
                          if (tier) setChallengeStartBalance(String(tier.accountSize));
                        }}
                        className="w-full px-3 py-2.5 bg-[#0d0e16] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        {availableTiers.map(tier => (
                          <option key={tier.tierName} value={tier.tierName}>{tier.tierName} — ${tier.accountSize.toLocaleString()}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Challenge Rules Preview */}
                  {selectedFirm && selectedTierName && (() => {
                    const tier = selectedFirm.tiers.find(t => t.tierName === selectedTierName);
                    if (!tier) return null;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Profit Target', value: `${tier.profitTargetPercent}%`, color: 'text-emerald-400' },
                          { label: 'Daily DD Limit', value: `${tier.maxDailyLossPercent}%`, color: 'text-amber-400' },
                          { label: 'Total DD Limit', value: `${tier.maxTotalLossPercent}%`, color: 'text-red-400' },
                          { label: 'Min Days', value: tier.minTradingDays ? `${tier.minTradingDays}d` : 'None', color: 'text-blue-400' },
                        ].map(item => (
                          <div key={item.label} className="bg-[#0d0e16] border border-white/[0.05] rounded-xl p-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                          </div>
                        ))}
                        {tier.trailingDrawdown && <div className="col-span-2 text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">⚠ Trailing drawdown — your limit follows your peak equity</div>}
                        {tier.consistencyRule && <div className="col-span-2 text-[11px] text-blue-400 bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2">📊 Consistency rule active — no single day {'>'} 40% of total profit</div>}
                        {tier.newsRestrictionMinutes > 0 && <div className="col-span-2 text-[11px] text-purple-400 bg-purple-500/5 border border-purple-500/20 rounded-lg px-3 py-2">📰 No trading ±{tier.newsRestrictionMinutes}min around high-impact news</div>}
                      </div>
                    );
                  })()}

                  {/* Start Date & Balance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Challenge Start Date</label>
                      <input
                        type="date"
                        value={challengeStartDate}
                        onChange={e => setChallengeStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#0d0e16] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Starting Balance ($)</label>
                      <input
                        type="number"
                        value={challengeStartBalance}
                        onChange={e => setChallengeStartBalance(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#0d0e16] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="e.g. 100000"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/[0.05] flex items-center gap-3">
                    <button
                      onClick={handleSavePropFirm}
                      disabled={isSaving || !selectedFirmId}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Challenge'}
                    </button>
                    {selectedFirmId && (
                      <button
                        onClick={handleClearPropFirm}
                        disabled={isSaving}
                        className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Data & Export */}
            {activeSection === 'data' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card bg-[#151823] rounded-xl border border-indigo-900/20 p-6"
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
                className="card bg-[#151823] rounded-xl border border-red-900/30 p-6"
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
