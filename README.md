# RSOrangeTech — Internal Lead Generation & Audit System

An internal CRM platform that automatically discovers websites, runs Lighthouse audits, scores leads, and presents everything in a polished dashboard — all on your local machine.

---

## Project Structure

```
rstool/
├── apps/
│   ├── backend/      # Express.js API (port 4000)
│   └── frontend/     # Next.js 15 dashboard (port 3000)
├── .env.example      # Copy to apps/backend/.env and apps/frontend/.env.local
├── package.json      # Root monorepo workspace
└── README.md
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.x |
| MySQL | ≥ 8.x (running locally) |
| npm | ≥ 10.x |

---

## First-Time Setup

### 1. Configure environment variables

```bash
# Backend
copy .env.example apps\backend\.env
# Edit apps\backend\.env with your MySQL credentials

# Frontend
copy .env.example apps\frontend\.env.local
```

### 2. Install all dependencies

```bash
npm install
```

### 3. Create MySQL database

```sql
CREATE DATABASE rstool_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run Prisma migrations

```bash
npm run db:migrate
```

### 5. Seed the database (creates admin user)

```bash
npm run db:seed
```

Default admin credentials:
- **Email**: `admin@rsorangetech.com`
- **Password**: `Admin@1234`

---

## Development

Run both servers concurrently in separate terminals:

```bash
# Terminal 1 — Backend API
npm run dev:backend

# Terminal 2 — Frontend
npm run dev:frontend
```
#production mode
 npm run build:frontend
 npm run start:frontend
 npm run build:backend
 npm run start:backend

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- Prisma Studio: `npm run db:studio`

---

## Phases

| Phase | Feature |
|-------|---------|
| ✅ 1 | Project setup, auth, dashboard shell |
| 🔲 2 | Puppeteer crawler + Lighthouse audits |
| 🔲 3 | OpenAI lead scoring & report generation |
| 🔲 4 | Cron automation & email notifications |
