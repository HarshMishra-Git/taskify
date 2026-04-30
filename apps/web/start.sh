#!/bin/sh
set -e

export API_INTERNAL_URL="${API_INTERNAL_URL:-http://localhost:8000}"

echo "API proxy target: $API_INTERNAL_URL"

envsubst '${API_INTERNAL_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
