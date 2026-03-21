import { GorgiasTicket } from "../types/gorgias";

// Column name variations for flexible matching
const COLUMN_MAPPINGS: Record<string, string[]> = {
  id: ["id", "ticket_id", "ticket id", "ticket_id"],
  ticketUrl: ["ticket_url", "ticket url", "url", "link"],
  subject: ["subject", "title"],
  status: ["status"],
  channel: ["channel", "via", "initial_channel", "initial channel"],
  priority: ["priority"],
  createdAt: [
    "created_at", "created", "date_created", "created_datetime", "created datetime",
    "creation_date", "creation date",
  ],
  closedAt: [
    "closed_at", "closed", "closed_datetime", "closed datetime",
    "closed_date", "closed date",
  ],
  assigneeName: ["assignee_name", "assignee name", "assignee", "agent", "assigned_to"],
  assigneeEmail: ["assignee_email", "assignee email"],
  customerEmail: ["customer_email", "customer email", "customer", "email", "requester_email"],
  customerName: ["customer_name", "customer name"],
  customerType: [
    "customer_field:_customer_type", "customer field: customer type",
    "customer_type", "customer type",
  ],
  customerLastShopifyOrder: [
    "customer_last_shopify_order", "customer last shopify order",
  ],
  responseTimeMinutes: [
    "first_response_time_s", "first response time (s)", "first_response_time_(s)",
    "first_response_time_(minutes)", "first_response_time_minutes",
    "first response time (minutes)", "first response time minutes",
    "response_time", "response_time_minutes", "first_response_time",
  ],
  resolutionTimeMinutes: [
    "resolution_time_s", "resolution time (s)", "resolution_time_(s)",
    "full_resolution_time_(minutes)", "full_resolution_time_minutes",
    "full resolution time (minutes)", "full resolution time minutes",
    "resolution_time", "resolution_time_minutes", "full_resolution_time",
  ],
  satisfactionScore: [
    "survey_score", "survey score",
    "satisfaction_score", "satisfaction score", "csat", "satisfaction_rating", "csat_score",
  ],
  surveyComment: ["survey_comment", "survey comment"],
  surveyPresent: ["survey_present_y/n", "survey_present_(y/n)", "survey present (y/n)", "survey_present"],
  tags: ["tags", "labels"],
  agentMessagesCount: [
    "number_of_agent_messages", "number of agent messages",
  ],
  customerMessagesCount: [
    "number_of_customer_messages", "number of customer messages",
  ],
  messagesCount: [
    "messages_count", "messages count", "messages", "message_count",
  ],
  respondingAgents: [
    "responding_agents_unique", "responding agents (unique)", "responding_agents_(unique)",
  ],
  aiIntent: ["ticket_field:_ai_intent", "ticket field: ai intent", "ai_intent", "ai intent", "intent"],
  contactReason: ["ticket_field:_contact_reason", "ticket field: contact reason", "contact_reason", "contact reason"],
  product: ["ticket_field:_product", "ticket field: product", "product"],
  resolution: ["ticket_field:_resolution", "ticket field: resolution", "resolution"],
  managedSentiment: [
    "managed_sentiment", "managed sentiment", "sentiment",
    "ticket_field:_managed_sentiment", "ticket field: managed sentiment",
  ],
  aiAgentSalesDiscount: [
    "ticket_field:_ai_agent_sales_discount", "ticket field: ai agent sales discount",
  ],
  aiAgentSalesOpportunity: [
    "ticket_field:_ai_agent_sales_opportunity", "ticket field: ai agent sales opportunity",
  ],
  aiAgentOutcome: [
    "ticket_field:_ai_agent_outcome", "ticket field: ai agent outcome",
  ],
  customerMessages: [
    "customer_messages_all", "customer messages (all)", "customer_messages_(all)",
    "customer_messages", "customer messages",
    // Legacy email body support
    "email_body", "email body", "body", "message_body", "email_content",
  ],
  createdByAgent: ["created_by_an_agent", "created by an agent"],
};

/**
 * Strip BOM (Byte Order Mark) from the beginning of text.
 */
function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xFEFF) return text.slice(1);
  if (text.startsWith('\xEF\xBB\xBF')) return text.slice(3);
  return text;
}

/**
 * Parse CSV text with proper RFC 4180 handling.
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
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
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
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
        if (i + 1 < csvText.length && csvText[i + 1] === "\n") i += 2;
        else i++;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 0) rows.push(currentRow);
  }

  return rows;
}

/**
 * Normalize a header string for matching.
 */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w:/]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Build a mapping from field names to CSV column indices.
 */
function buildColumnMap(headers: string[]): Record<string, number> {
  const normalizedHeaders = headers.map(normalizeHeader);
  const columnMap: Record<string, number> = {};

  for (const [fieldName, variations] of Object.entries(COLUMN_MAPPINGS)) {
    // Pass 1: exact match
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

    // Pass 2: contains-based fuzzy match
    for (const variation of variations) {
      const normalizedVariation = normalizeHeader(variation);
      if (normalizedVariation.length < 3) continue;
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

    // Pass 3: keyword fallback
    const keywordMap: Record<string, string[]> = {
      status: ["status"],
      channel: ["channel", "via"],
      closedAt: ["closed_d", "closed_at"],
      assigneeName: ["assignee", "agent_name"],
      satisfactionScore: ["satisfaction", "csat", "survey_score"],
      messagesCount: ["messages_count", "message_count"],
      responseTimeMinutes: ["response_time", "first_response"],
      resolutionTimeMinutes: ["resolution_time"],
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

function getString(row: string[], columnMap: Record<string, number>, field: string): string {
  const idx = columnMap[field];
  if (idx === undefined || idx >= row.length) return "";
  return (row[idx] || "").trim();
}

function getNumber(row: string[], columnMap: Record<string, number>, field: string): number {
  const raw = getString(row, columnMap, field);
  if (!raw) return 0;
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : num;
}

function parseTimeValue(row: string[], columnMap: Record<string, number>, field: string): number {
  const raw = getString(row, columnMap, field);
  if (!raw) return 0;

  // Check for HH:MM:SS or MM:SS format
  const timeParts = raw.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (timeParts) {
    if (timeParts[3] !== undefined) {
      const hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const seconds = parseInt(timeParts[3]);
      return hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
    } else {
      const minutes = parseInt(timeParts[1]);
      const seconds = parseInt(timeParts[2]);
      return minutes + (seconds >= 30 ? 1 : 0);
    }
  }

  // Plain number
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : Math.round(num);
}

function parseIntentParts(intent: string) {
  if (!intent) return { intentCategory: "", intentSubCategory: "", intentDetail: "" };
  const parts = intent.split("::").map((p) => p.trim());
  return {
    intentCategory: parts[0] || "",
    intentSubCategory: parts[1] || "",
    intentDetail: parts[2] || "",
  };
}

function parseContactReasonParts(reason: string) {
  if (!reason) return { contactCategory: "", contactDetail: "" };
  const parts = reason.split("::").map((p) => p.trim());
  return {
    contactCategory: parts[0] || "",
    contactDetail: parts.slice(1).join("::") || "",
  };
}

function parseTags(raw: string): string[] {
  if (!raw) return [];
  const separator = raw.includes(";") ? ";" : ",";
  return raw.split(separator).map((t) => t.trim()).filter((t) => t.length > 0);
}

/**
 * Detect whether time column headers explicitly say "(s)" for seconds.
 */
function detectTimeHeaderUnit(headers: string[]): boolean {
  const normalized = headers.map((h) => h.toLowerCase());
  return normalized.some((h) =>
    (h.includes("response time") || h.includes("resolution time")) && h.includes("(s)")
  );
}

export function parseGorgiasCsv(csvText: string): { tickets: GorgiasTicket[]; fileName?: string } {
  if (!csvText || !csvText.trim()) return { tickets: [] };

  const cleanText = stripBom(csvText);
  const rows = parseCsvRows(cleanText);
  if (rows.length < 2) return { tickets: [] };

  const headers = rows[0];
  const columnMap = buildColumnMap(headers);

  // Debug logging
  const normalizedHeaders = headers.map(normalizeHeader);
  console.log("[CSV Parser] Raw headers:", headers);
  console.log("[CSV Parser] Normalized headers:", normalizedHeaders);
  console.log("[CSV Parser] Column mapping:", columnMap);
  console.log("[CSV Parser] Unmapped fields:", Object.keys(COLUMN_MAPPINGS).filter(f => !(f in columnMap)));

  // Detect time units: if headers explicitly say "(s)" or auto-detect from values
  let timeIsSeconds = detectTimeHeaderUnit(headers);

  if (!timeIsSeconds) {
    // Auto-detect from values: sample first 50 rows
    const sampleSize = Math.min(50, rows.length - 1);
    if (sampleSize > 0) {
      const sampleTimes: number[] = [];
      for (let s = 1; s <= sampleSize; s++) {
        const rt = parseTimeValue(rows[s], columnMap, "responseTimeMinutes");
        const res = parseTimeValue(rows[s], columnMap, "resolutionTimeMinutes");
        if (rt > 0) sampleTimes.push(rt);
        if (res > 0) sampleTimes.push(res);
      }
      const sorted = [...sampleTimes].sort((a, b) => a - b);
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
      if (median > 600) {
        timeIsSeconds = true;
      }
    }
  }

  if (timeIsSeconds) {
    console.log("[CSV Parser] Time values are in seconds, converting to minutes");
  }

  const timeDivisor = timeIsSeconds ? 60 : 1;
  const tickets: GorgiasTicket[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const aiIntent = getString(row, columnMap, "aiIntent");
    const { intentCategory, intentSubCategory, intentDetail } = parseIntentParts(aiIntent);

    const contactReason = getString(row, columnMap, "contactReason");
    const { contactCategory, contactDetail } = parseContactReasonParts(contactReason);

    const customerMessages = getString(row, columnMap, "customerMessages");
    const surveyPresentRaw = getString(row, columnMap, "surveyPresent").toLowerCase();

    // messagesCount: prefer sum of agent + customer messages if available
    const agentMsgs = getNumber(row, columnMap, "agentMessagesCount");
    const customerMsgs = getNumber(row, columnMap, "customerMessagesCount");
    let messagesCount = getNumber(row, columnMap, "messagesCount");
    if (messagesCount === 0 && (agentMsgs > 0 || customerMsgs > 0)) {
      messagesCount = agentMsgs + customerMsgs;
    }

    const ticket: GorgiasTicket = {
      id: getNumber(row, columnMap, "id"),
      ticketUrl: getString(row, columnMap, "ticketUrl"),
      subject: getString(row, columnMap, "subject"),
      status: getString(row, columnMap, "status"),
      channel: getString(row, columnMap, "channel"),
      priority: getString(row, columnMap, "priority"),
      createdAt: getString(row, columnMap, "createdAt"),
      closedAt: getString(row, columnMap, "closedAt"),
      assigneeName: getString(row, columnMap, "assigneeName"),
      assigneeEmail: getString(row, columnMap, "assigneeEmail"),
      customerEmail: getString(row, columnMap, "customerEmail"),
      customerName: getString(row, columnMap, "customerName"),
      customerType: getString(row, columnMap, "customerType"),
      customerLastShopifyOrder: getString(row, columnMap, "customerLastShopifyOrder"),
      responseTimeMinutes: Math.round(parseTimeValue(row, columnMap, "responseTimeMinutes") / timeDivisor),
      resolutionTimeMinutes: Math.round(parseTimeValue(row, columnMap, "resolutionTimeMinutes") / timeDivisor),
      satisfactionScore: getNumber(row, columnMap, "satisfactionScore"),
      surveyComment: getString(row, columnMap, "surveyComment"),
      surveyPresent: surveyPresentRaw === "y" || surveyPresentRaw === "yes" || surveyPresentRaw === "true",
      tags: parseTags(getString(row, columnMap, "tags")),
      messagesCount,
      agentMessagesCount: agentMsgs,
      customerMessagesCount: customerMsgs,
      respondingAgents: getString(row, columnMap, "respondingAgents"),
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
      aiAgentSalesDiscount: getString(row, columnMap, "aiAgentSalesDiscount"),
      aiAgentSalesOpportunity: getString(row, columnMap, "aiAgentSalesOpportunity"),
      aiAgentOutcome: getString(row, columnMap, "aiAgentOutcome"),
      customerMessages,
      emailBody: customerMessages, // alias for backward compat
      createdByAgent: getString(row, columnMap, "createdByAgent").toLowerCase() === "true" ||
                      getString(row, columnMap, "createdByAgent").toLowerCase() === "yes" ||
                      getString(row, columnMap, "createdByAgent").toLowerCase() === "y",
    };

    tickets.push(ticket);
  }

  // Debug: log first ticket
  if (tickets.length > 0) {
    const t = tickets[0];
    console.log("[CSV Parser] First ticket:", {
      id: t.id, subject: t.subject, status: t.status, channel: t.channel,
      priority: t.priority, createdAt: t.createdAt, closedAt: t.closedAt,
      assigneeName: t.assigneeName, customerName: t.customerName, customerType: t.customerType,
      responseTimeMinutes: t.responseTimeMinutes, resolutionTimeMinutes: t.resolutionTimeMinutes,
      satisfactionScore: t.satisfactionScore, surveyComment: t.surveyComment?.substring(0, 50),
      messagesCount: t.messagesCount, agentMsgs: t.agentMessagesCount, customerMsgs: t.customerMessagesCount,
      aiIntent: t.aiIntent, contactReason: t.contactReason, product: t.product,
      managedSentiment: t.managedSentiment, aiAgentOutcome: t.aiAgentOutcome,
      hasCustomerMessages: (t.customerMessages?.length || 0) > 10,
    });
    // Status distribution
    const statusCounts: Record<string, number> = {};
    tickets.forEach(tk => {
      statusCounts[tk.status || "(empty)"] = (statusCounts[tk.status || "(empty)"] || 0) + 1;
    });
    console.log("[CSV Parser] Status distribution:", statusCounts);
    console.log("[CSV Parser] Total tickets parsed:", tickets.length);
  }

  return { tickets };
}
