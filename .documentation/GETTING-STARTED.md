# Getting Started

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) account (free tier works)
- A [Google Cloud](https://console.cloud.google.com) project with YouTube Data API v3 enabled
- A [Groq](https://console.groq.com) account (free tier works)

## Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local — see .documentation/CONFIGURATION.md for each variable

# Push the database schema
npm run db:push

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## First Run

1. Sign up for an account at `/signup`
2. Go to the dashboard and click "Create Course"
3. Enter a topic (e.g. "Introduction to Python") and pick a length
4. Wait ~30–60 seconds for the pipeline to run — it generates a curriculum, finds YouTube videos, fetches transcripts, and creates quiz questions
5. Once generated, publish the course and share the link

## Common Issues

**Generation fails with no lessons** — usually a missing or invalid `YOUTUBE_API_KEY`. Check the key is enabled for YouTube Data API v3 in Google Cloud Console.

**DB connection error** — confirm `DATABASE_URL` is correct and includes `?sslmode=require` for Neon.

**Auth errors on redirect** — make sure `NEXT_PUBLIC_APP_URL` matches the URL you're accessing the app at (including port).
