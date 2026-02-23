# CRM Pavilion

A full-stack CRM monorepo built with modern tooling across three workspaces. 
---

## Monorepo Structure

pnpm + Turborepo monorepo:

| Package | Name | Port | Purpose |
|---|---|---|---|
| `apps/web` | `@crm/web` | 3000 | Next.js 16 + React 19 frontend |
| `apps/api` | `@crm/api` | 3001 | NestJS 11 backend (`/api/v1` prefix) |
| `packages/shared` | `@crm/shared` | — | Zod schemas + TypeScript types |

---

## Tech Stack

### Frontend (`apps/web`)

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Styling | Tailwind CSS v3 |
| Component Library | shadcn/ui + Radix UI primitives |
| Data Fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod validation |
| Auth | Supabase SSR (`@supabase/ssr`) |
| Icons | Lucide React |
| Notifications | Sonner |
| Theming | next-themes |

### Backend (`apps/api`)

| Category | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database ORM | Drizzle ORM |
| Database Driver | `postgres` (Supabase PostgreSQL) |
| Auth | Supabase (`supabase.auth.getUser`) via `SupabaseGuard` |
| Background Jobs | BullMQ + Redis |
| Scheduled Tasks | `@nestjs/schedule` |
| Validation | class-validator + class-transformer |
| Email | Resend (`nestjs-resend`) |
| Testing | Jest + Supertest |

### Shared (`packages/shared`)

| Category | Technology |
|---|---|
| Schemas & Types | Zod |
| Language | TypeScript (raw, no build step) |

### Infrastructure

| Service | Purpose |
|---|---|
| Supabase | PostgreSQL database + Auth + Studio |
| Redis | BullMQ queue backend |
| Turborepo | Monorepo task orchestration + caching |
| pnpm | Package manager |

---

## Getting Started

Install dependencies from the repo root:

```bash
pnpm install
```

### Infrastructure (local dev)

1. Start Supabase (requires Docker Desktop):
```bash
supabase start
```

2. Start Redis:
```bash
docker run -d --name crm-redis -p 6379:6379 redis:7-alpine
```

3. Copy and fill in environment files:
```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

---

## Run the Apps (development)

Start **web + api** in parallel:

```bash
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001` (routes are under `/api/v1`)

Start **only** the web app:

```bash
pnpm --filter @crm/web dev
```

Start **only** the API:

```bash
pnpm --filter @crm/api dev
```
