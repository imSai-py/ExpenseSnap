import { ArrowLeft, Bell } from 'lucide-react';

interface TopAppBarProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showNotificationIcon?: boolean;
}

export function TopAppBar({ title, showBackButton = false, onBackClick, showNotificationIcon = false }: TopAppBarProps) {
  return (
    <div className="bg-white border-b border-[#E5E7EB] px-4 py-4 safe-area-top">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={onBackClick}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F9FAFB] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#111827]" />
            </button>
          )}
          <h1 className="text-xl font-semibold text-[#111827]">{title}</h1>
        </div>
        {showNotificationIcon && (
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F9FAFB] transition-colors relative">
            <Bell className="w-5 h-5 text-[#111827]" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#DC2626] rounded-full"></span>
          </button>
        )}
      </div>
    </div>
  );
}
