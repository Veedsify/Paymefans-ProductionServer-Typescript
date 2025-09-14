# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Install system dependencies for native module compilation
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    libc-dev \
    openssl-dev

# Set Python environment variable for node-gyp
ENV PYTHON=/usr/bin/python3

# Copy package files for better cache efficiency
COPY package.json package-lock.json* ./

# Copy prisma schema first (required for prisma generate)
COPY prisma ./prisma

# Install dependencies and TypeScript globally
RUN npm install -g typescript

# Install dependencies (including dev for build)
RUN npm install

# Generate Prisma client (needed for TypeScript build)
RUN npx prisma generate

# Copy the rest of the application files
COPY . .

# Build the application
RUN npm run build


# Production stage
FROM node:22-alpine

WORKDIR /app

# Install system dependencies for runtime
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev \
    openssl-dev

ENV PYTHON=/usr/bin/python3

# Copy only necessary files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built app and Prisma client from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma

# Run migrations & seeds
RUN npx prisma migrate deploy
RUN npx prisma db seed

EXPOSE 3009
ENV NODE_ENV=production

CMD ["npm", "start"]
