#!/usr/bin/env bash
set -euo pipefail
umask 022

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_dir="${FAMILY_TREE_DIR:-/opt/sites/family-tree}"
runtime_dir="$(cd -- "$runtime_dir" && pwd)"
compose_file="$runtime_dir/compose.yaml"
backup_file="$runtime_dir/compose.before-interface.yaml"

test -f "$compose_file"
command -v flock >/dev/null
command -v python3 >/dev/null
command -v curl >/dev/null
exec 9>"$runtime_dir/.interface-deploy.lock"
flock -n 9 || { printf 'Another interface deployment is running.\n' >&2; exit 1; }

"$project_dir/scripts/build-interface.sh"

release_name="$(date -u +%Y%m%dT%H%M%SZ)-$$"
release_dir="$runtime_dir/frontend-releases/$release_name"
mkdir -p "$release_dir"
cp -a "$project_dir/dist/." "$release_dir/"
# Offer the exact sources used for this build, excluding local/runtime data.
tar -czf "$release_dir/family-interface-source.tar.gz" \
  -C "$project_dir" src lang fonts images scripts test .github \
  package.json package-lock.json rollup.config.js tsconfig.json vitest.config.js \
  web-dev-server.config.mjs index.html global.css maplibre-gl.css tippy.css \
  manifest.json graphvizlib.wasm LICENSE README.md AGENTS.md FAMILY-INTERFACE.md \
  Dockerfile Dockerfile.devel Dockerfile.nginx default.conf.template

cp -p "$compose_file" "$backup_file"

restore_previous() {
  printf 'Restoring previous interface configuration.\n' >&2
  cp -p "$backup_file" "$compose_file"
  docker compose --project-directory "$runtime_dir" -f "$compose_file" \
    up -d --no-deps --force-recreate grampsweb
}

if ! python3 "$project_dir/scripts/configure-interface.py" "$compose_file" "$release_name"; then
  cp -p "$backup_file" "$compose_file"
  exit 1
fi
if ! docker compose --project-directory "$runtime_dir" -f "$compose_file" config --quiet; then
  cp -p "$backup_file" "$compose_file"
  exit 1
fi
if ! docker compose --project-directory "$runtime_dir" -f "$compose_file" \
  up -d --no-deps --force-recreate grampsweb; then
  restore_previous
  exit 1
fi

ready=false
for attempt in $(seq 1 60); do
  if curl --fail --silent --max-time 3 http://127.0.0.1:5055/ \
    | cmp -s - "$release_dir/index.html"; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  restore_previous
  exit 1
fi
if ! api_status="$(curl --silent --max-time 5 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:5055/api/people/)"; then
  restore_previous
  exit 1
fi
if [[ "$api_status" != 401 ]]; then
  restore_previous
  exit 1
fi
if ! curl --fail --silent --max-time 10 "${FAMILY_TREE_URL:-https://family.taldav.com}/" \
  | cmp -s - "$release_dir/index.html"; then
  restore_previous
  exit 1
fi
docker compose --project-directory "$runtime_dir" -f "$compose_file" ps grampsweb
docker compose --project-directory "$runtime_dir" -f "$compose_file" logs --tail 15 grampsweb
printf '\nPublished release: %s\nPrevious configuration: %s\n' "$release_dir" "$backup_file"
