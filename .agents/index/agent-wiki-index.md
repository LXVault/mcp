---
name: agent-wiki-index
description: Index of .agents/wiki/, the knowledge written for agents working in this MCP server rather than for human contributors.
---

# Agent Wiki Index

**Scope:** `.agents/wiki/`
**Parent:** [`root-index.md`](root-index.md)

## context

| File | Purpose |
|---|---|
| [`../wiki/context/repository-map.md`](../wiki/context/repository-map.md) | Orientation before touching code: what lives where, how to run and verify a tool, and the gotchas that cost time. |
| [`../wiki/context/mcp-tools.js`](../wiki/context/mcp-tools.js) | Run with `node .agents/wiki/context/mcp-tools.js`. Asserts the registered tool surface twice: through a spy, for the tool list, the `add_member` role enum, and that no description claims a scope or an injection guarantee the backend does not provide; and through a real `McpServer` and `Client` over an in-memory transport, so the registration API and the schema conversion are proved against the SDK rather than against a stub. |

## Maintenance

Any file added to or removed from `.agents/wiki/` is reflected in this table in the same
commit. Underlying facts live once in `wiki/` and are linked from here, never copied.
