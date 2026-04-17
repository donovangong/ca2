FROM nginx:1.29.8-alpine

RUN apk update && apk upgrade --no-cache

COPY . /usr/share/nginx/html

EXPOSE 80
