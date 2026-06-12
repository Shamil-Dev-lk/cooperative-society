# Cooperative Society Management System
## සමූපකාර සමිතිය කළමනාකරණ පද්ධතිය

A production-ready, bilingual (Sinhala + English) cooperative society management system built with React 18, TypeScript, Tailwind CSS, and Supabase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Routing | React Router DOM v6 |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Data Fetching | TanStack Query |
| Charts | Recharts |
| Animation | Framer Motion |
| Import | SheetJS (xlsx) + PapaParse |
| Export | jsPDF + jsPDF-autotable |
| Backend | Supabase Auth + PostgreSQL + RLS |

---

## Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Go to **Authentication > Users** and create admin user
4. Set role in SQL Editor:
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = '{"role": "ADMIN"}'
   WHERE email = 'your-admin@email.com';
   ```
5. Go to **Storage** and create a public bucket named `settings`

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Server
```bash
npm run dev
```

---

## Features

### Dashboard
- Total Members, Total Share Capital, New Members This Month, Total Divisions
- Monthly registration area chart (last 12 months)
- Recent 10 members table

### Member Management
- Add, Edit, View, Delete members
- Search by member no, name, NIC
- Filter by division, category, date range
- Paginated table (25 per page)

### Import System (Most Important)
- **Supports**: CSV, XLS, XLSX
- **Drag & Drop** upload
- **Excel format**: Skip rows 1-5, Row 6 = headers, Data from Row 7
- **Sinhala column mapping**:
  - `සාමාජික අංකය` → member_no
  - `නම` → name
  - `ලිපිනය` → address
  - `සාමාජික වූ දිනය` → joined_date
  - `ජා.හැ.ප. අංකය` → nic
  - `කොටස් මුදල` → share_amount
  - `අනු අංකය` → (ignored)
- Pre-select **Electoral Division** and **Category** before import
- **Duplicate detection** using in-memory Set
- **Batch insert** 500 records per batch
- Import summary with counts and duration

### Reports
- Member List Report
- Share Capital Report
- Division Wise Report
- Category Wise Report
- Monthly Registration Report
- Annual Summary
- Export as **PDF**, **Excel**, **CSV**, **Print**
- Full Sinhala text support in all exports

### Category Management
- Full CRUD with member count
- Search categories

### Division Management
- Full CRUD for 23 electoral divisions with member count

### Settings (Admin only)
- Society Name, Address, Telephone, Email
- Logo Upload (Supabase Storage)
- Theme Color picker

---

## User Roles

| Role | Permissions |
|------|-------------|
| ADMIN | Full access to all modules including Settings |
| OPERATOR | Read, Add, Edit members/categories/divisions. No Settings |

---

## Database Schema

- `members` — Member records
- `electoral_divisions` — 23 electoral divisions (seeded)
- `categories` — Member categories (5 defaults seeded)
- `settings` — Singleton society settings
- `audit_logs` — Change audit trail

---

## Column Mapping (Sinhala Excel)

| Sinhala Header | Maps To |
|---------------|---------|
| සාමාජික අංකය | member_no |
| නම | name |
| ලිපිනය | address |
| සාමාජික වූ දිනය | joined_date |
| ජා.හැ.ප. අංකය | nic |
| කොටස් මුදල | share_amount |
| අනු අංකය | (ignored) |
