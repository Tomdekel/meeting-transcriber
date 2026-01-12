"""Vercel serverless entry point for FastAPI backend."""

import sys
import traceback

try:
    from mangum import Mangum
    from app.main import app

    # Wrap FastAPI app with Mangum for serverless deployment
    handler = Mangum(app, lifespan="off")

    print("✓ Handler created successfully", file=sys.stderr)
except Exception as e:
    print(f"✗ Error creating handler: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    raise
