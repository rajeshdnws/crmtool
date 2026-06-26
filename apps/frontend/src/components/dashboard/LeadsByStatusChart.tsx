'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LeadStatus } from '@/types';
import { STATUS_CONFIG } from '@/lib/utils';

interface Props {
  data: Record<string, number>;
}

const STATUS_ORDER: LeadStatus[] = ['NEW', 'EMAIL_SENT', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'CONVERTED', 'NOT_INTERESTED'];
const COLORS: Record<LeadStatus, string> = {
  NEW:            '#3b82f6',
  EMAIL_SENT:     '#818cf8',
  CONTACTED:      '#a855f7',
  INTERESTED:     '#eab308',
  FOLLOW_UP:      '#f97316',
  CONVERTED:      '#22c55e',
  NOT_INTERESTED: '#ef4444',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg text-sm"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <div className="font-semibold">{STATUS_CONFIG[label as LeadStatus]?.label || label}</div>
      <div style={{ color: 'var(--text-muted)' }}>{payload[0].value} leads</div>
    </div>
  );
};

export default function LeadsByStatusChart({ data }: Props) {
  const chartData = STATUS_ORDER
    .filter((s) => (data[s] || 0) > 0)
    .map((status) => ({
      status,
      label: STATUS_CONFIG[status].label,
      count: data[status] || 0,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-40"
        style={{ color: 'var(--text-muted)' }}>
        No lead data to display yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} barSize={36} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={COLORS[entry.status]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
