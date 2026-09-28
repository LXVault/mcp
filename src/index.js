#!/usr/bin/env node
// MCP server for the MCP RAG knowledge base.
//
// It exposes a small set of tools backed by the Express API. Authentication is
// a per-project token (MCP_API_TOKEN); the backend records every tool call in
// its audit log, so actions taken through this server are always traceable to
// the user who generated the token.
//
// What a token does and does not buy, stated once so that no tool description has
// to overstate it:
//
//   A token names ONE user and ONE project. Both come from the token, never from
//   a tool argument, so injected content cannot act as a different user or reach
//   a different project.
//
//   It does NOT make these tools injection-proof. A prompt-injected call can
//   still invoke any tool that the token's user is authorized to invoke — which
//   is the whole reason `add_member` does not offer `admin`, and the reason a
//   token should be minted for a project whose contents you would still read if
//   an attacker could write them.
//
// The tools themselves live in `tools.js`, so this file is wiring and nothing
// else, and the surface can be asserted on without connecting a transport.

import { createRequire } from 'node:module';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { config, assertConfigured } from './config.js';
import { registerTools, TOOL_NAMES } from './tools.js';

// The version is read, not repeated. It used to be a literal here as well as in
// package.json, and the two drifted: both said 1.0.0 while 1.1.0 had shipped.
// The value a client sees in the handshake now has exactly one place it can
// come from.
//
// `createRequire` rather than `import ... with { type: 'json' }`, because that
// spelling needs Node 20.10+ and the older `assert { type: 'json' }` was
// removed in Node 22. Neither loads across the `>=18` this package declares;
// this does.
const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const server = new McpServer({
  name: 'mcp-rag-server',
  version,
});

registerTools(server);

async function main() {
  assertConfigured();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we never corrupt the stdio JSON-RPC channel on stdout.
  console.error(
    `[mcp-rag-server] connected (API: ${config.apiBaseUrl}) — tools: ${TOOL_NAMES.join(', ')}`
  );
}

main().catch((err) => {
  console.error('[mcp-rag-server] fatal:', err.message);
  process.exit(1);
});
