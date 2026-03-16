import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, PieChart, Calendar, ChevronDown, Wallet, Check, Loader2 } from 'lucide-react';
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

  // Budget limit state
  const [monthlyLimit, setMonthlyLimit] = useState<number>(0);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetSaveSuccess, setBudgetSaveSuccess] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Get API base URL (same logic as api.ts)
  const getApiBaseUrl = (): string => {
    if (import.meta.env.VITE_API_URL) {
      return `${import.meta.env.VITE_API_URL}/api`;
    }
    return '/api';
  };

  // Fetch current budget limit on mount
  useEffect(() => {
    const fetchBudgetLimit = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/user/budget`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        const data = await response.json();
        if (data.success) {
          setMonthlyLimit(data.monthly_limit);
          setBudgetInput(data.monthly_limit > 0 ? data.monthly_limit.toString() : '');
        }
      } catch (err) {
        console.error('Failed to fetch budget limit:', err);
      }
    };
    fetchBudgetLimit();
  }, []);

  const handleSaveBudget = async () => {
    const amount = parseFloat(budgetInput) || 0;
    if (amount < 0) {
      setBudgetError('Budget must be a positive number');
      return;
    }

    setIsSavingBudget(true);
    setBudgetSaveSuccess(false);
    setBudgetError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/update-budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ monthly_limit: amount })
      });

      const data = await response.json();

      if (data.success) {
        setMonthlyLimit(data.monthly_limit);
        setBudgetSaveSuccess(true);
        // Show success for 3 seconds
        setTimeout(() => setBudgetSaveSuccess(false), 3000);
      } else {
        setBudgetError(data.error || 'Failed to save budget');
      }
    } catch (err) {
      console.error('Failed to save budget limit:', err);
      setBudgetError('Network error. Please try again.');
    } finally {
      setIsSavingBudget(false);
    }
  };

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
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-danger)' }}>Error: {error}</div>
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
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        {/* Mobile Header */}
        <div className="px-4 py-6 shadow-sm md:hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Statistics</h1>
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="text-sm font-medium flex items-center gap-1"
                  style={{ color: 'var(--color-brand)' }}
                >
                  {currentPeriodLabel}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-36 rounded-xl shadow-lg border py-1 z-10" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handlePeriodChange(option.value)}
                        className="w-full text-left px-4 py-2 text-sm transition-colors font-medium"
                        style={activePeriod === option.value ? { backgroundColor: 'var(--color-brand-bg)', color: 'var(--color-brand)' } : { color: 'var(--color-text-primary)' }}
                        onMouseEnter={(e) => { if (activePeriod !== option.value) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                        onMouseLeave={(e) => { if (activePeriod !== option.value) e.currentTarget.style.backgroundColor = 'transparent'; }}
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
        <div className="hidden md:block px-8 py-6 border-b" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Statistics & Insights</h1>
              <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>Track your spending patterns and financial trends.</p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Report Button */}
              <ViewReportButton />

              {/* Period Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-4 py-2 border rounded-xl font-medium transition-colors flex items-center gap-2"
                  style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-card)'}
                >
                  <Calendar className="w-4 h-4" />
                  {currentPeriodLabel}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-40 rounded-xl shadow-lg border py-1 z-10" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handlePeriodChange(option.value)}
                        className="w-full text-left px-4 py-2 text-sm transition-colors font-medium"
                        style={activePeriod === option.value ? { backgroundColor: 'var(--color-brand-bg)', color: 'var(--color-brand)' } : { color: 'var(--color-text-primary)' }}
                        onMouseEnter={(e) => { if (activePeriod !== option.value) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                        onMouseLeave={(e) => { if (activePeriod !== option.value) e.currentTarget.style.backgroundColor = 'transparent'; }}
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
            <div className="absolute inset-0 bg-black/5 backdrop-blur-sm z-10 flex items-center justify-center dark:bg-black/20">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-brand)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Updating...</span>
              </div>
            </div>
          )}

          <div className={`max-w-md md:max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6 transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl p-6 shadow-sm transition-all duration-300" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total Spent</p>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-danger-bg)' }}>
                    <TrendingDown className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
                  </div>
                </div>
                <p className="text-[32px] font-semibold transition-all duration-300" style={{ color: 'var(--color-text-primary)' }}>
                  {summary?.currency_symbol || '₹'}{totalExpense.toLocaleString('en-IN')}
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>{currentPeriodLabel}</p>
              </div>
              <div className="rounded-2xl p-6 shadow-sm transition-all duration-300" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total Income</p>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-success-bg)' }}>
                    <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                  </div>
                </div>
                <p className="text-[32px] font-semibold transition-all duration-300" style={{ color: 'var(--color-text-primary)' }}>
                  {summary?.currency_symbol || '₹'}{totalIncome.toLocaleString('en-IN')}
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--color-success)' }}>{currentPeriodLabel}</p>
              </div>
              <div className="rounded-2xl p-6 shadow-sm transition-all duration-300" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Savings Rate</p>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-bg)' }}>
                    <PieChart className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
                  </div>
                </div>
                <p className="text-[32px] font-semibold transition-all duration-300" style={{ color: 'var(--color-text-primary)' }}>
                  {savingsRate}%
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>{summary?.currency_symbol || '₹'}{savings.toLocaleString('en-IN')} saved</p>
              </div>
            </div>

            {/* Set Budget Card */}
            <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-warning-bg)' }}>
                  <Wallet className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Set Monthly Budget</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Get alerts when spending exceeds 80% of your limit</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{summary?.currency_symbol || '₹'}</span>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => {
                      setBudgetInput(e.target.value);
                      setBudgetError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBudget();
                    }}
                    placeholder="Enter budget limit"
                    min="0"
                    className="w-full pl-8 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                    style={{ backgroundColor: 'var(--color-bg-input)', borderColor: budgetError ? 'var(--color-danger)' : 'var(--color-border)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-brand)' } as React.CSSProperties}
                  />
                </div>
                <button
                  onClick={handleSaveBudget}
                  disabled={isSavingBudget}
                  className="px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-60 text-white"
                  style={budgetSaveSuccess ? { backgroundColor: 'var(--color-success)' } : { backgroundColor: 'var(--color-brand)' }}
                >
                  {isSavingBudget ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : budgetSaveSuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      Saved!
                    </>
                  ) : (
                    'Save Budget'
                  )}
                </button>
              </div>
              {/* Error message */}
              {budgetError && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-danger)' }}>{budgetError}</p>
              )}
              {/* Success toast */}
              {budgetSaveSuccess && (
                <div className="mt-3 p-3 border rounded-xl flex items-center gap-2" style={{ backgroundColor: 'var(--color-success-bg)', borderColor: 'var(--color-success)' }}>
                  <Check className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>Budget limit saved successfully!</span>
                </div>
              )}
              {monthlyLimit > 0 && (
                <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Current Budget:</span>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{summary?.currency_symbol || '₹'}{monthlyLimit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Spent This Month:</span>
                    <span className="font-semibold" style={{ color: totalExpense > monthlyLimit * 0.8 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                      {summary?.currency_symbol || '₹'}{totalExpense.toLocaleString('en-IN')} ({monthlyLimit > 0 ? Math.round((totalExpense / monthlyLimit) * 100) : 0}%)
                    </span>
                  </div>
                  {/* Budget Progress Bar */}
                  <div className="mt-3 w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((totalExpense / monthlyLimit) * 100, 100)}%`,
                        backgroundColor: totalExpense >= monthlyLimit ? 'var(--color-danger)' : totalExpense >= monthlyLimit * 0.8 ? 'var(--color-warning)' : 'var(--color-success)'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Spending by Category</h3>
              {categoryBreakdown.length === 0 ? (
                <p className="text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>No expense data available for {currentPeriodLabel.toLowerCase()}</p>
              ) : (
                <div className="space-y-4">
                  {categoryBreakdown.map((item) => (
                    <div key={item.category} className="transition-all duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.category}</span>
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {summary?.currency_symbol || '₹'}{item.amount.toLocaleString('en-IN')} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
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
