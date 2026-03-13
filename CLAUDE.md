# Wamsutta Gorgias Insights — Project Context

## Overview
Custom analytics dashboard for Wamsutta's Gorgias support data. Built to go beyond Gorgias's built-in analytics with email body analysis, actionable recommendations, product-level insights, and agent quality scoring.

## Tech Stack
- **Framework**: Next.js 16.1.6 + React 19 + TypeScript
- **Charts**: Recharts 3.8
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (optional — dashboard works fully client-side with CSV upload)
- **Branch**: `claude/continue-project-hzADP`
- **Deployed**: gorgias-analytics.vercel.app

## Architecture
- All analytics run **client-side** — no server needed for core functionality
- CSV is parsed and stored in React context (`TicketProvider`) shared across all pages
- Analytics engine (`src/lib/analytics.ts`) computes all insights from the parsed ticket data

## Key Files
- `src/lib/csv-parser.ts` — Smart CSV parser for Gorgias export format (handles quoted fields, auto-detects columns, normalizes headers with spaces→underscores and strips parentheses)
- `src/lib/analytics.ts` — Analytics engine: intent breakdown, contact reasons, product insights, email body NLP, sentiment, agent quality, recommendations
- `src/lib/ticket-store.tsx` — React context provider for shared ticket data across pages
- `src/types/gorgias.ts` — All TypeScript types (GorgiasTicket, EnhancedAnalytics, AgentQuality, etc.)
- `src/components/tickets/TicketDrillDown.tsx` — Reusable drill-down component with clickable Gorgias ticket links, compact mode for small containers

## Pages
- `/` — **Dashboard**: 10 stat cards, created vs closed chart, channel pie, intent/contact bars with drill-down, sentiment timeline, agent table (tickets handled + closed), tags, recommendations preview
- `/insights` — **Insights**: Actionable recommendations, intent drill-down with sub-categories, contact reason details, product-level insights, sentiment distribution, resolution types, agent × intent matrix — all with TicketDrillDown
- `/agents` — **Agents**: Comparison table (tickets handled + closed + response/resolution/CSAT/one-touch), workload bar chart, click-to-expand deep-dive with radar chart, per-agent sentiment/intent/contact breakdown
- `/email-analysis` — **Email Analysis**: Customer request pattern detection from email text, product mentions (compact drill-down), keyword frequency cloud, sample conversation viewer — all with TicketDrillDown
- `/upload` — **Upload Data**: CSV upload with preview and column auto-detection

## CSV Column Mapping (Fixed Session 3)
The parser normalizes headers by: lowercasing, replacing spaces with underscores, stripping parentheses. This handles Gorgias export format where columns are like "Created datetime", "First response time (minutes)", "Ticket Field: AI Intent", etc.

Mapped columns:
- id, Ticket URL, Subject, Status, Channel
- Created datetime, Closed datetime
- Assignee name, Customer email
- First response time (minutes), Full resolution time (minutes) — supports plain numbers, HH:MM:SS, and MM:SS formats
- Satisfaction score, Tags, Messages count
- Ticket Field: AI Intent, Contact reason, Product, Resolution, Managed sentiment
- Email Body (user-added column)

Debug logging: console.log shows headers, column mapping, unmapped fields, and first ticket sample on every upload.

## Status Check Logic
Tickets are considered "closed" if:
- status is "closed", "solved", "resolved", "done", or "completed" (case-insensitive)
- OR if `closedAt` has any value (fallback for when status doesn't match)

## Drill-Down Feature
- Every insight (intent, contact reason, product, sentiment, email pattern) tracks `ticketIds`
- TicketDrillDown component: expandable table with clickable ticket numbers linking to Gorgias
- `compact` prop hides Contact Reason + Agent columns for tight spaces (used in product mention cards)
- Ticket numbers extracted from URL pattern `/ticket/(\d+)/`

## Wamsutta Product Catalog (mapped in analytics.ts email insights)
21 categories: Sheet Sets, Pillowcase Sets, Duvet Sets, Comforter Sets, Quilts & Coverlets, Pillows, Euro Shams & Decorative Pillows, Bath Towels, Bath Sheets, Hand Towels & Washcloths, Bath Mats & Tubmats, Mattress Protectors & Pads, Supreme Egyptian Cotton, Essentials Percale, Essentials Cotton Sateen, Comforters (DA), Gramercy Collection, Soho Collection, Charleston Vine, Garden Toile, Herringbone Stitch

## What's Done (as of Session 3 — Mar 13, 2026)
- Full dashboard with 5 pages, all working client-side
- CSV parser handles actual Gorgias export format with flexible column name matching
- Time parsing supports minutes, HH:MM:SS, MM:SS formats
- Flexible status detection (closed/solved/resolved + closedAt fallback)
- Agent quality includes both ticketsHandled and ticketsClosed
- Analytics engine with: intent/contact/product/sentiment analysis, email body NLP, agent quality scoring, auto-generated recommendations
- TicketDrillDown with clickable Gorgias links, compact mode
- All drill-down ticketIds tracking complete across all analytics
- User tested with 1,013 ticket CSV — everything populating correctly
- Build passes cleanly, deployed to Vercel

## What's Next / Potential Improvements
- User is still filling in "Email Body" column with conversation text (~40 done so far out of 1,013)
- Date range filtering
- Export/PDF reports
- Gorgias API integration for automatic data pull (instead of CSV)
- The user wants this dashboard to be significantly better than Gorgias's built-in analytics

## Gorgias Baseline (Mar 6-12, 2026 data)
For reference, Gorgias built-in shows: CSAT 4.72, FRT 1h40m, Resolution 5h48m, 231 created / 255 closed tickets, 84.85% email / 14.72% Facebook, 5 agents (Dennise E., Aedrian V., Marge Tan, Jonathon Jonas, Tiffany Poppa). Our dashboard provides all this PLUS deep email analysis, product insights, cross-dimensional analytics, and actionable recommendations.
