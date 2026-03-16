import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Check, AlertTriangle, Loader2, Receipt, Sparkles, RotateCcw, Plus } from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useExpenses } from '../../../shared/context/ExpenseContext';
import type { ReceiptScanResult, ReceiptItem } from '../../../shared/types';

interface ReceiptScannerProps {
  onComplete: () => void;
  currencySymbol: string;
  currencyCode: string;
}

type ScanStage = 'upload' | 'scanning' | 'results' | 'saving' | 'error';

export function ReceiptScanner({ onComplete, currencySymbol, currencyCode }: ReceiptScannerProps) {
  const { addExpense } = useExpenses();
  const [stage, setStage] = useState<ScanStage>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [savingCount, setSavingCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, or WebP)');
      setStage('error');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image is too large. Maximum size is 10MB.');
      setStage('error');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Start scanning
    setStage('scanning');
    try {
      const result = await api.scanReceipt(file);
      setScanResult(result);

      if (result.success && result.items && result.items.length > 0) {
        // Select all items by default
        setSelectedItems(new Set(result.items.map((_, i) => i)));
        setStage('results');
      } else {
        setErrorMessage(result.error || 'Could not extract expense data from this image.');
        setStage('error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to scan receipt. Please try again.');
      setStage('error');
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toggleItem = (index: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSaveSelected = async () => {
    if (!scanResult?.items || selectedItems.size === 0) return;

    setStage('saving');
    const itemsToSave = scanResult.items.filter((_, i) => selectedItems.has(i));
    setSavingCount(itemsToSave.length);
    setSavedCount(0);

    let successCount = 0;
    for (const item of itemsToSave) {
      try {
        await addExpense({
          item_name: item.item_name,
          amount: item.amount,
          currency: currencyCode,
          category: item.category,
          type: item.type || 'expense',
          date_added: scanResult.date || new Date().toISOString().split('T')[0],
        });
        successCount++;
        setSavedCount(successCount);
      } catch (err) {
        console.error('Failed to save expense:', err);
      }
    }

    // Short delay for animation then go back
    setTimeout(() => {
      onComplete();
    }, 1200);
  };

  const handleReset = () => {
    setStage('upload');
    setPreviewUrl(null);
    setScanResult(null);
    setSelectedItems(new Set());
    setErrorMessage('');
    setSavingCount(0);
    setSavedCount(0);
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">
            <Check className="w-3 h-3" /> High Confidence
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#D97706]">
            <AlertTriangle className="w-3 h-3" /> Medium Confidence
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEE2E2] text-[#DC2626]">
            <AlertTriangle className="w-3 h-3" /> Low Confidence
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      'Food': '🍔',
      'Shopping': '🛍️',
      'Transport': '🚗',
      'Entertainment': '🎬',
      'Bills': '📄',
      'Health': '🏥',
      'Housing': '🏠',
      'Other': '📦',
    };
    return map[category] || '📦';
  };

  // =========================================================================
  // UPLOAD STAGE
  // =========================================================================
  if (stage === 'upload') {
    return (
      <div className="space-y-6">
        {/* Scan info card */}
        <div className="bg-gradient-to-br from-[#4F46E5]/5 to-[#7C3AED]/5 rounded-2xl p-5 border border-[#4F46E5]/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#111827] text-sm">AI-Powered Receipt Scanner</h3>
              <p className="text-[#6B7280] text-xs mt-1 leading-relaxed">
                Take a photo or upload an image of your receipt. Our AI will automatically extract the merchant name, items, amounts, and category.
              </p>
            </div>
          </div>
        </div>

        {/* Camera capture button - visible only on mobile */}
        <div className="block md:hidden space-y-6">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-[#4F46E5]/20 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-base block">Take Photo</span>
              <span className="text-white/70 text-xs">Use your camera to capture a receipt</span>
            </div>
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-[#E5E7EB]"></div>
            <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#E5E7EB]"></div>
          </div>
        </div>

        {/* File upload drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#D1D5DB] hover:border-[#4F46E5] rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-[#4F46E5]/[0.02] group"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] group-hover:bg-[#EEF2FF] flex items-center justify-center mx-auto mb-3 transition-colors">
            <Upload className="w-6 h-6 text-[#6B7280] group-hover:text-[#4F46E5] transition-colors" />
          </div>
          <p className="font-medium text-[#111827] text-sm">Upload Receipt Image</p>
          <p className="text-[#9CA3AF] text-xs mt-1">Drag & drop or browse files</p>
          <p className="text-[#D1D5DB] text-[10px] mt-2">JPG, PNG, WebP • Max 10MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>
    );
  }

  // =========================================================================
  // SCANNING STAGE
  // =========================================================================
  if (stage === 'scanning') {
    return (
      <div className="space-y-6">
        {/* Preview with scanning overlay */}
        <div className="relative rounded-2xl overflow-hidden bg-[#111827]">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Receipt"
              className="w-full max-h-64 object-contain opacity-60"
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Scanning animation */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-[#4F46E5]/30 flex items-center justify-center">
                <Receipt className="w-7 h-7 text-[#4F46E5] animate-pulse" />
              </div>
              {/* Rotating ring */}
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-[#4F46E5] animate-spin"></div>
            </div>
            <p className="text-white font-semibold mt-4 text-sm">Analyzing Receipt...</p>
            <p className="text-white/60 text-xs mt-1">AI is extracting expense data</p>
          </div>
          {/* Scan line animation */}
          <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-[#4F46E5] to-transparent animate-scan-line"></div>
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-[#6B7280] text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>This may take a few seconds...</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RESULTS STAGE
  // =========================================================================
  if (stage === 'results' && scanResult?.items) {
    return (
      <div className="space-y-4">
        {/* Result header */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
                <Check className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111827] text-sm">{scanResult.merchant || 'Receipt Scanned'}</h3>
                {scanResult.date && (
                  <p className="text-[#9CA3AF] text-xs">{scanResult.date}</p>
                )}
              </div>
            </div>
            {getConfidenceBadge(scanResult.confidence)}
          </div>

          {scanResult.total && (
            <div className="bg-[#F9FAFB] rounded-xl p-3 flex items-center justify-between">
              <span className="text-[#6B7280] text-xs font-medium">Total Amount</span>
              <span className="text-[#111827] font-bold text-lg">
                {currencySymbol}{scanResult.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
              Detected Items ({scanResult.items.length})
            </h4>
            <button
              onClick={() => {
                if (selectedItems.size === scanResult.items!.length) {
                  setSelectedItems(new Set());
                } else {
                  setSelectedItems(new Set(scanResult.items!.map((_, i) => i)));
                }
              }}
              className="text-xs font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors"
            >
              {selectedItems.size === scanResult.items.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {scanResult.items.map((item: ReceiptItem, index: number) => (
            <button
              key={index}
              onClick={() => toggleItem(index)}
              className={`w-full text-left rounded-xl p-3.5 border-2 transition-all ${
                selectedItems.has(index)
                  ? 'border-[#4F46E5] bg-[#EEF2FF] shadow-sm'
                  : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedItems.has(index)
                    ? 'border-[#4F46E5] bg-[#4F46E5]'
                    : 'border-[#D1D5DB]'
                }`}>
                  {selectedItems.has(index) && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Category emoji */}
                <span className="text-lg">{getCategoryEmoji(item.category)}</span>

                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#111827] text-sm truncate">{item.item_name}</p>
                  <p className="text-[#9CA3AF] text-xs">{item.category}</p>
                </div>

                {/* Amount */}
                <span className="font-semibold text-[#111827] text-sm whitespace-nowrap">
                  {currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleSaveSelected}
            disabled={selectedItems.size === 0}
            className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-[#4F46E5]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Save {selectedItems.size} Expense{selectedItems.size !== 1 ? 's' : ''}
          </button>
          <button
            onClick={handleReset}
            className="w-full text-[#6B7280] hover:text-[#111827] py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Scan Another Receipt
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SAVING STAGE
  // =========================================================================
  if (stage === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative">
          {savedCount === savingCount ? (
            <div className="w-20 h-20 rounded-full bg-[#DCFCE7] flex items-center justify-center animate-bounce-in">
              <Check className="w-10 h-10 text-[#16A34A]" />
            </div>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full border-4 border-[#E5E7EB] flex items-center justify-center">
                <span className="text-2xl font-bold text-[#4F46E5]">{savedCount}</span>
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-[#4F46E5] animate-spin"></div>
            </>
          )}
        </div>
        <div className="text-center">
          <p className="font-semibold text-[#111827]">
            {savedCount === savingCount ? 'All Expenses Saved!' : 'Saving Expenses...'}
          </p>
          <p className="text-[#9CA3AF] text-sm mt-1">
            {savedCount} of {savingCount} expenses saved
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ERROR STAGE
  // =========================================================================
  if (stage === 'error') {
    return (
      <div className="space-y-6">
        {previewUrl && (
          <div className="rounded-2xl overflow-hidden bg-[#111827]">
            <img
              src={previewUrl}
              alt="Receipt"
              className="w-full max-h-48 object-contain opacity-40"
            />
          </div>
        )}

        <div className="bg-[#FEF2F2] rounded-2xl p-5 border border-[#FECACA]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626]/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#991B1B] text-sm">Scan Failed</h3>
              <p className="text-[#B91C1C] text-xs mt-1 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleReset}
            className="w-full bg-[#4F46E5] text-white py-3.5 rounded-xl font-semibold hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>

        {/* Tips */}
        <div className="bg-[#F9FAFB] rounded-xl p-4">
          <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Tips for better results</h4>
          <ul className="space-y-1.5 text-xs text-[#6B7280]">
            <li className="flex items-start gap-2">
              <span className="text-[#4F46E5]">•</span>
              Ensure the receipt is well-lit and clearly visible
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4F46E5]">•</span>
              Avoid blurry or angled photos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4F46E5]">•</span>
              Make sure the entire receipt is in the frame
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4F46E5]">•</span>
              Try a receipt with printed (not handwritten) text
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return null;
}
