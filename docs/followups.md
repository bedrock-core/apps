# Follow-ups

Temporary. Delete items as they land.

## Comments: history and spike narration

Rewrite as present-tense facts, dropping spike names and dates.

| Location | Text | Action |
| --- | --- | --- |
| `packages/config/src/i18n/en_US.ts:1-14` | "used to hardcode these in English … Now it goes through" | strings are keyed under the `core` namespace and published when the UI mounts |
| `packages/config/src/commands/lists.ts:1-16` | "used to be left out of the command enum" | chat is the only place a list is edited |
| `packages/config/src/commands/parse.ts:20` | "Lists used to be filtered out here" | every declared key is offered; `add` / `remove` / comma `set` are the list spellings |
| `packages/config/src/config/__tests__/schema.test.ts:191` | "forced the old read-only fallback" | rewrite |
