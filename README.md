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
- `/memory` - structured memory placeholder
- `/sources` - source provenance placeholder
- `/` - redirects to `/chat`

## Project structure

```text
src/
  app/
    (workspace)/
      chat/page.tsx
      memory/page.tsx
      sources/page.tsx
      layout.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    app-shell.tsx
    empty-state.tsx
    page-intro.tsx
```

The workspace route group shares the navigation shell without adding a URL segment. Route pages remain server components; only the navigation shell is a client component so it can identify the current route.

## Planned architecture

For the next implementation phase, keep UI routes in `src/app`, put server-side request handlers in `src/app/api`, and isolate shared server integrations in `src/lib`. Supabase PostgreSQL should own durable conversation, source, and versioned-fact records; pgvector can be added if semantic retrieval needs it. Gemma calls should be made from server-side code, with model output validated before it changes stored memory. The database schema, API routes, model integration, and environment configuration are intentionally not part of this scaffold.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm run start
```This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
