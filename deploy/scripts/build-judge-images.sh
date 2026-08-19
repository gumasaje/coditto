#!/usr/bin/env bash
set -euo pipefail

# Run from a checked-out release root. These tags must match every published
# problem manifest; the runner intentionally uses --pull never at execution.
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repository_root"

docker build \
  --file judge-runner/docker/Dockerfile \
  --tag coditto/judge-java21-gradle:8.10.2-phase-a \
  .

docker build \
  --file judge-runner/docker/springboot/Dockerfile \
  --tag coditto/judge-java21-springboot:phase-a \
  .
