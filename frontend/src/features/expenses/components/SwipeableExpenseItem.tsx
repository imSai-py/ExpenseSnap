import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { triggerHapticFeedback } from '../../../shared/hooks/useIsMobile';

interface SwipeableExpenseItemProps {
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

const SWIPE_THRESHOLD = 80; // pixels to trigger action
const ACTION_WIDTH = 80; // width of action button area

export function SwipeableExpenseItem({
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
}: SwipeableExpenseItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  // Transform x position to action visibility
  const editOpacity = useTransform(x, [0, ACTION_WIDTH], [0, 1]);
  const deleteOpacity = useTransform(x, [-ACTION_WIDTH, 0], [1, 0]);
  const editScale = useTransform(x, [0, ACTION_WIDTH], [0.5, 1]);
  const deleteScale = useTransform(x, [-ACTION_WIDTH, 0], [1, 0.5]);

  // Background colors based on swipe direction
  const backgroundColor = useTransform(
    x,
    [-ACTION_WIDTH * 1.5, -ACTION_WIDTH / 2, 0, ACTION_WIDTH / 2, ACTION_WIDTH * 1.5],
    ['#DC2626', '#FEE2E2', '#FFFFFF', '#EEF2FF', '#4F46E5']
  );

  const isExpense = type === 'expense';
  const iconBgClass = isExpense ? 'bg-[#FEF2F2]' : 'bg-[#F0FDF4]';
  const iconColorClass = isExpense ? 'text-[#DC2626]' : 'text-[#16A34A]';
  const amountColorClass = isExpense ? 'text-[#DC2626]' : 'text-[#16A34A]';
  const prefix = isExpense ? '-' : '+';

  const handleDrag = (_: any, info: PanInfo) => {
    const currentX = info.offset.x;

    // Trigger haptic feedback when threshold is reached
    if (Math.abs(currentX) >= SWIPE_THRESHOLD && !hasTriggeredHaptic) {
      triggerHapticFeedback('medium');
      setHasTriggeredHaptic(true);
    } else if (Math.abs(currentX) < SWIPE_THRESHOLD && hasTriggeredHaptic) {
      setHasTriggeredHaptic(false);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const currentX = info.offset.x;
    setHasTriggeredHaptic(false);

    if (currentX > SWIPE_THRESHOLD && onEdit) {
      // Swipe right - Edit
      triggerHapticFeedback('light');
      animate(x, 0, { duration: 0.2 });
      onEdit(id);
    } else if (currentX < -SWIPE_THRESHOLD && onDelete) {
      // Swipe left - Delete (show confirmation)
      triggerHapticFeedback('medium');
      animate(x, 0, { duration: 0.2 });
      setShowConfirmDelete(true);
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      setIsDeleting(true);
      triggerHapticFeedback('heavy');
      try {
        await onDelete(id);
      } finally {
        setIsDeleting(false);
        setShowConfirmDelete(false);
      }
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDelete(false);
  };

  // Delete confirmation modal
  if (showConfirmDelete) {
    return (
      <div className="py-3 px-2">
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-[#111827] font-medium mb-1">Delete "{title}"?</p>
          <p className="text-[#6B7280] text-sm mb-4">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={constraintsRef} className="relative overflow-hidden">
      {/* Background actions revealed on swipe */}
      <motion.div
        className="absolute inset-0 flex items-center justify-between px-4"
        style={{ backgroundColor }}
      >
        {/* Edit action (swipe right reveals this on left side) */}
        <motion.div
          className="flex items-center justify-center w-16 h-16 rounded-xl"
          style={{ opacity: editOpacity, scale: editScale }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
              <Pencil className="w-5 h-5 text-[#4F46E5]" />
            </div>
            <span className="text-xs font-medium text-white">Edit</span>
          </div>
        </motion.div>

        {/* Delete action (swipe left reveals this on right side) */}
        <motion.div
          className="flex items-center justify-center w-16 h-16 rounded-xl"
          style={{ opacity: deleteOpacity, scale: deleteScale }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
              <Trash2 className="w-5 h-5 text-[#DC2626]" />
            </div>
            <span className="text-xs font-medium text-white">Delete</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        className="relative bg-white flex items-center gap-3 py-3 px-2 cursor-grab active:cursor-grabbing"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH * 1.5, right: ACTION_WIDTH * 1.5 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
      >
        {/* Category Icon */}
        <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + iconBgClass}>
          <Icon className={'w-6 h-6 ' + iconColorClass} />
        </div>

        {/* Title and Date */}
        <div className="flex-1 min-w-0">
          <p className="text-[#111827] font-medium truncate">{title}</p>
          <p className="text-[#6B7280] text-xs mt-0.5">{date} - {category}</p>
        </div>

        {/* Amount */}
        <p className={'font-semibold whitespace-nowrap ' + amountColorClass}>
          {prefix}{currencySymbol}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </motion.div>

      {/* Swipe hint indicator */}
      <div className="absolute left-1/2 bottom-0.5 transform -translate-x-1/2">
        <div className="w-8 h-0.5 bg-[#E5E7EB] rounded-full" />
      </div>
    </div>
  );
}
