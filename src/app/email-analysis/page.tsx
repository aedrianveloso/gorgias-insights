"use client";

import { useTickets } from "@/lib/ticket-store";
import Link from "next/link";
import TicketDrillDown from "@/components/tickets/TicketDrillDown";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function EmailAnalysisPage() {
  const { analytics, tickets } = useTickets();

  if (!analytics || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No data yet</h2>
        <p className="text-gray-500 mb-6">Upload your Gorgias CSV to analyze email bodies.</p>
        <Link href="/upload" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
          Upload CSV Data
        </Link>
      </div>
    );
  }

  const a = analytics;
  const ei = a.emailInsights;
  const withBody = tickets.filter((t) => t.emailBody?.trim().length > 10);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Email Body Analysis</h2>
        <p className="text-gray-500 mt-1">
          Intelligence extracted from {withBody.length} ticket conversations — impossible in Gorgias
        </p>
      </div>

      {withBody.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-700">
          No email bodies found in your data. Add an &quot;Email Body&quot; column to your CSV with the conversation text from each ticket to unlock this analysis.
        </div>
      )}

      {/* Customer Request Patterns */}
      {ei.topCustomerRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Customer Request Patterns</h3>
          <p className="text-sm text-gray-400 mb-4">
            What customers are actually asking for — detected from email text
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={ei.topCustomerRequests.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis type="category" dataKey="request" tick={{ fontSize: 10 }} stroke="#9ca3af" width={160} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Mentions" />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {ei.topCustomerRequests.slice(0, 6).map((req) => (
                <div key={req.request} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-gray-900">{req.request}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{req.count} tickets</span>
                  </div>
                  {req.examples.length > 0 && (
                    <p className="text-xs text-gray-500 italic line-clamp-2">
                      &quot;{req.examples[0]}...&quot;
                    </p>
                  )}
                  <TicketDrillDown
                    tickets={tickets.filter(t => req.ticketIds.includes(t.id))}
                    label="tickets"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product Mentions */}
      {ei.productMentions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Product Mentions in Emails</h3>
          <p className="text-sm text-gray-400 mb-4">Products customers mention most in their messages</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {ei.productMentions.map((pm) => (
              <div key={pm.product} className="border rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{pm.count}</p>
                <p className="text-xs text-gray-500 capitalize">{pm.product}</p>
                <TicketDrillDown
                  tickets={tickets.filter(t => pm.ticketIds.includes(t.id))}
                  label="tickets"
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyword Cloud (as a list) */}
      {ei.commonKeywords.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Common Keywords</h3>
          <p className="text-sm text-gray-400 mb-4">Most frequently mentioned words across all email bodies</p>
          <div className="flex flex-wrap gap-2">
            {ei.commonKeywords.slice(0, 40).map((kw) => {
              const maxCount = ei.commonKeywords[0]?.count || 1;
              const ratio = kw.count / maxCount;
              const size = ratio > 0.7 ? "text-lg font-bold" : ratio > 0.4 ? "text-sm font-semibold" : "text-xs font-medium";
              const color = ratio > 0.7 ? "bg-blue-100 text-blue-800" : ratio > 0.4 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600";
              return (
                <span key={kw.word} className={`px-2 py-1 rounded ${size} ${color}`}>
                  {kw.word} ({kw.count})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Sample Email Bodies */}
      {withBody.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Sample Conversations</h3>
          <p className="text-sm text-gray-400 mb-4">First {Math.min(5, withBody.length)} tickets with email body data</p>
          <div className="space-y-4">
            {withBody.slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="border rounded-lg p-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {ticket.aiIntent && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      {ticket.aiIntent}
                    </span>
                  )}
                  {ticket.contactReason && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">
                      {ticket.contactReason}
                    </span>
                  )}
                  {ticket.managedSentiment && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      ticket.managedSentiment.toLowerCase().includes("positive")
                        ? "bg-green-100 text-green-800"
                        : ticket.managedSentiment.toLowerCase().includes("negative")
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {ticket.managedSentiment}
                    </span>
                  )}
                  {ticket.assigneeName && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                      {ticket.assigneeName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{ticket.emailBody}</p>
                {ticket.ticketUrl && (
                  <a href={ticket.ticketUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                    View in Gorgias →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
