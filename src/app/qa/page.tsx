"use client";

import { useTickets } from "@/lib/ticket-store";
import { computeAnalytics } from "@/lib/analytics";
import { useMemo } from "react";
import TicketDrillDown from "@/components/tickets/TicketDrillDown";
import Link from "next/link";

export default function QAPage() {
  const { tickets } = useTickets();
  const analytics = useMemo(() => computeAnalytics(tickets), [tickets]);
  const qa = analytics.qaCompliance;
  const gaps = analytics.knowledgeGaps;

  if (tickets.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">QA & Compliance</h1>
        <p className="text-gray-600 mb-4">No data loaded yet.</p>
        <Link href="/upload" className="text-blue-600 underline">
          Upload a CSV to get started
        </Link>
      </div>
    );
  }

  const sevColor = (s: "high" | "medium" | "low") =>
    s === "high"
      ? "bg-red-100 text-red-800 border-red-200"
      : s === "medium"
      ? "bg-orange-100 text-orange-800 border-orange-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold mb-1">QA & Compliance</h1>
        <p className="text-gray-600 text-sm">
          Auto-scored against the Wamsutta Customer Service Playbook & QA Audit Form. Rule-based
          checks across {qa.ticketsAudited} auditable tickets.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg Compliance Score" value={`${qa.avgComplianceScore}%`} color="blue" />
        <StatCard label="Pass Rate (≥85%)" value={`${qa.passRate}%`} color="green" />
        <StatCard label="Total Violations" value={qa.totalViolations.toString()} color="red" />
        <StatCard label="Tickets Audited" value={qa.ticketsAudited.toString()} color="gray" />
      </div>

      {/* Score Distribution */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="font-semibold text-lg mb-4">Score Distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          {qa.scoreDistribution.map((band) => (
            <div key={band.band} className="border rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{band.band}</p>
              <p className="text-2xl font-bold mt-1">{band.count}</p>
              <p className="text-xs text-gray-500 mt-1">
                {qa.ticketsAudited > 0
                  ? `${Math.round((band.count / qa.ticketsAudited) * 100)}%`
                  : "0%"}{" "}
                of audited
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Top Violations */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="font-semibold text-lg mb-1">Top Playbook Violations</h2>
        <p className="text-sm text-gray-600 mb-4">
          Most common rule failures — fix these first for the biggest QA lift
        </p>
        {qa.violations.length === 0 ? (
          <p className="text-sm text-gray-500">No violations detected — excellent!</p>
        ) : (
          <div className="space-y-3">
            {qa.violations.map((v) => {
              const violationTickets = tickets.filter((t) => v.ticketIds.includes(t.id));
              return (
                <div key={v.code} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {v.code}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${sevColor(v.severity)}`}
                        >
                          {v.severity}
                        </span>
                        <h3 className="font-semibold">{v.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{v.description}</p>
                      <p className="text-sm text-blue-700 mt-1">
                        <span className="font-semibold">Fix:</span> {v.fix}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold">{v.count}</p>
                      <p className="text-xs text-gray-500">tickets</p>
                    </div>
                  </div>
                  <TicketDrillDown
                    tickets={violationTickets}
                    label={`${v.code} violations`}
                    compact
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Knowledge gaps / website improvements */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h2 className="font-semibold text-lg mb-1">Website & Knowledge Improvement Signals</h2>
        <p className="text-sm text-gray-600 mb-4">
          Customer questions that suggest specific website, FAQ, or product page improvements
        </p>
        {gaps.length === 0 ? (
          <p className="text-sm text-gray-500">No knowledge gaps detected.</p>
        ) : (
          <div className="space-y-3">
            {gaps.map((g) => {
              const gapTickets = tickets.filter((t) => g.ticketIds.includes(t.id));
              return (
                <div key={g.topic} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${sevColor(g.severity)}`}
                        >
                          {g.severity}
                        </span>
                        <h3 className="font-semibold">{g.topic}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{g.description}</p>
                      <p className="text-sm text-blue-700 mt-1">
                        <span className="font-semibold">Suggested action:</span> {g.websiteAction}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold">{g.count}</p>
                      <p className="text-xs text-gray-500">mentions</p>
                    </div>
                  </div>
                  <TicketDrillDown tickets={gapTickets} label={g.topic} compact />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "red" | "gray";
}) {
  const colorClass = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    gray: "border-gray-200 bg-gray-50",
  }[color];
  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <p className="text-xs text-gray-600 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
