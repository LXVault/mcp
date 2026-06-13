# MCP RAG — MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes
the MCP RAG knowledge base to MCP-compatible clients (Claude Desktop, IDEs, etc.).

It authenticates to the Express backend with a **per-project access token**. Each
user can hold at most one token per project, and the backend records every tool
call in its audit log — so any action taken through this server is always
traceable back to the user who generated the token.

## Tools

| Tool | Description |
| --- | --- |
| `whoami` | Identify the user and project the current token is bound to. |
| `get_project` | Project details: title, summary, and knowledge-base chunk count. |
| `search_knowledge` | Semantic search over the project's knowledge base (`query`, optional `limit`). |
| `add_knowledge` | Save text as a new chunk in the project's knowledge base (`content`). |
| `upload_file` | Upload a `.md`/`.txt`/`.pdf` file into the knowledge base (`filename` + `content` text, or `content_base64` for PDFs). It is chunked and embedded. Owner/admin only. |
| `create_new_project` | Create a project owned by the token's user (`title`, optional `summary`). |
| `change_project_title` | Rename the token's project (`title`). Owner/admin only. |
| `change_project_description` | Edit the token's project description (`description`). Owner/admin only. |
| `add_member` | Add a member to the token's project (`identifier`, optional `role`). Owner/admin only. |

> **Authorization & prompt-injection safety:** the project-management tools never
> trust the caller's claimed identity or target. The backend resolves the acting
> user and project **from the API token** and enforces owner/admin server-side, so
> a prompt-injected tool call cannot escalate privileges or act on another project.

## Semantic search prerequisites

`search_knowledge`, `add_knowledge` and `upload_file` use **vector embeddings**
via OpenRouter, so before they work the acting user must:

1. **Add their own OpenRouter API key** in the web app (**Profile → OpenRouter
   API key**). Each user uses their own key; it is encrypted at rest and used
   only for that user's queries. (If an owner wants to sponsor cost, they hand
   out a limited OpenRouter key for members to paste as their personal key.)
2. Optionally have the project owner/admin pick the **embedding model** for the
   project (**Members → Embedding model**; default `openai/text-embedding-3-small`).

If the user has no key set, these tools return a clear error telling them to add
one. `whoami` and `get_project` work without a key.

## Setup

```bash
npm install
```

Generate a token from the web app's **Access Tokens** page, then run the server
with it in the environment:

```bash
MCP_API_BASE_URL=http://localhost:4000/api \
MCP_API_TOKEN=mcp_xxxxxxxx \
npm start
```

The server speaks JSON-RPC over stdio.

## Client configuration

Add it to your MCP client config, e.g. for Claude Desktop:

```json
{
  "mcpServers": {
    "mcp-rag": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/src/index.js"],
      "env": {
        "MCP_API_BASE_URL": "http://localhost:4000/api",
        "MCP_API_TOKEN": "mcp_xxxxxxxx"
      }
    }
  }
}
```

## Packaging as a Claude Desktop extension (`.mcpb`)

Claude Desktop can install this server as a one-click **MCP Bundle** (`.mcpb`)
instead of editing the JSON config by hand. A bundle is a zip of the server
code, its `node_modules`, and a `manifest.json`.

### 1. Install the bundler CLI

```bash
npm install -g @anthropic-ai/mcpb
# or run it ad-hoc with: npx @anthropic-ai/mcpb <command>
```

### 2. Install production dependencies

The bundle must be self-contained, so `node_modules` has to be present when you
pack (it is included in the `.mcpb`, even though git ignores it):

```bash
npm install --omit=dev
```

### 3. Create a `manifest.json`

Run the interactive generator and answer the prompts:

```bash
mcpb init
```

Then edit the generated file so the server entry point and user-supplied
config (API URL + token) are wired up. A working manifest looks like this:

```json
{
  "manifest_version": "0.2",
  "name": "mcp-rag",
  "display_name": "MCP RAG Knowledge Base",
  "version": "1.0.0",
  "description": "Per-project, traceable access to the MCP RAG knowledge base.",
  "author": { "name": "LXVault" },
  "license": "MIT",
  "server": {
    "type": "node",
    "entry_point": "src/index.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/src/index.js"],
      "env": {
        "MCP_API_BASE_URL": "${user_config.api_base_url}",
        "MCP_API_TOKEN": "${user_config.api_token}"
      }
    }
  },
  "user_config": {
    "api_base_url": {
      "type": "string",
      "title": "API Base URL",
      "description": "Base URL of the Express backend, e.g. https://<host>-4000.app.github.dev/api",
      "default": "http://localhost:4000/api",
      "required": true
    },
    "api_token": {
      "type": "string",
      "title": "API Token",
      "description": "Per-project token from the web app's Access Tokens page.",
      "sensitive": true,
      "required": true
    }
  }
}
```

`${__dirname}` resolves to the bundle's install directory, and the
`${user_config.*}` values are prompted for in Claude Desktop at install time —
so the token is entered in the UI rather than committed anywhere.

### 4. Pack the bundle

```bash
mcpb pack
```

This produces `mcp-rag.mcpb` in the repo root (git-ignored). Optionally validate
the manifest first with `mcpb validate manifest.json`.

### 5. Install it in Claude Desktop

**Settings → Extensions → Install Extension**, then select the `.mcpb` file and
fill in the **API Base URL** and **API Token** when prompted.

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `MCP_API_BASE_URL` | `http://localhost:4000/api` | Base URL of the Express backend. |
| `MCP_API_TOKEN` | _(required)_ | Per-project token from the web app. |

See `.env.example`.
