# CI report — req-001-hello-world (E1 slot)

Persisted copy of the pipeline report body for local-verify consumption.
Full report: `docs/ai4se-plugins/20261113-145614-pipeline-report.md`.

**Date:** 2026-11-13 (UTC+08:00)
**Phase:** ci
**Data source:** none
**Target:** branch `main` of `origin` = `https://github.com/lianyue910-a11y/gogo.git`
**Pipeline URL:** n/a — no run observable from this machine
**Commit:** pending at authoring time; local `main` ahead of `origin/main` by 3 (P1–P3), behind 0

## E1

**❓ 未验证.** `gh` is not installed and `api.github.com` returns HTTP 403 from
this machine, so no remote job status could be read. Absence of data is not a
green result.

| Phase | Job | Status | Notes |
|---|---|---|---|
| ci | `backend` — `mvn -B test`, Java 21 | pending | Not run remotely yet |
| ci | `frontend` — `npm ci`, `npm run build`, Node 24 | pending | Not run remotely yet |
| ci | E2E / browser acceptance | skipped by design | `atdd-design.md` §3 — no browser orchestration in CI |
| cd | any | n/a | No deployment in scope |

**Overall: Partial.** Not Pass, and not `Pass-by-human-confirm` — the human
confirmation section of the pipeline report is unsigned (confirmer unnamed).

## Local machine evidence (not E1 remote)

Green, and recorded separately so it is never mistaken for remote CI evidence:

- `cd backend && mvn -o -B test` → Tests run: 3, Failures: 0, Errors: 0 — BUILD SUCCESS
- Mutation check → the non-constant test fails when the controller returns a
  literal (`expected:<Guten Tag> but was:<Hello World>`), then passes after revert
- `cd frontend && npm ci` → added 19 packages, 0 vulnerabilities (after stopping
  the Vite process that held a native binding file)
- `cd frontend && npm run build` → vite 8.3.8, 15 modules, dist built
- `.github/workflows/ci.yml` parsed as YAML; two jobs; no placeholder harness
  script invoked

See `docs/ai4se-plugins/20261113-145614-local-verify-report.md`.

## Security / compliance

| Check | Status | Notes |
|---|---|---|
| Secret scan | n/a | No such job configured |
| SAST | n/a | No such job or local scanner configured |
| Dependency audit | ⏭️ | Local `npm ci` audit reported 0 vulnerabilities; not a CI job |

Lockfile hygiene: 0 corporate-registry hosts, 51 `registry.npmjs.org` URLs, so no
internal hostname is published. Local installs still use the configured corporate
mirror through npm's `replace-registry-host=npmjs` default (verified in the npm ci
debug log: 20 corporate-host entries, 0 npmjs.org entries).

## Residual risks

1. First remote run may fail (dependency download, action tag resolution, Node 24
   availability) — open.
2. Action majors `checkout@v4` / `setup-java@v4` / `setup-node@v4` not verified
   against the marketplace from this machine — open.
3. No secret-scan / SAST coverage in CI — accepted for this slice.
4. E2E not covered by CI — accepted; manual evidence in the local verify report.
5. Cold-cache npm install through the corporate mirror unproven (tarballs were
   cache hits) — open.

## Human confirmation

Pending, unsigned. A named human must confirm the `ci` phase before this report
can be cited as `Pass-by-human-confirm`. The agent must not self-confirm.

## Next

Push `main` (task 3.3), record the run SHA and URL, obtain a named human
confirmation, then re-run `/sdd:pipeline-report`. Do not claim G2 Pass while this
slot is ❓ 未验证.