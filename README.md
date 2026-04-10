# Dairy Management App

A multi-user dairy management web app built with Next.js, Tailwind CSS, and Supabase. Users log in with manually created Supabase Auth accounts, but there is still no signup flow in the UI.

## What It Includes

- Supabase email/password login only
- Multi-user business-based data isolation
- Milk collection with a live `weight x fat x saved milk rate` calculation
- Item credit/debit tracking linked to date and shift
- Records module with date filters, per-user separated tables, payments, CSV import, CSV export, and PDF export
- Automated 10-day ledger cycles with carry-forward balances
- Closed-cycle protection to block backtracking into settled periods
- Ledger overview, balance status tab, cycle detail page, and cycle PDF export

## Stack

- Next.js App Router
- React 19
- Tailwind CSS
- Supabase Auth + PostgreSQL
- jsPDF for PDF export

## Environment Setup

1. Copy `.env.example` to `.env.local`
   ```bash
   cp .env.example .env.local
   ```
2. Add your Supabase project values
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

## Supabase Setup For New Projects

1. Create a Supabase project.
2. Run [supabase/schema.sql](/Users/shiv/Projects/Coding/dairy-manager/supabase/schema.sql).
3. Create one or more Auth users manually in the Supabase dashboard.
4. Insert one row into `public.businesses`.
   Set `milk_rate` if you want something different from the default `8.5`.
5. Insert one row per user into `public.business_members`, linking each user to that business.

Core tables:

- `businesses`
- `business_members`
- `milk_entries`
- `transactions`
- `ledger_cycles`
- `item_transactions`

## Existing Deployment Migration

If you already deployed the single-user version, run [supabase/multi-user-migration.sql](/Users/shiv/Projects/Coding/dairy-manager/supabase/multi-user-migration.sql) in the Supabase SQL editor after editing the placeholder values:

- Replace `'Main Dairy'` with your real business name if needed.
- Replace `'owner@example.com'` and `'staff@example.com'` with the actual Supabase Auth emails that should access the business.

That migration:

- creates business tables
- adds a persistent `milk_rate` setting for each business
- adds `business_id` to existing data tables
- moves current rows into one business
- adds memberships for your chosen users
- replaces shared RLS with business-scoped RLS

## Existing Multi-User Deployment: Milk Rate Upgrade

If your production project is already on the multi-user version, run [supabase/business-milk-rate-migration.sql](/Users/shiv/Projects/Coding/dairy-manager/supabase/business-milk-rate-migration.sql) to add the persistent `milk_rate` setting without rerunning the full multi-user migration.

## Existing Multi-User Deployment: Record Ownership Upgrade

If your production project is already on the multi-user version, run [supabase/records-created-by-migration.sql](/Users/shiv/Projects/Coding/dairy-manager/supabase/records-created-by-migration.sql) before deploying the per-user Records view. It backfills each existing record to a business member so the app can separate records by user.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run build
```

## Notes

- No signup flow exists in the UI.
- Users must be created and assigned manually in Supabase.
- Each login is currently mapped to one business through `public.business_members`.
- All database operations use the Supabase client.
- Closed ledger cycles prevent inserts, updates, and deletes for that period at the database layer.
- CSV import in Records expects `record_kind` and `date`, then:
  milk rows need `shift`, `weight`, `fat`
  payment rows need `type`, `amount`, optional `note`
  item rows need `shift`, `item_name`, `type`, `amount`, optional `note`
