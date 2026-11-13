# CI report — req-001-hello-world (E1 slot)

Persisted copy of the pipeline report body for local-verify consumption.
Full report: `docs/ai4se-plugins/20261113-145614-pipeline-report.md`.

**Date:** 2026-11-13 (UTC+08:00)
**Phase:** ci
**Data source:** human-confirm
**Target:** branch `main` of `origin` = `https://github.com/lianyue910-a11y/gogo.git`
**Pipeline URL:** n/a — no run observable from this machine
**Commit:** `fb2ed91e057d164c59a9dd713950d43e2c458e46` (P4) — introduces the workflow plus `backend/` and `frontend/`. **Pushed** on 2026-11-13 (`3f455fd..6a98d30 main -> main`); remote head `6a98d30`, local/remote synced 0/0. SHAs were rewritten by the rebase onto the remote's new baseline

## E1

**❓ 未验证 (machine).** `gh` is not installed and `api.github.com` returns HTTP
403 from this machine, so no remote job status could be read. Absence of data is
not a green result. The `ci` phase is instead accepted by a **named human
confirmation** (below), which does not convert E1 into machine evidence.

| Phase | Job | Status | Notes |
|---|---|---|---|
| ci | `backend` — `mvn -B test`, Java 21 | success — human-confirmed | No machine log readable; rests on Johnson's confirmation |
| ci | `frontend` — `npm ci`, `npm run build`, Node 24 | success — human-confirmed | No machine log readable; rests on Johnson's confirmation |
| ci | E2E / browser acceptance | skipped by design | `atdd-design.md` §3 — no browser orchestration in CI |
| cd | any | n/a | No deployment in scope |

**Overall: Partial (`Pass-by-human-confirm`).** Not an API-verified Pass. All four
confirmation fields are filled by Johnson, so this report may be cited in the
Inputs of a G2 record.

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

See `docs/ai4se-plugins/20261113-153317-local-verify-report.md` (Overall **Pass**),
which supersedes `20261113-145614-local-verify-report.md` (Overall Partial). The
re-run added the filled command whitelist (runner: 4 attempted, 0 failed) and
re-executed the runtime and system layers.

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
   availability) — mitigated: Johnson confirmed the run is green; accepted on
   human evidence, not closed by machine evidence.
2. Action majors `checkout@v4` / `setup-java@v4` / `setup-node@v4` not verified
   against the marketplace from this machine — mitigated: a green run implies the
   tags resolved; still unverified by machine evidence.
3. No secret-scan / SAST coverage in CI — accepted for this slice.
4. E2E not covered by CI — accepted; manual evidence in the local verify report.
5. Cold-cache npm install through the corporate mirror unproven (tarballs were
   cache hits) — open.

## Human confirmation

**Signed.** All four required fields:

| Field | Value |
|---|---|
| Confirmer | **Johnson** (project owner; also IO / SA / VL for this change) |
| Phase covered | ci |
| Explicit statement | "没问题，ci全绿。都签署我的名字即可Johnson" |
| Timestamp | Statement given in session on 2026-11-13 before the 15:26 (+08:00) re-run; recorded 2026-11-13 15:33 (+08:00) |

The agent recorded this confirmation; it did not self-confirm. Overall stays
**Partial (`Pass-by-human-confirm`)** and is never upgraded to an API-verified Pass.

## Next

**Push blocked, then resolved.** The first push was rejected (`fetch first`);
`git fetch origin` showed a forced update of the remote ref
(`+ 7164949...3f455fd`) — the remote baseline had been rewritten to delete
`push-test.md`, so the branches had diverged. The user chose to rebase:
`git rebase --onto origin/main 7164949 main` replayed the five SDD commits with no
conflicts (backup ref `backup/pre-rebase-main`), then `git push origin main` →
`3f455fd..6a98d30`, local/remote synced `0 0`. No force-push was used.

**Run confirmed by Johnson.** The workflow is on the remote and triggered, but its
status is still unreadable here (`gh` absent, `api.github.com` → 403). **E1 stays
❓ 未验证** — a successful push is not evidence of a green run; the named human
confirmation is the evidence, and it is human, not machine.

This slot is now citable as `Pass-by-human-confirm` in the G2 Inputs, and is cited
there. To upgrade to a machine-verified Pass later, restore remote read access and
re-run `/sdd:pipeline-report` with the run SHA, job durations and URL.