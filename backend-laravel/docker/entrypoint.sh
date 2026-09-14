#!/bin/sh
set -e

# Render (and most PaaS platforms) inject the port to listen on at runtime,
# not build time — Apache's default config only knows about port 80.
PORT="${PORT:-8080}"
sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -i "s/:80>/:${PORT}>/g" /etc/apache2/sites-available/000-default.conf

# Config/route caching needs real env vars (DB_HOST, APP_KEY, etc.), which
# only exist once the container is actually running — caching at build time
# would bake in empty/wrong values.
php artisan config:cache
php artisan route:cache

exec "$@"
