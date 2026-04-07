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
  const ex = a.exchangeAnalysis;
  const monthly = a.monthlyBreakdown;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">
          {a.totalTickets} tickets analyzed — focused on what customers are telling you
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Tickets" value={a.totalTickets.toLocaleString()} />
        <StatCard label="Closed" value={a.closedTickets.toLocaleString()} color="green" />
        <StatCard label="Open" value={a.openTickets.toLocaleString()} color={a.openTickets > 10 ? "red" : "blue"} />
        <StatCard label="Exchanges" value={ex.totalExchanges.toLocaleString()} color={ex.totalExchanges > 0 ? "orange" : undefined} />
        <StatCard label="Returns" value={ex.totalReturns.toLocaleString()} color={ex.totalReturns > 0 ? "red" : undefined} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
        <StatCard label="One-Touch Rate" value={`${a.oneTouchRate}%`} small />
        <StatCard label="With Messages" value={a.ticketsWithCustomerMessages.toLocaleString()} small />
      </div>

      {/* Recommendations - Prominent at top */}
      {a.recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Key Insights & Recommendations</h3>
              <p className="text-xs text-gray-400">Auto-generated from your customer data patterns</p>
            </div>
            <Link href="/insights" className="text-xs text-blue-600 hover:underline">Deep dive →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {a.recommendations.slice(0, 6).map((rec, i) => (
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
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-700">{rec.category}</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                <p className="text-gray-600 leading-relaxed">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Reasons */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Contact Reasons</h3>
          <p className="text-xs text-gray-400 mb-4">Why customers reach out</p>
          {(() => {
            const filtered = a.contactReasonBreakdown.filter(
              (r) => r.reason && r.reason.toLowerCase() !== "unknown" && r.reason !== "Not specified"
            );
            const unknown = a.contactReasonBreakdown.find(
              (r) => !r.reason || r.reason.toLowerCase() === "unknown" || r.reason === "Not specified"
            );
            return (
              <>
                {unknown && unknown.count > 0 && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                    <span className="font-semibold">{unknown.count} tickets</span> have no contact
                    reason tagged in Gorgias ({unknown.percentage}%) — fix in Gorgias for cleaner
                    reporting.
                  </div>
                )}
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={filtered.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis
                      type="category"
                      dataKey="reason"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Tickets" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {filtered.slice(0, 4).map((reason) => (
                    <div key={reason.reason}>
                      {reason.details.length > 1 && (
                        <div className="ml-2 flex flex-wrap gap-1 mb-1">
                          {reason.details.slice(0, 3).map((d) => (
                            <span
                              key={d.name}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200"
                            >
                              {d.name}: {d.count}
                            </span>
                          ))}
                        </div>
                      )}
                      <TicketDrillDown
                        tickets={tickets.filter((t) => reason.ticketIds.includes(t.id))}
                        label={`${reason.reason} tickets`}
                      />
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Exchange & Return Snapshot + Product Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Exchange/Return Quick View */}
        {(ex.totalExchanges > 0 || ex.totalReturns > 0) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Exchanges & Returns</h3>
                <p className="text-xs text-gray-400">What&apos;s coming back and why</p>
              </div>
              <Link href="/insights" className="text-xs text-blue-600 hover:underline">Full analysis →</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-700">{ex.totalExchanges}</p>
                <p className="text-xs text-orange-600">Exchanges</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{ex.totalReturns}</p>
                <p className="text-xs text-red-600">Returns</p>
              </div>
            </div>
            {/* Top exchange reasons */}
            {ex.exchangeReasons.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Top Exchange Reasons</p>
                <div className="space-y-1">
                  {ex.exchangeReasons.slice(0, 3).map((r) => (
                    <div key={r.reason} className="flex justify-between text-xs items-center">
                      <span className="text-gray-700">{r.reason}</span>
                      <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Top return reasons */}
            {ex.returnReasons.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Top Return Reasons</p>
                <div className="space-y-1">
                  {ex.returnReasons.slice(0, 3).map((r) => (
                    <div key={r.reason} className="flex justify-between text-xs items-center">
                      <span className="text-gray-700">{r.reason}</span>
                      <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Top products being exchanged/returned */}
            {ex.exchangesByProduct.filter(p => p.product !== "Not specified").length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-2">Products Most Exchanged/Returned</p>
                <div className="space-y-1">
                  {[...ex.exchangesByProduct, ...ex.returnsByProduct]
                    .filter(p => p.product !== "Not specified")
                    .reduce((acc, p) => {
                      const existing = acc.find(a => a.product === p.product);
                      if (existing) existing.count += p.count;
                      else acc.push({ ...p });
                      return acc;
                    }, [] as { product: string; count: number; ticketIds: number[] }[])
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 4)
                    .map((p) => (
                      <div key={p.product} className="flex justify-between text-xs items-center">
                        <span className="text-gray-700 truncate mr-2">{p.product}</span>
                        <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{p.count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Demand - What are customers asking about */}
        {a.productInsights.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Products Customers Ask About</h3>
            <p className="text-xs text-gray-400 mb-4">Ranked by ticket volume with sentiment</p>
            <div className="space-y-3">
              {a.productInsights.slice(0, 6).map((product, i) => {
                const total = product.sentiment.positive + product.sentiment.negative + product.sentiment.neutral;
                const negPct = total > 0 ? Math.round((product.sentiment.negative / total) * 100) : 0;
                return (
                  <div key={product.product} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                        <span className="text-sm font-medium text-gray-900 truncate">{product.product}</span>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">{product.totalTickets} tickets</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] mb-2">
                      <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">+{product.sentiment.positive}</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700">-{product.sentiment.negative}</span>
                      {product.exchangeCount > 0 && <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{product.exchangeCount} exch</span>}
                      {product.returnCount > 0 && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700">{product.returnCount} ret</span>}
                      {product.qualityMentions > 0 && <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">{product.qualityMentions} quality</span>}
                      {negPct >= 30 && <span className="px-1.5 py-0.5 rounded bg-red-200 text-red-800 font-bold">Needs attention</span>}
                    </div>
                    {product.topIssues.length > 0 && (
                      <p className="text-[10px] text-gray-500">Top issue: {product.topIssues[0].issue} ({product.topIssues[0].count})</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Product Demand Trends */}
      {monthly.length > 0 && monthly.some(m => m.topProducts.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Monthly Product Demand</h3>
          <p className="text-xs text-gray-400 mb-4">What products customers are asking about each month</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left text-gray-500 font-medium">Month</th>
                  <th className="pb-2 text-center text-gray-500 font-medium">Tickets</th>
                  <th className="pb-2 text-center text-gray-500 font-medium">Exch/Ret</th>
                  <th className="pb-2 text-left text-gray-500 font-medium">Top Products</th>
                  <th className="pb-2 text-left text-gray-500 font-medium">Top Contact Reason</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.month} className="border-b border-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{m.label}</td>
                    <td className="py-2.5 text-center text-gray-600">{m.totalTickets}</td>
                    <td className="py-2.5 text-center">
                      {m.exchangeReturnCount > 0 ? (
                        <span className="text-orange-600 font-medium">{m.exchangeReturnCount}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {m.topProducts.slice(0, 3).map((p) => (
                          <span key={p.product} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">
                            {p.product} ({p.count})
                          </span>
                        ))}
                        {m.topProducts.length === 0 && <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="py-2.5 text-gray-600">
                      {m.topContactReasons[0] ? (
                        <span>
                          {m.topContactReasons[0].reason}
                          {m.topContactReasons[0].detail && (
                            <span className="text-gray-400 ml-1">({m.topContactReasons[0].detail})</span>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Intent + Channel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">What Customers Want</h3>
          <p className="text-xs text-gray-400 mb-4">AI-detected customer intent</p>
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

      {/* Sentiment Over Time */}
      {a.sentimentOverTime.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Sentiment Over Time</h3>
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

      {/* Tags */}
      {a.tagBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Tags</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {a.tagBreakdown.slice(0, 8).map((tag) => (
              <div key={tag.tag} className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 font-medium truncate mr-1">{tag.tag}</span>
                  <span className="text-gray-400 shrink-0">{tag.count} ({tag.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(tag.percentage * 2, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  const colorClass = color === "green" ? "text-green-600"
    : color === "red" ? "text-red-600"
    : color === "blue" ? "text-blue-600"
    : color === "orange" ? "text-orange-600"
    : "text-gray-900";
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`${small ? "text-xl" : "text-2xl"} font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
  );
}
