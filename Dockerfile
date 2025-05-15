FROM oven/bun:1 as build
WORKDIR /app
# Copy package files for better cache efficiency
COPY package.json ./
# Install dependencies and TypeScript globally
RUN bun install -g typescript
# Install dependencies
RUN bun install
# Copy the rest of the application files
COPY . .
# Prisma Generate (run migration and seed separately in production)
RUN bunx prisma generate
# Build the application
RUN bun run build


FROM oven/bun:1
# Set the working directory
WORKDIR /app

# Copy source files
COPY . .

# Copy built app from the build stage
COPY --from=build /app/dist ./dist

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN bun install --production

# Expose the correct port
EXPOSE 3009

# Set environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["bun", "start"]
