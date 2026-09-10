#!/bin/sh
set -e
echo "[job-cracker] syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss
echo "[job-cracker] starting api..."
exec node dist/main.js
