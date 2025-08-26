Area | File | Line/Locator | What’s missing | Complexity | Action | Status
--- | --- | --- | --- | --- | --- | ---
API | apps/api/src/models/season.py | Weeks model | No mapping table to challenges | M | Add `WeekChallenge` join model | Implemented
API | apps/api/src/models/challenge.py | Hints/Artifacts | No hint consumption tracking | M | Add `HintConsumption` model | Implemented
API | apps/api/src/routes/seasons.py | get_season_weeks | TODO: challenge-to-week mapping | M | Query via `WeekChallenge` and include | Implemented
API | apps/api/src/routes/challenges.py | get_challenge | Access/hints availability checks | M | Enforce schedule, consumed hints | Implemented
API | apps/api/src/routes/submissions.py | consume_hint | Missing persistence/idempotency | M | Persist `HintConsumption` with unique constraint | Implemented
API | apps/api/src/routes/leaderboard.py | queries | Missing season date filter | M | Filter by season start/end | Implemented
API | apps/api/src/routes/admin_ai.py | publish | TODO scheduling + notifications | M | Insert `WeekChallenge`, enqueue email tasks | Implemented
API | apps/api/src/routes/artifacts.py | download_artifact | Access control TODO | S | Enforce schedule via `WeekChallenge` | Implemented
API | apps/api/src/routes/challenges.py | endpoint shapes | Frontend expects slug param | S | Add `GET /api/challenges/slug/{slug}` | Implemented
Worker | apps/worker/tasks/labs.py | start_lab_instance | TODO compose + TTL schedule | M | Implement compose start, schedule cleanup | Implemented
Worker | apps/worker/tasks/materialization.py | _update_* | TODO DB updates | M | Persist artifacts and generation status | Implemented
Worker | apps/worker/tasks/notifications.py | email | Add rate limit | S | Use Redis key TTL guard | Implemented
Web | apps/web/src/lib/api/client.ts | getChallenge | Uses id while route might be slug | S | Add slug route + hook | Planned
Web | apps/web/src/app/(shell)/challenges/[slug]/page.tsx | UI | Wire downloads, hint bodies, lab controls | M | Call APIs, handle state | Planned
Infra | docker-compose.yml | services | Ensure non-root worker, pnpm store stability | M | Tweak images/env, silence warnings | Planned
DX | apps/web/package.json | scripts | Avoid npx in scripts | S | Use local tsc | Implemented

Status: Implemented/Tested will be updated as changes land.

