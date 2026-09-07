from datetime import datetime, timezone
from typing import Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError

from app.config.settings import settings
from app.utils.logger import logger


class MongoRepository:
    _client: Optional[AsyncIOMotorClient] = None

    @classmethod
    def get_client(cls) -> Optional[AsyncIOMotorClient]:
        if not settings.ENABLE_MONGODB:
            return None
        if cls._client is None:
            try:
                cls._client = AsyncIOMotorClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=2000
                )
            except Exception as e:
                logger.warning(f"Could not initialize MongoDB client: {e}")
                cls._client = None
        return cls._client

    @classmethod
    def get_collection(cls):
        client = cls.get_client()
        if client is not None:
            db = client[settings.MONGODB_DB_NAME]
            return db[settings.MONGODB_COLLECTION_NAME]
        return None

    @classmethod
    async def save_conversion_record(
        cls,
        job_id: str,
        word_filename: str,
        source_folder: str,
        pdf_filename: Optional[str] = None,
        status: str = "SUCCESS",
        error_message: Optional[str] = None,
        duration_seconds: Optional[float] = None,
    ) -> Optional[str]:
        """
        Inserts a single conversion metadata record into MongoDB.
        """
        if not settings.ENABLE_MONGODB:
            return None

        try:
            collection = cls.get_collection()
            if collection is None:
                return None

            record = {
                "jobId": job_id,
                "wordFileName": word_filename,
                "pdfFileName": pdf_filename,
                "sourceFolder": source_folder,
                "convertedAt": datetime.now(timezone.utc),
                "conversionStatus": status,
                "errorMessage": error_message,
                "durationSeconds": duration_seconds,
            }
            result = await collection.insert_one(record)
            return str(result.inserted_id)
        except Exception as e:
            logger.warning(f"Failed to save metadata record to MongoDB: {e}")
            return None

    @classmethod
    async def save_batch_records(
        cls,
        job_id: str,
        source_folder: str,
        results: list[dict[str, Any]],
    ) -> int:
        """
        Saves a batch of conversion results to MongoDB.
        """
        if not settings.ENABLE_MONGODB or not results:
            return 0

        saved_count = 0
        for res in results:
            rec_id = await cls.save_conversion_record(
                job_id=job_id,
                word_filename=res.get("word_filename", ""),
                pdf_filename=res.get("pdf_filename"),
                source_folder=source_folder,
                status=res.get("status", "SUCCESS"),
                error_message=res.get("error_message"),
                duration_seconds=res.get("duration_seconds"),
            )
            if rec_id:
                saved_count += 1
        return saved_count

    @classmethod
    async def get_conversion_history(
        cls,
        folder_name: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """
        Retrieves conversion history from MongoDB.
        """
        if not settings.ENABLE_MONGODB:
            return []

        try:
            collection = cls.get_collection()
            if collection is None:
                return []

            query: dict[str, Any] = {}
            if folder_name:
                query["sourceFolder"] = {"$regex": folder_name, "$options": "i"}
            if status:
                query["conversionStatus"] = status.upper()

            cursor = collection.find(query).sort("convertedAt", -1).limit(limit)
            records = []
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                if isinstance(doc.get("convertedAt"), datetime):
                    doc["convertedAt"] = doc["convertedAt"].isoformat() + "Z"
                records.append(doc)
            return records
        except Exception as e:
            logger.warning(f"Failed to query MongoDB conversion history: {e}")
            return []
