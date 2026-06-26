import { ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const { body, ...rest } = options;

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...rest.headers,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  const data = await res.json();
  return data as ApiResponse<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi('/auth/login', { method: 'POST', body: { email, password } }),

  logout: () => fetchApi('/auth/logout', { method: 'POST' }),

  me: () => fetchApi('/auth/me'),

  register: (data: { email: string; name: string; password: string; role?: string }) =>
    fetchApi('/auth/register', { method: 'POST', body: data }),

  updateProfile: (data: { name?: string; password?: string }) =>
    fetchApi('/auth/profile', { method: 'PUT', body: data }),
};

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leadsApi = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/leads${query}`);
  },

  getById: (id: string) => fetchApi(`/leads/${id}`),

  create: (data: Record<string, unknown>) =>
    fetchApi('/leads', { method: 'POST', body: data }),

  bulkCreate: (data: Record<string, unknown>[]) =>
    fetchApi('/leads/bulk', { method: 'POST', body: data }),

  update: (id: string, data: Record<string, unknown>) =>
    fetchApi(`/leads/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    fetchApi(`/leads/${id}`, { method: 'DELETE' }),

  bulkDelete: (ids: string[]) =>
    fetchApi(`/leads/bulk`, { method: 'DELETE', body: { ids } }),

  sendOutreachEmail: (id: string, data: { subject: string; body: string }) =>
    fetchApi(`/leads/${id}/outreach`, { method: 'POST', body: data }),

  bulkSendOutreachEmail: (data: { ids: string[]; subject: string; body: string }) =>
    fetchApi('/leads/bulk/outreach', { method: 'POST', body: data }),

  logBulkCampaign: (data: { sent: number; failed: number; skipped: number; templateName?: string }) =>
    fetchApi('/leads/bulk/log', { method: 'POST', body: data }),
};

// ─── Audits ───────────────────────────────────────────────────────────────────
export const auditsApi = {
  triggerScan: (leadId: string) =>
    fetchApi(`/audits/scan/${leadId}`, { method: 'POST' }),
};

export const dashboardApi = {
  getStats: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/dashboard/stats${query}`);
  },
};

export const settingsApi = {
  getSettings: () => fetchApi<Record<string, string>>('/settings'),
  updateSettings: (updates: Record<string, string>) => 
    fetchApi('/settings', { method: 'PUT', body: updates }),
  triggerAutomation: () => fetchApi('/settings/automation/run', { method: 'POST' }),
};

export const usersApi = {
  getUsers: () => fetchApi('/users'),
  createUser: (data: Record<string, unknown>) => fetchApi('/users', { method: 'POST', body: data }),
  updateUser: (id: string, data: Record<string, unknown>) => fetchApi(`/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id: string) => fetchApi(`/users/${id}`, { method: 'DELETE' }),
};

export const discoveryApi = {
  runDiscovery: async (options?: { requireWebsiteAndEmail?: boolean }) => 
    await fetchApi('/discovery/run', { method: 'POST', body: options }),
  getLogs: async () => await fetchApi('/discovery/logs'),
  getStatus: async () => await fetchApi('/discovery/status'),
};

export const blacklistApi = {
  getBlacklist: () => fetchApi('/blacklist', { method: 'GET' }),
  addDomain: (domain: string) => fetchApi('/blacklist/domain', { method: 'POST', body: { domain } }),
  removeDomain: (domain: string) => fetchApi('/blacklist/domain', { method: 'DELETE', body: { domain } }),
  addBusiness: (name: string) => fetchApi('/blacklist/business', { method: 'POST', body: { name } }),
  removeBusiness: (name: string) => fetchApi('/blacklist/business', { method: 'DELETE', body: { name } }),
};

// ─── Templates ────────────────────────────────────────────────────────────────
export const templatesApi = {
  getAll: () => fetchApi('/templates'),
  getById: (id: string) => fetchApi(`/templates/${id}`),
  create: (data: Record<string, string>) => fetchApi('/templates', { method: 'POST', body: data }),
  update: (id: string, data: Record<string, string>) => fetchApi(`/templates/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => fetchApi(`/templates/${id}`, { method: 'DELETE' }),
};
