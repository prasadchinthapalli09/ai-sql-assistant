# AI SQL Assistant

Ask your PostgreSQL database questions in plain English. The app reads your schema, uses an LLM (via Groq) to generate a safe, read-only SQL query, runs it, charts the result, and explains what it means — all with query history and favorites.

**Live demo: https://ai-sql-assistant-khaki.vercel.app/ **

---

## Features

- **Auth** — register/login with JWT, bcrypt password hashing
- **Database connections** — connect any PostgreSQL database; credentials encrypted at rest (AES-256-GCM), test connection, disconnect
- **Automatic schema discovery** — tables, columns, types, primary keys, foreign key relationships
- **Natural language → SQL** — schema-aware prompting via Groq (`openai/gpt-oss-120b`), short conversation memory
- **SQL safety validation** — only `SELECT`/`WITH` statements are ever executed; every destructive keyword (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, etc.) is blocked, and stacked statements are rejected
- **Execution** — runs the validated query with a timeout, returns rows + execution time
- **AI explanation** — plain-language summary of what the results show
- **Auto chart selection** — bar / line / pie / scatter, chosen based on result shape
- **History** — every query saved, searchable, deletable
- **Favorites** — save and reuse queries
- **Export** — download results as CSV, download the generated SQL
- **UI** — dark mode, glassmorphism, responsive, toast notifications, skeleton loaders, error boundary

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), Tailwind CSS, React Router, React Query, React Hook Form, Chart.js, TanStack Table, Lucide Icons |
| Backend | Node.js, Express, Prisma, JWT, bcryptjs, Helmet, Morgan, express-rate-limit |
| Database | PostgreSQL (Neon) — app's own data; plus any user-connected Postgres DB |
| AI | Groq API, `openai/gpt-oss-120b`, OpenAI-compatible SDK |
| Deploy | Frontend → Vercel, Backend → Render, Database → Neon |

## Folder Structure

```
ai-sql-assistant/
├── client/                # React frontend (Vite)
│   └── src/
│       ├── api/           # axios API modules
│       ├── components/    # shared UI components
│       ├── context/       # Auth, Theme, Connection contexts
│       └── pages/         # route-level pages
├── server/                 # Express backend
│   └── src/
│       ├── config/        # Prisma client
│       ├── controllers/   # route handlers
│       ├── middleware/    # auth, validation, error handling
│       ├── prisma/        # schema.prisma
│       ├── routes/        # Express routers
│       ├── services/      # business logic (AI, schema, SQL validation, query pipeline)
│       └── utils/         # crypto, chart selection, pg pool manager
└── README.md
```

## Getting Your API Keys (free)

1. **Groq API key** — sign up at [console.groq.com](https://console.groq.com) → API Keys → Create Key
2. **Neon Postgres** — sign up at [neon.tech](https://neon.tech) → New Project → copy the connection string

You'll need **two** Postgres databases total:
- One for the **app itself** (`DATABASE_URL` — stores users, connections, history) — use your Neon project for this
- Whatever database(s) **your users connect to and query** — these are added later, inside the app itself, and can be any Postgres database (including that same Neon project if you just want to try it out)

## Local Setup

### 1. Backend

```bash
cd server
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY (must be exactly 32 chars), GROQ_API_KEY
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2. Frontend

```bash
cd client
cp .env.example .env
# VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### 3. Try it out

1. Register an account
2. Go to **Connections** → add a PostgreSQL connection string (any database you have access to — even a free sample dataset works)
3. Go to **Ask a Question** → try: *"Show me the top 10 rows from any table"* or a question specific to your schema

## Environment Variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string for the app's own database (Neon) |
| `JWT_SECRET` | Long random string for signing auth tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `ENCRYPTION_KEY` | Exactly 32 characters — encrypts users' stored DB credentials |
| `GROQ_API_KEY` | Your Groq API key |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` |
| `PORT` | Backend port, default `5000` |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | Frontend origin, for CORS |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | API rate limiting |

### Client (`client/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL, e.g. `https://your-api.onrender.com/api` |

## Deployment

### Database (Neon)
Already hosted — just copy your connection string into `DATABASE_URL` on the backend.

### Backend (Render)
1. Push this repo to GitHub
2. Render → New → Web Service → connect your repo, root directory `server`
3. Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
4. Start command: `npm start`
5. Add all environment variables from the table above
6. Deploy — copy the resulting URL (e.g. `https://ai-sql-assistant-api.onrender.com`)

### Frontend (Vercel)
1. Vercel → New Project → import the repo, root directory `client`
2. Framework preset: Vite
3. Add environment variable `VITE_API_URL=https://your-render-url.onrender.com/api`
4. Deploy
5. Update `CLIENT_URL` on Render to your Vercel URL, redeploy the backend

## Security Notes

- User database credentials are encrypted with AES-256-GCM before being stored; the key never leaves the server
- Only `SELECT`/`WITH` statements are ever executed against a connected database — every write/DDL keyword is blocked at the validator level, independent of what the AI generates
- Queries run with a timeout and a row cap to avoid runaway or huge result sets
- Rate limiting, Helmet security headers, and CORS restricted to the configured client origin

## Future Improvements

- SQL "optimize"/"explain plan" utility
- PDF export of results
- Multi-database schema search
- Per-connection query permissions (restrict to specific tables/columns)
- Streaming AI responses

## License

MIT — free to use for personal or portfolio purposes.
