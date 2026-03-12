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

  // Proper CSV parser that handles quoted fields with commas
  const parseCsv = (text: string): Record<string, string>[] => {
    const lines: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "\n" && !inQuotes) {
        lines.push(current);
        current = "";
      } else if (char === "\r" && !inQuotes) {
        // skip \r
      } else {
        current += char;
      }
    }
    if (current.trim()) lines.push(current);

    if (lines.length < 2) return [];

    const headers = splitCsvLine(lines[0]).map((h) =>
      h.trim().toLowerCase().replace(/\s+/g, "_")
    );

    // Find the index of the "tags" column to handle unquoted commas
    const tagsIndex = headers.indexOf("tags");

    return lines.slice(1).map((line) => {
      let values = splitCsvLine(line);

      // If row has more values than headers, the Tags field had unquoted commas
      // Merge the extra values back into the Tags field
      if (values.length > headers.length && tagsIndex >= 0) {
        const extraCount = values.length - headers.length;
        const tagParts = values.slice(tagsIndex, tagsIndex + 1 + extraCount);
        const mergedTags = tagParts.join(",");
        values = [
          ...values.slice(0, tagsIndex),
          mergedTags,
          ...values.slice(tagsIndex + 1 + extraCount),
        ];
      }

      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = (values[i] || "").trim();
      });
      return row;
    });
  };

  const splitCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const mapToTicket = (row: Record<string, string>): Record<string, unknown> => {
    // Get value by trying multiple possible column names
    const get = (...keys: string[]): string => {
      for (const key of keys) {
        if (row[key] && row[key].trim()) return row[key].trim();
      }
      return "";
    };

    const subject = get("subject", "title", "ticket_subject") || "Untitled";
    const channel = get("initial_channel", "channel", "source") || "email";
    const priority = get("priority") || "normal";
    const createdAt = get("creation_date", "created_at", "created", "date") || new Date().toISOString();
    const closedAt = get("closed_date", "closed_at", "closed") || null;
    const rawAssignee = get("assignee_name", "assignee", "agent") || null;
    const customerEmail = get("customer_email", "customer", "email") || null;
    const tags = get("tags");
    const surveyScore = get("survey_score", "satisfaction_score", "csat");
    const createdByAgent = get("created_by_an_agent");

    // Validate assignee name - must look like a real person's name
    const isValidName = (name: string | null): boolean => {
      if (!name) return false;
      // Must only contain letters, spaces, periods, hyphens, and apostrophes
      if (!/^[a-zA-Z][a-zA-Z\s.\-']+$/.test(name)) return false;
      // Must be reasonable length (2-40 chars)
      if (name.length < 2 || name.length > 40) return false;
      // Must contain at least one space or period (first + last name or initial)
      if (!/[\s.]/.test(name)) return false;
      return true;
    };
    const assigneeName = isValidName(rawAssignee) ? rawAssignee : null;

    // Response time: Gorgias exports in seconds, convert to minutes
    const firstResponseSec = get("first_response_time_(s)", "first_response_time_(seconds)", "response_time_minutes", "response_time");
    const resolutionSec = get("resolution_time_(s)", "resolution_time_(seconds)", "resolution_time_minutes", "resolution_time");
    const agentMessages = get("number_of_agent_messages", "messages_count", "messages");

    // Validate satisfaction score - should be between 0 and 5
    const rawSatisfaction = surveyScore ? parseFloat(surveyScore) : null;
    const validSatisfaction = rawSatisfaction !== null && !isNaN(rawSatisfaction) && rawSatisfaction >= 0 && rawSatisfaction <= 5 ? rawSatisfaction : null;

    // Determine status from closed_date
    let status = get("status");
    if (!status) {
      if (closedAt) {
        status = "closed";
      } else {
        status = "open";
      }
    }

    const responseMinutes = firstResponseSec ? Math.round(parseInt(firstResponseSec) / 60) : null;
    const resolutionMinutes = resolutionSec ? Math.round(parseInt(resolutionSec) / 60) : null;

    // Gorgias metadata fields
    const customerName = get("customer_name") || null;
    const contactReason = get("ticket_field:_contact_reason", "contact_reason") || null;
    const aiIntent = get("ticket_field:_ai_intent", "ai_intent") || null;
    const productCategory = get("ticket_field:_product", "product_category", "product") || null;
    const ticketUrl = get("ticket_url") || null;

    return {
      subject,
      status: status.toLowerCase(),
      priority: priority.toLowerCase(),
      channel: channel.toLowerCase(),
      created_at: createdAt,
      closed_at: closedAt,
      assignee_name: assigneeName,
      customer_email: customerEmail,
      response_time_minutes: responseMinutes !== null && !isNaN(responseMinutes) && responseMinutes >= 0 && responseMinutes < 525600 ? responseMinutes : null,
      resolution_time_minutes: resolutionMinutes !== null && !isNaN(resolutionMinutes) && resolutionMinutes >= 0 && resolutionMinutes < 525600 ? resolutionMinutes : null,
      satisfaction_score: validSatisfaction,
      messages_count: parseInt(agentMessages || "1") || 1,
      tags: tags ? tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      customer_name: customerName,
      contact_reason: contactReason,
      ai_intent: aiIntent,
      product_category: productCategory,
      ticket_url: ticketUrl,
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
      const text = await fileRef.current.files[0].text();
      const rows = parseCsv(text);
      const tickets = rows.map(mapToTicket);
      await onUpload(tickets);
      setPreview([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
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
            {fileName || "Click to upload a Gorgias CSV export"}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Supports Gorgias ticket exports with columns like Subject, Tags, Initial channel,
            Creation date, Assignee name, Customer email, etc.
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
                  {Object.keys(preview[0]).slice(0, 8).map((key) => (
                    <th key={key} className="text-left p-2 text-gray-500">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Object.values(row).slice(0, 8).map((val, j) => (
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
