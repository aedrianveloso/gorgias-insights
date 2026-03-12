"use client";

import { useState, useRef } from "react";

interface CsvUploadProps {
  onUpload: (tickets: Record<string, unknown>[]) => Promise<void>;
}

export default function CsvUpload({ onUpload }: CsvUploadProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || "";
      });
      return row;
    });
  };

  const mapToTicket = (row: Record<string, string>): Record<string, unknown> => {
    return {
      subject: row.subject || row.title || row.ticket_subject || "Untitled",
      status: (row.status || "open").toLowerCase(),
      priority: (row.priority || "normal").toLowerCase(),
      channel: (row.channel || row.source || "email").toLowerCase(),
      created_at: row.created_at || row.created || row.date || new Date().toISOString(),
      closed_at: row.closed_at || row.closed || null,
      assignee_name: row.assignee_name || row.assignee || row.agent || null,
      customer_email: row.customer_email || row.customer || row.email || null,
      response_time_minutes: row.response_time_minutes || row.response_time
        ? parseInt(row.response_time_minutes || row.response_time)
        : null,
      resolution_time_minutes: row.resolution_time_minutes || row.resolution_time
        ? parseInt(row.resolution_time_minutes || row.resolution_time)
        : null,
      satisfaction_score: row.satisfaction_score || row.csat
        ? parseFloat(row.satisfaction_score || row.csat)
        : null,
      messages_count: parseInt(row.messages_count || row.messages || "1") || 1,
      tags: [],
    };
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCsv(text);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!fileRef.current?.files?.[0]) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const rows = parseCsv(text);
        const tickets = rows.map(mapToTicket);
        await onUpload(tickets);
        setPreview([]);
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
      };
      reader.readAsText(fileRef.current.files[0]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          ref={fileRef}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-gray-600 font-medium">
            {fileName || "Click to upload a CSV file"}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Columns: subject, status, priority, channel, created_at, assignee_name, customer_email,
            response_time_minutes, satisfaction_score
          </p>
        </label>
      </div>

      {preview.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Preview ({preview.length} of {fileName} rows):
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key} className="text-left p-2 text-gray-500">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="p-2 text-gray-600 max-w-[150px] truncate">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="mt-4 w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Uploading..." : `Upload ${preview.length}+ tickets`}
          </button>
        </div>
      )}
    </div>
  );
}
