from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config.settings import settings
from repositories.mongo_repository import MongoRepository
from app.api.routes import router as api_router
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Storage Directory: {settings.STORAGE_DIR}")
    logger.info(f"Temp Directory: {settings.TEMP_DIR}")
    # Attempt MongoDB ping
    if settings.ENABLE_MONGODB:
        client = MongoRepository.get_client()
        if client:
            try:
                await client.admin.command("ping")
                logger.info(f"Connected to MongoDB successfully at {settings.MONGODB_URI}")
            except Exception as e:
                logger.warning(f"MongoDB connection ping failed (app will continue without DB): {e}")
    yield
    # Shutdown
    if MongoRepository._client:
        MongoRepository._client.close()
        logger.info("Closed MongoDB connection.")
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="REST API for End-to-End ZIP Document Processing & Word-to-PDF Conversion",
    lifespan=lifespan,
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(api_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    mongo_status = "disabled"
    if settings.ENABLE_MONGODB:
        try:
            client = MongoRepository.get_client()
            if client:
                await client.admin.command("ping")
                mongo_status = "connected"
            else:
                mongo_status = "disconnected"
        except Exception:
            mongo_status = "disconnected"

    return {
        "status": "healthy",
        "mongodb": mongo_status,
        "storage_dir": str(settings.STORAGE_DIR),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
