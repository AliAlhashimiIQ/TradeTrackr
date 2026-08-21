'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { User, Mail, Calendar, BarChart3, TrendingUp, Camera, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

type ProfileData = {
  username: string | null;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string | null;
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [userStats, setUserStats] = useState({ totalTrades: 0, netPnl: 0 });

  useEffect(() => {
    if (user?.id) {
      const fetchStats = async () => {
        const { data: trades } = await supabase.from('trades').select('profit_loss').eq('user_id', user.id);
        if (trades) {
          const totalTrades = trades.length;
          const netPnl = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
          setUserStats({ totalTrades, netPnl });
        }
      };
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchProfile();
    }
  }, [user, loading, router]);

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          const newProfile = {
            username: null,
            full_name: null,
            email: user.email || '',
            avatar_url: null,
            created_at: new Date().toISOString()
          };
          setProfileData(newProfile);
          setFormData(newProfile);
          
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } else {
          throw error;
        }
      } else {
        let avatarUrl = data?.avatar_url;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          try {
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
            avatarUrl = publicUrlData.publicUrl;
          } catch {
            avatarUrl = null;
          }
        }
        
        const profileData: ProfileData = {
          username: data?.username || null,
          full_name: data?.full_name || null,
          email: user.email || '',
          avatar_url: avatarUrl,
          created_at: data?.created_at || user.created_at || new Date().toISOString()
        };
        
        setProfileData(profileData);
        setFormData(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData) return;
    setIsLoading(true);
    try {
      let avatarUrl = formData.avatar_url;
      if (avatarFile) avatarUrl = await uploadAvatar();
      
      const { error } = await supabase.from('profiles').update({
        username: formData.username,
        full_name: formData.full_name,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Profile updated successfully!');
      setProfileData({...formData, avatar_url: avatarUrl});
      setAvatarFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (formData) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  if (loading || isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Trader Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Manage your personal telemetry identity and trader credentials.
          </p>
        </div>
            
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Stats Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Performance Telemetry
              </h2>
              
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Member Since
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                  </p>
                </div>
                
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Total Logged Trades
                  </div>
                  <p className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {userStats.totalTrades}
                  </p>
                </div>
                
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Lifetime Net P&L
                  </div>
                  <p className={`text-2xl font-black font-mono ${userStats.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {userStats.netPnl >= 0 ? '+' : ''}
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(userStats.netPnl)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings Form */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Account Settings</h2>
              
              {formData && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-200 dark:border-white/[0.06]">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/[0.05] border-2 border-slate-200 dark:border-white/[0.1] flex items-center justify-center shadow-inner">
                        {(avatarPreview || (formData.avatar_url && formData.avatar_url.length > 0)) ? (
                          <img 
                            src={avatarPreview || formData.avatar_url || ''}
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                            {formData.full_name ? formData.full_name[0].toUpperCase() : formData.email[0]?.toUpperCase() || 'T'}
                          </div>
                        )}
                      </div>
                      <label 
                        htmlFor="avatar"
                        className="absolute -bottom-1.5 -right-1.5 bg-indigo-600 p-2 rounded-xl text-white cursor-pointer hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30 active:scale-95"
                        title="Upload Avatar"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </label>
                      <input 
                        id="avatar" 
                        name="avatar" 
                        type="file" 
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{formData.full_name || 'Set your name'}</h3>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">{formData.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="username" className="block text-xs font-mono font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                        Username
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          id="username"
                          name="username"
                          type="text"
                          value={formData.username || ''}
                          onChange={handleChange}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                          placeholder="e.g. quant_algotrader"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="full_name" className="block text-xs font-mono font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                        Full Name
                      </label>
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        value={formData.full_name || ''}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-xs font-mono font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.04] rounded-xl text-xs sm:text-sm cursor-not-allowed text-slate-500 dark:text-slate-500 font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Email is tied to your Supabase credentials and cannot be modified directly.</p>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-mono font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all disabled:opacity-70 active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      {isLoading ? 'Saving Changes…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
