"""Vercel serverless entry point for FastAPI backend."""

import sys
print(f"Python version: {sys.version}", file=sys.stderr)
print(f"Python path: {sys.path}", file=sys.stderr)

try:
    from app.main import app
    print(f"App imported successfully: {type(app)}", file=sys.stderr)
    print(f"App object: {app}", file=sys.stderr)
    # Vercel expects a handler variable
    handler = app
    print(f"Handler set: {type(handler)}", file=sys.stderr)
except Exception as e:
    print(f"Error importing app: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
    raise
