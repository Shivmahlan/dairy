# Dairy Management App

A simple, reliable dairy management web app built with Next.js, Tailwind CSS, and Supabase.

## What It Includes

- Supabase email/password login only
- Protected routes with no public dashboard access
- Milk Collection module with live amount calculation
- Item credit/debit tracking linked to milk shifts
- Records module with date-range filtering
- Automated 10-day ledger cycles with close-cycle locking
- Credit/debit transaction management
- CSV export for filtered records
- PDF export for records and ledger cycles

## Stack

- Next.js App Router
- React 19
- Tailwind CSS
- Supabase Auth + PostgreSQL
- jsPDF for PDF export

## Environment Setup

Create a `.env.local` file from the example:

```bash
cp .env.example .env.local
```

Add your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

## Supabase Setup

1. Create a Supabase project.
2. Create one Auth user manually in the Supabase dashboard.
3. Run the SQL in [supabase/schema.sql](/Users/shiv/Projects/Coding/dairy-manager/supabase/schema.sql).
4. Use that single email/password user to log into the app.

The schema follows these tables exactly:

- `milk_entries`
- `transactions`
- `ledger_cycles`
- `item_transactions`

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

- There is no signup flow in the UI.
- All database operations use the Supabase client.
- The Records page defaults to the current month through today for its date filter.
- Ledger cycles are generated automatically as `1-10`, `11-20`, and `21-end of month`.
- Closing a cycle locks new backdated entries for that cycle across milk entries, item transactions, and payments.
