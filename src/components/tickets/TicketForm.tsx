"use client";

import { useState } from "react";

interface TicketFormData {
  subject: string;
  status: "open" | "closed" | "pending";
  priority: "low" | "normal" | "high" | "urgent";
  channel: string;
  created_at: string;
  closed_at: string;
  assignee_name: string;
  customer_email: string;
  response_time_minutes: string;
  resolution_time_minutes: string;
  satisfaction_score: string;
  messages_count: string;
}

const initialForm: TicketFormData = {
  subject: "",
  status: "open",
  priority: "normal",
  channel: "email",
  created_at: new Date().toISOString().slice(0, 16),
  closed_at: "",
  assignee_name: "",
  customer_email: "",
  response_time_minutes: "",
  resolution_time_minutes: "",
  satisfaction_score: "",
  messages_count: "1",
};

interface TicketFormProps {
  onSubmit: (ticket: Record<string, unknown>) => Promise<void>;
}

export default function TicketForm({ onSubmit }: TicketFormProps) {
  const [form, setForm] = useState<TicketFormData>(initialForm);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        subject: form.subject,
        status: form.status,
        priority: form.priority,
        channel: form.channel,
        created_at: new Date(form.created_at).toISOString(),
        closed_at: form.closed_at ? new Date(form.closed_at).toISOString() : null,
        assignee_name: form.assignee_name || null,
        customer_email: form.customer_email || null,
        response_time_minutes: form.response_time_minutes
          ? parseInt(form.response_time_minutes)
          : null,
        resolution_time_minutes: form.resolution_time_minutes
          ? parseInt(form.resolution_time_minutes)
          : null,
        satisfaction_score: form.satisfaction_score
          ? parseFloat(form.satisfaction_score)
          : null,
        messages_count: parseInt(form.messages_count) || 1,
        tags: [],
      });
      setForm(initialForm);
    } finally {
      setLoading(false);
    }
  };

  const update = (field: keyof TicketFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelClass}>Subject *</label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            className={inputClass}
            placeholder="e.g. Order #1234 - Shipping delay"
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className={inputClass}
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Priority</label>
          <select
            value={form.priority}
            onChange={(e) => update("priority", e.target.value)}
            className={inputClass}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Channel</label>
          <select
            value={form.channel}
            onChange={(e) => update("channel", e.target.value)}
            className={inputClass}
          >
            <option value="email">Email</option>
            <option value="chat">Chat</option>
            <option value="social">Social Media</option>
            <option value="phone">Phone</option>
            <option value="sms">SMS</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Assignee</label>
          <input
            type="text"
            value={form.assignee_name}
            onChange={(e) => update("assignee_name", e.target.value)}
            className={inputClass}
            placeholder="Agent name"
          />
        </div>

        <div>
          <label className={labelClass}>Customer Email</label>
          <input
            type="email"
            value={form.customer_email}
            onChange={(e) => update("customer_email", e.target.value)}
            className={inputClass}
            placeholder="customer@example.com"
          />
        </div>

        <div>
          <label className={labelClass}>Created At</label>
          <input
            type="datetime-local"
            value={form.created_at}
            onChange={(e) => update("created_at", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Closed At</label>
          <input
            type="datetime-local"
            value={form.closed_at}
            onChange={(e) => update("closed_at", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Response Time (minutes)</label>
          <input
            type="number"
            value={form.response_time_minutes}
            onChange={(e) => update("response_time_minutes", e.target.value)}
            className={inputClass}
            placeholder="e.g. 15"
          />
        </div>

        <div>
          <label className={labelClass}>Resolution Time (minutes)</label>
          <input
            type="number"
            value={form.resolution_time_minutes}
            onChange={(e) => update("resolution_time_minutes", e.target.value)}
            className={inputClass}
            placeholder="e.g. 120"
          />
        </div>

        <div>
          <label className={labelClass}>CSAT Score (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            step="0.1"
            value={form.satisfaction_score}
            onChange={(e) => update("satisfaction_score", e.target.value)}
            className={inputClass}
            placeholder="e.g. 4.5"
          />
        </div>

        <div>
          <label className={labelClass}>Messages Count</label>
          <input
            type="number"
            min="1"
            value={form.messages_count}
            onChange={(e) => update("messages_count", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Adding..." : "Add Ticket"}
      </button>
    </form>
  );
}
