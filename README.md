# ClaudeMod

Two Claude Code plugins that work together:

| Plugin | Type | What it does |
| --- | --- | --- |
| [savvy-progress](plugins/savvy-progress) | mod | A progress bar above the prompt that names the model each running agent uses, and a live agents panel (`/agents-info`). Shows any subagent. |
| [savvy-flow](plugins/savvy-flow) | skill + agents | `/savvy-flow:savvy-flow <task>`: the session model plans, delegates to tiered worker subagents and reviews their work. |

Both come from [johnnyvizz/claude-kit](https://github.com/johnnyvizz/claude-kit) (MIT, see [LICENSE](LICENSE)). savvy-flow is unchanged; savvy-progress is modified to show the running model and to draw for any subagent, such as auto-model-router workers.

## Install

In Claude Code:

```
/plugin marketplace add G3RWW/ClaudeMod
/plugin install savvy-progress@claudemod
/plugin install savvy-flow@claudemod
```

Start a new session afterwards. If the originals from claude-kit are installed, disable them first (`/plugin disable savvy-progress@claude-kit`, `/plugin disable savvy-flow@claude-kit`): the copies use the same tool and agent names.

Update later with `/plugin marketplace update claudemod`.
