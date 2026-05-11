#!/bin/sh
set -e

# Run migrations if DATABASE_URL is set (default for compose/render)
if [ -n "${DATABASE_URL:-}" ]; then
  /usr/local/bin/prisma migrate deploy --schema=./prisma/schema.prisma
fi

exec node server.js
