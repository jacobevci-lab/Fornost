# Fornost DAST Triage

**Scanner:** OWASP ZAP Baseline  
**Production target:** `https://fornostsecurity.com/`  
**Triage date:** 2026-09-21

The current production baseline contains **no Low, Medium or High ZAP alert groups**. The remaining alerts are informational and are retained in the scan output rather than hidden.

## Accepted informational findings

### ZAP 10015 — Re-examine Cache-control Directives

**Status:** Accepted / intended behavior.

The affected resources are public static content. Explicit `Cache-Control` directives are configured for the home page, sitemap and static assets. No authentication, session token, user-specific response or sensitive application data is present in this website scope.

### ZAP 10049 — Storable and Cacheable Content

**Status:** Accepted / intended behavior.

The marketing site and its CSS/SVG/robots/sitemap resources are deliberately cacheable. ZAP correctly observes that these public responses can be stored by caches; this is not a confidentiality issue for the current content model.

### ZAP 10094 — Base64 Disclosure

**Status:** Accepted heuristic false positive.

The report instances contain opaque alphanumeric strings detected heuristically as Base64 across HTML/CSS/JavaScript/SVG/text responses. Sample values decode to non-text binary noise and no credential, token, private key, API key, personal data or application secret was identified. Source review also found no intentional Base64 secret payload.

Re-open this finding if authenticated/user-specific content or embedded sensitive blobs are introduced in the future.

### ZAP 90005 — Sec-Fetch-* request headers missing

**Status:** Accepted scanner artifact.

`Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site` and `Sec-Fetch-User` are browser-generated **request** metadata headers. The ZAP crawler is not a normal browser navigation context and does not send them for all requests. The origin cannot force arbitrary clients to include these request headers, so their absence in ZAP's own requests is not a server-side vulnerability.

## Remediated ZAP finding

### ZAP 90004 — Site isolation / Cross-Origin-Embedder-Policy

**Status:** Fixed and verified.

`Cross-Origin-Embedder-Policy: require-corp` was added alongside the existing `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin`. The subsequent production ZAP scan reports this rule as PASS.

## DAST gate

The production workflow parses the ZAP JSON report after every scan and fails the job if any **Low, Medium or High** alert group is present. Informational alerts remain visible for review and trend tracking.

This approach intentionally avoids suppressing scanner evidence while still making security regressions operationally visible.
