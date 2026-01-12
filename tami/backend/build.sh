#!/bin/bash
set -e

echo "Starting Vercel build process..."

# Install dependencies (handled by Vercel automatically via requirements.txt)

# Generate Prisma client from local schema
# This will run both JS and Python generators defined in schema.prisma
echo "Generating Prisma clients..."
prisma generate --schema=prisma/schema.prisma

echo "Build complete!"
