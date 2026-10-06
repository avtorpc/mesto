#!/bin/sh
set -e

mkdir -p /var/www/html/var/cache /var/www/html/var/log /var/www/html/public/uploads
chown -R www-data:www-data /var/www/html/var /var/www/html/public/uploads

exec "$@"
