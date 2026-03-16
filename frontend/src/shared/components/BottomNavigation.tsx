import { House, Plus, ChartBar, User } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'home' | 'add' | 'stats' | 'profile';
  onTabChange: (tab: 'home' | 'add' | 'stats' | 'profile') => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'home' as const, icon: House, label: 'Home' },
    { id: 'add' as const, icon: Plus, label: 'Add' },
    { id: 'stats' as const, icon: ChartBar, label: 'Stats' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 border-t px-4 py-3 safe-area-bottom"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-md mx-auto flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
              style={{ color: isActive ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}