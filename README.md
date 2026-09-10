# mcp-rag-mcp-server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the MCP RAG
knowledge base to MCP compatible clients such as Claude Desktop and IDE assistants.

It is a thin adapter over the Express backend in
[`LXVault/server-expressjs`](https://github.com/LXVault/server-expressjs). It authenticates
with a **per project access token** generated in the
[web app](https://github.com/LXVault/client-reactjs), and the backend records every call in
its audit log, so any action taken through this server is traceable to the user who
generated that token.

## Tools

Nine, in three groups:

* **Identity**: `whoami`, `get_project`.
* **Knowledge**: `search_knowledge`, `add_knowledge`, `upload_file`.
* **Project management**: `create_new_project`, `change_project_title`,
  `change_project_description`, `add_member`.

Arguments, return values and the embedding prerequisites:
[Tools reference](wiki/reference/tools.md).

The project management tools never trust a claimed identity or target. The backend resolves
the acting user and the project from the token and enforces owner and admin server side, so
a prompt injected tool call cannot escalate privileges or act on another project.

## Quick start

```bash
npm install

MCP_API_BASE_URL=http://localhost:4000/api \
MCP_API_TOKEN=mcp_xxxxxxxx \
npm start
```

Generate the token from the web app's Access Tokens page. Note that the base URL includes
`/api`. The server speaks JSON-RPC over stdio, so it is normally launched by an MCP client
rather than by hand.

## Documentation

* [Overview](wiki/information/overview.md), what the server exposes and why the token
  matters.
* [Tools reference](wiki/reference/tools.md), every tool and its arguments.
* [Setup](wiki/environments/setup.md), installing and wiring it into an MCP client.
* [Environment variables](wiki/environments/env.md), both values and what a wrong one does.
* [Claude Desktop extension](wiki/guides/claude-desktop-extension.md), packaging a one
  click bundle.

The full documentation map is
[`.agents/index/project-wiki-index.md`](.agents/index/project-wiki-index.md).

## Working with agents

Agent instructions start at [`AGENTS.md`](AGENTS.md). Shared conventions come from the
LXAgents instruction set served by the `lxagents-agents-base` MCP connector; this
repository carries only what is its own.

## License

MIT. See [`LICENSE`](LICENSE).
