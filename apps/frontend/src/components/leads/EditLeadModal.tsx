'use client';

import { useState, FormEvent } from 'react';
import { leadsApi } from '@/lib/api';
import { Lead } from '@/types';

interface Props {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditLeadModal({ lead, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    businessName: lead.businessName || '', 
    website: lead.website || '', 
    email: lead.email || '',
    phone: lead.phone || '', 
    industry: lead.industry || '', 
    city: lead.city || '', 
    state: lead.state || '', 
    country: lead.country || '', 
    notes: lead.notes || '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const res = await leadsApi.update(lead.id, form);
    setIsLoading(false);
    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to update lead');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg animate-fade-in"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Edit Lead
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg btn-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Business Name *
              </label>
              <input value={form.businessName} onChange={set('businessName')} required
                placeholder="Acme Corp" className="input-field w-full px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Website *
              </label>
              <input value={form.website} onChange={set('website')} required
                placeholder="https://example.com" type="url" className="input-field w-full px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input value={form.email} onChange={set('email')} type="email"
                placeholder="john@example.com" className="input-field w-full px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Phone
              </label>
              <input value={form.phone} onChange={set('phone')} type="tel"
                placeholder="+1 555-1234" className="input-field w-full px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Industry
              </label>
              <input value={form.industry} onChange={set('industry')}
                placeholder="Software, E-commerce..." className="input-field w-full px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                City
              </label>
              <input value={form.city} onChange={set('city')}
                placeholder="Mumbai" className="input-field w-full px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                State / Province
              </label>
              <input value={form.state} onChange={set('state')}
                placeholder="Maharashtra" className="input-field w-full px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Country
              </label>
              <input value={form.country} onChange={set('country')}
                placeholder="India" className="input-field w-full px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Notes
            </label>
            <textarea value={form.notes} onChange={set('notes')} rows={3}
              placeholder="Additional context about this lead..."
              className="input-field w-full px-3 py-2 text-sm resize-none" />
          </div>

          {error && (
            <div className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm border"
              style={{ border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="btn-primary px-4 py-2 text-sm"
              style={{ opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
