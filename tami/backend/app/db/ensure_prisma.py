"""
Auto-generate Prisma client on first import in serverless environments.
This runs once per cold start and ensures the client is available.
"""
import os
import subprocess
import sys
from pathlib import Path
from loguru import logger


def ensure_prisma_client_generated():
    """Generate Prisma client if not already generated."""
    try:
        # Try importing to check if already generated
        import prisma
        # If we can access the client, it's already generated
        _ = prisma.Prisma
        return True
    except (ImportError, RuntimeError, AttributeError):
        # Client not generated, generate it now
        pass

    try:
        logger.info("Prisma client not found, generating...")

        # Find the schema file
        backend_dir = Path(__file__).parent.parent.parent
        schema_path = backend_dir / "prisma" / "schema.prisma"

        if not schema_path.exists():
            logger.error(f"Schema not found at {schema_path}")
            return False

        logger.info(f"Using schema: {schema_path}")

        # Generate the client
        # Use python -m prisma to ensure we're using the installed version
        result = subprocess.run(
            [sys.executable, "-m", "prisma", "generate", f"--schema={schema_path}"],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0:
            logger.info("✓ Prisma client generated successfully")
            logger.debug(result.stdout)
            return True
        else:
            logger.error(f"Failed to generate Prisma client:")
            logger.error(result.stdout)
            logger.error(result.stderr)
            return False

    except subprocess.TimeoutExpired:
        logger.error("Prisma generation timed out after 60 seconds")
        return False
    except Exception as e:
        logger.error(f"Error generating Prisma client: {e}")
        return False


# Run on module import
if not ensure_prisma_client_generated():
    logger.warning("Could not auto-generate Prisma client - manual generation may be required")
