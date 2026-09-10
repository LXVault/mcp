---
name: memory-tasks-embedding-matrix
description: Record of teaching the tool descriptions about embedding coverage, so an assistant explains an uncovered knowledge base instead of reporting it as empty.
---

# Task: embedding matrix

**Goal.** Search reaches only the chunks embedded with the project's current model. Nothing
in the tool descriptions said so, so an assistant hitting an uncovered knowledge base would
report "nothing found" and send the user looking for content that is already stored.

**Objective.** A model reading these tools can tell an empty result apart from an unembedded
knowledge base, and says which one it is.

**Detail.** This is task 3 of three and depends on the backend change landing first, since
it describes fields that change introduced. Descriptions only: no transport change, no new
argument, no logic on this side. Tools stay thin.

## Tasks

| # | Title | Scope | Repository | Branch | PR |
|---|---|---|---|---|---|
| 1 | Schema split, migration, coverage and backfill | The table, the migration, search, ingestion, the API | server-expressjs | `feat/embedding-matrix` | 12 |
| 2 | Coverage and backfill in the web app | The embedding model card and its API methods | client-reactjs | `feat/embedding-matrix` | 9 |
| 3 | Tool descriptions that explain coverage | `get_project` and `search_knowledge` wording, the tool reference | mcp | `feat/embedding-matrix` | 7 |

### Task 3 — feat/embedding-matrix

Landed:

* `get_project` now distinguishes `chunk_count`, `searchable_chunk_count` and
  `chunks_awaiting_embedding`, and states that a non-zero pending count means a model change
  rather than lost data.
* `search_knowledge` names the `coverage` block and instructs the reading model to check it
  before reporting an empty result.
* `add_knowledge` notes that a chunk it writes is searchable immediately whatever coverage
  the rest of the base has.
* `wiki/reference/tools.md` gained a Coverage section explaining the two causes of an empty
  result and where a user fixes the second one.

Verified by driving the server over real stdio JSON-RPC against a live backend and a real
database, 9 checks passing: all nine tools registered, both descriptions carrying the
coverage guidance, `get_project` returning 7 chunks with 0 searchable, `search_knowledge`
returning no rows with 7 pending on an uncovered base, the same query returning 5 ranked
rows after a backfill, and stdout carrying nothing but protocol messages.

Depends on: task 1. Independent of task 2.

## Decisions

* **Descriptions only.** The coverage fields already arrive in the payload the backend
  returns, and `apiClient` relays JSON unchanged. Reshaping or summarising them here would
  be logic on this side, which the repository rules forbid.
* **The instruction is explicit rather than implied.** A model that merely sees a `coverage`
  field will not reliably reason about it, so the description says what to do when
  `chunks_awaiting_embedding` is above zero.

## Status

Done. Every branch is pushed and every pull request is open, each stating the pull
request it merges after. Merging is the user's call and has not been requested.

Record closed.
