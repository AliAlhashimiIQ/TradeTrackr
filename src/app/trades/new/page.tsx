"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import TradeTagSelector from "@/components/trades/TradeTagSelector";
import SmartSuggestions from "@/components/trades/SmartSuggestions";
import TradeSuggestions from "@/components/ai/TradeSuggestions";
import EnhancedTradeForm from '@/components/trades/EnhancedTradeForm';
import Header from '@/components/layout/Header';

const COMMON_SYMBOLS = [
  "EURUSD",
  "AAPL",
  "BTCUSD",
  "SPY",
  "QQQ",
  "TSLA",
  "XAUUSD",
  "US100",
];

export default function NewTrade() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[var(--background)] py-10">
      <Header />
      <EnhancedTradeForm onSubmit={() => {}} />
    </div>
  );
} 