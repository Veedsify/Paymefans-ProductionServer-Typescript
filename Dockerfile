FROM node:22-alpine as build
WORKDIR /app
# Copy package files for better cache efficiency
COPY package.json ./
# Install dependencies and TypeScript globally
RUN npm install -g typescript
RUN npm install
# Copy the rest of the application files
COPY . .
# Prisma Generate (run migration and seed separately in production)
RUN npx prisma generate
# Build the application
RUN npm run build

FROM node:22-alpine
WORKDIR /app
# Copy built app from the build stage
COPY --from=build /app/dist ./dist
# Copy package files
COPY package*.json ./
# Install only production dependencies
RUN npm install --production
# Expose the correct port
EXPOSE 3009
# Set environment variable for production
ENV NODE_ENV=production
# Start the application
# RUN DEPLOY
