"use client";

import { useState, useEffect, useCallback } from "react";
import AgentPerformanceTable from "@/components/charts/AgentPerformanceTable";
import { getDashboardStats } from "@/lib/api";
import { mockDashboardStats } from "@/lib/mock-data";

export default function AgentsPage() {
  const [agents, setAgents] = useState(mockDashboardStats.agentPerformance);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    try {
      const stats = await getDashboardStats();
      if (stats.agentPerformance.length > 0) {
        setAgents(stats.agentPerformance);
      }
    } catch {
      // keep mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Agents</h2>
        <p className="text-gray-500 mt-1">Team performance overview</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading agent data...</div>
      ) : (
        <AgentPerformanceTable agents={agents} />
      )}
    </div>
  );
}
