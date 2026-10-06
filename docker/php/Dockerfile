FROM php:8.4-fpm-bookworm

ENV COMPOSER_ALLOW_SUPERUSER=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates curl git unzip libpq-dev libicu-dev libzip-dev \
    && mkdir -p /usr/local/share/ca-certificates/russian-trusted \
    && curl -fsSLk https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt \
        -o /usr/local/share/ca-certificates/russian-trusted/russian_trusted_root_ca.crt \
    && curl -fsSLk https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.crt \
        -o /usr/local/share/ca-certificates/russian-trusted/russian_trusted_sub_ca.crt \
    && update-ca-certificates \
    && docker-php-ext-install -j"$(nproc)" intl opcache pdo_pgsql zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY docker/php/php.ini /usr/local/etc/php/conf.d/app.ini

