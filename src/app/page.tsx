"use client";

import { useState, useEffect, useCallback } from "react";
import StatsCard from "@/components/layout/StatsCard";
import TicketVolumeChart from "@/components/charts/TicketVolumeChart";
import ChannelPieChart from "@/components/charts/ChannelPieChart";
import AgentPerformanceTable from "@/components/charts/AgentPerformanceTable";
import { getDashboardStats } from "@/lib/api";
import { mockDashboardStats } from "@/lib/mock-data";
import type { DashboardStats } from "@/types/gorgias";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(mockDashboardStats);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await getDashboardStats();
      if (data.totalTickets === 0) {
        setStats(mockDashboardStats);
        setUsingMockData(true);
      } else {
        setStats(data);
        setUsingMockData(false);
      }
    } catch {
      setStats(mockDashboardStats);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of your support performance</p>
      </div>

      {usingMockData && !loading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          Showing sample data. Go to <a href="/tickets" className="underline font-medium">Tickets</a> to add your real Gorgias data.
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading dashboard...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Tickets"
              value={stats.totalTickets.toLocaleString()}
            />
            <StatsCard
              title="Open Tickets"
              value={stats.openTickets}
            />
            <StatsCard
              title="Avg Response Time"
              value={stats.avgResponseTime > 0 ? `${stats.avgResponseTime} min` : "N/A"}
            />
            <StatsCard
              title="CSAT Score"
              value={stats.satisfactionScore > 0 ? `${stats.satisfactionScore}/5` : "N/A"}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <TicketVolumeChart data={stats.ticketsOverTime} />
            <ChannelPieChart data={stats.ticketsByChannel} />
          </div>

          {/* Agent Performance */}
          <AgentPerformanceTable agents={stats.agentPerformance} />
        </>
      )}
    </div>
  );
}
