# Proposal: Plan Mode System Reminder Rewrite Investigation

Imported from a durable markdown plan into native SDD job format.

## Durable Plan Metadata

Source path: /workspace/oh-my-opencode-slim/.opencode/plans/ses-0e71b291dffejpuj9tsvi6gjcj.md
SHA-256: 4f9acaf9c4a37f89633ef77728d17c3d31146d9b018f4b12cc1f7f9d0c336bcb
Review status: "draft"
Import timestamp: 2026-06-30T15:59:37.777Z
Upstream heading: Plan Mode System Reminder Rewrite Investigation

Upstream approval metadata is recorded for review only and does not authorize native execution.

## Imported Plan

---
status: "draft"
updated_at: "2026-06-30T15:57:49.282Z"
---
# Plan Mode System Reminder Rewrite Investigation

## Goal

排查为什么当前 Plan Mode system reminder 仍然包含未被改写的 `ZERO exceptions` 绝对禁止文案，导致 durable-plan `plan_save` 例外没有在真实 Plan Mode 提示中生效。

## Problem Statement

当前代码在 `experimental.chat.system.transform` 中调用 `allowDurablePlanSaveInPlanMode(output.system)`，理论上应将 Plan Mode reminder 中的绝对禁止写入文案规范化为“除 `plan_save` 保存 durable markdown plan 外，其余写入仍禁止”。

但实际会话中仍出现原始 reminder：

```text
ZERO exceptions.
```

这说明至少存在以下可能之一：

- Plan Mode reminder 是在插件 `experimental.chat.system.transform` 之后注入的。
- Plan Mode reminder 不在 `output.system` 中，而是在更高优先级消息/宿主通道中注入。
- 当前会话未加载最新插件代码或加载了不同插件实例。
- `allowDurablePlanSaveInPlanMode` 的匹配条件没有命中真实 reminder。
- `collapseSystemInPlace` 后又被宿主追加了新的 Plan Mode reminder。
- 当前显示给 agent 的 `<system-reminder>` 与实际 LLM API 的 `system` 数组不是同一个 hook surface。

## Investigation Steps

1. Confirm active plugin source.
   - 验证当前 OpenCode 实例加载的是 `file:///workspace/oh-my-opencode-slim/src/index.ts` 或本地构建产物，而不是上游 npm 包或旧 dist。
   - 检查 `/plan-save`、`plan_save` path allowlist、自然语言 authoring smoke 是否来自当前源码。

2. Instrument or inspect system transform ordering.
   - 在 `experimental.chat.system.transform` 附近加入临时可控 debug 日志，记录进入 helper 前后的 `output.system` 是否包含 `Plan Mode` / `ZERO exceptions`。
   - 重点确认 `allowDurablePlanSaveInPlanMode` 是否看到了真实 Plan Mode reminder。

3. Determine whether Plan Mode reminder is injected before or after plugin hooks.
   - 如果 helper 前已经有 `ZERO exceptions`，但 helper 后仍有，说明 normalize 逻辑问题。
   - 如果 helper 前后都没有，但最终对话中出现，说明 reminder 注入晚于插件 hook。
   - 如果 helper 后已改写，但最终仍出现另一个原始 reminder，说明宿主后置追加或另一路注入。

4. Verify hook surface.
   - 比较 `experimental.chat.system.transform` 与 `experimental.chat.messages.transform` 是否都能看到 Plan Mode 文案。
   - 如果 system hook 看不到，检查 messages transform 的最后用户消息或 internal reminder 是否包含 Plan Mode reminder。
   - 确认当前 `<system-reminder>` 是 OpenCode runtime 注入给 agent 的 host reminder，还是插件可改写的 model system message。

5. Add regression coverage for real reminder shape.
   - 使用完整 Plan Mode reminder 样例作为测试 fixture。
   - 测试 `allowDurablePlanSaveInPlanMode` 后不再包含未限定的 `ZERO exceptions`。
   - 测试 `STRICTLY FORBIDDEN`、`ABSOLUTE CONSTRAINT` 等强词不会继续无条件压过 `plan_save` 例外。
   - 测试 helper 幂等，避免重复追加 exception 文案。

6. Decide fix path.
   - 如果 Plan Mode reminder 在 plugin system hook 前注入：修 `normalizePlanModeReminder` 覆盖完整真实文案。
   - 如果 Plan Mode reminder 在 plugin hook 后注入：需要改用更晚的 hook surface，或给 OpenCode core 增加 plan-mode allowed tool seam。
   - 如果当前会话加载旧插件：修安装/构建/重启流程，补 smoke gate。
   - 如果 `<system-reminder>` 不可由 plugin 修改：调整设计，不再承诺“改写 reminder”，改为通过 host-level policy/permission seam 支持 `plan_save`。

## Acceptance Checks

- 真实 Plan Mode 会话中不再出现未限定的 `ZERO exceptions`。
- 真实 Plan Mode 会话中仍明确禁止 `edit`、`write`、`apply_patch`、mutating bash、`plan_to_sdd`、`sdd_from_plan`、`spec_*`、commit、deploy、implementation。
- 真实 Plan Mode 会话中明确允许唯一写入例外：`plan_save` 保存 durable markdown plan。
- `/plan-save --path plan.md` 在真实 Plan Mode 中可以调用 `plan_save`。
- “落一个计划 / 更新计划”在真实 Plan Mode 中可以维护当前 session durable plan。
- “开干 / 就按这个”只触发 readiness，不在 Plan Mode 中自动 import/finish/implement。
- 单测覆盖完整真实 reminder fixture。
- headless smoke 和交互式 smoke 均记录通过。

## Plan-to-SDD Flow Test

完成本排查计划保存后，继续测试 durable plan handoff 到 native SDD：

1. Run `/plan-ready` on this saved plan.
2. Confirm the decision is `needs-sdd` because the plan touches plugin behavior, hook ordering, and runtime policy.
3. Run `/plan-to-sdd --slug plan-mode-system-reminder-rewrite --domain sdd-workflow` only after explicitly leaving Plan Mode or confirming SDD import is allowed.
4. Confirm `docs/spec/jobs/plan-mode-system-reminder-rewrite/` is created with proposal, delta requirements, delta design, tasks, and trace placeholders.
5. Confirm the original durable plan is archived as imported if it was the active session plan.
6. Confirm native SDD gates remain pending and no implementation starts automatically.

## Non-goals

- 不放开通用文件写入。
- 不允许 Plan Mode 中执行实现、导入 SDD、提交或部署。
- 不引入外部 planner runtime。
- 不把 fork policy 大量写入 `src/index.ts`；入口仍保持薄适配。

## Open Questions

- OpenCode 的 Plan Mode reminder 是否属于 plugin 可见的 system transform 内容？
- 当前 `<system-reminder>` 是最终模型 system message，还是宿主运行时在 plugin hook 之后追加的高优先级提醒？
- 是否需要在 OpenCode core 增加一个正式的 `planMode.allowedWriteTools = ['plan_save']` seam？
