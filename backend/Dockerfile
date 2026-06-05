FROM node:20-alpine AS builder
WORKDIR /app

# Install production dependencies (no lock file in backend context)
COPY package.json ./
RUN npm ci --omit=dev

# Copy source code
COPY src ./src

EXPOSE 5000
CMD ["node", "src/app.js"]
