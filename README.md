# YTube Video DCM ⚡✂️🎛️

**YTube Video DCM** is an intuitive, all-in-one web utility inspired by YouTube for content creators, video editors, and media enthusiasts. It enables users to search, stream, download, cut, split, and mix YouTube video and audio content seamlessly within a single responsive web interface.

Built for speed, ultra-responsiveness, and modern user experience, this application handles everything from pulling raw web streams and parsing high-definition resolutions to frame-exact trimming, equal episode splitting, and multi-clip concatenation.

---

## 🏗️ Application Architecture & Tech Stack

```
[ User Browser / Mobile App (PWA) ]
                │
                ▼ (HTTP REST API / JSON)
[ FastAPI Web Backend (app/main.py) ]
      ├── [ YouTube Metadata & Stream Engine (yt-dlp) ]
      ├── [ Media Processing & Editing Engine (FFmpeg) ]
      └── [ Non-Blocking Background Job Service (JobService) ]
```

### Core Stack & Technologies
- **Backend**: Python 3.9+, FastAPI, Uvicorn (ASGI Web Server), Asyncio, Pydantic
- **Media Engine**: `yt-dlp` (Stream & Metadata Extraction), `FFmpeg` / `imageio-ffmpeg` (Video Manipulation)
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Custom CSS3 (Modern Glassmorphism, YouTube Dark/Light Aesthetics)
- **Icons & Typography**: Lucide Icons, Google Fonts (Inter / Outfit)
- **PWA & Caching**: Service Worker (`sw.js`), Web App Manifest (`manifest.json`), LocalStorage Client Caching

---

## 📁 Repository & Project Structure

```
YT-Studio/
├── app/
│   ├── main.py                   # FastAPI application routes & background task dispatchers
│   ├── services/
│   │   ├── youtube_service.py    # yt-dlp metadata extraction & download engine
│   │   ├── video_service.py      # FFmpeg video trimming, splitting & mixing operations
│   │   └── job_service.py        # Asynchronous job status & progress tracker
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css         # Complete UI design system & responsive layout styles
│   │   ├── js/
│   │   │   └── app.js            # Single-Page Application client logic & API handlers
│   │   ├── img/                  # Logo, favicon & branding assets
│   │   ├── manifest.json         # PWA Manifest specification
│   │   └── sw.js                 # PWA Service Worker offline caching script
│   └── templates/
│       └── index.html            # Single-Page Application HTML index layout
├── downloads/                    # Temporary server storage for downloaded & edited files
├── requirements.txt              # Python dependency manifest
├── render.yaml                   # Render.com deployment blueprint
└── README.md                     # Application documentation
```

---

## 🌟 Detailed Application Features

### 1. ⚡ Downloader Tab
- **Smart Search & URL Parsing**: Paste any YouTube video URL, short link, or plain text search query.
- **Resolution & Format Selection**: Select video resolutions (1080p, 720p, 480p, 360p) or audio-only extraction (192kbps MP3).
- **Instant Client Caching**: Frequently accessed video metadata renders instantly from LocalStorage cache.

### 2. ✂️ Video Trimmer Tab
- **Precision Time Cutting**: Specify start time (`HH:MM:SS`) and end time (`HH:MM:SS`) to trim exact video segments.
- **High-Speed vs Frame-Exact Modes**:
  - *Fast Mode (`accurate=False`)*: Lossless stream copy (`-c copy`) executing in seconds.
  - *Exact Mode (`accurate=True`)*: Video re-encoding (`-c:v libx264`) for frame-exact accuracy.
- **Live HTML5 Preview**: Watch the selected video clip inside the embedded HTML5 preview player.

### 3. 🧩 Video Splitter Tab
- **Equal Episode Splitting**: Split long videos into $N$ equal parts automatically (e.g., dividing a 1-hour stream into four 15-minute episodes).
- **Auto Zip / Individual Downloads**: Download all split segments with a single click.

### 4. 🎛️ Video & Audio Mixer Tab
- **Multi-Clip Library Selection**: Click clips from your local media library to add them to your mixing queue.
- **Concatenation Engine**: Combine multiple video/audio clips into one continuous stream file.
- **Format Options**: Export final mix as MP4, WebM, MKV, or MP3.

### 5. 📜 Playlist Batch Downloader Tab
- **Batch Processing**: Download up to 10 videos in a YouTube playlist concurrently.
- **Progress Tracking**: Real-time background job updates for each item in the playlist.

### 6. 🎬 YouTube-Inspired Ultra-Responsive Design
- **Sticky Layout**: Header navbar, category chips carousel, and left mini-sidebar remain sticky while scrolling down.
- **YouTube Search History Overlay**: Interactive dropdown showing recent search history and saved bookmarks without double borders or focus shift.
- **Dynamic 16:9 Aspect Player**: Dynamic player container automatically adapts to video aspect ratios without letterboxing.
- **20-Item "Up Next" Feed**: Displays 20 related recommendations in the sidebar.

### 7. 🧹 Storage & Session Lifecycle Management
- **Startup & Shutdown Cleanup**: Cleans up temporary downloaded files on server startup and shutdown.
- **Session Close Purge**: Client sends `POST /api/session/close` on tab exit to delete temporary user files.

---

## 🛠️ REST API Specification

| Endpoint | Method | Payload / Params | Description |
| :--- | :--- | :--- | :--- |
| `GET /` | `GET` | None | Serves the main Single-Page Application HTML. |
| `GET /health` | `GET` | None | Health check endpoint for server and FFmpeg binary status. |
| `POST /api/info` | `POST` | `{ "url": "..." }` | Extracts video metadata, formats, and related videos. |
| `POST /api/playlist/info` | `POST` | `{ "url": "...", "max_videos": 10 }` | Extracts playlist items metadata. |
| `POST /api/download` | `POST` | `{ "url": "...", "media_type": "video", "quality": "1080p" }` | Dispatches background download job (returns `job_id`). |
| `POST /api/playlist/download` | `POST` | `{ "url": "...", "media_type": "video", "quality": "best" }` | Dispatches background playlist download job (returns `job_id`). |
| `POST /api/trim` | `POST` | `{ "file_path": "...", "start_time": "00:01:00", "end_time": "00:03:00" }` | Dispatches background trimming job (returns `job_id`). |
| `POST /api/split` | `POST` | `{ "file_path": "...", "part_count": 3, "total_duration": 600 }` | Dispatches background splitting job into $N$ parts. |
| `POST /api/mix` | `POST` | `{ "file_paths": ["...", "..."], "output_format": "mp4" }` | Dispatches background media concatenation job for multiple clips. |
| `GET /api/jobs/{job_id}` | `GET` | None | Returns live status (`pending`, `processing`, `completed`, `failed`) and progress. |
| `POST /api/session/close` | `POST` | `{ "session_id": "..." }` | Purges temporary server files for a closing user session. |
| `GET /api/download-file` | `GET` | `?path=...` | Streams or downloads a processed file to client device. |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.9+
- FFmpeg (optional; auto-resolved via `imageio-ffmpeg` static binary if not installed globally)

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/maroti-uppe/YT-Studio.git
cd YT-Studio
pip install -r requirements.txt
```

### Step 2: Run Application Locally
```bash
uvicorn app.main:app --reload --port 8000
```
Open `http://localhost:8000` in your web browser.

### Step 3: Deploy to Render.com
1. Connect your repository to **Render.com**.
2. Select **Web Service** deployment.
3. Render automatically reads `render.yaml` and starts the app with self keep-alive enabled.

---

## 👤 Developer & Attribution

Developed with ❤️ in **India**  
By **Maroti Uppe** (Software Developer)  
© 2026 **YTube Video DCM**. All rights reserved.
