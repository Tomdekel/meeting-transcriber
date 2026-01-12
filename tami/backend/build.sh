#!/bin/bash
set -e

echo "Starting Vercel build process..."

# Install dependencies (handled by Vercel automatically via requirements.txt)

# Generate Prisma client from local schema copy
echo "Generating Prisma client..."
prisma py generate --schema=prisma/schema.prisma

echo "Build complete!"
