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

// get_project — details about the project, including how much of its knowledge
// base the currently selected embedding model can actually search.
server.tool(
  'get_project',
  'Get details about the project this token grants access to: its title, ' +
    'summary, embedding model, and its knowledge-base chunk counts. ' +
    '`chunk_count` is every chunk stored. `searchable_chunk_count` is how many ' +
    "of those are embedded with the project's current model, which is the only " +
    'set search_knowledge can reach. When `chunks_awaiting_embedding` is above ' +
    'zero, the project switched model and those chunks have not been embedded ' +
    'with the new one yet; nothing was lost, and the project owner or an admin ' +
    'can generate the missing embeddings in the web app.',
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

// search_knowledge — semantic search over the project's knowledge base.
server.tool(
  'search_knowledge',
  "Semantic search over the project's knowledge base: ranks chunks by meaning " +
    "using the project's currently selected embedding model. Only chunks " +
    'embedded with that model are searchable, so the response carries a ' +
    '`coverage` block alongside the results. Read it before reporting an empty ' +
    'result: if `chunks_awaiting_embedding` is above zero, the knowledge base ' +
    'is not fully embedded with the model this project now uses, and the right ' +
    'answer is to say so rather than that nothing was found. Requires the user ' +
    'to have set their own OpenRouter API key in the web app (Profile).',
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
    'can be retrieved later with search_knowledge. The chunk is embedded with ' +
    "the project's current model, so the user's OpenRouter API key must be set " +
    'in the web app. The chunk is searchable immediately, whatever coverage the ' +
    'rest of the knowledge base has.',
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

// upload_file — ingest a knowledge file into the project (owner/admin only).
server.tool(
  'upload_file',
  "Upload a file into the project's knowledge base. The file is split into " +
    "chunks, embedded with the project's model and stored for search_knowledge. " +
    'Allowed types: .md, .txt, .pdf. Send text files (.md/.txt) as `content`; ' +
    'send PDFs as base64 in `content_base64`. The backend enforces that the ' +
    "token's user is the project owner or an admin — this cannot be bypassed " +
    'via prompt injection.',
  {
    filename: z
      .string()
      .min(1)
      .describe('File name including extension, e.g. "guide.md" (drives the type check).'),
    content: z
      .string()
      .optional()
      .describe('UTF-8 text contents, for .md / .txt files.'),
    content_base64: z
      .string()
      .optional()
      .describe('Base64-encoded bytes, required for .pdf files.'),
  },
  async ({ filename, content, content_base64: contentBase64 }) => {
    try {
      const data = await apiClient.uploadFile({ filename, content, contentBase64 });
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// create_new_project — create a project owned by the token's user.
server.tool(
  'create_new_project',
  'Create a new project. The owner is taken from the API token (the backend ' +
    'resolves the user id from the token), so it cannot be set via arguments.',
  {
    title: z.string().min(1).describe('Title of the new project.'),
    summary: z.string().optional().describe('Optional description of the project.'),
  },
  async ({ title, summary }) => {
    try {
      const data = await apiClient.createProject(title, summary);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// change_project_title — rename the token's project (owner/admin only).
server.tool(
  'change_project_title',
  "Change the title of the token's project. The backend enforces that the " +
    "token's user is the project owner or an admin — this cannot be bypassed " +
    'via prompt injection.',
  {
    title: z.string().min(1).describe('The new project title.'),
  },
  async ({ title }) => {
    try {
      const data = await apiClient.changeProjectTitle(title);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// change_project_description — edit the token's project description (owner/admin).
server.tool(
  'change_project_description',
  "Change the description of the token's project. The backend enforces that " +
    "the token's user is the project owner or an admin.",
  {
    description: z.string().describe('The new project description (may be empty).'),
  },
  async ({ description }) => {
    try {
      const data = await apiClient.changeProjectDescription(description);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

// add_member — add a member to the token's project (owner/admin only).
server.tool(
  'add_member',
  "Add a member to the token's project by username or email. The backend " +
    "enforces that the token's user is the project owner or an admin.",
  {
    identifier: z.string().min(1).describe('Username or email of the user to add.'),
    role: z
      .enum(['editor', 'viewer', 'admin'])
      .optional()
      .describe('Role to grant (default editor).'),
  },
  async ({ identifier, role }) => {
    try {
      const data = await apiClient.addMember(identifier, role);
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
    `[mcp-rag-server] connected (API: ${config.apiBaseUrl}) — tools: whoami, get_project, search_knowledge, add_knowledge, upload_file, create_new_project, change_project_title, change_project_description, add_member`
  );
}

main().catch((err) => {
  console.error('[mcp-rag-server] fatal:', err.message);
  process.exit(1);
});
