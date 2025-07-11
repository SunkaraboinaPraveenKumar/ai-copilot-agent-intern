import { useEffect } from 'react';
import { Zap, Shield, Calendar, Mail, GitBranch } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If auth_token is present, redirect to home
    if (localStorage.getItem('auth_token')) {
      navigate('/');
      return;
    }
    // Check for auth token in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      login(token).catch(console.error);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [login, navigate]);

  const handleGoogleLogin = async () => {
    try {
      // Redirect to backend OAuth endpoint
      window.location.href = 'http://localhost:8000/auth/google';
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Copilot</h1>
          <p className="text-gray-600">Your intelligent assistant for productivity</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to access your personalized AI assistant</p>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-xl hover:border-gray-400 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-gray-700">Continue with Google</span>
          </button>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-4">What you'll get access to:</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">Gmail integration and email management</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700">Calendar events and scheduling</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                  <GitBranch className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm text-gray-700">JIRA project and task management</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-sm text-gray-700">AI-powered insights and recommendations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}