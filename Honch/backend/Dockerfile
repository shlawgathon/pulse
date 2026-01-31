FROM oven/bun:1 AS base

ENV PORT=3000
ENV TZ=UTC

WORKDIR /app

COPY package.json ./

RUN bun install

COPY . .

EXPOSE ${PORT}

CMD ["bun", "run", "start"]