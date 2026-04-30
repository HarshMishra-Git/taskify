#!/bin/sh
set -e

# Railway injects PORT — default to 3003 for local
export PORT="${PORT:-3003}"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://localhost:8000}"

echo "Starting nginx on port $PORT"
echo "API proxy target: $API_INTERNAL_URL"

# Substitute env vars into nginx config
envsubst '${PORT} ${API_INTERNAL_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Remove default nginx config that conflicts
rm -f /etc/nginx/conf.d/default.conf.bak

exec nginx -g 'daemon off;'
