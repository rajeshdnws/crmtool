'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: number; label: string };
  accentColor?: string;
}

export default function StatCard({ title, value, subtitle, icon, trend, accentColor = '#f97316' }: StatCardProps) {
  const isPositive = (trend?.value ?? 0) >= 0;

  return (
    <div className="card p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {title}
          </p>
          <div className="mt-2 text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {value}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}18`, color: accentColor }}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs font-medium"
            style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isPositive
                ? <path d="M18 15l-6-6-6 6" />
                : <path d="M6 9l6 6 6-6" />}
            </svg>
            {Math.abs(trend.value)}%
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {trend.label}
          </span>
        </div>
      )}

      {/* Bottom accent line */}
      <div className="h-0.5 rounded-full mt-auto"
        style={{ background: `linear-gradient(90deg, ${accentColor}40, transparent)` }} />
    </div>
  );
}
