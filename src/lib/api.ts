import type { Ticket, DashboardStats } from "@/types/gorgias";

// ─── localStorage Storage ──────────────────────────────

const STORAGE_KEY = "gorgias_tickets";

function getStoredTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTickets(tickets: Ticket[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

let nextId = 0;

function getNextId(): number {
  const tickets = getStoredTickets();
  const maxId = tickets.reduce((max, t) => Math.max(max, t.id), 0);
  nextId = Math.max(nextId, maxId) + 1;
  return nextId;
}

// ─── Tickets ────────────────────────────────────────────

export async function getTickets(): Promise<Ticket[]> {
  const tickets = getStoredTickets();
  return tickets.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function addTicket(ticket: Omit<Ticket, "id">): Promise<Ticket> {
  const tickets = getStoredTickets();
  const newTicket: Ticket = { ...ticket, id: getNextId() };
  tickets.push(newTicket);
  saveTickets(tickets);
  return newTicket;
}

export async function addTicketsBatch(newTickets: Omit<Ticket, "id">[]): Promise<Ticket[]> {
  const tickets = getStoredTickets();
  const created: Ticket[] = newTickets.map((t) => ({
    ...t,
    id: getNextId(),
  }));
  tickets.push(...created);
  saveTickets(tickets);
  return created;
}

export async function deleteTicket(id: number) {
  const tickets = getStoredTickets();
  const filtered = tickets.filter((t) => t.id !== id);
  saveTickets(filtered);
}

// ─── Dashboard Stats ────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const all = getStoredTickets();

  const totalTickets = all.length;
  const openTickets = all.filter((t) => t.status === "open").length;

  const withResponseTime = all.filter((t) => t.response_time_minutes != null);
  const avgResponseTime =
    withResponseTime.length > 0
      ? Math.round(
          withResponseTime.reduce((sum, t) => sum + t.response_time_minutes!, 0) /
            withResponseTime.length
        )
      : 0;

  const withResolutionTime = all.filter((t) => t.resolution_time_minutes != null);
  const avgResolutionTime =
    withResolutionTime.length > 0
      ? Math.round(
          withResolutionTime.reduce((sum, t) => sum + t.resolution_time_minutes!, 0) /
            withResolutionTime.length
        )
      : 0;

  const withSatisfaction = all.filter((t) => t.satisfaction_score != null);
  const satisfactionScore =
    withSatisfaction.length > 0
      ? parseFloat(
          (
            withSatisfaction.reduce((sum, t) => sum + Number(t.satisfaction_score!), 0) /
            withSatisfaction.length
          ).toFixed(1)
        )
      : 0;

  // Tickets by channel
  const channelMap = new Map<string, number>();
  all.forEach((t) => {
    channelMap.set(t.channel, (channelMap.get(t.channel) || 0) + 1);
  });
  const ticketsByChannel = Array.from(channelMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // Tickets by status
  const statusMap = new Map<string, number>();
  all.forEach((t) => {
    statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1);
  });
  const ticketsByStatus = Array.from(statusMap.entries()).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Tickets over time (last 14 days)
  const dateMap = new Map<string, number>();
  all.forEach((t) => {
    const date = new Date(t.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  });
  const ticketsOverTime = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const dateA = new Date(a.date + " 2026");
      const dateB = new Date(b.date + " 2026");
      return dateA.getTime() - dateB.getTime();
    });

  // Agent performance
  const agentMap = new Map<
    string,
    { tickets: number; totalResponse: number; responseCount: number; totalSat: number; satCount: number }
  >();
  all.forEach((t) => {
    if (!t.assignee_name) return;
    const agent = agentMap.get(t.assignee_name) || {
      tickets: 0,
      totalResponse: 0,
      responseCount: 0,
      totalSat: 0,
      satCount: 0,
    };
    agent.tickets++;
    if (t.response_time_minutes != null) {
      agent.totalResponse += t.response_time_minutes;
      agent.responseCount++;
    }
    if (t.satisfaction_score != null) {
      agent.totalSat += Number(t.satisfaction_score);
      agent.satCount++;
    }
    agentMap.set(t.assignee_name, agent);
  });
  const agentPerformance = Array.from(agentMap.entries())
    .map(([name, stats]) => ({
      name,
      ticketsHandled: stats.tickets,
      avgResponseTime:
        stats.responseCount > 0
          ? Math.round(stats.totalResponse / stats.responseCount)
          : 0,
      satisfactionScore:
        stats.satCount > 0
          ? parseFloat((stats.totalSat / stats.satCount).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.ticketsHandled - a.ticketsHandled);

  return {
    totalTickets,
    openTickets,
    avgResponseTime,
    avgResolutionTime,
    satisfactionScore,
    ticketsByChannel,
    ticketsByStatus,
    ticketsOverTime,
    agentPerformance,
  };
}
