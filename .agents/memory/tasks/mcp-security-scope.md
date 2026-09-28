---
name: memory-tasks-mcp-security-scope
description: Record of bringing this repository's tool surface and documentation onto the permission scope the backend defines, and of closing the admin-grant escalation path.
---

# Task: MCP permission scope

**Goal.** The backend moved. `server-expressjs` 2.0.0 defined the role hierarchy once, in
`src/utils/roles.js`: `viewer` < `editor` < `admin`, with `canWrite` (the owner, or an
editor or admin) and `canAdminister` (the owner, or an admin) as the only two authority
questions. Every description in this repository described the old world, and five of them
described a security property that does not exist.

**Objective.** What a model reads when it chooses a tool is the same as what the backend
enforces — and no stronger.

## Tasks

| # | Title | Scope | Repository | Branch | PR |
|---|---|---|---|---|---|
| 1 | A project token cannot create a project | `createProject`, three stale JSDoc comments | server-expressjs | `fix/mcp-project-creation-scope` | |
| 2 | The MCP tool surface matches the real scope | `src/index.js`, `src/apiClient.js`, six documents | mcp | `fix/mcp-permission-scope` | |
| 3 | Every dependency at its current release | SDK 1.30.1, zod 4, `server.tool` → `registerTool` | mcp | `build/dependency-upgrade` | |

Task 1 is merge order 1 of 3 and lands first. Task 2 removes the `create_new_project` tool
because task 1 makes its endpoint return 403 — the two must ship together, or a user briefly
holds a tool that always fails. Task 3 is merge order 3 of 3 and stacks on task 2.

### Task 2 — fix/mcp-permission-scope

**The escalation path, closed.** `add_member`'s `role` enum was `['editor', 'viewer',
'admin']`, and `admin` is the one grant whose worst outcome is durable: an admin can hand
the role on. The path to it is indirect — a document in the knowledge base, no network
position, no credential, no user interaction beyond the owner searching their own base —
and the tool description told the model the operation was injection-proof, which lowers
exactly the resistance that would have stopped it. `admin` is out of the enum. Owner and
admin grant it from the web app, where a person sees who is being given what.

**Five false claims, replaced with the narrow truth.** `src/index.js`, `README.md`,
`wiki/information/overview.md`, `wiki/reference/tools.md` and `.agents/rules/repository.md`
each claimed a prompt injected call "cannot escalate privileges" or that a check "cannot be
bypassed via prompt injection". What the token actually fixes is *who* is acting and *which
project* is in reach. It does not decide whether that user was trying, and a prompt
injected call can still invoke any tool the token's user is authorized to invoke.

The replacement is not a weaker sentence, it is a true one, and it is more useful: it tells
a reader to weigh a project's contents before minting a token for it, which no amount of
server-side checking can do for them.

**Three scope claims that had gone stale.** `upload_file`, `change_project_title` and
`change_project_description` were all documented "owner/admin only". 2.0.0 moved them to
`assertProjectWrite`, so an editor can now use them. `add_knowledge` gained the scope it
never had — it was the one write path with no authorization call at all, and is now
write-gated, with the check ahead of the embedding call so a read-only token cannot spend
the owner's OpenRouter credits.

**Project creation removed, and the tool with it.** Task 1 refuses `POST /api/mcp/projects`
outright: a project token is minted for one project, and creating one is not work scoped to
that project, so no role answers the question correctly. `create_new_project` and
`apiClient.createProject` are both gone, the stderr tool list is down to eight, and
`README.md`, `overview.md` and `tools.md` follow. Leaving the client method for a dead
endpoint would be a trap for the next reader.

**`wiki/logs/1/0/0/CHANGELOG.md` is deliberately not edited.** It lists
`create_new_project` in the 1.0.0 tool surface, and it did ship in 1.0.0. A dated log
records what happened, and rewriting one to match today's code is a false record.

**Verified** by `.agents/wiki/context/mcp-tools.js`, which asserts on the registered tool
surface rather than on the source text — eight tool names exactly, `add_member`'s enum
being exactly `['editor', 'viewer']`, and no description anywhere containing "escalate
privileges", "cannot be bypassed" or "owner/admin only". A grep over the source would have
been the cheaper check and would have proved nothing, because it cannot tell a registered
tool from a comment about one.

### Task 3 — build/dependency-upgrade

`@modelcontextprotocol/sdk` 1.29.0 → 1.30.1, `zod` 3.25.76 → 4.6.5. SDK 1.30.1 deprecates
`server.tool()` on every overload in favour of `server.registerTool(name, { description,
inputSchema }, cb)`; the four-argument form becomes a config object. zod 4 is supported —
the SDK's peer range is `^3.25 || ^4.0` and it ships a `zod-compat` module, and the
schemas in use (`z.string().min`, `z.number().int().min().max().optional`, `z.enum`) are
unchanged between the two majors.

`src/index.js` calls `main()` at module load, so the tool surface cannot be imported and
asserted on. Task 3 splits the registrations into `src/tools.js` exporting
`registerTools(server)`, leaving `src/index.js` as wiring, and the harness drives that.
The extraction and the `registerTool` rewrite touch the same nine call sites, so doing
them together costs nothing extra.

## Decisions

* **Correct the rule file, and say why it was wrong.** `.agents/rules/repository.md` carried
  the same false claim as the docs. The discovery protocol says an agent does not edit an
  instruction file itself; the user selected this one explicitly, and the correction names
  the claim so a future reader can see it was removed on purpose rather than never noticed.
* **Overstatement is worse than silence, and that is now a rule.** "Never describe a tool as
  injection-proof" is written into `repository.md`, because the failure mode here was five
  confident sentences that a reader would rely on.
* **Shrink the surface where wording cannot help.** `admin` out of the enum and project
  creation off the tools are both enforced. No description was asked to carry a load it
  cannot carry.
* **No version bump.** `package.json` reads `1.0.0` while `wiki/logs/1/1/0/CHANGELOG.md`
  exists — the same inconsistency `server-expressjs` had, where git history showed the
  manifest simply never moved. Creating a `wiki/logs/{M}/{m}/{p}/` directory is a version
  claim, and this task record is not the place to make one.

## Status

Tasks 1 and 2 are committed on their branches. Task 3 is not started. No pull request has
been opened and nothing has been merged — both gates are separate and closed.
