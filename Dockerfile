# Frontend Dockerfile for Vite React app
# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app
# Install dependencies (use package.json and lock for caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# Copy source code
COPY . .
# Build the production assets
RUN npm run build

# ---- Production stage ----
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
