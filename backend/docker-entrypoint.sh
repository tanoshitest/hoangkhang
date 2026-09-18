#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push --schema prisma/schema.prod.prisma

if [ "$SEED_DB" = "true" ]; then
  echo "Seeding database (SEED_DB=true)..."
  node prisma-dist/seed.js || echo "Seed failed or already seeded"
fi

echo "Starting server..."
exec node dist/index.js
