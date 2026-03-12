// Gorgias CSV export ticket
export interface GorgiasTicket {
  id: number;
  ticketUrl: string;
  subject: string;
  status: string;
  channel: string;
  createdAt: string;
  closedAt: string;
  assigneeName: string;
  customerEmail: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  satisfactionScore: number;
  tags: string[];
  messagesCount: number;
  // AI fields from Gorgias
  aiIntent: string;
  intentCategory: string;
  intentSubCategory: string;
  intentDetail: string;
  contactReason: string;
  contactCategory: string;
  contactDetail: string;
  product: string;
  resolution: string;
  managedSentiment: string;
  // Email body (user-added column)
  emailBody: string;
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

export interface IntentBreakdown {
  category: string;
  count: number;
  percentage: number;
  ticketIds: number[];
  subCategories: { name: string; count: number; ticketIds: number[] }[];
}

export interface ContactReasonBreakdown {
  reason: string;
  count: number;
  percentage: number;
  ticketIds: number[];
  details: { name: string; count: number; ticketIds: number[] }[];
}

export interface ProductInsight {
  product: string;
  totalTickets: number;
  ticketIds: number[];
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
  topCustomerRequests: { request: string; count: number; examples: string[]; ticketIds: number[] }[];
  productMentions: { product: string; count: number; ticketIds: number[] }[];
  sentimentDistribution: { sentiment: string; count: number; percentage: number; ticketIds: number[] }[];
}

export interface ActionableRecommendation {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: string;
}

// Keep old types for backward compat with existing components
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
