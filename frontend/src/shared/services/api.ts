import type { Expense, ExpenseSummary, User, ProfileUpdateData, NotificationPreferences, ChangePasswordData, ImportPreviewResult, ImportResult, ExpenseFilters, NotificationHistoryItem, NotificationHistoryResponse } from '../types';

const API_BASE_URL = '/api';

interface ApiResponse {
  success: boolean;
  error?: string;
  expenses?: Expense[];
  expense?: Expense;
  summary?: ExpenseSummary;
  user?: User;
  notifications?: NotificationPreferences;
  message?: string;
}

async function parseJsonResponse(response: Response): Promise<ApiResponse> {
  const text = await response.text();

  // Handle non-OK responses first
  if (!response.ok) {
    // Check for 401 Unauthorized specifically
    if (response.status === 401) {
      // Try to parse error message from response
      if (text && text.trim()) {
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || 'Invalid username or password');
        } catch (e) {
          // If it's our custom Error (not a JSON parse error), re-throw it
          if (e instanceof Error && !e.message.includes('JSON')) {
            throw e;
          }
          // JSON parse failed, use default message
        }
      }
      throw new Error('Invalid username or password');
    }

    // For other errors, try to parse JSON error message
    if (text && text.trim()) {
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      } catch (e) {
        // If it's our custom Error (not a JSON parse error), re-throw it
        if (e instanceof Error && !e.message.includes('JSON')) {
          throw e;
        }
        // JSON parse failed, use default message
      }
    }
    throw new Error(`Request failed with status ${response.status}`);
  }

  // Handle empty responses for successful requests
  if (!text || !text.trim()) {
    // Some endpoints might return empty 200/201 responses
    return { success: true };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    // Log the actual response for debugging
    console.error('Failed to parse JSON response. Status:', response.status);
    console.error('Response URL:', response.url);
    console.error('Response text (first 500 chars):', text.substring(0, 500));

    // Check if it's an HTML error page
    if (text.includes('<!doctype') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(`Server returned HTML instead of JSON (Status: ${response.status}). Check if Flask backend is running.`);
    }

    throw new Error(`Invalid JSON response from server`);
  }
}

async function fetchWithCredentials(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });
}

async function fetchFormData(url: string, formData: FormData): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
    // Don't set Content-Type header - browser will set it with boundary
  });
}

export const api = {
  async getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    let url = `${API_BASE_URL}/expenses`;

    // Build query string from filters
    if (filters) {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.year) params.append('year', filters.year.toString());
      if (filters.month) params.append('month', filters.month.toString());
      if (filters.category) params.append('category', filters.category);
      if (filters.type) params.append('type', filters.type);

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const response = await fetchWithCredentials(url);
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to fetch expenses');
    return data.expenses || [];
  },

  async createExpense(expense: Omit<Expense, 'id' | 'user_id'>): Promise<Expense> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to create expense');
    return data.expense!;
  },

  async deleteExpense(id: number): Promise<void> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to delete expense');
  },

  async updateExpense(id: number, expense: Partial<Omit<Expense, 'id' | 'user_id'>>): Promise<Expense> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to update expense');
    return data.expense!;
  },

  async getSummary(period?: string): Promise<ExpenseSummary> {
    const url = period
      ? `${API_BASE_URL}/summary?period=${period}`
      : `${API_BASE_URL}/summary`;
    const response = await fetchWithCredentials(url);
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to fetch summary');
    return data.summary!;
  },

  async getProfile(): Promise<User> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/user/profile`);
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to fetch profile');
    return data.user!;
  },

  async login(credentials: any): Promise<User> {
    console.log('[Login] Attempting login for user:', credentials.username);

    let response: Response;
    try {
      response = await fetchWithCredentials('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    } catch (networkError) {
      console.error('[Login] Network error:', networkError);
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Log response details for debugging
    console.log('[Login] Response status:', response.status);
    console.log('[Login] Response ok:', response.ok);
    console.log('[Login] Response headers:', Object.fromEntries(response.headers.entries()));

    // Clone response to read body twice if needed for debugging
    const responseClone = response.clone();

    let data: ApiResponse;
    try {
      data = await parseJsonResponse(response);
    } catch (parseError) {
      // Log the raw response body for debugging
      const rawText = await responseClone.text();
      console.error('[Login] Failed to parse response. Status:', response.status);
      console.error('[Login] Raw response body:', rawText.substring(0, 1000));
      throw parseError;
    }

    console.log('[Login] Parsed response data:', { success: data.success, error: data.error, hasUser: !!data.user });

    if (!data.success) {
      console.error('[Login] Login failed. Error from server:', data.error);
      throw new Error(data.error || 'Login failed');
    }

    console.log('[Login] Login successful for user:', data.user?.username);
    return data.user!;
  },

  async register(credentials: any): Promise<User> {
    const response = await fetchWithCredentials('/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Registration failed');
    return data.user!;
  },

  async logout(): Promise<void> {
    await fetchWithCredentials('/logout', { method: 'POST' });
  },

  async updateCurrency(currency: string): Promise<void> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/user/currency`, {
      method: 'PUT',
      body: JSON.stringify({ currency }),
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to update currency');
  },

  async updateProfile(profileData: ProfileUpdateData): Promise<User> {
    const formData = new FormData();

    if (profileData.username) {
      formData.append('username', profileData.username);
    }
    if (profileData.email) {
      formData.append('email', profileData.email);
    }
    if (profileData.profile_photo) {
      formData.append('profile_photo', profileData.profile_photo);
    }

    const response = await fetchFormData(`${API_BASE_URL}/user/profile`, formData);
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to update profile');
    return data.user!;
  },

  async getNotifications(): Promise<NotificationPreferences> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/user/notifications`);
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to fetch notifications');
    return data.notifications!;
  },

  async updateNotifications(notifications: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/user/notifications`, {
      method: 'PUT',
      body: JSON.stringify(notifications),
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to update notifications');
    return data.notifications!;
  },

  async changePassword(passwordData: ChangePasswordData): Promise<string> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/user/change-password`, {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to change password');
    return data.message || 'Password updated successfully';
  },

  async downloadReport(period: string = 'this_month'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/generate-report?period=${period}`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/pdf',
      },
    });

    if (!response.ok) {
      // Try to parse error message
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      } catch {
        throw new Error('Failed to generate report');
      }
    }

    // Get the blob from response
    const blob = await response.blob();

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `ExpenseSnap_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ============================================================================
  // Bulk Import Methods
  // ============================================================================

  async downloadImportTemplate(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/import-expenses/template`, {
      credentials: 'include',
      headers: {
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ExpenseSnap_Import_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async previewImport(file: File): Promise<ImportPreviewResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/import-expenses/preview`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to preview import');
    }
    return data;
  },

  async importExpenses(file: File, skipInvalid: boolean = false): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('skip_invalid', skipInvalid.toString());

    const response = await fetch(`${API_BASE_URL}/import-expenses`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to import expenses');
    }
    return data;
  },

  // ============================================================================
  // Notification History Methods
  // ============================================================================

  async getNotificationHistory(unreadOnly: boolean = false, limit: number = 50): Promise<NotificationHistoryResponse> {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unread_only', 'true');
    if (limit) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/notifications/history${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetchWithCredentials(url);
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to fetch notification history');
    return data as NotificationHistoryResponse;
  },

  async getUnreadNotificationCount(): Promise<number> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/notifications/unread-count`);
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to fetch unread count');
    return (data as { unread_count: number }).unread_count;
  },

  async markNotificationAsRead(id: number): Promise<NotificationHistoryItem> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PUT',
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to mark notification as read');
    return (data as { notification: NotificationHistoryItem }).notification;
  },

  async markAllNotificationsAsRead(): Promise<number> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'POST',
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to mark all notifications as read');
    return (data as { updated_count: number }).updated_count;
  },

  async deleteNotification(id: number): Promise<void> {
    const response = await fetchWithCredentials(`${API_BASE_URL}/notifications/${id}`, {
      method: 'DELETE',
    });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error || 'Failed to delete notification');
  },
};
