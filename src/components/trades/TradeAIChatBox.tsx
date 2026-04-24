import React, { useState, useRef, useEffect } from 'react';
import { Trade } from '@/lib/types';
import { answerTradeQuestion } from '@/lib/ai/aiService';

interface TradeAIChatBoxProps {
  selectedTrades: Trade[];
}

const ChatIcon = ({ unread }: { unread?: boolean }) => (
  <div className="relative">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    {unread && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
  </div>
);

const TradeAIChatBox: React.FC<TradeAIChatBoxProps> = ({ selectedTrades }) => {
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<{ sender: 'user' | 'ai'; message: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setUnread(false);
  }, [open]);

  useEffect(() => {
    if (open && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (!open && chat.length > 0 && chat[chat.length - 1].sender === 'ai') {
      setUnread(true);
    }
  }, [chat, open]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setChat((prev) => [...prev, { sender: 'user', message: input }]);
    setIsLoading(true);
    try {
      const aiResponse = await answerTradeQuestion(selectedTrades, input);
      setChat((prev) => [...prev, { sender: 'ai', message: aiResponse }]);
    } catch (e) {
      setChat((prev) => [...prev, { sender: 'ai', message: 'Sorry, I could not process your request.' }]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  // Collapsed floating button
  if (!open) {
    return (
      <button
        className="fixed bottom-6 right-6 z-50 bg-white dark:bg-[#23273a] shadow-lg rounded-full p-3 border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
        onClick={() => setOpen(true)}
        aria-label="Open AI Chat"
      >
        <ChatIcon unread={unread} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-white dark:bg-[#181e2e] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#23273a] rounded-t-xl">
        <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
          <ChatIcon />
          Trade AI Chat
        </div>
        <button
          className="text-gray-400 hover:text-red-500 text-xl font-bold px-2 py-0.5 rounded"
          onClick={() => setOpen(false)}
          aria-label="Close AI Chat"
        >
          ×
        </button>
      </div>
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-white dark:bg-[#181e2e]" style={{ minHeight: 220, maxHeight: 320 }}>
        {chat.length === 0 && <div className="text-gray-400 text-center">Ask anything about your selected trades...</div>}
        {chat.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] shadow'
                  : 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[80%] shadow'
              }
            >
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#23273a] rounded-b-xl">
        <input
          className="flex-1 p-2 rounded-lg bg-gray-100 dark:bg-[#23273a] text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Ask about your trades..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={isLoading}
        />
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          )}
          {isLoading ? 'Asking...' : 'Ask'}
        </button>
      </div>
      <div className="px-4 pb-2 pt-1 text-xs text-gray-400 dark:text-gray-500 text-right">
        {selectedTrades.length} trade{selectedTrades.length !== 1 ? 's' : ''} selected
      </div>
    </div>
  );
};

export default TradeAIChatBox; 
