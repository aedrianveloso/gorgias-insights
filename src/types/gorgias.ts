// Gorgias CSV export ticket
export interface GorgiasTicket {
  id: number;
  ticketUrl: string;
  subject: string;
  status: string;
  channel: string;
  priority: string;
  createdAt: string;
  closedAt: string;
  assigneeName: string;
  assigneeEmail: string;
  customerEmail: string;
  customerName: string;
  customerType: string;
  customerLastShopifyOrder: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  satisfactionScore: number;
  surveyComment: string;
  surveyPresent: boolean;
  tags: string[];
  messagesCount: number;
  agentMessagesCount: number;
  customerMessagesCount: number;
  respondingAgents: string;
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
  // New AI Agent fields
  aiAgentSalesDiscount: string;
  aiAgentSalesOpportunity: string;
  aiAgentOutcome: string;
  // Customer messages (replaces manual Email Body)
  customerMessages: string;
  // Legacy alias
  emailBody: string;
  createdByAgent: boolean;
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
  ticketsWithCustomerMessages: number;
  ticketsOverTime: { date: string; created: number; closed: number }[];
  channelBreakdown: { channel: string; count: number; percentage: number; avgResponseTime: number }[];
  intentBreakdown: IntentBreakdown[];
  contactReasonBreakdown: ContactReasonBreakdown[];
  productInsights: ProductInsight[];
  emailInsights: EmailInsight;
  customerVoice: CustomerVoiceInsights;
  recommendations: ActionableRecommendation[];
  sentimentOverTime: { date: string; positive: number; negative: number; neutral: number }[];
  tagBreakdown: { tag: string; count: number; percentage: number }[];
  agentQuality: AgentQuality[];
  resolutionBreakdown: { resolution: string; count: number; percentage: number }[];
  monthlyBreakdown: MonthlyBreakdown[];
  exchangeAnalysis: ExchangeAnalysis;
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
  qualityMentions: number;
  exchangeCount: number;
  returnCount: number;
}

export interface EmailInsight {
  commonKeywords: { word: string; count: number }[];
  topCustomerRequests: { request: string; count: number; examples: string[]; ticketIds: number[] }[];
  productMentions: { product: string; count: number; ticketIds: number[] }[];
  sentimentDistribution: { sentiment: string; count: number; percentage: number; ticketIds: number[] }[];
}

export interface CustomerVoiceInsights {
  // Why customers reach out the first time
  firstContactDrivers: { reason: string; count: number; percentage: number; ticketIds: number[] }[];
  // Common themes/patterns from customer messages
  commonThemes: { theme: string; description: string; count: number; ticketIds: number[]; examples: string[] }[];
  // What's working well (positive feedback patterns)
  whatWorksWell: { pattern: string; count: number; ticketIds: number[]; examples: string[] }[];
  // Improvement opportunities (from negative/complaint patterns)
  improvementOpportunities: { area: string; description: string; count: number; ticketIds: number[]; severity: "high" | "medium" | "low" }[];
  // Survey feedback analysis
  surveyInsights: { avgScore: number; totalResponses: number; positiveComments: string[]; negativeComments: string[]; themes: { theme: string; count: number }[] };
  // Customer type breakdown
  customerTypeBreakdown: { type: string; count: number; percentage: number; ticketIds: number[] }[];
}

export interface ExchangeAnalysis {
  totalExchanges: number;
  totalReturns: number;
  exchangesByProduct: { product: string; count: number; ticketIds: number[] }[];
  returnsByProduct: { product: string; count: number; ticketIds: number[] }[];
  exchangeReasons: { reason: string; count: number; ticketIds: number[]; examples: string[] }[];
  returnReasons: { reason: string; count: number; ticketIds: number[]; examples: string[] }[];
}

export interface MonthlyBreakdown {
  month: string; // "2026-01", "2026-02", etc.
  label: string; // "Jan 2026"
  totalTickets: number;
  closedTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  topContactReasons: { reason: string; count: number }[];
  topIntents: { intent: string; count: number }[];
  sentiment: { positive: number; negative: number; neutral: number };
}

export interface AgentQuality {
  name: string;
  ticketsHandled: number;
  ticketsClosed: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  oneTouchRate: number;
  intentBreakdown: { intent: string; count: number }[];
  sentimentBreakdown: { sentiment: string; count: number }[];
  topContactReasons: { reason: string; count: number }[];
}

export interface ActionableRecommendation {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: string;
}

// Dashboard stats for Supabase-based flow
export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  ticketsByChannel: { name: string; value: number }[];
  ticketsByStatus: { name: string; value: number }[];
  ticketsOverTime: { date: string; count: number }[];
  agentPerformance: { name: string; ticketsHandled: number; avgResponseTime: number; satisfactionScore: number }[];
}

// Supabase database row type (snake_case)
export interface Ticket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  channel: string;
  assignee_name?: string;
  customer_email?: string;
  created_at: string;
  closed_at?: string;
  satisfaction_score?: number;
  tags?: string[];
  response_time_minutes?: number;
  resolution_time_minutes?: number;
}
