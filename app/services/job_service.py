import uuid
import time
from typing import Dict, Any, Optional

class JobService:
    """In-memory service managing asynchronous background task statuses and progress tracking."""

    _jobs: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def create_job(cls, job_type: str) -> str:
        """Create a new job record and return its unique job ID."""
        job_id = str(uuid.uuid4())
        cls._jobs[job_id] = {
            "id": job_id,
            "type": job_type,
            "status": "pending",
            "progress": 0.0,
            "result": None,
            "error": None,
            "created_at": time.time(),
            "updated_at": time.time()
        }
        return job_id

    @classmethod
    def update_job(
        cls,
        job_id: str,
        status: Optional[str] = None,
        progress: Optional[float] = None,
        result: Optional[Any] = None,
        error: Optional[str] = None
    ) -> None:
        """Update fields of an existing job."""
        if job_id not in cls._jobs:
            return
        
        job = cls._jobs[job_id]
        if status is not None:
            job["status"] = status
        if progress is not None:
            job["progress"] = min(max(progress, 0.0), 100.0)
        if result is not None:
            job["result"] = result
        if error is not None:
            job["error"] = error
        job["updated_at"] = time.time()

    @classmethod
    def get_job(cls, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve job status details by job ID."""
        return cls._jobs.get(job_id)
