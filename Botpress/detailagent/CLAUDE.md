# Botpress ADK Agent

> This project is built with the **Botpress Agent Development Kit (ADK)** — a TypeScript-first framework for building AI agents.

## Key Files

- `agent.config.ts` — Agent configuration, models, state schemas, and dependencies
- `src/conversations/` — Message handlers (primary user interaction)
- `src/workflows/` — Long-running background processes
- `src/tools/` — AI-callable functions
- `src/actions/` — Reusable business logic
- `src/knowledge/` — RAG knowledge base sources
- `src/tables/` — Database table definitions
- `src/triggers/` — Event-based triggers

## Development

```bash
adk dev      # Start dev server with hot reload
adk build    # Build and generate types
adk deploy   # Deploy to Botpress Cloud
adk chat     # Chat with your agent in the terminal
```

## MCP Tools (ADK Dev Server)

This project includes an MCP server that provides AI coding assistants with deep ADK integration.
Run `adk mcp:init --all` to generate configuration for your editor, or use the tools below directly.

### Debugging & Testing

| Tool               | Use for                                                      |
| ------------------ | ------------------------------------------------------------ |
| `adk_send_message` | Send a test message to the running bot and receive responses |
| `adk_query_traces` | Query trace spans for debugging conversations and workflows  |
| `adk_get_dev_logs` | Get dev server logs, build output, errors, and warnings      |

### Project & Integration Management

| Tool                      | Use for                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `adk_get_agent_info`      | Get project info: name, version, and all primitives         |
| `adk_search_integrations` | Search available integrations on the Botpress Hub           |
| `adk_get_integration`     | Get detailed info about an integration before adding it     |
| `adk_add_integration`     | Add an integration to the project (updates agent.config.ts) |

### Workflows

| Tool                 | Use for                                    |
| -------------------- | ------------------------------------------ |
| `adk_list_workflows` | List available workflows with descriptions |
| `adk_start_workflow` | Start a workflow or get its input schema   |

> **Tip:** The dev server must be running (`adk dev`) for debugging and testing tools to work.

## Project Overview

<!-- Describe what your agent does -->

## Architecture & Conventions

<!-- Add project-specific patterns, decisions, and conventions -->

## Notes

<!-- Add anything else relevant to your project -->
