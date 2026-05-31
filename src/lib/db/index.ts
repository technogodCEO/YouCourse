import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

// DATABASE_URL is required at runtime. The placeholder allows next build to
// succeed without the variable set; a missing URL will fail on the first query.
const sql = neon(process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost/placeholder")

export const db = drizzle(sql, { schema })
