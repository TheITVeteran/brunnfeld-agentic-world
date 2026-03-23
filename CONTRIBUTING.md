# Contributing to Brunnfeld

Thanks for your interest. Here's what you need to know.

## What fits this project

- Bug fixes
- New agent behaviors or skills
- New world events or governance mechanics
- Viewer / UI improvements
- Documentation fixes

Avoid PRs that add external dependencies unless they're clearly necessary — the lean dependency list is intentional.

## Setup

```bash
cp .env.example .env
# add your OPENROUTER_API_KEY or leave blank to use Claude Code CLI
npm install
npm run reset      # initialize world state
npm run server     # start API server
npm run viewer:dev # start viewer in dev mode (separate terminal)
```

## Before opening a PR

- Run `npm run typecheck` — no TypeScript errors
- Test at least a few ticks with `npm run tick`
- Keep PRs focused — one thing per PR

## Code style

- TypeScript throughout
- No classes — plain functions and types
- State flows through `WorldState` in `src/types.ts`
- Agent decisions happen in `src/agent-runner.ts`, engine logic in `src/engine.ts`

## Questions

Open an issue or start a discussion on GitHub.
