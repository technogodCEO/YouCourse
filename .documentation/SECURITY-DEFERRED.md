# Deferred Security Findings

These items were identified in the security audit but not fixed in the initial hardening pass.

---

## L-4 — esbuild GHSA-67mh-4wv8-2f99 (dev-only)

**Severity:** Low (development environment only)

**Package:** `esbuild <=0.24.2` pulled in transitively by `drizzle-kit`

**Advisory:** https://github.com/advisories/GHSA-67mh-4wv8-2f99

**Description:** The esbuild dev server allows any website to send requests to it and read responses. Only affects the local development server — has no impact in production builds.

**Why not fixed:** `npm audit fix --force` would downgrade `drizzle-kit` from v0.31 to v0.18, a breaking change to the migration CLI. The production build and runtime are unaffected.

**Resolution path:** Monitor `drizzle-kit` releases for a version that ships with `esbuild >0.24.2`. When available:
```bash
npm update drizzle-kit
npm audit
```

**Workaround:** Do not run `drizzle-kit studio` or other drizzle-kit dev server commands on shared or untrusted networks.
