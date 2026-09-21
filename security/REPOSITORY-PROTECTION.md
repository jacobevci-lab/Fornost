# Fornost Repository Protection Baseline

This repository deploys production from `main`, so source-control integrity is a production security control.

## Required ruleset

Create a repository ruleset named **Production main protection** with target branch `main` and enforcement set to **Active**.

Enable these rules:

- Restrict deletions.
- Block force pushes / non-fast-forward updates.
- Require a pull request before merging.
- Required approvals: `0` while the repository is maintained by a single human owner; increase to `1+` when an independent reviewer is available.
- Require conversation resolution before merging.
- Require status checks to pass before merging.
- Require branch to be up to date before merging.
- Required check: `CodeQL / JavaScript`.
- Required check: `SCA / npm audit + SBOM`.
- Require linear history if it does not conflict with the chosen merge strategy.

Do **not** make the production `OWASP ZAP Baseline` job a pre-merge required check in its current form. It scans the currently deployed production site, not the pull-request candidate. Keep it as a post-deploy/continuous verification control until a preview/local DAST job is introduced.

## Bypass policy

Avoid broad bypass permissions. If an emergency/admin bypass is retained, treat it as break-glass access and use it only for recovery. Normal changes should use a pull request and pass the required security checks.

## Signed commits

Signed commits are desirable but should be enabled only after confirming that every supported authoring path used by the project (human Git client, GitHub UI/API tooling and automation) produces commits accepted by GitHub's signed-commit rule. Do not enable this rule blindly and lock out automated maintenance.

## Verification

After creating the ruleset:

1. Confirm a direct update to `main` is rejected for a normal change path.
2. Open a test pull request and confirm both required Security checks appear.
3. Confirm merge is unavailable while either required check is pending or failing.
4. Confirm force push and branch deletion are blocked.
5. Re-query the repository rulesets API and record the active ruleset in `security/SECURITY-ASSESSMENT.md`.

## Current status

At the 2026-09-21 assessment, the repository rulesets API returned an empty ruleset collection. This is the remaining material repository-integrity finding from the website AppSec assessment.
