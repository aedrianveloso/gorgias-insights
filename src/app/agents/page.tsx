"use client";

import AgentPerformanceTable from "@/components/charts/AgentPerformanceTable";
import { mockDashboardStats } from "@/lib/mock-data";

export default function AgentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Agents</h2>
        <p className="text-gray-500 mt-1">Team performance overview</p>
      </div>

      <AgentPerformanceTable agents={mockDashboardStats.agentPerformance} />
    </div>
  );
}
