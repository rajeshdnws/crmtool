'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}>

      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea6d0e)',
              boxShadow: '0 8px 32px rgba(249,115,22,0.4)',
            }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            RSOrange<span className="gradient-text">Tech</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Lead Intelligence Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-8"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5), var(--glow-brand)' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@rsorangetech.com"
                className="input-field w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-field w-full px-4 py-2.5 text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 mt-2"
              style={{ opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 text-center text-xs"
            style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Internal use only • RSOrangeTech © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
