# 1.0.0

Released 2026-09-10.

The nine tools as they stand, plus the agent instruction, knowledge and memory system.

## Added

* A Model Context Protocol server over stdio, exposing the MCP RAG knowledge base to MCP
  compatible clients.
* Per project token authentication, so every action an assistant takes is attributable to
  the user who generated the token, and no tool takes a project as an argument.
* Identity tools: `whoami` and `get_project`.
* Knowledge tools: `search_knowledge`, `add_knowledge` and `upload_file`, each embedding
  text with the acting user's own OpenRouter key.
* Project management tools: `create_new_project`, `change_project_title`,
  `change_project_description` and `add_member`, all gated on owner or admin in the
  backend.
* A configuration guard that refuses to start without a token, rather than failing on the
  first tool call.
* The agent instruction system: `AGENTS.md` as an entry point resolving the LXAgents shared
  set through the `lxagents-agents-base` connector, `.agents/` with indexes, local rules,
  agent knowledge and memory, and this `wiki/` tree.

## Changed

* `SKILLS.md` moved from the repository root to `.agents/skills/universal.md`, and the
  folder was registered in the agents index. Only `AGENTS.md`, `README.md` and `LICENSE`
  belong at the root, and `skills/` is an instruction folder like any other. Its body was
  filled in, since the original carried frontmatter with no title.
* `CLAUDE.md` moved to `.claude/CLAUDE.md`, which Claude Code treats as an equivalent
  project instruction location, so nothing about how it loads changes.

* `README.md` is now an overview. Its detail moved into the wiki rather than being dropped:
  the tool table and the embedding prerequisites to `wiki/reference/tools.md`, the Claude
  Desktop bundle procedure to `wiki/guides/claude-desktop-extension.md`, and the variable
  table to `wiki/environments/env.md`.
