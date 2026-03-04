import { useState, useEffect } from 'react';
import { ExpenseProvider, useExpenses } from './shared/context/ExpenseContext';
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

  // Handle Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('auth_success') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      refreshData();
    }

    if (params.get('auth_error')) {
      const error = params.get('auth_error');
      console.error('Google auth error:', error);
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
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-[#6B7280] font-medium">Loading ExpenseSnap...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return <Register onNavigateToLogin={() => setShowRegister(false)} />;
    }
    return <Login onNavigateToRegister={() => setShowRegister(true)} />;
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
    <div className="relative min-h-screen bg-[#F9FAFB] font-['Inter',sans-serif]">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="md:ml-64">
        <div className="max-w-md md:max-w-none mx-auto bg-[#F9FAFB] min-h-screen relative shadow-2xl md:shadow-none">
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
    <ExpenseProvider>
      <AppContent />
    </ExpenseProvider>
  );
}
