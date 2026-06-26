'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, CheckCircle, Flame, Copy, ShieldBan, Percent } from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { DashboardStats, LeadStatus } from '@/types';
import { formatDate, getScoreBg, truncateUrl, STATUS_CONFIG } from '@/lib/utils';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import { LeadScoreBadge } from '@/components/leads/LeadScoreBadge';

function MetricCard({ title, value, icon, color, bg }: { title: string, value: number | string, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <div className="card p-5 relative overflow-hidden group">
      <div className="absolute right-0 top-0 w-32 h-32 rounded-bl-full opacity-10 transition-transform group-hover:scale-110" style={{ background: color }}></div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{title}</p>
          <h3 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</h3>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: bg, color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [industry, setIndustry] = useState('');
  const [status, setStatus] = useState('');
  const [dateRange, setDateRange] = useState('all');

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    const params: Record<string, string> = {};
    if (industry) params.industry = industry;
    if (status) params.status = status;
    if (dateRange) params.dateRange = dateRange;

    const res = await dashboardApi.getStats(params);
    if (res.success && res.data) {
      setStats(res.data as DashboardStats);
    }
    setIsLoading(false);
  }, [industry, status, dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>CRM Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Overview of your lead pipeline and automated scans.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white/5 p-2 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="input-field text-xs py-1.5 px-3 min-w-[120px]">
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field text-xs py-1.5 px-3 min-w-[140px]">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-28 animate-pulse" style={{ background: 'var(--bg-muted)' }}></div>
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <MetricCard 
              title="Total Leads" value={stats.totalLeads} 
              color="#3b82f6" bg="rgba(59, 130, 246, 0.1)"
              icon={<Search size={20} />} 
            />
            <MetricCard 
              title="New Leads" value={stats.newLeadsCount} 
              color="#8b5cf6" bg="rgba(139, 92, 246, 0.1)"
              icon={<Search size={20} />} 
            />
            <MetricCard 
              title="Interested Leads" value={stats.interestedLeadsCount} 
              color="#f59e0b" bg="rgba(245, 158, 11, 0.1)"
              icon={<Flame size={20} />} 
            />
            <MetricCard 
              title="Converted Leads" value={stats.convertedLeadsCount} 
              color="#10b981" bg="rgba(16, 185, 129, 0.1)"
              icon={<CheckCircle size={20} />} 
            />
            <MetricCard 
              title="Emails Sent" value={stats.emailsSentCount} 
              color="#0ea5e9" bg="rgba(14, 165, 233, 0.1)"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>} 
            />
            <MetricCard 
              title="Failed Emails" value={stats.failedEmailsCount} 
              color="#ef4444" bg="rgba(239, 68, 68, 0.1)"
              icon={<ShieldBan size={20} />} 
            />
          </div>

          {/* Discovery Analytics */}
          {stats.discoveryStats && (
            <div className="mt-8">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Discovery Engine Analytics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricCard 
                  title="Found" value={stats.discoveryStats.businessesFound} 
                  color="#8b5cf6" bg="rgba(139, 92, 246, 0.1)" icon={<Search size={20} />} 
                />
                <MetricCard 
                  title="Qualified" value={stats.discoveryStats.qualifiedLeads} 
                  color="#10b981" bg="rgba(16, 185, 129, 0.1)" icon={<CheckCircle size={20} />} 
                />
                <MetricCard 
                  title="Hot Leads" value={stats.discoveryStats.hotLeads} 
                  color="#ef4444" bg="rgba(239, 68, 68, 0.1)" icon={<Flame size={20} />} 
                />
                <MetricCard 
                  title="Duplicates" value={stats.discoveryStats.duplicatesRemoved} 
                  color="#f59e0b" bg="rgba(245, 158, 11, 0.1)" icon={<Copy size={20} />} 
                />
                <MetricCard 
                  title="Blacklisted" value={stats.discoveryStats.blacklistedBusinesses} 
                  color="#64748b" bg="rgba(100, 116, 139, 0.1)" icon={<ShieldBan size={20} />} 
                />
                <MetricCard 
                  title="Conv. Rate" 
                  value={`${stats.discoveryStats.businessesFound ? Math.round((stats.discoveryStats.qualifiedLeads / stats.discoveryStats.businessesFound) * 100) : 0}%`} 
                  color="#3b82f6" bg="rgba(59, 130, 246, 0.1)" icon={<Percent size={20} />} 
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            {/* Recent Leads Table */}
            <div className="card overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Leads</h3>
                <Link href="/leads" className="text-xs hover:underline" style={{ color: '#f97316' }}>View All →</Link>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-opacity-90 backdrop-blur-sm z-10" style={{ background: 'var(--bg-card)' }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted border-b" style={{ borderColor: 'var(--border-muted)' }}>Lead</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted border-b" style={{ borderColor: 'var(--border-muted)' }}>Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium uppercase text-muted border-b" style={{ borderColor: 'var(--border-muted)' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentLeads.length > 0 ? stats.recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            <Link href={`/leads/${lead.id}`} className="group-hover:text-orange-400 transition-colors">{lead.businessName}</Link>
                          </div>
                          <div className="text-xs text-muted mt-0.5">{lead.website ? truncateUrl(lead.website) : 'No Website'}</div>
                        </td>
                        <td className="px-4 py-3"><LeadStatusBadge status={lead.status as LeadStatus} size="sm" /></td>
                        <td className="px-4 py-3 text-right"><LeadScoreBadge score={lead.leadScore} /></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-4 py-10 text-center text-muted text-xs">No leads found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit History / Recent Scans Table */}
            <div className="card overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Scans</h3>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-opacity-90 backdrop-blur-sm z-10" style={{ background: 'var(--bg-card)' }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted border-b" style={{ borderColor: 'var(--border-muted)' }}>Target</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase text-muted border-b" style={{ borderColor: 'var(--border-muted)' }}>Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium uppercase text-muted border-b" style={{ borderColor: 'var(--border-muted)' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentScans && stats.recentScans.length > 0 ? stats.recentScans.map((audit: any) => (
                      <tr key={audit.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-primary">
                            <Link href={`/leads/${audit.leadId}`} className="hover:text-orange-400 transition-colors">{audit.lead?.businessName}</Link>
                          </div>
                          <div className="text-xs text-muted mt-0.5">{truncateUrl(audit.targetUrl)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-md font-medium border ${
                            audit.status === 'DONE' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            audit.status === 'FAILED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse'
                          }`}>
                            {audit.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted">
                          {formatDate(audit.createdAt)}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-4 py-10 text-center text-muted text-xs">No recent scans.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
