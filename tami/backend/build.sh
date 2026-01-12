#!/bin/bash
set -e

echo "Starting Vercel build process..."

# Generate Prisma JS client only (Python client handled by pip install)
echo "Generating Prisma JS client..."
npx prisma generate --schema=prisma/schema.vercel.prisma

echo "Build complete!"
