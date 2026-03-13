import { GorgiasTicket } from "../types/gorgias";

// Column name variations for flexible matching
const COLUMN_MAPPINGS: Record<string, string[]> = {
  id: ["id", "ticket_id", "ticket id"],
  ticketUrl: ["ticket_url", "ticket url", "url", "link"],
  subject: ["subject", "title"],
  status: ["status"],
  channel: ["channel", "via"],
  createdAt: ["created_at", "created", "date_created", "created_datetime", "created datetime"],
  closedAt: ["closed_at", "closed", "closed_datetime", "closed datetime"],
  assigneeName: ["assignee_name", "assignee name", "assignee", "agent", "assigned_to"],
  customerEmail: ["customer_email", "customer email", "customer", "email", "requester_email"],
  responseTimeMinutes: [
    "first_response_time_(minutes)",
    "first_response_time_minutes",
    "first response time (minutes)",
    "first response time minutes",
    "response_time",
    "response_time_minutes",
    "first_response_time",
  ],
  resolutionTimeMinutes: [
    "full_resolution_time_(minutes)",
    "full_resolution_time_minutes",
    "full resolution time (minutes)",
    "full resolution time minutes",
    "resolution_time",
    "resolution_time_minutes",
    "full_resolution_time",
  ],
  satisfactionScore: ["satisfaction_score", "satisfaction score", "csat", "satisfaction_rating", "csat_score"],
  tags: ["tags", "labels"],
  messagesCount: ["messages_count", "messages count", "messages", "message_count"],
  aiIntent: ["ticket_field:_ai_intent", "ticket field: ai intent", "ai_intent", "ai intent", "intent"],
  contactReason: ["ticket_field:_contact_reason", "ticket field: contact reason", "contact_reason", "contact reason"],
  product: ["ticket_field:_product", "ticket field: product", "product"],
  resolution: ["ticket_field:_resolution", "ticket field: resolution", "resolution"],
  managedSentiment: ["managed_sentiment", "managed sentiment", "sentiment", "ticket_field:_managed_sentiment", "ticket field: managed sentiment"],
  emailBody: ["email_body", "email body", "body", "message_body", "email_content"],
};

/**
 * Parse CSV text that may contain quoted fields with commas, escaped quotes (""),
 * and newlines inside quoted fields.
 * Returns an array of string arrays (rows of fields).
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      currentField += char;
      i++;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (char === "\r") {
        // Handle \r\n or standalone \r
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        if (i + 1 < csvText.length && csvText[i + 1] === "\n") {
          i += 2;
        } else {
          i++;
        }
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Build a mapping from our field names to CSV column indices.
 * Case-insensitive, trims whitespace.
 */
function buildColumnMap(headers: string[]): Record<string, number> {
  // Normalize: lowercase, trim, replace spaces with underscores, strip parentheses
  const normalizedHeaders = headers.map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, "")
  );
  const columnMap: Record<string, number> = {};

  for (const [fieldName, variations] of Object.entries(COLUMN_MAPPINGS)) {
    for (const variation of variations) {
      const normalizedVariation = variation.toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, "");
      const idx = normalizedHeaders.indexOf(normalizedVariation);
      if (idx !== -1) {
        columnMap[fieldName] = idx;
        break;
      }
    }
  }

  return columnMap;
}

/**
 * Get a string value from a row by field name, using the column map.
 */
function getString(row: string[], columnMap: Record<string, number>, field: string): string {
  const idx = columnMap[field];
  if (idx === undefined || idx >= row.length) return "";
  return (row[idx] || "").trim();
}

/**
 * Get a numeric value from a row by field name.
 */
function getNumber(row: string[], columnMap: Record<string, number>, field: string): number {
  const raw = getString(row, columnMap, field);
  if (!raw) return 0;
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse AI Intent string like "Exchange::Request::Other" into category/subCategory/detail.
 */
function parseIntentParts(intent: string): {
  intentCategory: string;
  intentSubCategory: string;
  intentDetail: string;
} {
  if (!intent) {
    return { intentCategory: "", intentSubCategory: "", intentDetail: "" };
  }
  const parts = intent.split("::").map((p) => p.trim());
  return {
    intentCategory: parts[0] || "",
    intentSubCategory: parts[1] || "",
    intentDetail: parts[2] || "",
  };
}

/**
 * Parse Contact Reason into category/detail (split on "::").
 */
function parseContactReasonParts(reason: string): {
  contactCategory: string;
  contactDetail: string;
} {
  if (!reason) {
    return { contactCategory: "", contactDetail: "" };
  }
  const parts = reason.split("::").map((p) => p.trim());
  return {
    contactCategory: parts[0] || "",
    contactDetail: parts.slice(1).join("::") || "",
  };
}

/**
 * Parse tags from a string. Supports comma-separated or semicolon-separated tags.
 */
function parseTags(raw: string): string[] {
  if (!raw) return [];
  // Try comma-separated first, then semicolon
  const separator = raw.includes(";") ? ";" : ",";
  return raw
    .split(separator)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Parse a Gorgias CSV export into GorgiasTicket[].
 *
 * Handles:
 * - Quoted fields with commas inside
 * - Escaped quotes ("")
 * - Newlines inside quoted fields
 * - Flexible column name matching (case-insensitive, multiple variations)
 * - AI Intent parsing into category/subCategory/detail
 * - Contact Reason parsing into category/detail
 */
export function parseGorgiasCsv(csvText: string): { tickets: GorgiasTicket[]; fileName?: string } {
  if (!csvText || !csvText.trim()) {
    return { tickets: [] };
  }

  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return { tickets: [] };
  }

  const headers = rows[0];
  const columnMap = buildColumnMap(headers);

  // Debug: log column mapping so we can verify it's working
  console.log("[CSV Parser] Headers found:", headers);
  console.log("[CSV Parser] Column mapping:", columnMap);
  console.log("[CSV Parser] Unmapped fields:", Object.keys(COLUMN_MAPPINGS).filter(f => !(f in columnMap)));

  const tickets: GorgiasTicket[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    // Skip empty rows
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
      continue;
    }

    const aiIntent = getString(row, columnMap, "aiIntent");
    const { intentCategory, intentSubCategory, intentDetail } = parseIntentParts(aiIntent);

    const contactReason = getString(row, columnMap, "contactReason");
    const { contactCategory, contactDetail } = parseContactReasonParts(contactReason);

    const ticket: GorgiasTicket = {
      id: getNumber(row, columnMap, "id"),
      ticketUrl: getString(row, columnMap, "ticketUrl"),
      subject: getString(row, columnMap, "subject"),
      status: getString(row, columnMap, "status"),
      channel: getString(row, columnMap, "channel"),
      createdAt: getString(row, columnMap, "createdAt"),
      closedAt: getString(row, columnMap, "closedAt"),
      assigneeName: getString(row, columnMap, "assigneeName"),
      customerEmail: getString(row, columnMap, "customerEmail"),
      responseTimeMinutes: getNumber(row, columnMap, "responseTimeMinutes"),
      resolutionTimeMinutes: getNumber(row, columnMap, "resolutionTimeMinutes"),
      satisfactionScore: getNumber(row, columnMap, "satisfactionScore"),
      tags: parseTags(getString(row, columnMap, "tags")),
      messagesCount: getNumber(row, columnMap, "messagesCount"),
      aiIntent,
      intentCategory,
      intentSubCategory,
      intentDetail,
      contactReason,
      contactCategory,
      contactDetail,
      product: getString(row, columnMap, "product"),
      resolution: getString(row, columnMap, "resolution"),
      managedSentiment: getString(row, columnMap, "managedSentiment"),
      emailBody: getString(row, columnMap, "emailBody"),
    };

    tickets.push(ticket);
  }

  return { tickets };
}
