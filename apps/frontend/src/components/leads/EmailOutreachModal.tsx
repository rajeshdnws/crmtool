'use client';

import { useState, useEffect } from 'react';
import { leadsApi, templatesApi } from '@/lib/api';
import { Lead, EmailTemplate } from '@/types';

interface Props {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailOutreachModal({ lead, onClose, onSuccess }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    templatesApi.getAll().then(res => {
      if (res.success && res.data) {
        setTemplates(res.data as EmailTemplate[]);
      }
    });
    // Default values if no template is selected initially
    setSubject(`Intro - RSOrangeTech & ${lead.businessName}`);
    setBody(`Hi ${lead.contactPerson || 'there'},\n\nI noticed ${lead.businessName} recently and wanted to reach out regarding your digital presence.\n\nAt RSOrangeTech, we specialize in helping businesses like yours improve their performance, SEO, and overall web experience. Would you be open to a quick chat next week to discuss how we might be able to help?\n\nBest,\n[Your Name]`);
  }, [lead]);

  const parseTemplateVariables = (text: string) => {
    return text
      .replace(/{{businessName}}/g, lead.businessName || '')
      .replace(/{{contactPerson}}/g, lead.contactPerson || 'there')
      .replace(/{{email}}/g, lead.email || '')
      .replace(/{{industry}}/g, lead.industry || 'your')
      .replace(/{{location}}/g, [lead.city, lead.state, lead.country].filter(Boolean).join(', ') || 'your location');
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    
    if (tId) {
      const template = templates.find(t => t.id === tId);
      if (template) {
        setSubject(parseTemplateVariables(template.subject));
        setBody(parseTemplateVariables(template.body));
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) {
      setError('Please provide both subject and message body.');
      return;
    }
    
    setIsSending(true);
    setError('');
    
    const res = await leadsApi.sendOutreachEmail(lead.id, { subject, body });
    
    setIsSending(false);
    
    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to send email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      
      <div className="card w-full max-w-2xl animate-fade-in"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Email Outreach</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-4">
          {!lead.email && (
            <div className="p-3 rounded-lg text-sm mb-4" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              Warning: This lead has no email address. Please edit the lead to add an email before sending.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>To:</label>
              <div className="px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
                {lead.email || 'No email specified'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Contact Person:</label>
              <div className="px-3 py-2 text-sm rounded-lg border bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
                {lead.contactPerson || 'Not specified'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Use Template</label>
            <select 
              value={selectedTemplateId} 
              onChange={handleTemplateSelect}
              className="input-field w-full px-3 py-2 text-sm"
            >
              <option value="">-- Select a Template --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Subject</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
              placeholder="Email subject line"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Message</label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm min-h-[200px]"
              placeholder="Write your message here..."
              required
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Variables like {`{{businessName}}`} have been auto-replaced if you selected a template.
            </p>
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
            <button type="submit" disabled={isSending || !lead.email} className="btn-primary px-6 py-2 text-sm flex items-center gap-2" style={{ opacity: (isSending || !lead.email) ? 0.7 : 1 }}>
              {isSending ? (
                <>Sending...</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
