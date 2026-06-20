---
name: opencode-state-repair
description: Use when OpenCode local state is corrupted after process kill or server restart: stale subagent tasks still showing running, stuck blue notification dots, wrong project icons, broken session conversation state, child agent panes/sessions gone but parent task cards still active, or opencode.db state repair.
---

# OpenCode State Repair

Repair local OpenCode state corruption after abrupt process death, host restart,
interrupted subagents, or service restarts. This skill is for operator repair of
the local OpenCode service, not normal application migration.

## Scope

Use for symptoms such as:

- subagent task still shows running after the child process is gone;
- blue unread / activity dot cannot be cleared;
- project icon, project name, or folder mapping is wrong;
- session conversation shows an impossible state after OpenCode was killed;
- child agent pane/session was deleted but parent conversation still shows a
  task as running.

Do not use this skill to change credentials, provider auth, model settings, or
share URLs. Do not inspect or print `auth.json`, `credential`, or other secret
tables unless the user explicitly asks for auth debugging.

## Known local paths

Default data directory:

```text
/root/.local/share/opencode
```

Important files:

```text
/root/.local/share/opencode/opencode.db
/root/.local/share/opencode/log/opencode.log
/root/.local/share/opencode/log/oh-my-opencode-slim.*.log
```

Runtime status endpoint:

```bash
curl -sS --max-time 2 http://localhost:${OPENCODE_PORT:-4096}/session/status
```

Expected idle output:

```json
{}
```

Service commands:

```bash
systemctl status opencode.service --no-pager
systemctl restart opencode.service
```

When running from inside OpenCode itself, use a delayed restart so the command
can return before the server exits:

```bash
nohup sh -c 'sleep 1; systemctl restart opencode.service' \
  >/tmp/opencode-manual-restart.log 2>&1 &
```

## Safety rules

1. Always back up `opencode.db` before editing.
2. Inspect read-only first.
3. Treat `/session/status` as the live runtime source. If it returns `{}` and a
   DB task part says `running`, the DB state is stale.
4. Do not delete sessions or rows unless a narrower field repair is impossible.
5. After DB repair, restart OpenCode or reload the UI so cached state rebuilds.

Create a SQLite-level backup with Bun:

```bash
bun -e "import { Database } from 'bun:sqlite'; \
const db=new Database('/root/.local/share/opencode/opencode.db'); \
db.exec('VACUUM INTO '+JSON.stringify('/root/.local/share/opencode/opencode.db.backup-before-state-repair-YYYYMMDDTHHMM'));"
```

## Quick triage

### Confirm service and live sessions

```bash
systemctl status opencode.service --no-pager
curl -sS --max-time 2 http://localhost:${OPENCODE_PORT:-4096}/session/status
```

If the status endpoint shows active sessions, do not mass-repair task parts yet;
first identify whether the task is genuinely still running.

### Check for child processes

```bash
ps -eo pid,ppid,stat,etime,cmd | rg 'opencode attach|subagent|fixer|oracle|explorer|designer|council'
```

If no matching process exists and `/session/status` is `{}`, stale DB state is
likely.

### Find stale running task tool parts

```bash
bun -e "import { Database } from 'bun:sqlite'; \
const db=new Database('/root/.local/share/opencode/opencode.db',{readonly:true}); \
const rows=db.query(\"select p.id,p.session_id,p.message_id,p.time_created,p.time_updated,p.data,s.title as session_title from part p left join session s on s.id=p.session_id where p.data like '%\\\"tool\\\":\\\"task\\\"%' order by p.time_created\").all(); \
const running=[]; \
for (const r of rows) { const d=JSON.parse(r.data); \
if (d.type==='tool' && d.tool==='task' && d.state?.status==='running') \
running.push({part:r.id,parentSession:r.session_id,parentTitle:r.session_title,message:r.message_id,desc:d.state?.input?.description,subagent:d.state?.input?.subagent_type,child:d.state?.metadata?.sessionId,title:d.state?.title}); } \
console.log(JSON.stringify(running,null,2)); console.log('running_count='+running.length);"
```

Healthy result:

```text
running_count=0
```

## Repair stale running subagent tasks

Use this only when all of these are true:

- `/session/status` is `{}` or does not include the child session;
- no `opencode attach` / subagent process exists;
- `part.data` for a parent conversation still has a `task` tool with
  `state.status = "running"`.

The repair keeps the tool part but converts it to a terminal result that says
the child was cancelled due to stale persisted state.

```bash
bun -e "import { Database } from 'bun:sqlite'; \
const dbPath='/root/.local/share/opencode/opencode.db'; \
const backup='/root/.local/share/opencode/opencode.db.backup-before-all-stale-task-state-repair-YYYYMMDDTHHMM'; \
const db=new Database(dbPath); \
db.exec('VACUUM INTO '+JSON.stringify(backup)); \
const rows=db.query(\"select id,session_id,data from part where data like '%\\\"tool\\\":\\\"task\\\"%'\").all(); \
let updated=0; const details=[]; const now=Date.now(); \
for (const r of rows) { let d; try { d=JSON.parse(r.data); } catch { continue; } \
if (d.type!=='tool' || d.tool!=='task' || d.state?.status!=='running') continue; \
const child=d.state?.metadata?.sessionId ?? 'unknown'; \
const desc=d.state?.input?.description ?? d.state?.title ?? 'stale task'; \
d.state.status='completed'; \
d.state.output='<task id=\"'+child+'\" state=\"cancelled\">\\n<task_error>cancelled: repaired stale persisted running task state after no active OpenCode session remained</task_error>\\n</task>'; \
d.state.metadata={...(d.state.metadata||{}), truncated:false, repaired:true, repairedReason:'stale persisted running task state; /session/status had no active sessions'}; \
d.state.time={...(d.state.time||{}), end: now}; \
db.query('update part set data=?, time_updated=? where id=?').run(JSON.stringify(d), now, r.id); \
updated++; details.push({part:r.id,parent:r.session_id,child,desc}); } \
console.log(JSON.stringify({backup,updated,details},null,2));"
```

Then verify and restart/reload:

```bash
curl -sS --max-time 2 http://localhost:${OPENCODE_PORT:-4096}/session/status
nohup sh -c 'sleep 1; systemctl restart opencode.service' \
  >/tmp/opencode-state-repair-restart.log 2>&1 &
```

## Repair a single known stale task

Use a single-part repair when you know the parent `part.id` and child session id.
This is safer during an active debugging session.

```bash
bun -e "import { Database } from 'bun:sqlite'; \
const dbPath='/root/.local/share/opencode/opencode.db'; \
const backup='/root/.local/share/opencode/opencode.db.backup-before-one-task-state-repair-YYYYMMDDTHHMM'; \
const partId='prt_REPLACE_ME'; \
const expectedChild='ses_REPLACE_ME'; \
const db=new Database(dbPath); db.exec('VACUUM INTO '+JSON.stringify(backup)); \
const row=db.query('select data from part where id=?').get(partId); \
if (!row) throw new Error('target part not found'); \
const data=JSON.parse(row.data); \
if (data.type!=='tool' || data.tool!=='task') throw new Error('target part is not task tool'); \
if (data.state?.metadata?.sessionId!==expectedChild) throw new Error('target child session mismatch'); \
data.state.status='completed'; \
data.state.output='<task id=\"'+expectedChild+'\" state=\"cancelled\">\\n<task_error>cancelled: repaired stale interrupted subtask state</task_error>\\n</task>'; \
data.state.metadata={...(data.state.metadata||{}), truncated:false, repaired:true}; \
data.state.time={...(data.state.time||{}), end: Date.now()}; \
db.query('update part set data=?, time_updated=? where id=?').run(JSON.stringify(data), Date.now(), partId); \
console.log({backup,updated:partId});"
```

## Project icon or folder state is wrong

Relevant tables:

- `project`: canonical project record; fields include `worktree`, `name`,
  `icon_url`, `icon_color`, `icon_url_override`, `time_initialized`.
- `project_directory`: maps directories to project ids and strategies.
- `session`: each conversation points at `project_id` and `directory`.

Inspect projects and directory mappings:

```bash
bun -e "import { Database } from 'bun:sqlite'; \
const db=new Database('/root/.local/share/opencode/opencode.db',{readonly:true}); \
console.log(db.query('select id,worktree,name,icon_url,icon_color,icon_url_override,time_initialized from project order by time_updated desc limit 50').all()); \
console.log(db.query('select project_id,directory,type,strategy from project_directory order by time_created desc limit 100').all());"
```

Common fixes:

- Wrong custom icon: set `project.icon_url_override = null` for that project.
- Wrong generated icon/name: verify the `project.worktree` and
  `project_directory.directory` mapping first; do not blindly edit name/icon.
- Duplicate project for same worktree: inspect sessions for both project ids
  before merging or deleting anything.

Example clearing only an incorrect icon override:

```bash
bun -e "import { Database } from 'bun:sqlite'; \
const db=new Database('/root/.local/share/opencode/opencode.db'); \
const backup='/root/.local/share/opencode/opencode.db.backup-before-icon-repair-YYYYMMDDTHHMM'; \
db.exec('VACUUM INTO '+JSON.stringify(backup)); \
const projectId='proj_REPLACE_ME'; \
db.query('update project set icon_url_override=null, time_updated=? where id=?').run(Date.now(), projectId); \
console.log({backup,projectId});"
```

## Blue dot or unread notification will not clear

First distinguish UI cache from persisted state:

1. Refresh the browser / TUI view.
2. Restart `opencode.service`.
3. Inspect `session`, `todo`, and stale `task` parts.

Useful inspection:

```bash
bun -e "import { Database } from 'bun:sqlite'; \
const db=new Database('/root/.local/share/opencode/opencode.db',{readonly:true}); \
console.log('recent sessions', db.query('select id,title,parent_id,agent,time_updated,time_archived from session order by time_updated desc limit 30').all()); \
console.log('open todos', db.query(\"select session_id,content,status,priority,position from todo where status!='completed' order by time_updated desc limit 50\").all());"
```

If the blue dot is caused by stale tasks, use the stale task repair above. If it
is caused by legitimate open todos, resolve or update the todo list from inside
the session rather than editing the database.

## Final verification checklist

- `running_count=0` for task tool parts unless a task is genuinely active.
- `/session/status` does not list repaired child sessions.
- No matching `opencode attach` / subagent process remains.
- `systemctl status opencode.service --no-pager` is active.
- Browser/TUI refreshed after service restart.
- Repository worktree remains clean if no repo files were intentionally changed.
