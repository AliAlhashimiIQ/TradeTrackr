'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

type ProfileData = {
  username: string | null;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string | null;
};

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
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
          } catch (urlError) {
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
      const fallbackProfile = {
        username: null,
        full_name: null,
        email: user.email || '',
        avatar_url: null,
        created_at: user.created_at || new Date().toISOString()
      };
      setProfileData(fallbackProfile);
      setFormData(fallbackProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    const file = e.target.files[0];
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    
    try {
      if (formData?.avatar_url && !formData.avatar_url.startsWith('http')) {
        try {
          await supabase.storage.from('avatars').remove([formData.avatar_url]);
        } catch (removeError) {}
      }
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData) return;
    setIsLoading(true);
    setMessage(null);
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
      
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setProfileData({...formData, avatar_url: avatarUrl});
      setAvatarFile(null);
    } catch (error: any) {
      setMessage({ text: error.message || 'Failed to update profile', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-gray-400 mt-1">Update your personal information</p>
        </div>
            
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Stats Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <div className="card bg-[#131825] rounded-lg shadow-lg overflow-hidden p-6 border border-gray-800">
              <h2 className="text-xl font-bold text-white mb-6">Your Stats</h2>
              
              <div className="space-y-4">
                <div className="pb-4 border-b border-gray-800">
                  <p className="text-sm text-gray-400 mb-1">Joined Date</p>
                  <p className="text-lg font-medium text-white">
                    {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
                  </p>
                </div>
                
                <div className="pb-4 border-b border-gray-800">
                  <p className="text-sm text-gray-400 mb-1">Total Trades</p>
                  <p className="text-lg font-medium text-blue-400">
                    {userStats.totalTrades}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 mb-1">Net P&L</p>
                  <p className={`text-lg font-medium ${userStats.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {userStats.netPnl >= 0 ? '+' : ''}
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(userStats.netPnl)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings Form */}
          <div className="card md:col-span-2 bg-[#131825] rounded-lg shadow-lg overflow-hidden border border-gray-800">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
              
              {message && (
                <div className={`p-4 mb-6 rounded ${
                  message.type === 'success' ? 'bg-green-800' : 'bg-red-800'
                }`}>
                  {message.text}
                </div>
              )}
              
              {formData && (
                <form onSubmit={handleSubmit}>
                  <div className="mb-8">
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700">
                          {(avatarPreview || (formData.avatar_url && formData.avatar_url.length > 0)) ? (
                            <img 
                              src={avatarPreview || formData.avatar_url || ''}
                              alt="Avatar" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '';
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.innerHTML = `
                                    <div class="flex items-center justify-center h-full text-3xl font-bold text-gray-500">
                                      ${formData.full_name ? formData.full_name[0].toUpperCase() : '?'}
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-3xl font-bold text-gray-500">
                              {formData.full_name ? formData.full_name[0].toUpperCase() : '?'}
                            </div>
                          )}
                        </div>
                        <label 
                          htmlFor="avatar"
                          className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full cursor-pointer hover:bg-blue-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
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
                      <div className="ml-6">
                        <h3 className="font-medium text-xl text-white">{formData.full_name || 'Set your name'}</h3>
                        <p className="text-gray-400">{formData.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium mb-2 text-gray-200">
                        Username
                      </label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        value={formData.username || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-[#1a202c] border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                        placeholder="Choose a username"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="full_name" className="block text-sm font-medium mb-2 text-gray-200">
                        Full Name
                      </label>
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        value={formData.full_name || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-[#1a202c] border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-200">
                        Email Address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-3 py-2 bg-[#1a202c] border border-gray-600 rounded-md opacity-75 cursor-not-allowed text-gray-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-70 text-white"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
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
