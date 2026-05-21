FROM node:22-bookworm-slim AS app

WORKDIR /app

ENV NODE_ENV=production
ENV FRONTEND_DIST_DIR=/app/dist
ENV DATABASE_URL=postgresql://proposal_user:proposal_password@localhost:5432/proposal_management?schema=public

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run db:generate
RUN npm run build

EXPOSE 4000

CMD ["sh", "scripts/docker-entrypoint.sh"]
