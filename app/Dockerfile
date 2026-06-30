# Build stage
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
COPY public ./public
# Committed lesson bundles (curriculum content, no pupil data) — so `node dist/seed/seedLessons.js`
# can materialise them inside the prod container. seedLessons resolves seed-content/lessons/ relative
# to dist/, so it must live at the image root; without this the prod seed prints "nothing to seed".
COPY seed-content ./seed-content
EXPOSE 44360
CMD ["node", "dist/server.js"]
