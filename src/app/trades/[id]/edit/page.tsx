import { useState } from 'react';

export default function EditTrade() {
  // Minimal form state
  const [form, setForm] = useState({
    symbol: '',
    type: 'Long',
    entry_price: '',
    exit_price: '',
    quantity: '',
    entry_time: '',
    exit_time: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: Save logic here
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#10131c]">
      <form onSubmit={handleSubmit} className="bg-[#181e2e] p-8 rounded-xl shadow-lg w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-white mb-4">Edit Trade</h1>
        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
        <div>
          <label className="block text-gray-300 mb-1">Symbol</label>
          <input name="symbol" value={form.symbol} onChange={handleChange} className="w-full p-2 rounded bg-[#23273a] text-white" />
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Type</label>
          <select name="type" value={form.type} onChange={handleChange} className="w-full p-2 rounded bg-[#23273a] text-white">
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Entry Price</label>
          <input name="entry_price" value={form.entry_price} onChange={handleChange} className="w-full p-2 rounded bg-[#23273a] text-white" />
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Exit Price</label>
          <input name="exit_price" value={form.exit_price} onChange={handleChange} className="w-full p-2 rounded bg-[#23273a] text-white" />
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Quantity</label>
          <input name="quantity" value={form.quantity} onChange={handleChange} className="w-full p-2 rounded bg-[#23273a] text-white" />
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Entry Date</label>
          <input type="datetime-local" name="entry_time" value={form.entry_time} onChange={handleChange} className="w-full p-2 rounded bg-[#23273a] text-white" />
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Exit Date</label>
          <input type="datetime-local" name="exit_time" value={form.exit_time} onChange={handleChange} className="w-full p-2 rounded bg-[#23273a] text-white" />
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full p-2 rounded bg-[#23273a] text-white" />
        </div>
        <div className="flex gap-3 mt-4">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition">
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 