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
