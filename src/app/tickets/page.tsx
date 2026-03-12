"use client";

import { useState, useEffect, useCallback } from "react";
import TicketForm from "@/components/tickets/TicketForm";
import CsvUpload from "@/components/tickets/CsvUpload";
import { getTickets, addTicket, addTicketsBatch, deleteTicket } from "@/lib/api";
import type { Ticket } from "@/types/gorgias";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"form" | "csv">("form");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const data = await getTickets();
      setTickets(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load tickets. Have you run the SQL schema?" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleAddTicket = async (ticket: Record<string, unknown>) => {
    try {
      await addTicket(ticket as Omit<Ticket, "id">);
      setMessage({ type: "success", text: "Ticket added successfully!" });
      loadTickets();
    } catch {
      setMessage({ type: "error", text: "Failed to add ticket. Check your Supabase connection." });
    }
  };

  const handleCsvUpload = async (tickets: Record<string, unknown>[]) => {
    try {
      await addTicketsBatch(tickets as Omit<Ticket, "id">[]);
      setMessage({ type: "success", text: `${tickets.length} tickets uploaded successfully!` });
      loadTickets();
    } catch {
      setMessage({ type: "error", text: "Failed to upload tickets." });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTicket(id);
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setMessage({ type: "error", text: "Failed to delete ticket." });
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "closed": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "normal": return "bg-blue-100 text-blue-700";
      case "low": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Tickets</h2>
        <p className="text-gray-500 mt-1">Add and manage your support ticket data</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right font-bold"
          >
            x
          </button>
        </div>
      )}

      {/* Add Ticket Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("form")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "form"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "csv"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            CSV Upload
          </button>
        </div>

        {activeTab === "form" ? (
          <TicketForm onSubmit={handleAddTicket} />
        ) : (
          <CsvUpload onUpload={handleCsvUpload} />
        )}
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          All Tickets ({tickets.length})
        </h3>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-lg">No tickets yet</p>
            <p className="text-sm mt-1">Add tickets using the form above or upload a CSV</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-sm font-medium text-gray-500">Subject</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Priority</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Channel</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Assignee</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">Created</th>
                  <th className="pb-3 text-sm font-medium text-gray-500">CSAT</th>
                  <th className="pb-3 text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 text-sm text-gray-900 max-w-[200px] truncate">
                      {ticket.subject}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-600">{ticket.channel}</td>
                    <td className="py-3 text-sm text-gray-600">
                      {ticket.assignee_name || "-"}
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {ticket.satisfaction_score ?? "-"}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDelete(ticket.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
