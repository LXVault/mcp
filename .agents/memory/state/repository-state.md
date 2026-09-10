---
name: memory-state-repository-state
description: Current known state of the mcp-rag-mcp-server after the instruction system setup. Overwritten in place, always current.
---

# Repository State

## What exists

A working Model Context Protocol server, version `1.0.0`, ES modules, no build step, three
source files.

Nine tools, all thin calls to the Express backend:

* `whoami` and `get_project`, which need no OpenRouter key.
* `search_knowledge`, `add_knowledge` and `upload_file`, which embed text and therefore
  spend the acting user's own OpenRouter credits.
* `create_new_project`, `change_project_title`, `change_project_description` and
  `add_member`, which the backend gates on owner or admin.

## Stack

`@modelcontextprotocol/sdk` for the server and the stdio transport, `zod` for argument
schemas. Two dependencies, deliberately.

## Shared instruction set

Mode B consumer. The shared set is resolved through the `lxagents-agents-base` MCP
connector, adopted version `1.0.0`. Nothing from it is copied into this repository.

## What is not built

* No test suite, no linter configuration, no CI workflow.
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
