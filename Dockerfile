# backend/Dockerfile
FROM node:20-alpine AS base

# Install dependencies for Tesseract OCR
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-data-hin \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 && \
    mkdir -p /app/logs && \
    chown -R nodeapp:nodejs /app

USER nodeapp

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
    CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
