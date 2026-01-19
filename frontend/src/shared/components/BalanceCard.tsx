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
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-[#6B7280] text-xs md:text-sm mb-2">Total Balance</p>
      <h2 className="text-[32px] md:text-[40px] font-semibold text-[#111827] mb-6">
        {currencySymbol}{formatAmount(totalBalance)}
      </h2>
      <div className="flex gap-4">
        <div className="flex-1 bg-[#F0FDF4] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-[#16A34A] rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <p className="text-[#6B7280] text-xs md:text-sm">Income</p>
          </div>
          <p className="text-[#16A34A] text-lg md:text-xl font-semibold">
            {currencySymbol}{formatAmount(income)}
          </p>
        </div>
        <div className="flex-1 bg-[#FEF2F2] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-[#DC2626] rounded-full flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-white" />
            </div>
            <p className="text-[#6B7280] text-xs md:text-sm">Expense</p>
          </div>
          <p className="text-[#DC2626] text-lg md:text-xl font-semibold">
            {currencySymbol}{formatAmount(expense)}
          </p>
        </div>
      </div>
    </div>
  );
}
