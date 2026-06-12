#!/usr/bin/env node
// MCP server for the MCP RAG knowledge base.
//
// It exposes a small set of tools backed by the Express API. Authentication is
// a per-project token (MCP_API_TOKEN); the backend records every tool call in
// its audit log, so actions taken through this server are always traceable to
// the user who generated the token.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { config, assertConfigured } from './config.js';
import { apiClient } from './apiClient.js';

// Render any value as a single MCP text-content result.
function textResult(value) {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: 'text', text }] };
}

function errorResult(err) {
  return {
    isError: true,
    content: [{ type: 'text', text: `Error: ${err.message || String(err)}` }],
  };
}

const server = new McpServer({
  name: 'mcp-rag-server',
  version: '1.0.0',
});

// whoami — report the user and project this token is bound to.
server.tool(
  'whoami',
  'Identify the user and project that the current API token is bound to. ' +
    'Use this to confirm whose context actions will be attributed to.',
  {},
  async () => {
    try {
      const data = await apiClient.me();
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// get_project — details about the project (title, summary, chunk count).
server.tool(
  'get_project',
  'Get details about the project this token grants access to, including its ' +
    'title, summary and the number of knowledge-base chunks available.',
  {},
  async () => {
    try {
      const data = await apiClient.getProject();
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// search_knowledge — text search over the project's knowledge base.
server.tool(
  'search_knowledge',
  "Search the project's knowledge base for chunks matching a query. " +
    'Returns the most relevant text chunks.',
  {
    query: z.string().min(1).describe('The text to search for.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe('Maximum number of chunks to return (default 5).'),
  },
  async ({ query, limit }) => {
    try {
      const data = await apiClient.search(query, limit);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// add_knowledge — append a new chunk to the project's knowledge base.
server.tool(
  'add_knowledge',
  "Save a piece of text as a new chunk in the project's knowledge base so it " +
    'can be retrieved later with search_knowledge.',
  {
    content: z.string().min(1).describe('The text to store as a knowledge chunk.'),
  },
  async ({ content }) => {
    try {
      const data = await apiClient.addKnowledge(content);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

async function main() {
  assertConfigured();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we never corrupt the stdio JSON-RPC channel on stdout.
  console.error(
    `[mcp-rag-server] connected (API: ${config.apiBaseUrl}) — tools: whoami, get_project, search_knowledge, add_knowledge`
  );
}

main().catch((err) => {
  console.error('[mcp-rag-server] fatal:', err.message);
  process.exit(1);
});
