---
name: memory-tasks-version-single-source
description: Record of collapsing the server version to one source and correcting two files that understated a version which had already shipped.
---

# Task: one source for the server version

**Goal.** `package.json` and `src/index.js` each carried their own copy of the version, and
both read `1.0.0` — while `wiki/logs/1/1/0/CHANGELOG.md` records 1.1.0 as released on
2026-09-10. A client asking what it had connected to was told the wrong answer, and nothing
would have said so.

**Objective.** `src/index.js` reads the version rather than repeating it, every source
names the version that actually shipped, and a third copy cannot be added by accident.

**Detail.** Task 1 of 3 in this chain. Task 3 fills the `PR` column and closes the record;
it does **not** release, because no version is created here. 1.1.0 already shipped and
already has its log directory. See *What this chain does not release* below.

## Tasks

| # | Title | Scope | Repository | Branch | PR |
|---|---|---|---|---|---|
| 1 | Task record | this file | mcp | `chore/version-single-source-plan` | |
| 2 | One source for the version | `package.json`, `src/index.js`, `.agents/memory/state/repository-state.md`, `wiki/guides/claude-desktop-extension.md` | mcp | `fix/version-single-source` | |
| 3 | Close the record | the `PR` column above | mcp | `chore/version-single-source-release` | |

## Decisions

**`package.json` moves to 1.1.0, not 1.2.0.** 1.1.0 was released and carries a dated
changelog; the two source files are simply behind it, so setting them to 1.1.0 makes them
stop misreporting the past. Choosing 1.2.0 would be a *new* version claim, and the version
rule requires explicit approval for that, which has not been given. The number is therefore
the released one, not the highest defensible one.

**`createRequire`, not an import attribute.** `import pkg from './package.json' with { type:
'json' }` needs Node 20.10 or newer, and the older `assert { type: 'json' }` spelling was
removed in Node 22 — so neither one loads across the `>=18` range `package.json` declares.
`createRequire(import.meta.url)` resolves a JSON file on every version in that range, and
costs one import.

**The extension guide's manifest version tracks the package.** The JSON block in
`wiki/guides/claude-desktop-extension.md` is what `mcpb init` produces, so a packed bundle
advertising 1.0.0 while the server reports 1.1.0 is the same defect one file over, and it
reaches a Claude Desktop user rather than a reader of this repository.

## What this chain does not release

#8 and #9 — the permission-scope correction and the dependency upgrade — merged after
1.1.0 and appear in **no changelog**. Putting them under 1.2.0 is a version claim and needs
the user's decision, so it is left open rather than assumed. `mcp-security-scope.md`
recorded the drift as it stood and is not rewritten here: it is a record of what was known
at the time, and this chain is where the correction lives.

### Task 1 — chore/version-single-source-plan

The confirmed list, written before any of it is built. No production file is touched by
this task.

Reading before planning found the third copy. The first two are the obvious ones —
`package.json` and the `McpServer` constructor — but `wiki/guides/claude-desktop-extension.md`
carries a fourth literal inside its worked manifest example, and a task scoped to "the two
files that disagree" would have left a packed bundle reporting the old version to the one
audience that installs it.

### Task 2 — fix/version-single-source

`src/index.js` now reads the version out of `package.json` through `createRequire` and hands
it to the `McpServer` constructor, so there is one place to change it. `package.json` moves
to `1.1.0`. `repository-state.md` and the worked manifest in the Claude Desktop guide move
with it.

**Verified on the wire, not by reading the file.** A real stdio JSON-RPC `initialize` was
sent to the server and the `serverInfo` it answered with inspected:

```
[mcp-rag-server] connected (API: http://127.0.0.1:4000) — tools: whoami, get_project,
  search_knowledge, add_knowledge, upload_file, change_project_title,
  change_project_description, add_member
serverInfo: {"name":"mcp-rag-server","version":"1.1.0"}
```

That is the value a client is told, which is the whole point — the defect was never that
the file said `1.0.0`, it was that the handshake did. Checking `package.json` with `grep`
would have passed before the fix and proved nothing.

The existing surface harness still passes: 65 assertions, 0 failures, and the eight tools
are the eight the documentation lists.

**Not changed:** `mcp-security-scope.md`, which records the drift as it stood when the
permission-scope work landed. Rewriting a record to match a later correction would make it
unreliable as a record of what was known at the time. This chain is where the fix lives,
and the older record points here.

