#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./scripts/set-production-secrets.sh <mongodb-atlas-uri>"
  echo "Example: ./scripts/set-production-secrets.sh 'mongodb+srv://user:pass@cluster.mongodb.net'"
  exit 1
fi

MONGO_URL="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/deploy"
printf '%s' "$MONGO_URL" | npx wrangler secret put MONGO_URL
printf '%s' "justsimplbuy" | npx wrangler secret put DB_NAME

echo "Production secrets updated."
