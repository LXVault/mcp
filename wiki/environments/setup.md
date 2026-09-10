# Setup

## Requirements

* Node.js 18 or newer.
* A running MCP RAG backend, and a per project token generated from the web app's Access
  Tokens page.

## Install and run

```bash
npm install
```

```bash
MCP_API_BASE_URL=http://localhost:4000/api \
MCP_API_TOKEN=mcp_xxxxxxxx \
npm start
```

The server speaks JSON-RPC over stdio, so running it in a terminal like this is only useful
as a configuration check: it prints a banner to stderr naming the API it reached and the
tools it registered, then waits for a client on stdin.

Without `MCP_API_TOKEN` it exits immediately with an explanation rather than starting.

Both variables and what a wrong value does: [env.md](env.md).

## Client configuration

Add it to your MCP client config. For Claude Desktop:

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

The path must be absolute. `src/index.js` carries a shebang and is the package's `bin`
entry, so an installed copy can also be launched as `mcp-rag-server`.

For a one click install instead of editing JSON by hand, see
[../guides/claude-desktop-extension.md](../guides/claude-desktop-extension.md).

## Verify

Call `whoami` from the client. It returns the user and project the token is bound to and
needs no OpenRouter key, which makes it the cheapest way to confirm the whole path works:
the client launched the server, the server reached the backend, and the token is valid.

If it fails, read the message. `Unable to reach the API` points at `MCP_API_BASE_URL` or a
backend that is down; anything about a token points at `MCP_API_TOKEN`.

## Testing

There is no test suite and no linter in this repository. Verification is running the server
against a backend and driving the tool from a client.
