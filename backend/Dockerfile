FROM oven/bun:1-alpine

WORKDIR /app

COPY src /app/src
COPY node_modules /app/node_modules
COPY package.json /app/package.json

RUN chown -R bun:bun /app

USER bun

ENTRYPOINT [ "/usr/local/bin/bun" ]
CMD [ "start" ]