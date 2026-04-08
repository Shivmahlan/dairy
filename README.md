# Dairy Manager

A professional, full-featured dairy management web application for tracking milk collection, item transactions, and financial records. Built with Next.js, Tailwind CSS, and Supabase for reliability and modern UX.

## Features

- **Authentication**: Secure Supabase email/password login. No public dashboard access.
- **Sidebar Navigation**: Quick access to Dashboard, Members, Milk Collection, Daily Summary, Financials, and Reports.
- **Milk Collection Module**: Live calculation of milk amount (weight × fat × 8.5), shift-based entry, and validation.
- **Item Credit/Debit**: Track item-based credits/debits linked to milk shifts, with notes and type selection.
- **Records Module**: Date-range filtering, combined view of milk, item, and payment transactions. Add payments directly.
- **Ledger Cycles**: Automated 10-day cycles (`1-10`, `11-20`, `21-end of month`), with close-cycle locking to prevent backdated changes.
- **Financials & Reports**: Export filtered records as CSV or PDF. Ledger cycle PDF export supported.
- **Member Portal**: Separate member access for transparency.
- **Responsive UI**: Modern, mobile-friendly design with reusable components (Sidebar, DashboardShell, PageHeader, SummaryCard, AlertBanner, etc).

## Tech Stack

- Next.js App Router
- React 19
- Tailwind CSS
- Supabase Auth + PostgreSQL
- jsPDF for PDF export

## Key Components

- `Sidebar` / `DashboardSidebar`: Navigation for admin and dashboard views.
- `MilkCollectionClient`: Handles milk entry and item transaction forms, validation, and today's activity tables.
- `RecordsClient`: Date-filtered transaction management and export.
- `LedgerClient` / `LedgerCycleDetailClient`: Ledger cycle overview, detail, and closing logic.
- `LoginForm`, `LogoutButton`, `AlertBanner`, `SummaryCard`, `PageHeader`, `DashboardShell`, `SubmitButton`.

## Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Add your Supabase project values:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

## Supabase Setup

1. Create a Supabase project.
2. Create one Auth user manually in the Supabase dashboard.
3. Run the SQL in `supabase/schema.sql` to set up tables:
   - `milk_entries`
   - `transactions`
   - `ledger_cycles`
   - `item_transactions`
4. Use the created user to log into the app.

## Local Development

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run build
```

## Notes

- No signup flow in the UI; user must be created in Supabase.
- All database operations use the Supabase client.
- Records page defaults to current month-to-date.
- Closing a ledger cycle locks new entries for that period across all modules.
- All components are modular and reusable for easy extension.
