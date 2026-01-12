#!/bin/bash
set -e

echo "Starting Vercel build process..."

# Find Python venv and add to PATH (for prisma-client-py binary)
if [ -d "/vercel/path1/.vercel/python/.venv/bin" ]; then
    export PATH="/vercel/path1/.vercel/python/.venv/bin:$PATH"
fi

# Add node_modules/.bin to PATH for prisma command
export PATH="$PATH:./node_modules/.bin"

# Generate Prisma client from local schema
# This will run both JS and Python generators defined in schema.prisma
echo "Generating Prisma clients..."
npx prisma generate --schema=prisma/schema.prisma

echo "Build complete!"
