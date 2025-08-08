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
    libc-dev

# Set Python environment variable for node-gyp
ENV PYTHON=/usr/bin/python3

# Copy package files for better cache efficiency
COPY package.json package-lock.json* ./

# Install dependencies and TypeScript globally
RUN npm install -g typescript

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Prisma Generate (run migration and seed separately in production)
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Install system dependencies for runtime
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

# Set Python environment variable for node-gyp
ENV PYTHON=/usr/bin/python3

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm install 

# Copy built app from the build stage
COPY --from=build /app/dist ./dist

# Copy other necessary files
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma

# Expose the correct port
EXPOSE 3009

# Set environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
