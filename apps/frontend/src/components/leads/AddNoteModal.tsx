'use client';

import { useState } from 'react';
import { leadsApi } from '@/lib/api';
import { Lead } from '@/types';

interface Props {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddNoteModal({ lead, onClose, onSuccess }: Props) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    
    const res = await leadsApi.update(lead.id, { notes });
    
    setIsSaving(false);
    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to save note.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      
      <div className="card w-full max-w-md animate-fade-in"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Notes: {lead.businessName}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm min-h-[150px]"
              placeholder="Add your notes here..."
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm border" style={{ borderColor: 'var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-primary px-6 py-2 text-sm" style={{ opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
