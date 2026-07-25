#!/usr/bin/env bash
# Package already-built Angular dist into the production web image and optionally push.
# Syncs WEB_VERSION into ../home-api/deploy/.env.deploy (from .env.docker or git SHA).
# Override with DEPLOY_DIR if the sibling layout differs.
# Usage (from home-front/):
#   npm ci && npm run build:prod
#   cp --update=none .env.docker.example .env.docker   # once
#   ./deploy/build-image.sh                # build
#   ./deploy/build-image.sh --push         # build + push
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ -n "${DEPLOY_DIR:-}" ]]; then
  DEPLOY_DIR="$(cd "$DEPLOY_DIR" && pwd)"
else
  DEPLOY_DIR="$(cd "${ROOT}/../home-api/deploy" && pwd)"
fi
ENV_DEPLOY="${DEPLOY_DIR}/.env.deploy"
ENV_DEPLOY_EXAMPLE="${DEPLOY_DIR}/.env.deploy.example"

upsert_env() {
  local file="$1" key="$2" value="$3"
  if [[ -f "$file" ]] && grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

ENV_FILE="${ROOT}/.env.docker"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi

FRONT_DIST_PATH="${FRONT_DIST_PATH:-dist/home-manager/browser}"
REGISTRY_HOST="${REGISTRY_HOST:-registry.lumuscore.com}"
WEB_IMAGE="${WEB_IMAGE:-home/web}"
WEB_VERSION="${WEB_VERSION:-$(git rev-parse --short HEAD)}"
PUSH=0

for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    -h|--help)
      sed -n '2,9p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg (use --push)" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "${FRONT_DIST_PATH}/index.html" ]]; then
  echo "Missing ${FRONT_DIST_PATH}/index.html. Run: npm ci && npm run build:prod" >&2
  exit 1
fi

IMAGE="${REGISTRY_HOST}/${WEB_IMAGE}:${WEB_VERSION}"

echo "==> Building ${IMAGE}"
echo "    FRONT_DIST_PATH=${FRONT_DIST_PATH}"
docker build --pull \
  --build-arg "FRONT_DIST_PATH=${FRONT_DIST_PATH}" \
  -t "${IMAGE}" \
  .

echo "==> Image contents (expect index.html / assets, no src/)"
docker run --rm "${IMAGE}" sh -c 'ls -la /usr/share/nginx/html | head -n 20'

if [[ "$PUSH" -eq 1 ]]; then
  echo "==> Pushing ${IMAGE}"
  docker push "${IMAGE}"
fi

echo "==> Syncing WEB_VERSION=${WEB_VERSION} → ${ENV_DEPLOY}"
if [[ ! -f "$ENV_DEPLOY" ]]; then
  if [[ ! -f "$ENV_DEPLOY_EXAMPLE" ]]; then
    echo "Missing ${ENV_DEPLOY_EXAMPLE}" >&2
    exit 1
  fi
  cp "$ENV_DEPLOY_EXAMPLE" "$ENV_DEPLOY"
fi
upsert_env "$ENV_DEPLOY" WEB_VERSION "$WEB_VERSION"

echo "WEB_VERSION=${WEB_VERSION}"
echo "IMAGE=${IMAGE}"
echo "ENV_DEPLOY=${ENV_DEPLOY}"
