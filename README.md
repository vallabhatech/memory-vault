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

## Temporal conflict resolution

`POST /api/memories` accepts a memory and optional source details. The server loads active memories for the same demo user, entity, and scope, asks Gemma to classify each as new information, duplicate, contradiction, explicit supersession, or unrelated, then validates that every returned ID belongs to the candidate set. The model has no database client or write tools.

For additions and supersessions, a restricted Postgres RPC performs the source insert, old-memory status/`valid_until` updates, and new active-memory insert in one transaction. It rechecks the candidate snapshot while holding a transaction lock; if another request changed it, the endpoint returns `409` and leaves the data unchanged. Duplicate submissions return the existing memory without creating another memory row.

The endpoint is intentionally demo-only and unauthenticated, matching the MVP constraint. Do not expose it publicly until request authentication and rate limiting are added.

`GET /api/memories/search?q=...` runs the retrieval layer independently of answer generation. The service uses PostgreSQL full-text search through a GIN-indexed generated vector, then reranks candidates using text/entity-topic relevance, recency, inferred or explicit scope, confidence, and active-versus-superseded status. Forgotten memories are excluded by the database query and again by the ranker. Retrieval weights can be overridden with `MEMORY_RETRIEVAL_WEIGHTS` as a JSON object; the default is `{ "semanticSimilarity": 0.5, "recency": 0.2, "scopeMatch": 0.1, "confidence": 0.1, "currentStatus": 0.1 }`.

This PostgreSQL text-search provider is behind a `MemoryCandidateProvider` interface. When embeddings are introduced, a pgvector-backed provider can replace it without coupling retrieval to answer generation.

`answerMemoryQuery(query, userId)` composes retrieval with Gemma answer generation. It supplies only selected memory evidence to the model, validates every cited memory ID against that evidence, and returns answer confidence plus source-linked evidence. Superseded rows are included only as historical context through the `supersedes` chain; forgotten rows never reach the model. If multiple active rows conflict for the same entity, the service returns an uncertainty response without asking Gemma to pick one.

Use `POST /api/memories/answer` with `{ "query": "What framework are we using?" }` to call the demo answer endpoint. As with memory creation and retrieval, this endpoint is unauthenticated and must remain private until authentication and rate limiting are added.

Set these server-only variables to enable requests:

```text
SUPABASE_URL=
SUPABASE_SECRET_KEY=
GEMMA_OPENAI_BASE_URL=http://localhost:11434/v1
GEMMA_MODEL=gemma4:e4b
GEMMA_API_KEY=
```

The Gemma variables target an OpenAI-compatible inference endpoint; `GEMMA_API_KEY` is optional for local inference. The secret Supabase key and any model key must never use a `NEXT_PUBLIC_` prefix.

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
