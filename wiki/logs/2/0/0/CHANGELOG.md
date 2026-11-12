# 2.0.0

Released 2026-11-12.

The server is now TypeScript, compiled to `dist/`, and the executable moved from
`src/index.js` to `dist/index.js`. The eight tools are unchanged.

**What you have to do:** run `npm install && npm run build`, then re-point any MCP client
config or `.mcpb` manifest from `src/index.js` to `dist/index.js`. A config that still names
`src/index.js` will not start, because that file no longer exists.

## Added

* `tsconfig.json`: strict, `ES2022`, `NodeNext`, compiling `src/` to `dist/`.
* Scripts: `build` (`tsc`), `typecheck`, `dev` (`tsx src/index.ts`), and `test`, which runs
  the tool surface check through `tsx`.
* Types for the config, every API client method, the tool registrar
  (`Pick<McpServer, 'registerTool'>`) and the tool results (`CallToolResult`).
* devDependencies: `typescript`, `@types/node`, `tsx`. The runtime dependencies are still
  the SDK and zod.

## Changed

* Every source file is `.ts`. `main`, `bin` and `start` point at `dist/index.js`.
* `@modelcontextprotocol/sdk` 1.32.2 and `zod` 4.6.7.
* Tools are registered with `registerTool` rather than the deprecated `tool()` form. The
  arguments and descriptions a client receives are the same.
* The tool descriptions state the scope the backend enforces: the write tools need write
  access (the owner, or an editor or admin member), and no description claims a check
  cannot be bypassed by prompt injection.
* The setup, architecture, environment and Claude Desktop extension pages describe the
  build step and the `dist/` entry point.

## Removed

* `src/*.js`. The executable is `dist/index.js`.
* `create_new_project`. A project token is scoped to one project, and the backend refuses
  project creation through it. Create projects in the web app.
* `admin` from the `add_member` role enum. Grant it in the web app.

## Fixed

* The version reported in the MCP handshake is read from `package.json`, so it can no
  longer fall behind the package.

## Security

* `npm audit` reports 0 vulnerabilities. The dependency upgrade cleared seven transitive
  findings under the SDK's HTTP stack (`proxy-addr`, `body-parser`, `hono`,
  `@hono/node-server`, `fast-uri`, `ip-address`, `qs`), one of them critical.
* Removing `admin` from `add_member` closes a path where a document in the knowledge base
  could talk an assistant into granting a durable admin role.
