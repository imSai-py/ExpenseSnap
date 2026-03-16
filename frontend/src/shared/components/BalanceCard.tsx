import { TrendingUp, TrendingDown } from 'lucide-react';

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
  currencySymbol?: string;
}

export function BalanceCard({ totalBalance, income, expense, currencySymbol = '₹' }: BalanceCardProps) {
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)' }}>
      <p className="text-xs md:text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Total Balance</p>
      <h2 className="text-[32px] md:text-[40px] font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        {currencySymbol}{formatAmount(totalBalance)}
      </h2>
      <div className="flex gap-4">
        <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: 'var(--color-success-bg)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-success)' }}>
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs md:text-sm" style={{ color: 'var(--color-text-secondary)' }}>Income</p>
          </div>
          <p className="text-lg md:text-xl font-semibold" style={{ color: 'var(--color-success)' }}>
            {currencySymbol}{formatAmount(income)}
          </p>
        </div>
        <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: 'var(--color-danger-bg)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-danger)' }}>
              <TrendingDown className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs md:text-sm" style={{ color: 'var(--color-text-secondary)' }}>Expense</p>
          </div>
          <p className="text-lg md:text-xl font-semibold" style={{ color: 'var(--color-danger)' }}>
            {currencySymbol}{formatAmount(expense)}
          </p>
        </div>
      </div>
    </div>
  );
}
