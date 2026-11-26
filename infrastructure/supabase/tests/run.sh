#!/usr/bin/env bash
# Applies every migration + seed to an EMPTY Postgres and runs the assertions.
# Never point this at the real Supabase project.
#
#   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres ./infrastructure/supabase/tests/run.sh
set -euo pipefail

cd "$(dirname "$0")/.."

run() { psql -v ON_ERROR_STOP=1 -q -X "$@"; }

if [ "$(run -tAc "select count(*) from pg_namespace where nspname = 'auth'")" != "0" ]; then
  echo "Refusing to run: this database already has an auth schema (is it a real Supabase project?)." >&2
  exit 1
fi

run -f tests/00_supabase_stub.sql
for migration in migrations/*.sql; do
  echo "applying ${migration}"
  run -f "${migration}"
done
run -f seed.sql
run -f tests/10_assertions.sql
