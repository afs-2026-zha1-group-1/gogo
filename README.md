# AI4SE Baseline

A starting repository for AI-assisted, specification-driven development. It
includes the project skeleton, OpenSpec prompts, AI4SE skills and agents, and
Superpowers skills as ordinary repository files.
Cloning does not require access to the author's machine or another private repository.

## Start

1. Clone your class's `ai4se-baseline` repository and open its root in your
   coding agent.
2. Install Node.js 20.19 or later and Git. For OpenSpec commands, install the
   matching CLI: `npm install -g @fission-ai/openspec@1.16.1`.
3. Run `node --test scripts/portability.test.mjs` to check the bundled files.
   Run `openspec --version` to check the separately installed CLI.
4. Read [AGENTS.md](AGENTS.md) and the
   [SDD command catalog](vendor/ai4se-plugins/commands/catalog.md).
   Project skills and custom agents are under `.agents/`. In an existing Qoder
   session, use `/skills reload` and `/agents reload`.

The bundled skills are already available after cloning. Do not run the original
plugin installer merely to use this baseline. Shell-based skill helpers require
Bash (for example Git Bash on Windows); their use depends on the selected skill.

## Project content

- [Knowledge base](docs/knowledge/_INDEX.md)
- [Requirement workspace](requirement-workspace/README.md)
- [OpenSpec workspace](openspec/README.md)
- [Harness scripts](scripts/README.md)
- [Bundled dependency versions and licenses](vendor/README.md)
- Application: `backend/` (Spring Boot API) and `frontend/` (React app)

CI runs on GitHub Actions (`.github/workflows/ci.yml`) for pushes and pull
requests to `main`: a backend job runs `mvn -B test` on Java 21, and a frontend
job runs `npm ci && npm run build` on Node 24. The four original harness scripts
are intentional placeholders and exit with a message until the project supplies
an implementation, so CI does not invoke them.

## Run the application

REQ-001 serves a greeting that is stored in the database, not in the frontend.
`GET /api/greeting` reads it, and the React home page renders the response.

The database is H2 in file mode at `backend/data/gogo.mv.db`. The Flyway
migration `V1__create_greeting.sql` creates the `greeting` table and seeds the
`Hello World` row on first start. Delete `backend/data/` to rebuild it.

Backend on port 8080:

```sh
cd backend
mvn spring-boot:run
```

Frontend on port 5173, proxying `/api` to the backend:

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173/. Check the API directly with
`curl http://localhost:8080/api/greeting` and the backend tests with
`cd backend && mvn test`.

`TODO.md` asks for SQLite. The implementation currently uses H2 so the stack can
be verified without a SQLite driver; both are embedded file databases, so the
switch is limited to the JDBC url, the driver dependency, and the migration
dialect.

## Create your own skill

Ask your agent: "Use skills-creator to turn my test-result reporting workflow
into a reusable skill." The [skills-creator](skills/skills-creator/SKILL.md)
helps define the trigger, inputs, output, instructions, and a practical trial.

Author project skills in `skills/<name>/SKILL.md`, then run:

```sh
node scripts/refresh-agent-assets.mjs
node --test scripts/portability.test.mjs
```

The refresh copies project skills into `.agents/skills/` and keeps their resource
links portable. Commit the source and generated copies together. The refresh
preserves skills with different names that already exist in `.agents/skills/`.

## Maintain the bundled assets

The AI4SE runtime sources and shared resources are under `vendor/ai4se-plugins/`.
Superpowers sources are under `vendor/superpowers/`. After updating these sources,
run `node scripts/refresh-agent-assets.mjs`, then the portability tests above.
The refresh reuses the AI4SE pack's copy projection and keeps resource links
relative. Commit the bundled sources and their copies under `.agents/` together.
