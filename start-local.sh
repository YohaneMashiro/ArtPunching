#!/usr/bin/env bash
set -euo pipefail
PUNCH_PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec python3 -u -m http.server 4173 --bind 0.0.0.0 --directory "$PUNCH_PROJECT_ROOT/punch-studio/dist"
