# Catering SaaS — Phase 1 Architecture

## Stack
Next.js 15 (App Router, TS) · Tailwind + shadcn/ui · Supabase (Postgres, Auth, Storage) · Vercel + Vercel Cron.

## Tenancy model
Every business-owned table carries `business_id`. Access is enforced two ways:
1. **RLS (hard boundary)** — `is_business_member(business_id)` gates every row (see `0002_rls.sql`).
2. **Role checks (soft boundary, app + RLS)** — `owner > manager > staff`. Staff can see prep/kitchen data but not `payments` or order pricing (enforced at the RLS layer on `payments`, and by only exposing a "kitchen view" projection — no prices — in the API for staff-scoped requests).

The Supabase **anon/publishable key** you supplied is safe to put in `NEXT_PUBLIC_SUPABASE_ANON_KEY` — it's designed for client use and RLS is what actually protects data. A **service-role key** (not provided) must never reach the browser; it's only used in server actions/route handlers for privileged operations (e.g. cron reminder dispatch, PDF storage writes).

## Data integrity rules baked into the schema
- **Snapshots**: `orders.package_name_snapshot`, `price_per_plate_paise`, `terms_snapshot`, and `order_menu_items.menu_item_name_snapshot` freeze values at order-creation time, so editing a package/menu/terms later never rewrites history.
- **Money**: all amounts are `bigint` paise, never floats.
- **Payments are an append-only ledger** (`payments` table), never a mutable "amount_paid" column — `orders.grand_total_paise` minus `sum(payments.amount_paise)` (with sign convention for refunds handled in a server-side computed view) gives balance.
- **Soft delete**: `menu_items.is_archived`, `packages.is_archived` — never hard-deleted once referenced by an order.
- **Human-friendly IDs**: `next_business_number()` Postgres function atomically issues `ORD-2026-0001` / `QT-2026-0001` / `PAY-2026-0001` per business, per kind.

## Folder structure
```
app/
  (auth)/login, signup, forgot-password, reset-password
  (app)/dashboard, orders, orders/new, orders/[id], customers, customers/[id],
        menus, packages, packages/new, packages/[id], payments, calendar,
        preparation, reports, settings/*
  q/[token]/                 -- public secure quotation view
  api/cron/reminders/        -- Vercel Cron target
components/                  -- shared, dumb UI (cards, bottom sheets, steppers)
features/
  orders/  customers/  menus/  packages/  payments/  dashboard/  notifications/  documents/  settings/
lib/
  supabase/ (server client, browser client, middleware)
  money.ts (paise <-> ₹ formatting, Indian digit grouping)
  dates.ts (Asia/Kolkata-aware formatting)
server/
  actions/  -- server actions per feature, each does Zod validation + RLS-respecting Supabase calls
  pdf/      -- quotation/order-confirmation/kitchen-sheet generators
  notifications/ -- NotificationService abstraction: sendSMS/sendEmail/sendWhatsApp
types/
  domain.ts -- generated + hand-written TS types mirroring the schema
```

## PDF generation
Server-side only (route handler / server action), using `@react-pdf/renderer` (works well on Vercel serverless, no headless-Chrome dependency). Three templates share a layout: Quotation, Order Confirmation, Kitchen Sheet (no pricing shown). Generated PDFs are optionally persisted to Supabase Storage at `{business_id}/orders/{order_id}/{document_type}-v{version}.pdf` and tracked in `documents`, giving free version history.

## Reminders
A single Vercel Cron route (`/api/cron/reminders`, e.g. daily at 08:00 IST) runs server-side with the service-role key: finds orders whose `event_date` is `reminder_days_before` days out (per business's `Asia/Kolkata`-aware calculation), checks `notifications` for an existing row with the same idempotency `event_key` (`order:{id}:reminder:{n}d`) before sending, and logs the result. `NotificationService` is an interface (`sendSMS/sendEmail/sendWhatsApp`) so swapping providers (e.g. MSG91, Resend, WhatsApp Business API) later doesn't touch call sites.

## Implementation order (matches the product spec's phases)
1. Schema + auth + onboarding + shell nav (this phase — done: migrations above)
2. Menu catalogue + package builder
3. Customers + order-creation wizard + pricing engine
4. Dashboard + order detail + calendar/search
5. Payment ledger + status computation
6. PDF + versioning + share
7. Reminders/notifications
8. Preparation checklist + kitchen sheet + reports + polish

## Suggested next step
Hand the repo skeleton (migrations + `.env.example` + this doc, both included) to **Claude Code**, which can `npx create-next-app`, install shadcn/Supabase deps, run `supabase db push` against your project, and iterate phase-by-phase with an actual build/test loop — something this chat environment can't do (no network access here to install packages or reach Supabase).
