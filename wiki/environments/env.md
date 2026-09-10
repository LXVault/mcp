# Environment Variables

Two variables, read once at import time in `src/config.js`.

| Variable | Default | Purpose |
|---|---|---|
| `MCP_API_BASE_URL` | `http://localhost:4000/api` | Base URL of the Express backend, **including the `/api` path**. A trailing slash is stripped. |
| `MCP_API_TOKEN` | none, required | The per project token from the web app's Access Tokens page. |

See `.env.example`.

## The base URL includes `/api`

`http://localhost:4000/api` is correct; the bare origin is not. This is the opposite of the
web client's `VITE_API_URL`, which is an origin with no suffix because that client appends
the path itself. Mixing the two up produces a 404 on every tool call, with a message from
the backend's 404 handler rather than anything that names the cause.

## A missing token stops the server

`assertConfigured` runs before the transport connects, so without `MCP_API_TOKEN` the
process exits immediately with an explanation instead of starting and failing on the first
tool call. In an MCP client that shows up as a server that will not start.

## The token is a secret

It grants an assistant the holder's access to one project. Pass it through the client's own
configuration, or through the Claude Desktop extension prompt, which marks it sensitive.
Never commit it, never paste it into a repository, and never log it. Nothing in this
repository writes it to output.

To revoke one, delete it on the web app's Access Tokens page. A user holds at most one
active token per project, so generating a new one replaces the old.
