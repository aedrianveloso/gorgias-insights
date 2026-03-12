"use client";

import { useRef, useState } from "react";
import { useTickets } from "@/lib/ticket-store";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const { uploadCsv, tickets, fileName, clear } = useTickets();
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [localFileName, setLocalFileName] = useState("");
  const [rawText, setRawText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);

      // Quick preview: first 5 rows
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      const h = lines[0]?.split(",").map((s) => s.trim().replace(/^"|"$/g, "")) || [];
      setHeaders(h);
      const rows = lines.slice(1, 6).map((l) =>
        l.split(",").map((s) => s.trim().replace(/^"|"$/g, "").substring(0, 60))
      );
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleUpload = () => {
    if (!rawText) return;
    uploadCsv(rawText, localFileName);
    router.push("/");
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Upload Data</h2>
        <p className="text-gray-500 mt-1">Import your Gorgias CSV export for analysis</p>
      </div>

      {tickets.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-sm text-green-700 font-medium">
              Currently loaded: {tickets.length} tickets from {fileName}
            </p>
          </div>
          <button
            onClick={clear}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Clear data
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload CSV</h3>
        <p className="text-sm text-gray-500 mb-4">
          Export your tickets from Gorgias (Statistics → Download data) and upload the CSV here.
          The parser auto-detects columns like Ticket URL, Email Body, AI Intent, Contact reason, Product, etc.
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors mb-4">
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
              {localFileName || "Click to select a CSV file"}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Supported columns: Ticket URL, Email Body, AI Intent, Contact reason, Product, Resolution, Managed sentiment, Tags, and more
            </p>
          </label>
        </div>

        {preview.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Preview (first {preview.length} rows, {headers.length} columns detected):
            </p>
            <div className="overflow-x-auto max-h-[300px] border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="text-left p-2 text-gray-500 font-medium whitespace-nowrap border-b">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {row.map((val, j) => (
                        <td key={j} className="p-2 text-gray-600 max-w-[150px] truncate whitespace-nowrap">
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
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Analyze Data
            </button>
          </div>
        )}
      </div>

      {/* Column mapping guide */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expected CSV Columns</h3>
        <p className="text-sm text-gray-500 mb-4">The parser auto-maps these columns. Not all are required.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            { col: "Ticket URL", desc: "Link to the Gorgias ticket" },
            { col: "Email Body", desc: "Full conversation text (you add this manually)" },
            { col: "Ticket Field: AI Intent", desc: "e.g. Exchange::Request::Other" },
            { col: "Ticket Field: Contact reason", desc: "e.g. Pre-sale::Product question" },
            { col: "Ticket Field: Product", desc: "Product mentioned in ticket" },
            { col: "Ticket Field: Resolution", desc: "How the ticket was resolved" },
            { col: "Ticket Field: Managed sentiment", desc: "Positive, Negative, etc." },
            { col: "Tags", desc: "Comma-separated tags" },
            { col: "Status", desc: "open, closed, pending" },
            { col: "Channel", desc: "email, facebook, etc." },
            { col: "Assignee Name", desc: "Agent who handled the ticket" },
            { col: "Messages Count", desc: "Number of messages in thread" },
          ].map((item) => (
            <div key={item.col} className="flex gap-2">
              <span className="text-gray-900 font-medium whitespace-nowrap">{item.col}:</span>
              <span className="text-gray-500">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
