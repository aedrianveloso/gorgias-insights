import type {
  GorgiasTicket,
  QACompliance,
  QAViolation,
  AgentCompliance,
  KnowledgeGap,
} from "@/types/gorgias";

// Playbook-driven QA rule checks. These run on whatever text is available
// per ticket (emailBody / customerMessages / surveyComment / subject).
// Sections A & C from the QA Audit Form (the rule-checkable parts).

interface RuleResult {
  code: string;
  section: "A" | "B" | "C" | "D";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  fix: string;
  failed: boolean;
}

function getAuditText(t: GorgiasTicket): string {
  return [t.emailBody, t.customerMessages, t.subject, t.surveyComment]
    .filter(Boolean)
    .join("\n");
}

function isAuditable(t: GorgiasTicket): boolean {
  const text = getAuditText(t);
  return text.trim().length > 50; // need some content to score
}

// Run all rule checks against a single ticket. Returns the list of failed rules.
function runRules(t: GorgiasTicket): RuleResult[] {
  const text = getAuditText(t);
  const lower = text.toLowerCase();
  const results: RuleResult[] = [];

  // ─── Section A — Writing Style & Tone ───
  results.push({
    code: "A1",
    section: "A",
    title: "Generic greeting",
    description: 'Used "Hi Customer" / "Hi there" instead of customer name',
    severity: "medium",
    fix: "Always greet customers by their first name",
    failed: /\b(hi|hello|dear)\s+(customer|there|valued customer|sir\/madam)\b/i.test(text),
  });

  results.push({
    code: "A3",
    section: "A",
    title: "Excessive enthusiasm",
    description: 'Used "We\'re so excited", multiple exclamation marks, or filler phrases',
    severity: "low",
    fix: "Keep tone warm but professional — no \"so excited\" or !!! ",
    failed: /we'?re so excited|!{2,}|super excited|absolutely thrilled/i.test(text),
  });

  results.push({
    code: "A4",
    section: "A",
    title: "Missing standard closing",
    description: 'Did not end with "Cheers, [Name], Wamsutta Support"',
    severity: "low",
    fix: "Always close with the standard sign-off",
    failed:
      isAuditable(t) &&
      !/cheers,?\s*\n?\s*[a-z]+/i.test(text) &&
      !/wamsutta support/i.test(text),
  });

  results.push({
    code: "A5",
    section: "A",
    title: "CAUTION banner left in thread",
    description: "Email thread still contains the external email warning banner",
    severity: "high",
    fix: "Always delete the CAUTION banner before sending",
    failed: /\bcaution\b.*external|external email|do not click|external sender/i.test(text),
  });

  // ─── Section C — Process & Protocol ───
  results.push({
    code: "C2",
    section: "C",
    title: "Wrong refund/shipping timeframe",
    description: 'Quoted incorrect timeframe (e.g. "5-7 days" for refunds, "by tomorrow")',
    severity: "high",
    fix: 'Refunds = "3-5 business days", Shipping = "1-2 business days"',
    failed:
      /\b(5[-–\s]?to?[-–\s]?7|7[-–\s]?to?[-–\s]?10)\s*business\s*days?\b/i.test(text) ||
      /\b(by tomorrow|asap|immediately|right away)\b/i.test(lower),
  });

  results.push({
    code: "C3",
    section: "C",
    title: "Wrong discount code format",
    description: 'Used "WAMSUTTA10" or "wamsutta10" instead of "Wamsutta10"',
    severity: "medium",
    fix: 'Discount code must be exactly "Wamsutta10" (capital W only)',
    failed: /\b(WAMSUTTA10|wamsutta10)\b/.test(text) && !/\bWamsutta10\b/.test(text),
  });

  // C6 — Escalation triggers not handled
  const hasEscalationTrigger =
    /\b(wholesale|bulk order|chargeback|lawyer|attorney|sue|legal action|better business bureau|bbb complaint)\b/i.test(
      lower
    );
  const wasEscalated =
    /\b(escalat|aedrian|jj|jonathon|supervisor|manager)\b/i.test(text) ||
    (t.tags || []).some((tag) => /escalat/i.test(tag));
  results.push({
    code: "C6",
    section: "C",
    title: "Missed escalation",
    description: "Ticket had escalation triggers (wholesale, legal, chargeback) but was not escalated",
    severity: "high",
    fix: "Escalate wholesale/payment/legal issues to JJ or Aedrian immediately",
    failed: hasEscalationTrigger && !wasEscalated,
  });

  // C8 — Contact reason missing
  results.push({
    code: "C8",
    section: "C",
    title: "Missing contact reason",
    description: "Gorgias contact reason was left blank",
    severity: "medium",
    fix: "Always tag a contact reason before closing the ticket",
    failed: !t.contactReason || t.contactReason.trim() === "" || t.contactReason === "Not specified",
  });

  return results;
}

// ─── Knowledge gap detection (website/FAQ improvement signals) ───
const KNOWLEDGE_TOPICS: {
  topic: string;
  description: string;
  patterns: RegExp[];
  websiteAction: string;
  severity: "high" | "medium" | "low";
}[] = [
  {
    topic: "Sateen vs Percale confusion",
    description: "Customers asking about the difference between weaves",
    patterns: [/sateen.*percale|percale.*sateen|what.*(sateen|percale)|difference.*(sateen|percale)/i],
    websiteAction: "Add a Sateen vs Percale comparison table to product pages and FAQ",
    severity: "high",
  },
  {
    topic: "Flat sheet sold separately",
    description: "Customers asking if flat sheets are available alone",
    patterns: [/flat sheet.*separat|just.*flat sheet|only.*flat sheet|flat sheet by itself/i],
    websiteAction: "Add note to sheet product pages that flat sheets are not sold separately, OR add as SKU",
    severity: "medium",
  },
  {
    topic: "Pocket depth questions",
    description: "Customers asking about fitted sheet pocket depth",
    patterns: [/pocket depth|how deep.*fitted|fit.*\d+.*inch.*mattress|deep mattress/i],
    websiteAction: "Add pocket depth (18\", fits up to 20\" mattress) to product specs",
    severity: "medium",
  },
  {
    topic: "Legacy/BBB product inquiries",
    description: "Customers asking about discontinued BBB-era products",
    patterns: [/dreamzone|supercale|bed bath|bbb|\bbed bath & beyond\b|legacy product|old.*wamsutta/i],
    websiteAction: "Create legacy product redirect page mapping discontinued items to current equivalents",
    severity: "high",
  },
  {
    topic: "Pillow firmness / sleep position",
    description: "Customers unsure which pillow firmness to choose",
    patterns: [/which pillow|what firmness|side sleeper|back sleeper|stomach sleeper|pillow.*firm|soft.*medium.*firm/i],
    websiteAction: "Add a pillow firmness selector by sleep position to pillow product pages",
    severity: "medium",
  },
  {
    topic: "Twin / TXL availability for Supreme",
    description: "Customers asking for Supreme Egyptian Cotton in Twin sizes",
    patterns: [/supreme.*twin|twin.*supreme|twin xl.*supreme|supreme.*txl/i],
    websiteAction: "Clearly note Supreme Egyptian Cotton is not available in Twin/TXL on the product page",
    severity: "low",
  },
  {
    topic: "Care / washing instructions",
    description: "Customers asking how to wash or care for products",
    patterns: [/how.*wash|care instructions|fabric softener|dryer.*sheet|wash.*temperature|how.*dry/i],
    websiteAction: "Make care instructions more prominent on product pages and add to packaging",
    severity: "medium",
  },
  {
    topic: "Pillowcase sizing per bed",
    description: "Customers confused about pillowcase sizes included with sheet sets",
    patterns: [/pillowcase.*size|king pillowcase|standard pillowcase|how many pillowcases|what size.*pillowcase/i],
    websiteAction: "Add explicit pillowcase size + count breakdown to sheet set product descriptions",
    severity: "medium",
  },
  {
    topic: "Order status / where is my order",
    description: "Customers asking for shipment status (could be self-serve)",
    patterns: [/where.*my order|order status|tracking|when.*ship|hasn'?t shipped/i],
    websiteAction: "Add a self-serve order tracking page and email proactive shipping updates",
    severity: "medium",
  },
  {
    topic: "Country of manufacture",
    description: "Customers asking where products are made",
    patterns: [/made in|where.*made|country of origin|manufactured/i],
    websiteAction: 'Add "Made in India" to product specs',
    severity: "low",
  },
];

export function computeKnowledgeGaps(tickets: GorgiasTicket[]): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = KNOWLEDGE_TOPICS.map((topic) => ({
    topic: topic.topic,
    description: topic.description,
    count: 0,
    ticketIds: [] as number[],
    websiteAction: topic.websiteAction,
    severity: topic.severity,
  }));

  tickets.forEach((t) => {
    const text = getAuditText(t);
    if (!text) return;
    KNOWLEDGE_TOPICS.forEach((topic, i) => {
      if (topic.patterns.some((p) => p.test(text))) {
        gaps[i].count++;
        gaps[i].ticketIds.push(t.id);
      }
    });
  });

  return gaps.filter((g) => g.count > 0).sort((a, b) => b.count - a.count);
}

// ─── Main QA compliance computation ───
export function computeQACompliance(tickets: GorgiasTicket[]): QACompliance {
  const auditable = tickets.filter(isAuditable);
  const violationMap = new Map<string, QAViolation>();
  const ticketScores: { ticket: GorgiasTicket; score: number; failedCodes: string[] }[] = [];

  auditable.forEach((t) => {
    const results = runRules(t);
    const total = results.length;
    const passed = results.filter((r) => !r.failed).length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;
    const failedCodes: string[] = [];

    results.forEach((r) => {
      if (!r.failed) return;
      failedCodes.push(r.code);
      if (!violationMap.has(r.code)) {
        violationMap.set(r.code, {
          code: r.code,
          section: r.section,
          title: r.title,
          description: r.description,
          count: 0,
          ticketIds: [],
          severity: r.severity,
          fix: r.fix,
        });
      }
      const v = violationMap.get(r.code)!;
      v.count++;
      v.ticketIds.push(t.id);
    });

    ticketScores.push({ ticket: t, score, failedCodes });
  });

  const violations = Array.from(violationMap.values()).sort((a, b) => b.count - a.count);
  const totalViolations = violations.reduce((s, v) => s + v.count, 0);
  const avgScore =
    ticketScores.length > 0
      ? Math.round(ticketScores.reduce((s, ts) => s + ts.score, 0) / ticketScores.length)
      : 0;
  const passCount = ticketScores.filter((ts) => ts.score >= 85).length;
  const coachingCount = ticketScores.filter((ts) => ts.score >= 70 && ts.score < 85).length;
  const immediateCount = ticketScores.filter((ts) => ts.score < 70).length;
  const passRate =
    ticketScores.length > 0 ? Math.round((passCount / ticketScores.length) * 100) : 0;

  // Per-agent compliance
  const agentMap = new Map<
    string,
    { scores: number[]; passes: number; coaching: number; immediate: number; codes: Map<string, number> }
  >();
  ticketScores.forEach((ts) => {
    const name = ts.ticket.assigneeName || "Unassigned";
    if (!agentMap.has(name)) {
      agentMap.set(name, { scores: [], passes: 0, coaching: 0, immediate: 0, codes: new Map() });
    }
    const a = agentMap.get(name)!;
    a.scores.push(ts.score);
    if (ts.score >= 85) a.passes++;
    else if (ts.score >= 70) a.coaching++;
    else a.immediate++;
    ts.failedCodes.forEach((c) => a.codes.set(c, (a.codes.get(c) || 0) + 1));
  });

  const agentCompliance: AgentCompliance[] = Array.from(agentMap.entries())
    .map(([name, a]) => {
      const violationLookup = new Map(violations.map((v) => [v.code, v.title]));
      return {
        name,
        ticketsAudited: a.scores.length,
        avgScore:
          a.scores.length > 0
            ? Math.round(a.scores.reduce((s, x) => s + x, 0) / a.scores.length)
            : 0,
        passCount: a.passes,
        coachingCount: a.coaching,
        immediateCoachingCount: a.immediate,
        topViolations: Array.from(a.codes.entries())
          .sort((x, y) => y[1] - x[1])
          .slice(0, 3)
          .map(([code, count]) => ({
            code,
            title: violationLookup.get(code) || code,
            count,
          })),
      };
    })
    .filter((a) => a.name !== "Unassigned" || a.ticketsAudited > 0)
    .sort((a, b) => b.ticketsAudited - a.ticketsAudited);

  return {
    ticketsAudited: ticketScores.length,
    ticketsAuditable: auditable.length,
    avgComplianceScore: avgScore,
    passRate,
    totalViolations,
    violations,
    agentCompliance,
    scoreDistribution: [
      { band: "Pass (85%+)", count: passCount },
      { band: "Coaching (70-84%)", count: coachingCount },
      { band: "Immediate (<70%)", count: immediateCount },
    ],
  };
}
