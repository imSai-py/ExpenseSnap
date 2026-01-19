import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Download, X, Check, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useExpenses } from '../../../shared/context/ExpenseContext';
import { BottomSheet } from '../../../shared/components/BottomSheet';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import type { ImportPreviewResult, ImportPreviewRow } from '../../../shared/types';

interface BulkImportProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export function BulkImport({ onComplete, onCancel }: BulkImportProps) {
  const { refreshData } = useExpenses();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null);

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExt = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExt)) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx)');
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const result = await api.previewImport(selectedFile);
      setPreviewData(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      await api.downloadImportTemplate();
    } catch (err) {
      setError('Failed to download template');
    }
  };

  // Perform import
  const handleImport = async () => {
    if (!file) return;

    setStep('importing');
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.importExpenses(file, skipInvalid);
      setImportResult({
        imported: result.imported_count,
        skipped: result.skipped_count
      });
      setStep('complete');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import expenses');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to upload
  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setError(null);
    setStep('upload');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
          <Upload className="w-8 h-8 text-[#4F46E5]" />
        </div>
        <h3 className="text-xl font-semibold text-[#111827] mb-2">Bulk Import Expenses</h3>
        <p className="text-[#6B7280] text-sm">
          Upload a CSV or Excel file to import multiple expenses at once.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragging
            ? 'border-[#4F46E5] bg-[#EEF2FF]'
            : 'border-[#E5E7EB] hover:border-[#4F46E5] hover:bg-[#F9FAFB]'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-[#4F46E5] animate-spin" />
            <p className="text-[#6B7280]">Processing file...</p>
          </div>
        ) : (
          <>
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-[#9CA3AF]" />
            <p className="text-[#111827] font-medium mb-1">
              Drop your file here or click to browse
            </p>
            <p className="text-[#6B7280] text-sm">
              Supports CSV and Excel files (max 500 rows)
            </p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
          <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
          <p className="text-sm text-[#DC2626]">{error}</p>
        </div>
      )}

      {/* Download Template */}
      <div className="bg-[#F9FAFB] rounded-xl p-4">
        <p className="text-sm text-[#6B7280] mb-3">
          Need a template? Download our sample CSV file with the required column headers.
        </p>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 text-[#4F46E5] font-medium text-sm hover:text-[#4338CA] transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Required Columns Info */}
      <div className="bg-[#FFFBEB] rounded-xl p-4 border border-[#FDE68A]">
        <p className="text-sm font-medium text-[#92400E] mb-2">Required Columns:</p>
        <ul className="text-sm text-[#92400E] space-y-1">
          <li>• <strong>date</strong> - Date of expense (YYYY-MM-DD or DD/MM/YYYY)</li>
          <li>• <strong>description</strong> - Description of the expense</li>
          <li>• <strong>category</strong> - Food, Shopping, Transport, etc.</li>
          <li>• <strong>amount</strong> - Amount (numeric)</li>
          <li>• <strong>type</strong> - expense or income (optional)</li>
        </ul>
      </div>
    </div>
  );

  // Render preview step
  const renderPreviewStep = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#111827]">Preview Import</h3>
          <p className="text-sm text-[#6B7280]">
            {previewData?.valid_count} valid, {previewData?.invalid_count} invalid of {previewData?.total_rows} rows
          </p>
        </div>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-[#6B7280]" />
        </button>
      </div>

      {/* File info */}
      <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-xl">
        <FileSpreadsheet className="w-8 h-8 text-[#4F46E5]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#111827] truncate">{file?.name}</p>
          <p className="text-xs text-[#6B7280]">{(file?.size || 0 / 1024).toFixed(1)} KB</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F0FDF4] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#16A34A]">{previewData?.valid_count || 0}</p>
          <p className="text-xs text-[#6B7280]">Valid rows</p>
        </div>
        <div className="bg-[#FEF2F2] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#DC2626]">{previewData?.invalid_count || 0}</p>
          <p className="text-xs text-[#6B7280]">Invalid rows</p>
        </div>
      </div>

      {/* Preview Table */}
      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7280]">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7280]">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7280]">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7280]">Category</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-[#6B7280]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {previewData?.preview.slice(0, 20).map((row: ImportPreviewRow) => (
                <tr key={row.row} className={row.valid ? '' : 'bg-[#FEF2F2]'}>
                  <td className="px-3 py-2">
                    {row.valid ? (
                      <Check className="w-4 h-4 text-[#16A34A]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#111827]">
                    {row.data.date || row.data.date_added || '-'}
                  </td>
                  <td className="px-3 py-2 text-[#111827] max-w-[150px] truncate">
                    {row.data.item_name || row.data.description || row.data.title || '-'}
                  </td>
                  <td className="px-3 py-2 text-[#111827]">
                    {row.data.category || '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-[#111827]">
                    {row.data.amount || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(previewData?.total_rows || 0) > 20 && (
          <div className="px-3 py-2 bg-[#F9FAFB] text-xs text-[#6B7280] text-center">
            Showing first 20 of {previewData?.total_rows} rows
          </div>
        )}
      </div>

      {/* Errors */}
      {previewData?.errors && previewData.errors.length > 0 && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3">
          <p className="text-sm font-medium text-[#DC2626] mb-2">Validation Errors:</p>
          <ul className="text-xs text-[#DC2626] space-y-1 max-h-[100px] overflow-y-auto">
            {previewData.errors.slice(0, 10).map((err: string, idx: number) => (
              <li key={idx}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Skip invalid option */}
      {(previewData?.invalid_count || 0) > 0 && (previewData?.valid_count || 0) > 0 && (
        <label className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={skipInvalid}
            onChange={(e) => setSkipInvalid(e.target.checked)}
            className="w-5 h-5 rounded border-[#E5E7EB] text-[#4F46E5] focus:ring-[#4F46E5]"
          />
          <span className="text-sm text-[#111827]">
            Skip invalid rows and import only valid ones
          </span>
        </label>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
          <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
          <p className="text-sm text-[#DC2626]">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel || handleReset}
          className="flex-1 py-3 px-4 rounded-xl font-medium bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={!previewData?.can_import || (previewData?.invalid_count > 0 && !skipInvalid)}
          className="flex-1 py-3 px-4 rounded-xl font-medium bg-[#4F46E5] text-white hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import {skipInvalid ? previewData?.valid_count : previewData?.total_rows} Expenses
        </button>
      </div>
    </div>
  );

  // Render importing step
  const renderImportingStep = () => (
    <div className="py-12 text-center">
      <Loader2 className="w-16 h-16 mx-auto mb-4 text-[#4F46E5] animate-spin" />
      <h3 className="text-xl font-semibold text-[#111827] mb-2">Importing Expenses...</h3>
      <p className="text-[#6B7280]">Please wait while we process your file.</p>
    </div>
  );

  // Render complete step
  const renderCompleteStep = () => (
    <div className="py-8 text-center">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#F0FDF4] flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-[#16A34A]" />
      </div>
      <h3 className="text-xl font-semibold text-[#111827] mb-2">Import Complete!</h3>
      <p className="text-[#6B7280] mb-6">
        Successfully imported {importResult?.imported} expense{importResult?.imported !== 1 ? 's' : ''}.
        {importResult?.skipped ? ` ${importResult.skipped} row(s) were skipped.` : ''}
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 py-3 px-4 rounded-xl font-medium bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
        >
          Import More
        </button>
        <button
          onClick={onComplete}
          className="flex-1 py-3 px-4 rounded-xl font-medium bg-[#4F46E5] text-white hover:bg-[#4338CA] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );

  // Render current step
  const renderContent = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'preview':
        return renderPreviewStep();
      case 'importing':
        return renderImportingStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderUploadStep();
    }
  };

  return <div className="bg-white rounded-2xl p-6 shadow-sm">{renderContent()}</div>;
}

// ============================================================================
// Bulk Import Modal - Wrapper for showing in a modal/sheet
// ============================================================================

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Bulk Import">
        <BulkImport onComplete={onClose} onCancel={onClose} />
      </BottomSheet>
    );
  }

  // Desktop modal
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#111827]">Bulk Import Expenses</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>
        <div className="p-6">
          <BulkImport onComplete={onClose} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
