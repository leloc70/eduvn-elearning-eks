# --- Build stage ---
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS build
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src

# --- Runtime stage ---
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Chạy bằng user không phải root, UID số cố định (để runAsNonRoot verify được)
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app
COPY --from=build --chown=1001:1001 /app/node_modules ./node_modules
COPY --from=build --chown=1001:1001 /app/src ./src
COPY --chown=1001:1001 package.json ./

USER 1001
EXPOSE 8080
CMD ["node", "src/index.js"]
