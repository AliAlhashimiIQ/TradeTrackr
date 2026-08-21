'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Check, ShieldCheck, Zap, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { PROP_FIRMS } from '@/lib/propFirms';
import PropFirmLogo from '@/components/ui/PropFirmLogo';
import { useSettings } from '@/providers/SettingsProvider';

function SettingsContent() {
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { colorblindMode, setColorblindMode } = useSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<'general' | 'notifications' | 'data' | 'danger' | 'account' | 'billing'>(
    (searchParams?.get('tab') as any) || 'general'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('active');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  // General settings state
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [defaultTradeType, setDefaultTradeType] = useState('Long');
  const [startingBalance, setStartingBalance] = useState('10000');
  const [localColorblindMode, setLocalColorblindMode] = useState(false);

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
            .select('settings, subscription_tier, subscription_status')
            .eq('id', user.id)
            .single();

          const profileData = data as any;
          if (profileData?.subscription_tier) setSubscriptionTier(profileData.subscription_tier);
          if (profileData?.subscription_status) setSubscriptionStatus(profileData.subscription_status);

          const settings = (data?.settings as any) || {};
          
          if (settings.currency) setCurrency(settings.currency);
          if (settings.timezone) setTimezone(settings.timezone);
          if (settings.defaultTradeType) setDefaultTradeType(settings.defaultTradeType);
          if (settings.startingBalance !== undefined) setStartingBalance(String(settings.startingBalance));
          if (settings.colorblindMode !== undefined) {
            setLocalColorblindMode(!!settings.colorblindMode);
            setColorblindMode(!!settings.colorblindMode);
          }
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
        
      const currentSettings = (profile?.settings as any) || {};
      const updatedSettings = { ...currentSettings, ...updates };

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          email: user.email || '',
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
      defaultTradeType,
      startingBalance: Number(startingBalance) || 10000,
      colorblindMode: localColorblindMode
    });
    
    // Also save to localStorage as a fallback for immediate UI updates
    localStorage.setItem('settings_currency', currency);
    localStorage.setItem('settings_timezone', timezone);
    localStorage.setItem('settings_defaultTradeType', defaultTradeType);
    localStorage.setItem('settings_startingBalance', startingBalance);
    localStorage.setItem('settings_colorblindMode', String(localColorblindMode));
    
    // Update global state
    setColorblindMode(localColorblindMode);
    
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

  const handleCheckout = async (priceId: string, tier: string) => {
    try {
      setIsCheckingOut(true);
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ priceId, tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
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
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[var(--surface-0)]">
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
    { id: 'billing' as const, label: 'Billing & Subscription', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
            {/* General Settings */}
            {activeSection === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="card bg-white dark:bg-[var(--surface-1)] rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">General Settings</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-950/60 border border-black/10 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-950/60 border border-black/10 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Theme</label>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                          theme === 'light' 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-white dark:bg-slate-950/60 border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                      >
                        <Sun className="w-6 h-6" />
                        <span className="text-xs font-medium">Light</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                          theme === 'dark' 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                            : 'bg-white dark:bg-slate-950/60 border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                      >
                        <Moon className="w-6 h-6" />
                        <span className="text-xs font-medium">Dark</span>
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                          theme === 'system' 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-white dark:bg-slate-950/60 border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20 dark:hover:border-white/20'
                        }`}
                      >
                        <Monitor className="w-6 h-6" />
                        <span className="text-xs font-medium">System</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-950/60">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white">Colorblind Mode</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Swap standard Green/Red accents for high-contrast Blue/Orange variants.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalColorblindMode(!localColorblindMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        localColorblindMode ? 'bg-indigo-600' : 'bg-gray-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localColorblindMode ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Trade Type</label>
                    <select
                      value={defaultTradeType}
                      onChange={(e) => setDefaultTradeType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-950/60 border border-black/10 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="Long">Long</option>
                      <option value="Short">Short</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Starting Balance (Manual Accounts)</label>
                    <input
                      type="number"
                      value={startingBalance}
                      onChange={(e) => setStartingBalance(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-950/60 border border-black/10 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="10000"
                    />
                    <p className="text-xs text-gray-500 mt-1">This balance will be used as the starting capital for manual trades when no external trading account is linked.</p>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-white/10">
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

            {/* Billing & Subscription */}
            {activeSection === 'billing' && (
              <motion.div
                key="billing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[var(--surface-1)] p-6 sm:p-8 shadow-xl backdrop-blur-xl"
              >
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

                {/* Section Header & Live Status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80 dark:border-white/[0.06]">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                      <span>Billing & Subscriptions</span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        Trader Plans
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Institutional prop firm drawdown locks, AI psychology insights, and unlimited backtesting.
                    </p>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-2.5 self-start md:self-auto bg-slate-100 dark:bg-white/[0.04] px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Current Plan: <span className="font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">{subscriptionTier}</span>
                    </span>
                  </div>
                </div>

                {/* Billing Cycle Switcher (Monthly vs Yearly) */}
                <div className="flex justify-center mb-8">
                  <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setBillingInterval('monthly')}
                      className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${
                        billingInterval === 'monthly'
                          ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingInterval('yearly')}
                      className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                        billingInterval === 'yearly'
                          ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>Annual Billing</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        SAVE 20%
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3 Tier Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  
                  {/* 1. Free Sandbox Tier */}
                  <div className={`relative rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 ${
                    subscriptionTier === 'free'
                      ? 'border-slate-300 dark:border-white/20 bg-white dark:bg-white/[0.03] shadow-md'
                      : 'border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01]'
                  }`}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">Free Sandbox</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Basic manual journal</p>
                        </div>
                        {subscriptionTier === 'free' && (
                          <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono font-bold px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/15">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="my-6">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight">$0</span>
                          <span className="text-xs text-slate-500 font-mono font-semibold">/ month</span>
                        </div>
                      </div>

                      <div className="w-full h-px bg-slate-200 dark:bg-white/[0.06] mb-6" />

                      <ul className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 mb-8 font-medium">
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Up to <strong className="font-mono font-bold">25 manual trades</strong> / mo</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Standard metrics & performance calendar</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong className="font-mono font-bold">1</strong> Trading account link</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      disabled={subscriptionTier === 'free'}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold font-mono bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/[0.06] cursor-not-allowed"
                    >
                      {subscriptionTier === 'free' ? 'Current Active Plan' : 'Free Tier'}
                    </button>
                  </div>

                  {/* 2. Pro Trader (FEATURED / PROP READY) */}
                  <div className={`relative rounded-3xl p-6 border-2 flex flex-col justify-between transition-all duration-300 ${
                    subscriptionTier === 'pro'
                      ? 'border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-950/30 shadow-xl shadow-indigo-500/10'
                      : 'border-indigo-500/60 dark:border-indigo-500/80 bg-white dark:bg-[#0e111d] shadow-xl shadow-indigo-500/5 hover:border-indigo-500'
                  }`}>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider bg-indigo-600 !text-white shadow-sm mb-3 whitespace-nowrap">
                        <Zap className="w-3 h-3 !text-white fill-white shrink-0" />
                        <span className="!text-white font-bold">Most Popular · Prop Ready</span>
                      </div>

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">Pro Trader</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">For active funded & retail traders</p>
                        </div>
                        {subscriptionTier === 'pro' && (
                          <span className="text-[10px] bg-indigo-600 text-white font-mono font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="my-6">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                            ${billingInterval === 'yearly' ? '8' : '10'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono font-semibold">/ month</span>
                        </div>
                        {billingInterval === 'yearly' && (
                          <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-1">Billed $96 annually (Save $24)</p>
                        )}
                      </div>

                      <div className="w-full h-px bg-slate-200 dark:bg-white/[0.06] mb-6" />

                      <ul className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 mb-8 font-medium">
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong className="font-bold">Unlimited</strong> trade logging</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong className="font-bold">MT4/MT5 & CSV</strong> statement parsers</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong className="font-bold">Sharpe & Sortino</strong> risk telemetry</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong className="font-mono font-bold">3</strong> Trading accounts link</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCheckout('price_pro_monthly', 'pro')}
                      disabled={isCheckingOut || subscriptionTier === 'pro'}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold font-mono tracking-wide bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isCheckingOut ? 'Opening Stripe Checkout...' : subscriptionTier === 'pro' ? 'Current Active Plan' : 'Upgrade to Pro'}
                    </button>
                  </div>

                  {/* 3. Institutional Tier */}
                  <div className={`relative rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 ${
                    subscriptionTier === 'institutional'
                      ? 'border-slate-800 dark:border-white/30 bg-white dark:bg-white/[0.04] shadow-xl'
                      : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.15]'
                  }`}>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/15 mb-3">
                        <Crown className="w-3 h-3 text-amber-500 fill-amber-500" /> Apex Intelligence
                      </div>

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">Institutional</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Prop firm & AI power tools</p>
                        </div>
                        {subscriptionTier === 'institutional' && (
                          <span className="text-[10px] bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono font-bold px-2.5 py-0.5 rounded-full shadow">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="my-6">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                            ${billingInterval === 'yearly' ? '24' : '30'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono font-semibold">/ month</span>
                        </div>
                        {billingInterval === 'yearly' && (
                          <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-1">Billed $288 annually (Save $72)</p>
                        )}
                      </div>

                      <div className="w-full h-px bg-slate-200 dark:bg-white/[0.06] mb-6" />

                      <ul className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 mb-8 font-medium">
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong className="font-bold">Prop Firm Drawdown Locks</strong></span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong className="font-bold">"What-If" Mistake</strong> Simulator</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong className="font-bold">AI Pattern & Psychology</strong> Coach</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span><strong className="font-bold">Unlimited accounts</strong> & replay</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCheckout('price_institutional_monthly', 'institutional')}
                      disabled={isCheckingOut || subscriptionTier === 'institutional'}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold font-mono tracking-wide bg-slate-900 text-white hover:bg-slate-800 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isCheckingOut ? 'Opening Stripe Checkout...' : subscriptionTier === 'institutional' ? 'Current Active Plan' : 'Upgrade to Institutional'}
                    </button>
                  </div>

                </div>

                {/* Trust & Guarantee Footer */}
                <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong className="font-semibold text-slate-700 dark:text-slate-300">256-Bit SSL Encrypted</strong> Checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Powered by <strong className="font-semibold text-slate-700 dark:text-slate-300">Stripe</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Cancel or switch tiers anytime in 1 click</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notification Settings */}
            {activeSection === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="card bg-white/80 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 p-6 shadow-2xl"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Notification Preferences</h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive important updates via email</p>
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
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Weekly Performance Report</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Get a summary of your trading week every Sunday</p>
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
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Trade Alerts</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Get alerts when price targets are hit</p>
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

                  <div className="pt-4 border-t border-gray-200 dark:border-white/10">
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
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="card bg-white/80 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 p-6 shadow-2xl"
              >
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prop Firm Challenge</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set up your challenge so TradeTrackr can track drawdown limits and profit targets in real time.</p>
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
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-white'
                              : 'bg-white dark:bg-slate-950/60 border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-black/20 dark:hover:border-white/20'
                          }`}
                        >
                          <PropFirmLogo firmId={firm.id} className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{firm.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tier Selector */}
                  {selectedFirm && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Tier</label>
                      <select
                        value={selectedTierName}
                        onChange={e => {
                          setSelectedTierName(e.target.value);
                          const tier = selectedFirm.tiers.find(t => t.tierName === e.target.value);
                          if (tier) setChallengeStartBalance(String(tier.accountSize));
                        }}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-950/60 border border-black/10 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                          { label: 'Profit Target', value: `${tier.profitTargetPercent}%`, color: 'text-emerald-500 dark:text-emerald-400' },
                          { label: 'Daily DD Limit', value: `${tier.maxDailyLossPercent}%`, color: 'text-amber-500 dark:text-amber-400' },
                          { label: 'Total DD Limit', value: `${tier.maxTotalLossPercent}%`, color: 'text-red-500 dark:text-red-400' },
                          { label: 'Min Days', value: tier.minTradingDays ? `${tier.minTradingDays}d` : 'None', color: 'text-blue-500 dark:text-blue-400' },
                        ].map(item => (
                          <div key={item.label} className="bg-gray-50 dark:bg-slate-950/60 border border-black/5 dark:border-white/10 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                          </div>
                        ))}
                        {tier.trailingDrawdown && <div className="col-span-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">Trailing drawdown — your limit follows your peak equity</div>}
                        {tier.consistencyRule && <div className="col-span-2 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">Consistency rule active — no single day {'>'} 40% of total profit</div>}
                        {tier.newsRestrictionMinutes > 0 && <div className="col-span-2 text-[11px] text-purple-600 dark:text-purple-400 bg-purple-500/5 border border-purple-500/10 rounded-lg px-3 py-2">No trading ±{tier.newsRestrictionMinutes}min around high-impact news</div>}
                      </div>
                    );
                  })()}

                  {/* Start Date & Balance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Challenge Start Date</label>
                      <input
                        type="date"
                        value={challengeStartDate}
                        onChange={e => setChallengeStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-950/60 border border-black/10 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Starting Balance ($)</label>
                      <input
                        type="number"
                        value={challengeStartBalance}
                        onChange={e => setChallengeStartBalance(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-950/60 border border-black/10 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                        placeholder="e.g. 100000"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-3">
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
                        className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg text-sm font-medium transition-colors"
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
                key="data"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="card bg-white/80 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 p-6 shadow-2xl"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Data Management</h2>

                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 dark:bg-slate-950/50 border border-black/[0.04] dark:border-white/[0.04] rounded-xl">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Export All Data</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Download all your trades, analytics, and profile data as a JSON file.</p>
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

                  <div className="p-4 bg-gray-50 dark:bg-slate-950/50 border border-black/[0.04] dark:border-white/[0.04] rounded-xl">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Account Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Email</span>
                        <span className="text-gray-900 dark:text-white font-mono text-xs">{user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">User ID</span>
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
                key="danger"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="card bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50 p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-red-500 dark:text-red-400 mb-6">Danger Zone</h2>

                <div className="space-y-6">
                  <div className="p-4 bg-red-500/5 border border-red-500/10 dark:border-red-500/15 rounded-xl">
                    <h3 className="text-sm font-medium text-red-500 dark:text-red-400 mb-2">Sign Out of All Devices</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">This will sign you out everywhere and invalidate all sessions.</p>
                    <button
                      onClick={async () => {
                        await signOut();
                        router.push('/login');
                      }}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 dark:text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-600/30"
                    >
                      Sign Out Everywhere
                    </button>
                  </div>

                  <div className="p-4 bg-red-500/5 border border-red-500/10 dark:border-red-500/15 rounded-xl">
                    <h3 className="text-sm font-medium text-red-500 dark:text-red-400 mb-2">Delete Account</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
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
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0a0a10]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

