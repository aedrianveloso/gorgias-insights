"use client";

import { useTickets } from "@/lib/ticket-store";
import Link from "next/link";
import TicketDrillDown from "@/components/tickets/TicketDrillDown";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const SEVERITY_COLORS = { high: "border-red-200 bg-red-50", medium: "border-yellow-200 bg-yellow-50", low: "border-green-200 bg-green-50" };
const SEVERITY_BADGE = { high: "bg-red-200 text-red-800", medium: "bg-yellow-200 text-yellow-800", low: "bg-green-200 text-green-800" };

function formatMinutes(min: number): string {
  if (min <= 0) return "N/A";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function InsightsPage() {
  const { analytics, tickets } = useTickets();

  if (!analytics || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No data yet</h2>
        <p className="text-gray-500 mb-6">Upload your Gorgias CSV to see customer voice insights.</p>
        <Link href="/upload" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
          Upload CSV Data
        </Link>
      </div>
    );
  }

  const a = analytics;
  const cv = a.customerVoice;
  const ex = a.exchangeAnalysis;
  const monthly = a.monthlyBreakdown;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Customer Voice</h2>
        <p className="text-gray-500 mt-1">What your customers are really saying — insights Gorgias cannot provide</p>
      </div>

      {/* ─── Recommendations ──────────────────────────────── */}
      {a.recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Actionable Recommendations</h3>
          <p className="text-sm text-gray-400 mb-4">Auto-generated from your ticket patterns</p>
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

      {/* ─── Action Plan: START / KEEP / FIX ─────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Action Plan</h3>
        <p className="text-sm text-gray-500 mb-4">
          What to fix now, what to start doing, and what to keep doing consistently
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* FIX NOW — high severity issues */}
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase bg-red-200 text-red-900 px-2 py-0.5 rounded">
                Fix Now
              </span>
              <span className="text-xs text-red-700">High priority</span>
            </div>
            <ul className="space-y-2 text-sm text-red-900">
              {cv.improvementOpportunities
                .filter((i) => i.severity === "high")
                .slice(0, 5)
                .map((i) => (
                  <li key={i.area} className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">●</span>
                    <span>
                      <span className="font-semibold">{i.area}</span> — {i.description} ({i.count}{" "}
                      tickets)
                    </span>
                  </li>
                ))}
              {a.knowledgeGaps
                .filter((g) => g.severity === "high")
                .slice(0, 3)
                .map((g) => (
                  <li key={g.topic} className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">●</span>
                    <span>
                      <span className="font-semibold">{g.topic}</span> — {g.websiteAction} ({g.count}{" "}
                      mentions)
                    </span>
                  </li>
                ))}
              {ex.totalReturns > 0 && ex.returnsByProduct.slice(0, 2).map((p) => (
                <li key={`ret-${p.product}`} className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">●</span>
                  <span>
                    Investigate <span className="font-semibold">{p.product}</span> — {p.count}{" "}
                    returns; check for quality/sizing issues
                  </span>
                </li>
              ))}
              {cv.improvementOpportunities.filter((i) => i.severity === "high").length === 0 &&
                a.knowledgeGaps.filter((g) => g.severity === "high").length === 0 && (
                  <li className="text-red-700 italic">No high-priority issues detected</li>
                )}
            </ul>
          </div>

          {/* START DOING — medium severity + knowledge gaps */}
          <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase bg-orange-200 text-orange-900 px-2 py-0.5 rounded">
                Start Doing
              </span>
              <span className="text-xs text-orange-700">Medium priority</span>
            </div>
            <ul className="space-y-2 text-sm text-orange-900">
              {a.knowledgeGaps
                .filter((g) => g.severity === "medium")
                .slice(0, 5)
                .map((g) => (
                  <li key={g.topic} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">●</span>
                    <span>
                      {g.websiteAction} <span className="text-orange-700">({g.count} mentions)</span>
                    </span>
                  </li>
                ))}
              {cv.improvementOpportunities
                .filter((i) => i.severity === "medium")
                .slice(0, 3)
                .map((i) => (
                  <li key={i.area} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">●</span>
                    <span>
                      <span className="font-semibold">{i.area}</span> — {i.description}
                    </span>
                  </li>
                ))}
              {ex.exchangeReasons.slice(0, 2).map((r, i) => (
                <li key={`ex-${i}`} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">●</span>
                  <span>
                    Address top exchange reason:{" "}
                    <span className="font-semibold">{r.reason}</span> ({r.count} tickets)
                  </span>
                </li>
              ))}
              {a.knowledgeGaps.length === 0 &&
                cv.improvementOpportunities.filter((i) => i.severity === "medium").length === 0 && (
                  <li className="text-orange-700 italic">Nothing pending in this bucket</li>
                )}
            </ul>
          </div>

          {/* KEEP DOING — what's working well */}
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase bg-green-200 text-green-900 px-2 py-0.5 rounded">
                Keep Doing
              </span>
              <span className="text-xs text-green-700">Be consistent</span>
            </div>
            <ul className="space-y-2 text-sm text-green-900">
              {cv.whatWorksWell.slice(0, 5).map((w) => (
                <li key={w.pattern} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">●</span>
                  <span>
                    <span className="font-semibold">{w.pattern}</span> — mentioned {w.count}{" "}
                    times in positive feedback
                  </span>
                </li>
              ))}
              {a.productInsights
                .filter((p) => p.sentiment.positive > p.sentiment.negative * 2 && p.totalTickets >= 5)
                .slice(0, 3)
                .map((p) => (
                  <li key={`prod-${p.product}`} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">●</span>
                    <span>
                      Customers love <span className="font-semibold">{p.product}</span> — keep
                      stocking & promoting
                    </span>
                  </li>
                ))}
              {cv.whatWorksWell.length === 0 &&
                a.productInsights.filter((p) => p.sentiment.positive > p.sentiment.negative * 2)
                  .length === 0 && (
                  <li className="text-green-700 italic">
                    Fill in more email bodies to surface positive patterns
                  </li>
                )}
            </ul>
          </div>
        </div>
      </div>

      {/* ─── Website Improvement Signals ──────────────────── */}
      {a.knowledgeGaps.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Website & FAQ Improvement Signals
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Customer questions that signal specific website / product page improvements
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {a.knowledgeGaps.map((g) => (
              <div
                key={g.topic}
                className={`border rounded-lg p-3 ${SEVERITY_COLORS[g.severity]}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">{g.topic}</h4>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${SEVERITY_BADGE[g.severity]}`}
                  >
                    {g.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">{g.description}</p>
                <p className="text-xs text-blue-700 mb-2">
                  <span className="font-semibold">Action:</span> {g.websiteAction}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{g.count} customer mentions</span>
                </div>
                <TicketDrillDown
                  tickets={tickets.filter((t) => g.ticketIds.includes(t.id))}
                  label={g.topic}
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── First Contact Drivers + Customer Types ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {cv.customerTypeBreakdown.length > 0 && cv.customerTypeBreakdown.some(c => c.type !== "Unknown") && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Customer Types</h3>
            <p className="text-xs text-gray-400 mb-4">Who is reaching out</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={cv.customerTypeBreakdown.filter(c => c.type !== "Unknown").map(c => ({ name: `${c.type} (${c.percentage}%)`, value: c.count }))}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                >
                  {cv.customerTypeBreakdown.filter(c => c.type !== "Unknown").map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
              {cv.customerTypeBreakdown.filter(c => c.type !== "Unknown").map((ct) => (
                <TicketDrillDown
                  key={ct.type}
                  tickets={tickets.filter(t => ct.ticketIds.includes(t.id))}
                  label={`${ct.type} tickets`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Common Themes ────────────────────────────────── */}
      {cv.commonThemes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Common Themes</h3>
          <p className="text-sm text-gray-400 mb-4">Patterns detected from customer messages</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cv.commonThemes.map((theme) => (
              <div key={theme.theme} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{theme.theme}</h4>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded shrink-0 ml-2">{theme.count} tickets</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{theme.description}</p>
                {theme.examples.length > 0 && (
                  <p className="text-xs text-gray-400 italic line-clamp-2 mb-2">
                    &quot;{theme.examples[0]}...&quot;
                  </p>
                )}
                <TicketDrillDown
                  tickets={tickets.filter(t => theme.ticketIds.includes(t.id))}
                  label="tickets"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── What's Working + Improvement Opportunities ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {cv.whatWorksWell.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">What&apos;s Working Well</h3>
            <p className="text-xs text-gray-400 mb-4">Positive patterns from satisfied customers</p>
            <div className="space-y-3">
              {cv.whatWorksWell.map((item) => (
                <div key={item.pattern} className="border border-green-200 bg-green-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-green-900">{item.pattern}</span>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">{item.count}</span>
                  </div>
                  {item.examples.length > 0 && (
                    <p className="text-xs text-green-700 italic line-clamp-2">
                      &quot;{item.examples[0]}...&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {cv.improvementOpportunities.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Improvement Opportunities</h3>
            <p className="text-xs text-gray-400 mb-4">Areas identified from negative feedback</p>
            <div className="space-y-3">
              {cv.improvementOpportunities.map((item) => (
                <div key={item.area} className={`border rounded-lg p-3 ${SEVERITY_COLORS[item.severity]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${SEVERITY_BADGE[item.severity]}`}>
                      {item.severity}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{item.area}</span>
                    <span className="text-xs text-gray-500 ml-auto">{item.count} tickets</span>
                  </div>
                  <p className="text-xs text-gray-600">{item.description}</p>
                  <TicketDrillDown
                    tickets={tickets.filter(t => item.ticketIds.includes(t.id))}
                    label="tickets"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Survey Insights ──────────────────────────────── */}
      {cv.surveyInsights.totalResponses > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Survey Feedback</h3>
          <p className="text-sm text-gray-400 mb-4">{cv.surveyInsights.totalResponses} responses, avg score {cv.surveyInsights.avgScore}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cv.surveyInsights.positiveComments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-800 mb-2">Positive Feedback</h4>
                <div className="space-y-2">
                  {cv.surveyInsights.positiveComments.map((comment, i) => (
                    <div key={i} className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-800 italic">
                      &quot;{comment}&quot;
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cv.surveyInsights.negativeComments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-2">Negative Feedback</h4>
                <div className="space-y-2">
                  {cv.surveyInsights.negativeComments.map((comment, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800 italic">
                      &quot;{comment}&quot;
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {cv.surveyInsights.themes.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Survey Themes</h4>
              <div className="flex flex-wrap gap-2">
                {cv.surveyInsights.themes.map((theme) => (
                  <span key={theme.theme} className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                    {theme.theme} ({theme.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Exchange & Return Deep Dive ───────────────────── */}
      {(ex.totalExchanges > 0 || ex.totalReturns > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Exchange & Return Deep Dive</h3>
          <p className="text-sm text-gray-400 mb-4">What products come back, why customers ask the first time, and what patterns emerge</p>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-700">{ex.totalExchanges}</p>
              <p className="text-xs text-orange-600 font-medium">Exchanges</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{ex.totalReturns}</p>
              <p className="text-xs text-red-600 font-medium">Returns</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{ex.exchangesByProduct.filter(p => p.product !== "Not specified").length}</p>
              <p className="text-xs text-blue-600 font-medium">Products Exchanged</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">
                {a.totalTickets > 0 ? ((((ex.totalExchanges + ex.totalReturns) / a.totalTickets) * 100).toFixed(1)) : 0}%
              </p>
              <p className="text-xs text-purple-600 font-medium">of All Tickets</p>
            </div>
          </div>

          {/* By Product - with sentiment context */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {ex.exchangesByProduct.filter(p => p.product !== "Not specified").length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-orange-800 mb-3">Products Being Exchanged</h4>
                <div className="space-y-2">
                  {ex.exchangesByProduct.filter(p => p.product !== "Not specified").slice(0, 6).map((p) => (
                    <div key={p.product} className="border border-orange-100 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate mr-2">{p.product}</span>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded shrink-0">{p.count} exchanges</span>
                      </div>
                      <TicketDrillDown
                        tickets={tickets.filter(t => p.ticketIds.includes(t.id))}
                        label="tickets"
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ex.returnsByProduct.filter(p => p.product !== "Not specified").length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-3">Products Being Returned</h4>
                <div className="space-y-2">
                  {ex.returnsByProduct.filter(p => p.product !== "Not specified").slice(0, 6).map((p) => (
                    <div key={p.product} className="border border-red-100 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate mr-2">{p.product}</span>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded shrink-0">{p.count} returns</span>
                      </div>
                      <TicketDrillDown
                        tickets={tickets.filter(t => p.ticketIds.includes(t.id))}
                        label="tickets"
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Why customers ask - reasons with customer quotes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ex.exchangeReasons.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Why Customers Exchange</h4>
                <p className="text-xs text-gray-400 mb-2">First-time reasons detected from customer messages</p>
                <div className="space-y-3">
                  {ex.exchangeReasons.map((r) => (
                    <div key={r.reason} className="border border-orange-100 bg-orange-50/50 rounded-lg p-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{r.reason}</span>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded">{r.count}</span>
                      </div>
                      {r.examples.length > 0 && (
                        <p className="text-xs text-gray-500 italic line-clamp-2 mb-2">
                          &quot;{r.examples[0]}...&quot;
                        </p>
                      )}
                      <TicketDrillDown
                        tickets={tickets.filter(t => r.ticketIds.includes(t.id))}
                        label="tickets"
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ex.returnReasons.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Why Customers Return</h4>
                <p className="text-xs text-gray-400 mb-2">Root causes from customer messages</p>
                <div className="space-y-3">
                  {ex.returnReasons.map((r) => (
                    <div key={r.reason} className="border border-red-100 bg-red-50/50 rounded-lg p-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{r.reason}</span>
                        <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">{r.count}</span>
                      </div>
                      {r.examples.length > 0 && (
                        <p className="text-xs text-gray-500 italic line-clamp-2 mb-2">
                          &quot;{r.examples[0]}...&quot;
                        </p>
                      )}
                      <TicketDrillDown
                        tickets={tickets.filter(t => r.ticketIds.includes(t.id))}
                        label="tickets"
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Monthly Trends ───────────────────────────────── */}
      {monthly.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Monthly Trends</h3>
          <p className="text-sm text-gray-400 mb-4">How your support metrics are changing over time</p>

          {/* Volume chart */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Ticket Volume</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="totalTickets" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Created" />
                <Bar dataKey="closedTickets" fill="#10b981" radius={[4, 4, 0, 0]} name="Closed" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Response & Resolution Time Trends */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Response & Resolution Time</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" label={{ value: "minutes", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#9ca3af" } }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(value) => formatMinutes(Number(value))} />
                <Line type="monotone" dataKey="avgResponseTime" stroke="#3b82f6" strokeWidth={2} name="Avg Response" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="avgResolutionTime" stroke="#f59e0b" strokeWidth={2} name="Avg Resolution" dot={{ r: 4 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment Trend */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Sentiment Trend</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="sentiment.positive" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="Positive" />
                <Area type="monotone" dataKey="sentiment.negative" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} name="Negative" />
                <Area type="monotone" dataKey="sentiment.neutral" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.1} strokeWidth={1} name="Neutral" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Details Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left text-gray-500 font-medium">Month</th>
                  <th className="pb-2 text-center text-gray-500 font-medium">Tickets</th>
                  <th className="pb-2 text-center text-gray-500 font-medium">CSAT</th>
                  <th className="pb-2 text-center text-gray-500 font-medium">Exch/Ret</th>
                  <th className="pb-2 text-left text-gray-500 font-medium">Top Products</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.month} className="border-b border-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{m.label}</td>
                    <td className="py-2.5 text-center text-gray-600">{m.totalTickets}</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.satisfactionScore >= 4.5 ? "bg-green-100 text-green-700"
                          : m.satisfactionScore >= 4.0 ? "bg-blue-100 text-blue-700"
                          : m.satisfactionScore > 0 ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {m.satisfactionScore > 0 ? m.satisfactionScore.toFixed(1) : "N/A"}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      {m.exchangeReturnCount > 0 ? (
                        <span className="text-orange-600 font-medium">{m.exchangeReturnCount}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {m.topProducts.slice(0, 2).map((p) => (
                          <span key={p.product} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">
                            {p.product} ({p.count})
                          </span>
                        ))}
                        {m.topProducts.length === 0 && <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Intent Drill-Down ──────────────────── */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Intent Categories</h3>
          <p className="text-xs text-gray-400 mb-4">Structured breakdown with sub-categories</p>
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
                        <span>{sub.name}</span>
                        <span>{sub.count}</span>
                      </div>
                    ))}
                  </div>
                )}
                <TicketDrillDown
                  tickets={tickets.filter(t => intent.ticketIds.includes(t.id))}
                  label="tickets"
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── Product Insights ─────────────────────────────── */}
      {a.productInsights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Product-Level Insights</h3>
          <p className="text-sm text-gray-400 mb-4">Which products generate the most support tickets</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {a.productInsights.slice(0, 9).map((product) => (
              <div key={product.product} className="border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 truncate">{product.product}</h4>
                <p className="text-2xl font-bold text-gray-900 mb-2">{product.totalTickets}</p>
                <div className="flex flex-wrap gap-1.5 text-xs mb-3">
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">+{product.sentiment.positive}</span>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">-{product.sentiment.negative}</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">~{product.sentiment.neutral}</span>
                  {product.exchangeCount > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">{product.exchangeCount} exch</span>}
                  {product.returnCount > 0 && <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">{product.returnCount} ret</span>}
                  {product.qualityMentions > 0 && <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">{product.qualityMentions} quality</span>}
                </div>
                <div className="space-y-1">
                  {product.topIssues.slice(0, 3).map((issue) => (
                    <div key={issue.issue} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate mr-2">{issue.issue}</span>
                      <span className="text-gray-400 shrink-0">{issue.count}</span>
                    </div>
                  ))}
                </div>
                <TicketDrillDown
                  tickets={tickets.filter(t => product.ticketIds.includes(t.id))}
                  label="tickets"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Resolution ───────────────────────── */}
      <div className="grid grid-cols-1 gap-6 mb-6">
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

      {/* ─── Business Opportunities Summary ────────────────── */}
      {(cv.improvementOpportunities.length > 0 || cv.whatWorksWell.length > 0) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Business Opportunities Summary</h3>
          <p className="text-sm text-gray-400 mb-4">What you should keep doing and where to improve</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-2">Keep Doing (Customers Love These)</h4>
              <div className="space-y-1">
                {cv.whatWorksWell.slice(0, 4).map((item) => (
                  <div key={item.pattern} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="text-gray-700">{item.pattern}</span>
                    <span className="text-gray-400 shrink-0">({item.count})</span>
                  </div>
                ))}
                {cv.whatWorksWell.length === 0 && <p className="text-xs text-gray-400">Upload more customer messages to detect patterns</p>}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-2">Improve (Top Complaints)</h4>
              <div className="space-y-1">
                {cv.improvementOpportunities.slice(0, 4).map((item) => (
                  <div key={item.area} className="flex items-center gap-2 text-xs">
                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${SEVERITY_BADGE[item.severity]}`}>
                      {item.severity}
                    </span>
                    <span className="text-gray-700">{item.area}</span>
                    <span className="text-gray-400 shrink-0">({item.count})</span>
                  </div>
                ))}
                {cv.improvementOpportunities.length === 0 && <p className="text-xs text-gray-400">No major issues detected</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
