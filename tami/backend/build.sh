#!/bin/bash
set -e

echo "Starting Vercel build process..."

# Install dependencies (handled by Vercel automatically via requirements.txt)

# Generate Prisma client from shared schema
echo "Generating Prisma client..."
prisma generate --schema=../shared/prisma/schema.prisma

echo "Build complete!"
