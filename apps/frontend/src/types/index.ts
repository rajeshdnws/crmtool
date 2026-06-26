// ─── Enums ────────────────────────────────────────────────────────────────────
export type Role = 'ADMIN' | 'SALES' | 'SUPPORT';
export type LeadStatus = 'NEW' | 'EMAIL_SENT' | 'CONTACTED' | 'INTERESTED' | 'FOLLOW_UP' | 'CONVERTED' | 'NOT_INTERESTED';
export type CrawlStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
export type AuditIssueType = 'PERFORMANCE' | 'SEO' | 'ACCESSIBILITY' | 'BEST_PRACTICES';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  userId?: string | null;
  leadId?: string | null;
  action: string;
  details?: any;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Lead & Audits ────────────────────────────────────────────────────────────

export interface AiAnalysisResult {
  weaknesses: string[];
  recommendations: string[];
  redesignOpportunity: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedServices: string[];
}

export interface AuditIssue {
  id: string;
  websiteAuditId: string;
  type: AuditIssueType;
  title: string;
  description: string | null;
  scoreImpact: number | null;
  createdAt: string;
}

export interface WebsiteAudit {
  id: string;
  leadId: string;
  targetUrl: string;
  status: CrawlStatus;
  pageTitle: string | null;
  metaDescription: string | null;
  hasSsl: boolean | null;
  isMobileResponsive: boolean | null;
  hasContactForm: boolean | null;
  technologies: any | null;
  socialLinks: Record<string, string> | null;
  screenshotPath: string | null;
  performanceScore: number | null;
  seoScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  aiSummary: string | null;
  rawJson?: any;
  errorMsg?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  issues?: AuditIssue[];
}

export interface Report {
  id: string;
  leadId: string;
  websiteAuditId: string | null;
  reportUrl: string | null;
  generatedAt: string;
}

export interface LeadAuditCount {
  websiteAudits: number;
}

export interface Lead {
  id: string;
  businessName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  industry: string | null;
  notes: string | null;
  status: LeadStatus;
  leadScore: number | null;
  isDeleted: boolean;
  emailSent?: boolean;
  
  // Google Discovery Fields
  placeId?: string | null;
  rating?: number | null;
  reviews?: number | null;
  source: string;
  contactScore?: number | null;
  whatsappLink?: string | null;
  whatsappNumber?: string | null;
  socialLinks?: Record<string, string> | null;
  emailFound?: boolean | null;

  // AI Quality Audit & Chatbot Fields
  opportunityScore?: number | null;
  websiteScore?: number | null;
  seoScore?: number | null;
  mobileScore?: number | null;
  speedScore?: number | null;
  designScore?: number | null;
  conversionScore?: number | null;
  technology?: string | null;
  chatbotDetected?: boolean | null;
  chatbotType?: string | null;
  opportunityLevel?: string | null;

  createdAt: string;
  updatedAt: string;
  websiteAudits?: WebsiteAudit[];
  reports?: Report[];
  activityLogs?: ActivityLog[];
  _count?: LeadAuditCount;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalLeads: number;
  newLeadsCount: number;
  interestedLeadsCount: number;
  convertedLeadsCount: number;
  emailsSentCount: number;
  failedEmailsCount: number;
  totalAudits: number;
  avgScore: number;
  leadsByStatus: Record<string, number>;
  hotLeadsCount: number;
  warmLeadsCount: number;
  coldLeadsCount: number;
  recentLeads: Lead[];
  topScoredLeads: Lead[];
  recentScans: WebsiteAudit[];
  discoveryStats?: {
    businessesFound: number;
    businessesRejected: number;
    duplicatesRemoved: number;
    blacklistedBusinesses: number;
    qualifiedLeads: number;
    hotLeads: number;
  };
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
