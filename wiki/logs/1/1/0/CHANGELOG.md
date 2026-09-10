# 1.1.0

Released 2026-09-10.

The tools now explain embedding coverage, so an assistant can tell an empty search result
apart from a knowledge base that is not embedded with the model the project currently uses.

## Changed

* `get_project` describes three counts rather than one: `chunk_count` for everything
  stored, `searchable_chunk_count` for what search can reach, and
  `chunks_awaiting_embedding` for the difference. It states that a non-zero pending count
  means the project changed embedding model and that nothing was lost.
* `search_knowledge` names the `coverage` block returned beside its results and instructs
  the reading model to check it before reporting an empty result, so an unembedded
  knowledge base is reported as such rather than as "nothing found".
* `add_knowledge` notes that a chunk it writes is embedded with the current model as it is
  stored, so it is searchable immediately whatever coverage the rest of the base has.
* `wiki/reference/tools.md` gained a Coverage section covering the two causes of an empty
  result and where a project owner generates the missing embeddings.

No transport, argument or dependency changed. The nine tools are the same nine tools.
