import { useState, useEffect } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { LoginPage } from './components/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { IntegrationsProvider } from './contexts/IntegrationsContext';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ShadcnSidebar from './components/ShadcnSidebar';
import { SidebarProvider } from './components/ui/sidebar';

function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('auth_token', token);
      navigate('/');
    } else {
      navigate('/login');
    }
  }, [navigate]);
  return <div>Logging you in...</div>;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <div className="h-8 w-8 bg-white rounded"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ChatProvider>
      <IntegrationsProvider>
        <SidebarProvider>
          <div className="flex h-screen w-full">
            {/* Sidebar - responsive visibility */}
            <ShadcnSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-hidden">
                <ChatInterface onSidebarToggle={() => setSidebarOpen(true)} />
              </div>
            </div>
          </div>
        </SidebarProvider>
      </IntegrationsProvider>
    </ChatProvider>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        } />
        <Route path="/*" element={
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        } />
      </Routes>
    </Router>
  );
}

export default App;