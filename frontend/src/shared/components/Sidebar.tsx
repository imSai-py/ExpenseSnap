import { House, Plus, ChartBar, User, Wallet } from 'lucide-react';

import { useExpenses } from '../context/ExpenseContext';

interface SidebarProps {
  activeTab: 'home' | 'add' | 'stats' | 'profile';
  onTabChange: (tab: 'home' | 'add' | 'stats' | 'profile') => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user } = useExpenses();
  const tabs = [
    { id: 'home' as const, icon: House, label: 'Dashboard' },
    { id: 'add' as const, icon: Plus, label: 'Add Expense' },
    { id: 'stats' as const, icon: ChartBar, label: 'Statistics' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-64 bg-white border-r border-[#E5E7EB]">
      <div className="p-6 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[#111827]">ExpenseSnap</h1>
        </div>
      </div>
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const activeClasses = 'bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/20';
            const inactiveClasses = 'text-[#6B7280] hover:bg-[#F3F4F6]';
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ' + (isActive ? activeClasses : inactiveClasses)}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="p-4 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#4F46E5] flex items-center justify-center">
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
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-[#111827] truncate">{user?.username || 'User'}</p>
            <p className="text-xs text-[#6B7280] truncate">{user?.email || 'No email'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}