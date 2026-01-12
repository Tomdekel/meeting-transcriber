#!/bin/bash
# Don't exit on error initially - we need to find paths first
echo "Starting Vercel build process..."

# Find Python venv - try common Vercel paths
VENV_PATHS=(
    "/vercel/path0/.vercel/python/.venv/bin"
    "/vercel/path1/.vercel/python/.venv/bin"
    "$HOME/.local/bin"
    "/usr/local/bin"
)

for venv_path in "${VENV_PATHS[@]}"; do
    if [ -d "$venv_path" ] && [ -f "$venv_path/prisma-client-py" ]; then
        echo "Found prisma-client-py at: $venv_path"
        export PATH="$venv_path:$PATH"
        break
    fi
done

# Add node_modules/.bin to PATH for prisma command
export PATH="$PATH:./node_modules/.bin"

# Now exit on errors
set -e

# Generate Prisma client from local schema
# This will run both JS and Python generators defined in schema.prisma
echo "Generating Prisma clients..."
npx prisma generate --schema=prisma/schema.prisma

echo "Build complete!"
