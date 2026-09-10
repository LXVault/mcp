# Architecture

## Three modules

```
src/index.js       the executable: tool registrations, result rendering, stdio transport
  src/apiClient.js one method per backend endpoint, the bearer token, error normalization
    src/config.js  MCP_API_BASE_URL and MCP_API_TOKEN, plus assertConfigured
```

ES modules, Node 18 or newer, no build step and no transpiler. `src/index.js` carries a
shebang and is the package's `bin` target, so it can be run directly or through `npm start`.

## A tool call, end to end

1. The client sends a JSON-RPC call over stdin.
2. The SDK validates the arguments against the tool's zod schema and rejects a malformed
   call before any code of ours runs.
3. The handler calls exactly one `apiClient` method.
4. `apiClient` issues one `fetch` to the backend with `Authorization: Bearer` and the token.
5. The response is rendered by `textResult` as pretty printed JSON in a single text content
   block, or by `errorResult` as a result with `isError` set and the backend's own message.

A handler never throws. An error becomes a result the assistant can read and act on, which
is what lets it tell the user "you need to add an OpenRouter key" instead of failing
opaquely.

## Where authorization happens

In the backend, entirely.

The acting user, the target project and the caller's role all come from the token. No tool
takes a project id, a user id, or a role. That is a security property rather than a
convenience: the caller on this side is a language model, so an argument is something a
prompt injection can set, while a token is not.

The project management tools say this in their own descriptions, so the model reading them
understands the check is not something it can talk its way past.

## Configuration and startup

`src/config.js` reads two variables at import time and strips a trailing slash from the base
URL. `assertConfigured` runs before the transport connects and throws when `MCP_API_TOKEN`
is missing, so an unconfigured server exits immediately with an explanation rather than
starting and failing on the first tool call.

## The stdout constraint

The transport is stdio: stdout carries JSON-RPC messages and nothing else. Any other write
to stdout corrupts the channel and the client disconnects with no useful error.

Every diagnostic therefore goes to stderr, including the connection banner in `main`, which
names the API base URL it reached and lists the registered tools. That banner is the fastest
way to confirm a client launched the server with the configuration you expected.

## Dependencies

Two: `@modelcontextprotocol/sdk` for the server and the transport, and `zod` for argument
schemas. There is nothing else to keep the surface small and the bundle self contained when
it is packed as a Claude Desktop extension.
