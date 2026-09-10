---
name: repository-rules
description: Rules specific to the mcp-rag-mcp-server: the thin tool boundary, how a tool description is written, the stdout constraint, and the trust model.
---

# Repository Rules

Rules that are true for this MCP server and nowhere else. Conventions true for more than
this repository live in the shared set and are never restated here.

## Mode and shared set

This repository is a **Mode B consumer**. The shared instruction set is resolved through
the `lxagents-agents-base` MCP connector, as declared in the bootstrap block of
[`../../AGENTS.md`](../../AGENTS.md). Nothing from that set is copied into this repository.

## Tools stay thin

A tool validates its arguments with zod, calls one method on `apiClient`, and renders the
result. That is the whole shape, and every tool in `src/index.js` follows it.

* **No business logic here.** No filtering, no merging of two calls, no caching, no
  retries, no derived fields. If a tool needs something the API does not return, the change
  belongs in the backend, not in a transformation on this side.
* **One tool, one endpoint.** A new tool gets a method on `apiClient` named for what it
  does, and calls it once.
* Results go through `textResult`, failures through `errorResult`. A tool never throws: an
  error is a result with `isError` set, so the client sees the backend's own message.
* Tool arguments are snake case, matching MCP convention, and are renamed at the call site
  where the backend expects camel case. `upload_file` and its `content_base64` argument are
  the worked example.

## Authorization lives in the backend

The acting user and the target project come from `MCP_API_TOKEN`. Nothing in this
repository decides who the caller is or what they may do.

**This is a security property, not a division of labour.** The caller here is a language
model, so any identity, project, or role carried in a tool argument is something a prompt
injection can set. The backend resolves all three from the token and enforces owner and
admin server side.

* Never add a tool argument naming a project, a user id, or a role to act as.
* Never add a client side permission check. A check here would be advisory at best and
  misleading at worst, since it suggests the guarantee lives on this side.
* Say so in the tool description, as the existing project management tools do. The model
  reading it should understand it cannot talk its way past the check.

## Tool descriptions are the interface

A model chooses a tool by reading its description, so the description is functional code,
not documentation.

* Say what the tool does, what it acts on, and what it needs. `search_knowledge` names the
  project's embedding model and the OpenRouter key requirement because a model that does
  not know those will call it and fail.
* Name the precondition that produces the most common error, so the model can avoid it or
  explain it.
* Every argument gets a `.describe()` with a concrete example where the format is not
  obvious.
* A description that goes stale is a bug of the same kind as a wrong endpoint. When the
  backend's behavior changes, the description changes in the same commit.

## stdout belongs to the transport

The server speaks JSON-RPC over stdio. **Anything written to stdout that is not a protocol
message corrupts the channel and breaks the client.** Every diagnostic goes to stderr with
`console.error`, including the connection banner in `main()`. Never add a `console.log`.

## What must not be introduced

* State of any kind: a cache, a database, a file written beside the source.
* A second transport or an HTTP listener. This server is stdio only.
* A hardcoded backend URL or a token literal, in code, in a default, or in an example.
* A dependency that is not needed to speak MCP or validate arguments. The dependency list
  is two entries on purpose.
* Any log line carrying the token, a file's contents, or a user's search query.

## Running it

`npm start` runs the server, and it exits immediately without `MCP_API_TOKEN` because
`assertConfigured` refuses to start unconfigured. There is no test suite and no linter, so
verification is manual: run it against a local backend and drive the tool from an MCP
client. Report it that way rather than implying a suite ran.
