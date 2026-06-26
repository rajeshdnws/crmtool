'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview & key metrics' },
  '/leads': { title: 'Leads', subtitle: 'Manage and track all leads' },
  '/audits': { title: 'Audits', subtitle: 'Website audit reports' },
  '/automation': { title: 'Automation', subtitle: 'Crawl jobs & scheduling' },
  '/settings': { title: 'Settings', subtitle: 'Platform configuration' },
  '/blacklist': { title: 'Blacklist', subtitle: 'Global blocklist for domains and business names' },
};

function getBreadcrumb(pathname: string) {
  // Handle /leads/[id]
  if (pathname.startsWith('/leads/') && pathname !== '/leads') {
    return { title: 'Lead Detail', subtitle: 'View and manage lead' };
  }
  return PAGE_TITLES[pathname] || { title: 'RSOrangeTech', subtitle: 'Lead Intelligence Platform' };
}

export default function TopBar() {
  const pathname = usePathname();
  const { title, subtitle } = getBreadcrumb(pathname);

  return (
    <header className="flex items-center justify-between px-6 py-4 shrink-0"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        minHeight: '65px',
      }}>
      <div>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>

        {/* Notification bell */}
        <button className="p-2 rounded-lg transition-colors btn-ghost relative"
          title="Notifications"
          id="topbar-notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            style={{ color: 'var(--text-secondary)' }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* Current date */}
        <div className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
          {new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}
        </div>
      </div>
    </header>
  );
}
