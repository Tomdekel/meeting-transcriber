"""Minimal test endpoint for Vercel."""

def handler(request):
    """Simple test handler."""
    return {
        "statusCode": 200,
        "body": "Test endpoint works!",
        "headers": {
            "Content-Type": "text/plain"
        }
    }
