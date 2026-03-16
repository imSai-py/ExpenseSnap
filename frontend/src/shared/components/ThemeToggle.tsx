import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  /** 'compact' = icon-only button (for sidebar), 'full' = settings row with label */
  variant?: 'compact' | 'full';
}

/**
 * Accessible theme toggle with 3 modes: Light / Dark / System.
 * 
 * - In 'compact' mode: renders a single button that cycles through modes.
 * - In 'full' mode: renders a settings row with 3 segmented buttons.
 */
export function ThemeToggle({ variant = 'compact' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'compact') {
    return (
      <motion.button
        onClick={toggleTheme}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
        style={{
          backgroundColor: 'var(--color-bg-hover)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
        title={`Currently: ${theme === 'system' ? `System (${resolvedTheme})` : resolvedTheme} mode`}
      >
        <motion.div
          key={resolvedTheme}
          initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 30, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
          ) : (
            <Sun className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
          )}
        </motion.div>
      </motion.button>
    );
  }

  // Full variant — 3-way segmented control for Settings page
  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div
      className="rounded-2xl p-6 shadow-sm"
      style={{ backgroundColor: 'var(--color-bg-card)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3
            className="font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Appearance
          </h3>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Choose your preferred theme
          </p>
        </div>
      </div>

      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ backgroundColor: 'var(--color-bg-subtle)' }}
        role="radiogroup"
        aria-label="Theme selection"
      >
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;

          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              role="radio"
              aria-checked={isActive}
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                color: isActive
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="theme-active-bg"
                  className="absolute inset-0 rounded-lg shadow-sm"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
