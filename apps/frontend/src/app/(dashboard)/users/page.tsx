'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ANALYST', isActive: true });

  const fetchUsers = async () => {
    try {
      const res = await usersApi.getUsers();
      if (res.success && res.data) {
        setUsers(res.data as User[]);
      } else {
        setError(res.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authUser?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [authUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && editUserId) {
        // Edit User
        const payload: any = { name: form.name, role: form.role, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        
        const res = await usersApi.updateUser(editUserId, payload);
        if (res.success) {
          setIsModalOpen(false);
          fetchUsers();
        } else {
          alert(res.error || 'Failed to update user');
        }
      } else {
        // Create User
        const res = await usersApi.createUser(form);
        if (res.success) {
          setIsModalOpen(false);
          fetchUsers();
        } else {
          alert(res.error || 'Failed to create user');
        }
      }
    } catch (err) {
      alert('An unexpected error occurred');
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditUserId(null);
    setForm({ name: '', email: '', password: '', role: 'ANALYST', isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsEditMode(true);
    setEditUserId(user.id);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, isActive: user.isActive });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await usersApi.deleteUser(id);
      if (res.success) {
        fetchUsers();
      } else {
        alert(res.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('An unexpected error occurred');
    }
  };

  if (authUser?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl">
          <div className="text-4xl mb-4">⛔</div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-[var(--text-muted)]">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-[var(--text-muted)]">Provision and manage team access to the CRM.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white px-5 py-2.5 rounded-xl font-semibold shadow hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <span>+</span> Add User
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-500 rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-color)]">
                <th className="p-4 font-semibold text-sm text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                <th className="p-4 font-semibold text-sm text-[var(--text-muted)] uppercase tracking-wider">Email</th>
                <th className="p-4 font-semibold text-sm text-[var(--text-muted)] uppercase tracking-wider">Role</th>
                <th className="p-4 font-semibold text-sm text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="p-4 font-semibold text-sm text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">No users found.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-[var(--bg-muted)] transition-colors group">
                    <td className="p-4 font-medium">{u.name}</td>
                    <td className="p-4 text-[var(--text-muted)]">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                        u.role === 'ANALYST' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.isActive ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-500">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span> Disabled
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {authUser.email !== u.email && (
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(u)}
                            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-red-500 hover:text-red-600 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-lg">{isEditMode ? 'Edit User' : 'Provision New User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Full Name</label>
                <input required type="text" name="name" value={form.name} onChange={handleChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2 outline-none focus:border-[#f97316]" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Email Address</label>
                <input required={!isEditMode} disabled={isEditMode} type="email" name="email" value={form.email} onChange={handleChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2 outline-none focus:border-[#f97316] disabled:opacity-50" placeholder="jane@rsorangetech.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">{isEditMode ? 'Reset Password (optional)' : 'Temporary Password'}</label>
                <input required={!isEditMode} type="password" name="password" value={form.password} onChange={handleChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2 outline-none focus:border-[#f97316]" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">System Role</label>
                <select required name="role" value={form.role} onChange={handleChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2 outline-none focus:border-[#f97316] appearance-none">
                  <option value="ANALYST">Analyst (Standard User)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                </select>
              </div>
              {isEditMode && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))} className="rounded border-[var(--border-color)] text-[#f97316] focus:ring-[#f97316]" />
                    Account is Active
                  </label>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl text-sm font-medium bg-[var(--bg-muted)] hover:bg-[var(--bg-elevated)] transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-sm font-medium bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors">{isEditMode ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
