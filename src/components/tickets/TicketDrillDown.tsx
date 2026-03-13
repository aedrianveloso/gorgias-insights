"use client";
import { useState } from "react";
import type { GorgiasTicket } from "@/types/gorgias";

interface TicketDrillDownProps {
  tickets: GorgiasTicket[];
  label: string;
  maxInitial?: number;
  compact?: boolean;
}

export default function TicketDrillDown({ tickets, label, maxInitial = 10, compact = false }: TicketDrillDownProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (tickets.length === 0) return null;

  const displayed = showAll ? tickets : tickets.slice(0, maxInitial);

  // Extract ticket number from URL pattern /ticket/(\d+)/
  function ticketNumber(t: GorgiasTicket): string {
    const match = t.ticketUrl?.match(/\/ticket\/(\d+)/);
    return match ? `#${match[1]}` : `#${t.id}`;
  }

  function TicketLink({ t }: { t: GorgiasTicket }) {
    const num = ticketNumber(t);
    if (t.ticketUrl) {
      return (
        <a href={t.ticketUrl} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-medium">
          {num}
        </a>
      );
    }
    return <span className="font-medium text-gray-900">{num}</span>;
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
      >
        {expanded ? "Hide" : "View"} {tickets.length} {label}
      </button>

      {expanded && (
        <div className="mt-2 border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-2 py-2 text-left font-medium text-gray-500">Ticket</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Intent</th>
                {!compact && <th className="px-2 py-2 text-left font-medium text-gray-500">Contact Reason</th>}
                {!compact && <th className="px-2 py-2 text-left font-medium text-gray-500">Agent</th>}
                <th className="px-2 py-2 text-left font-medium text-gray-500">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <TicketLink t={t} />
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 truncate max-w-[100px]">{t.intentCategory || "—"}</td>
                  {!compact && <td className="px-2 py-1.5 text-gray-600 truncate max-w-[120px]">{t.contactReason || "—"}</td>}
                  {!compact && <td className="px-2 py-1.5 text-gray-600 truncate max-w-[80px]">{t.assigneeName || "—"}</td>}
                  <td className="px-2 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      (t.managedSentiment || "").toLowerCase().includes("positive")
                        ? "bg-green-100 text-green-700"
                        : (t.managedSentiment || "").toLowerCase().includes("negative")
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {t.managedSentiment || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length > maxInitial && !showAll && (
            <div className="px-2 py-2 bg-gray-50 border-t">
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Show all {tickets.length} tickets
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
