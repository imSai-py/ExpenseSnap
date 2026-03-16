import { useState, useEffect } from 'react';
import { Plus, FileText, ShoppingCart, Utensils, Car, House, Briefcase, Heart, Tv, MoreHorizontal, Loader2, Search, Calendar, Upload, X, ChevronDown, DollarSign } from 'lucide-react';
import { useExpenses } from '../../../shared/context/ExpenseContext';
import { BalanceCard } from '../../../shared/components/BalanceCard';
import { ActionButton } from '../../../shared/components/ActionButton';
import { NotificationBell } from '../../../shared/components/NotificationBell';
import { ExpenseListItem } from './ExpenseListItem';
import { SwipeableExpenseItem } from './SwipeableExpenseItem';
import { EditExpenseModal } from './EditExpenseModal';
import { BulkImportModal } from './BulkImport';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { api } from '../../../shared/services/api';
import type { Expense, ExpenseFilters } from '../../../shared/types';

interface DashboardProps {
  onAddExpenseClick: () => void;
}

const categoryIcons: Record<string, typeof ShoppingCart> = {
  Shopping: ShoppingCart,
  Food: Utensils,
  Transport: Car,
  Housing: House,
  Bills: Briefcase,
  Health: Heart,
  Entertainment: Tv,
  Income: DollarSign,
  Other: MoreHorizontal,
};

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function Dashboard({ onAddExpenseClick }: DashboardProps) {
  const { user, expenses, summary, loading, error, deleteExpense, updateExpense, refreshData } = useExpenses();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Bulk Import modal state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || selectedYear || selectedMonth;

  // Debounced search
  useEffect(() => {
    if (!isExpanded) return;

    const timeoutId = setTimeout(async () => {
      if (hasActiveFilters) {
        setIsFiltering(true);
        try {
          const filters: ExpenseFilters = {};
          if (searchQuery) filters.search = searchQuery;
          if (selectedYear) filters.year = selectedYear;
          if (selectedMonth) filters.month = selectedMonth;

          const results = await api.getExpenses(filters);
          setFilteredExpenses(results);
        } catch (err) {
          console.error('Error filtering expenses:', err);
        } finally {
          setIsFiltering(false);
        }
      } else {
        setFilteredExpenses([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedYear, selectedMonth, isExpanded, hasActiveFilters]);

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedYear(null);
    setSelectedMonth(null);
    setFilteredExpenses([]);
  };

  // Handler for View Report button
  const handleViewReport = async () => {
    try {
      setIsGeneratingReport(true);
      setReportError(null);
      await api.downloadReport('this_month');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report';
      setReportError(errorMessage);
      setTimeout(() => setReportError(null), 5000);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Handler for editing an expense
  const handleEditExpense = (id: number) => {
    const expense = expenses.find(e => e.id === id);
    if (expense) {
      setEditingExpense(expense);
      setIsEditModalOpen(true);
    }
  };

  // Handler for saving edited expense
  const handleSaveExpense = async (id: number, data: Partial<Omit<Expense, 'id' | 'date_added' | 'user_id'>>) => {
    await updateExpense(id, data);
  };

  // Handler for closing edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingExpense(null);
  };

  // Handler for deleting an expense
  const handleDeleteExpense = async (id: number) => {
    await deleteExpense(id);
  };

  // Use filtered expenses when filters are active, otherwise use all expenses
  const expensesToShow = hasActiveFilters && isExpanded ? filteredExpenses : expenses;

  const allExpenses = expensesToShow.map((expense) => ({
    id: expense.id,
    icon: categoryIcons[expense.category] || MoreHorizontal,
    title: expense.item_name,
    date: new Date(expense.date_added).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    category: expense.category,
    amount: expense.amount,
    type: expense.type || 'expense',
  }));

  const displayedExpenses = isExpanded ? allExpenses : allExpenses.slice(0, 5);
  const hasMoreExpenses = expenses.length > 5;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#4F46E5] animate-spin" />
          <span className="text-[#6B7280]">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        {/* Mobile Header */}
        <div className="px-4 py-6 shadow-sm md:hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <div className="max-w-md mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>ExpenseSnap</h1>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand)' }}>
                {user?.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-sm">{initials}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block px-8 py-6 border-b" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Dashboard</h1>
              <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>Welcome back! Here's your financial overview.</p>
            </div>
            <NotificationBell />
          </div>
        </div>

        <div className="max-w-md md:max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
          {/* Balance and Actions */}
          <div className="md:grid md:grid-cols-3 md:gap-6 space-y-6 md:space-y-0">
            <div className="md:col-span-2">
              <BalanceCard
                totalBalance={summary?.total_balance || 0}
                income={summary?.total_income || 0}
                expense={summary?.total_expense || 0}
                currencySymbol={summary?.currency_symbol || '₹'}
              />
            </div>
            <div className="flex md:flex-col gap-3">
              <ActionButton icon={Plus} label="Add Expense" onClick={onAddExpenseClick} variant="primary" />

              {/* View Report Button */}
              <button
                onClick={handleViewReport}
                disabled={isGeneratingReport}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-4 md:py-5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md ${isGeneratingReport
                  ? 'cursor-not-allowed'
                  : ''
                  }`}
                style={
                  isGeneratingReport
                    ? { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-tertiary)' }
                    : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                }
              >
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span>View Report</span>
                  </>
                )}
              </button>
            </div>

            {/* Report Error Toast */}
            {reportError && (
              <div className="fixed bottom-24 md:bottom-8 left-1/2 transform -translate-x-1/2 bg-[#DC2626] text-white px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 animate-fade-in">
                <span className="text-sm font-medium">{reportError}</span>
              </div>
            )}
          </div>

          {/* Expenses Section */}
          <div className="rounded-2xl shadow-sm min-h-0" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            {/* Header */}
            <div className="p-4 md:p-6 border-b" style={{ borderColor: 'var(--color-divider)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg md:text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {isExpanded ? 'All Transactions' : 'Recent Transactions'}
                </h3>
                <div className="flex items-center gap-2">
                  {hasMoreExpenses && (
                    <button
                      onClick={() => {
                        setIsExpanded(!isExpanded);
                        if (!isExpanded) {
                          handleClearFilters();
                        }
                      }}
                      className="text-sm font-medium transition-colors"
                      style={{ color: 'var(--color-brand)' }}
                    >
                      {isExpanded ? 'Show Less' : 'See All'}
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Filter Bar - Only visible when expanded */}
              {isExpanded && (
                <div className="space-y-3">
                  {/* Search and Import Row */}
                  <div className="flex gap-2">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transactions..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                        style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-brand)' } as React.CSSProperties}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#E5E7EB] rounded-full"
                        >
                          <X className="w-4 h-4 text-[#6B7280]" />
                        </button>
                      )}
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${showFilters || selectedYear
                        ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5]'
                        : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6]'
                        }`}
                    >
                      <Calendar className="w-5 h-5" />
                      <span className="hidden sm:inline text-sm font-medium">Filter</span>
                      {selectedYear && (
                        <span className="bg-[#4F46E5] text-white text-xs px-1.5 py-0.5 rounded-full">1</span>
                      )}
                    </button>

                    {/* Bulk Import Button */}
                    <button
                      onClick={() => setIsBulkImportOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA] transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="hidden sm:inline text-sm font-medium">Import</span>
                    </button>
                  </div>

                  {/* Filter Dropdowns */}
                  {showFilters && (
                    <div className="flex flex-wrap gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-input)' }}>
                      {/* Year Filter */}
                      <div className="relative">
                        <select
                          value={selectedYear || ''}
                          onChange={(e) => {
                            const year = e.target.value ? parseInt(e.target.value) : null;
                            setSelectedYear(year);
                            if (!year) setSelectedMonth(null);
                          }}
                          className="appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                        >
                          <option value="">All Years</option>
                          {yearOptions.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
                      </div>

                      {/* Month Filter (only visible when year is selected) */}
                      {selectedYear && (
                        <div className="relative">
                          <select
                            value={selectedMonth || ''}
                            onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
                            className="appearance-none pl-3 pr-8 py-2 bg-white rounded-lg border border-[#E5E7EB] text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                          >
                            <option value="">All Months</option>
                            {MONTHS.map(month => (
                              <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
                        </div>
                      )}

                      {/* Clear Filters */}
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearFilters}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  {/* Active Filter Tags */}
                  {hasActiveFilters && !showFilters && (
                    <div className="flex flex-wrap gap-2">
                      {searchQuery && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#EEF2FF] text-[#4F46E5] rounded-lg text-xs font-medium">
                          Search: "{searchQuery}"
                          <button onClick={() => setSearchQuery('')} className="hover:text-[#4338CA]">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {selectedYear && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#EEF2FF] text-[#4F46E5] rounded-lg text-xs font-medium">
                          {selectedMonth ? `${MONTHS[selectedMonth - 1].label} ${selectedYear}` : selectedYear}
                          <button onClick={() => { setSelectedYear(null); setSelectedMonth(null); }} className="hover:text-[#4338CA]">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Transactions List */}
            <div className="p-4 md:p-6 pt-0 md:pt-0">
              {/* Loading Spinner for Filtering */}
              {isFiltering && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#4F46E5] animate-spin" />
                    <span className="text-[#6B7280] text-sm">Filtering...</span>
                  </div>
                </div>
              )}

              {/* No Results */}
              {!isFiltering && allExpenses.length === 0 && (
                <div className="text-center py-8">
                  {hasActiveFilters ? (
                    <div className="space-y-2">
                      <p style={{ color: 'var(--color-text-secondary)' }}>No transactions found matching your filters.</p>
                      <button
                        onClick={handleClearFilters}
                        className="text-[#4F46E5] text-sm font-medium hover:text-[#4338CA]"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--color-text-secondary)' }}>No expenses yet. Add your first expense!</p>
                  )}
                </div>
              )}

              {/* Transactions */}
              {!isFiltering && allExpenses.length > 0 && (
                <div className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
                  {displayedExpenses.map((expense, index) => (
                    <div
                      key={expense.id}
                      className="transition-all duration-300 ease-in-out"
                      style={{
                        opacity: 1,
                        transform: 'translateY(0)',
                        transitionDelay: isExpanded && index >= 5 ? `${(index - 5) * 50}ms` : '0ms'
                      }}
                    >
                      {isMobile ? (
                        <SwipeableExpenseItem
                          id={expense.id}
                          icon={expense.icon}
                          title={expense.title}
                          date={expense.date}
                          category={expense.category}
                          amount={expense.amount}
                          type={expense.type}
                          currencySymbol={summary?.currency_symbol || '₹'}
                          onEdit={handleEditExpense}
                          onDelete={handleDeleteExpense}
                        />
                      ) : (
                        <ExpenseListItem
                          id={expense.id}
                          icon={expense.icon}
                          title={expense.title}
                          date={expense.date}
                          category={expense.category}
                          amount={expense.amount}
                          type={expense.type}
                          currencySymbol={summary?.currency_symbol || '₹'}
                          onEdit={handleEditExpense}
                          onDelete={handleDeleteExpense}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Results Count when Filtering */}
              {isExpanded && hasActiveFilters && !isFiltering && allExpenses.length > 0 && (
                <div className="text-center py-4 border-t border-[#F3F4F6] mt-4">
                  <p className="text-sm text-[#6B7280]">
                    Showing {allExpenses.length} transaction{allExpenses.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Expense Modal */}
      <EditExpenseModal
        expense={editingExpense}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveExpense}
        currencySymbol={summary?.currency_symbol || '₹'}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => {
          setIsBulkImportOpen(false);
          refreshData();
        }}
      />
    </div>
  );
}
