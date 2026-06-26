'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    password: '',
  });

  useEffect(() => {
    if (authUser) {
      setForm(prev => ({ ...prev, name: authUser.name }));
    }
  }, [authUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload: { name?: string; password?: string } = { name: form.name };
      if (form.password) {
        payload.password = form.password;
      }

      const res = await authApi.updateProfile(payload);
      if (res.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setForm(prev => ({ ...prev, password: '' })); // clear password field
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to update profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  if (!authUser) {
    return <div className="text-[var(--text-muted)] animate-pulse">Loading profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-[var(--text-muted)]">Update your personal account settings and password.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Profile Information */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-[#f97316]">👤</span> Personal Information
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Email Address</label>
                <input
                  type="email"
                  value={authUser.email}
                  disabled
                  className="w-full bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-muted)] cursor-not-allowed"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">Email cannot be changed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Role</label>
                <input
                  type="text"
                  value={authUser.role}
                  disabled
                  className="w-full bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-muted)] cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-[#f97316]">🔒</span> Security
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">New Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
                className="w-full md:w-1/2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Saving...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
