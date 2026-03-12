"use client";

import StatsCard from "@/components/layout/StatsCard";
import TicketVolumeChart from "@/components/charts/TicketVolumeChart";
import ChannelPieChart from "@/components/charts/ChannelPieChart";
import AgentPerformanceTable from "@/components/charts/AgentPerformanceTable";
import { mockDashboardStats } from "@/lib/mock-data";

export default function Dashboard() {
  const stats = mockDashboardStats;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of your support performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Tickets"
          value={stats.totalTickets.toLocaleString()}
          subtitle="+12% from last month"
          trend="up"
        />
        <StatsCard
          title="Open Tickets"
          value={stats.openTickets}
          subtitle="5 urgent"
          trend="neutral"
        />
        <StatsCard
          title="Avg Response Time"
          value={`${stats.avgResponseTime} min`}
          subtitle="-8% from last month"
          trend="up"
        />
        <StatsCard
          title="CSAT Score"
          value={`${stats.satisfactionScore}/5`}
          subtitle="+0.3 from last month"
          trend="up"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TicketVolumeChart data={stats.ticketsOverTime} />
        <ChannelPieChart data={stats.ticketsByChannel} />
      </div>

      {/* Agent Performance */}
      <AgentPerformanceTable agents={stats.agentPerformance} />
    </div>
  );
}
