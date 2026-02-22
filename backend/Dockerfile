FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json ./

RUN npm install --only=production && npm cache clean --force

COPY src ./src

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 && \
    mkdir -p /app/logs && \
    chown -R nodeapp:nodejs /app

USER nodeapp

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s \
    CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
