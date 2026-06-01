# Configuration

Copy `.env.example` to `.env.local` and fill in each value before running the app.

## Environment Variables

### `DATABASE_URL`
PostgreSQL connection string. Get this from [Neon](https://neon.tech) — create a project, copy the connection string from the dashboard.

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

### `NEXT_PUBLIC_APP_URL`
The base URL of the app. Use `http://localhost:3000` for local dev.

### `AUTH_SECRET`
Secret used to sign Auth.js session JWTs. Generate one with:
```bash
npx auth secret
```

### `YOUTUBE_API_KEY`
YouTube Data API v3 key. Get one from [Google Cloud Console](https://console.cloud.google.com):
1. Create or select a project
2. Enable the **YouTube Data API v3**
3. Create an API key under Credentials

The free tier allows 10,000 units/day. Each course generation uses ~100–150 units per lesson (search + details).

### `GROQ_API_KEY`
API key for Groq. Get one from [console.groq.com](https://console.groq.com). Used for curriculum generation and question generation via `llama-3.3-70b-versatile`. The free tier is sufficient for development.

## Database Setup

After setting `DATABASE_URL`, push the schema to your Neon database:

```bash
npm run db:push
```

This runs `drizzle-kit push` and creates all tables. Re-run after any schema changes in `src/lib/db/schema.ts`.
