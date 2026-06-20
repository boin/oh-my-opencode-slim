# opencode-state-repair skill

Local OpenCode state repair workflow for stale subagent task cards, stuck blue
notification dots, wrong project icons, broken session records, and related
`opencode.db` inconsistencies after process death or service restart.

Installed automatically by `oh-my-opencode-slim` for the `orchestrator` agent.
Includes a pre-start-friendly CLI:

```bash
oh-my-opencode-slim state-repair --check-only
oh-my-opencode-slim state-repair --repair-safe --stale-after-ms=3600000
```

Default mode is check-only. Safe repair is opt-in, backs up `opencode.db`, skips
interactive question/permission tools, and repairs stale `task` plus non-task
running tool parts. See `SKILL.md` for the full safety checklist and repair
commands.
