// src/App.tsx – Main application entry point
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './lib/AuthContext';
import './styles/glass.css';
import './index.css';

function NavBar({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <nav className="w-full max-w-4xl glass-card flex flex-wrap justify-between items-center p-4 mb-6 gap-3">
      <Link to="/" className="flex items-center gap-2">
        <img src="/icons/icon-48x48.png" alt="" className="w-8 h-8" />
        <h1 className="text-2xl font-bold text-primaryText">Mood Map AI</h1>
      </Link>

      {user && (
        <div className="flex gap-2">
          <Link
            to="/chat"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              location.pathname === '/chat' ? 'bg-accentPositive' : 'bg-white/10 hover:bg-white/20'
            } text-primaryText`}
          >
            Chat
          </Link>
          <Link
            to="/dashboard"
            className={`px-3 py-1.5 rounded-lg text-sm ${
              location.pathname === '/dashboard' ? 'bg-accentPositive' : 'bg-white/10 hover:bg-white/20'
            } text-primaryText`}
          >
            Dashboard
          </Link>
        </div>
      )}

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <span className="text-sm text-secondaryText hidden sm:inline">
              {user.displayName || user.email}
            </span>
            <button
              className="px-4 py-2 bg-accentNegative text-primaryText rounded-lg shadow-md"
              onClick={() => signOut()}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button
              className="px-4 py-2 bg-accentPositive text-primaryText rounded-lg shadow-md"
              onClick={onSignIn}
            >
              Sign In
            </button>
            <button
              className="px-4 py-2 bg-accentNegative text-primaryText rounded-lg shadow-md"
              onClick={onSignUp}
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-secondaryText">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function AppShell() {
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({
    open: false,
    mode: 'signin',
  });

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-b from-backgroundStart to-backgroundEnd flex flex-col items-center p-4">
        <NavBar
          onSignIn={() => setAuthModal({ open: true, mode: 'signin' })}
          onSignUp={() => setAuthModal({ open: true, mode: 'signup' })}
        />
        <main className="w-full max-w-4xl flex-1">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route
                path="/chat"
                element={
                  <RequireAuth>
                    <Chat />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
        <footer className="w-full max-w-4xl glass-card text-center p-2 mt-6 text-secondaryText">
          © 2026 Mood Map AI – All rights reserved.
        </footer>
      </div>

      <AuthModal
        open={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((m) => ({ ...m, open: false }))}
      />
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
