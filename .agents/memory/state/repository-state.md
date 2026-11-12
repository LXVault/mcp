---
name: memory-state-repository-state
description: Current known state of the mcp-rag-mcp-server after the instruction system setup. Overwritten in place, always current.
---

# Repository State

## What exists

A working Model Context Protocol server, version `2.0.0`, TypeScript (strict) compiled by
`tsc` to ES modules in `dist/`, four source files. `npm run build` compiles, `npm test` runs
the tool surface check through `tsx`. The version lives in `package.json` and is read from
there; `src/index.ts`
no longer carries a second copy that can fall behind it.

Nine tools, all thin calls to the Express backend:

* `whoami` and `get_project`, which need no OpenRouter key.
* `search_knowledge`, `add_knowledge` and `upload_file`, which embed text and therefore
  spend the acting user's own OpenRouter credits.
* `change_project_title` and `change_project_description`, which the backend gates on write
  access — the owner, or an `editor` or `admin` member — and `add_member`, which it gates on
  owner or admin. `add_member` cannot grant `admin`; that is done in the web app.
* Project creation is not on this surface. A project token is minted for one project, so
  `POST /api/mcp/projects` is refused by the backend.

## Stack

`@modelcontextprotocol/sdk` for the server and the stdio transport, `zod` for argument
schemas. Two dependencies, deliberately.

Dev-only: `typescript`, `@types/node` and `tsx`. As of 2026-11-12 the SDK is 1.32.2, zod
4.6.7, TypeScript 7.0.2, and `npm audit` reports 0 vulnerabilities.

## Shared instruction set

Mode B consumer. The shared set is resolved through the `lxagents-agents-base` MCP
connector, adopted version `1.0.0`. Nothing from it is copied into this repository.

## What is not built

* No linter configuration and no CI workflow. The only automated check is `npm test`.
* Stdio transport only. No HTTP or SSE transport.
* No `manifest.json` in the repository. The Claude Desktop bundle is documented as a
  procedure and generated when someone packs one.

## Embedding coverage in tool descriptions

Resolved in `1.1.0`, against the backend change of the same version. `get_project` now
describes `searchable_chunk_count` and `chunks_awaiting_embedding` against `chunk_count`,
and `search_knowledge` tells the reading model to check the `coverage` block before
reporting an empty result. No transport or argument changed; the descriptions did, because
they are what a model reasons from.

Verified by driving the server over real stdio JSON-RPC against a live backend: 9 checks,
covering tool registration, both descriptions, the coverage fields on `get_project`, a
search over an uncovered knowledge base returning no rows with seven pending, the same
search returning ranked rows after a backfill, and stdout carrying nothing but protocol
messages.

## Next obvious step

Nothing outstanding.
