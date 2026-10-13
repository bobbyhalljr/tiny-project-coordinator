# tiny-project-coordinator

A tiny project coordinator in one TypeScript file.
It scopes a goal into threads, shares a memory board, blocks overlapping files, and assembles what finished.
The planner is mocked. No API key.

## Why it matters

Parallel agents without a coordinator are just parallel messes.

A project needs someone (or something) that scopes the goal, hands out threads, remembers decisions, and puts the results back together.
Anthropic's Claude Code Projects does that with a coordinator conversation and parallel cloud threads.
This is a small model of that shape. It is not how Claude Code Projects works inside.

## Run it

You need Node.js 18 or newer.

```bash
npm install
npx tsx coordinator.ts
```

## Example output

See `output.txt`.

## License

MIT
