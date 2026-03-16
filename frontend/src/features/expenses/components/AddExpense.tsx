import { useState } from 'react';
import { useExpenses } from '../../../shared/context/ExpenseContext';
import { TopAppBar } from '../../../shared/components/TopAppBar';
import { ChevronDown, FileSpreadsheet, Calendar, ScanLine } from 'lucide-react';
import { BulkImport } from './BulkImport';
import { ReceiptScanner } from './ReceiptScanner';

interface AddExpenseProps {
  onBack: () => void;
}

type AddMode = 'single' | 'scan' | 'bulk';

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export function AddExpense({ onBack }: AddExpenseProps) {
  const { addExpense, user, summary } = useExpenses();
  const [mode, setMode] = useState<AddMode>('single');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(getTodayDate());
  const [saving, setSaving] = useState(false);

  const categories = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Bills', 'Health', 'Housing', 'Other'];

  const currencySymbol = summary?.currency_symbol || '₹';
  const currencyCode = user?.preferred_currency || 'INR';

  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;
    setAmount(cleanValue);
  };

  const handleSave = async () => {
    if (!amount || !title || (type === 'expense' && !category)) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      await addExpense({
        item_name: title,
        amount: parseFloat(amount),
        currency: currencyCode,
        category: type === 'income' ? 'Income' : category,
        type: type,
        date_added: date,
      });
      onBack();
    } catch (err) {
      alert('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'scan': return 'Scan Receipt';
      case 'bulk': return 'Bulk Import';
      default: return type === 'income' ? 'Add Income' : 'Add Expense';
    }
  };

  const getModeSubtitle = () => {
    switch (mode) {
      case 'scan': return 'Scan a receipt to auto-fill expense details.';
      case 'bulk': return 'Import multiple expenses from a CSV or Excel file.';
      default: return `Track your financials by adding a new ${type}.`;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB]">
      <div className="md:hidden">
        <TopAppBar
          title={getModeTitle()}
          showBackButton={true}
          onBackClick={onBack}
        />
      </div>
      <div className="hidden md:block bg-white px-8 py-6 border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-semibold text-[#111827]">
            {mode === 'bulk' ? 'Bulk Import Expenses' : mode === 'scan' ? 'Scan Receipt' : `Add New ${type === 'income' ? 'Income' : 'Expense'}`}
          </h1>
          <p className="text-[#6B7280] mt-1">{getModeSubtitle()}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-md md:max-w-4xl mx-auto px-4 md:px-8 py-6">

          {/* Mode Toggle - Single vs Scan vs Bulk */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-1 rounded-xl border border-[#E5E7EB] flex shadow-sm">
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${mode === 'single'
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                  }`}
                onClick={() => setMode('single')}
              >
                <span>Single</span>
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${mode === 'scan'
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                  }`}
                onClick={() => setMode('scan')}
              >
                <ScanLine className="w-4 h-4" />
                <span>Scan</span>
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${mode === 'bulk'
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                  }`}
                onClick={() => setMode('bulk')}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Bulk</span>
              </button>
            </div>
          </div>

          {mode === 'scan' ? (
            /* Receipt Scanner Mode */
            <ReceiptScanner
              onComplete={onBack}
              currencySymbol={currencySymbol}
              currencyCode={currencyCode}
            />
          ) : mode === 'bulk' ? (
            /* Bulk Import Mode */
            <BulkImport onComplete={onBack} onCancel={() => setMode('single')} />
          ) : (
            /* Single Entry Mode */
            <>
              {/* Type Toggle - Expense vs Income */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-1 rounded-xl border border-[#E5E7EB] flex shadow-sm">
                  <button
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${type === 'expense' ? 'bg-[#DC2626] text-white shadow-sm' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                    onClick={() => setType('expense')}
                  >
                    Expense
                  </button>
                  <button
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${type === 'income' ? 'bg-[#16A34A] text-white shadow-sm' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                    onClick={() => setType('income')}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0">
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                    <p className="text-[#6B7280] text-sm mb-2">Amount</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className={`text-4xl font-semibold ${type === 'income' ? 'text-[#16A34A]' : 'text-[#111827]'}`}>{currencySymbol}</span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className={`text-4xl font-semibold bg-transparent outline-none text-center w-full ${type === 'income' ? 'text-[#16A34A]' : 'text-[#4F46E5]'}`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className={`w-full text-white py-4 rounded-xl font-semibold transition-colors shadow-lg disabled:opacity-50 ${type === 'income' ? 'bg-[#16A34A] hover:bg-[#15803D] shadow-[#16A34A]/20' : 'bg-[#4F46E5] hover:bg-[#4338CA] shadow-[#4F46E5]/20'}`}
                    >
                      {saving ? 'Saving...' : 'Save ' + (type === 'income' ? 'Income' : 'Expense')}
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-2">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={type === 'income' ? "e.g., Salary, Freight" : "e.g., Grocery Shopping"}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                    />
                  </div>

                  {/* Date Field */}
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-2">Date</label>
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

                  {type === 'expense' && (
                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-2">Category</label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-3 bg-white rounded-xl border border-[#E5E7EB] text-[#111827] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                        >
                          <option value="">Select a category</option>
                          {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Save Button - Only show in single mode */}
      {mode === 'single' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 py-4 safe-area-bottom">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-4 rounded-xl font-semibold transition-colors disabled:opacity-50 ${type === 'income'
                ? 'bg-[#16A34A] text-white hover:bg-[#15803D]'
                : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                }`}
            >
              {saving ? 'Saving...' : `Save ${type === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
