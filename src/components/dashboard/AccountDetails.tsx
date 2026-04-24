import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';

interface AccountDetailsProps {
  initialBalance?: number;
  trades: Trade[];
}

export default function AccountDetails({ initialBalance = 25000, trades }: AccountDetailsProps) {
  // Calculate account growth and balance history
  const [balanceHistory, setBalanceHistory] = useState<number[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(initialBalance);
  const [balanceInput, setBalanceInput] = useState<string>(initialBalance.toString());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let balance = Number(balanceInput);
    const history: number[] = [balance];
    trades.forEach(trade => {
      balance += trade.profit_loss;
      history.push(balance);
    });
    setBalanceHistory(history);
    setCurrentBalance(balance);
  }, [trades, balanceInput]);

  const growthPercent = ((currentBalance - Number(balanceInput)) / Number(balanceInput)) * 100;

  return (
    <div className="bg-gradient-to-br from-[#181e2e]/80 to-[#232a3d]/80 rounded-2xl shadow-xl border border-blue-900/20 p-6 mb-8">
      <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
        Account Details
      </h3>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-4">
        <div>
          <div className="text-lg text-gray-300">Starting Balance</div>
          {editing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min={0}
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                className="p-2 rounded bg-[#232a3d] text-blue-400 font-bold border border-blue-700/30 focus:ring-2 focus:ring-blue-400 w-32"
              />
              <button
                className="px-3 py-1 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                onClick={() => setEditing(false)}
              >Save</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-blue-400">${Number(balanceInput).toLocaleString()}</div>
              <button
                className="ml-2 px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-800 transition text-xs"
                onClick={() => setEditing(true)}
              >Edit</button>
            </div>
          )}
        </div>
        <div>
          <div className="text-lg text-gray-300">Current Balance</div>
          <div className={`text-2xl font-bold ${currentBalance >= Number(balanceInput) ? 'text-green-400' : 'text-red-400'}`}>${currentBalance.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-lg text-gray-300">Growth</div>
          <div className={`text-2xl font-bold ${growthPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(2)}%</div>
        </div>
      </div>
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-white mb-2">Balance History</h4>
        <div className="w-full h-32 bg-[#131825] rounded-lg p-2 flex items-end gap-1 overflow-x-auto">
          {balanceHistory.map((bal, idx) => (
            <div key={idx} style={{ height: `${40 + (bal-Number(balanceInput))/Number(balanceInput)*60}px` }} className={`w-2 rounded bg-blue-400/70 transition-all`} title={`$${bal.toLocaleString()}`}></div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>Start</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
}
