'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { leadsApi, auditsApi } from '@/lib/api';
import { Lead, LeadStatus, WebsiteAudit, AiAnalysisResult } from '@/types';
import { formatDate, formatDateTime, getScoreBg, STATUS_CONFIG } from '@/lib/utils';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import { LeadScoreBadge } from '@/components/leads/LeadScoreBadge';
import EditLeadModal from '@/components/leads/EditLeadModal';
import EmailOutreachModal from '@/components/leads/EmailOutreachModal';
import { useAuth } from '@/lib/auth';

function AuditScoreCard({ label, score, color }: { label: string; score: number | null; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl"
      style={{ background: 'var(--bg-muted)' }}>
      <div className="text-lg font-bold" style={{ color }}>
        {score !== null ? `${Math.round(score)}` : '—'}
      </div>
      <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function AuditRadarChart({ report }: { report: WebsiteAudit }) {
  const data = [
    { metric: 'Performance', value: report.performanceScore ?? 0 },
    { metric: 'SEO', value: report.seoScore ?? 0 },
    { metric: 'Accessibility', value: report.accessibilityScore ?? 0 },
    { metric: 'Best Practices', value: report.bestPracticesScore ?? 0 },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.07)" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }}
          formatter={(value: number) => [`${Math.round(value)}`, 'Score']}
        />
        <Radar dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isSupport = user?.role === 'SUPPORT';
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newStatus, setNewStatus] = useState<LeadStatus>('NEW');
  const [isScanning, setIsScanning] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const fetchLead = useCallback(async () => {
    if (!params.id) return;
    const res = await leadsApi.getById(params.id as string);
    if (res.success && res.data) {
      const l = res.data as Lead;
      setLead(l);
      setNewStatus(l.status);
    }
    setIsLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // Auto-polling if a scan is pending or running
  useEffect(() => {
    if (!lead?.websiteAudits?.[0]) return;
    const audit = lead.websiteAudits[0];
    const isStuck = (audit.status === 'PENDING' || audit.status === 'RUNNING') && 
                    audit.createdAt && 
                    (new Date().getTime() - new Date(audit.createdAt).getTime() > 5 * 60 * 1000);

    if ((audit.status === 'PENDING' || audit.status === 'RUNNING') && !isStuck) {
      const interval = setInterval(fetchLead, 3000);
      return () => clearInterval(interval);
    }
  }, [lead, fetchLead]);

  const handleStatusUpdate = async () => {
    if (!lead) return;
    const res = await leadsApi.update(lead.id, { status: newStatus });
    if (res.success && res.data) {
      setLead(res.data as Lead);
      setIsEditingStatus(false);
    }
  };

  const handleRunScanner = async () => {
    if (!lead) return;
    setIsScanning(true);
    await auditsApi.triggerScan(lead.id);
    await fetchLead(); // Refresh immediately to show PENDING state
    setIsScanning(false);
  };

  if (isLoading && !lead) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: 'var(--bg-muted)' }} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 h-48 animate-pulse" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: 'var(--text-muted)' }}>
        <p>Lead not found</p>
        <Link href="/leads" className="btn-primary px-4 py-2 text-sm">← Back to Leads</Link>
      </div>
    );
  }

  const latestAudit = lead.websiteAudits?.[0] ?? null;

  const isStuck = latestAudit && 
                 (latestAudit.status === 'RUNNING' || latestAudit.status === 'PENDING') && 
                 latestAudit.createdAt && 
                 (new Date().getTime() - new Date(latestAudit.createdAt).getTime() > 5 * 60 * 1000);

  const isCurrentlyScanning = isScanning || ((latestAudit?.status === 'RUNNING' || latestAudit?.status === 'PENDING') && !isStuck);

  let aiAnalysis: AiAnalysisResult | null = null;
  let rawAiSummary: string | null = null;
  
  if (latestAudit?.aiSummary) {
    try {
      aiAnalysis = JSON.parse(latestAudit.aiSummary);
    } catch (e) {
      // It's likely an old plain-text summary from the seed data
      rawAiSummary = latestAudit.aiSummary;
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            <Link href="/leads" className="hover:text-orange-400 transition-colors">Leads</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{lead.businessName}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {lead.businessName}
            </h2>
            <LeadStatusBadge status={lead.status} />
            <LeadScoreBadge score={lead.leadScore} />
          </div>
          <a href={lead.website || '#'} target="_blank" rel="noopener noreferrer"
            className="text-sm mt-1 inline-flex items-center gap-1 hover:text-orange-400 transition-colors"
            style={{ color: 'var(--text-secondary)' }}>
            {lead.website}
          </a>
        </div>
        <div className="flex gap-2">
          {latestAudit && latestAudit.status === 'DONE' && (
            <button 
              onClick={() => {
                const token = localStorage.getItem('token');
                window.open(`${process.env.NEXT_PUBLIC_API_URL}/audits/${latestAudit.id}/pdf?token=${token}`, '_blank');
              }}
              className="btn-ghost px-4 py-2 text-sm flex items-center gap-2 border"
              style={{ borderColor: 'var(--border)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download PDF
            </button>
          )}
          {!isSupport && (
            <>
              <button onClick={() => setShowEmailModal(true)} className="btn-primary px-4 py-2 text-sm flex items-center gap-2" style={{ background: '#4f46e5', color: '#fff' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Outreach
              </button>
              <button onClick={handleRunScanner} disabled={isCurrentlyScanning}  
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                style={{ opacity: isCurrentlyScanning ? 0.7 : 1 }}>
                {isCurrentlyScanning ? (
                  <span className="animate-pulse">Scanning...</span>
                ) : isStuck ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                    </svg>
                    Retry Stuck Scan
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                    </svg>
                    Run Scanner
                  </>
                )}
              </button>
              <button onClick={() => setShowEditModal(true)} className="btn-ghost px-3 py-2 text-sm shrink-0 border"
                style={{ borderColor: 'var(--border)' }}>
                Edit
              </button>
            </>
          )}
          <button onClick={() => router.back()} className="btn-ghost px-3 py-2 text-sm shrink-0 border"
            style={{ borderColor: 'var(--border)' }}>
            ← Back
          </button>
        </div>
      </div>

      {showEditModal && lead && (
        <EditLeadModal 
          lead={lead} 
          onClose={() => setShowEditModal(false)} 
          onSuccess={() => { setShowEditModal(false); fetchLead(); }} 
        />
      )}

      {showEmailModal && lead && (
        <EmailOutreachModal 
          lead={lead} 
          onClose={() => setShowEmailModal(false)} 
          onSuccess={() => { setShowEmailModal(false); fetchLead(); }} 
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Contact & Timeline */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Contact Information</h3>
            <div className="space-y-3">
              {[
                { label: 'Email', value: lead.email, icon: '✉️' },
                { label: 'Phone', value: lead.phone, icon: '📞' },
                { label: 'Industry', value: lead.industry, icon: '🏢' },
                { label: 'Location', value: lead.city ? `${lead.city}, ${lead.state}, ${lead.country}` : null, icon: '📍' },
              ].map(({ label, value, icon }) => value ? (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">{icon}</span>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    <div className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                </div>
              ) : null)}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pipeline Status</h3>
              {!isEditingStatus && (
                <button onClick={() => setIsEditingStatus(true)} className="text-xs font-medium" style={{ color: '#f97316' }}>Edit</button>
              )}
            </div>
            {isEditingStatus ? (
              <div className="space-y-2">
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                  className="input-field w-full px-3 py-2 text-sm">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k} style={{ background: 'var(--bg-card)' }}>{v.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={handleStatusUpdate} className="btn-primary flex-1 py-1.5 text-xs">Save</button>
                  <button onClick={() => setIsEditingStatus(false)} className="btn-ghost flex-1 py-1.5 text-xs border" style={{ borderColor: 'var(--border)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <LeadStatusBadge status={lead.status} />
            )}
          </div>
          
          {/* Notes */}
          {lead.notes && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Notes</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{lead.notes}</p>
            </div>
          )}

          {/* Activity History */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Activity History</h3>
            {!lead.activityLogs || lead.activityLogs.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No activity recorded yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
                {lead.activityLogs.map((log, index) => {
                  let icon = '📝';
                  let bg = 'rgba(156, 163, 175, 0.1)';
                  let title = log.action;
                  let description = '';

                  if (log.action === 'LEAD_CREATED') {
                    icon = '✨';
                    bg = 'rgba(34, 197, 94, 0.1)';
                    title = 'Lead Imported';
                  } else if (log.action === 'STATUS_UPDATED') {
                    icon = '🔄';
                    bg = 'rgba(249, 115, 22, 0.1)';
                    const oldStatus = log.details?.oldStatus ? STATUS_CONFIG[log.details.oldStatus as LeadStatus]?.label || log.details.oldStatus : 'Unknown';
                    const newStatus = log.details?.newStatus ? STATUS_CONFIG[log.details.newStatus as LeadStatus]?.label || log.details.newStatus : 'Unknown';
                    title = `Status Updated`;
                    description = `Changed from ${oldStatus} to ${newStatus}`;
                  } else if (log.action === 'EMAIL_SENT') {
                    icon = '✉️';
                    bg = 'rgba(59, 130, 246, 0.1)';
                    title = 'Email Sent';
                    description = log.details?.subject ? `Subject: ${log.details.subject}` : '';
                  }

                  return (
                    <div key={log.id} className="relative flex items-start justify-between gap-3">
                      {/* Timeline dot */}
                      <div className="absolute left-0 mt-1.5 ml-1 w-3 h-3 rounded-full border-2" 
                           style={{ background: 'var(--bg-card)', borderColor: 'var(--text-muted)', zIndex: 10 }}></div>
                      
                      <div className="ml-6 flex-1 p-3 rounded-lg border shadow-sm" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: bg }}>{icon}</span>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
                          <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>{formatDateTime(log.createdAt)}</span>
                        </div>
                        {description && (
                          <p className="text-xs mt-1.5 pl-8" style={{ color: 'var(--text-secondary)' }}>{description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scanner Results */}
        <div className="lg:col-span-2 space-y-4">
          {latestAudit ? (
            <>
              {/* Captured Metadata & Screenshot Widget */}
              <div className="card overflow-hidden">
                <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Scanner Results</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {latestAudit.status === 'DONE' ? `Scanned on ${formatDateTime(latestAudit.createdAt)}` : isStuck ? `Status: FAILED (Timeout)` : `Status: ${latestAudit.status}`}
                      </p>
                    </div>
                    {latestAudit.status === 'DONE' && (
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                        Success
                      </span>
                    )}
                  </div>
                </div>

                {latestAudit.status === 'DONE' ? (
                  <div className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      {/* Screenshot */}
                      <div className="border-r border-b md:border-b-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                        {latestAudit.screenshotPath ? (
                          <div className="w-full h-full min-h-[240px] flex items-center justify-center p-4">
                            <img 
                              src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}${latestAudit.screenshotPath}`} 
                              alt="Website Screenshot" 
                              className="w-full h-auto rounded-lg shadow-md border"
                              style={{ borderColor: 'var(--border)' }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[240px] flex flex-col items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
                            No screenshot available
                          </div>
                        )}
                      </div>
                      
                      {/* Metadata */}
                      <div className="p-5 space-y-4 text-sm">
                        <div>
                          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Page Title</div>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{latestAudit.pageTitle || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Meta Description</div>
                          <div className="line-clamp-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{latestAudit.metaDescription || '—'}</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>SSL Secured</div>
                            <div className="flex items-center gap-1.5" style={{ color: latestAudit.hasSsl ? '#22c55e' : '#ef4444' }}>
                              {latestAudit.hasSsl ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Mobile Responsive</div>
                            <div className="flex items-center gap-1.5" style={{ color: latestAudit.isMobileResponsive ? '#22c55e' : '#ef4444' }}>
                              {latestAudit.isMobileResponsive ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Contact Form</div>
                            <div className="flex items-center gap-1.5" style={{ color: latestAudit.hasContactForm ? '#22c55e' : 'var(--text-muted)' }}>
                              {latestAudit.hasContactForm ? 'Detected' : 'Not Found'}
                            </div>
                          </div>
                        </div>

                        {/* Tech Stack */}
                        {latestAudit.technologies && Array.isArray(latestAudit.technologies) && latestAudit.technologies.length > 0 && (
                          <div className="pt-2 border-t" style={{ borderColor: 'var(--border-muted)' }}>
                            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Detected Technologies</div>
                            <div className="flex flex-wrap gap-1.5">
                              {latestAudit.technologies.map((tech: string, i: number) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Social Links */}
                        {latestAudit.socialLinks && Object.keys(latestAudit.socialLinks).length > 0 && (
                          <div className="pt-2 border-t" style={{ borderColor: 'var(--border-muted)' }}>
                            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Social Profiles</div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {Object.entries(latestAudit.socialLinks).map(([network, url]) => (
                                <a key={network} href={url as string} target="_blank" rel="noopener noreferrer"
                                  className="capitalize hover:underline" style={{ color: '#f97316' }}>
                                  {network}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : latestAudit.status === 'FAILED' ? (
                  <div className="p-6 text-center text-sm" style={{ color: '#ef4444' }}>
                    <p>Scanner failed to complete.</p>
                    <p className="text-xs mt-1 opacity-80">{latestAudit.errorMsg}</p>
                  </div>
                ) : isStuck ? (
                  <div className="p-6 text-center text-sm" style={{ color: '#ef4444' }}>
                    <p>Scanner timed out or was interrupted.</p>
                    <p className="text-xs mt-2 opacity-80" style={{ color: 'var(--text-muted)' }}>Click the 'Rescan Website' button above to try again.</p>
                  </div>
                ) : (
                  <div className="p-10 flex flex-col items-center justify-center text-sm space-y-3" style={{ color: 'var(--text-muted)' }}>
                    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <p>Scanning website... this usually takes 10-20 seconds.</p>
                  </div>
                )}
              </div>

              {/* Lighthouse / Performance Scores */}
              {latestAudit.performanceScore !== null && (
                <div className="card p-5 mt-4">
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Lighthouse Audit</h3>
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <AuditScoreCard label="Performance" score={latestAudit.performanceScore} color="#f97316" />
                    <AuditScoreCard label="SEO" score={latestAudit.seoScore} color="#3b82f6" />
                    <AuditScoreCard label="Accessibility" score={latestAudit.accessibilityScore} color="#22c55e" />
                    <AuditScoreCard label="Best Practices" score={latestAudit.bestPracticesScore} color="#a855f7" />
                  </div>
                  <AuditRadarChart report={latestAudit} />
                </div>
              )}
              
              {/* AI Analysis Results */}
              {aiAnalysis && (
                <div className="card overflow-hidden">
                  <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'linear-gradient(to right, rgba(249,115,22,0.1), transparent)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f97316', color: 'white' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                        </svg>
                      </div>
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>AI Website Analysis</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" 
                        style={{ 
                          borderColor: aiAnalysis.redesignOpportunity === 'HIGH' ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)',
                          color: aiAnalysis.redesignOpportunity === 'HIGH' ? '#ef4444' : '#f97316',
                          background: aiAnalysis.redesignOpportunity === 'HIGH' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)'
                        }}>
                        Redesign Opportunity: {aiAnalysis.redesignOpportunity}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Weaknesses */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: '#ef4444' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Weaknesses
                      </h4>
                      <ul className="space-y-2">
                        {aiAnalysis.weaknesses.map((w, i) => (
                          <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <span className="mt-1" style={{ color: '#ef4444' }}>•</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: '#3b82f6' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {aiAnalysis.recommendations.map((r, i) => (
                          <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <span className="mt-1" style={{ color: '#3b82f6' }}>•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-5 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                      Suggested RSOrangeTech Services
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {aiAnalysis.suggestedServices.map((service, i) => (
                        <span key={i} className="text-sm font-medium px-3 py-1.5 rounded-lg border shadow-sm"
                          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Legacy Plain Text AI Summary */}
              {rawAiSummary && !aiAnalysis && (
                <div className="card overflow-hidden">
                  <div className="p-5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', background: 'linear-gradient(to right, rgba(249,115,22,0.1), transparent)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f97316', color: 'white' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                      </svg>
                    </div>
                    <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>AI Website Analysis (Legacy)</h3>
                  </div>
                  <div className="p-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {rawAiSummary}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-10 flex flex-col items-center gap-4 text-center"
              style={{ color: 'var(--text-muted)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg-muted)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No scanner data yet</p>
                <p className="text-xs mt-1">Click "Run Scanner" to automatically extract website intelligence.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
