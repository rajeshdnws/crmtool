import React from 'react';

export function LeadScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;

  let bg = 'rgba(100, 116, 139, 0.1)'; // default gray
  let text = '#64748b';
  let border = 'rgba(100, 116, 139, 0.2)';
  let label = 'COLD LEAD';
  let icon = '❄️';

  if (score >= 80) {
    bg = 'rgba(239, 68, 68, 0.1)';
    text = '#ef4444';
    border = 'rgba(239, 68, 68, 0.2)';
    label = 'HOT LEAD';
    icon = '🔥';
  } else if (score >= 60) {
    bg = 'rgba(245, 158, 11, 0.1)';
    text = '#f59e0b';
    border = 'rgba(245, 158, 11, 0.2)';
    label = 'WARM LEAD';
    icon = '☀️';
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm"
      style={{ background: bg, borderColor: border }}>
      <span className="text-xs">{icon}</span>
      <span className="text-xs font-bold tracking-wide" style={{ color: text }}>
        {label} ({score})
      </span>
    </div>
  );
}
