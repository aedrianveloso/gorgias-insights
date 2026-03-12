# Wamsutta Gorgias Insights — Project Context

## Overview
Custom analytics dashboard for Wamsutta's Gorgias support data. Built to go beyond Gorgias's built-in analytics with email body analysis, actionable recommendations, product-level insights, and agent quality scoring.

## Tech Stack
- **Framework**: Next.js 16.1.6 + React 19 + TypeScript
- **Charts**: Recharts 3.8
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (optional — dashboard works fully client-side with CSV upload)
- **Branch**: `claude/continue-project-hzADP`

## Architecture
- All analytics run **client-side** — no server needed for core functionality
- CSV is parsed and stored in React context (`TicketProvider`) shared across all pages
- Analytics engine (`src/lib/analytics.ts`) computes all insights from the parsed ticket data

## Key Files
- `src/lib/csv-parser.ts` — Smart CSV parser for Gorgias export format (handles quoted fields, auto-detects columns)
- `src/lib/analytics.ts` — Analytics engine: intent breakdown, contact reasons, product insights, email body NLP, sentiment, agent quality, recommendations
- `src/lib/ticket-store.tsx` — React context provider for shared ticket data across pages
- `src/types/gorgias.ts` — All TypeScript types (GorgiasTicket, EnhancedAnalytics, AgentQuality, etc.)

## Pages
- `/` — **Dashboard**: 10 stat cards, created vs closed chart, channel pie, intent/contact bars, sentiment timeline, agent table, tags, recommendations preview
- `/insights` — **Insights**: Actionable recommendations, intent drill-down with sub-categories, contact reason details, product-level insights, sentiment distribution, resolution types, agent × intent matrix
- `/agents` — **Agents**: Comparison table, workload bar chart, click-to-expand deep-dive with radar chart, per-agent sentiment/intent/contact breakdown
- `/email-analysis` — **Email Analysis**: Customer request pattern detection from email text, product mentions, keyword frequency cloud, sample conversation viewer
- `/upload` — **Upload Data**: CSV upload with preview and column auto-detection

## CSV Format Expected
The CSV parser auto-maps these Gorgias export columns:
- Ticket URL, Email Body (manually added), Ticket Field: AI Intent, Ticket Field: Contact reason
- Ticket Field: Product, Ticket Field: Resolution, Ticket Field: Managed sentiment
- Tags, Status, Channel, Assignee Name, Messages Count, Created At, etc.

## What's Done
- Full dashboard with 5 pages, all working client-side
- CSV parser handles actual Gorgias export format
- Analytics engine with: intent/contact/product/sentiment analysis, email body NLP (keyword extraction, request pattern detection), agent quality scoring, auto-generated recommendations
- Build passes cleanly

## What's Next
- User is filling in "Email Body" column (column 22) in their CSV with conversation text from each Gorgias ticket
- Once uploaded, the Email Analysis page will light up with customer request patterns, product mentions, keywords
- Potential future: Gorgias API integration for automatic data pull, date range filtering, export/PDF reports
- The user wants this dashboard to be significantly better than Gorgias's built-in analytics (screenshots of Gorgias analytics were provided for comparison)

## Gorgias Baseline (Mar 6-12, 2026 data)
For reference, Gorgias built-in shows: CSAT 4.72, FRT 1h40m, Resolution 5h48m, 231 created / 255 closed tickets, 84.85% email / 14.72% Facebook, 5 agents (Marge Tan leads with 81 closed). Our dashboard aims to provide all this PLUS deep email analysis, product insights, cross-dimensional analytics, and actionable recommendations.
