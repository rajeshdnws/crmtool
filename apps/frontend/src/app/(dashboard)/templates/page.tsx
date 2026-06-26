'use client';

import { useEffect, useState, useCallback } from 'react';
import { templatesApi } from '@/lib/api';
import { EmailTemplate } from '@/types';
import { formatDate } from '@/lib/utils';
import TemplateModal from '@/components/templates/TemplateModal';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function TemplatesPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'SUPPORT') {
      router.push('/leads');
    }
  }, [user, router]);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    const res = await templatesApi.getAll();
    if (res.success && res.data) {
      setTemplates(res.data as EmailTemplate[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const res = await templatesApi.delete(id);
    if (res.success) {
      fetchTemplates();
    } else {
      alert(res.error || 'Failed to delete template');
    }
  };

  const handleEdit = (t: EmailTemplate) => {
    setEditTemplate(t);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditTemplate(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Email Templates
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Manage saved templates for outreach campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddNew}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Template
          </button>
        </div>
      </div>

      {/* ─── Table ───────────────────────────────────────────────── */}
      <div className="card overflow-hidden" style={{ minHeight: '50vh' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Template Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subject Line</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Created At</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider w-24" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-muted)', width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                          No templates found
                        </p>
                        <p className="text-xs mt-1">Create your first template to get started</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id}
                    className="transition-colors hover:bg-[#232329] group"
                    style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {template.name}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {template.subject}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(template.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(template)} title="Edit Template" className="p-1.5 rounded hover:bg-[#34343d] text-gray-400 hover:text-white transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(template.id)} title="Delete" className="p-1.5 rounded hover:bg-red-950/80 text-red-400 hover:text-red-300 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <TemplateModal 
          template={editTemplate} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => { setShowModal(false); fetchTemplates(); }} 
        />
      )}

    </div>
  );
}
