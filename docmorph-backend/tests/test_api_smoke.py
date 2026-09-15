import sys
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app
from config.settings import settings
from repositories.mongo_repository import MongoRepository
from app.models.models import ConversionRecordModel
from app.schemas.schemas import UploadResponse, ExtractionResponse, ConversionResponse


def test_app_initialization():
    assert app is not None
    assert app.title == settings.APP_NAME
    print("[OK] App initialization test passed")


def test_routes_registered():
    routes = [r.path for r in app.routes if hasattr(r, "path")]
    # Also get routes from included APIRouter
    from app.api.routes import router as api_router
    api_routes = [f"/api{r.path}" if not r.path.startswith("/api") else r.path for r in api_router.routes if hasattr(r, "path")]
    all_paths = set(routes + api_routes)
    
    assert "/" in all_paths
    assert "/api/health" in all_paths
    assert "/api/upload" in all_paths
    assert "/api/extract" in all_paths
    assert "/api/convert" in all_paths
    assert "/api/status/{job_id}" in all_paths
    assert "/api/history" in all_paths
    assert "/api/file-tree/{job_id}" in all_paths
    assert "/api/pdf/view" in all_paths
    assert "/api/jobs/unfinished" in all_paths
    assert "/api/jobs/resume/{job_id}" in all_paths
    assert "/api/jobs/save-exit" in all_paths
    print(f"[OK] All routes registered correctly ({len(all_paths)} routes found)")


def test_root_endpoint():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["app"] == settings.APP_NAME
    print("[OK] Root endpoint (/) test passed:", data)


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    print("[OK] Health endpoint (/api/health) test passed:", data)


if __name__ == "__main__":
    test_app_initialization()
    test_routes_registered()
    test_root_endpoint()
    test_health_endpoint()
    print("\nAll Backend verification tests passed successfully!")
