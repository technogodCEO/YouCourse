# License Design — YouCourse

**Date:** 2026-05-30  
**Topic:** Software License  
**Status:** Approved

## Context

YouCourse is a proprietary web app submitted to a hackathon with multiple contributors. The hackathon has no open-source requirement, but judges and evaluators need to be able to view the source code. The license must protect the codebase from unauthorized use while explicitly permitting read-only viewing.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Proprietary (not open source) | Commercial SaaS intent; no hackathon requirement to open source |
| Custom "All Rights Reserved" with viewing grant | Purpose-built for source-available hackathon submissions; no overkill of BUSL |
| Copyright: Roshan Kareer and the YouCourse Contributors | Multi-contributor team; lead author explicitly named for legal clarity |

## License Structure

**File:** `LICENSE` at project root

### 1. Copyright Line
```
Copyright (c) 2025 Roshan Kareer and the YouCourse Contributors
```

### 2. Viewing Grant
Hackathon judges, evaluators, and the general public are explicitly permitted to view and read the source code. This enables legitimate hackathon evaluation without ambiguity.

### 3. Restrictions
All other rights reserved. No permission is granted to:
- Use, execute, or run the software
- Copy or reproduce the source code
- Modify or create derivative works
- Merge, publish, or distribute
- Sublicense or sell

### 4. No Warranty Disclaimer
Standard disclaimer: software provided "as is" without warranty of any kind. Authors not liable for any claims or damages.

## Implementation

Single file: `LICENSE` at the repository root. Plain English, no legalese.
