import { useState } from 'react';
import { FileText, ChevronDown, Check } from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { BottomSheet } from '../../../shared/components/BottomSheet';

interface ViewReportButtonProps {
  className?: string;
}

const PERIODS = [
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
];

export function ViewReportButton({ className = '' }: ViewReportButtonProps) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (period: string) => {
    try {
      setLoading(true);
      setError(null);
      setShowDropdown(false);
      setShowBottomSheet(false);
      setSelectedPeriod(period);

      await api.downloadReport(period);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (isMobile) {
      setShowBottomSheet(true);
    } else {
      handleDownload(selectedPeriod);
    }
  };

  const handleDropdownToggle = () => {
    if (isMobile) {
      setShowBottomSheet(true);
    } else {
      setShowDropdown(!showDropdown);
    }
  };

  const selectedLabel = PERIODS.find(p => p.value === selectedPeriod)?.label || 'This Month';

  return (
    <div className={`relative ${className}`}>
      {/* Main Button - Full width on mobile */}
      <button
        onClick={handleButtonClick}
        disabled={loading}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 text-sm`}
        style={loading ? { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' } : { backgroundColor: 'var(--color-brand)', color: 'white' }}
      >
        {/* Left side - Icon and Text */}
        <div className="flex items-center gap-2">
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>View Report</span>
            </>
          )}
        </div>

        {/* Right side - Period label and chevron */}
        <div
          className="flex items-center gap-1 pl-3 border-l border-white/30"
          onClick={(e) => {
            e.stopPropagation();
            handleDropdownToggle();
          }}
        >
          <span className="text-sm opacity-90">{selectedLabel}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showDropdown || showBottomSheet ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Desktop Dropdown Menu */}
      {!isMobile && showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 rounded-xl shadow-lg border py-2 z-50 min-w-[160px]" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-divider)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Select Period</p>
            </div>
            {PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => handleDownload(period.value)}
                className="w-full flex items-center justify-between px-4 py-2 text-left transition-colors"
                style={{ color: 'var(--color-text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className="text-sm">{period.label}</span>
                {selectedPeriod === period.value && (
                  <Check className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Mobile Bottom Sheet */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Download Report"
      >
        <div className="space-y-2">
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Select a time period to generate your expense report PDF.
          </p>

          {PERIODS.map((period) => (
            <button
              key={period.value}
              onClick={() => handleDownload(period.value)}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 rounded-xl transition-all active:scale-[0.98] border-2"
              style={selectedPeriod === period.value 
                ? { backgroundColor: 'var(--color-brand-bg)', borderColor: 'var(--color-brand)' } 
                : { backgroundColor: 'var(--color-bg-subtle)', borderColor: 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: selectedPeriod === period.value ? 'var(--color-brand)' : 'var(--color-border)' }}
                >
                  <FileText className="w-5 h-5" 
                    style={{ color: selectedPeriod === period.value ? 'white' : 'var(--color-text-secondary)' }}
                  />
                </div>
                <span className="font-medium"
                  style={{ color: selectedPeriod === period.value ? 'var(--color-brand)' : 'var(--color-text-primary)' }}
                >
                  {period.label}
                </span>
              </div>
              {selectedPeriod === period.value && (
                <Check className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
              )}
            </button>
          ))}
        </div>

        {/* Download Button */}
        <button
          onClick={() => handleDownload(selectedPeriod)}
          disabled={loading}
          className="w-full mt-6 flex items-center justify-center gap-2 p-4 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={loading ? { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' } : { backgroundColor: 'var(--color-brand)', color: 'white' }}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>Download {selectedLabel} Report</span>
            </>
          )}
        </button>

        {/* Cancel Button */}
        <button
          onClick={() => setShowBottomSheet(false)}
          disabled={loading}
          className="w-full mt-3 p-4 rounded-xl font-semibold transition-all active:scale-[0.98]"
          style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-primary)' }}
        >
          Cancel
        </button>
      </BottomSheet>

      {/* Error Message */}
      {error && (
        <div className="absolute left-0 right-0 md:left-auto md:right-0 top-full mt-2 border rounded-xl px-4 py-2 z-50 shadow-sm" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger)' }}>
          <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
        </div>
      )}
    </div>
  );
}
