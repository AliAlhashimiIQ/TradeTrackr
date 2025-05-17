'use client'

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import COLORS, { TRANSITIONS } from '@/lib/colorSystem';
import { TEXT, CARDS } from '@/lib/designSystem';

interface DashboardHeaderProps {
  userName?: string;
  sessionInfo?: string;
  streakDays?: number;
}

export default function DashboardHeader({ 
  userName,
  sessionInfo = 'London Session',
  streakDays = 7 
}: DashboardHeaderProps) {
  const { user } = useAuth();
  const displayName = userName || user?.email?.split('@')[0] || 'Trader';
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${TEXT.heading.h1} flex items-center bg-clip-text text-transparent bg-gradient-to-r from-[${COLORS.text.primary}] to-[${COLORS.text.secondary}]`}>
            Welcome back, {displayName} <span className={`ml-2 text-[${COLORS.text.primary}]`}>👋</span>
          </h1>
          <p className={`${TEXT.body.regular} text-[${COLORS.text.secondary}] mt-1 flex items-center`}>
            <span className={`inline-block w-2 h-2 rounded-full bg-[${COLORS.primary}] mr-2`}></span>
            {sessionInfo} · {formattedDate}
          </p>
        </div>
        
        <div className={`flex items-center px-5 py-2.5 bg-gradient-to-r from-[${COLORS.background.dark}] to-[${COLORS.background.medium}] rounded-xl border border-[${COLORS.border.primary}] shadow-lg ${TRANSITIONS.medium}`}>
          <div className={`mr-3 h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[${COLORS.warning}] to-[${COLORS.danger}] bg-opacity-20`}>
            <span className="text-lg">🔥</span>
          </div>
          <div>
            <div className={`font-medium text-[${COLORS.text.primary}]`}>{streakDays}-day streak!</div>
            <div className={`${TEXT.body.small} text-[${COLORS.text.secondary}]`}>Keep up the momentum</div>
          </div>
        </div>
      </div>
    </header>
  );
} 