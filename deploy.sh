#!/bin/sh

# Run Prisma migrations (db push)
npx prisma db push

# Run Prisma generate
npx prisma generate

# Run Prisma seed (optional)
npx prisma db seed

# Start the application
# npm start
