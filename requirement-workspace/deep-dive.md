# Deep-dive — Phase 2.5

Trigger: impact solution direction is **add** (new capability, greenfield repo).

## REQ-001

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `greeting` | One row per greeting message; this change seeds exactly one row, `id = 1` | `id` INT PRIMARY KEY; `message` VARCHAR(255) NOT NULL | None. Static seed written by migration `V1__create_greeting.sql`; no create/update/delete path is in scope. |

Ownership: the backend service owns the table and the migration. The frontend
never reads the database directly. No `{TBD}` fields remain.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Seeded row present | in | Migration guarantees it on first start; repository reads `id = 1` |
| Database file absent at startup | in | Created automatically by the embedded engine, then migrated |
| Database file already migrated | in | Migration is a no-op on subsequent starts (idempotent) |
| Row missing / table empty | out of scope | No write API exists, so this state cannot be reached through in-scope behavior; no defensive branch is specified |
| Backend unreachable from the browser | in (reverse case AC3-N) | Frontend renders a load-failure message; it must not fall back to a hard-coded greeting |
| Concurrent writers | out of scope | Single seeded row, read-only API |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

REQ-001 is the only requirement in the registry. No cross-REQ conflict exists;
nothing to converge. Recorded as N/A with rationale rather than left blank.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Home page heading | Page load | Anonymous visitor | `greeting.message`, rendered as the page's `h1` text | `GET /api/greeting` over HTTP, proxied by the dev server |
| Home page failure message | Endpoint request fails or returns non-2xx | Anonymous visitor | Static error text plus the failure reason; no greeting value | Same request path |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

Retention, volume and SLA are not decidable for a scaffold slice and are not
required by any AC. Recorded as a non-blocking item for Dev, not invented.

## REQ-002

Trigger: impact solution direction is **modify** (one requirement of the existing
`greeting` capability changes). The IO rulings of 2026-11-13 close REQ-001's
OQ-2/OQ-3/OQ-4 and reopen the data contract and the wire contract.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `greeting` (storage) | One row per greeting message; exactly one row seeded, `id = 1` | `id` INTEGER PRIMARY KEY; `message` TEXT NOT NULL — SQLite dialect, replacing the H2 `INT` / `VARCHAR(255)` | None. Static seed written by `V1__create_greeting.sql`; no create/update/delete path is in scope. |
| Greeting response (wire) | One JSON object per `GET /api/greeting` call | `message`: string, required, the stored value verbatim. No other field. Media type `application/json` | None. Read-only projection of the single stored row. |

Ownership unchanged: the backend owns the table, the migration and the response
shape; the frontend never reads the database directly. No `{TBD}` fields remain.
The JSON field name `message` is fixed by the IO ruling, not chosen by Dev.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Seeded row present | in | Migration guarantees it on first start; repository reads `id = 1` |
| SQLite file absent at startup | in | Created by the JDBC driver on first connection, then migrated by Flyway |
| SQLite file already migrated | in | Flyway records the applied version in `flyway_schema_history`; a later start is a no-op |
| Response body is not the ruled JSON shape | out of scope | The endpoint is the only producer and its shape is fixed by the delta spec; no defensive branch is specified |
| Row missing / table empty | out of scope | No write API exists, so this state cannot be reached through in-scope behavior |
| Backend unreachable from the browser | in (reverse case AC3-N) | Frontend renders a load-failure message; unchanged from REQ-001 |
| Non-JSON body with a 200 status (e.g. a dev-server fallback page) | in | `response.json()` rejects and the existing `.catch` renders the load-failure message; no new branch is needed |
| Concurrent writers | out of scope | Single seeded row, read-only API. SQLite locking under the test connection pool is a design concern, not a product branch |
| Migrating existing H2 rows | out of scope | `backend/data/` is gitignored dev state with a constant seed (OQ-5, resolved) |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

REQ-002 modifies REQ-001's endpoint requirement. The conflict is explicit and
resolved by the IO ruling, not by editing the archived record:

| Item | REQ-001 (archived) | REQ-002 | Convergence |
|---|---|---|---|
| Response body | exactly `Hello World`, `text/plain` | `{"message":"Hello World"}`, `application/json` | MODIFIED delta supersedes; REQ-001 archive stays immutable |
| Engine | H2 file mode | SQLite file mode | Design-level; the storage requirement is engine-agnostic, so no spec conflict |
| Migration tooling | Flyway kept under a working interpretation (OQ-2 deferred) | Flyway kept by explicit ruling | `TODO.md` line 33 amended to `- ORM`; contradiction removed |
| Visitor-visible heading | `Hello World` | `Hello World` | Identical — no display regression |

No ✗ remains.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Home page heading | Page load | Anonymous visitor | `greeting.message` read from the JSON `message` field, rendered as the page's `h1` text | `GET /api/greeting` over HTTP, `application/json`, proxied by the dev server |
| Home page failure message | Request fails, returns non-2xx, or the body cannot be parsed as JSON | Anonymous visitor | Static error text plus the failure reason; no greeting value | Same request path |

The rendered text and the failure behavior are unchanged; only the parsing step
changes. No notifications are in scope.

### NFR business-policy layer

Unchanged from REQ-001: not decidable for a scaffold slice, not required by any
AC, recorded as a non-blocking item for Dev.
