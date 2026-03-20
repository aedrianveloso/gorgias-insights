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
 * Strip BOM (Byte Order Mark) from the beginning of text.
 * Common in CSV files exported from Excel and Gorgias.
 */
function stripBom(text: string): string {
  // UTF-8 BOM: \uFEFF, also handle other variants
  if (text.charCodeAt(0) === 0xFEFF) return text.slice(1);
  // Sometimes BOM appears as these bytes in decoded text
  if (text.startsWith('\xEF\xBB\xBF')) return text.slice(3);
  return text;
}

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
 * Normalize a header string: lowercase, trim, replace spaces/special chars with underscores,
 * strip parentheses, collapse multiple underscores.
 */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
    .replace(/[()]/g, "")      // strip parens
    .replace(/\s+/g, "_")      // spaces → underscores
    .replace(/[^\w:]/g, "_")   // non-word chars (except :) → underscores
    .replace(/_+/g, "_")       // collapse multiple underscores
    .replace(/^_|_$/g, "");    // trim leading/trailing underscores
}

/**
 * Build a mapping from our field names to CSV column indices.
 * Uses exact match first, then fuzzy/contains matching as fallback.
 */
function buildColumnMap(headers: string[]): Record<string, number> {
  const normalizedHeaders = headers.map(normalizeHeader);
  const columnMap: Record<string, number> = {};

  for (const [fieldName, variations] of Object.entries(COLUMN_MAPPINGS)) {
    // Pass 1: exact match after normalization
    let found = false;
    for (const variation of variations) {
      const normalizedVariation = normalizeHeader(variation);
      const idx = normalizedHeaders.indexOf(normalizedVariation);
      if (idx !== -1) {
        columnMap[fieldName] = idx;
        found = true;
        break;
      }
    }
    if (found) continue;

    // Pass 2: contains-based fuzzy match (for headers with extra text)
    for (const variation of variations) {
      const normalizedVariation = normalizeHeader(variation);
      if (normalizedVariation.length < 3) continue; // skip very short patterns
      const idx = normalizedHeaders.findIndex(
        (h) => h.includes(normalizedVariation) || normalizedVariation.includes(h)
      );
      if (idx !== -1 && !(Object.values(columnMap).includes(idx))) {
        columnMap[fieldName] = idx;
        found = true;
        break;
      }
    }
    if (found) continue;

    // Pass 3: keyword match for common fields (last resort)
    const keywordMap: Record<string, string[]> = {
      status: ["status"],
      channel: ["channel", "via"],
      closedAt: ["closed_d", "closed_at"],
      assigneeName: ["assignee", "agent_name"],
      satisfactionScore: ["satisfaction", "csat"],
      messagesCount: ["messages_count", "message_count", "messages"],
      responseTimeMinutes: ["response_time", "first_response"],
      resolutionTimeMinutes: ["resolution_time", "full_resolution"],
    };
    const keywords = keywordMap[fieldName];
    if (keywords) {
      for (const kw of keywords) {
        const idx = normalizedHeaders.findIndex((h) => h.includes(kw));
        if (idx !== -1 && !(Object.values(columnMap).includes(idx))) {
          columnMap[fieldName] = idx;
          break;
        }
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
 * Parse a time value that could be minutes (number), HH:MM:SS, or MM:SS format.
 * Always returns minutes.
 */
function parseTimeMinutes(row: string[], columnMap: Record<string, number>, field: string): number {
  const raw = getString(row, columnMap, field);
  if (!raw) return 0;

  // Check for HH:MM:SS or MM:SS format
  const timeParts = raw.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (timeParts) {
    if (timeParts[3] !== undefined) {
      // HH:MM:SS
      const hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const seconds = parseInt(timeParts[3]);
      return hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
    } else {
      // MM:SS
      const minutes = parseInt(timeParts[1]);
      const seconds = parseInt(timeParts[2]);
      return minutes + (seconds >= 30 ? 1 : 0);
    }
  }

  // Plain number (assumed minutes)
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : Math.round(num);
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

  // Strip BOM character that Excel/Gorgias may add
  const cleanText = stripBom(csvText);

  const rows = parseCsvRows(cleanText);
  if (rows.length < 2) {
    return { tickets: [] };
  }

  const headers = rows[0];
  const columnMap = buildColumnMap(headers);

  // Debug: log raw headers, normalized headers, column mapping, and unmapped fields
  const normalizedHeaders = headers.map(normalizeHeader);
  console.log("[CSV Parser] Raw headers:", headers);
  console.log("[CSV Parser] Normalized headers:", normalizedHeaders);
  console.log("[CSV Parser] Column mapping:", columnMap);
  console.log("[CSV Parser] Unmapped fields:", Object.keys(COLUMN_MAPPINGS).filter(f => !(f in columnMap)));
  console.log("[CSV Parser] Header char codes (first 3):", headers.slice(0, 3).map(h => Array.from(h).map(c => c.charCodeAt(0))));

  const tickets: GorgiasTicket[] = [];

  // Detect if time values are actually in seconds (Gorgias often exports seconds
  // despite the column header saying "minutes"). Sample first 50 rows to check.
  let timeUnitDivisor = 1;
  const sampleSize = Math.min(50, rows.length - 1);
  if (sampleSize > 0) {
    const sampleResponseTimes: number[] = [];
    const sampleResolutionTimes: number[] = [];
    for (let s = 1; s <= sampleSize; s++) {
      const row = rows[s];
      const rt = parseTimeMinutes(row, columnMap, "responseTimeMinutes");
      const res = parseTimeMinutes(row, columnMap, "resolutionTimeMinutes");
      if (rt > 0) sampleResponseTimes.push(rt);
      if (res > 0) sampleResolutionTimes.push(res);
    }
    // If median response or resolution time > 600 (10 hours in minutes),
    // the values are almost certainly in seconds, not minutes
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    const medianResponse = median(sampleResponseTimes);
    const medianResolution = median(sampleResolutionTimes);
    if (medianResponse > 600 || medianResolution > 600) {
      timeUnitDivisor = 60;
      console.log("[CSV Parser] Detected time values are in seconds, converting to minutes (median response:", medianResponse, "median resolution:", medianResolution, ")");
    }
  }

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
      responseTimeMinutes: Math.round(parseTimeMinutes(row, columnMap, "responseTimeMinutes") / timeUnitDivisor),
      resolutionTimeMinutes: Math.round(parseTimeMinutes(row, columnMap, "resolutionTimeMinutes") / timeUnitDivisor),
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

  // Debug: log first ticket with ALL fields + raw row data
  if (tickets.length > 0) {
    const t = tickets[0];
    console.log("[CSV Parser] First ticket (all fields):", {
      id: t.id, ticketUrl: t.ticketUrl, subject: t.subject,
      status: t.status, channel: t.channel,
      createdAt: t.createdAt, closedAt: t.closedAt,
      assigneeName: t.assigneeName, customerEmail: t.customerEmail,
      responseTimeMinutes: t.responseTimeMinutes, resolutionTimeMinutes: t.resolutionTimeMinutes,
      satisfactionScore: t.satisfactionScore, messagesCount: t.messagesCount,
      tags: t.tags, aiIntent: t.aiIntent, contactReason: t.contactReason,
      product: t.product, resolution: t.resolution,
      managedSentiment: t.managedSentiment,
      hasEmailBody: (t.emailBody?.length || 0) > 10,
    });
    console.log("[CSV Parser] First raw row:", rows[1]);
    // Log status distribution for quick debugging
    const statusCounts: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};
    tickets.forEach(tk => {
      statusCounts[tk.status || "(empty)"] = (statusCounts[tk.status || "(empty)"] || 0) + 1;
      channelCounts[tk.channel || "(empty)"] = (channelCounts[tk.channel || "(empty)"] || 0) + 1;
    });
    console.log("[CSV Parser] Status distribution:", statusCounts);
    console.log("[CSV Parser] Channel distribution:", channelCounts);
  }

  return { tickets };
}
