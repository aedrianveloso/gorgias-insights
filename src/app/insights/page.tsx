"use client";

import { useTickets } from "@/lib/ticket-store";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function InsightsPage() {
  const { analytics, tickets } = useTickets();

  if (!analytics || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No data yet</h2>
        <p className="text-gray-500 mb-6">Upload your Gorgias CSV to see insights.</p>
        <Link href="/upload" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
          Upload CSV Data
        </Link>
      </div>
    );
  }

  const a = analytics;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Insights</h2>
        <p className="text-gray-500 mt-1">Deep analysis Gorgias cannot provide</p>
      </div>

      {/* Recommendations */}
      {a.recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Actionable Recommendations</h3>
          <p className="text-sm text-gray-400 mb-4">
            Auto-generated insights based on your ticket data — Gorgias gives you none of this
          </p>
          <div className="space-y-4">
            {a.recommendations.map((rec, i) => (
              <div key={i} className={`p-4 rounded-lg border ${
                rec.priority === "high" ? "border-red-200 bg-red-50"
                  : rec.priority === "medium" ? "border-yellow-200 bg-yellow-50"
                  : "border-green-200 bg-green-50"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    rec.priority === "high" ? "bg-red-200 text-red-800"
                      : rec.priority === "medium" ? "bg-yellow-200 text-yellow-800"
                      : "bg-green-200 text-green-800"
                  }`}>{rec.priority}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">{rec.category}</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{rec.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                <p className="text-xs text-gray-500 italic">Impact: {rec.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intent Drill-Down */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Intent Categories</h3>
          <p className="text-xs text-gray-400 mb-4">Gorgias shows flat counts — we show structure</p>
          <div className="space-y-3">
            {a.intentBreakdown.slice(0, 10).map((intent) => (
              <div key={intent.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{intent.category}</span>
                  <span className="text-gray-500">{intent.count} ({intent.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${intent.percentage}%` }} />
                </div>
                {intent.subCategories.length > 1 && (
                  <div className="ml-4 space-y-0.5">
                    {intent.subCategories.slice(0, 4).map((sub) => (
                      <div key={sub.name} className="flex justify-between text-xs text-gray-500">
                        <span>→ {sub.name}</span>
                        <span>{sub.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Reason Drill-Down */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Contact Reason Details</h3>
          <p className="text-xs text-gray-400 mb-4">With sub-category breakdown</p>
          <div className="space-y-3">
            {a.contactReasonBreakdown.slice(0, 10).map((reason) => (
              <div key={reason.reason}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{reason.reason}</span>
                  <span className="text-gray-500">{reason.count} ({reason.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${reason.percentage}%` }} />
                </div>
                {reason.details.length > 1 && (
                  <div className="ml-4 space-y-0.5">
                    {reason.details.slice(0, 4).map((d) => (
                      <div key={d.name} className="flex justify-between text-xs text-gray-500">
                        <span>→ {d.name}</span>
                        <span>{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Insights */}
      {a.productInsights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Product-Level Insights</h3>
          <p className="text-sm text-gray-400 mb-4">Which products generate the most support tickets</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {a.productInsights.slice(0, 6).map((product) => (
              <div key={product.product} className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 truncate">{product.product}</h4>
                <p className="text-2xl font-bold text-gray-900 mb-2">{product.totalTickets}</p>
                <div className="flex gap-2 text-xs mb-3">
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">+{product.sentiment.positive}</span>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">-{product.sentiment.negative}</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">~{product.sentiment.neutral}</span>
                </div>
                <div className="space-y-1">
                  {product.topIssues.slice(0, 3).map((issue) => (
                    <div key={issue.issue} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate mr-2">{issue.issue}</span>
                      <span className="text-gray-400 shrink-0">{issue.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment + Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {a.emailInsights.sentimentDistribution.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Sentiment Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={a.emailInsights.sentimentDistribution.map(s => ({ name: s.sentiment, value: s.count }))}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                >
                  {a.emailInsights.sentimentDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {a.resolutionBreakdown.length > 0 && a.resolutionBreakdown.some(r => r.resolution !== "Not set") && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Resolution Types</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={a.resolutionBreakdown.filter(r => r.resolution !== "Not set").slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="resolution" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Cross-dimensional: Intent × Agent */}
      {a.agentQuality.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Agent × Intent Matrix</h3>
          <p className="text-sm text-gray-400 mb-4">What types of tickets each agent handles — Gorgias has nothing like this</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left text-gray-500 font-medium">Agent</th>
                  {a.intentBreakdown.slice(0, 6).map((intent) => (
                    <th key={intent.category} className="pb-2 text-center text-gray-500 font-medium px-2">{intent.category}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.agentQuality.map((agent) => (
                  <tr key={agent.name} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-900">{agent.name}</td>
                    {a.intentBreakdown.slice(0, 6).map((intent) => {
                      const match = agent.intentBreakdown.find((ib) => ib.intent === intent.category);
                      return (
                        <td key={intent.category} className="py-2 text-center text-gray-600">
                          {match ? match.count : 0}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
