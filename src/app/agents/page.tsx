"use client";

import { useState } from "react";
import { useTickets } from "@/lib/ticket-store";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import type { AgentQuality } from "@/types/gorgias";

function formatMinutes(min: number): string {
  if (min <= 0) return "N/A";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function AgentsPage() {
  const { analytics, tickets } = useTickets();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  if (!analytics || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No data yet</h2>
        <p className="text-gray-500 mb-6">Upload your Gorgias CSV to see agent analytics.</p>
        <Link href="/upload" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">Upload CSV Data</Link>
      </div>
    );
  }

  const agents = analytics.agentQuality;
  const selected = selectedAgent ? agents.find((a) => a.name === selectedAgent) : null;

  // Compute radar data for selected agent
  const radarData = selected ? computeRadar(selected, agents) : [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Agent Performance</h2>
        <p className="text-gray-500 mt-1">Quality scoring beyond speed metrics — click an agent for details</p>
      </div>

      {/* Agent Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-xs font-medium text-gray-500">Agent</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Tickets Closed</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Avg Response</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Avg Resolution</th>
                <th className="pb-3 text-xs font-medium text-gray-500">CSAT</th>
                <th className="pb-3 text-xs font-medium text-gray-500">One-Touch %</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Top Contact Reason</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.name}
                  className={`border-b border-gray-50 cursor-pointer transition-colors ${
                    selectedAgent === agent.name ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedAgent(selectedAgent === agent.name ? null : agent.name)}
                >
                  <td className="py-3 font-medium text-gray-900">{agent.name}</td>
                  <td className="py-3 text-gray-600">{agent.ticketsClosed}</td>
                  <td className="py-3 text-gray-600">{formatMinutes(agent.avgResponseTime)}</td>
                  <td className="py-3 text-gray-600">{formatMinutes(agent.avgResolutionTime)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      agent.satisfactionScore >= 4.5 ? "bg-green-100 text-green-700"
                        : agent.satisfactionScore >= 4.0 ? "bg-blue-100 text-blue-700"
                        : agent.satisfactionScore > 0 ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {agent.satisfactionScore > 0 ? agent.satisfactionScore.toFixed(1) : "N/A"}
                    </span>
                  </td>
                  <td className="py-3 text-gray-600">{agent.oneTouchRate}%</td>
                  <td className="py-3 text-gray-500 text-xs">
                    {agent.topContactReasons[0]?.reason || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tickets Closed Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Workload Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={agents.map(a => ({ name: a.name, closed: a.ticketsClosed }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
            <Bar dataKey="closed" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tickets Closed" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Selected Agent Detail */}
      {selected && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selected.name} — Deep Dive
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Radar (vs team avg)</h4>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} domain={[0, 100]} />
                  <Radar name={selected.name} dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Sentiment breakdown */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Ticket Sentiment</h4>
                <div className="flex flex-wrap gap-2">
                  {selected.sentimentBreakdown.map((s) => (
                    <span key={s.sentiment} className={`text-xs px-2 py-1 rounded font-medium ${
                      s.sentiment.toLowerCase().includes("positive") ? "bg-green-100 text-green-700"
                        : s.sentiment.toLowerCase().includes("negative") ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {s.sentiment}: {s.count}
                    </span>
                  ))}
                </div>
              </div>

              {/* Intent breakdown */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Ticket Types Handled</h4>
                <div className="space-y-1">
                  {selected.intentBreakdown.slice(0, 6).map((ib) => (
                    <div key={ib.intent} className="flex justify-between text-xs">
                      <span className="text-gray-600">{ib.intent}</span>
                      <span className="text-gray-400">{ib.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top contact reasons */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Top Contact Reasons</h4>
                <div className="space-y-1">
                  {selected.topContactReasons.map((cr) => (
                    <div key={cr.reason} className="flex justify-between text-xs">
                      <span className="text-gray-600">{cr.reason}</span>
                      <span className="text-gray-400">{cr.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function computeRadar(agent: AgentQuality, allAgents: AgentQuality[]) {
  // Normalize each metric to 0-100 scale relative to team
  const maxClosed = Math.max(...allAgents.map((a) => a.ticketsClosed)) || 1;
  const maxCsat = 5;
  const maxOneTouch = 100;
  // For response/resolution, lower is better so we invert
  const maxResponse = Math.max(...allAgents.map((a) => a.avgResponseTime)) || 1;
  const maxResolution = Math.max(...allAgents.map((a) => a.avgResolutionTime)) || 1;

  return [
    { metric: "Volume", value: Math.round((agent.ticketsClosed / maxClosed) * 100) },
    { metric: "CSAT", value: Math.round((agent.satisfactionScore / maxCsat) * 100) },
    { metric: "Response Speed", value: agent.avgResponseTime > 0 ? Math.round((1 - agent.avgResponseTime / maxResponse) * 100) : 50 },
    { metric: "Resolution Speed", value: agent.avgResolutionTime > 0 ? Math.round((1 - agent.avgResolutionTime / maxResolution) * 100) : 50 },
    { metric: "One-Touch", value: Math.round((agent.oneTouchRate / maxOneTouch) * 100) },
  ];
}
