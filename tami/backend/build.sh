#!/bin/bash
set -e

echo "Starting Vercel build process..."

# Find Python venv dynamically and add to PATH
VENV_BIN=$(find /vercel -name "prisma-client-py" -type f 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
if [ -n "$VENV_BIN" ]; then
    echo "Found Python venv at: $VENV_BIN"
    export PATH="$VENV_BIN:$PATH"
else
    echo "Warning: Could not find prisma-client-py binary"
fi

# Add node_modules/.bin to PATH for prisma command
export PATH="$PATH:./node_modules/.bin"

# Generate Prisma client from local schema
# This will run both JS and Python generators defined in schema.prisma
echo "Generating Prisma clients..."
npx prisma generate --schema=prisma/schema.prisma

echo "Build complete!"
