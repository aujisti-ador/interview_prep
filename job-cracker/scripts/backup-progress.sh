#!/bin/sh
# Dump YOUR data — not the content.
#
# Content (plan, problems, quiz, drills, skills, docs) is re-seeded from the
# typed TypeScript modules on every boot, so backing it up would just create a
# second, staler copy that fights the seeder. What cannot be regenerated is
# everything you produced: task progress, solved problems and saved code, quiz
# and drill attempts, STAR stories, the application pipeline, and your skill
# self-ratings.
#
# The result is committed to the repo, so `git clone` + `make up` + `make
# restore` gets you back exactly where you were, on any machine.
#
#   make backup    write it
#   make restore   load it
set -e

OUT="${1:-backup/progress.sql}"
mkdir -p "$(dirname "$OUT")"

# Skill is here for `level` and `note`, which are yours — the seeder
# deliberately never overwrites those two columns on an existing row.
TABLES="Profile TaskProgress ProblemStatus ProblemAttempt QuizSession DrillAttempt StarStory Application StudyLog Skill"

ARGS=""
for t in $TABLES; do
  ARGS="$ARGS --table=public.\"$t\""
done

# --data-only: the schema is owned by Prisma, and restoring a stale schema over
# a migrated database is how you get a broken app that looks fine.
# --on-conflict-do-nothing: restoring twice must not explode on primary keys.
# shellcheck disable=SC2086
docker compose exec -T db pg_dump \
  -U "${POSTGRES_USER:-jobcracker}" \
  -d "${POSTGRES_DB:-jobcracker}" \
  --data-only \
  --column-inserts \
  --on-conflict-do-nothing \
  $ARGS > "$OUT"

ROWS=$(grep -c '^INSERT INTO' "$OUT" || true)
echo "[job-cracker] wrote $OUT — $ROWS rows across $(echo $TABLES | wc -w | tr -d ' ') tables"
echo "[job-cracker] commit it: git add $OUT"
