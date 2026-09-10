# Tools

Nine tools, each a single call to the backend. Arguments are snake case on the wire.

## Identity

| Tool | Arguments | Returns |
|---|---|---|
| `whoami` | none | The user and project the current token is bound to. Use it to confirm whose context an action will be attributed to. |
| `get_project` | none | Project details: title, summary, embedding model, and three chunk counts. See Coverage below. |

Neither needs an OpenRouter key.

## Knowledge

| Tool | Arguments | Returns |
|---|---|---|
| `search_knowledge` | `query` (string), `limit` (int 1 to 25, default 5) | Chunks ranked by meaning, each with a similarity score, plus a `coverage` block. See Coverage below. |
| `add_knowledge` | `content` (string) | The chunk that was created, with its index. |
| `upload_file` | `filename` (string, extension drives the type check), `content` (UTF-8 text, for `.md` and `.txt`), `content_base64` (for `.pdf`) | The stored file record and its chunk count. Owner or admin only. |

All three embed text and therefore require an OpenRouter key. See the prerequisites below.

## Project management

| Tool | Arguments | Returns |
|---|---|---|
| `create_new_project` | `title` (string), `summary` (string, optional) | The new project, owned by the token's user. |
| `change_project_title` | `title` (string) | The updated project. Owner or admin only. |
| `change_project_description` | `description` (string, may be empty) | The updated project. Owner or admin only. |
| `add_member` | `identifier` (username or email), `role` (`editor`, `viewer` or `admin`, default `editor`) | The member that was added or updated. Owner or admin only. |

## Coverage

The backend stores one vector per chunk per embedding model, so a project can hold vectors
for several models at once and changing its model deletes nothing. What follows from that:
**search only reaches chunks embedded with the model the project currently uses.**

`get_project` reports three numbers:

| Field | Means |
|---|---|
| `chunk_count` | Every chunk stored in the knowledge base. |
| `searchable_chunk_count` | How many of those `search_knowledge` can actually reach. |
| `chunks_awaiting_embedding` | The difference: chunks with no vector for the current model. |

`search_knowledge` returns the same information as a `coverage` block beside its results.

**Read it before reporting an empty result.** Zero results with
`chunks_awaiting_embedding` at zero means nothing matched the query. Zero results with
`chunks_awaiting_embedding` above zero means something different: the project changed
embedding model and its knowledge base has not been embedded with the new one yet. Nothing
was lost, and the project owner or an admin can generate the missing embeddings from the
web app, on the members screen. Saying "nothing was found" in that case is wrong and sends
the user looking for content that is already there.

`add_knowledge` is unaffected: a chunk it creates is embedded with the current model as it
is written, so it is searchable immediately whatever coverage the rest of the base has.

## Authorization and prompt injection safety

The project management tools never trust a claimed identity or target. The backend resolves
the acting user and the project **from the API token** and enforces owner and admin server
side, so a prompt injected tool call cannot escalate privileges or act on another project.

There is no project argument on any tool, and adding one would remove this guarantee rather
than extend the surface.

## Prerequisites for the knowledge tools

`search_knowledge`, `add_knowledge` and `upload_file` use vector embeddings through
OpenRouter, so before they work the acting user must:

1. **Add their own OpenRouter API key** in the web app, under Profile and then OpenRouter
   API key. Each user uses their own key: it is encrypted at rest and used only for that
   user's requests. An owner who wants to sponsor the cost hands out a limited OpenRouter
   key for members to paste as their personal key.
2. Optionally have the project owner or an admin pick the **embedding model** for the
   project, on the project screen. The default is `openai/text-embedding-3-small`.

Without a key those three tools return a clear error telling the user to add one.
`whoami` and `get_project` work without one.

## Errors

A failure comes back as a tool result with `isError` set and the backend's own message as
text, not as a thrown exception. Common cases:

| Message | Means |
|---|---|
| `MCP_API_TOKEN is not set...` | The server exited at startup. It never reached a tool. |
| `Unable to reach the API at ...` | The backend is down or `MCP_API_BASE_URL` is wrong. Note that the URL must include `/api`. |
| A message about an OpenRouter API key | The acting user has no key configured. |
| `Forbidden: you must be the project owner or an admin` | The token's user lacks the role for that tool. |
