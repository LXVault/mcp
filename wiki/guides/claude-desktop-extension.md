# Packaging as a Claude Desktop Extension

Claude Desktop can install this server as a one click **MCP Bundle** (`.mcpb`) instead of
editing the JSON config by hand. A bundle is a zip of the server code, its `node_modules`,
and a `manifest.json`.

## 1. Install the bundler CLI

```bash
npm install -g @anthropic-ai/mcpb
# or run it ad-hoc with: npx @anthropic-ai/mcpb <command>
```

## 2. Install production dependencies

The bundle must be self contained, so `node_modules` has to be present when you pack. It is
included in the `.mcpb` even though git ignores it:

```bash
npm install --omit=dev
```

## 3. Create a `manifest.json`

Run the interactive generator and answer the prompts:

```bash
mcpb init
```

Then edit the generated file so the server entry point and the user supplied config, the
API URL and the token, are wired up. A working manifest looks like this:

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

`${__dirname}` resolves to the bundle's install directory, and the `${user_config.*}` values
are prompted for in Claude Desktop at install time, so the token is entered in the UI rather
than committed anywhere.

`manifest.json` is not checked into this repository. It is generated when someone packs a
bundle, and the version in it is the package version at that moment.

## 4. Pack the bundle

```bash
mcpb pack
```

This produces `mcp-rag.mcpb` in the repository root, which git ignores. Validate the
manifest first with `mcpb validate manifest.json` if you edited it by hand.

## 5. Install it in Claude Desktop

Settings, then Extensions, then Install Extension. Select the `.mcpb` file and fill in the
**API Base URL** and **API Token** when prompted.

Remember that the base URL includes `/api`. See [../environments/env.md](../environments/env.md).
