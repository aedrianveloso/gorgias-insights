import type {
  GorgiasTicket,
  EnhancedAnalytics,
  IntentBreakdown,
  ContactReasonBreakdown,
  ProductInsight,
  AgentQuality,
  EmailInsight,
  ActionableRecommendation,
} from "@/types/gorgias";

// ─── Main analytics computation ─────────────────────────

export function computeAnalytics(tickets: GorgiasTicket[]): EnhancedAnalytics {
  const total = tickets.length;
  if (total === 0) return emptyAnalytics();

  const closed = tickets.filter((t) => t.status.toLowerCase() === "closed");
  const open = tickets.filter((t) => t.status.toLowerCase() !== "closed");

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
    ticketsOverTime: computeTicketsOverTime(tickets),
    channelBreakdown: computeChannelBreakdown(tickets),
    intentBreakdown: computeIntentBreakdown(tickets),
    contactReasonBreakdown: computeContactReasonBreakdown(tickets),
    productInsights: computeProductInsights(tickets),
    agentQuality: computeAgentQuality(tickets),
    emailInsights: computeEmailInsights(tickets),
    recommendations: computeRecommendations(tickets),
    sentimentOverTime: computeSentimentOverTime(tickets),
    tagBreakdown: computeTagBreakdown(tickets),
    resolutionBreakdown: computeResolutionBreakdown(tickets),
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
  const map = new Map<string, Map<string, number>>();

  tickets.forEach((t) => {
    const cat = t.intentCategory || "Unknown";
    if (!map.has(cat)) map.set(cat, new Map());
    const sub = t.intentSubCategory || "Other";
    const subMap = map.get(cat)!;
    subMap.set(sub, (subMap.get(sub) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([category, subMap]) => {
      const count = Array.from(subMap.values()).reduce((s, v) => s + v, 0);
      return {
        category,
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1)),
        subCategories: Array.from(subMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── Contact reason breakdown ───────────────────────────

function computeContactReasonBreakdown(tickets: GorgiasTicket[]): ContactReasonBreakdown[] {
  const total = tickets.length;
  const map = new Map<string, Map<string, number>>();

  tickets.forEach((t) => {
    const reason = t.contactCategory || "Unknown";
    if (!map.has(reason)) map.set(reason, new Map());
    const detail = t.contactDetail || "Other";
    const detailMap = map.get(reason)!;
    detailMap.set(detail, (detailMap.get(detail) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([reason, detailMap]) => {
      const count = Array.from(detailMap.values()).reduce((s, v) => s + v, 0);
      return {
        reason,
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1)),
        details: Array.from(detailMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── Product insights ───────────────────────────────────

function computeProductInsights(tickets: GorgiasTicket[]): ProductInsight[] {
  const map = new Map<string, { tickets: GorgiasTicket[] }>();

  tickets.forEach((t) => {
    const product = t.product || "Not specified";
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

      return {
        product,
        totalTickets: data.tickets.length,
        topIssues: Array.from(issueMap.entries())
          .map(([issue, count]) => ({ issue, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        sentiment: { positive, negative, neutral },
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
      const closed = agentTickets.filter((t) => t.status.toLowerCase() === "closed");
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
    .sort((a, b) => b.ticketsClosed - a.ticketsClosed);
}

// ─── Email body insights ────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "to", "of",
  "in", "for", "on", "with", "at", "by", "from", "as", "into", "about",
  "like", "through", "after", "over", "between", "out", "against", "during",
  "and", "but", "or", "nor", "not", "so", "yet", "both", "either", "neither",
  "this", "that", "these", "those", "it", "its", "i", "me", "my", "we", "our",
  "you", "your", "he", "she", "they", "them", "his", "her", "their", "what",
  "which", "who", "whom", "where", "when", "why", "how", "all", "each",
  "every", "any", "some", "no", "just", "very", "also", "if", "then",
  "than", "too", "up", "down", "here", "there", "am", "get", "got",
  "hi", "hello", "thanks", "thank", "please", "caution", "email",
  "originated", "outside", "organization", "click", "links", "open",
  "attachments", "unless", "recognize", "sender", "know", "content",
  "safe", "received", "new", "message", "online", "store", "contact",
  "form", "country", "code", "name", "us", "de", "re", "set", "one",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
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
    { pattern: /thread count|material|fabric|cotton|egyptian/i, label: "Material / fabric question" },
    { pattern: /pillow/i, label: "Pillow related" },
    { pattern: /sheet|bedding/i, label: "Sheet / bedding related" },
    { pattern: /towel/i, label: "Towel related" },
    { pattern: /warranty|guarantee/i, label: "Warranty inquiry" },
    { pattern: /order\s*#?\s*\d+/i, label: "Order number referenced" },
  ];

  const requestCounts = new Map<string, { count: number; examples: string[] }>();
  withBody.forEach((t) => {
    requestPatterns.forEach(({ pattern, label }) => {
      if (pattern.test(t.emailBody)) {
        const entry = requestCounts.get(label) || { count: 0, examples: [] };
        entry.count++;
        if (entry.examples.length < 2) {
          const snippet = t.emailBody.substring(0, 150).replace(/\n/g, " ");
          entry.examples.push(snippet);
        }
        requestCounts.set(label, entry);
      }
    });
  });

  const topCustomerRequests = Array.from(requestCounts.entries())
    .map(([request, data]) => ({ request, count: data.count, examples: data.examples }))
    .sort((a, b) => b.count - a.count);

  // Product mentions in email bodies
  const productKeywords = [
    "sheet", "sheets", "pillow", "pillowcase", "towel", "towels",
    "blanket", "comforter", "duvet", "mattress", "bath", "washcloth",
    "egyptian cotton", "supreme", "dreamzone", "wamsutta",
  ];
  const productFreq = new Map<string, number>();
  withBody.forEach((t) => {
    const lower = t.emailBody.toLowerCase();
    productKeywords.forEach((pk) => {
      if (lower.includes(pk)) {
        productFreq.set(pk, (productFreq.get(pk) || 0) + 1);
      }
    });
  });

  const productMentions = Array.from(productFreq.entries())
    .map(([product, count]) => ({ product, count }))
    .sort((a, b) => b.count - a.count);

  // Sentiment distribution
  const sentMap = new Map<string, number>();
  tickets.forEach((t) => {
    const sent = t.managedSentiment || "Unknown";
    if (sent && sent.trim().length > 0) {
      sentMap.set(sent, (sentMap.get(sent) || 0) + 1);
    }
  });
  const sentTotal = Array.from(sentMap.values()).reduce((s, v) => s + v, 0) || 1;
  const sentimentDistribution = Array.from(sentMap.entries())
    .map(([sentiment, count]) => ({
      sentiment,
      count,
      percentage: parseFloat(((count / sentTotal) * 100).toFixed(1)),
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

  // Return/exchange rate
  const returnExchange = contacts.filter((c) =>
    c.reason === "Return" || c.reason === "Exchange"
  );
  const reTotal = returnExchange.reduce((s, c) => s + c.count, 0);
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

  // Email body insights
  const withBody = tickets.filter((t) => t.emailBody && t.emailBody.trim().length > 10);
  if (withBody.length > 0) {
    const stockMentions = withBody.filter((t) =>
      /out of stock|not available|back in stock|restock|sold out/i.test(t.emailBody)
    );
    if (stockMentions.length > 3) {
      recs.push({
        priority: "high",
        category: "Inventory",
        title: `${stockMentions.length} tickets mention stock availability issues`,
        description: "Customers are frequently asking about out-of-stock items. Consider implementing back-in-stock notifications and improving inventory visibility on product pages.",
        impact: "Could convert waiting customers into immediate sales",
      });
    }

    const qualityMentions = withBody.filter((t) =>
      /defect|damaged|broken|torn|quality|fell apart|pilling/i.test(t.emailBody)
    );
    if (qualityMentions.length > 2) {
      recs.push({
        priority: "high",
        category: "Product Quality",
        title: `${qualityMentions.length} tickets mention product quality issues`,
        description: "Multiple customers report quality problems. This warrants a QA review of affected products and potentially updating supplier standards.",
        impact: "Addressing quality issues reduces returns and protects brand reputation",
      });
    }
  }

  // Macro usage (if we can detect it from email bodies)
  const feedbackTickets = tickets.filter((t) => t.intentCategory === "Feedback");
  if (feedbackTickets.length > 0) {
    const positiveFeedback = feedbackTickets.filter((t) =>
      t.intentSubCategory === "Positive" || (t.managedSentiment || "").toLowerCase().includes("positive")
    );
    if (positiveFeedback.length > 5) {
      recs.push({
        priority: "low",
        category: "Marketing",
        title: `${positiveFeedback.length} positive feedback tickets could be leveraged`,
        description: "Collect and showcase positive customer feedback. Consider asking these satisfied customers for reviews on your product pages.",
        impact: "Social proof can increase conversion rates by 10-15%",
      });
    }
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

function emptyAnalytics(): EnhancedAnalytics {
  return {
    totalTickets: 0, closedTickets: 0, openTickets: 0,
    avgResponseTime: 0, avgResolutionTime: 0, satisfactionScore: 0,
    oneTouchRate: 0, zeroTouchTickets: 0, messagesPerTicket: 0,
    ticketsOverTime: [], channelBreakdown: [], intentBreakdown: [],
    contactReasonBreakdown: [], productInsights: [], agentQuality: [],
    emailInsights: { commonKeywords: [], topCustomerRequests: [], productMentions: [], sentimentDistribution: [] },
    recommendations: [], sentimentOverTime: [], tagBreakdown: [], resolutionBreakdown: [],
  };
}
