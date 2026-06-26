import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LeadStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function getScoreColor(score: number | null): string {
  if (score === null) return 'text-[var(--text-muted)]';
  if (score >= 80) return 'score-high';
  if (score >= 50) return 'score-medium';
  return 'score-low';
}

export function getScoreBg(score: number | null): string {
  if (score === null) return 'bg-[var(--bg-muted)]';
  if (score >= 80) return 'bg-green-500/10 text-green-400';
  if (score >= 50) return 'bg-orange-500/10 text-orange-400';
  return 'bg-red-500/10 text-red-400';
}

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  NEW:            { label: 'New',            color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  EMAIL_SENT:     { label: 'Email Sent',     color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  CONTACTED:      { label: 'Contacted',      color: 'text-purple-400', bg: 'bg-purple-500/10' },
  INTERESTED:     { label: 'Interested',     color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  FOLLOW_UP:      { label: 'Follow Up',      color: 'text-orange-400', bg: 'bg-orange-500/10' },
  CONVERTED:      { label: 'Converted',      color: 'text-green-400',  bg: 'bg-green-500/10' },
  NOT_INTERESTED: { label: 'Not Interested', color: 'text-red-400',    bg: 'bg-red-500/10' },
};

export function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
