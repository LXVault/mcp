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
| `search_knowledge` | Search the project's knowledge base (`query`, optional `limit`). |

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

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `MCP_API_BASE_URL` | `http://localhost:4000/api` | Base URL of the Express backend. |
| `MCP_API_TOKEN` | _(required)_ | Per-project token from the web app. |

See `.env.example`.
