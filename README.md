# Memory Vault

Memory Vault is an AI memory layer for storing structured facts from conversations, tracking how facts change, detecting contradictions, and explaining why a current memory is considered correct.

This repository contains the initial UI foundation only. It does not connect to a database, call an AI model, or persist conversations.

## Stack

- Next.js App Router and server routes
- TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL, with pgvector as a possible later addition
- Gemma as the planned language model
- No separate Python backend
- No authentication in the MVP

The scaffold uses the standard Next.js, React, TypeScript, Tailwind CSS, and ESLint dependencies. No additional UI or database packages are installed.

## Routes

- `/chat` - conversation workspace placeholder
# Memory Vault

Memory Vault is an AI memory layer for storing structured facts from conversations, tracking how facts change, detecting contradictions, and explaining why a current memory is considered correct.

The current project includes the UI foundation and the initial Supabase schema/demo data. It does not include AI extraction, application database access, or authentication.

## Stack

- Next.js App Router and server routes
- TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL
- Gemma as the planned language model
- No separate Python backend
- No authentication in the MVP

## Routes

- `/chat` - conversation workspace placeholder
- `/memory` - structured memory placeholder
- `/sources` - source provenance placeholder
- `/` - redirects to `/chat`

## Project structure

```text
src/
  app/
  components/
supabase/
  config.toml
  migrations/
    20261004000000_create_memory_vault.sql
  seed.sql
```

The workspace route group shares the navigation shell without adding a URL segment. Route pages remain server components; only the navigation shell is a client component so it can identify the current route.

## Database

The migration creates `public.users`, `public.sources`, and `public.memories`. Foreign keys ensure that sources and superseded memories belong to the same user as the referencing memory. Memory rows are versioned rather than deleted: each new version points to its predecessor with `supersedes`, and the prior row is marked `superseded` with an exclusive `valid_until` timestamp.

Row-level security is enabled on all three tables. Direct `anon` and `authenticated` table privileges are revoked; no client policies are added for the unauthenticated MVP. Future application access should go through server-side routes using a server-only Supabase secret key. Never expose that key to the browser.

`supabase/seed.sql` inserts one stable demo user and the three source/memory records for the React, Next.js, React timeline. The demo dates are anchored to January 1, 3, and 5, 2025 so the seed is deterministic. Re-running the seed does not duplicate those records.

pgvector is not enabled yet because the current schema has no embeddings or semantic retrieval logic.

## Local database

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) and Docker, then run:

```bash
supabase start
supabase db reset
```

`db reset` recreates the local database, applies migrations, and runs the seed. It deletes existing data in that local Supabase database.

To apply migrations to a linked Supabase project, authenticate and link the project first, then run `supabase db push`. This project has no linked remote database or credentials configured yet.

## Application

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm run start
```
The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
