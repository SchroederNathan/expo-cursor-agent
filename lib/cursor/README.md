# Cursor integration

This directory talks to `https://api.cursor.com/v1/*` over plain `fetch`. We do **not** import `@cursor/sdk`.

## Why no SDK?

`@cursor/sdk` is webpack-bundled with Node-builtin externals (`node:fs`, `node:net`, `node:async_hooks`, `node:stream`) and ships a `sqlite3` native `.node` binary. Neither runtime that this Expo app deploys to can load it:

- **Metro** (development & native builds) cannot resolve the Node builtins or the native binary.
- **Cloudflare Workers** (EAS Hosting, where API routes run in production) has no `.node` loader and no Node native modules.

We've tried polyfilling and stubbing; the SDK's frozen `default` export and `_interopNamespace` indirection produce errors that don't have a clean Metro/Workers escape hatch.

## What we do instead

The modules here mirror the SDK's _shape_ — function names, types, lifecycle semantics — on top of the public REST API.

| SDK                                | This package                              |
|------------------------------------|-------------------------------------------|
| `Agent.list()`                     | `listCloudAgents()` in `agents.ts`        |
| `Agent.create()`                   | `createCloudAgent()` in `agents.ts`       |
| `Agent.archive() / .unarchive()`   | `archiveAgent() / unarchiveAgent()`       |
| `Agent.delete()`                   | `deleteAgent()`                           |
| `agent.send(prompt)` (followup)    | `sendFollowup()` in `followups.ts`        |
| `Agent.listRuns()`                 | `listRuns()` in `runs.ts`                 |
| `run.cancel()`                     | `cancelRun()` in `runs.ts`                |
| `run.conversation()`               | `getConversation()` in `runs.ts`          |
| `run.stream()`                     | adaptive React-Query polling on the client |
| `Cursor.me()`                      | `getCurrentUser()` in `me.ts`             |
| `Cursor.models.list()`             | `listModels()` in `models.ts`             |
| `Cursor.repositories.list()`       | `listRepositories()` in `repos.ts`        |

Canonical types in `types.ts` (`RunStatus`, `SDKMessage`, `ConversationTurn`, `ListResult<T>`) match the SDK's runtime types so consumer code is portable.

## When to add a Node sidecar

Some SDK features have no REST equivalent:

- **MCP servers** (`Agent.create({ mcpServers })`)
- **Named subagents** (`Agent.create({ agents })`)
- **Raw `SDKMessage` event types** beyond what polled state can project (`thinking` deltas, fine-grained `onDelta` callbacks)

If a future task needs any of these, deploy a tiny Node service (Fly.io / Render / Railway) that imports `@cursor/sdk` and re-exposes the relevant verbs as JSON / SSE endpoints. The Expo app should keep using `lib/api/agents.ts` — only the fetch URLs in `lib/cursor/*.ts` need to switch to the sidecar's base. Because every consumer already speaks SDK-shaped types, the swap is local.

Do not import `@cursor/sdk` directly into this app. It will not bundle.
