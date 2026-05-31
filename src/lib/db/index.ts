import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

// DATABASE_URL must be set at runtime. During `next build` static analysis the
// module is not executed, so this check only fires on actual server startup.
const dbUrl = process.env.DATABASE_URL
if (!dbUrl && process.env.NODE_ENV !== "test") {
  throw new Error("DATABASE_URL environment variable is not set")
}
const sql = neon(dbUrl ?? "postgresql://placeholder:placeholder@localhost/placeholder")

export const db = drizzle(sql, { schema })
