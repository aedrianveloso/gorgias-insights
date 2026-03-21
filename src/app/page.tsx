"use client";

import { useTickets } from "@/lib/ticket-store";
import Link from "next/link";
import TicketDrillDown from "@/components/tickets/TicketDrillDown";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function formatMinutes(min: number): string {
  if (min <= 0) return "N/A";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Dashboard() {
  const { analytics, tickets } = useTickets();

  if (!analytics || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Wamsutta Insights</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          Upload your Gorgias CSV export to get started with analytics that go way beyond what Gorgias offers.
        </p>
        <Link
          href="/upload"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Upload CSV Data
        </Link>
      </div>
    );
  }

  const a = analytics;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">
          {a.totalTickets} tickets analyzed
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Tickets" value={a.totalTickets.toLocaleString()} />
        <StatCard label="Closed" value={a.closedTickets.toLocaleString()} color="green" />
        <StatCard label="Open" value={a.openTickets.toLocaleString()} color={a.openTickets > 10 ? "red" : "blue"} />
        <StatCard label="Avg Response" value={formatMinutes(a.avgResponseTime)} />
        <StatCard label="Avg Resolution" value={formatMinutes(a.avgResolutionTime)} />
        <StatCard label="CSAT" value={a.satisfactionScore > 0 ? a.satisfactionScore.toFixed(2) : "N/A"} color="green" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Messages/Ticket" value={a.messagesPerTicket.toFixed(1)} small />
        <StatCard label="One-Touch Rate" value={`${a.oneTouchRate}%`} small />
        <StatCard label="Zero-Touch" value={a.zeroTouchTickets.toLocaleString()} small />
        <StatCard label="With Messages" value={a.ticketsWithCustomerMessages.toLocaleString()} small />
      </div>

      {/* Charts Row 1: Volume + Channel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Created vs Closed Tickets</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={a.ticketsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="created" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} name="Created" />
              <Area type="monotone" dataKey="closed" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} name="Closed" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tickets by Channel</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={a.channelBreakdown.map(c => ({ name: `${c.channel} (${c.percentage}%)`, value: c.count }))}
                cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
              >
                {a.channelBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Intent + Contact Reason */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">AI Intent Breakdown</h3>
          <p className="text-xs text-gray-400 mb-4">What customers are trying to do</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={a.intentBreakdown.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} stroke="#9ca3af" width={120} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Tickets" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {a.intentBreakdown.slice(0, 5).map((intent) => (
              <TicketDrillDown
                key={intent.category}
                tickets={tickets.filter(t => intent.ticketIds.includes(t.id))}
                label={`${intent.category} tickets`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Contact Reasons</h3>
          <p className="text-xs text-gray-400 mb-4">Why customers reach out</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={a.contactReasonBreakdown.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis type="category" dataKey="reason" tick={{ fontSize: 11 }} stroke="#9ca3af" width={120} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Tickets" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {a.contactReasonBreakdown.slice(0, 5).map((reason) => (
              <TicketDrillDown
                key={reason.reason}
                tickets={tickets.filter(t => reason.ticketIds.includes(t.id))}
                label={`${reason.reason} tickets`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sentiment Over Time */}
      {a.sentimentOverTime.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Sentiment Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={a.sentimentOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="positive" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="Positive" />
              <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} name="Negative" />
              <Area type="monotone" dataKey="neutral" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.1} strokeWidth={1} name="Neutral" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Agent Quick View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Agent Performance</h3>
            <p className="text-xs text-gray-400">Quality metrics beyond speed</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-xs font-medium text-gray-500">Agent</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Tickets</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Closed</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Avg Response</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Avg Resolution</th>
                <th className="pb-3 text-xs font-medium text-gray-500">CSAT</th>
                <th className="pb-3 text-xs font-medium text-gray-500">One-Touch %</th>
              </tr>
            </thead>
            <tbody>
              {a.agentQuality.map((agent) => (
                <tr key={agent.name} className="border-b border-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">{agent.name}</td>
                  <td className="py-2.5 text-gray-600">{agent.ticketsHandled}</td>
                  <td className="py-2.5 text-gray-600">{agent.ticketsClosed}</td>
                  <td className="py-2.5 text-gray-600">{formatMinutes(agent.avgResponseTime)}</td>
                  <td className="py-2.5 text-gray-600">{formatMinutes(agent.avgResolutionTime)}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      agent.satisfactionScore >= 4.5 ? "bg-green-100 text-green-700"
                        : agent.satisfactionScore >= 4.0 ? "bg-blue-100 text-blue-700"
                        : agent.satisfactionScore > 0 ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {agent.satisfactionScore > 0 ? agent.satisfactionScore.toFixed(1) : "N/A"}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-600">{agent.oneTouchRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tags + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {a.tagBreakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Tags</h3>
            <div className="space-y-2">
              {a.tagBreakdown.slice(0, 8).map((tag) => (
                <div key={tag.tag} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{tag.tag}</span>
                      <span className="text-gray-400">{tag.count} ({tag.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(tag.percentage * 2, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {a.recommendations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Actionable Recommendations</h3>
              <Link href="/insights" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {a.recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className={`p-3 rounded-lg border text-xs ${
                  rec.priority === "high" ? "border-red-200 bg-red-50"
                    : rec.priority === "medium" ? "border-yellow-200 bg-yellow-50"
                    : "border-green-200 bg-green-50"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rec.priority === "high" ? "bg-red-200 text-red-800"
                        : rec.priority === "medium" ? "bg-yellow-200 text-yellow-800"
                        : "bg-green-200 text-green-800"
                    }`}>{rec.priority}</span>
                    <span className="font-semibold text-gray-900">{rec.title}</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{rec.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  const colorClass = color === "green" ? "text-green-600" : color === "red" ? "text-red-600" : color === "blue" ? "text-blue-600" : "text-gray-900";
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`${small ? "text-xl" : "text-2xl"} font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
  );
}
