import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, PieChart, Calendar, ChevronDown } from 'lucide-react';
import { useExpenses } from '../../../shared/context/ExpenseContext';
import { api } from '../../../shared/services/api';
import { ViewReportButton } from '../../expenses/components/ViewReportButton';
import type { ExpenseSummary } from '../../../shared/types';

type TimePeriod = 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time';

interface FilterOption {
  value: TimePeriod;
  label: string;
}

const filterOptions: FilterOption[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
];

export function Statistics() {
  const { summary: globalSummary, loading: globalLoading, error: globalError } = useExpenses();

  const [activePeriod, setActivePeriod] = useState<TimePeriod>('this_month');
  const [filteredSummary, setFilteredSummary] = useState<ExpenseSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchFilteredData = useCallback(async (period: TimePeriod) => {
    setIsLoading(true);
    setFilterError(null);
    try {
      const periodParam = period === 'all_time' ? undefined : period;
      const data = await api.getSummary(periodParam);
      setFilteredSummary(data);
    } catch (err) {
      setFilterError(err instanceof Error ? err.message : 'Failed to fetch filtered data');
      // Fallback to global summary on error
      setFilteredSummary(globalSummary);
    } finally {
      setIsLoading(false);
    }
  }, [globalSummary]);

  useEffect(() => {
    fetchFilteredData(activePeriod);
  }, [activePeriod, fetchFilteredData]);

  const handlePeriodChange = (period: TimePeriod) => {
    setActivePeriod(period);
    setShowDropdown(false);
  };

  const currentPeriodLabel = filterOptions.find(opt => opt.value === activePeriod)?.label || 'This Month';

  // Use filtered summary if available, otherwise fall back to global
  const summary = filteredSummary || globalSummary;
  const loading = globalLoading || isLoading;
  const error = filterError || globalError;

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[#DC2626]">Error: {error}</div>
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    Housing: '#4F46E5',
    Shopping: '#EC4899',
    Food: '#F59E0B',
    Transport: '#10B981',
    Bills: '#6366F1',
    Health: '#EF4444',
    Entertainment: '#8B5CF6',
    Other: '#6B7280',
  };

  const categoryBreakdown = summary?.category_breakdown || [];
  const totalExpense = summary?.total_expense || 0;
  const totalIncome = summary?.total_income || 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : '0';
  const savings = totalIncome - totalExpense;

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB]">
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        {/* Mobile Header */}
        <div className="bg-white px-4 py-6 shadow-sm md:hidden">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold text-[#111827]">Statistics</h1>
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="text-[#4F46E5] text-sm font-medium flex items-center gap-1"
                >
                  {currentPeriodLabel}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-1 z-10">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handlePeriodChange(option.value)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${activePeriod === option.value
                            ? 'bg-[#EEF2FF] text-[#4F46E5] font-medium'
                            : 'text-[#374151] hover:bg-[#F9FAFB]'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Mobile View Report Button */}
            <ViewReportButton className="w-full" />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block bg-white px-8 py-6 border-b border-[#E5E7EB]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#111827]">Statistics & Insights</h1>
              <p className="text-[#6B7280] mt-1">Track your spending patterns and financial trends.</p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Report Button */}
              <ViewReportButton />

              {/* Period Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] font-medium hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  {currentPeriodLabel}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-1 z-10">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handlePeriodChange(option.value)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${activePeriod === option.value
                            ? 'bg-[#EEF2FF] text-[#4F46E5] font-medium'
                            : 'text-[#374151] hover:bg-[#F9FAFB]'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content with loading overlay */}
        <div className="relative">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-lg">
                <div className="w-5 h-5 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
                <span className="text-[#6B7280] text-sm font-medium">Updating...</span>
              </div>
            </div>
          )}

          <div className={`max-w-md md:max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[#6B7280] text-sm">Total Spent</p>
                  <div className="w-10 h-10 bg-[#FEF2F2] rounded-full flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-[#DC2626]" />
                  </div>
                </div>
                <p className="text-[32px] font-semibold text-[#111827] transition-all duration-300">
                  ₹{totalExpense.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-[#6B7280] mt-2">{currentPeriodLabel}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[#6B7280] text-sm">Total Income</p>
                  <div className="w-10 h-10 bg-[#F0FDF4] rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#16A34A]" />
                  </div>
                </div>
                <p className="text-[32px] font-semibold text-[#111827] transition-all duration-300">
                  ₹{totalIncome.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-[#16A34A] mt-2">{currentPeriodLabel}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[#6B7280] text-sm">Savings Rate</p>
                  <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-[#4F46E5]" />
                  </div>
                </div>
                <p className="text-[32px] font-semibold text-[#111827] transition-all duration-300">
                  {savingsRate}%
                </p>
                <p className="text-sm text-[#6B7280] mt-2">₹{savings.toLocaleString('en-IN')} saved</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#111827] mb-6">Spending by Category</h3>
              {categoryBreakdown.length === 0 ? (
                <p className="text-[#6B7280] text-center py-4">No expense data available for {currentPeriodLabel.toLowerCase()}</p>
              ) : (
                <div className="space-y-4">
                  {categoryBreakdown.map((item) => (
                    <div key={item.category} className="transition-all duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#111827] font-medium">{item.category}</span>
                        <span className="text-sm text-[#6B7280]">
                          ₹{item.amount.toLocaleString('en-IN')} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: categoryColors[item.category] || '#6B7280'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
