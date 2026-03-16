import { ArrowLeft, Bell } from 'lucide-react';

interface TopAppBarProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showNotificationIcon?: boolean;
}

export function TopAppBar({ title, showBackButton = false, onBackClick, showNotificationIcon = false }: TopAppBarProps) {
  return (
    <div
      className="border-b px-4 py-4 safe-area-top"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={onBackClick}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--color-text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
        </div>
        {showNotificationIcon && (
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors relative"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-danger)' }}></span>
          </button>
        )}
      </div>
    </div>
  );
}
