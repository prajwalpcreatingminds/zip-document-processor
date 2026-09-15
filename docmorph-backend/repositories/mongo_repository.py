import asyncio
from datetime import datetime, timezone
from typing import Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError

from config.settings import settings
from app.utils.logger import logger


class MongoRepository:
    _client: Optional[AsyncIOMotorClient] = None

    @classmethod
    def get_client(cls) -> Optional[AsyncIOMotorClient]:
        if not settings.ENABLE_MONGODB:
            return None

        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if cls._client is not None:
            try:
                client_loop = cls._client.get_io_loop()
                if client_loop.is_closed() or (current_loop and client_loop != current_loop):
                    cls._client = None
            except Exception:
                cls._client = None

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

    @classmethod
    def get_jobs_collection(cls):
        client = cls.get_client()
        if client is not None:
            db = client[settings.MONGODB_DB_NAME]
            return db["jobs"]
        return None

    @classmethod
    async def create_or_update_job(cls, job_id: str, job_data: dict[str, Any]) -> bool:
        """
        Creates or updates a persistent job record in MongoDB.
        """
        if not settings.ENABLE_MONGODB:
            return False

        try:
            col = cls.get_jobs_collection()
            if col is None:
                return False

            now = datetime.now(timezone.utc)
            update_fields = {**job_data, "updated_at": now}
            set_on_insert = {"created_at": now}

            await col.update_one(
                {"job_id": job_id},
                {"$set": update_fields, "$setOnInsert": set_on_insert},
                upsert=True,
            )
            return True
        except Exception as e:
            logger.warning(f"Failed to save job '{job_id}' to MongoDB: {e}")
            return False

    @classmethod
    async def update_job_stage(
        cls,
        job_id: str,
        stage: str,
        step: Optional[int] = None,
        is_unfinished: Optional[bool] = None,
        **kwargs,
    ) -> bool:
        """
        Updates the stage/step and arbitrary metadata fields for an active job.
        """
        if not settings.ENABLE_MONGODB:
            return False

        try:
            col = cls.get_jobs_collection()
            if col is None:
                return False

            now = datetime.now(timezone.utc)
            fields: dict[str, Any] = {"stage": stage, "updated_at": now, **kwargs}
            if step is not None:
                fields["step"] = step
            if is_unfinished is not None:
                fields["is_unfinished"] = is_unfinished

            await col.update_one(
                {"job_id": job_id},
                {"$set": fields},
                upsert=False,
            )
            return True
        except Exception as e:
            logger.warning(f"Failed to update job stage for '{job_id}': {e}")
            return False

    @classmethod
    async def get_unfinished_jobs(cls) -> list[dict[str, Any]]:
        """
        Queries all incomplete or user-saved unfinished jobs.
        """
        if not settings.ENABLE_MONGODB:
            return []

        try:
            col = cls.get_jobs_collection()
            if col is None:
                return []

            query = {
                "is_unfinished": True,
                "stage": {"$nin": ["DISCARDED", "REMOVED"]},
            }

            cursor = col.find(query).sort("updated_at", -1)
            records = []
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                if isinstance(doc.get("created_at"), datetime):
                    doc["created_at"] = doc["created_at"].isoformat() + "Z"
                if isinstance(doc.get("updated_at"), datetime):
                    doc["updated_at"] = doc["updated_at"].isoformat() + "Z"
                records.append(doc)
            return records
        except Exception as e:
            logger.warning(f"Failed to query unfinished jobs: {e}")
            return []

    @classmethod
    async def get_job(cls, job_id: str) -> Optional[dict[str, Any]]:
        """
        Retrieves a single job record by job_id.
        """
        if not settings.ENABLE_MONGODB:
            return None

        try:
            col = cls.get_jobs_collection()
            if col is None:
                return None

            doc = await col.find_one({"job_id": job_id})
            if doc:
                doc["_id"] = str(doc["_id"])
                if isinstance(doc.get("created_at"), datetime):
                    doc["created_at"] = doc["created_at"].isoformat() + "Z"
                if isinstance(doc.get("updated_at"), datetime):
                    doc["updated_at"] = doc["updated_at"].isoformat() + "Z"
            return doc
        except Exception as e:
            logger.warning(f"Failed to get job '{job_id}' from MongoDB: {e}")
            return None

    @classmethod
    async def delete_job(cls, job_id: str) -> bool:
        """
        Deletes or marks a job record as discarded in MongoDB.
        """
        if not settings.ENABLE_MONGODB:
            return False

        try:
            col = cls.get_jobs_collection()
            if col is None:
                return False

            res = await col.delete_one({"job_id": job_id})
            return res.deleted_count > 0
        except Exception as e:
            logger.warning(f"Failed to delete job '{job_id}': {e}")
            return False
