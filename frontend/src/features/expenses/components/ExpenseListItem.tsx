import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { ExpenseActionSheet, DeleteConfirmationSheet } from '../../../shared/components/BottomSheet';

interface ExpenseListItemProps {
  id: number;
  icon: LucideIcon;
  title: string;
  date: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  currencySymbol?: string;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function ExpenseListItem({
  id,
  icon: Icon,
  title,
  date,
  amount,
  type,
  category,
  currencySymbol = '₹',
  onEdit,
  onDelete
}: ExpenseListItemProps) {
  const isMobile = useIsMobile();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Mobile Bottom Sheet states
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isExpense = type === 'expense';
  const iconBgClass = isExpense ? 'bg-[#FEF2F2]' : 'bg-[#F0FDF4]';
  const iconColorClass = isExpense ? 'text-[#DC2626]' : 'text-[#16A34A]';
  const amountColorClass = isExpense ? 'text-[#DC2626]' : 'text-[#16A34A]';
  const prefix = isExpense ? '-' : '+';

  // Calculate menu position when opening
  useEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 176; // w-44 = 11rem = 176px

      setMenuPosition({
        top: rect.bottom + 4, // 4px gap below button
        left: Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
      });
    }
  }, [isMenuOpen]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      // Use setTimeout to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isMenuOpen]);

  // Close menu when Escape key is pressed
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMenuOpen]);

  // Close menu when scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isMenuOpen]);

  // Close menu when delete confirmation is shown
  useEffect(() => {
    if (showConfirmDelete) {
      setIsMenuOpen(false);
    }
  }, [showConfirmDelete]);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // On mobile, show the bottom sheet instead of dropdown
    if (isMobile) {
      setIsActionSheetOpen(true);
    } else {
      setIsMenuOpen(prev => !prev);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onEdit) {
      onEdit(id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(id);
      } finally {
        setIsDeleting(false);
        setShowConfirmDelete(false);
      }
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirmDelete(false);
  };

  // ============================================================================
  // Mobile Bottom Sheet Handlers
  // ============================================================================

  const handleMobileEdit = () => {
    if (onEdit) {
      onEdit(id);
    }
  };

  const handleMobileDeleteRequest = () => {
    // Close action sheet and open delete confirmation sheet
    setIsActionSheetOpen(false);
    setIsDeleteSheetOpen(true);
  };

  const handleMobileConfirmDelete = async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(id);
      } finally {
        setIsDeleting(false);
        setIsDeleteSheetOpen(false);
      }
    }
  };

  // Dropdown menu rendered via Portal
  const dropdownMenu = isMenuOpen && createPortal(
    <div
      ref={menuRef}
      className="fixed w-44 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1.5 animate-fade-in"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex: 9999,
      }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
    >
      {onEdit && (
        <button
          onClick={handleEditClick}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors"
          role="menuitem"
        >
          <Pencil className="w-4 h-4 text-[#6B7280]" />
          <span>Edit</span>
        </button>
      )}
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
          role="menuitem"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
      )}
    </div>,
    document.body
  );

  return (
    <div className="flex items-center gap-3 py-3 md:py-4 hover:bg-[#F9FAFB] md:px-3 md:-mx-3 rounded-lg transition-colors group">
      <div className={'w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0 ' + iconBgClass}>
        <Icon className={'w-6 h-6 md:w-7 md:h-7 ' + iconColorClass} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#111827] font-medium md:text-lg truncate">{title}</p>
        <p className="text-[#6B7280] text-xs md:text-sm mt-0.5">{date} - {category}</p>
      </div>

      {/* Amount and Actions Container */}
      <div className="flex items-center gap-2">
        {/* Amount */}
        {!showConfirmDelete && (
          <p className={'font-semibold md:text-lg whitespace-nowrap ' + amountColorClass}>
            {prefix}{currencySymbol}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}

        {/* Delete Confirmation */}
        {showConfirmDelete && (
          <div className="flex items-center gap-2 animate-fade-in">
            <button
              onClick={handleCancelDelete}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}

        {/* 3-Dot Menu Button */}
        {(onEdit || onDelete) && !showConfirmDelete && (
          <button
            ref={buttonRef}
            onClick={handleMenuToggle}
            className={`p-2 rounded-lg transition-all duration-150 ${isMenuOpen
                ? 'bg-[#F3F4F6] text-[#111827] opacity-100'
                : isMobile
                  ? 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] opacity-100'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] opacity-0 group-hover:opacity-100'
              }`}
            title="More options"
            aria-expanded={isMenuOpen || isActionSheetOpen}
            aria-haspopup="true"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        )}

        {/* Dropdown Menu - Rendered via Portal (Desktop only) */}
        {dropdownMenu}
      </div>

      {/* Mobile Bottom Sheets */}
      {isMobile && (
        <>
          {/* Action Sheet - Edit/Delete options */}
          <ExpenseActionSheet
            isOpen={isActionSheetOpen}
            onClose={() => setIsActionSheetOpen(false)}
            expenseTitle={title}
            onEdit={handleMobileEdit}
            onDelete={handleMobileDeleteRequest}
          />

          {/* Delete Confirmation Sheet */}
          <DeleteConfirmationSheet
            isOpen={isDeleteSheetOpen}
            onClose={() => setIsDeleteSheetOpen(false)}
            expenseTitle={title}
            isDeleting={isDeleting}
            onConfirm={handleMobileConfirmDelete}
          />
        </>
      )}
    </div>
  );
}
