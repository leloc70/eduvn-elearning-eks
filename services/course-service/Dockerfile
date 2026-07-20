# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src

# --- Runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Chạy bằng user không phải root (bảo mật)
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/src ./src
COPY --chown=app:app package.json ./

USER app
EXPOSE 8080
CMD ["node", "src/index.js"]
