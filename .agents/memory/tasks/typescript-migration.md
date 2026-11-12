---
name: memory-tasks-typescript-migration
description: Record of migrating the MCP server from JavaScript to TypeScript on current dependencies, released as 2.0.0.
status: in-progress
---

# Task: migrate the MCP server to TypeScript

**Goal.** Type-check the server, its API client and its use of the MCP SDK, on the latest
dependencies, with a clean security audit.

**Objective.** `npm run build` compiles with zero errors, `npm test` passes the tool surface
check, the compiled server answers over real stdio, and `npm audit` reports 0 vulnerabilities.

**Detail.** The owner's migration checklist: latest dependencies plus `typescript`,
`@types/node` and `tsx` as devDependencies; a `tsconfig.json` with `ES2022`, `NodeNext`,
`strict`, `src` to `dist`; every source file renamed to `.ts` and typed; `main`, `bin` and
`start` pointing at `dist/`; a `build` script; a `test` script that runs the existing check
through `tsx`. Tool names, descriptions, schemas, stdout behaviour and the two runtime
dependencies do not change. The code is already ES modules, so no CommonJS conversion is
needed.

## Tasks

| # | Title | Scope | Repository | Branch | PR |
|---|---|---|---|---|---|
| 1 | Task record | this file | mcp | `plan/typescript-migration` | |
| 2 | Migrate to TypeScript | dependencies and audit, `tsconfig.json`, `src/*.ts`, `package.json`, the surface check, `.gitignore`, docs | mcp | `refactor/typescript` | |
| 3 | Release 2.0.0 | `package.json` version, `wiki/logs/2/0/0/`, log index, close this record | mcp | `release/2.0.0` | |

## Decisions

**2.0.0, approved by the owner on 2026-11-12.** The tool surface is unchanged, but the
executable moves from `src/index.js` to `dist/index.js` and now needs a build. Every client
configured with an absolute path to `src/index.js` stops starting until it is re-pointed,
which is a break for a consumer even though no tool changed.

**One branch per task, not the session's default branch.** The owner approved the
`plan/`, `refactor/`, `release/` names over the tool-prefixed branch the session was
assigned, which the branching convention forbids.

### Task 1 — plan/typescript-migration

The confirmed list, written before any of it is built. No production file is touched.
Task 2 depends on nothing outside this repository.

`.gitignore` now excludes `.agents/plans/`, at the owner's request on 2026-11-12, so the
untracked working plan cannot be committed by accident.

### Task 2 — refactor/typescript

- Dependencies: SDK 1.30.1 to 1.32.2, zod 4.6.5 to 4.6.7. Added `typescript` 7.0.2,
  `@types/node` 26.6.6 and `tsx` 4.23.15 as devDependencies. The first audit after the
  upgrade found 7 transitive vulnerabilities (1 critical, 1 high, 5 moderate) under the
  SDK's HTTP stack; `npm audit fix` cleared all of them without a forced upgrade.
- `tsconfig.json`: `ES2022`, `NodeNext` / `NodeNext`, `strict`, `noUncheckedIndexedAccess`,
  `src` to `dist`, source maps. Only `src/` compiles; the surface check runs through `tsx`.
- `src/*.js` renamed to `.ts` (history kept with `git mv`). Types added: `Config`,
  `ApiClient` with one method per endpoint, `ApiError`, `MemberRole`, `UploadFileInput`;
  `registerTools(server: Pick<McpServer, 'registerTool'>)`, `ToolName` from the
  `as const` name list, and `CallToolResult` for every rendered result. Caught values are
  `unknown` and narrowed with `instanceof Error`. No tool, description or schema changed.
- `package.json`: `main` and `bin` point at `dist/index.js`; `build` (`tsc`), `start`
  (`node dist/index.js`), `dev`, `test` and `typecheck` scripts. `dist/` is git-ignored.
- `.agents/wiki/context/mcp-tools.js` became `.ts`, typed, and is `npm test`.
- Docs moved with the code: README, architecture, setup, env, the Desktop extension guide,
  the repository map, the agent wiki index, and the state memory.

Verified: `npm run build` and `npm run typecheck` with zero errors; `npm test` 65 passed, 0
failed, the same 65 the JavaScript check passes on `master`; the check script also
type-checks clean under the same strict config; `node dist/index.js` over real stdio
answered `initialize`, listed the same eight tools, returned the unreachable-backend error
as an `isError` result, wrote only JSON-RPC to stdout, and exited 1 with no token; final
`npm audit` 0 vulnerabilities.

Left for the release task: the version is still `1.1.0` in `package.json` and in the
extension guide's manifest. Left stale on purpose: `.agents/rules/repository.md` still
says `src/tools.js` and that the check runs with `node`. It is an instruction file, so the
correction is proposed to the owner rather than written here.

### Task 3 — release/2.0.0

- `package.json` and `package-lock.json` at `2.0.0`, approved by the owner on 2026-11-12.
  The handshake reads it from there, so no source file changes.
- The extension guide's sample manifest moved to `2.0.0` with the package.
- `wiki/logs/2/0/0/CHANGELOG.md` and its row in `logs-index.md`. It also carries #8, #9 and
  #11, which merged after 1.1.0 and appeared in no changelog: they ship in 2.0.0 whether the
  log names them or not, so it names them.
- State memory now says `2.0.0`.

Verified on this branch: build clean, `npm test` 65 passed, audit 0 vulnerabilities.

Open: the `PR` column above is filled once the owner allows the pull requests and they
exist, in a follow-up commit on this branch, and the record is marked done then.
