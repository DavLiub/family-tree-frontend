#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
build_image='node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392'

command -v docker >/dev/null
test -f "$project_dir/package-lock.json"

docker run --rm --init \
  --memory=1536m --memory-swap=3072m --cpus=1 \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --env npm_config_cache=/tmp/npm-cache \
  --env NODE_OPTIONS=--max-old-space-size=1024 \
  --volume "$project_dir:/work" --workdir /work \
  "$build_image" \
  sh -c 'npm ci --ignore-scripts --no-audit --no-fund && npm run build'

test -s "$project_dir/dist/index.html"
test -s "$project_dir/dist/sw.js"
printf 'Built interface: %s/dist\n' "$project_dir"
