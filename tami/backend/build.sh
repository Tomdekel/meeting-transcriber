#!/bin/bash
# Don't exit on error initially - we need to find paths first
echo "Starting Vercel build process..."

# Debug: Show environment
echo "Python version: $(python3 --version 2>&1 || echo 'not found')"
echo "Which python3: $(which python3 2>&1 || echo 'not found')"
echo "Checking for prisma-client-py..."

# Try to find prisma-client-py using Python
PRISMA_PY_BIN=$(python3 -c "import sys; import os; paths = [os.path.join(p, 'prisma-client-py') for p in sys.path]; existing = [p for p in paths if os.path.exists(p)]; print(existing[0] if existing else '')" 2>/dev/null)

if [ -n "$PRISMA_PY_BIN" ]; then
    VENV_BIN=$(dirname "$PRISMA_PY_BIN")
    echo "Found prisma-client-py at: $VENV_BIN"
    export PATH="$VENV_BIN:$PATH"
else
    # Try common paths
    for venv_path in "/vercel/path0/.vercel/python/.venv/bin" "/vercel/path1/.vercel/python/.venv/bin"; do
        if [ -f "$venv_path/prisma-client-py" ]; then
            echo "Found prisma-client-py at: $venv_path"
            export PATH="$venv_path:$PATH"
            break
        fi
    done
fi

# Add node_modules/.bin to PATH for prisma command
export PATH="$PATH:./node_modules/.bin"

# Check if prisma-client-py is now in PATH
echo "prisma-client-py location: $(which prisma-client-py 2>&1 || echo 'not found in PATH')"

# Now exit on errors
set -e

# Generate Prisma client from local schema
# This will run both JS and Python generators defined in schema.prisma
echo "Generating Prisma clients..."
npx prisma generate --schema=prisma/schema.prisma

echo "Build complete!"
