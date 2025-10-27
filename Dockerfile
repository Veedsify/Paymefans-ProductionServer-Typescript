# Build stage
FROM node:22-alpine AS build
ARG CLOUDFLARE_WEBHOOK_CALLBACK
ENV CLOUDFLARE_WEBHOOK_CALLBACK=$CLOUDFLARE_WEBHOOK_CALLBACK

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

# Install base font packages and utilities
RUN apt-get update && apt-get install -y \
    fonts-helvetica \
    fonts-liberation \
    fonts-dejavu \
    fonts-freefont-ttf \
    fonts-roboto \
    fontconfig \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Optionally install Microsoft Core Fonts (includes Arial, Helvetica equivalents)
RUN curl -fsSL https://github.com/ryanoasis/nerd-fonts/releases/latest/download/CodeFonts.zip -o /tmp/fonts.zip \
    && unzip -o /tmp/fonts.zip -d /usr/share/fonts/truetype/ \
    && rm /tmp/fonts.zip

# Update font cache
RUN fc-cache -f -v

# Verify font installation
RUN fc-list | grep -i "helvetica\|arial\|dejavu\|liberation"

WORKDIR /app

# Install only runtime dependencies (if needed by your app)
# Remove this if your app doesn't need native modules at runtime
RUN apk add --no-cache libc-dev openssl-dev

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy built application and Prisma client from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/public ./public
COPY --from=build /app/views ./views

EXPOSE 3009

ENV NODE_ENV=production

CMD ["npm", "start"]
