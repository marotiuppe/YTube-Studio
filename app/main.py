import os
import logging
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, HttpUrl

from fastapi.middleware.cors import CORSMiddleware

from app.services.youtube_service import YouTubeService
from app.services.video_service import VideoService
from app.services.job_service import JobService

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("yt_studio")

app = FastAPI(
    title="YTube Studio",
    description="YTube Studio is the ultimate all-in-one utility for creators to download, cut, and mix video content."
)




# Enable CORS for Render cross-origin client requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint for Render monitoring."""
    return {"status": "ok", "service": "yt-studio", "ffmpeg_available": VideoService.is_ffmpeg_available()}


# Paths setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

# Ensure directories exist
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

# Mount static files and templates
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

import asyncio
import urllib.request

# Startup and Shutdown events
async def keep_alive_task():
    """Periodically ping external Render URL to prevent free-tier spin-down (every 10 min)."""
    url = os.environ.get("RENDER_EXTERNAL_URL")
    if not url:
        return
    health_url = f"{url.rstrip('/')}/health"
    while True:
        await asyncio.sleep(600)
        try:
            await asyncio.to_thread(urllib.request.urlopen, health_url, timeout=10)
            logger.info("Keep-alive ping sent to prevent Render sleep.")
        except Exception as e:
            logger.warning(f"Keep-alive ping error: {e}")

@app.on_event("startup")
async def startup_event():
    logger.info("Executing startup downloads cleanup...")
    VideoService.cleanup_downloads()
    asyncio.create_task(keep_alive_task())




@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Executing shutdown downloads cleanup...")
    VideoService.cleanup_downloads()

# Request Models
class InfoRequest(BaseModel):
    url: str

class PlaylistInfoRequest(BaseModel):
    url: str
    max_videos: int = 10

class DownloadRequest(BaseModel):
    url: str
    media_type: str = "video"
    quality: Optional[str] = "best"

class PlaylistDownloadRequest(BaseModel):
    url: str
    media_type: str = "video"
    quality: Optional[str] = "best"
    max_videos: int = 10

class TrimRequest(BaseModel):
    file_path: str
    start_time: str
    end_time: str
    accurate: bool = False
    output_format: Optional[str] = None

class SplitRequest(BaseModel):
    file_path: str
    part_count: int
    total_duration: float
    accurate: bool = False
    output_format: Optional[str] = None

class MixRequest(BaseModel):
    file_paths: List[str]
    output_format: Optional[str] = "mp4"

# Background Worker Functions
def run_download_job(job_id: str, url: str, media_type: str, quality: Optional[str]):
    JobService.update_job(job_id, status="processing", progress=20.0)
    try:
        res = YouTubeService.download_media(url, media_type=media_type, quality=quality)
        JobService.update_job(job_id, status="completed", progress=100.0, result=res)
    except Exception as e:
        JobService.update_job(job_id, status="failed", error=str(e))

def run_trim_job(job_id: str, file_path: str, start_time: str, end_time: str, accurate: bool, output_format: Optional[str]):
    JobService.update_job(job_id, status="processing", progress=20.0)
    try:
        res = VideoService.trim_media(file_path, start_time, end_time, accurate=accurate, output_format=output_format)
        JobService.update_job(job_id, status="completed", progress=100.0, result=res)
    except Exception as e:
        JobService.update_job(job_id, status="failed", error=str(e))

def run_split_job(job_id: str, file_path: str, part_count: int, total_duration: float, accurate: bool, output_format: Optional[str]):
    JobService.update_job(job_id, status="processing", progress=20.0)
    try:
        res = VideoService.split_media(file_path, part_count, total_duration, accurate=accurate, output_format=output_format)
        JobService.update_job(job_id, status="completed", progress=100.0, result=res)
    except Exception as e:
        JobService.update_job(job_id, status="failed", error=str(e))

def run_mix_job(job_id: str, file_paths: List[str], output_format: Optional[str]):
    JobService.update_job(job_id, status="processing", progress=20.0)
    try:
        res = VideoService.mix_media(file_paths, output_format=output_format)
        JobService.update_job(job_id, status="completed", progress=100.0, result=res)
    except Exception as e:
        JobService.update_job(job_id, status="failed", error=str(e))

def run_playlist_download_job(job_id: str, url: str, media_type: str, quality: Optional[str], max_videos: int):
    JobService.update_job(job_id, status="processing", progress=20.0)
    try:
        res = YouTubeService.download_playlist(url, media_type=media_type, quality=quality, max_videos=max_videos)
        JobService.update_job(job_id, status="completed", progress=100.0, result=res)
    except Exception as e:
        JobService.update_job(job_id, status="failed", error=str(e))

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve single-page frontend application."""
    index_path = os.path.join(TEMPLATES_DIR, "index.html")
    return FileResponse(index_path)

@app.post("/api/info")
async def get_info(payload: InfoRequest):
    """Fetch video metadata and available download formats asynchronously without blocking server workers."""
    try:
        info = await asyncio.to_thread(YouTubeService.get_video_info, payload.url)
        return {"success": True, "data": info}
    except Exception as e:
        logger.error(f"Failed to fetch info: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/playlist/info")
async def get_playlist_info(payload: PlaylistInfoRequest):
    """Fetch playlist metadata up to max 10 items."""
    try:
        info = YouTubeService.get_playlist_info(payload.url, max_videos=payload.max_videos)
        return {"success": True, "data": info}
    except Exception as e:
        logger.error(f"Failed to fetch playlist info: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/download")
async def download_media(payload: DownloadRequest, background_tasks: BackgroundTasks):
    """Dispatch asynchronous media download job."""
    job_id = JobService.create_job("download")
    background_tasks.add_task(run_download_job, job_id, payload.url, payload.media_type, payload.quality)
    return {"success": True, "job_id": job_id, "message": "Download task dispatched successfully."}

@app.post("/api/playlist/download")
async def download_playlist(payload: PlaylistDownloadRequest, background_tasks: BackgroundTasks):
    """Dispatch asynchronous playlist download job."""
    job_id = JobService.create_job("playlist_download")
    background_tasks.add_task(
        run_playlist_download_job,
        job_id,
        payload.url,
        payload.media_type,
        payload.quality,
        payload.max_videos
    )
    return {"success": True, "job_id": job_id, "message": "Playlist download task dispatched successfully."}

@app.post("/api/trim")
async def trim_video(payload: TrimRequest, background_tasks: BackgroundTasks):
    """Dispatch asynchronous trimming job."""
    job_id = JobService.create_job("trim")
    background_tasks.add_task(
        run_trim_job,
        job_id,
        payload.file_path,
        payload.start_time,
        payload.end_time,
        payload.accurate,
        payload.output_format
    )
    return {"success": True, "job_id": job_id, "message": "Trimming task dispatched successfully."}

@app.post("/api/split")
async def split_video(payload: SplitRequest, background_tasks: BackgroundTasks):
    """Dispatch asynchronous splitting job."""
    job_id = JobService.create_job("split")
    background_tasks.add_task(
        run_split_job,
        job_id,
        payload.file_path,
        payload.part_count,
        payload.total_duration,
        payload.accurate,
        payload.output_format
    )
    return {"success": True, "job_id": job_id, "message": "Splitting task dispatched successfully."}

@app.post("/api/mix")
async def mix_videos(payload: MixRequest, background_tasks: BackgroundTasks):
    """Dispatch asynchronous video/audio mixing/concatenation job."""
    job_id = JobService.create_job("mix")
    background_tasks.add_task(
        run_mix_job,
        job_id,
        payload.file_paths,
        payload.output_format
    )
    return {"success": True, "job_id": job_id, "message": "Mixing task dispatched successfully."}

@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Retrieve current background job status and progress."""
    job = JobService.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job ID not found.")
    return {"success": True, "data": job}

class SessionCloseRequest(BaseModel):
    session_id: str

@app.post("/api/session/close")
async def close_session(payload: SessionCloseRequest):
    """Purge all server files associated with the closing session."""
    removed_count = VideoService.cleanup_session(payload.session_id)
    return {"success": True, "session_id": payload.session_id, "files_removed": removed_count}

@app.get("/manifest.json")
async def get_manifest():
    """Serve PWA Web App Manifest."""
    return FileResponse(os.path.join(STATIC_DIR, "manifest.json"))

@app.get("/sw.js")
async def get_service_worker():
    """Serve PWA Service Worker script."""
    return FileResponse(os.path.join(STATIC_DIR, "sw.js"), media_type="application/javascript")

@app.get("/api/download-file")
async def get_downloaded_file(path: str):
    """Stream or download processed file directly from server disk."""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Requested file does not exist.")
    return FileResponse(path, filename=os.path.basename(path))



