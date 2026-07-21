FROM node:22.22.0-alpine3.23 AS deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:22.22.0-alpine3.23
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S -G app app
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --chown=app:app backend ./backend
USER app
EXPOSE 4001
CMD ["node", "backend/server.js"]
