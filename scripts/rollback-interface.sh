#!/usr/bin/env bash
set -euo pipefail

runtime_dir="${FAMILY_TREE_DIR:-/opt/sites/family-tree}"
runtime_dir="$(cd -- "$runtime_dir" && pwd)"
compose_file="$runtime_dir/compose.yaml"
backup_file="$runtime_dir/compose.before-interface.yaml"
test -s "$backup_file"
exec 9>"$runtime_dir/.interface-deploy.lock"
flock -n 9 || { printf 'Another interface deployment is running.\n' >&2; exit 1; }
docker compose --project-directory "$runtime_dir" -f "$backup_file" config --quiet
cp -p "$backup_file" "$compose_file"
docker compose --project-directory "$runtime_dir" -f "$compose_file" \
  up -d --no-deps --force-recreate grampsweb
printf 'Previous interface configuration restored.\n'
