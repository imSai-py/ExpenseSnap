import { useState, useEffect } from 'react';
import { ExpenseProvider, useExpenses } from './shared/context/ExpenseContext';
import { ThemeProvider } from './shared/context/ThemeContext';
import { Dashboard } from './features/expenses/components/Dashboard';
import { AddExpense } from './features/expenses/components/AddExpense';
import { Statistics } from './features/statistics/components/Statistics';
import { Profile } from './features/profile/components/Profile';
import { BottomNavigation } from './shared/components/BottomNavigation';
import { Sidebar } from './shared/components/Sidebar';
import { Login } from './features/auth/components/Login';
import { Register } from './features/auth/components/Register';
import { ChatBot } from './features/ai/ChatBot';
import { InstallPrompt } from './shared/components/InstallPrompt';

type Screen = 'dashboard' | 'add-expense' | 'statistics' | 'profile';
type Tab = 'home' | 'add' | 'stats' | 'profile';

function AppContent() {
  const { isAuthenticated, loading, refreshData } = useExpenses();
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showRegister, setShowRegister] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  // Handle Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('auth_success') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      refreshData();
    }

    if (params.get('auth_error')) {
      const error = params.get('auth_error');
      const details = params.get('details');
      console.error('Google auth error:', error, details);
      let msg = 'Google Sign-In failed. Please try again.';
      if (error === 'google_not_configured') {
        msg = 'Google Sign-In is not configured on the backend server (GOOGLE_CLIENT_ID missing).';
      } else if (error === 'callback_failed') {
        msg = details ? `Google Sign-In failed: ${details}` : 'Google authentication failed on the server. Please check server logs or login with username/password.';
      } else if (error === 'google_unavailable') {
        msg = 'Google login service is currently unavailable.';
      } else if (error === 'no_user_info') {
        msg = 'Failed to retrieve profile information from Google.';
      }
      setAuthErrorMsg(msg);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auth Flow
  useEffect(() => {
    if (isAuthenticated) {
      setShowRegister(false);
    }
  }, [isAuthenticated]);

  // If loading, show clearer loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Loading ExpenseSnap...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return <Register onNavigateToLogin={() => setShowRegister(false)} />;
    }
    return <Login onNavigateToRegister={() => setShowRegister(true)} initialError={authErrorMsg} />;
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setCurrentScreen('dashboard');
    } else if (tab === 'add') {
      setCurrentScreen('add-expense');
    } else if (tab === 'stats') {
      setCurrentScreen('statistics');
    } else if (tab === 'profile') {
      setCurrentScreen('profile');
    }
  };

  const handleAddExpenseClick = () => {
    setCurrentScreen('add-expense');
    setActiveTab('add');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setActiveTab('home');
  };

  return (
    <div className="relative min-h-screen font-['Inter',sans-serif]" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="md:ml-64">
        <div className="max-w-md md:max-w-none mx-auto min-h-screen relative shadow-2xl md:shadow-none" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          {currentScreen === 'dashboard' && (
            <Dashboard onAddExpenseClick={handleAddExpenseClick} />
          )}
          {currentScreen === 'add-expense' && (
            <AddExpense onBack={handleBackToDashboard} />
          )}
          {currentScreen === 'statistics' && <Statistics />}
          {currentScreen === 'profile' && <Profile />}
          {(currentScreen === 'dashboard' || currentScreen === 'statistics' || currentScreen === 'profile') && (
            <div className="md:hidden">
              <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          )}
        </div>
      </div>
      <ChatBot />
      <InstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ExpenseProvider>
        <AppContent />
      </ExpenseProvider>
    </ThemeProvider>
  );
}
