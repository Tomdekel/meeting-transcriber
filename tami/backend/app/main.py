"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.db import connect_db, disconnect_db
from app.api.routes import upload, transcribe, sessions, chat, record
from app.api.routes import settings as settings_router

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")

    # Connect to database
    try:
        await connect_db()
        logger.info("Database connected")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        logger.warning("Server starting without database connection")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info(f"Shutting down {settings.APP_NAME}")

    # Disconnect from database
    try:
        await disconnect_db()
        logger.info("Database disconnected")
    except Exception as e:
        logger.error(f"Failed to disconnect from database: {e}")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Include API routers
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(transcribe.router, prefix="/api", tags=["transcribe"])
app.include_router(sessions.router, prefix="/api", tags=["sessions"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(record.router, prefix="/api", tags=["record"])
app.include_router(settings_router.router, prefix="/api", tags=["settings"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
