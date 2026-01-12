"""Database initialization."""

# Ensure Prisma client is generated (auto-generates in serverless on first import)
from app.db.ensure_prisma import ensure_prisma_client_generated
ensure_prisma_client_generated()

from prisma import Prisma

# Prisma client instance
db = Prisma()


async def connect_db():
    """Connect to the database."""
    await db.connect()


async def disconnect_db():
    """Disconnect from the database."""
    await db.disconnect()
