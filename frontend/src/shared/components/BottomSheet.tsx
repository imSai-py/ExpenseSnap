import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[100]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[101] max-h-[85vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Bottom sheet menu'}
          >
            {/* Drag handle indicator */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#E5E7EB] rounded-full" />
            </div>

            {/* Header with title and close button */}
            {title && (
              <div className="flex items-center justify-between px-5 pb-3 border-b border-[#F3F4F6]">
                <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-full hover:bg-[#F3F4F6] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-[#6B7280]" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="px-5 py-4 pb-8 overflow-y-auto">
              {children}
            </div>

            {/* Safe area padding for devices with home indicator */}
            <div className="h-safe-area-inset-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Expense Action Sheet - Specific component for expense edit/delete actions
// ============================================================================

interface ExpenseActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  expenseTitle: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function ExpenseActionSheet({
  isOpen,
  onClose,
  expenseTitle,
  onEdit,
  onDelete
}: ExpenseActionSheetProps) {
  const handleEdit = () => {
    onEdit();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={expenseTitle}>
      <div className="space-y-3">
        {/* Edit Button */}
        <button
          onClick={handleEdit}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#F5F3FF] hover:bg-[#EDE9FE] active:scale-[0.98] transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-[#4F46E5] flex items-center justify-center shadow-sm">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[#111827] font-semibold text-base">Edit Expense</p>
            <p className="text-[#6B7280] text-sm">Modify amount, category, or details</p>
          </div>
          <svg
            className="w-5 h-5 text-[#9CA3AF]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#FEF2F2] hover:bg-[#FEE2E2] active:scale-[0.98] transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-[#DC2626] flex items-center justify-center shadow-sm">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[#DC2626] font-semibold text-base">Delete Expense</p>
            <p className="text-[#6B7280] text-sm">Remove this expense permanently</p>
          </div>
          <svg
            className="w-5 h-5 text-[#9CA3AF]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Cancel Button */}
      <button
        onClick={onClose}
        className="w-full mt-4 p-4 rounded-2xl bg-[#F3F4F6] hover:bg-[#E5E7EB] active:scale-[0.98] transition-all"
      >
        <span className="text-[#374151] font-semibold">Cancel</span>
      </button>
    </BottomSheet>
  );
}

// ============================================================================
// Delete Confirmation Sheet - For confirming delete action
// ============================================================================

interface DeleteConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  expenseTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function DeleteConfirmationSheet({
  isOpen,
  onClose,
  expenseTitle,
  isDeleting,
  onConfirm
}: DeleteConfirmationSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="text-center py-2">
        {/* Warning Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FEF2F2] flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#DC2626]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title and Description */}
        <h3 className="text-xl font-bold text-[#111827] mb-2">Delete Expense?</h3>
        <p className="text-[#6B7280] mb-6">
          Are you sure you want to delete "<span className="font-medium text-[#374151]">{expenseTitle}</span>"?
          This action cannot be undone.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full p-4 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-white font-semibold">
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </span>
          </button>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-full p-4 rounded-2xl bg-[#F3F4F6] hover:bg-[#E5E7EB] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span className="text-[#374151] font-semibold">Cancel</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
