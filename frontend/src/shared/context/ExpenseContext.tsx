import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../services/api';
import type { Expense, ExpenseSummary, User, ProfileUpdateData } from '../types';

interface ExpenseContextType {
  expenses: Expense[];
  summary: ExpenseSummary | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refreshData: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'user_id'>) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
  updateExpense: (id: number, expense: Partial<Omit<Expense, 'id' | 'user_id'>>) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [expensesData, summaryData, userData] = await Promise.all([
        api.getExpenses(),
        api.getSummary(),
        api.getProfile(),
      ]);
      setExpenses(expensesData);
      setSummary(summaryData);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      // Check for auth-related errors - don't show as error, just mark as unauthenticated
      if (
        message.includes('Unauthorized') ||
        message.includes('401') ||
        message.includes('Not logged in') ||
        message.includes('login')
      ) {
        setIsAuthenticated(false);
        setError(null); // Clear any error - user just needs to login
      } else {
        setError(message);
      }
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      await api.login({ username, password });

      try {
        const userData = await api.getProfile();
        const [expensesData, summaryData] = await Promise.all([
          api.getExpenses(),
          api.getSummary(),
        ]);

        setUser(userData);
        setExpenses(expensesData);
        setSummary(summaryData);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Login successful but failed to fetch data", e);
        throw new Error("Login successful, but failed to load user data.");
      }
    } catch (err) {
      throw err;
    }
  }, []);

  const register = useCallback(async (username: string, password: string, email?: string) => {
    try {
      const registeredUser = await api.register({ username, password, email });

      try {
        const userData = await api.getProfile();
        const [expensesData, summaryData] = await Promise.all([
          api.getExpenses(),
          api.getSummary(),
        ]);

        setUser(userData);
        setExpenses(expensesData);
        setSummary(summaryData);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Register successful but failed to fetch data", e);
        // Still set authenticated since registration was successful
        setUser(registeredUser);
        setIsAuthenticated(true);
      }
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
      setUser(null);
      setExpenses([]);
      setSummary(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, []);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'user_id'>) => {
    try {
      await api.createExpense(expense);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
      throw err;
    }
  }, [refreshData]);

  const deleteExpense = useCallback(async (id: number) => {
    try {
      await api.deleteExpense(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
      throw err;
    }
  }, [refreshData]);

  const updateExpense = useCallback(async (id: number, expense: Partial<Omit<Expense, 'id' | 'user_id'>>) => {
    try {
      await api.updateExpense(id, expense);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
      throw err;
    }
  }, [refreshData]);

  const updateCurrency = useCallback(async (currency: string) => {
    try {
      await api.updateCurrency(currency);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update currency');
      throw err;
    }
  }, [refreshData]);

  const updateProfile = useCallback(async (data: ProfileUpdateData) => {
    try {
      const updatedUser = await api.updateProfile(data);
      setUser(updatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <ExpenseContext.Provider value={{
      expenses,
      summary,
      user,
      loading,
      error,
      isAuthenticated,
      refreshData,
      addExpense,
      deleteExpense,
      updateExpense,
      updateCurrency,
      updateProfile,
      login,
      register,
      logout
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
}
