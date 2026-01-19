import { useState, useEffect } from 'react';
import { X, ChevronDown, Calendar } from 'lucide-react';
import type { Expense } from '../../../shared/types';

interface EditExpenseModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<Omit<Expense, 'id' | 'user_id'>>) => Promise<void>;
  currencySymbol?: string;
}

// Helper to format date to YYYY-MM-DD
const formatDateForInput = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
};

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const categories = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Bills', 'Health', 'Housing', 'Other'];

export function EditExpenseModal({
  expense,
  isOpen,
  onClose,
  onSave,
  currencySymbol = '₹'
}: EditExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(getTodayDate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when expense changes
  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setTitle(expense.item_name);
      setCategory(expense.category);
      setType(expense.type || 'expense');
      setDate(formatDateForInput(expense.date_added));
      setError('');
    }
  }, [expense]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSaving(false);
    }
  }, [isOpen]);

  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;
    setAmount(cleanValue);
  };

  const handleSave = async () => {
    if (!expense) return;

    if (!amount || !title || (type === 'expense' && !category)) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave(expense.id, {
        item_name: title,
        amount: parseFloat(amount),
        category: type === 'income' ? 'Income' : category,
        type: type,
        date_added: date,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !expense) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
          <h2 className="text-xl font-semibold text-[#111827]">Edit {type === 'income' ? 'Income' : 'Expense'}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="flex justify-center">
            <div className="bg-[#F3F4F6] p-1 rounded-xl flex">
              <button
                className={`px-5 py-2 rounded-lg font-medium transition-colors text-sm ${type === 'expense'
                    ? 'bg-[#DC2626] text-white shadow-sm'
                    : 'text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                onClick={() => setType('expense')}
              >
                Expense
              </button>
              <button
                className={`px-5 py-2 rounded-lg font-medium transition-colors text-sm ${type === 'income'
                    ? 'bg-[#16A34A] text-white shadow-sm'
                    : 'text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                onClick={() => setType('income')}
              >
                Income
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-[#F9FAFB] rounded-xl p-4 text-center">
            <p className="text-[#6B7280] text-xs mb-1">Amount</p>
            <div className="flex items-center justify-center gap-1">
              <span className={`text-2xl font-semibold ${type === 'income' ? 'text-[#16A34A]' : 'text-[#111827]'}`}>
                {currencySymbol}
              </span>
              <input
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`text-2xl font-semibold bg-transparent outline-none text-center w-32 ${type === 'income' ? 'text-[#16A34A]' : 'text-[#4F46E5]'
                  }`}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'income' ? "e.g., Salary" : "e.g., Grocery Shopping"}
              className="w-full px-4 py-3 bg-white rounded-xl border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1.5">Date</label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={getTodayDate()}
                className="w-full px-4 py-3 bg-white rounded-xl border border-[#E5E7EB] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent appearance-none"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] pointer-events-none" />
            </div>
          </div>

          {/* Category (only for expenses) */}
          {type === 'expense' && (
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white rounded-xl border border-[#E5E7EB] text-[#111827] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-[#E5E7EB]">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-xl font-semibold bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${type === 'income'
                ? 'bg-[#16A34A] hover:bg-[#15803D]'
                : 'bg-[#4F46E5] hover:bg-[#4338CA]'
              }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
