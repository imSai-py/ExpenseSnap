import type { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function ActionButton({ icon: Icon, label, onClick, variant = 'primary' }: ActionButtonProps) {
  const baseClasses = 'flex-1 md:flex-none flex items-center justify-center gap-2 py-4 md:py-5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md';
  const primaryClasses = 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-[#4F46E5]/20';
  const secondaryClasses = 'bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB]';
  
  return (
    <button
      onClick={onClick}
      className={baseClasses + ' ' + (variant === 'primary' ? primaryClasses : secondaryClasses)}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}