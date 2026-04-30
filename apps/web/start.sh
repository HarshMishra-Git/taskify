#!/bin/sh
set -e

export PORT="${PORT:-3003}"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://localhost:8000}"

echo "Starting nginx on port: $PORT"
echo "API target: $API_INTERNAL_URL"

# IMPORTANT: pass explicit var list so nginx vars like $uri $scheme are NOT substituted
envsubst '${PORT},${API_INTERNAL_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

cat /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
