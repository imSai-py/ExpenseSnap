export interface Expense {
  id: number;
  item_name: string;
  amount: number;
  currency: string;
  category: string;
  type?: 'income' | 'expense';
  date_added: string;
  user_id: number;
}

export interface ExpenseSummary {
  total_balance: number;
  total_income: number;
  total_expense: number;
  category_breakdown: CategoryBreakdown[];
  currency: string;
  currency_symbol: string;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  preferred_currency: string;
  profile_photo: string | null;
  total_expenses: number;
}

export interface ProfileUpdateData {
  username?: string;
  email?: string;
  profile_photo?: File;
}

export interface NotificationPreferences {
  daily_reminders: boolean;
  budget_alerts: boolean;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
}

// Push Notification Types
export type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface PushSubscriptionInfo {
  id: number;
  endpoint: string;
  created_at: string | null;
  last_used_at: string | null;
}

export interface PushNotificationState {
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  serviceWorkerReady: boolean;
}

// Bulk Import Types
export interface ImportPreviewRow {
  row: number;
  valid: boolean;
  data: {
    item_name?: string;
    amount?: number;
    category?: string;
    date?: string;
    type?: string;
    [key: string]: string | number | undefined;
  };
  errors?: string[];
}

export interface ImportPreviewResult {
  success: boolean;
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  preview: ImportPreviewRow[];
  errors: string[];
  can_import: boolean;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported_count: number;
  skipped_count: number;
  errors: string[];
}

// Expense Filter Types
export interface ExpenseFilters {
  search?: string;
  year?: number;
  month?: number;
  category?: string;
  type?: 'expense' | 'income';
}

// Notification History Types
export type NotificationType = 'budget_alert' | 'daily_reminder' | 'system';

export interface NotificationHistoryItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  data: {
    percentage?: number;
    url?: string;
    threshold_exceeded?: boolean;
    [key: string]: unknown;
  } | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationHistoryResponse {
  success: boolean;
  notifications: NotificationHistoryItem[];
  unread_count: number;
}
