# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Overview

pnpm + Turborepo monorepo with three workspaces:

| Package | Name | Port | Purpose |
|---|---|---|---|
| `apps/web` | `@crm/web` | 3000 | Next.js 16 + React 19 frontend |
| `apps/api` | `@crm/api` | 3001 | NestJS 11 backend (`/api/v1` prefix) |
| `packages/shared` | `@crm/shared` | — | Zod schemas + TypeScript types (raw TS, no build step) |

## Commands

All commands run from the repo root unless noted.

```bash
# Start all apps in parallel (Turborepo TUI)
pnpm dev

# Build all workspaces (respects dependency order: shared → api/web)
pnpm build

# Type-check all workspaces
pnpm typecheck

# Lint all workspaces
pnpm lint

# Run a single workspace's script
pnpm --filter @crm/web dev
pnpm --filter @crm/api dev
pnpm --filter @crm/api test
pnpm --filter @crm/api test:watch   # watch mode

# Run a single test file in the API
pnpm --filter @crm/api test -- --testPathPattern=contacts

# Database migrations (run from apps/api/)
pnpm --filter @crm/api migration:generate
pnpm --filter @crm/api migration:migrate

# Add a dependency to a specific workspace
pnpm add <pkg> --filter @crm/web
pnpm add <pkg> --filter @crm/api

# Add a shadcn/ui component
cd apps/web && pnpm dlx shadcn@3.8.5 add <component>
```

## Infrastructure Prerequisites (local dev)

1. **Supabase** (PostgreSQL + Auth + Studio):
   ```bash
   supabase init   # first time only
   supabase start  # requires Docker Desktop
   ```
   Outputs anon key, service_role key, DB URL, Studio URL (`:54323`).

2. **Redis** (BullMQ):
   ```bash
   docker run -d --name crm-redis -p 6379:6379 redis:7-alpine
   ```

3. **Environment files** — copy from examples and fill in keys:
   - `apps/web/.env.local.example` → `apps/web/.env.local`
   - `apps/api/.env.example` → `apps/api/.env`

## Architecture

### Auth flow
Supabase handles all auth. The web app uses `@supabase/ssr` (not the deprecated `auth-helpers-nextjs`). Session refresh happens in `apps/web/middleware.ts` on every request. OAuth PKCE code exchange happens at `apps/web/app/api/auth/callback/route.ts`.

The API does **not** manage JWTs locally. `SupabaseGuard` (`apps/api/src/auth/supabase.guard.ts`) calls `supabase.auth.getUser(token)` using the service role key on every protected request, attaching the user to `request.user`. Apply it per-route with `@UseGuards(SupabaseGuard)`.

### Database (API only)
Drizzle ORM with the `postgres` driver connects to Supabase's PostgreSQL. The `DRIZZLE` injection token is provided globally by `DrizzleModule` — inject it with `@Inject(DRIZZLE)` in any service. Schema lives in `apps/api/src/database/schema.ts`; migrations go to `apps/api/drizzle/`.

### Shared package
`@crm/shared` exports Zod schemas and TypeScript types consumed by both apps. Both consumers import raw TypeScript via tsconfig path aliases — there is no build step for this package. When adding new schemas, export them from `packages/shared/src/index.ts`.

### Data fetching (web)
TanStack Query v5 is the data-fetching layer. The `QueryClient` is instantiated in `components/providers.tsx` (client component) and should be wrapped around the app in the root layout. Server Components can fetch data directly using `createClient()` from `lib/supabase/server.ts`.

### Styling
Tailwind CSS **v3** (not v4). shadcn/ui components live in `apps/web/components/ui/`. All colors are HSL CSS variables defined in `globals.css` and mapped in `tailwind.config.ts`. Use the `cn()` helper from `lib/utils.ts` for conditional class merging.

### API module pattern
Each feature in the API should follow NestJS conventions: `feature/feature.module.ts`, `feature/feature.controller.ts`, `feature/feature.service.ts`. Register the module in `AppModule`. Use `SupabaseGuard` from `AuthModule` (already exported) — import `AuthModule` into the feature module.

### Background jobs
BullMQ is connected via `QueueModule`. To add a queue: use `BullModule.registerQueue({ name: 'queue-name' })` in the feature module, then inject `@InjectQueue('queue-name')` in the service.
