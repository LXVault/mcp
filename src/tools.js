// The tool surface, and nothing else.
//
// Split out from `index.js` so it can be imported and asserted on. The entry point calls
// main() at module load, which connects a stdio transport to this process's stdin and
// stdout — importing it from a check would hang the check and risk corrupting its own
// output. Here the surface is a function of a server object, so a check can hand it a spy
// and read back exactly what would be registered.
//
// The descriptions below are functional code, not documentation: a model chooses a tool by
// reading them. They state the scope the backend enforces — and no more, because an
// overstated claim here is one a reader relies on.

import { z } from 'zod';

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

/** The tools, in the order they are registered. Also printed on connect. */
export const TOOL_NAMES = [
  'whoami',
  'get_project',
  'search_knowledge',
  'add_knowledge',
  'upload_file',
  'change_project_title',
  'change_project_description',
  'add_member',
];

/**
 * Register every tool this server exposes.
 *
 * @param {{ tool: Function, registerTool?: Function }} server an MCP server, or a spy
 *   recording whichever of the two registration methods is called
 * @returns {string[]} the tool names, in registration order
 */
export function registerTools(server) {
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
      'rest of the knowledge base has. Requires write access: the owner, or an ' +
      'editor or admin member.',
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

  // upload_file — ingest a knowledge file into the project (owner/editor/admin).
  server.tool(
    'upload_file',
    "Upload a file into the project's knowledge base. The file is split into " +
      "chunks, embedded with the project's model and stored for search_knowledge. " +
      'Allowed types: .md, .txt, .pdf. Send text files (.md/.txt) as `content`; ' +
      'send PDFs as base64 in `content_base64`. Requires write access: the owner, ' +
      'or an editor or admin member.',
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

  // change_project_title — rename the token's project (owner/editor/admin).
  server.tool(
    'change_project_title',
    "Change the title of the token's project. Requires write access: the owner, " +
      'or an editor or admin member.',
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

  // change_project_description — edit the token's project description.
  server.tool(
    'change_project_description',
    "Change the description of the token's project. Requires write access: the " +
      'owner, or an editor or admin member.',
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

  // add_member — add a member to the token's project (owner/admin).
  //
  // `admin` is deliberately absent from the enum. Granting it is the one action whose
  // worst outcome is durable and quiet: an admin can hand the role on. The backend
  // enforces owner-or-admin for this tool, so an `admin` in the enum was a way for an
  // assistant to escalate a project, reachable from any document in the knowledge base
  // via indirect prompt injection. Owner and admin grant `admin` from the web app,
  // where a person sees who is being given what.
  server.tool(
    'add_member',
    "Add a member to the token's project by username or email. The backend " +
      "enforces that the token's user is the project owner or an admin. " +
      'The `admin` role cannot be granted here — do it in the web app.',
    {
      identifier: z.string().min(1).describe('Username or email of the user to add.'),
      role: z
        .enum(['editor', 'viewer'])
        .optional()
        .describe('Role to grant (default editor). `admin` is granted in the web app, not here.'),
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

  return TOOL_NAMES;
}
