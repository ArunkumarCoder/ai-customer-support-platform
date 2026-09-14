# syntax=docker/dockerfile:1

# --- Vendor: install PHP deps separately so this layer only rebuilds when
# composer.json/composer.lock change, not on every source edit. ---
FROM composer:2 AS vendor

WORKDIR /app
COPY database/ database/
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-scripts \
    --no-interaction \
    --prefer-dist

# --- Runtime: PHP + Apache, this repo's app code, and the vendor/ built above. ---
FROM php:8.2-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq-dev \
        libzip-dev \
        unzip \
        git \
        curl \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip pcntl \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=vendor /app/vendor ./vendor
COPY . .

# Regenerate the package/service discovery cache against this image's
# actual --no-dev vendor/ — a stale one copied from local dev (which has
# dev-only packages like laravel/pail installed) would reference classes
# that don't exist in this vendor/, and Laravel would fail to boot.
RUN php artisan package:discover --ansi

# Laravel's public/ is the actual document root, not the repo root.
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e "s!/var/www/html!\${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/sites-available/*.conf \
    && sed -ri -e "s!/var/www/!\${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

RUN chmod +x docker/entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/up || exit 1

ENTRYPOINT ["docker/entrypoint.sh"]

# Overridden per-service on Render for the queue worker (Docker Command:
# `php artisan queue:work --tries=3 --timeout=90 --sleep=3`); the web
# service uses this default.
CMD ["apache2-foreground"]
