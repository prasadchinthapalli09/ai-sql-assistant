# 🧠 AI SQL Assistant

**Ask your database questions in plain English — get instant SQL, results, charts, and AI-generated insights.**

Live demo: **https://ai-sql-assistant-khaki.vercel.app**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [How It Works](#how-it-works)
- [Getting Started (Local Setup)](#getting-started-local-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Security](#security)
- [Sample Datasets](#sample-datasets)
- [Screenshots](#screenshots)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Overview

AI SQL Assistant is a full-stack web application that lets anyone — technical or not — query a database using natural language. Connect a live PostgreSQL database, upload a CSV/SQL dump/SQLite file, or load a bundled sample dataset, then just ask a question like *"Show me the top 10 customers by revenue"*. The app automatically:

1. Discovers your database schema (tables, columns, types, relationships)
2. Uses an LLM (Groq, `openai/gpt-oss-120b`) to translate your question into a safe, read-only SQL query
3. Validates the SQL is strictly `SELECT`-only before running it
4. Executes it against your database
5. Auto-selects the best chart type for the result shape
6. Generates a plain-language explanation of what the data shows
7. Saves the query to your history, with the option to favorite it or export the results

Built as a portfolio-grade, production-quality project — real authentication, real encryption, real safety guardrails — deployable and demoable live for recruiters.

---

## Features

### 🔐 Authentication
- Register / login with JWT-based sessions
- Passwords hashed with bcrypt
- Protected routes on both frontend and backend

### 🗄️ Database Connectivity (three ways to get data in)
- **Live connection** — paste any PostgreSQL connection string; credentials encrypted at rest (AES-256-GCM), with connection testing
- **File upload** — drag in a `.csv`, `.sql` dump, or `.db`/`.sqlite` file; imported into an isolated Postgres schema automatically, with CSV column type inference and SQLite schema translation
- **Sample datasets** — one-click bundled datasets (FIFA World Cup matches, Amazon product data, Gold price history, Marvel movies) so anyone can try the app instantly with zero setup

### 🧬 Automatic Schema Discovery
- Introspects tables, columns, data types, primary keys, and foreign key relationships
- Builds a compact, schema-qualified prompt for the AI so generated SQL is always accurate, even across isolated per-upload schemas

### 🤖 Natural Language → SQL
- Schema-aware prompting via Groq's `openai/gpt-oss-120b`
- Short conversational memory so follow-up questions work naturally
- Schema-qualified table references so uploaded datasets work correctly regardless of connection pooling behavior

### 🛡️ SQL Safety Validation
- Only `SELECT` / `WITH ... SELECT` statements are ever executed
- Explicitly blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `MERGE`, `GRANT`, `REVOKE`, and more
- Rejects stacked/multiple statements (SQL injection pattern)
- Independent of what the AI generates — validated server-side every time

### ⚡ Execution & Results
- Runs the validated query with a timeout and row cap
- Returns rows, column list, execution time, and row count

### 📊 Auto-Charting
- Automatically picks bar / line / pie / scatter based on the shape of the result data (categorical vs numeric vs time-series)

### 💬 AI Explanation
- Plain-language summary of what the query results show — trends, standouts, patterns

### 🕘 History & ⭐ Favorites
- Every query automatically saved with timestamp, SQL, execution time, and success/failure state
- Searchable history, deletable entries
- Save any query as a favorite for one-click reuse

### 📤 Export
- Download results as CSV
- Copy or download the generated SQL

### 🎨 UI/UX
- Fully responsive, mobile-friendly layout
- Dark mode with persistent preference
- Glassmorphism design with a custom Emerald theme
- Toast notifications, skeleton loading states, animated transitions
- React error boundary for graceful failure handling

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, TanStack React Query, TanStack Table, React Hook Form, Chart.js + react-chartjs-2, Lucide Icons, react-hot-toast |
| **Backend** | Node.js, Express.js, Prisma ORM, JWT, bcryptjs, Helmet, Morgan, express-rate-limit, express-validator, Multer |
| **Database** | PostgreSQL (Neon, serverless) — stores app data (users, connections, history, favorites) and isolated per-upload schemas |
| **AI** | Groq API, model `openai/gpt-oss-120b`, via the OpenAI-compatible SDK |
| **File Parsing** | csv-parse (CSV import), sql.js (WASM SQLite reader — no native build step) |
| **Deployment** | Frontend → Vercel · Backend → Render · Database → Neon |

---

## Architecture

Clean, layered architecture on the backend:

```
Routes → Controllers → Services → Prisma / pg
```

- **Routes** — Express routers, request validation (express-validator)
- **Controllers** — thin HTTP handlers, no business logic
- **Services** — all business logic (auth, database connections, schema discovery, AI integration, SQL validation, query orchestration, file import)
- **Middleware** — JWT auth guard, centralized error handler, file upload handling, validation
- **Utils** — encryption, connection pool management, identifier sanitization, type inference, chart-type selection

Frontend uses React Context for cross-cutting state (auth, theme, active database connection), React Query for all server state/caching, and a component library of reusable cards, forms, and displays.

### Multi-tenant data isolation

Every uploaded file (CSV/SQL/SQLite) is imported into its **own dedicated Postgres schema** (e.g. `upload_a1b2c3...`) inside the app's Neon database. This means:
- Different users' uploads never collide or see each other's data
- Deleting an upload cleanly drops its entire schema
- The AI is told the fully-qualified schema-prefixed table name, so generated SQL works correctly regardless of connection pooling — this was a deliberate fix after discovering Neon's pooled connections reject session-level `search_path` startup parameters

---

## Folder Structure

```
ai-sql-assistant/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── api/                     # axios API modules (auth, connections, query/history/favorites)
│   │   ├── components/              # Sidebar, Navbar, AppLayout, ChartRenderer, ResultsTable, ErrorBoundary...
│   │   ├── context/                 # AuthContext, ThemeContext, ConnectionContext
│   │   └── pages/                   # Login, Register, Dashboard, Connections, QueryPage, History, Favorites, Settings
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── vercel.json
├── server/                          # Express backend
│   ├── src/
│   │   ├── config/                  # Prisma client singleton
│   │   ├── controllers/             # auth, database, query, history, favorites
│   │   ├── middleware/              # auth guard, error handler, validation, file upload
│   │   ├── prisma/                  # schema.prisma + migrations
│   │   ├── routes/                  # Express routers
│   │   ├── services/                # ai, auth, database, query, schema, sqlValidator, upload
│   │   └── utils/                   # crypto, pgPoolManager, sanitizeIdentifier, typeInference, chartSelector
│   ├── sample-data/                 # bundled sample CSVs (FIFA, Amazon, Gold, Marvel)
│   └── .env.example
├── render.yaml                      # Render deployment config
├── .gitignore
└── README.md
```

---

## How It Works

**1. Connect a database** (three options)
- Paste a Postgres connection string, or
- Upload a `.csv` / `.sql` / `.db` file, or
- Click "Load this dataset" on a bundled sample

**2. Ask a question**
- Type in plain English (or click a suggested example — auto-generated from your actual table/column names)

**3. Behind the scenes**
```
Question → Schema Discovery → AI generates SQL → SQL Validator (SELECT-only) 
→ Execute against Postgres → Chart type auto-selected → AI explains results 
→ Saved to History
```

**4. Review & act**
- View the generated SQL, the results table, and an auto-generated chart
- Read the AI's plain-language explanation
- Copy/download the SQL, export results to CSV, or save the query as a favorite

---

## Getting Started (Local Setup)

### Prerequisites
- Node.js 18+
- A free [Neon](https://neon.tech) Postgres database
- A free [Groq](https://console.groq.com) API key

### 1. Clone
```bash
git clone https://github.com/prasadchinthapalli09/ai-sql-assistant.git
cd ai-sql-assistant
```

### 2. Backend
```bash
cd server
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY (exactly 32 chars), GROQ_API_KEY
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```
Backend runs at `http://localhost:5000`.

### 3. Frontend
```bash
cd ../client
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:5000/api
npm run dev
```
Frontend runs at `http://localhost:5173`.

### 4. Try it
Register an account → go to **Connections** → load a sample dataset or connect your own database → go to **Ask a Question** → try a suggested question.

---

## Environment Variables

### `server/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string for the app's own database (Neon) |
| `JWT_SECRET` | Long random string used to sign auth tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `ENCRYPTION_KEY` | Exactly 32 characters — encrypts stored external DB credentials (AES-256-GCM) |
| `GROQ_API_KEY` | Your Groq API key |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` |
| `PORT` | Backend port, default `5000` |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | Frontend origin, for CORS |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | API rate limiting config |

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

---

## Deployment

| Layer | Platform | Notes |
|---|---|---|
| Database | **Neon** | Already hosted — just use the connection string |
| Backend | **Render** | `render.yaml` included; build: `npm install && npx prisma generate && npx prisma migrate deploy`, start: `npm start` |
| Frontend | **Vercel** | Root directory `client`, framework preset Vite, set `VITE_API_URL` to the Render URL |

After deploying the backend, update `CLIENT_URL` on Render to match the live Vercel URL and redeploy so CORS allows requests from production.

---

## API Reference

All endpoints are prefixed with `/api` and (except auth) require a `Bearer` JWT.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Log in |
| `GET` | `/auth/profile` | Get current user |
| `POST` | `/connections` | Add a live Postgres connection |
| `GET` | `/connections` | List all connections |
| `POST` | `/connections/:id/test` | Test a live connection |
| `GET` | `/connections/:id/schema` | Get discovered schema for a connection |
| `DELETE` | `/connections/:id` | Remove a connection (drops its schema if uploaded) |
| `POST` | `/connections/upload` | Upload a CSV/SQL/SQLite file |
| `GET` | `/connections/samples` | List bundled sample datasets |
| `POST` | `/connections/samples/:key` | Import a sample dataset |
| `POST` | `/query/ask` | Ask a natural language question |
| `GET` | `/history` | List query history (search, pagination) |
| `DELETE` | `/history/:id` | Delete a history entry |
| `GET` | `/favorites` | List favorites |
| `POST` | `/favorites` | Save a query as favorite |
| `DELETE` | `/favorites/:id` | Remove a favorite |

---

## Security

- **Encryption at rest** — external DB credentials encrypted with AES-256-GCM before storage; key never leaves the server
- **SELECT-only enforcement** — every generated query is validated server-side; write/DDL keywords are blocked regardless of what the AI produces
- **Schema isolation** — every uploaded dataset lives in its own Postgres schema, invisible to other users
- **SQL dump safety** — uploaded `.sql` files are scanned for dangerous statements (`DROP DATABASE`, `COPY ... FROM PROGRAM`, `dblink`, role/grant changes) before execution
- **Rate limiting** — per-IP request limits on all API routes
- **Security headers** — Helmet middleware
- **Password security** — bcrypt hashing, never stored or logged in plaintext
- **JWT auth** — all sensitive routes protected, tokens expire and are verified server-side
- **Query timeouts & row caps** — prevents runaway queries or oversized result sets

---

## Sample Datasets

Bundled for instant demoing, no upload required:

| Dataset | Description |
|---|---|
| ⚽ FIFA World Cup Matches | Every World Cup match from 1930–2026 — teams, scores, stadiums, results |
| 📦 Amazon Product Reviews | Product listings with prices, ratings, review data |
| 🥇 Gold Price History | Daily gold prices — open, high, low, close, volume |
| 🎬 Marvel Movies | MCU films — ratings, box office, cast, release info |

---

## Screenshots

_Add screenshots of the Dashboard, Ask a Question flow, and Connections page here._

---

## Future Improvements

- SQL "explain plan" / query optimization suggestions
- PDF export of results
- Per-connection table/column access permissions
- Streaming AI responses for faster perceived performance
- Multi-database cross-schema search

---

## License

MIT — free to use for personal or portfolio purposes.

---

Built by **Chintapalli Durga Prasad** as a full-stack AI portfolio project.
