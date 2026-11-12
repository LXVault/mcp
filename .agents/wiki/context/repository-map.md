---
name: agent-wiki-context-repository-map
description: Orientation for an agent before touching this MCP server. What lives where, how to run and verify a tool, and the gotchas that cost time.
---

# Repository Map

Read this before editing anything in `mcp-rag-mcp-server`. Underlying facts live once in
`wiki/` and are linked rather than repeated.

## What this is

A Model Context Protocol server in TypeScript (strict), compiled by `tsc` to ES modules in
`dist/`, Node 18 or newer. It exposes
eight tools over stdio, each a thin call to the Express backend in
`LXVault/server-expressjs`. What it exposes and why the token matters:
[`../../../wiki/information/overview.md`](../../../wiki/information/overview.md).

## Layout

Four source files, and that is the whole server.

| Path | Holds |
|---|---|
| `src/index.ts` | The executable and the `bin` target. Builds the `McpServer`, calls `registerTools`, connects the stdio transport, and refuses to start unconfigured. Wiring, and nothing else. |
| `src/tools.ts` | The tool surface: every registration, its description, its schema, and the `textResult` / `errorResult` renderers. Exported as `registerTools(server)`, so a check can drive it with a spy and read back what would be registered. |
| `src/apiClient.ts` | One method per backend endpoint, the bearer token, and error normalization. The only module that calls `fetch`. |
| `src/config.ts` | `MCP_API_BASE_URL` and `MCP_API_TOKEN`, plus `assertConfigured`. |

`dist/` is build output and is not committed. Relative imports name the `.js` file a module
compiles to (`./tools.js`), which is what `NodeNext` resolution requires; `tsx` and `tsc`
both resolve that to the `.ts` source.

The split between `index.ts` and `tools.ts` exists so the surface can be asserted on.
`index.ts` calls `main()` at module load, which connects a transport to this process's
stdin and stdout — importing it from a check would hang the check and risk corrupting its
own output. Importing `tools.ts` is inert.

## Entry points

* Process start: `src/index.ts`, compiled to `dist/index.js`.
* The tool surface, for editing and for checking: `src/tools.ts`.
* Backend calls: `src/apiClient.ts`.

## Running and verifying

```
npm install
npm run build
MCP_API_BASE_URL=http://localhost:4000/api MCP_API_TOKEN=mcp_xxx npm start
```

The banner goes to stderr and names the API it reached. Without a token the process exits
with an explanation rather than starting. Full setup, including client configuration:
[`../../../wiki/environments/setup.md`](../../../wiki/environments/setup.md).

**There is no linter, and one check covers the tool surface:**

```
npm test            # tsx .agents/wiki/context/mcp-tools.ts
npm run build       # tsc, zero errors expected
```

`tsx` strips types without checking them, so `npm test` passing does not mean the code
type-checks. Run `npm run build` (or `npm run typecheck`) as well.

It drives the surface twice — once through a spy, to read descriptions as authored and ask
a zod schema what it accepts, and once through a real `McpServer` and a real `Client` over
an in-memory transport, to confirm `registerTool` exists, that the schemas convert, and
what a client actually receives. The second pass is what stops the first from passing
vacuously. See [`mcp-tools.ts`](mcp-tools.ts).

Anything beyond the surface — that a call reaches the backend and comes back — is verified
by running the server against a local backend and driving the tool from an MCP client.
Report that as manual, not as a suite.

## Gotchas

* **Never write to stdout.** It carries the JSON-RPC channel, so a stray `console.log`
  corrupts the protocol and the client disconnects with no useful error. Diagnostics go to
  stderr.
* **`MCP_API_BASE_URL` includes `/api`.** It is `http://localhost:4000/api`, not the bare
  origin. This is the opposite of the web client's `VITE_API_URL`, which is an origin with
  no suffix, and mixing the two up produces a 404 on every call.
* **The token decides the project.** There is no project argument anywhere, on purpose.
  See [`../../rules/repository.md`](../../rules/repository.md) for why adding one would be
  a security regression rather than a feature.
* **Tool descriptions are read by a model, not a person.** Changing backend behavior
  without updating the description leaves the model calling the tool wrongly. They change
  together.
* **Three tools need an OpenRouter key** on the acting user's account: `search_knowledge`,
  `add_knowledge` and `upload_file`. Without one the backend answers `412` and the tool
  surfaces that message.
* **Arguments are snake case on the wire** and renamed at the call site where the backend
  wants camel case, as `content_base64` becomes `contentBase64`.

## Where things get documented

Human documentation goes in `wiki/`, agent knowledge in `.agents/wiki/`, memory in
`.agents/memory/`, and indexes in `.agents/index/`. The placement rules are in
[`../../../AGENTS.md`](../../../AGENTS.md); the shared set is resolved through the
`lxagents-agents-base` connector and is never copied into this repository.
