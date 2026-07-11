# Battery Swapping Backend

Backend Node.js + TypeScript + Express + PostgreSQL + Prisma cho Battery Swapping System.

## Yeu cau

- Node.js 20+ khuyen nghi.
- npm.
- Docker Desktop neu muon chay PostgreSQL bang `docker-compose.yml`.
- Port mac dinh:
  - Backend: `http://localhost:5000`
  - Frontend dev: `http://localhost:5173`
  - PostgreSQL: `localhost:5432`

## Cai dat lan dau

Dung terminal tai root project hoac thu muc `BE`.

Neu dang o root project:

```bash
cd BE
npm install
```

Tao file env:

```bash
cp .env.example .env
```

Tren Windows PowerShell neu khong dung duoc `cp`:

```powershell
Copy-Item .env.example .env
```

File `.env.example` da co san config local:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://SuperAdmin:12345678@localhost:5432/battery_swap_db?schema=public"
CLIENT_URL="http://localhost:5173"
```

Khi push code len repo, khong push file `.env` that. Team chi can copy tu `.env.example`.

## Chay database local

Tu root project, chay PostgreSQL bang Docker:

```bash
docker compose up -d postgres
```

Config database trong `docker-compose.yml`:

- User: `SuperAdmin`
- Password: `12345678`
- Database: `battery_swap_db`
- Port: `5432`

Kiem tra container:

```bash
docker compose ps
```

Tat database khi khong dung:

```bash
docker compose down
```

Neu muon xoa luon data volume local:

```bash
docker compose down -v
```

## Setup Prisma va seed data

Sau khi PostgreSQL da chay va `.env` dung `DATABASE_URL`, vao thu muc `BE`:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

`prisma:migrate` se apply migrations trong `prisma/migrations`.

`prisma:seed` tao data demo:

- `admin@batteryswap.local`
- `member@batteryswap.local`
- `staff@batteryswap.local`
- `technician@batteryswap.local`
- `manager@batteryswap.local`

Password demo cho tat ca user:

```text
123456
```

## Chay backend dev

Trong thu muc `BE`:

```bash
npm run dev
```

Server se listen theo `PORT` trong `.env`, mac dinh:

```text
http://localhost:5000
```

Kiem tra server:

```text
GET http://localhost:5000/health
```

Swagger UI:

```text
http://localhost:5000/api-docs
```

Base API:

```text
http://localhost:5000/api
```

## Chay production build local

Trong thu muc `BE`:

```bash
npm run build
npm start
```

## Ket noi voi frontend

BE cho phep CORS theo bien:

```env
CLIENT_URL="http://localhost:5173"
```

FE can cau hinh base API:

```env
VITE_API_URL=http://localhost:5000/api
```

Auth hien tai dung:

- Access token: FE gui qua header `Authorization: Bearer <token>`.
- Refresh token: BE set vao httpOnly cookie `refreshToken`.
- FE axios can `withCredentials: true` de refresh/logout hoat dong.

## Scripts

```bash
npm run dev              # Chay dev server bang tsx watch
npm run build            # Compile TypeScript ra dist
npm start                # Chay dist/server.js
npm run typecheck        # Kiem tra TypeScript
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Apply migration dev
npm run prisma:studio    # Mo Prisma Studio
npm run prisma:seed      # Seed data demo
```

## Cau truc thu muc

- `prisma/`: Prisma schema, migrations, seed script.
- `src/app.ts`: Express app va middleware.
- `src/server.ts`: Bootstrap roles, start server, graceful shutdown.
- `src/config/`: environment, database, CORS, Swagger.
- `src/constants/`: roles, permissions, status constants.
- `src/common/`: shared errors, middleware, utils, types.
- `src/modules/`: business modules.
- `src/routes/`: API route composition.

## Endpoint nhanh

- `GET /health`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role`
- `PATCH /api/admin/users/:id/status`
- `GET /api/admin/roles`
- `GET /api/admin/permissions`

## Luu y cho team tiep tuc lam

- Auth, user profile va admin user management da co flow that voi Prisma.
- Mot so module domain nhu stations, batteries, bookings, swaps, payments, maintenance, reports hien con repository skeleton/mock. Xem them `BACKEND_CURRENT_CONTEXT.md` de nam ro context truoc khi lam tiep.
- Sau khi sua Prisma schema, nho chay:

```bash
npm run prisma:migrate
npm run prisma:generate
```

