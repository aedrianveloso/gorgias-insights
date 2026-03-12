import type { GorgiasTicket } from "@/types/gorgias";

/**
 * Smart CSV parser that handles the actual Gorgias export format.
 * Handles quoted fields with commas, newlines inside quotes, etc.
 */
export function parseGorgiasCsv(text: string): GorgiasTicket[] {
  const { headers, rows } = parseCsvText(text);
  return rows.map((row, idx) => mapRowToTicket(headers, row, idx));
}

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        current.push(field.trim());
        field = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        current.push(field.trim());
        if (current.some((c) => c.length > 0)) {
          rows.push(current);
        }
        current = [];
        field = "";
        if (char === "\r") i++; // skip \n after \r
      } else {
        field += char;
      }
    }
  }

  // Last field/row
  if (field.length > 0 || current.length > 0) {
    current.push(field.trim());
    if (current.some((c) => c.length > 0)) {
      rows.push(current);
    }
  }

  const headers = rows[0]?.map((h) => h.toLowerCase().replace(/\s+/g, "_")) || [];
  return { headers, rows: rows.slice(1) };
}

function findCol(headers: string[], ...candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c.toLowerCase().replace(/\s+/g, "_"));
    if (idx !== -1) return idx;
  }
  return -1;
}

function get(row: string[], idx: number): string {
  return idx >= 0 && idx < row.length ? row[idx] : "";
}

function parseIntent(aiIntent: string): { category: string; sub: string; detail: string } {
  const parts = aiIntent.split("::").map((s) => s.trim());
  return {
    category: parts[0] || "Unknown",
    sub: parts[1] || "Other",
    detail: parts[2] || "Other",
  };
}

function parseContactReason(reason: string): { category: string; detail: string } {
  const parts = reason.split("::").map((s) => s.trim());
  return {
    category: parts[0] || "Unknown",
    detail: parts[1] || parts[0] || "Other",
  };
}

function mapRowToTicket(headers: string[], row: string[], idx: number): GorgiasTicket {
  // Map columns flexibly
  const urlIdx = findCol(headers, "ticket_url", "url", "ticket_link");
  const bodyIdx = findCol(headers, "email_body", "body", "message", "email_content", "conversation");
  const intentIdx = findCol(headers, "ticket_field:_ai_intent", "ai_intent", "intent");
  const contactIdx = findCol(headers, "ticket_field:_contact_reason", "contact_reason", "reason");
  const productIdx = findCol(headers, "ticket_field:_product", "product");
  const resolutionIdx = findCol(headers, "ticket_field:_resolution", "resolution");
  const sentimentIdx = findCol(headers, "ticket_field:_managed_sentiment", "managed_sentiment", "sentiment");
  const discountIdx = findCol(headers, "ticket_field:_ai_agent_sales_discount", "ai_agent_sales_discount", "discount");
  const subjectIdx = findCol(headers, "subject", "title", "ticket_subject");
  const statusIdx = findCol(headers, "status", "ticket_status");
  const priorityIdx = findCol(headers, "priority");
  const channelIdx = findCol(headers, "channel", "source");
  const createdIdx = findCol(headers, "created_at", "created", "date", "created_datetime");
  const closedIdx = findCol(headers, "closed_at", "closed", "closed_datetime");
  const assigneeIdx = findCol(headers, "assignee_name", "assignee", "agent", "assigned_to");
  const emailIdx = findCol(headers, "customer_email", "customer", "email", "requester_email");
  const responseIdx = findCol(headers, "response_time_minutes", "response_time", "first_response_time");
  const resTimeIdx = findCol(headers, "resolution_time_minutes", "resolution_time");
  const csatIdx = findCol(headers, "satisfaction_score", "csat", "score");
  const msgCountIdx = findCol(headers, "messages_count", "messages", "message_count", "number_of_messages");
  const tagsIdx = findCol(headers, "tags", "ticket_tags");

  const aiIntent = get(row, intentIdx);
  const contactReason = get(row, contactIdx);
  const { category: ic, sub: is, detail: id } = parseIntent(aiIntent);
  const { category: cc, detail: cd } = parseContactReason(contactReason);

  const tagsRaw = get(row, tagsIdx);
  const tags = tagsRaw ? tagsRaw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [];

  return {
    id: idx + 1,
    ticketUrl: get(row, urlIdx),
    emailBody: get(row, bodyIdx),
    aiIntent,
    contactReason,
    product: get(row, productIdx),
    resolution: get(row, resolutionIdx),
    managedSentiment: get(row, sentimentIdx),
    aiAgentSalesDiscount: get(row, discountIdx),
    subject: get(row, subjectIdx) || "Untitled",
    status: get(row, statusIdx) || "closed",
    priority: get(row, priorityIdx) || "normal",
    channel: get(row, channelIdx) || "email",
    createdAt: get(row, createdIdx) || new Date().toISOString(),
    closedAt: get(row, closedIdx) || null,
    assigneeName: get(row, assigneeIdx) || null,
    customerEmail: get(row, emailIdx) || "",
    responseTimeMinutes: parseFloat(get(row, responseIdx)) || null,
    resolutionTimeMinutes: parseFloat(get(row, resTimeIdx)) || null,
    satisfactionScore: parseFloat(get(row, csatIdx)) || null,
    tags,
    messagesCount: parseInt(get(row, msgCountIdx)) || 1,
    intentCategory: ic,
    intentSubCategory: is,
    intentDetail: id,
    contactCategory: cc,
    contactDetail: cd,
  };
}
