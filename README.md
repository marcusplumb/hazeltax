# Tax Compliance MVP (Entities + Filings)

Monorepo with:
- `apps/api`: Express + TypeScript + Prisma (PostgreSQL)
- `apps/web`: Vite + React + TypeScript

## Prereqs
- Node 18+ (or 20+)
- pnpm
- Docker (for Postgres)

## 1) Start Postgres
```bash
pnpm db:up
```

## 2) Setup API env
Copy:
```bash
cp apps/api/.env.example apps/api/.env
```

## 3) Install deps
```bash
pnpm install
```

## 4) Create DB tables + seed
```bash
pnpm api:migrate
pnpm api:seed
```

## 5) Run everything
```bash
pnpm dev
```

- API: http://localhost:4000
- Web: http://localhost:5173

## What’s included (MVP)
- Entities CRUD
- Filing Obligations CRUD
- Auto-generation of Filing Periods (next 12 months / 8 quarters / 3 years)
- Dashboard endpoints (due soon, overdue, recent)
- Basic document upload (stored locally in `apps/api/uploads`)
