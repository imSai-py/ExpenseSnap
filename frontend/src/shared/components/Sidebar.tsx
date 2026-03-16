import { House, Plus, ChartBar, User, Wallet } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { ThemeToggle } from './ThemeToggle';

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
    <div
      className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-64 border-r"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand)' }}>
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>ExpenseSnap</h1>
        </div>
      </div>
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--color-brand)',
                        color: 'white',
                        boxShadow: '0 4px 12px var(--color-shadow-brand)',
                      }
                    : {
                        color: 'var(--color-text-secondary)',
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 pb-2 flex justify-center">
        <ThemeToggle variant="compact" />
      </div>

      <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
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
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{user?.username || 'User'}</p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{user?.email || 'No email'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}