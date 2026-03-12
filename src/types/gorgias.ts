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
