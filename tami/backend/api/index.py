"""Vercel serverless entry point for FastAPI backend."""

from mangum import Mangum
from app.main import app

# Wrap FastAPI app with Mangum for serverless deployment
handler = Mangum(app, lifespan="off")
