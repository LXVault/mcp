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

## Known limitation being worked on

Tool descriptions understate what a project's embedding model means. `search_knowledge`
says it ranks "using the project's embedding model" without saying that only chunks
embedded with that exact model are searchable, and `get_project` reports a single chunk
count with no indication of how many of those chunks are actually reachable by search. A
model reading these will report an empty result as "nothing found" rather than "the
knowledge base is not embedded with the model this project currently uses".

## Next obvious step

Once the backend keys embeddings on `(chunk_id, model_name)` and reports coverage, say so
in the `get_project` and `search_knowledge` descriptions so the assistant explains an
uncovered knowledge base instead of misreporting it as empty.
