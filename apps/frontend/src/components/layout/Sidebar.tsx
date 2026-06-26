'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Lead List',
    href: '/leads',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Import Leads',
    href: '/leads/import',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    roles: ['ADMIN', 'SALES'],
  },
  {
    label: 'Email Templates',
    href: '/templates',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    roles: ['ADMIN', 'SALES'],
  },
  {
    label: 'Email Campaigns',
    href: '/leads?action=campaigns',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    ),
    roles: ['ADMIN', 'SALES'],
  },
  {
    label: 'Discovery',
    href: '/discovery',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
    roles: ['ADMIN'],
  },
  {
    label: 'Blacklist',
    href: '/blacklist',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    roles: ['ADMIN'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    roles: ['ADMIN'],
  },
  {
    label: 'Users',
    href: '/users',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
    roles: ['ADMIN'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className="flex flex-col h-full w-64 shrink-0"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea6d0e)', boxShadow: 'var(--glow-sm)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            RSOrangle<span className="gradient-text">Tech</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Lead Intel Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-xs font-semibold uppercase tracking-wider px-3 mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Main Menu
        </div>
        {NAV_ITEMS.filter(item => !item.roles || (user && item.roles.includes(user.role))).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative"
            style={
              isActive(item.href)
                ? {
                    background: 'rgba(249,115,22,0.12)',
                    color: '#f97316',
                    border: '1px solid rgba(249,115,22,0.2)',
                  }
                : {
                    color: 'var(--text-secondary)',
                    border: '1px solid transparent',
                  }
            }
            onMouseEnter={(e) => {
              if (!isActive(item.href)) {
                e.currentTarget.style.background = 'var(--bg-muted)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.href)) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}>
            {/* Active indicator */}
            {isActive(item.href) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                style={{ background: '#f97316' }} />
            )}
            <span style={{ color: isActive(item.href) ? '#f97316' : 'inherit' }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: 'var(--bg-muted)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea6d0e)', color: 'white' }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.name || 'User'}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {user?.role || 'ANALYST'}
            </div>
          </div>
          <Link
            href="/profile"
            title="Edit Profile"
            className="p-1.5 rounded-lg transition-colors shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(249,115,22,0.1)';
              e.currentTarget.style.color = '#f97316';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </Link>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg transition-colors shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
