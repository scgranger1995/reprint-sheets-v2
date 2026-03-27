#!/bin/sh
# Ensure database tables exist on first run
npx prisma db push --skip-generate
exec "$@"
