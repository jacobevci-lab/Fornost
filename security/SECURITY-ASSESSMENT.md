# Fornost Security Website — Application Security Assessment

**Assessment date:** 2026-09-21  
**Repository:** `jacobevci-lab/Fornost`  
**Production:** `https://fornostsecurity.com`  
**Scope:** static HTML/CSS/JavaScript, Cloudflare Workers static-assets configuration, response-header policy, deployment supply chain.

## Executive summary

The website has a deliberately small attack surface: it is static, has no authentication, no application backend, no form-processing endpoint, no database, no file upload, no third-party runtime JavaScript, and no browser network calls (`fetch`/XHR/WebSocket). The existing CSP and anti-framing headers are strong.

No exploitable Critical or High application-code vulnerability was identified during source review. The principal material weakness found was deployment integrity: production is deployed automatically from `main`, while the repository currently has no branch protection/ruleset requiring review or security checks. A second supply-chain weakness was the use of bare `npx wrangler`, which resolves the latest Wrangler when no local version is declared; this assessment pins Wrangler in `package.json` and adds continuous CodeQL/SCA checks.

## Assessment coverage

- SAST-oriented source review for DOM XSS, unsafe HTML/JS execution, URL/open-redirect sinks, client storage, network calls, inline event handlers, external script loading, secret patterns and insecure browser APIs.
- SCA review of runtime and build dependencies.
- CycloneDX 1.6 SBOM generation.
- OWASP Top 10 (2021) applicability and control mapping.
- Configuration review of Cloudflare Workers static assets and security response headers.
- Local dynamic/browser QA and malicious language-parameter review.
- Live external DAST/TLS/edge-header verification is still required from a scanner network that can resolve the production hostname.

## Findings

### SEC-001 — Production branch has no required protection or security gate — Medium — Open

The `main` branch is not protected and production deploys automatically from `main`. A mistaken or compromised direct push can therefore become production without mandatory review or passing security checks.

**OWASP:** A08 Software and Data Integrity Failures  
**Recommended remediation:** enable a GitHub ruleset/branch protection for `main`, require pull requests, require the Security workflow checks, prevent force pushes/deletion, and consider requiring signed commits for human contributors.

### SEC-002 — Wrangler deployment tool was not locally pinned — Medium — Fixed in repository

The deployment documentation used `npx wrangler deploy` but the repository had no `package.json`. Cloudflare documents that bare `npx wrangler` uses the latest Wrangler when Wrangler is not installed locally. This creates avoidable build drift and supply-chain uncertainty.

**Remediation applied:** exact build dependency `wrangler@4.135.0` is declared in `package.json`; Cloudflare Workers Builds uses the Wrangler version set in `package.json`. Continuous `npm audit` and Dependabot configuration are also added.

**SCA note:** Wrangler 4.135.0 is above the patched boundary for the 2026 `wrangler pages deploy` command-injection advisory (patched in 4.59.1+) and current vulnerability databases report no known direct vulnerability in 4.135.0 as of the assessment date.

### SEC-003 — Trusted `innerHTML` translation sink — Informational — Accepted / hardening candidate

The language switcher writes only hard-coded translation constants to `innerHTML` for the styled hero heading. The `lang` input is validated against the translation object and unrecognized values fall back to English, so no user-controlled HTML flow was identified. This is not currently exploitable, but eliminating HTML sinks is preferable.

**Recommended hardening:** split the hero heading into text-only translation nodes and use `textContent` exclusively.

### SEC-004 — External live DAST not completed from assessment runtime — Informational — Open

The assessment runtime cannot resolve/reach `fornostsecurity.com` or the Workers preview hostname, so an independent live verification of TLS configuration, redirect chains, HTTP methods, cache behavior and actual edge response headers could not be executed from this scanner environment.

**Required close-out:** run a live scan from an externally connected scanner and verify `http -> https`, `www -> apex`, CSP, HSTS decision, TLS 1.2+, TLS 1.3, method handling, cache headers, robots/sitemap and error-page behavior.

## Positive security observations

- No application backend or server-side request functionality in the website scope.
- No login/session/authentication attack surface.
- No form processing or file upload.
- No browser `fetch`, XHR, WebSocket or third-party analytics/runtime JavaScript.
- No secrets matched common API key, private key, GitHub token or cloud-key patterns in the reviewed current source.
- CSP limits scripts/styles/connections to same-origin; objects and frames are denied; framing is also denied with `X-Frame-Options`.
- Referrer and Permissions Policy are explicitly restricted.
- `Cross-Origin-Opener-Policy: same-origin` is present.
- Contact uses `mailto:` only.

## SCA / SBOM result

**Runtime npm dependencies:** 0.  
**Declared build dependency after remediation:** `wrangler@4.135.0` (build/deployment only; not shipped to visitors).  
**SBOM:** `security/sbom.cdx.json` (CycloneDX 1.6).

## OWASP Top 10 mapping

| OWASP category | Status | Assessment |
|---|---|---|
| A01 Broken Access Control | N/A | Public static content; no authorization boundary. |
| A02 Cryptographic Failures | Low exposure | No sensitive application data; edge TLS still requires live verification. |
| A03 Injection | Pass / hardening note | No backend injection surface; no user-controlled DOM HTML flow identified. Trusted `innerHTML` sink retained as a hardening candidate. |
| A04 Insecure Design | Pass | Minimal static architecture; no accounts, uploads, payments or stateful workflows. |
| A05 Security Misconfiguration | Pass with live verification pending | Strong CSP/anti-frame/referrer/permissions headers in source; actual edge delivery must be verified live. |
| A06 Vulnerable and Outdated Components | Pass after remediation | No runtime libraries. Wrangler pinned to 4.135.0; continuous SCA added. |
| A07 Identification and Authentication Failures | N/A | No authentication. |
| A08 Software and Data Integrity Failures | Needs action | `main` has no required branch protection; CI security gates added but are not mandatory until ruleset protection is enabled. |
| A09 Security Logging and Monitoring Failures | Contextual | Static site; Cloudflare access/security telemetry should be retained according to operational requirements. |
| A10 SSRF | N/A | No server-side HTTP client/request functionality. |

## Continuous security controls added

- GitHub CodeQL for JavaScript/TypeScript on push, PR, weekly schedule and manual dispatch.
- `npm audit --audit-level=high` for build dependencies.
- Dependabot weekly npm update checks.
- Exact Wrangler version pin.
- `.gitignore` entries for local dependency/runtime secret files.

## DAST close-out checklist

1. Confirm apex HTTPS returns `200` and expected security headers.
2. Confirm `http://fornostsecurity.com` redirects to HTTPS.
3. Confirm both HTTP/HTTPS `www` redirect permanently to the HTTPS apex while preserving path/query.
4. Verify TLS 1.0/1.1 rejected and TLS 1.2/1.3 accepted.
5. Verify `TRACE` is rejected; review `OPTIONS`, `HEAD`, unsupported verbs and error responses.
6. Test malicious query/hash payloads for reflected/DOM XSS.
7. Check content-type handling, cache behavior, CSP enforcement, clickjacking protection, MIME sniffing and information leakage.
8. Verify `robots.txt`, `sitemap.xml`, favicon/logo/static assets and non-existent paths.
9. Decide on HSTS only after all HTTPS/redirect behavior is confirmed; add preload only after deliberate review.
