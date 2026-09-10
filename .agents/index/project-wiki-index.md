---
name: project-wiki-index
description: Index of wiki/, the human documentation tree for this MCP server. Release logs are routed from logs-index instead.
---

# Project Wiki Index

**Scope:** `wiki/`, excluding `wiki/logs/`
**Parent:** [`root-index.md`](root-index.md)

## information

| File | Purpose |
|---|---|
| [`../../wiki/information/overview.md`](../../wiki/information/overview.md) | What the server is, what it exposes, and how a token makes an assistant's actions attributable. |
| [`../../wiki/information/architecture.md`](../../wiki/information/architecture.md) | The three modules, how a tool call becomes an API call, and where authorization actually happens. |

## reference

| File | Purpose |
|---|---|
| [`../../wiki/reference/tools.md`](../../wiki/reference/tools.md) | Every tool, its arguments, what it returns, and which ones need an OpenRouter key. |

## environments

| File | Purpose |
|---|---|
| [`../../wiki/environments/setup.md`](../../wiki/environments/setup.md) | Installing, running against a backend, and wiring the server into an MCP client. |
| [`../../wiki/environments/env.md`](../../wiki/environments/env.md) | The two environment variables, and what a missing or wrong value does. |

## guides

| File | Purpose |
|---|---|
| [`../../wiki/guides/claude-desktop-extension.md`](../../wiki/guides/claude-desktop-extension.md) | Packaging the server as a one click Claude Desktop bundle instead of editing JSON by hand. |

## Maintenance

Any page added to or removed from `wiki/` is reflected in this table in the same commit.
`wiki/logs/` is owned by [`logs-index.md`](logs-index.md) and never listed here.
