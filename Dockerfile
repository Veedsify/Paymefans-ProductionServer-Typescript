# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Install system dependencies for native module compilation
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev \
    openssl-dev

ENV PYTHON=/usr/bin/python3

# Install TypeScript globally
RUN npm install -g typescript

# Copy package files and install all dependencies (including dev dependencies)
COPY package*.json ./
RUN npm ci --include=dev

# Copy source code
COPY . .

# Generate Prisma client and build the application
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install only runtime dependencies (if needed by your app)
# Remove this if your app doesn't need native modules at runtime
RUN apk add --no-cache libc-dev openssl-dev

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application and Prisma client from build stage
COPY --from=build /app/dist ./dist
COPY --from=build tsconfig.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3009

ENV NODE_ENV=production

CMD ["npm", "start"]
