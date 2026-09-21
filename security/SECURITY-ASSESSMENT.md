# Fornost Security Website — Application Security Assessment

**Assessment date:** 2026-09-21  
**Repository:** `jacobevci-lab/Fornost`  
**Production:** `https://fornostsecurity.com`  
**Scope:** static HTML/CSS/JavaScript, Cloudflare Workers static-assets configuration, response-header policy, deployment supply chain and production edge behavior.

## Executive summary

The website has a deliberately small attack surface: it is static, has no authentication, no application backend, no form-processing endpoint, no database, no file upload, no third-party runtime JavaScript and no browser network calls (`fetch`/XHR/WebSocket).

No exploitable Critical, High, Medium or Low application vulnerability remains open in the assessed website scope. Source analysis, dependency analysis and live external DAST are now running continuously. Production edge checks also validate HTTPS redirects, security headers, supported TLS versions and HTTP TRACE handling.

The remaining material finding is repository/deployment integrity: production deploys automatically from `main`, while the repository rulesets API currently returns no active repository ruleset. Until `main` is protected, a direct or compromised push can bypass the intended pull-request/security-check workflow.

## Assessment coverage and completed tests

- SAST/source review for DOM XSS, unsafe HTML/JS execution, URL/open-redirect sinks, client storage, network calls, inline event handlers, external script loading, secret patterns and insecure browser APIs.
- GitHub CodeQL with `security-extended` queries for JavaScript/TypeScript.
- SCA with `npm audit --audit-level=high`.
- Full resolved dependency CycloneDX SBOM generation in CI.
- OWASP Top 10 (2021) applicability and control mapping.
- Cloudflare static-asset and response-header review.
- Live OWASP ZAP baseline scanning against production.
- Live HTTP/HTTPS and `www` redirect verification.
- Live TLS policy verification: TLS 1.2 and TLS 1.3 accepted; TLS 1.1 and below rejected.
- HTTP TRACE verification: production returns `405`.
- HSTS, CSP, MIME-sniffing, clickjacking, Permissions Policy, COOP, COEP and CORP verification.
- Cache policy review and explicit cache directives for public static content.

## Current security test result

| Control | Result |
|---|---|
| CodeQL / JavaScript (`security-extended`) | Pass — no security finding reported in the validated run |
| npm audit | Pass — 0 known vulnerabilities in the resolved build dependency graph |
| Runtime npm dependencies | 0 |
| Full CI SBOM | Pass — 38 resolved components in the validated build SBOM |
| OWASP ZAP production baseline | Pass — 0 Low / 0 Medium / 0 High alert groups after remediation |
| ZAP informational alerts | 7 alert groups — reviewed and triaged in `security/DAST-TRIAGE.md` |
| HTTPS apex | Pass |
| HTTP -> HTTPS redirect | Pass |
| `www` -> HTTPS apex redirect | Pass |
| TLS 1.2 | Pass |
| TLS 1.3 | Pass |
| TLS <= 1.1 | Rejected as required |
| HTTP TRACE | Rejected with 405 |
| HSTS | Pass — `max-age=31536000` |
| CSP / nosniff / anti-framing / Permissions Policy | Pass |
| COOP / COEP / CORP | Pass |
| GitHub `main` repository ruleset | **Open — no active ruleset currently returned** |

## Findings

### SEC-001 — Production branch has no required protection or security gate — Medium — Open

Production deploys automatically from `main`. The repository rulesets API returned an empty ruleset collection during this assessment. A mistaken or compromised direct push can therefore become production without mandatory pull-request review or mandatory successful security checks.

**OWASP:** A08 Software and Data Integrity Failures  
**Required remediation:** create an active ruleset for `main`, require pull requests, require `CodeQL / JavaScript` and `SCA / npm audit + SBOM`, require the branch to be current before merge, block force pushes and deletion, and require conversation resolution.

The exact baseline is documented in `security/REPOSITORY-PROTECTION.md`.

The production ZAP job should remain a post-deploy/continuous verification control in its current form because it scans the deployed production site rather than a pull-request candidate.

### SEC-002 — Wrangler deployment tool was not locally pinned — Medium — Fixed

The deployment process previously relied on bare `npx wrangler`, allowing tool version drift when no local version was installed.

**Remediation applied:** exact build dependency `wrangler@4.135.0` is declared in `package.json`; SCA runs continuously and the resolved dependency graph is included in the CI-generated SBOM artifact.

### SEC-003 — Trusted `innerHTML` translation sink — Informational — Accepted / hardening candidate

The language switcher writes only hard-coded translation constants to `innerHTML` for the styled hero heading. The `lang` input is validated against the translation object and unrecognized values fall back to English. No user-controlled HTML data flow was identified and CodeQL/ZAP did not identify an exploitable XSS path.

**Optional hardening:** split the hero heading into text-only translation nodes and use `textContent` exclusively. This is defense-in-depth rather than remediation of an identified exploitable vulnerability.

### SEC-004 — External live DAST and production edge verification — Informational — Closed

Live external verification is now implemented through GitHub Actions and successfully reaches production.

Verified controls include:

- apex HTTPS availability;
- HTTP -> HTTPS redirect;
- HTTP/HTTPS `www` -> HTTPS apex redirect;
- HSTS delivery;
- CSP, `X-Content-Type-Options`, `X-Frame-Options` and Permissions Policy;
- COOP/CORP and COEP;
- TLS 1.2 and TLS 1.3 acceptance;
- TLS 1.1 and below rejection;
- TRACE rejection with HTTP 405;
- OWASP ZAP passive baseline across discovered production resources.

### SEC-005 — Missing Cross-Origin-Embedder-Policy — Low — Fixed

A production ZAP scan initially reported the site-isolation rule because COEP was absent.

**Remediation applied:** `Cross-Origin-Embedder-Policy: require-corp` was added alongside the existing `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` controls.

The follow-up production scan reports the site-isolation rule as PASS and the final ZAP risk summary contains informational findings only.

## ZAP informational triage

The remaining ZAP alerts are intentionally retained in scanner evidence rather than suppressed. Detailed rationale is maintained in `security/DAST-TRIAGE.md`.

- **10015 — Re-examine Cache-control Directives:** accepted; affected content is public/static and explicit cache policy is configured.
- **10049 — Storable and Cacheable Content:** accepted; caching is intentional and there is no authenticated, personal or user-specific response in scope.
- **10094 — Base64 Disclosure:** accepted heuristic false positive; sampled values decode to non-text binary noise and no secret payload was identified.
- **90005 — Sec-Fetch-* request headers missing:** accepted scanner artifact; these are browser-generated request headers and cannot be forced by the origin for arbitrary scanner requests.

The DAST workflow is configured to fail when any Low, Medium or High ZAP alert group appears. Informational alerts remain visible for review.

## Positive security observations

- No application backend or server-side request functionality in website scope.
- No login/session/authentication attack surface.
- No form processing or file upload.
- No browser `fetch`, XHR, WebSocket or third-party analytics/runtime JavaScript.
- No exposed credential/API-key/private-key pattern identified during source review.
- CSP restricts scripts, styles and connections to same-origin and denies objects/frames.
- Framing is independently denied with `X-Frame-Options: DENY`.
- HSTS is enabled for the apex with one-year max age.
- COOP, COEP and CORP provide a strict same-origin isolation baseline for the current all-first-party static resource model.
- Referrer and Permissions Policy are explicitly restricted.
- Public assets use explicit cache directives.
- Contact uses `mailto:` only; there is no website-side message-processing endpoint.

## SCA / SBOM result

**Runtime npm dependencies:** 0.  
**Declared direct build dependency:** `wrangler@4.135.0` (build/deployment only; not shipped to visitors).  
**Validated npm audit:** 0 vulnerabilities.  
**Validated resolved build SBOM:** 38 components.  
**Repository SBOM:** `security/sbom.cdx.json`.  
**CI evidence:** a full resolved CycloneDX build SBOM plus `package-lock.json` is uploaded as a workflow artifact for each successful SCA run.

## OWASP Top 10 mapping

| OWASP category | Status | Assessment |
|---|---|---|
| A01 Broken Access Control | N/A | Public static content; no authorization boundary. |
| A02 Cryptographic Failures | Pass for assessed edge controls | No sensitive application data; production accepts TLS 1.2/1.3 and rejects TLS <=1.1. HSTS is active. |
| A03 Injection | Pass / hardening note | No backend injection surface and no user-controlled DOM HTML flow identified. Trusted `innerHTML` remains an optional defense-in-depth hardening item. |
| A04 Insecure Design | Pass | Minimal static architecture; no accounts, uploads, payments or stateful workflows. |
| A05 Security Misconfiguration | Pass | Security response headers, redirect behavior, TLS policy and HTTP method behavior were verified live. |
| A06 Vulnerable and Outdated Components | Pass | No runtime libraries; Wrangler is pinned; npm audit currently reports 0 vulnerabilities; Dependabot/SCA are continuous. |
| A07 Identification and Authentication Failures | N/A | No authentication. |
| A08 Software and Data Integrity Failures | Needs action | Security CI exists, but `main` is not yet protected by an active repository ruleset. |
| A09 Security Logging and Monitoring Failures | Contextual | Static site; GitHub Actions provides security-test evidence. Cloudflare access/security telemetry retention remains an operational decision. |
| A10 SSRF | N/A | No server-side HTTP client/request functionality. |

## Continuous security controls

- GitHub CodeQL `security-extended` analysis on push, pull request, weekly schedule and manual dispatch.
- `npm audit --audit-level=high` for build dependencies.
- Full CycloneDX dependency SBOM generation and evidence artifact upload.
- Dependabot weekly npm update checks.
- Exact Wrangler version pin.
- Production OWASP ZAP baseline on push, weekly schedule and manual dispatch.
- Production DAST gate fails on Low/Medium/High alert groups.
- Production security-policy readiness check prevents ZAP from scanning a stale Cloudflare deployment after a GitHub push.
- Automated verification of HTTPS redirects, HSTS, CSP, anti-framing, MIME-sniffing protection, Permissions Policy, COOP/CORP/COEP, TLS 1.2/1.3, legacy TLS rejection and TRACE rejection.
- `.gitignore` entries for local dependency/runtime secret files.

## Remaining action

Enable the `main` branch repository ruleset defined in `security/REPOSITORY-PROTECTION.md`. After that control is active and verified, SEC-001 can be closed and the website assessment will have no open material finding in the reviewed scope.

HSTS `includeSubDomains` and `preload` are intentionally not enabled automatically. They should be considered only after every relevant subdomain is confirmed to be HTTPS-only and operationally ready for the irreversible/long-lived consequences of preload.
