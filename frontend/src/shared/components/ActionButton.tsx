import type { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function ActionButton({ icon: Icon, label, onClick, variant = 'primary' }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex-1 md:flex-none flex items-center justify-center gap-2 py-4 md:py-5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
      style={
        variant === 'primary'
          ? {
              backgroundColor: 'var(--color-brand)',
              color: 'white',
              boxShadow: '0 4px 12px var(--color-shadow-brand)',
            }
          : {
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }
      }
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}