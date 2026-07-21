# Battery Swapping Backend

TypeScript, Node.js, Express 5, Prisma ORM 6 and MongoDB REST API.

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop for the local MongoDB replica set, or MongoDB Atlas with replica-set/transaction support

## Local setup (Windows PowerShell)

```powershell
Copy-Item .env.example .env
cd ..
docker compose up -d
cd BE
npm install
npm run prisma:validate
npm run prisma:generate
npm run prisma:push
npm run prisma:indexes
npm run db:seed
npm run dev
```

The local connection is `mongodb://localhost:27017/battery_swap_db?replicaSet=rs0`. For Atlas, replace `DATABASE_URL` with its `mongodb+srv://` URL. Never commit real credentials. MongoDB must run as a replica set because authentication, admin and payment flows use transactions.

## API and Swagger

- API base: `http://localhost:5000/api`
- Health: `GET http://localhost:5000/api/v1/health`
- Database health: `GET http://localhost:5000/api/v1/health/database`
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`

Use Swagger's **Authorize** button and enter the access JWT. Swagger is disabled in production unless `SWAGGER_ENABLED=true`.

## Commands

```powershell
npm run dev
npm run build
npm start
npm run typecheck
npm test
npm run prisma:validate
npm run prisma:generate
npm run prisma:push
npm run prisma:indexes
npm run prisma:studio
npm run db:reset
npm run db:seed
npm run db:repair-battery-codes
```

Use `db:repair-battery-codes` once on legacy databases whose battery documents predate the required `batteryCode` field. The command is idempotent and leaves valid codes unchanged.

Reset development data explicitly in PowerShell:

```powershell
$env:ALLOW_DATABASE_RESET="true"
npm run db:reset
npm run db:seed
```

The reset and development seed refuse to run when `NODE_ENV=production`.

## Data and money

Money is stored as integer VND (VND has no fractional minor unit). The fields named `balance`, `amount`, `price`, `cost`, and `costEstimate` must never receive floating-point values. VNPay callbacks verify the server signature and amount; a conditional transaction state update prevents duplicate wallet credit.

## Architecture

- `prisma/`: MongoDB schema and seed
- `src/config/`: validated environment, singleton Prisma client, CORS and OpenAPI
- `src/common/`: errors, middleware, shared types and utilities
- `src/modules/`: route/controller/service/repository business modules
- `scripts/reset-database.ts`: guarded MongoDB development reset
- `src/tests/`: Vitest/Supertest tests (use a dedicated test database for database tests)

## Production checklist

- Use managed secrets and a production MongoDB replica set.
- Set a strict `CORS_ORIGIN`, strong JWT secrets, `NODE_ENV=production`, and intentional `SWAGGER_ENABLED` value.
- Back up MongoDB and test recovery before production changes.
- Configure TLS, reverse-proxy trust, log collection, alerts and database indexes.
- Never use the production database from automated tests.
