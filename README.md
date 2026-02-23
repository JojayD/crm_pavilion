## CRM Pavilion (Monorepo)

## Welcome to the small project.



pnpm + Turborepo monorepo:

- `apps/web` (`@crm/web`): Next.js (port 3000)
- `apps/api` (`@crm/api`): NestJS API (port 3001)
- `packages/shared` (`@crm/shared`): shared TypeScript types/schemas

## Getting started

Install dependencies from the repo root:

```bash
pnpm install
```

## Run the apps (development)

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
