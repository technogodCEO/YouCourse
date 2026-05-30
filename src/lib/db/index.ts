import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

// DATABASE_URL is required at runtime but may not be present during the
// TypeScript compilation phase. We use a placeholder that drizzle accepts
// so module evaluation does not throw during `next build` static analysis.
const sql = neon(process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost/placeholder")

export const db = drizzle(sql, { schema })
