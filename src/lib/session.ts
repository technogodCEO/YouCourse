import "server-only"
import { SignJWT, jwtVerify } from "jose"

const encodedKey = new TextEncoder().encode(process.env.AUTH_SECRET)

export async function encrypt(payload: { userId: string; expiresAt: Date }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, { algorithms: ["HS256"] })
    return payload as { userId: string }
  } catch {
    return null
  }
}
