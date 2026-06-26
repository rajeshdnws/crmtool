'use client';

import { useState } from 'react';
import { templatesApi } from '@/lib/api';
import { EmailTemplate } from '@/types';

interface Props {
  template: EmailTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TemplateModal({ template, onClose, onSuccess }: Props) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subject || !body) {
      setError('All fields are required.');
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    const data = { name, subject, body };
    let res;
    if (template) {
      res = await templatesApi.update(template.id, data);
    } else {
      res = await templatesApi.create(data);
    }
    
    setIsSaving(false);
    
    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to save template.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      
      <div className="card w-full max-w-2xl animate-fade-in"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3 rounded-lg text-sm mb-4" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <p className="font-medium mb-1">Available Variables:</p>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10">{"{{businessName}}"}</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10">{"{{contactPerson}}"}</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10">{"{{email}}"}</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10">{"{{location}}"}</span>
            </div>
            <p className="opacity-80 mt-2 text-xs">These will be automatically replaced with the lead's details when sending emails.</p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Template Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
              placeholder="e.g. Intro Email v1"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Subject</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
              placeholder="e.g. Grow Your Business with Us"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Message Body</label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm min-h-[200px] font-mono"
              placeholder="Hello {{contactPerson}},\n\n..."
              required
            />
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t mt-6" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm border" style={{ borderColor: 'var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-primary px-6 py-2 text-sm" style={{ opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
