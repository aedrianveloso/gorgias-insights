import type {
  GorgiasTicket,
  EnhancedAnalytics,
  IntentBreakdown,
  ContactReasonBreakdown,
  ProductInsight,
  AgentQuality,
  EmailInsight,
  CustomerVoiceInsights,
  ExchangeAnalysis,
  MonthlyBreakdown,
  ActionableRecommendation,
} from "@/types/gorgias";
import { computeQACompliance, computeKnowledgeGaps } from "./qa-compliance";

// ─── Helpers for status checks ──────────────────────────

const CLOSED_STATUSES = new Set(["closed", "solved", "resolved", "done", "completed"]);

function isClosed(t: GorgiasTicket): boolean {
  if (CLOSED_STATUSES.has(t.status.toLowerCase())) return true;
  // If closedAt is populated, treat as closed regardless of status value
  if (t.closedAt && t.closedAt.trim().length > 0) return true;
  return false;
}

// Combined text from any text field on a ticket — used for fallback NLP
// when Gorgias-tagged fields (product, contactReason, etc.) are empty
function getTicketText(t: GorgiasTicket): string {
  return [t.emailBody, t.customerMessages, t.subject, t.surveyComment]
    .filter(Boolean)
    .join("\n");
}

// Wamsutta product catalog — keyword-based detection from text
const WAMSUTTA_PRODUCT_CATALOG: { label: string; keywords: string[] }[] = [
  { label: "Sheet Sets", keywords: ["sheet set", "fitted sheet", "flat sheet", "sheets"] },
  { label: "Pillowcase Sets", keywords: ["pillowcase", "pillow case"] },
  { label: "Duvet Sets", keywords: ["duvet"] },
  { label: "Comforter Sets", keywords: ["comforter"] },
  { label: "Quilts & Coverlets", keywords: ["quilt", "coverlet"] },
  { label: "Pillows", keywords: ["pillow ", "down alternative pillow", "latex loft", "bed pillow", "supreme comfort"] },
  { label: "Euro Shams & Decorative Pillows", keywords: ["euro sham", "decorative pillow", "throw pillow"] },
  { label: "Bath Towels", keywords: ["bath towel", "towels"] },
  { label: "Bath Sheets", keywords: ["bath sheet"] },
  { label: "Hand Towels & Washcloths", keywords: ["hand towel", "washcloth", "wash cloth"] },
  { label: "Bath Mats & Tubmats", keywords: ["bath mat", "bath rug", "tubmat", "tub mat"] },
  { label: "Mattress Protectors & Pads", keywords: ["mattress protector", "mattress pad", "mattress topper"] },
  { label: "Supreme Egyptian Cotton", keywords: ["egyptian cotton", "supreme egyptian", "600 thread", "600tc"] },
  { label: "Essentials Percale", keywords: ["percale", "essentials percale"] },
  { label: "Essentials Cotton Sateen", keywords: ["sateen", "essentials cotton", "essentials sateen"] },
  { label: "Comforters (DA)", keywords: ["down alternative comforter", "all season comforter"] },
  { label: "Gramercy Collection", keywords: ["gramercy"] },
  { label: "Soho Collection", keywords: ["soho"] },
  { label: "Charleston Vine", keywords: ["charleston"] },
  { label: "Garden Toile", keywords: ["garden toile"] },
  { label: "Herringbone Stitch", keywords: ["herringbone"] },
  { label: "Legacy / DreamZone / Supercale", keywords: ["dreamzone", "supercale", "bed bath", "bbb"] },
];

// Detect product from any text — returns the first matching product label
function detectProductFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { label, keywords } of WAMSUTTA_PRODUCT_CATALOG) {
    if (keywords.some((kw) => lower.includes(kw))) return label;
  }
  return null;
}

// Detect contact reason from text using common request patterns
const CONTACT_REASON_PATTERNS: { reason: string; patterns: RegExp[] }[] = [
  { reason: "Return / Refund", patterns: [/\breturn\b/i, /\brefund\b/i, /money back/i, /send.*back/i] },
  { reason: "Exchange Request", patterns: [/\bexchange\b/i, /swap.*for/i, /replace.*with/i] },
  { reason: "Order Status / Shipping", patterns: [/where is my order/i, /tracking/i, /hasn'?t.*ship/i, /not.*arrived/i, /still.*waiting/i, /delivery status/i] },
  { reason: "Quality / Defect", patterns: [/defect/i, /damaged/i, /\btorn\b/i, /broken/i, /\bhole\b/i, /falling apart/i, /poor quality/i] },
  { reason: "Wrong Item / Missing", patterns: [/wrong item/i, /wrong.*color/i, /missing.*from/i, /didn'?t receive/i, /not.*ordered/i] },
  { reason: "Sizing / Fit Question", patterns: [/what size/i, /size question/i, /pocket depth/i, /fit.*mattress/i, /dimensions/i, /how big/i] },
  { reason: "Product Question", patterns: [/sateen vs|percale vs|difference between/i, /what.*made of/i, /thread count/i, /weave/i, /material question/i] },
  { reason: "Order Modification / Cancellation", patterns: [/cancel.*order/i, /change.*address/i, /modify.*order/i, /update.*order/i] },
  { reason: "Discount / Promo", patterns: [/discount code/i, /promo code/i, /coupon/i, /price match/i, /sale price/i] },
  { reason: "Care Instructions", patterns: [/how.*wash/i, /care instruction/i, /washing instructions/i, /shrink/i, /fabric softener/i] },
  { reason: "Stock / Availability", patterns: [/in stock/i, /out of stock/i, /restock/i, /when.*available/i, /back in stock/i] },
  { reason: "Legacy / BBB Inquiry", patterns: [/bed bath/i, /\bbbb\b/i, /dreamzone/i, /supercale/i, /old wamsutta/i] },
  { reason: "Positive Feedback", patterns: [/love.*product/i, /amazing/i, /thank you so much/i, /\bbest\b.*sheets/i, /highly recommend/i] },
  { reason: "Complaint / Frustration", patterns: [/disappointed/i, /frustrated/i, /unacceptable/i, /terrible/i, /worst/i] },
];

function detectContactReasonFromText(text: string): string | null {
  for (const { reason, patterns } of CONTACT_REASON_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return reason;
  }
  return null;
}

// ─── Main analytics computation ─────────────────────────

export function computeAnalytics(tickets: GorgiasTicket[]): EnhancedAnalytics {
  const total = tickets.length;
  if (total === 0) return emptyAnalytics();

  const closed = tickets.filter(isClosed);
  const open = tickets.filter((t) => !isClosed(t));

  // Response/resolution times
  const withResponse = tickets.filter((t) => t.responseTimeMinutes != null && t.responseTimeMinutes > 0);
  const avgResponseTime = withResponse.length > 0
    ? Math.round(withResponse.reduce((s, t) => s + t.responseTimeMinutes!, 0) / withResponse.length)
    : 0;

  const withResolution = tickets.filter((t) => t.resolutionTimeMinutes != null && t.resolutionTimeMinutes > 0);
  const avgResolutionTime = withResolution.length > 0
    ? Math.round(withResolution.reduce((s, t) => s + t.resolutionTimeMinutes!, 0) / withResolution.length)
    : 0;

  // CSAT
  const withCsat = tickets.filter((t) => t.satisfactionScore != null && t.satisfactionScore > 0);
  const satisfactionScore = withCsat.length > 0
    ? parseFloat((withCsat.reduce((s, t) => s + t.satisfactionScore!, 0) / withCsat.length).toFixed(2))
    : 0;

  // Messages per ticket
  const messagesPerTicket = parseFloat(
    (tickets.reduce((s, t) => s + t.messagesCount, 0) / total).toFixed(1)
  );

  // One-touch and zero-touch
  const oneTouch = tickets.filter((t) => t.messagesCount <= 2);
  const zeroTouch = tickets.filter((t) => t.messagesCount <= 1);

  const withCustomerMessages = tickets.filter((t) => t.customerMessages && t.customerMessages.trim().length > 10);

  return {
    totalTickets: total,
    closedTickets: closed.length,
    openTickets: open.length,
    avgResponseTime,
    avgResolutionTime,
    satisfactionScore,
    oneTouchRate: parseFloat(((oneTouch.length / total) * 100).toFixed(1)),
    zeroTouchTickets: zeroTouch.length,
    messagesPerTicket,
    ticketsWithCustomerMessages: withCustomerMessages.length,
    ticketsOverTime: computeTicketsOverTime(tickets),
    channelBreakdown: computeChannelBreakdown(tickets),
    intentBreakdown: computeIntentBreakdown(tickets),
    contactReasonBreakdown: computeContactReasonBreakdown(tickets),
    productInsights: computeProductInsights(tickets),
    agentQuality: computeAgentQuality(tickets),
    emailInsights: computeEmailInsights(tickets),
    customerVoice: computeCustomerVoice(tickets),
    recommendations: computeRecommendations(tickets),
    sentimentOverTime: computeSentimentOverTime(tickets),
    tagBreakdown: computeTagBreakdown(tickets),
    resolutionBreakdown: computeResolutionBreakdown(tickets),
    monthlyBreakdown: computeMonthlyBreakdown(tickets),
    exchangeAnalysis: computeExchangeAnalysis(tickets),
    qaCompliance: computeQACompliance(tickets),
    knowledgeGaps: computeKnowledgeGaps(tickets),
  };
}

// ─── Tickets over time ──────────────────────────────────

function computeTicketsOverTime(tickets: GorgiasTicket[]) {
  const dateMap = new Map<string, { created: number; closed: number }>();

  tickets.forEach((t) => {
    const d = formatDate(t.createdAt);
    if (!d) return;
    const entry = dateMap.get(d) || { created: 0, closed: 0 };
    entry.created++;
    dateMap.set(d, entry);
  });

  tickets.forEach((t) => {
    if (!t.closedAt) return;
    const d = formatDate(t.closedAt);
    if (!d) return;
    const entry = dateMap.get(d) || { created: 0, closed: 0 };
    entry.closed++;
    dateMap.set(d, entry);
  });

  return Array.from(dateMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ─── Channel breakdown ──────────────────────────────────

function computeChannelBreakdown(tickets: GorgiasTicket[]) {
  const map = new Map<string, { count: number; totalResponse: number; responseCount: number }>();
  const total = tickets.length;

  tickets.forEach((t) => {
    const ch = t.channel || "Unknown";
    const entry = map.get(ch) || { count: 0, totalResponse: 0, responseCount: 0 };
    entry.count++;
    if (t.responseTimeMinutes) {
      entry.totalResponse += t.responseTimeMinutes;
      entry.responseCount++;
    }
    map.set(ch, entry);
  });

  return Array.from(map.entries())
    .map(([channel, data]) => ({
      channel,
      count: data.count,
      percentage: parseFloat(((data.count / total) * 100).toFixed(1)),
      avgResponseTime: data.responseCount > 0 ? Math.round(data.totalResponse / data.responseCount) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Intent breakdown ───────────────────────────────────

function computeIntentBreakdown(tickets: GorgiasTicket[]): IntentBreakdown[] {
  const total = tickets.length;
  const map = new Map<string, Map<string, number[]>>();

  tickets.forEach((t) => {
    const cat = t.intentCategory || "Unknown";
    if (!map.has(cat)) map.set(cat, new Map());
    const sub = t.intentSubCategory || "Other";
    const subMap = map.get(cat)!;
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub)!.push(t.id);
  });

  return Array.from(map.entries())
    .map(([category, subMap]) => {
      const allIds: number[] = [];
      const subCategories = Array.from(subMap.entries())
        .map(([name, ids]) => {
          allIds.push(...ids);
          return { name, count: ids.length, ticketIds: ids };
        })
        .sort((a, b) => b.count - a.count);
      return {
        category,
        count: allIds.length,
        percentage: parseFloat(((allIds.length / total) * 100).toFixed(1)),
        ticketIds: allIds,
        subCategories,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── Contact reason breakdown ───────────────────────────

function computeContactReasonBreakdown(tickets: GorgiasTicket[]): ContactReasonBreakdown[] {
  const total = tickets.length;
  const map = new Map<string, Map<string, number[]>>();

  tickets.forEach((t) => {
    const reason = t.contactCategory || "Unknown";
    if (!map.has(reason)) map.set(reason, new Map());
    const detail = t.contactDetail || "Other";
    const detailMap = map.get(reason)!;
    if (!detailMap.has(detail)) detailMap.set(detail, []);
    detailMap.get(detail)!.push(t.id);
  });

  return Array.from(map.entries())
    .map(([reason, detailMap]) => {
      const allIds: number[] = [];
      const details = Array.from(detailMap.entries())
        .map(([name, ids]) => {
          allIds.push(...ids);
          return { name, count: ids.length, ticketIds: ids };
        })
        .sort((a, b) => b.count - a.count);
      return {
        reason,
        count: allIds.length,
        percentage: parseFloat(((allIds.length / total) * 100).toFixed(1)),
        ticketIds: allIds,
        details,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── Product insights ───────────────────────────────────

function computeProductInsights(tickets: GorgiasTicket[]): ProductInsight[] {
  const map = new Map<string, { tickets: GorgiasTicket[] }>();

  tickets.forEach((t) => {
    let product = t.product || "";
    if (!product || product === "Not specified") {
      const detected = detectProductFromText(getTicketText(t));
      if (detected) product = detected;
    }
    if (!product) product = "Not specified";
    if (!map.has(product)) map.set(product, { tickets: [] });
    map.get(product)!.tickets.push(t);
  });

  return Array.from(map.entries())
    .filter(([name]) => name !== "Not specified" && name.length > 0)
    .map(([product, data]) => {
      const issueMap = new Map<string, number>();
      let positive = 0, negative = 0, neutral = 0;

      data.tickets.forEach((t) => {
        const issue = t.contactReason || t.intentCategory || "Other";
        issueMap.set(issue, (issueMap.get(issue) || 0) + 1);

        const sent = (t.managedSentiment || "").toLowerCase();
        if (sent.includes("positive")) positive++;
        else if (sent.includes("negative")) negative++;
        else neutral++;
      });

      // Count quality mentions, exchanges, returns
      let qualityMentions = 0, exchangeCount = 0, returnCount = 0;
      data.tickets.forEach((t) => {
        const text = (t.customerMessages || t.emailBody || "").toLowerCase();
        const intent = (t.aiIntent || "").toLowerCase();
        const contact = (t.contactReason || "").toLowerCase();
        if (/quality|defect|damaged|broken|torn/i.test(text)) qualityMentions++;
        if (intent.includes("exchange") || contact.includes("exchange") || /\bexchange\b/.test(text)) exchangeCount++;
        if (intent.includes("return") || contact.includes("return") || /\breturn\b/.test(text)) returnCount++;
      });

      return {
        product,
        totalTickets: data.tickets.length,
        ticketIds: data.tickets.map((t) => t.id),
        topIssues: Array.from(issueMap.entries())
          .map(([issue, count]) => ({ issue, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        sentiment: { positive, negative, neutral },
        qualityMentions,
        exchangeCount,
        returnCount,
      };
    })
    .sort((a, b) => b.totalTickets - a.totalTickets);
}

// ─── Agent quality ──────────────────────────────────────

function computeAgentQuality(tickets: GorgiasTicket[]): AgentQuality[] {
  const map = new Map<string, GorgiasTicket[]>();

  tickets.forEach((t) => {
    const agent = t.assigneeName || "Unassigned";
    if (!map.has(agent)) map.set(agent, []);
    map.get(agent)!.push(t);
  });

  return Array.from(map.entries())
    .filter(([name]) => name !== "Unassigned")
    .map(([name, agentTickets]) => {
      const closed = agentTickets.filter(isClosed);
      const withResponse = agentTickets.filter((t) => t.responseTimeMinutes != null && t.responseTimeMinutes > 0);
      const withResolution = agentTickets.filter((t) => t.resolutionTimeMinutes != null && t.resolutionTimeMinutes > 0);
      const withCsat = agentTickets.filter((t) => t.satisfactionScore != null && t.satisfactionScore > 0);
      const oneTouch = agentTickets.filter((t) => t.messagesCount <= 2);

      // Intent breakdown for this agent
      const intentMap = new Map<string, number>();
      agentTickets.forEach((t) => {
        const intent = t.intentCategory || "Unknown";
        intentMap.set(intent, (intentMap.get(intent) || 0) + 1);
      });

      // Sentiment breakdown
      const sentMap = new Map<string, number>();
      agentTickets.forEach((t) => {
        const sent = t.managedSentiment || "Unknown";
        sentMap.set(sent, (sentMap.get(sent) || 0) + 1);
      });

      // Contact reasons
      const reasonMap = new Map<string, number>();
      agentTickets.forEach((t) => {
        const reason = t.contactReason || "Unknown";
        reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
      });

      return {
        name,
        ticketsHandled: agentTickets.length,
        ticketsClosed: closed.length,
        avgResponseTime: withResponse.length > 0
          ? Math.round(withResponse.reduce((s, t) => s + t.responseTimeMinutes!, 0) / withResponse.length)
          : 0,
        avgResolutionTime: withResolution.length > 0
          ? Math.round(withResolution.reduce((s, t) => s + t.resolutionTimeMinutes!, 0) / withResolution.length)
          : 0,
        satisfactionScore: withCsat.length > 0
          ? parseFloat((withCsat.reduce((s, t) => s + t.satisfactionScore!, 0) / withCsat.length).toFixed(2))
          : 0,
        oneTouchRate: agentTickets.length > 0
          ? parseFloat(((oneTouch.length / agentTickets.length) * 100).toFixed(1))
          : 0,
        intentBreakdown: Array.from(intentMap.entries())
          .map(([intent, count]) => ({ intent, count }))
          .sort((a, b) => b.count - a.count),
        sentimentBreakdown: Array.from(sentMap.entries())
          .map(([sentiment, count]) => ({ sentiment, count }))
          .sort((a, b) => b.count - a.count),
        topContactReasons: Array.from(reasonMap.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };
    })
    .sort((a, b) => b.ticketsHandled - a.ticketsHandled);
}

// ─── Email body insights ────────────────────────────────

const STOP_WORDS = new Set([
  // Common English
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "was", "are", "were", "been", "be", "have",
  "has", "had", "do", "does", "did", "will", "would", "could", "should", "may",
  "might", "shall", "can", "need", "must", "not", "no", "nor", "so", "if",
  "then", "than", "too", "very", "just", "about", "above", "after", "again",
  "all", "also", "am", "any", "because", "before", "between", "both", "each",
  "few", "further", "get", "got", "here", "how", "i", "im", "into", "it",
  "its", "itself", "let", "like", "me", "more", "most", "my", "myself", "now",
  "only", "other", "our", "out", "over", "own", "re", "same", "she", "some",
  "such", "that", "their", "them", "there", "these", "they", "this", "those",
  "through", "under", "until", "up", "we", "what", "when", "where", "which",
  "while", "who", "whom", "why", "you", "your", "yours", "he", "her", "him",
  "his", "us", "being", "doing", "having", "during", "once", "s", "t", "d",
  "ll", "ve", "m", "don", "doesn", "didn", "won", "wouldn", "couldn",
  "shouldn", "isn", "aren", "wasn", "weren", "hasn", "haven", "hadn",
  "every", "either", "neither", "yet", "down", "against", "open",
  // Email-specific noise
  "caution", "email", "originated", "organization", "click", "links",
  "attachments", "sender", "sent", "received", "reply", "forwarded",
  "subject", "message", "wrote", "please", "thank", "thanks", "hi", "hello",
  "hey", "dear", "regards", "sincerely", "best", "cheers", "mailto", "http",
  "https", "www", "com", "org", "net", "unsubscribe", "subscribe", "view",
  "browser", "privacy", "policy", "terms", "conditions", "rights", "reserved",
  "copyright", "confidential", "intended", "recipient", "notify", "delete",
  "disclaimer", "image", "images", "logo", "outside", "know", "content",
  "safely", "report", "suspicious", "contained", "within", "verified",
  "unknown", "display", "blocked", "warning", "recognize", "safe", "new",
  "online", "store", "contact", "form", "country", "code", "name", "de",
  "set", "one", "unless",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function computeEmailInsights(tickets: GorgiasTicket[]): EmailInsight {
  const withBody = tickets.filter((t) => t.emailBody && t.emailBody.trim().length > 10);

  // Keyword frequency
  const wordFreq = new Map<string, number>();
  withBody.forEach((t) => {
    const words = extractKeywords(t.emailBody);
    const unique = new Set(words); // count each word once per ticket
    unique.forEach((w) => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));
  });

  const commonKeywords = Array.from(wordFreq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  // Detect customer request patterns
  const requestPatterns = [
    { pattern: /return/i, label: "Return request" },
    { pattern: /exchange/i, label: "Exchange request" },
    { pattern: /refund/i, label: "Refund request" },
    { pattern: /cancel/i, label: "Cancellation request" },
    { pattern: /where is my order|tracking|ship/i, label: "Order tracking / shipping" },
    { pattern: /discount|promo|coupon|code/i, label: "Discount / promo code" },
    { pattern: /out of stock|available|back in stock|restock/i, label: "Stock availability" },
    { pattern: /size|sizing|dimensions|measure/i, label: "Sizing question" },
    { pattern: /color|colour/i, label: "Color preference / question" },
    { pattern: /quality|defect|damaged|broken|torn/i, label: "Quality / defect issue" },
    { pattern: /wash|care|clean|maintain/i, label: "Care instructions" },
    { pattern: /thread count|material|fabric|cotton|egyptian|percale|sateen/i, label: "Material / fabric question" },
    { pattern: /pillow|euro sham/i, label: "Pillow related" },
    { pattern: /sheet|bedding|fitted|flat sheet/i, label: "Sheet / bedding related" },
    { pattern: /towel|bath sheet|washcloth/i, label: "Towel / bath related" },
    { pattern: /duvet|comforter|quilt|coverlet/i, label: "Duvet / comforter related" },
    { pattern: /mattress|mattress pad|mattress protector|topper/i, label: "Mattress protector / pad" },
    { pattern: /bath mat|bath rug/i, label: "Bath mat related" },
    { pattern: /warranty|guarantee/i, label: "Warranty inquiry" },
    { pattern: /order\s*#?\s*\d+/i, label: "Order number referenced" },
  ];

  const requestCounts = new Map<string, { count: number; examples: string[]; ticketIds: number[] }>();
  withBody.forEach((t) => {
    requestPatterns.forEach(({ pattern, label }) => {
      if (pattern.test(t.emailBody)) {
        const entry = requestCounts.get(label) || { count: 0, examples: [], ticketIds: [] };
        entry.count++;
        entry.ticketIds.push(t.id);
        if (entry.examples.length < 2) {
          const snippet = t.emailBody.substring(0, 150).replace(/\n/g, " ");
          entry.examples.push(snippet);
        }
        requestCounts.set(label, entry);
      }
    });
  });

  const topCustomerRequests = Array.from(requestCounts.entries())
    .map(([request, data]) => ({ request, count: data.count, examples: data.examples, ticketIds: data.ticketIds }))
    .sort((a, b) => b.count - a.count);

  // Product mentions in email bodies — mapped to actual Wamsutta catalog
  const productCategories: { label: string; keywords: string[] }[] = [
    { label: "Sheet Sets", keywords: ["sheet", "sheets", "sheet set", "fitted sheet", "flat sheet"] },
    { label: "Pillowcase Sets", keywords: ["pillowcase", "pillow case", "pillowcases"] },
    { label: "Duvet Sets", keywords: ["duvet", "duvet cover", "duvet set"] },
    { label: "Comforter Sets", keywords: ["comforter", "comforter set"] },
    { label: "Quilts & Coverlets", keywords: ["quilt", "coverlet"] },
    { label: "Pillows", keywords: ["pillow", "down alternative pillow", "euro pillow", "latex loft", "bed pillow"] },
    { label: "Euro Shams & Decorative Pillows", keywords: ["euro sham", "decorative pillow", "throw pillow"] },
    { label: "Bath Towels", keywords: ["bath towel", "towel", "towels"] },
    { label: "Bath Sheets", keywords: ["bath sheet", "bath sheets"] },
    { label: "Hand Towels & Washcloths", keywords: ["hand towel", "washcloth", "wash cloth", "hand towels"] },
    { label: "Bath Mats & Tubmats", keywords: ["bath mat", "bath rug", "bath mats", "tubmat", "tub mat"] },
    { label: "Mattress Protectors & Pads", keywords: ["mattress protector", "mattress pad", "mattress topper", "mattress", "pillowtop topper"] },
    { label: "Supreme Egyptian Cotton", keywords: ["egyptian cotton", "supreme", "800 thread", "800tc"] },
    { label: "Essentials Percale", keywords: ["percale", "essentials percale", "400tc percale", "400 thread count percale"] },
    { label: "Essentials Cotton Sateen", keywords: ["essentials cotton", "essentials sateen", "400tc sateen", "sateen solid"] },
    { label: "Comforters (DA)", keywords: ["down alternative comforter", "all season comforter", "extra warmth", "light warmth"] },
    { label: "Gramercy Collection", keywords: ["gramercy"] },
    { label: "Soho Collection", keywords: ["soho"] },
    { label: "Charleston Vine", keywords: ["charleston vine", "charleston"] },
    { label: "Garden Toile", keywords: ["garden toile"] },
    { label: "Herringbone Stitch", keywords: ["herringbone"] },
  ];
  const productMentionMap = new Map<string, Set<number>>();
  withBody.forEach((t) => {
    const lower = t.emailBody.toLowerCase();
    productCategories.forEach(({ label, keywords }) => {
      if (keywords.some((kw) => lower.includes(kw))) {
        const ids = productMentionMap.get(label) ?? new Set<number>();
        ids.add(t.id);
        productMentionMap.set(label, ids);
      }
    });
  });

  const productMentions = Array.from(productMentionMap.entries())
    .map(([product, ids]) => ({ product, count: ids.size, ticketIds: Array.from(ids) }))
    .sort((a, b) => b.count - a.count);

  // Sentiment distribution
  const sentMap = new Map<string, { count: number; ticketIds: number[] }>();
  tickets.forEach((t) => {
    const sent = t.managedSentiment || "Unknown";
    if (sent && sent.trim().length > 0) {
      const entry = sentMap.get(sent) || { count: 0, ticketIds: [] };
      entry.count++;
      entry.ticketIds.push(t.id);
      sentMap.set(sent, entry);
    }
  });
  const sentTotal = Array.from(sentMap.values()).reduce((s, v) => s + v.count, 0) || 1;
  const sentimentDistribution = Array.from(sentMap.entries())
    .map(([sentiment, data]) => ({
      sentiment,
      count: data.count,
      percentage: parseFloat(((data.count / sentTotal) * 100).toFixed(1)),
      ticketIds: data.ticketIds,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    commonKeywords,
    topCustomerRequests,
    productMentions,
    sentimentDistribution,
  };
}

// ─── Sentiment over time ────────────────────────────────

function computeSentimentOverTime(tickets: GorgiasTicket[]) {
  const map = new Map<string, { positive: number; negative: number; neutral: number }>();

  tickets.forEach((t) => {
    const d = formatDate(t.createdAt);
    if (!d) return;
    const entry = map.get(d) || { positive: 0, negative: 0, neutral: 0 };
    const sent = (t.managedSentiment || "").toLowerCase();
    if (sent.includes("positive")) entry.positive++;
    else if (sent.includes("negative")) entry.negative++;
    else entry.neutral++;
    map.set(d, entry);
  });

  return Array.from(map.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ─── Tag breakdown ──────────────────────────────────────

function computeTagBreakdown(tickets: GorgiasTicket[]) {
  const total = tickets.length;
  const map = new Map<string, number>();

  tickets.forEach((t) => {
    t.tags.forEach((tag) => {
      if (tag.trim()) map.set(tag.trim(), (map.get(tag.trim()) || 0) + 1);
    });
  });

  return Array.from(map.entries())
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: parseFloat(((count / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Resolution breakdown ───────────────────────────────

function computeResolutionBreakdown(tickets: GorgiasTicket[]) {
  const total = tickets.length;
  const map = new Map<string, number>();

  tickets.forEach((t) => {
    const res = t.resolution || "Not set";
    map.set(res, (map.get(res) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([resolution, count]) => ({
      resolution,
      count,
      percentage: parseFloat(((count / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Customer Voice insights ─────────────────────────────

function computeCustomerVoice(tickets: GorgiasTicket[]): CustomerVoiceInsights {
  // First-contact drivers — use Gorgias tag if present, fallback to text NLP
  const total = tickets.length;
  const driverMap = new Map<string, number[]>();
  tickets.forEach((t) => {
    let reason = t.contactCategory || t.contactReason || "";
    if (!reason || reason.toLowerCase() === "unknown") {
      const detected = detectContactReasonFromText(getTicketText(t));
      if (detected) reason = detected;
    }
    if (!reason) reason = "Unknown";
    if (!driverMap.has(reason)) driverMap.set(reason, []);
    driverMap.get(reason)!.push(t.id);
  });
  const firstContactDrivers = Array.from(driverMap.entries())
    .map(([reason, ids]) => ({
      reason,
      count: ids.length,
      percentage: parseFloat(((ids.length / total) * 100).toFixed(1)),
      ticketIds: ids,
    }))
    .sort((a, b) => b.count - a.count);

  // Common themes — use any available text (emailBody, customerMessages, subject, surveyComment)
  const withBody = tickets.filter((t) => getTicketText(t).trim().length > 10);
  const themePatterns: { theme: string; description: string; patterns: RegExp[] }[] = [
    { theme: "Shipping delays", description: "Customers experiencing delayed shipments", patterns: [/delay/i, /late delivery/i, /where is my order/i, /hasn't arrived/i, /not received/i, /shipping.*slow/i] },
    { theme: "Product quality concerns", description: "Issues with product quality, defects, or durability", patterns: [/quality/i, /defect/i, /damaged/i, /broken/i, /torn/i, /falling apart/i, /poor quality/i] },
    { theme: "Size or fit issues", description: "Products didn't fit as expected", patterns: [/too (small|big|large|tight|loose)/i, /doesn't fit/i, /wrong size/i, /sizing/i, /shrunk/i] },
    { theme: "Color mismatch", description: "Product color differs from what was shown online", patterns: [/color.*different/i, /not.*same.*color/i, /looks different/i, /doesn't match/i, /color.*wrong/i] },
    { theme: "Return/exchange process", description: "Customers navigating returns or exchanges", patterns: [/return.*label/i, /how.*return/i, /exchange.*for/i, /return.*policy/i, /send.*back/i] },
    { theme: "Order modifications", description: "Requests to change or cancel orders", patterns: [/cancel.*order/i, /change.*order/i, /modify.*order/i, /update.*address/i, /wrong.*address/i] },
    { theme: "Pricing or discount questions", description: "Questions about pricing, promotions, or discounts", patterns: [/discount/i, /promo/i, /coupon/i, /price.*match/i, /sale/i, /cheaper/i] },
    { theme: "Product recommendations", description: "Customers seeking product guidance", patterns: [/recommend/i, /which.*best/i, /suggest/i, /what.*difference/i, /compare/i] },
  ];

  const themeResults = new Map<string, { description: string; ids: number[]; examples: string[] }>();
  withBody.forEach((t) => {
    const text = getTicketText(t);
    themePatterns.forEach(({ theme, description, patterns }) => {
      if (patterns.some((p) => p.test(text))) {
        const entry = themeResults.get(theme) || { description, ids: [], examples: [] };
        entry.ids.push(t.id);
        if (entry.examples.length < 2) {
          entry.examples.push(text.substring(0, 150).replace(/\n/g, " "));
        }
        themeResults.set(theme, entry);
      }
    });
  });

  const commonThemes = Array.from(themeResults.entries())
    .map(([theme, data]) => ({
      theme,
      description: data.description,
      count: data.ids.length,
      ticketIds: data.ids,
      examples: data.examples,
    }))
    .sort((a, b) => b.count - a.count);

  // What works well (positive patterns)
  const positivePatterns: { pattern: string; regex: RegExp[] }[] = [
    { pattern: "Fast delivery praised", regex: [/fast.*delivery/i, /quick.*shipping/i, /arrived.*early/i, /fast.*ship/i] },
    { pattern: "Product quality praised", regex: [/love.*quality/i, /great.*quality/i, /amazing.*quality/i, /excellent.*product/i, /soft/i] },
    { pattern: "Good customer service", regex: [/helpful.*agent/i, /great.*service/i, /thank.*help/i, /wonderful.*support/i, /excellent.*service/i] },
    { pattern: "Easy process", regex: [/easy.*process/i, /simple/i, /smooth.*experience/i, /no.*hassle/i] },
  ];
  // Tickets with any positive signal — sentiment OR survey score >=4 OR positive text patterns
  const isPositiveText = (text: string) =>
    /\b(love|amazing|excellent|wonderful|perfect|best|highly recommend|happy|thrilled|fantastic)\b/i.test(text);
  const positiveTickets = tickets.filter((t) => {
    if ((t.managedSentiment || "").toLowerCase().includes("positive")) return true;
    if (t.satisfactionScore >= 4) return true;
    return isPositiveText(getTicketText(t));
  });
  const positiveWithBody = positiveTickets.filter((t) => getTicketText(t).trim().length > 10);

  const whatWorksWell = positivePatterns
    .map(({ pattern, regex }) => {
      const matches = positiveWithBody.filter((t) => regex.some((r) => r.test(getTicketText(t))));
      return {
        pattern,
        count: matches.length,
        ticketIds: matches.map((t) => t.id),
        examples: matches.slice(0, 2).map((t) => getTicketText(t).substring(0, 150).replace(/\n/g, " ")),
      };
    })
    .filter((w) => w.count > 0)
    .sort((a, b) => b.count - a.count);

  // Improvement opportunities — negative sentiment OR negative text patterns OR low CSAT
  const isNegativeText = (text: string) =>
    /\b(disappointed|frustrated|terrible|awful|worst|unacceptable|never again|complaint|angry|upset)\b/i.test(text);
  const negativeTickets = tickets.filter((t) => {
    if ((t.managedSentiment || "").toLowerCase().includes("negative")) return true;
    if (t.satisfactionScore > 0 && t.satisfactionScore <= 2) return true;
    return isNegativeText(getTicketText(t));
  });
  const improvementAreas: { area: string; description: string; regex: RegExp[]; severity: "high" | "medium" | "low" }[] = [
    { area: "Product quality", description: "Quality-related complaints drive negative sentiment", regex: [/quality/i, /defect/i, /damaged/i, /broken/i], severity: "high" },
    { area: "Shipping speed", description: "Slow or delayed shipping causes frustration", regex: [/slow/i, /delay/i, /late/i, /hasn't arrived/i], severity: "high" },
    { area: "Return process", description: "Customers find returns difficult or slow", regex: [/return/i, /refund.*slow/i, /still.*waiting/i], severity: "medium" },
    { area: "Product accuracy", description: "Products don't match online descriptions", regex: [/not.*described/i, /different.*photo/i, /color.*wrong/i, /doesn't match/i], severity: "medium" },
    { area: "Communication gaps", description: "Customers feel uninformed about order status", regex: [/no.*update/i, /no.*response/i, /haven't.*heard/i, /no.*tracking/i], severity: "low" },
  ];

  const negWithBody = negativeTickets.filter((t) => getTicketText(t).trim().length > 10);
  const improvementOpportunities = improvementAreas
    .map(({ area, description, regex, severity }) => {
      const matches = negWithBody.filter((t) => regex.some((r) => r.test(getTicketText(t))));
      return {
        area,
        description,
        count: matches.length > 0 ? matches.length : 0,
        ticketIds: matches.map((t) => t.id),
        severity,
      };
    })
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);

  // Survey insights
  const withSurvey = tickets.filter((t) => t.satisfactionScore > 0);
  const avgScore = withSurvey.length > 0
    ? parseFloat((withSurvey.reduce((s, t) => s + t.satisfactionScore, 0) / withSurvey.length).toFixed(2))
    : 0;
  const positiveComments: string[] = [];
  const negativeComments: string[] = [];
  const surveyThemeMap = new Map<string, number>();

  tickets.forEach((t) => {
    if (t.surveyComment && t.surveyComment.trim().length > 3) {
      if (t.satisfactionScore >= 4) {
        if (positiveComments.length < 5) positiveComments.push(t.surveyComment.substring(0, 200));
      } else if (t.satisfactionScore > 0 && t.satisfactionScore <= 3) {
        if (negativeComments.length < 5) negativeComments.push(t.surveyComment.substring(0, 200));
      }
      // Simple theme extraction from survey comments
      const lower = t.surveyComment.toLowerCase();
      if (/fast|quick|speedy/i.test(lower)) surveyThemeMap.set("Speed", (surveyThemeMap.get("Speed") || 0) + 1);
      if (/helpful|help/i.test(lower)) surveyThemeMap.set("Helpfulness", (surveyThemeMap.get("Helpfulness") || 0) + 1);
      if (/friendly|nice|kind/i.test(lower)) surveyThemeMap.set("Friendliness", (surveyThemeMap.get("Friendliness") || 0) + 1);
      if (/resolve|solution|fixed/i.test(lower)) surveyThemeMap.set("Resolution", (surveyThemeMap.get("Resolution") || 0) + 1);
    }
  });

  const surveyInsights = {
    avgScore,
    totalResponses: withSurvey.length,
    positiveComments,
    negativeComments,
    themes: Array.from(surveyThemeMap.entries())
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count),
  };

  // Customer type breakdown
  const typeMap = new Map<string, number[]>();
  tickets.forEach((t) => {
    const type = t.customerType || "Unknown";
    if (!typeMap.has(type)) typeMap.set(type, []);
    typeMap.get(type)!.push(t.id);
  });
  const customerTypeBreakdown = Array.from(typeMap.entries())
    .map(([type, ids]) => ({
      type,
      count: ids.length,
      percentage: parseFloat(((ids.length / total) * 100).toFixed(1)),
      ticketIds: ids,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    firstContactDrivers,
    commonThemes,
    whatWorksWell,
    improvementOpportunities,
    surveyInsights,
    customerTypeBreakdown,
  };
}

// ─── Monthly breakdown ───────────────────────────────────

function computeMonthlyBreakdown(tickets: GorgiasTicket[]): MonthlyBreakdown[] {
  const monthMap = new Map<string, GorgiasTicket[]>();

  tickets.forEach((t) => {
    if (!t.createdAt) return;
    try {
      const d = new Date(t.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(t);
    } catch { /* skip */ }
  });

  return Array.from(monthMap.entries())
    .map(([month, mTickets]) => {
      const closed = mTickets.filter(isClosed);
      const withResponse = mTickets.filter((t) => t.responseTimeMinutes > 0);
      const withResolution = mTickets.filter((t) => t.resolutionTimeMinutes > 0);
      const withCsat = mTickets.filter((t) => t.satisfactionScore > 0);

      // Top contact reasons with detail (falls back to text-based NLP detection)
      const reasonMap = new Map<string, { count: number; details: Map<string, number> }>();
      mTickets.forEach((t) => {
        let r = t.contactCategory || t.contactReason || "";
        if (!r || r.toLowerCase() === "unknown") {
          const detected = detectContactReasonFromText(getTicketText(t));
          if (detected) r = detected;
        }
        if (!r) r = "Unknown";
        if (!reasonMap.has(r)) reasonMap.set(r, { count: 0, details: new Map() });
        const entry = reasonMap.get(r)!;
        entry.count++;
        const detail = t.contactDetail || "";
        if (detail) entry.details.set(detail, (entry.details.get(detail) || 0) + 1);
      });

      // Top intents
      const intentMap = new Map<string, number>();
      mTickets.forEach((t) => {
        const i = t.intentCategory || "Unknown";
        intentMap.set(i, (intentMap.get(i) || 0) + 1);
      });

      // Sentiment
      let positive = 0, negative = 0, neutral = 0;
      mTickets.forEach((t) => {
        const s = (t.managedSentiment || "").toLowerCase();
        if (s.includes("positive")) positive++;
        else if (s.includes("negative")) negative++;
        else neutral++;
      });

      // Label
      const [year, mon] = month.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[parseInt(mon) - 1]} ${year}`;

      // Top products this month (falls back to text-based detection)
      const productMap = new Map<string, { count: number; positive: number; negative: number; neutral: number; issues: Map<string, number> }>();
      mTickets.forEach((t) => {
        let p = t.product || "";
        if (!p || p === "Not specified") {
          const detected = detectProductFromText(getTicketText(t));
          if (detected) p = detected;
        }
        if (!p) return;
        if (!productMap.has(p)) productMap.set(p, { count: 0, positive: 0, negative: 0, neutral: 0, issues: new Map() });
        const entry = productMap.get(p)!;
        entry.count++;
        const s = (t.managedSentiment || "").toLowerCase();
        if (s.includes("positive")) entry.positive++;
        else if (s.includes("negative")) entry.negative++;
        else entry.neutral++;
        const issue =
          t.contactReason || t.intentCategory || detectContactReasonFromText(getTicketText(t)) || "";
        if (issue) entry.issues.set(issue, (entry.issues.get(issue) || 0) + 1);
      });

      // Exchange/return count this month
      const exchangeReturnCount = mTickets.filter((t) => {
        const text = (t.customerMessages || t.emailBody || "").toLowerCase();
        const intent = (t.aiIntent || "").toLowerCase();
        const contact = (t.contactReason || "").toLowerCase();
        return intent.includes("exchange") || intent.includes("return") ||
          contact.includes("exchange") || contact.includes("return") ||
          /\b(exchange|return)\b/.test(text);
      }).length;

      return {
        month,
        label,
        totalTickets: mTickets.length,
        closedTickets: closed.length,
        avgResponseTime: withResponse.length > 0
          ? Math.round(withResponse.reduce((s, t) => s + t.responseTimeMinutes, 0) / withResponse.length) : 0,
        avgResolutionTime: withResolution.length > 0
          ? Math.round(withResolution.reduce((s, t) => s + t.resolutionTimeMinutes, 0) / withResolution.length) : 0,
        satisfactionScore: withCsat.length > 0
          ? parseFloat((withCsat.reduce((s, t) => s + t.satisfactionScore, 0) / withCsat.length).toFixed(2)) : 0,
        topContactReasons: Array.from(reasonMap.entries())
          .map(([reason, data]) => {
            const topDetail = Array.from(data.details.entries()).sort((a, b) => b[1] - a[1])[0];
            return { reason, count: data.count, detail: topDetail ? topDetail[0] : undefined };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topIntents: Array.from(intentMap.entries())
          .map(([intent, count]) => ({ intent, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topProducts: Array.from(productMap.entries())
          .map(([product, data]) => {
            const topIssue = Array.from(data.issues.entries()).sort((a, b) => b[1] - a[1])[0];
            return {
              product,
              count: data.count,
              sentiment: { positive: data.positive, negative: data.negative, neutral: data.neutral },
              topIssue: topIssue ? topIssue[0] : "",
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        exchangeReturnCount,
        sentiment: { positive, negative, neutral },
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

// ─── Exchange/Return analysis ────────────────────────────

function computeExchangeAnalysis(tickets: GorgiasTicket[]): ExchangeAnalysis {
  const exchangeTickets = tickets.filter((t) => {
    const text = (t.customerMessages || t.emailBody || "").toLowerCase();
    const intent = (t.aiIntent || "").toLowerCase();
    const contact = (t.contactReason || "").toLowerCase();
    return intent.includes("exchange") || contact.includes("exchange") || /\bexchange\b/i.test(text);
  });

  const returnTickets = tickets.filter((t) => {
    const text = (t.customerMessages || t.emailBody || "").toLowerCase();
    const intent = (t.aiIntent || "").toLowerCase();
    const contact = (t.contactReason || "").toLowerCase();
    return intent.includes("return") || contact.includes("return") || /\breturn\b/i.test(text);
  });

  // Group by product
  function groupByProduct(tix: GorgiasTicket[]): { product: string; count: number; ticketIds: number[] }[] {
    const map = new Map<string, number[]>();
    tix.forEach((t) => {
      const p = t.product || "Not specified";
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(t.id);
    });
    return Array.from(map.entries())
      .map(([product, ids]) => ({ product, count: ids.length, ticketIds: ids }))
      .sort((a, b) => b.count - a.count);
  }

  // Extract reasons from text
  function extractReasons(tix: GorgiasTicket[]): { reason: string; count: number; ticketIds: number[]; examples: string[] }[] {
    const reasonPatterns: { reason: string; regex: RegExp }[] = [
      { reason: "Wrong size", regex: /wrong size|too (small|big|large|tight|loose)|doesn't fit|sizing/i },
      { reason: "Wrong color", regex: /wrong color|color.*different|not.*right.*color/i },
      { reason: "Defective/damaged", regex: /defect|damaged|broken|torn|hole|stain/i },
      { reason: "Not as described", regex: /not.*described|different.*expected|not.*pictured|doesn't match/i },
      { reason: "Changed mind", regex: /changed.*mind|don't.*want|no longer/i },
      { reason: "Wrong item received", regex: /wrong.*item|wrong.*product|received.*wrong|sent.*wrong/i },
    ];
    const reasonMap = new Map<string, { ids: number[]; examples: string[] }>();

    tix.forEach((t) => {
      const text = t.customerMessages || t.emailBody || "";
      if (text.trim().length < 10) return;
      reasonPatterns.forEach(({ reason, regex }) => {
        if (regex.test(text)) {
          const entry = reasonMap.get(reason) || { ids: [], examples: [] };
          entry.ids.push(t.id);
          if (entry.examples.length < 2) entry.examples.push(text.substring(0, 150).replace(/\n/g, " "));
          reasonMap.set(reason, entry);
        }
      });
    });

    return Array.from(reasonMap.entries())
      .map(([reason, data]) => ({ reason, count: data.ids.length, ticketIds: data.ids, examples: data.examples }))
      .sort((a, b) => b.count - a.count);
  }

  return {
    totalExchanges: exchangeTickets.length,
    totalReturns: returnTickets.length,
    exchangesByProduct: groupByProduct(exchangeTickets),
    returnsByProduct: groupByProduct(returnTickets),
    exchangeReasons: extractReasons(exchangeTickets),
    returnReasons: extractReasons(returnTickets),
  };
}

// ─── Recommendations engine ─────────────────────────────

function computeRecommendations(tickets: GorgiasTicket[]): ActionableRecommendation[] {
  const recs: ActionableRecommendation[] = [];
  const total = tickets.length;
  if (total === 0) return recs;

  // Analyze intent distribution
  const intents = computeIntentBreakdown(tickets);
  const otherNoReply = intents.find((i) => i.category === "Other");
  if (otherNoReply && otherNoReply.percentage > 30) {
    recs.push({
      priority: "high",
      category: "Automation",
      title: `${otherNoReply.percentage}% of tickets are "Other/No Reply"`,
      description: "A large portion of tickets get auto-classified as Other with no customer reply. Consider setting up auto-close rules or reviewing if these are spam/non-support messages.",
      impact: `Could reduce manual review of ~${otherNoReply.count} tickets`,
    });
  }

  // Product availability issues
  const contacts = computeContactReasonBreakdown(tickets);
  const preSale = contacts.find((c) => c.reason === "Pre-sale");
  if (preSale && preSale.percentage > 15) {
    recs.push({
      priority: "medium",
      category: "Product",
      title: `${preSale.percentage}% of tickets are pre-sale questions`,
      description: "High pre-sale inquiry volume suggests product pages may lack sufficient information. Review product descriptions, FAQs, and sizing guides.",
      impact: `Could deflect ~${Math.round(preSale.count * 0.3)} tickets with better product pages`,
    });
  }

  // Compute email insights once for use in recommendations
  const emailInsights = computeEmailInsights(tickets);

  // Return + exchange > 10%
  const returnReq = emailInsights.topCustomerRequests.find((r) => r.request === "Return request");
  const exchangeReq = emailInsights.topCustomerRequests.find((r) => r.request === "Exchange request");
  const reTotal = (returnReq?.count ?? 0) + (exchangeReq?.count ?? 0);
  const rePercent = parseFloat(((reTotal / total) * 100).toFixed(1));
  if (rePercent > 10) {
    recs.push({
      priority: "high",
      category: "Returns",
      title: `${rePercent}% of tickets involve returns or exchanges`,
      description: "Review top return reasons from email bodies. Common patterns may point to product quality issues, sizing confusion, or color accuracy in photos.",
      impact: "Reducing returns by 20% could significantly improve margins",
    });
  }

  // Negative sentiment
  const negTickets = tickets.filter((t) =>
    (t.managedSentiment || "").toLowerCase().includes("negative")
  );
  const negPercent = parseFloat(((negTickets.length / total) * 100).toFixed(1));
  if (negPercent > 5) {
    recs.push({
      priority: "high",
      category: "Customer Experience",
      title: `${negPercent}% of tickets have negative sentiment`,
      description: "Investigate the common themes in negative tickets. Look at product quality complaints, shipping delays, and unresolved issues.",
      impact: `${negTickets.length} unhappy customers could leave negative reviews`,
    });
  }

  // Agent workload imbalance
  const agents = computeAgentQuality(tickets);
  if (agents.length >= 2) {
    const maxAgent = agents[0];
    const minAgent = agents[agents.length - 1];
    if (maxAgent.ticketsClosed > minAgent.ticketsClosed * 3) {
      recs.push({
        priority: "medium",
        category: "Team",
        title: "Significant workload imbalance across agents",
        description: `${maxAgent.name} handles ${maxAgent.ticketsClosed} tickets while ${minAgent.name} handles ${minAgent.ticketsClosed}. Consider rebalancing ticket assignment.`,
        impact: "Better distribution could improve response times and reduce burnout",
      });
    }
  }

  // Stock-related email mentions > 3
  const stockMentions = emailInsights.topCustomerRequests.find(
    (r) => r.request === "Stock availability"
  );
  if (stockMentions && stockMentions.count > 3) {
    recs.push({
      priority: "medium",
      category: "Inventory",
      title: `${stockMentions.count} tickets mention stock availability issues`,
      description: "Customers are frequently asking about out-of-stock items. Consider implementing back-in-stock notifications and improving inventory visibility on product pages.",
      impact: "Could convert waiting customers into immediate sales",
    });
  }

  // Quality-related email mentions > 2
  const qualityMentions = emailInsights.topCustomerRequests.find(
    (r) => r.request === "Quality / defect issue"
  );
  if (qualityMentions && qualityMentions.count > 2) {
    recs.push({
      priority: "high",
      category: "Product Quality",
      title: `${qualityMentions.count} tickets mention product quality issues`,
      description: "Multiple customers report quality problems. This warrants a QA review of affected products and potentially updating supplier standards.",
      impact: "Addressing quality issues reduces returns and protects brand reputation",
    });
  }

  // Positive feedback > 5
  const positiveSent = emailInsights.sentimentDistribution.find(
    (s) => s.sentiment.toLowerCase() === "positive"
  );
  if (positiveSent && positiveSent.count > 5) {
    recs.push({
      priority: "low",
      category: "Marketing",
      title: `${positiveSent.count} positive feedback tickets could be leveraged`,
      description: "Collect and showcase positive customer feedback. Consider asking these satisfied customers for reviews on your product pages.",
      impact: "Social proof can increase conversion rates by 10-15%",
    });
  }

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

// ─── Helpers ────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function emptyAnalytics(): EnhancedAnalytics {
  return {
    totalTickets: 0, closedTickets: 0, openTickets: 0,
    avgResponseTime: 0, avgResolutionTime: 0, satisfactionScore: 0,
    oneTouchRate: 0, zeroTouchTickets: 0, messagesPerTicket: 0,
    ticketsWithCustomerMessages: 0,
    ticketsOverTime: [], channelBreakdown: [], intentBreakdown: [],
    contactReasonBreakdown: [], productInsights: [], agentQuality: [],
    emailInsights: { commonKeywords: [], topCustomerRequests: [], productMentions: [], sentimentDistribution: [] },
    customerVoice: {
      firstContactDrivers: [], commonThemes: [], whatWorksWell: [],
      improvementOpportunities: [], surveyInsights: { avgScore: 0, totalResponses: 0, positiveComments: [], negativeComments: [], themes: [] },
      customerTypeBreakdown: [],
    },
    recommendations: [], sentimentOverTime: [], tagBreakdown: [], resolutionBreakdown: [],
    monthlyBreakdown: [] as MonthlyBreakdown[],
    exchangeAnalysis: { totalExchanges: 0, totalReturns: 0, exchangesByProduct: [], returnsByProduct: [], exchangeReasons: [], returnReasons: [] },
    qaCompliance: { ticketsAudited: 0, ticketsAuditable: 0, avgComplianceScore: 0, passRate: 0, totalViolations: 0, violations: [], agentCompliance: [], scoreDistribution: [] },
    knowledgeGaps: [],
  };
}
