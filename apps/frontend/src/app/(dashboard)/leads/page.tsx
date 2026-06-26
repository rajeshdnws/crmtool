'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { leadsApi } from '@/lib/api';
import { Lead, LeadStatus, PaginationMeta } from '@/types';
import { formatDate, truncateUrl, STATUS_CONFIG } from '@/lib/utils';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import AddLeadModal from '@/components/leads/AddLeadModal';
import AddNoteModal from '@/components/leads/AddNoteModal';
import BulkEmailModal from '@/components/leads/BulkEmailModal';
import EmailOutreachModal from '@/components/leads/EmailOutreachModal';
import EditLeadModal from '@/components/leads/EditLeadModal';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Statuses' },
  ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
];

export default function LeadsPage() {
  const { user } = useAuth();
  const isSupport = user?.role === 'SUPPORT';
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [businessName, setBusinessName] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Contact Enrichment Filters
  const [hasWebsite, setHasWebsite] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasWhatsapp, setHasWhatsapp] = useState(false);
  const [emailSentFilter, setEmailSentFilter] = useState(false);

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activePillFilter, setActivePillFilter] = useState('all');

  const filterPills = [
    { id: 'all', label: 'All Leads' },
    { id: 'high_opp', label: '🔥 High Opportunity' },
    { id: 'missing_chatbot', label: '🤖 Missing Chatbot' },
    { id: 'missing_ai_bot', label: '🧠 Missing AI Chatbot' },
    { id: 'basic_chat_only', label: '💬 Basic Live Chat Only' },
    { id: 'poor_seo', label: '📉 Poor SEO' },
    { id: 'slow', label: '🐢 Slow Sites' },
    { id: 'not_mobile', label: '📱 Non-Mobile' },
    { id: 'no_whatsapp', label: '🟢 No WhatsApp' },
    { id: 'email_sent', label: '📧 Email Sent' }
  ];

  const displayedLeads = leads.filter(l => {
    if (activePillFilter === 'high_opp') return l.opportunityLevel === 'High Priority Prospect' || (l.opportunityScore ?? 0) > 50;
    if (activePillFilter === 'missing_chatbot') return l.chatbotDetected === false;
    if (activePillFilter === 'missing_ai_bot') return l.chatbotType !== 'AI Chatbot';
    if (activePillFilter === 'basic_chat_only') return l.chatbotDetected === true && l.chatbotType !== 'AI Chatbot';
    if (activePillFilter === 'poor_seo') return (l.seoScore !== undefined && l.seoScore !== null && l.seoScore < 60);
    if (activePillFilter === 'slow') return (l.speedScore !== undefined && l.speedScore !== null && l.speedScore < 60);
    if (activePillFilter === 'not_mobile') return (l.mobileScore !== undefined && l.mobileScore !== null && l.mobileScore < 60);
    if (activePillFilter === 'no_whatsapp') return (!l.whatsappNumber && !l.whatsappLink);
    if (activePillFilter === 'email_sent') return Boolean(l.emailSent || l.status === 'EMAIL_SENT');
    return true;
  });

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [bulkEmailModal, setBulkEmailModal] = useState(false);
  
  // Row Actions State
  const [editingNoteLead, setEditingNoteLead] = useState<Lead | null>(null);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      limit: '20',
      sortBy,
      sortOrder,
    };
    if (businessName) params.businessName = businessName;
    if (emailFilter) params.email = emailFilter;
    if (location) params.location = location;
    if (status) params.status = status;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    
    if (hasWebsite) params.hasWebsite = 'true';
    if (hasEmail) params.hasEmail = 'true';
    if (hasPhone) params.hasPhone = 'true';
    if (hasWhatsapp) params.hasWhatsapp = 'true';
    if (emailSentFilter) params.emailSent = 'true';

    const res = await leadsApi.getAll(params);
    if (res.success && res.data) {
      setLeads(res.data as Lead[]);
      if (res.meta) setMeta(res.meta);
    }
    setIsLoading(false);
  }, [page, businessName, emailFilter, location, status, dateFrom, dateTo, hasWebsite, hasEmail, hasPhone, hasWhatsapp, emailSentFilter, sortBy, sortOrder]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Reset to page 1 on filter change
  useEffect(() => { 
    setPage(1); 
  }, [businessName, emailFilter, location, status, dateFrom, dateTo, hasWebsite, hasEmail, hasPhone, hasWhatsapp, emailSentFilter]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeads(new Set(displayedLeads.map(l => l.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedLeads(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedLeads.size} leads?`)) return;
    
    setIsDeleting(true);
    const res = await leadsApi.bulkDelete(Array.from(selectedLeads));
    setIsDeleting(false);
    
    if (res.success) {
      setSelectedLeads(new Set());
      fetchLeads();
    } else {
      alert(res.error || 'Failed to delete leads');
    }
  };

  const handleInlineStatusChange = async (id: string, newStatus: LeadStatus) => {
    const res = await leadsApi.update(id, { status: newStatus });
    if (res.success) {
      fetchLeads();
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    const res = await leadsApi.delete(id);
    if (res.success) fetchLeads();
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) {
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.3 }}>
        <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
      </svg>;
    }
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#f97316' }}>
      {sortOrder === 'asc' ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>;
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Lead Management
            {meta && (
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                {meta.total}
              </span>
            )}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Manage leads, assign statuses, and trigger bulk outreach.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isSupport && selectedLeads.size > 0 && (
            <>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="btn-primary bg-red-600 hover:bg-red-700 border-none flex items-center gap-2 px-4 py-2 text-sm"
                >
                  {isDeleting ? 'Deleting...' : `Delete (${selectedLeads.size})`}
                </button>
              )}
              <button
                onClick={() => setBulkEmailModal(true)}
                className="btn-primary bg-indigo-600 hover:bg-indigo-700 border-none flex items-center gap-2 px-4 py-2 text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Bulk Email ({selectedLeads.size})
              </button>
            </>
          )}
          {!isSupport && (
            <>
              <Link
                href="/leads/import"
                className="btn-ghost flex items-center gap-2 px-4 py-2 text-sm border"
                style={{ borderColor: 'var(--border)' }}>
                Import Leads
              </Link>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Lead
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Filters ─────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Business Name</label>
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Corp" className="input-field w-full px-3 py-2 text-sm" />
          </div>
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input type="text" value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="e.g. @gmail.com" className="input-field w-full px-3 py-2 text-sm" />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} style={{ background: 'var(--bg-card)' }}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:col-span-2 lg:col-span-5">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date Range</label>
            <div className="flex items-center gap-2">
               <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                 className="input-field w-full px-2 py-2 text-xs" />
               <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                 className="input-field w-full px-2 py-2 text-xs" />
            </div>
          </div>
        </div>
        
        {/* Contact Enrichment Filters */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={hasWebsite} onChange={(e) => setHasWebsite(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-800" />
            Has Website
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={hasEmail} onChange={(e) => setHasEmail(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-800" />
            Has Email
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={hasPhone} onChange={(e) => setHasPhone(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-800" />
            Has Phone
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={hasWhatsapp} onChange={(e) => setHasWhatsapp(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-800" />
            Has WhatsApp Link
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <input type="checkbox" checked={emailSentFilter} onChange={(e) => setEmailSentFilter(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-800" />
            Email Sent
          </label>
        </div>
      </div>

      {/* ─── Interactive Filter Pills ────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterPills.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePillFilter(p.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 border cursor-pointer ${
              activePillFilter === p.id
                ? 'bg-[#f97316] text-white border-[#f97316] shadow-md scale-105'
                : 'bg-[#141417] border-[#232329] text-[#9898a6] hover:bg-[#232329] hover:text-[#f0f0f2]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ─── Table ───────────────────────────────────────────────── */}
      <div className="card overflow-hidden" style={{ minHeight: '50vh' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                <th className="px-4 py-3 text-left w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    checked={displayedLeads.length > 0 && selectedLeads.size === displayedLeads.length}
                    onChange={handleSelectAll}
                  />
                </th>
                {[
                  { label: 'Business Name', field: 'businessName' },
                  { label: 'Chatbot Status', field: 'chatbotDetected' },
                  { label: 'Chatbot Type', field: 'chatbotType' },
                  { label: 'Quality', field: 'websiteScore' },
                  { label: 'Contact Person', field: 'contactPerson' },
                  { label: 'Email (Sent)', field: 'email' },
                  { label: 'Mobile', field: 'phone' },
                  { label: 'Location', field: 'city' },
                  { label: 'Status', field: 'status' },
                  { label: 'Created Date', field: 'createdAt' },
                  { label: 'Actions', field: null },
                ].map(({ label, field }) => (
                  <th key={label}
                    className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${field ? 'cursor-pointer select-none' : ''}`}
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => field && handleSort(field)}>
                    <div className="flex items-center gap-1.5">
                      {label}
                      {field && <SortIcon field={field} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <td className="px-4 py-3"></td>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-muted)', width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayedLeads.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                          No leads found
                        </p>
                        <p className="text-xs mt-1">Try adjusting your filters or try switching to "All Leads"</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedLeads.map((lead) => (
                  <tr key={lead.id}
                    className="transition-colors hover:bg-[#232329] group"
                    style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox"
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => handleSelectOne(lead.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <Link href={`/leads/${lead.id}`} className="hover:text-orange-400 transition-colors truncate block" title={lead.businessName}>
                          {lead.businessName}
                        </Link>
                        {lead.website && (
                          <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate block" title={lead.website}>
                            {truncateUrl(lead.website)}
                          </a>
                        )}
                        <div className="flex gap-1.5 mt-0.5 text-xs opacity-80">
                          {lead.website && <span title="Website Available">🌐</span>}
                          {(lead.emailFound || lead.email) && <span title="Email Available">📧</span>}
                          {lead.phone && <span title="Phone Available">📞</span>}
                          {lead.whatsappLink && <span title="WhatsApp Link">💬</span>}
                          {lead.contactScore !== undefined && lead.contactScore !== null && (
                            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-semibold" title={`Contact Score: ${lead.contactScore}/100`}>
                              C:{lead.contactScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.chatbotDetected ? (
                        <span className="inline-flex items-center text-emerald-400 font-bold text-xs bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rose-400 font-bold text-xs bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {lead.chatbotType || 'None'}
                    </td>
                    <td className="px-4 py-3 text-center font-black text-xs" style={{ color: 'var(--brand-500)' }}>
                      {lead.websiteScore !== undefined && lead.websiteScore !== null ? `${lead.websiteScore}/100` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.contactPerson || <span className="text-xs text-gray-400 italic">None</span>}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[220px]">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          className="rounded border-gray-500 bg-black/40 text-orange-500 focus:ring-orange-500 cursor-pointer w-3.5 h-3.5 flex-shrink-0"
                          checked={Boolean(lead.emailSent || lead.status === 'EMAIL_SENT')}
                          disabled={Boolean(lead.emailSent || lead.status === 'EMAIL_SENT' || isSupport || !lead.email)}
                          title={!lead.email ? "No email address available" : lead.emailSent || lead.status === 'EMAIL_SENT' ? "Outreach email already sent" : "Click to mark email as sent"}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            try {
                              await leadsApi.update(lead.id, { 
                                emailSent: checked,
                                ...(checked && lead.status === 'NEW' ? { status: 'EMAIL_SENT' } : {})
                              });
                              fetchLeads();
                            } catch (err) {
                              console.error('Failed to update email sent status', err);
                            }
                          }}
                        />
                        <span className="truncate block text-xs font-mono" style={{ color: lead.email ? 'var(--text-primary)' : 'var(--text-muted)' }} title={lead.email || ''}>
                          {lead.email || <span className="italic opacity-50 font-sans">None</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.phone || <span className="text-xs text-gray-400 italic">None</span>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        value={lead.status}
                        onChange={(e) => handleInlineStatusChange(lead.id, e.target.value as LeadStatus)}
                        disabled={isSupport}
                        className="text-xs px-2 py-1 rounded border bg-transparent font-medium"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: isSupport ? 0.6 : 1 }}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k} style={{ background: 'var(--bg-card)' }}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/leads/${lead.id}`} title="View Details" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        </Link>
                        {!isSupport && (
                          <>
                            <button onClick={() => setEditLead(lead)} title="Edit Lead" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button onClick={() => setEmailLead(lead)} title="Send Email" className="p-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                            </button>
                            <button onClick={() => setEditingNoteLead(lead)} title="Add Note" className="p-1.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                              </svg>
                            </button>
                          </>
                        )}
                        {user?.role === 'ADMIN' && (
                          <button onClick={() => handleDeleteSingle(lead.id)} title="Delete" className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, meta.total)} of {meta.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded text-xs transition-colors"
                style={{ color: 'var(--text-secondary)', opacity: page === 1 ? 0.4 : 1 }}>
                ← Prev
              </button>
              {[...Array(Math.min(5, meta.totalPages))].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                     key={p}
                     onClick={() => setPage(p)}
                     className="w-7 h-7 rounded text-xs font-medium transition-colors"
                     style={
                       page === p
                         ? { background: '#f97316', color: 'white' }
                         : { color: 'var(--text-secondary)' }
                     }>
                     {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-3 py-1.5 rounded text-xs transition-colors"
                style={{ color: 'var(--text-secondary)', opacity: page === meta.totalPages ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ───────────────────────────────────────────────── */}
      {showAddModal && (
        <AddLeadModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchLeads(); }} />
      )}
      {editLead && (
        <EditLeadModal lead={editLead} onClose={() => setEditLead(null)} onSuccess={() => { setEditLead(null); fetchLeads(); }} />
      )}
      {editingNoteLead && (
        <AddNoteModal lead={editingNoteLead} onClose={() => setEditingNoteLead(null)} onSuccess={() => { setEditingNoteLead(null); fetchLeads(); }} />
      )}
      {emailLead && (
        <EmailOutreachModal lead={emailLead} onClose={() => setEmailLead(null)} onSuccess={() => { setEmailLead(null); fetchLeads(); }} />
      )}
      {bulkEmailModal && (
        <BulkEmailModal 
          selectedLeadsList={leads.filter(l => selectedLeads.has(l.id))} 
          onClose={() => setBulkEmailModal(false)} 
          onSuccess={() => { setBulkEmailModal(false); setSelectedLeads(new Set()); fetchLeads(); }} 
        />
      )}

    </div>
  );
}
