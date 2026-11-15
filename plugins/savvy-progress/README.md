# savvy-progress

A Claude Code mod: a progress bar above the prompt and a live panel of subagents. Made for the [savvy-flow](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-flow) skill, and useful with any subagents.

This is a modified copy of [johnnyvizz's savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) (MIT): the progress bar also names the model each running agent uses, and it draws for any subagent, such as auto-model-router workers.

Install instructions are in the [repository README](../../README.md).

## Tools it adds

- `mcp__savvy-progress__progress`: the orchestrator reports the plan, phase and accepted tasks. Only the main session can: a call from a subagent is ignored, so a worker cannot rename, finish or reset the flow.
- `mcp__savvy-progress__step`: a worker reports its own steps (`done`, `total`, `note`). A worker that does not report shows its context fill in grey instead. The tool is listed up front rather than behind ToolSearch, and each `savvy-*` worker gets one line at the end of its brief asking for these reports.

Cost is a rough estimate from token counts and a built-in per-model price table (`PRICES` in `hooks/register.tsx`, list prices as of 2026-10-10), not a bill. Cache writes are priced at the 1-hour rate, which is what Claude Code writes on a subscription; a session that writes 5-minute entries is overestimated there.

## Settings

`language`: `auto` (default), `en`, `ru` or `he`. Hebrew draws the bar and the panel right to left. `auto` follows Claude Code's `language` setting, then the system locale, and falls back to English. Set it in `/config`, or, for a mod loaded by hand, in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "savvy-progress": { "options": { "language": "ru" } } } }
```

`autoOpen`: `savvy` (default) or `any`. With `savvy` the panel opens by itself when a `savvy-*` worker starts or a plan is reported. With `any` it also opens, once per session, when any other subagent starts. `/agents-info` toggles it either way.


- 1.2.1-local.1: the progress bar now shows the model(s) of running agents (e.g. "Sonnet 5.5 · low"), and also draws for non-savvy subagents when no flow is active.
