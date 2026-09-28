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
| 3 | Every dependency at its current release | SDK 1.30.1, zod 4, six audit fixes, `server.tool` → `registerTool` | mcp | `build/dependency-upgrade` | |

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

`@modelcontextprotocol/sdk` 1.29.0 → 1.30.1, `zod` 3.25.76 → 4.6.5, and
`npm audit fix` for six inherited vulnerabilities, two of them high.

**The manifest was the reason nothing had moved.** `package.json` declared
`^1.0.4` and `^3.23.8` — the floors from the first release — so `npm install` was
free to install 1.29.0 and 3.25.76 and called the tree up to date. Nothing had
been left behind deliberately; the ranges simply never moved.

**Six vulnerabilities, and the honest reading of them.** `fast-uri` (high, six
advisories — host confusion and SSRF in URL parsing) and `ip-address` (high, three
— SSRF and trust-boundary bypass), plus `qs`, `body-parser`, `hono` and
`@hono/node-server` at moderate or low. `npm audit fix` takes all six to fixed
versions, and every one sits inside a range the SDK already declared — the clean
tree did not wait on the upgrade, and is not lost if the upgrade is reverted.

None of the six was reachable from this server. They arrive through SDK
subsystems this package never instantiates: `ip-address` under
`express-rate-limit`, `fast-uri` under `ajv`, `qs` and `body-parser` under
`express`, `hono` and `@hono/node-server` under the SDK's HTTP and OAuth
transports. This package builds one `McpServer` and connects one
`StdioServerTransport`, with no auth provider and no HTTP listener. The tree is
clean now, and the honest description of that is a clean tree rather than a
server that was exploitable — which is the same discipline as the injection-safety
claims removed in task 2, in the other direction.

**`server.tool` was already deprecated, not newly so.** The plan said 1.30.1
deprecates it. It does, and so did 1.29.0: `@deprecated Use registerTool instead`
sits on all five `tool()` overloads in the 1.29.0 typings at
`server/mcp.d.ts:110-146`. The migration is overdue rather than newly required, and
the record says so rather than crediting a release that was not the cause.

**Two commits, deliberately.** The dependency and audit commit changes the manifest
and the lockfile and nothing else; `server.tool` is deprecated rather than removed,
so the surface is untouched and the harness still passed 42/42 off the same path.
That is the useful property: it proves the bump is behaviour-neutral *before* the
migration is layered on, and it means a revert of the migration does not take the
clean tree with it.

**The harness had a gap this task would have walked straight into.** It drove a
spy, and a spy accepts whatever object it is handed — it would have gone on
reporting eight correctly-described tools whether or not `registerTool` was a
method the SDK has, whether or not the config key was spelled right, and whether
or not zod 4 schemas converted at all. A migration is precisely the change that
turns that from theoretical into likely.

So the check now runs the surface twice. Through the spy, as before, for what a
description says and what a zod schema accepts. And through a real `McpServer`
with a real `Client` across `InMemoryTransport.createLinkedPair()`, asking the
server what it offers: eight tools, the same eight names in the same order, every
description delivered intact, `add_member`'s role enum arriving over the wire as
exactly `["editor","viewer"]`, and the zod 4 constraints that a caller relies on
still present — `search_knowledge.limit` an optional integer bounded 1 to 25,
`upload_file` requiring only `filename` and still offering snake-case
`content_base64`, the two no-argument tools taking none.

**65 assertions, both paths negative-tested.** Putting `admin` back in the enum
failed three checks — the spy assertion and both wire assertions independently —
and putting `whoami` back on `server.tool()` failed the deprecated-form check and
named the tool. The first attempt at the enum negative test did not apply: the
replacement pattern assumed `z.enum(` on one line, and the file has `z` at the end
of the line and `.enum(` at the start of the next. It reported 65/0 and proved
nothing, which is the failure mode worth remembering — a negative test that does
not apply is indistinguishable from a check that cannot fail.

**Documentation corrected in the same commit**, because the previous task moved
the surface and left the map describing where it used to live: `repository-map.md`
said nine tools over three source files and put every registration in
`src/index.js`; `architecture.md` had the same three-module split. Neither is an
instruction file, so both are documentation and are fixed here.

**Not edited:** `wiki/logs/1/0/0/CHANGELOG.md` and `wiki/logs/1/1/0/CHANGELOG.md`
both say nine tools, and `.agents/index/logs-index.md` repeats it. They were true
at 1.0.0. A dated log records what happened.

**No version bump.** `package.json` reads `1.0.0` and `src/index.js` names
`1.0.0` separately, while `wiki/logs/1/1/0/CHANGELOG.md` exists. Creating a
`wiki/logs/{M}/{m}/{p}/` directory is a version claim, and this record is not the
place to make one.

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

Task 1 is **server-expressjs#14** and task 2 is **mcp#8**; both are open and mergeable,
and neither is merged. Task 3 is committed on `build/dependency-upgrade`, which stacks on
`fix/mcp-permission-scope`, so it merges after #8 and #8 merges after #14.

**Two stale claims in `.agents/rules/repository.md` are corrected.** It said every tool
lives in `src/index.js`, which task 2 made false, and that there is no test suite, which
task 2 also made false. The discovery protocol says an agent does not edit an instruction
file on its own initiative, so both were reported; the user selected both, and the file now
points at `src/tools.js` and names the one check that exists and says plainly what it does
not cover.
