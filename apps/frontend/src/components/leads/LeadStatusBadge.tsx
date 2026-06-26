'use client';

import { LeadStatus } from '@/types';
import { STATUS_CONFIG } from '@/lib/utils';

interface Props {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export default function LeadStatusBadge({ status, size = 'md' }: Props) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
      } ${cfg.color} ${cfg.bg}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {cfg.label}
    </span>
  );
}
