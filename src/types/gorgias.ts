// ─── Gorgias CSV Ticket (matches actual export format) ────────

export interface GorgiasTicket {
  id: number;
  ticketUrl: string;
  emailBody: string;
  aiIntent: string;
  contactReason: string;
  product: string;
  resolution: string;
  managedSentiment: string;
  aiAgentSalesDiscount: string;
  subject: string;
  status: string;
  priority: string;
  channel: string;
  createdAt: string;
  closedAt: string | null;
  assigneeName: string | null;
  customerEmail: string;
  responseTimeMinutes: number | null;
  resolutionTimeMinutes: number | null;
  satisfactionScore: number | null;
  tags: string[];
  messagesCount: number;
  intentCategory: string;
  intentSubCategory: string;
  intentDetail: string;
  contactCategory: string;
  contactDetail: string;
}

// ─── Analytics Types ────────────────────────────────────

export interface IntentBreakdown {
  category: string;
  count: number;
  percentage: number;
  subCategories: { name: string; count: number }[];
}

export interface ContactReasonBreakdown {
  reason: string;
  count: number;
  percentage: number;
  details: { name: string; count: number }[];
}

export interface ProductInsight {
  product: string;
  totalTickets: number;
  topIssues: { issue: string; count: number }[];
  sentiment: { positive: number; negative: number; neutral: number };
}

export interface AgentQuality {
  name: string;
  ticketsClosed: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  oneTouchRate: number;
  intentBreakdown: { intent: string; count: number }[];
  sentimentBreakdown: { sentiment: string; count: number }[];
  topContactReasons: { reason: string; count: number }[];
}

export interface EmailInsight {
  commonKeywords: { word: string; count: number }[];
  topCustomerRequests: { request: string; count: number; examples: string[] }[];
  productMentions: { product: string; count: number }[];
  sentimentDistribution: { sentiment: string; count: number; percentage: number }[];
}

export interface ActionableRecommendation {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: string;
}

export interface EnhancedAnalytics {
  totalTickets: number;
  closedTickets: number;
  openTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  oneTouchRate: number;
  zeroTouchTickets: number;
  messagesPerTicket: number;
  ticketsOverTime: { date: string; created: number; closed: number }[];
  channelBreakdown: { channel: string; count: number; percentage: number; avgResponseTime: number }[];
  intentBreakdown: IntentBreakdown[];
  contactReasonBreakdown: ContactReasonBreakdown[];
  productInsights: ProductInsight[];
  agentQuality: AgentQuality[];
  emailInsights: EmailInsight;
  recommendations: ActionableRecommendation[];
  sentimentOverTime: { date: string; positive: number; negative: number; neutral: number }[];
  tagBreakdown: { tag: string; count: number; percentage: number }[];
  resolutionBreakdown: { resolution: string; count: number; percentage: number }[];
}

// ─── Legacy types ─────────────────────────────────────────

export interface Ticket {
  id: number;
  subject: string;
  status: "open" | "closed" | "pending";
  priority: "low" | "normal" | "high" | "urgent";
  channel: string;
  created_at: string;
  closed_at: string | null;
  assignee_name: string | null;
  customer_email: string;
  response_time_minutes: number | null;
  resolution_time_minutes: number | null;
  satisfaction_score: number | null;
  tags: string[];
  messages_count: number;
  // Gorgias-specific metadata
  customer_name: string | null;
  contact_reason: string | null;
  ai_intent: string | null;
  product_category: string | null;
  ticket_url: string | null;
}

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  ticketsByChannel: { name: string; value: number }[];
  ticketsByStatus: { name: string; value: number }[];
  ticketsOverTime: { date: string; count: number }[];
  agentPerformance: {
    name: string;
    ticketsHandled: number;
    avgResponseTime: number;
    satisfactionScore: number;
  }[];
}
