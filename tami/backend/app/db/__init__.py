"""Database initialization."""

from app.prisma_client import Prisma

# Prisma client instance
db = Prisma()


async def connect_db():
    """Connect to the database."""
    await db.connect()


async def disconnect_db():
    """Disconnect from the database."""
    await db.disconnect()
