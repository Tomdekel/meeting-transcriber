"""Vercel serverless entry point for FastAPI backend."""

from app.main import app

# Vercel expects a handler variable
handler = app
