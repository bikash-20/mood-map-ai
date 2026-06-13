// Modal component for Firebase Email/Password sign-in & sign-up
import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '../lib/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthModal({ open, onClose, initialMode = 'signin' }: AuthModalProps) {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Close on backdrop click
  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  const friendlyError = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/missing-password': return 'Please enter a password.';
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found': return 'Incorrect email or password.';
      case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
      case 'auth/network-request-failed': return 'Network error. Check your connection.';
      default: return 'Authentication failed. Please try again.';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, displayName.trim() || undefined);
      }
      onClose();
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      setError(friendlyError(code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={onBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={dialogRef}
        className="glass-card w-full max-w-md p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="auth-modal-title" className="text-2xl font-bold text-primaryText">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            type="button"
            aria-label="Close"
            className="text-secondaryText hover:text-primaryText text-2xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {!isConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 text-yellow-200 text-sm">
            Firebase is not configured. Add <code>VITE_FIREBASE_*</code> variables to your <code>.env</code> file.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-primaryText mb-1">
                Display name (optional)
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full glass-input"
                placeholder="How should we call you?"
                autoComplete="name"
                disabled={busy}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primaryText mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full glass-input"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={busy}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primaryText mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input"
              placeholder="At least 6 characters"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              disabled={busy}
            />
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-500/20 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !isConfigured}
            className="w-full px-4 py-2 bg-accentPositive text-primaryText rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-secondaryText">
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                className="text-accentPositive hover:underline font-medium"
                onClick={() => { setMode('signup'); setError(null); }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="text-accentPositive hover:underline font-medium"
                onClick={() => { setMode('signin'); setError(null); }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
