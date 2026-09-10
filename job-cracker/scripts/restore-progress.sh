#!/bin/sh
# Load a progress backup into a running stack.
#
# Safe to run on a fresh clone: content is already seeded by the API at boot,
# and this only adds the rows that belong to you. Safe to run twice, because
# the dump uses ON CONFLICT DO NOTHING.
#
# It does NOT delete anything. If you want a clean slate first, `make clean`
# and bring the stack back up before restoring.
set -e

IN="${1:-backup/progress.sql}"

if [ ! -f "$IN" ]; then
  echo "[job-cracker] no backup at $IN — run 'make backup' first" >&2
  exit 1
fi

# The seeder must have run, or foreign keys (TaskProgress -> PlanTask,
# ProblemStatus -> Problem) will reject every row.
SEEDED=$(docker compose exec -T db psql -U "${POSTGRES_USER:-jobcracker}" \
  -d "${POSTGRES_DB:-jobcracker}" -tAc 'SELECT count(*) FROM "PlanTask"' 2>/dev/null || echo 0)
if [ "$SEEDED" -eq 0 ]; then
  echo "[job-cracker] content is not seeded yet — start the stack and let the API boot first" >&2
  exit 1
fi

docker compose exec -T db psql \
  -U "${POSTGRES_USER:-jobcracker}" \
  -d "${POSTGRES_DB:-jobcracker}" \
  -v ON_ERROR_STOP=1 \
  --quiet < "$IN"

echo "[job-cracker] restored from $IN"
