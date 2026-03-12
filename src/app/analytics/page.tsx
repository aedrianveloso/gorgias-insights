"use client";

import { useState, useEffect, useCallback } from "react";
import { getTickets } from "@/lib/api";
import type { Ticket } from "@/types/gorgias";

interface InsightItem {
  name: string;
  count: number;
  percentage: number;
}

interface SubjectKeyword {
  word: string;
  count: number;
}

function analyzeTopics(tickets: Ticket[]): InsightItem[] {
  const map = new Map<string, number>();
  tickets.forEach((t) => {
    // Use contact_reason first, then fall back to tags, then subject keywords
    if (t.contact_reason) {
      const reason = t.contact_reason.replace(/::/g, " > ");
      map.set(reason, (map.get(reason) || 0) + 1);
    } else if (t.tags.length > 0) {
      // Use the most descriptive tag
      const tag = t.tags.find((tg) =>
        ["return", "exchange", "order", "shipping", "refund", "promotion", "feedback", "product", "billing", "warranty"].some(
          (kw) => tg.toLowerCase().includes(kw)
        )
      ) || t.tags[0];
      const normalized = tag.toUpperCase().replace(/_/g, " ");
      map.set(normalized, (map.get(normalized) || 0) + 1);
    } else {
      map.set("Uncategorized", (map.get("Uncategorized") || 0) + 1);
    }
  });

  const total = tickets.length || 1;
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

function analyzeCustomerNeeds(tickets: Ticket[]): InsightItem[] {
  const needs = new Map<string, number>();

  tickets.forEach((t) => {
    const subject = t.subject.toLowerCase();
    const reason = (t.contact_reason || "").toLowerCase();
    const tags = t.tags.join(" ").toLowerCase();
    const combined = `${subject} ${reason} ${tags}`;

    // Categorize into business-relevant needs
    if (/return|exchange|swap|replace/i.test(combined)) {
      needs.set("Returns & Exchanges", (needs.get("Returns & Exchanges") || 0) + 1);
    }
    if (/refund|money back|charge|billing/i.test(combined)) {
      needs.set("Refunds & Billing", (needs.get("Refunds & Billing") || 0) + 1);
    }
    if (/order|tracking|shipping|deliver|shipment/i.test(combined)) {
      needs.set("Order & Shipping Status", (needs.get("Order & Shipping Status") || 0) + 1);
    }
    if (/product|quality|broken|defect|damage/i.test(combined)) {
      needs.set("Product Quality Issues", (needs.get("Product Quality Issues") || 0) + 1);
    }
    if (/pre.?sale|question|info|availability|stock/i.test(combined)) {
      needs.set("Pre-sale Questions", (needs.get("Pre-sale Questions") || 0) + 1);
    }
    if (/discount|coupon|promo|code|deal|sale/i.test(combined)) {
      needs.set("Discounts & Promotions", (needs.get("Discounts & Promotions") || 0) + 1);
    }
    if (/feedback|review|complaint|negative|positive/i.test(combined)) {
      needs.set("Customer Feedback", (needs.get("Customer Feedback") || 0) + 1);
    }
    if (/spam|phishing|scam|unsubscribe/i.test(combined)) {
      needs.set("Spam & Irrelevant", (needs.get("Spam & Irrelevant") || 0) + 1);
    }
    if (/cancel|cancellation/i.test(combined)) {
      needs.set("Order Cancellations", (needs.get("Order Cancellations") || 0) + 1);
    }
    if (/warranty|guarantee/i.test(combined)) {
      needs.set("Warranty Claims", (needs.get("Warranty Claims") || 0) + 1);
    }
    if (/website|login|account|password|security/i.test(combined)) {
      needs.set("Account & Website Issues", (needs.get("Account & Website Issues") || 0) + 1);
    }
  });

  const total = tickets.length || 1;
  return Array.from(needs.entries())
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

function analyzeSubjectKeywords(tickets: Ticket[]): SubjectKeyword[] {
  const stopWords = new Set([
    "re:", "re", "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "shall", "can", "to", "of", "in", "for", "on", "with", "at",
    "by", "from", "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "both", "each",
    "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only",
    "own", "same", "so", "than", "too", "very", "just", "because", "but", "and",
    "or", "if", "while", "about", "up", "it", "its", "i", "me", "my", "we", "our",
    "you", "your", "he", "she", "they", "them", "this", "that", "these", "those",
    "am", "new", "customer", "message", "march", "2026", "2025", "pm", "am", "at",
    "hi", "hello", "dear", "fwd:", "fwd",
  ]);

  const wordMap = new Map<string, number>();

  tickets.forEach((t) => {
    const words = t.subject
      .toLowerCase()
      .replace(/[^a-z0-9\s#]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const seen = new Set<string>();
    words.forEach((word) => {
      if (!seen.has(word)) {
        seen.add(word);
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
      }
    });
  });

  return Array.from(wordMap.entries())
    .map(([word, count]) => ({ word, count }))
    .filter((w) => w.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

function generateActionableInsights(tickets: Ticket[], needs: InsightItem[]): string[] {
  const insights: string[] = [];
  const total = tickets.length;
  if (total === 0) return ["Upload ticket data to see insights."];

  const openTickets = tickets.filter((t) => t.status === "open").length;
  const closedTickets = tickets.filter((t) => t.status === "closed").length;

  // Resolution rate
  const resolutionRate = total > 0 ? Math.round((closedTickets / total) * 100) : 0;
  if (resolutionRate < 50) {
    insights.push(`Only ${resolutionRate}% of tickets are resolved. Consider adding more agents or automating common responses.`);
  } else {
    insights.push(`${resolutionRate}% ticket resolution rate — ${resolutionRate > 80 ? "excellent" : "good"} performance.`);
  }

  // Top need
  if (needs.length > 0) {
    const topNeed = needs[0];
    insights.push(`"${topNeed.name}" is your #1 customer issue (${topNeed.percentage}% of tickets). Consider creating a self-service FAQ or automated response for this.`);
  }

  // Returns analysis
  const returnNeed = needs.find((n) => n.name.includes("Returns"));
  if (returnNeed && returnNeed.percentage > 15) {
    insights.push(`${returnNeed.percentage}% of tickets are about returns/exchanges. Review your return policy visibility and product descriptions to reduce these.`);
  }

  // Pre-sale questions
  const preSale = needs.find((n) => n.name.includes("Pre-sale"));
  if (preSale && preSale.percentage > 10) {
    insights.push(`${preSale.percentage}% are pre-sale questions — potential buyers need more info. Improve product pages with FAQs, size guides, and detailed descriptions.`);
  }

  // Spam
  const spam = needs.find((n) => n.name.includes("Spam"));
  if (spam && spam.percentage > 5) {
    insights.push(`${spam.percentage}% of tickets are spam/irrelevant. Set up auto-close rules in Gorgias to filter these out and save agent time.`);
  }

  // Response time
  const withResponse = tickets.filter((t) => t.response_time_minutes != null && t.response_time_minutes > 0);
  if (withResponse.length > 0) {
    const avgResponse = Math.round(
      withResponse.reduce((sum, t) => sum + t.response_time_minutes!, 0) / withResponse.length
    );
    if (avgResponse > 60) {
      insights.push(`Average response time is ${avgResponse} min (${Math.round(avgResponse / 60)} hrs). Aim for under 1 hour to improve CSAT.`);
    } else {
      insights.push(`Average response time is ${avgResponse} min — great speed!`);
    }
  }

  // Channel analysis
  const channels = new Map<string, number>();
  tickets.forEach((t) => channels.set(t.channel, (channels.get(t.channel) || 0) + 1));
  const topChannel = Array.from(channels.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topChannel) {
    insights.push(`${Math.round((topChannel[1] / total) * 100)}% of tickets come through ${topChannel[0]}. ${topChannel[0] === "email" ? "Consider adding live chat to reduce email volume and speed up resolution." : ""}`);
  }

  // Open tickets alert
  if (openTickets > 0) {
    insights.push(`${openTickets} tickets are still open (${Math.round((openTickets / total) * 100)}%). Review the backlog to prevent customer churn.`);
  }

  return insights;
}

function analyzeTagBreakdown(tickets: Ticket[]): InsightItem[] {
  const tagMap = new Map<string, number>();
  tickets.forEach((t) => {
    t.tags.forEach((tag) => {
      const normalized = tag.trim().toLowerCase();
      if (normalized) {
        tagMap.set(normalized, (tagMap.get(normalized) || 0) + 1);
      }
    });
  });
  const total = tickets.length || 1;
  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

export default function AnalyticsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getTickets();
      setTickets(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">Analyzing your ticket data...</div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
          <p className="text-gray-500 mt-1">AI-powered analysis of your support data</p>
        </div>
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No ticket data yet</p>
          <p className="text-sm mt-1">
            Go to <a href="/tickets" className="text-blue-600 underline">Tickets</a> and upload your Gorgias CSV export to see insights.
          </p>
        </div>
      </div>
    );
  }

  const customerNeeds = analyzeCustomerNeeds(tickets);
  const topics = analyzeTopics(tickets);
  const keywords = analyzeSubjectKeywords(tickets);
  const tagBreakdown = analyzeTagBreakdown(tickets);
  const insights = generateActionableInsights(tickets, customerNeeds);

  const maxKeywordCount = keywords.length > 0 ? keywords[0].count : 1;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
        <p className="text-gray-500 mt-1">
          Business intelligence from {tickets.length.toLocaleString()} support tickets
        </p>
      </div>

      {/* Actionable Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">💡</span> Key Business Insights
        </h3>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-1 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Needs & Topic Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* What Customers Need */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">What Customers Need</h3>
          <p className="text-gray-400 text-sm mb-4">Auto-categorized from subjects, tags & contact reasons</p>
          <div className="space-y-3">
            {customerNeeds.slice(0, 10).map((need) => (
              <div key={need.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{need.name}</span>
                  <span className="text-gray-500">{need.count} ({need.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${need.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {customerNeeds.length === 0 && (
              <p className="text-gray-400 text-sm">No categorizable data found</p>
            )}
          </div>
        </div>

        {/* Contact Reasons / Topics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Top Contact Reasons</h3>
          <p className="text-gray-400 text-sm mb-4">From Gorgias contact reason & tag data</p>
          <div className="space-y-3">
            {topics.slice(0, 10).map((topic) => (
              <div key={topic.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium truncate mr-2">{topic.name}</span>
                  <span className="text-gray-500 flex-shrink-0">{topic.count} ({topic.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keywords & Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Subject Keywords */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Trending Keywords</h3>
          <p className="text-gray-400 text-sm mb-4">Most frequent words in ticket subjects</p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => {
              const intensity = Math.max(0.3, kw.count / maxKeywordCount);
              const fontSize = 12 + Math.round(intensity * 14);
              return (
                <span
                  key={kw.word}
                  className="inline-block px-3 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-default"
                  style={{ fontSize: `${fontSize}px`, opacity: 0.5 + intensity * 0.5 }}
                  title={`${kw.count} tickets`}
                >
                  {kw.word} <span className="text-gray-400 text-xs">({kw.count})</span>
                </span>
              );
            })}
            {keywords.length === 0 && (
              <p className="text-gray-400 text-sm">Not enough data for keyword analysis</p>
            )}
          </div>
        </div>

        {/* Tag Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Tag Breakdown</h3>
          <p className="text-gray-400 text-sm mb-4">Gorgias tags applied to tickets</p>
          <div className="space-y-2">
            {tagBreakdown.map((tag) => (
              <div key={tag.name} className="flex items-center justify-between text-sm">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                  {tag.name}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${tag.percentage}%` }}
                    />
                  </div>
                  <span className="text-gray-500 w-16 text-right">{tag.count}</span>
                </div>
              </div>
            ))}
            {tagBreakdown.length === 0 && (
              <p className="text-gray-400 text-sm">No tags found in ticket data</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{tickets.length.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Tickets</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{customerNeeds.length}</p>
            <p className="text-sm text-gray-500">Issue Categories</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{tagBreakdown.length}</p>
            <p className="text-sm text-gray-500">Unique Tags</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {new Set(tickets.map((t) => t.assignee_name).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-500">Active Agents</p>
          </div>
        </div>
      </div>
    </div>
  );
}
