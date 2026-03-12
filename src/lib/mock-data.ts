import { DashboardStats } from "@/types/gorgias";

export const mockDashboardStats: DashboardStats = {
  totalTickets: 1247,
  openTickets: 89,
  avgResponseTime: 24,
  avgResolutionTime: 180,
  satisfactionScore: 4.2,

  ticketsByChannel: [
    { name: "Email", value: 520 },
    { name: "Chat", value: 380 },
    { name: "Social Media", value: 190 },
    { name: "Phone", value: 97 },
    { name: "SMS", value: 60 },
  ],

  ticketsByStatus: [
    { name: "Open", value: 89 },
    { name: "Pending", value: 43 },
    { name: "Closed", value: 1115 },
  ],

  ticketsOverTime: [
    { date: "Mar 1", count: 42 },
    { date: "Mar 2", count: 38 },
    { date: "Mar 3", count: 55 },
    { date: "Mar 4", count: 47 },
    { date: "Mar 5", count: 62 },
    { date: "Mar 6", count: 35 },
    { date: "Mar 7", count: 28 },
    { date: "Mar 8", count: 51 },
    { date: "Mar 9", count: 44 },
    { date: "Mar 10", count: 58 },
    { date: "Mar 11", count: 49 },
    { date: "Mar 12", count: 53 },
    { date: "Mar 13", count: 41 },
    { date: "Mar 14", count: 36 },
  ],

  agentPerformance: [
    { name: "Sarah M.", ticketsHandled: 312, avgResponseTime: 18, satisfactionScore: 4.5 },
    { name: "James K.", ticketsHandled: 287, avgResponseTime: 22, satisfactionScore: 4.3 },
    { name: "Maria L.", ticketsHandled: 265, avgResponseTime: 20, satisfactionScore: 4.6 },
    { name: "David R.", ticketsHandled: 198, avgResponseTime: 30, satisfactionScore: 3.9 },
    { name: "Emily W.", ticketsHandled: 185, avgResponseTime: 26, satisfactionScore: 4.1 },
  ],
};
