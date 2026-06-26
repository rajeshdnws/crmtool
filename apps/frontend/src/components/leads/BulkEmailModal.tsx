'use client';

import { useState, useEffect } from 'react';
import { leadsApi, templatesApi } from '@/lib/api';
import { EmailTemplate, Lead } from '@/types';

interface Props {
  selectedLeadsList: Lead[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkEmailModal({ selectedLeadsList, onClose, onSuccess }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [subject, setSubject] = useState(`Intro - RSOrangeTech & {{businessName}}`);
  const [body, setBody] = useState(`Hi {{contactPerson}},\n\nI noticed {{businessName}} recently and wanted to reach out regarding your digital presence.\n\nAt RSOrangeTech, we specialize in helping businesses like yours improve their performance, SEO, and overall web experience. Would you be open to a quick chat next week to discuss how we might be able to help?\n\nBest,\n[Your Name]`);
  
  const [isSending, setIsSending] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState('');

  // Progress Tracking
  const [progress, setProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    templatesApi.getAll().then(res => {
      if (res.success && res.data) {
        setTemplates(res.data as EmailTemplate[]);
      }
    });
  }, []);

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    
    if (tId) {
      const template = templates.find(t => t.id === tId);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
      }
    }
  };

  const parseTemplateVariables = (text: string, lead: Lead) => {
    return text
      .replace(/{{businessName}}/g, lead.businessName || '')
      .replace(/{{contactPerson}}/g, lead.contactPerson || 'there')
      .replace(/{{email}}/g, lead.email || '')
      .replace(/{{location}}/g, [lead.city, lead.state, lead.country].filter(Boolean).join(', ') || 'your location');
  };

  const handleSendQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) {
      setError('Please provide both subject and message body.');
      return;
    }
    
    setIsSending(true);
    setError('');
    setProgress(0);
    
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < selectedLeadsList.length; i++) {
      const lead = selectedLeadsList[i];
      
      setProgress(i + 1);

      if (!lead.email) {
        skipped++;
        setSkippedCount(skipped);
        continue;
      }

      try {
        const personalizedSubject = parseTemplateVariables(subject, lead);
        const personalizedBody = parseTemplateVariables(body, lead);

        const res = await leadsApi.sendOutreachEmail(lead.id, { subject: personalizedSubject, body: personalizedBody });
        if (res.success) {
          sent++;
          setSentCount(sent);
        } else {
          failed++;
          setFailedCount(failed);
        }
      } catch (err) {
        failed++;
        setFailedCount(failed);
      }
    }

    const templateName = templates.find(t => t.id === selectedTemplateId)?.name || 'Custom Message';
    await leadsApi.logBulkCampaign({ sent, failed, skipped, templateName });

    setIsSending(false);
    setIsFinished(true);
  };

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
        <div className="card w-full max-w-md p-8 text-center animate-fade-in" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Campaign Complete</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>The bulk email campaign has finished processing.</p>
          
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{sentCount}</div>
              <div className="text-xs font-medium text-green-700 dark:text-green-500 uppercase tracking-wide">Sent</div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failedCount}</div>
              <div className="text-xs font-medium text-red-700 dark:text-red-500 uppercase tracking-wide">Failed</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{skippedCount}</div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wide">Skipped</div>
            </div>
          </div>
          
          <button onClick={onSuccess} className="btn-primary w-full py-2.5">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => !isSending && e.target === e.currentTarget && onClose()}>
      
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
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Bulk Email Campaign</h3>
          </div>
          {!isSending && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSendQueue} className="p-6 space-y-4">
          <div className="p-3 rounded-lg text-sm mb-4 flex flex-col gap-2" style={{ background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="font-medium">Selected {selectedLeadsList.length} leads</span>
              </div>
              <button type="button" onClick={() => setShowPreview(!showPreview)} className="text-xs font-semibold hover:underline">
                {showPreview ? 'Hide Preview' : 'Preview Recipients'}
              </button>
            </div>
            
            {showPreview && (
              <div className="mt-2 max-h-32 overflow-y-auto bg-white dark:bg-black/20 rounded border p-2" style={{ borderColor: 'var(--border)' }}>
                {selectedLeadsList.map(l => (
                  <div key={l.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0 border-gray-100 dark:border-gray-800" style={{ color: 'var(--text-secondary)' }}>
                    <span>{l.businessName}</span>
                    {l.email ? (
                      <span className="text-green-600 dark:text-green-500">{l.email}</span>
                    ) : (
                      <span className="text-red-500 dark:text-red-400 italic">No Email (Skipped)</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Use Template</label>
            <select 
              value={selectedTemplateId} 
              onChange={handleTemplateSelect}
              className="input-field w-full px-3 py-2 text-sm"
              disabled={isSending}
            >
              <option value="">-- Start from scratch --</option>
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
              disabled={isSending}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 flex justify-between" style={{ color: 'var(--text-muted)' }}>
              <span>Message</span>
              <span style={{ color: '#f97316' }}>Variables: {`{{businessName}}`}, {`{{contactPerson}}`}, etc.</span>
            </label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm min-h-[200px]"
              placeholder="Write your message here..."
              required
              disabled={isSending}
            />
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {isSending && (
            <div className="pt-2">
              <div className="flex justify-between text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                <span>Sending Progress...</span>
                <span>{progress} / {selectedLeadsList.length}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                <div className="h-full transition-all duration-300" style={{ background: '#f97316', width: `${(progress / selectedLeadsList.length) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-xs mt-1 text-gray-500">
                <span className="text-green-600">Sent: {sentCount}</span>
                <span className="text-red-500">Failed: {failedCount}</span>
                <span className="text-gray-500">Skipped: {skippedCount}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t mt-4" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={onClose} disabled={isSending} className="btn-ghost px-4 py-2 text-sm border" style={{ borderColor: 'var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSending} className="btn-primary px-6 py-2 text-sm flex items-center gap-2" style={{ opacity: isSending ? 0.7 : 1 }}>
              {isSending ? (
                <>Processing Queue...</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send Campaign
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
