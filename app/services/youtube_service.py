import os
import shutil
import logging
from typing import Dict, Any, List, Optional
import yt_dlp

from app.services.video_service import VideoService

logger = logging.getLogger(__name__)

DOWNLOAD_DIR = os.path.join(os.getcwd(), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

class YouTubeService:
    """Service handling YouTube video metadata extraction and downloads via yt-dlp."""
    _info_cache: Dict[str, Any] = {}

    @staticmethod

    def is_ffmpeg_available() -> bool:
        """Check if FFmpeg binary is accessible in system or via static imageio-ffmpeg."""
        return VideoService.is_ffmpeg_available()

    @classmethod
    def get_video_info(cls, url_or_query: str) -> Dict[str, Any]:
        """Extract metadata and available formats for a given YouTube URL or text search query."""
        cache_key = url_or_query.strip().lower()
        if cache_key in cls._info_cache:
            logger.info(f"Serving cached YouTube info for: {url_or_query}")
            return cls._info_cache[cache_key]

        is_url = url_or_query.startswith(('http://', 'https://')) or 'youtu' in url_or_query
        target = url_or_query if is_url else f"ytsearch25:{url_or_query}"

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'getcomments': False,
            'extract_flat': True,
            'socket_timeout': 5,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl: 
                info = ydl.extract_info(target, download=False)
                if not info:
                    raise ValueError("Could not retrieve video information.")
                
                # If search query, extract top result and populate remaining as related
                related_search_entries = []
                if 'entries' in info and info['entries']:
                    entries = [e for e in info['entries'] if e and e.get('id')]
                    if not entries:
                        raise ValueError("No matching videos found for search query.")
                    
                    # Find first available valid entry
                    first_valid = None
                    for idx, entry in enumerate(entries):
                        # Skip entries marked unavailable or without title
                        if entry.get('title') and entry.get('title') != '[Video unavailable]':
                            first_valid = entry
                            related_search_entries = entries[idx+1:]
                            break
                    
                    if not first_valid:
                        info = entries[0]
                        related_search_entries = entries[1:]
                    else:
                        info = first_valid

                # Extract real YouTube comments
                raw_comments = info.get('comments') or []
                yt_comments = []
                for c in raw_comments[:15]:
                    if c and c.get('text'):
                        yt_comments.append({
                            'author': c.get('author') or c.get('author_id') or '@YouTubeUser',
                            'text': c.get('text'),
                            'timeAgo': c.get('time_text') or 'recently',
                            'likes': c.get('like_count') or 0
                        })

                video_formats: List[Dict[str, Any]] = []
                audio_formats: List[Dict[str, Any]] = []
                formats = info.get('formats', [])
                seen_resolutions = set()
                seen_bitrates = set()
                
                for f in formats:
                    format_id = f.get('format_id')
                    ext = f.get('ext')
                    vcodec = f.get('vcodec')
                    acodec = f.get('acodec')
                    height = f.get('height')
                    fps = f.get('fps')
                    filesize = f.get('filesize') or f.get('filesize_approx')
                    
                    if vcodec and vcodec != 'none' and height:
                        res_key = f"{height}p"
                        if res_key not in seen_resolutions:
                            seen_resolutions.add(res_key)
                            video_formats.append({
                                'format_id': format_id,
                                'resolution': res_key,
                                'height': height,
                                'ext': 'mp4',
                                'fps': fps,
                                'filesize': filesize
                            })
                    
                    if (vcodec == 'none' or not vcodec) and acodec and acodec != 'none':
                        abr = f.get('abr') or f.get('tbr') or 128
                        abr_int = int(abr)
                        abr_key = f"{abr_int}kbps"
                        if abr_key not in seen_bitrates:
                            seen_bitrates.add(abr_key)
                            audio_formats.append({
                                'format_id': format_id,
                                'bitrate': abr_key,
                                'abr': abr_int,
                                'ext': 'mp3',
                                'filesize': filesize
                            })

                video_formats.sort(key=lambda x: x['height'], reverse=True)
                audio_formats.sort(key=lambda x: x['abr'], reverse=True)

                # Build related videos list
                related_videos = []
                for entry in related_search_entries:
                    v_id = entry.get('id')
                    v_title = entry.get('title')
                    if v_id and v_title and v_title != '[Video unavailable]':
                        related_videos.append({
                            'id': v_id,
                            'title': v_title,
                            'uploader': entry.get('uploader') or entry.get('channel') or 'YouTube Channel',
                            'duration': entry.get('duration'),
                            'thumbnail': f"https://i.ytimg.com/vi/{v_id}/mqdefault.jpg",
                            'url': f"https://www.youtube.com/watch?v={v_id}"
                        })

                if not related_videos:
                    uploader = info.get('uploader') or info.get('channel') or ''
                    title = info.get('title') or ''
                    fallback_query = uploader if uploader else title[:20]
                    if fallback_query:
                        try:
                            rel_opts = {
                                'quiet': True,
                                'no_warnings': True,
                                'skip_download': True,
                                'extract_flat': 'in_playlist'
                            }
                            with yt_dlp.YoutubeDL(rel_opts) as rel_ydl:
                                rel_info = rel_ydl.extract_info(f"ytsearch20:{fallback_query}", download=False)
                                for item in (rel_info.get('entries') or []):
                                    v_id = item.get('id')
                                    if v_id and v_id != info.get('id') and item.get('title'):
                                        related_videos.append({
                                            'id': v_id,
                                            'title': item.get('title'),
                                            'uploader': item.get('uploader') or item.get('channel') or 'YouTube Channel',
                                            'duration': item.get('duration'),
                                            'thumbnail': f"https://i.ytimg.com/vi/{v_id}/mqdefault.jpg",
                                            'url': f"https://www.youtube.com/watch?v={v_id}"
                                        })
                        except Exception:
                            pass

                playlist_id = info.get('playlist_id') or info.get('playlist')
                playlist_url = info.get('playlist_url') or (f"https://www.youtube.com/playlist?list={playlist_id}" if playlist_id else None)

                raw_date = info.get('upload_date')
                date_str = ""
                if raw_date and len(raw_date) == 8:
                    date_str = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"

                sub_count = info.get('channel_follower_count') or info.get('subscriber_count')

                res_data = {
                    'id': info.get('id'),
                    'title': info.get('title'),
                    'description': info.get('description'),
                    'uploader': info.get('uploader') or info.get('channel'),
                    'channel_url': info.get('uploader_url') or info.get('channel_url'),
                    'channel_follower_count': sub_count,
                    'upload_date': date_str,
                    'duration': info.get('duration'),
                    'view_count': info.get('view_count'),
                    'like_count': info.get('like_count'),
                    'comment_count': info.get('comment_count'),
                    'thumbnail': info.get('thumbnail') or (f"https://i.ytimg.com/vi/{info.get('id')}/hqdefault.jpg" if info.get('id') else None),
                    'url': info.get('webpage_url') or f"https://www.youtube.com/watch?v={info.get('id')}",
                    'playlist_url': playlist_url,
                    'video_formats': video_formats,
                    'audio_formats': audio_formats,
                    'related_videos': related_videos,
                    'comments': yt_comments
                }
                cls._info_cache[cache_key] = res_data
                if res_data.get('id'):
                    cls._info_cache[res_data['id'].lower()] = res_data
                return res_data


        except Exception as e:
            err_str = str(e)
            logger.error(f"Error fetching YouTube info for {url_or_query}: {e}")
            raise RuntimeError(err_str.replace("ERROR: [youtube] ", "").strip())


    @staticmethod
    def download_media(
        url: str,
        media_type: str = "video",
        quality: Optional[str] = None
    ) -> Dict[str, Any]:
        """Download video or audio using yt-dlp."""
        out_template = os.path.join(DOWNLOAD_DIR, '%(title)s_%(id)s.%(ext)s')
        ffmpeg_bin = VideoService.get_ffmpeg_executable()

        ydl_opts: Dict[str, Any] = {
            'outtmpl': out_template,
            'quiet': True,
            'no_warnings': True,
            'restrictfilenames': True,
            'ffmpeg_location': ffmpeg_bin
        }

        has_ffmpeg = YouTubeService.is_ffmpeg_available()

        if media_type == "audio":
            ydl_opts['format'] = 'bestaudio/best'
            if has_ffmpeg:
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
        else:
            if has_ffmpeg:
                if quality and quality != "best":
                    clean_q = quality.replace('p', '')
                    ydl_opts['format'] = f'bestvideo[height<={clean_q}]+bestaudio/best[height<={clean_q}]/best'
                else:
                    ydl_opts['format'] = 'bestvideo+bestaudio/best'
                ydl_opts['merge_output_format'] = 'mp4'
            else:
                logger.info("FFmpeg not detected. Falling back to pre-merged progressive video stream.")
                if quality and quality != "best":
                    clean_q = quality.replace('p', '')
                    ydl_opts['format'] = f'best[height<={clean_q}][ext=mp4]/best[ext=mp4]/best'
                else:
                    ydl_opts['format'] = 'best[ext=mp4]/best'

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                downloaded_file = ydl.prepare_filename(info)
                
                if media_type == "audio" and has_ffmpeg:
                    base, _ = os.path.splitext(downloaded_file)
                    downloaded_file = base + ".mp3"

                if not os.path.exists(downloaded_file):
                    base, _ = os.path.splitext(downloaded_file)
                    for ext in [".mp4", ".m4a", ".webm", ".mkv"]:
                        if os.path.exists(base + ext):
                            downloaded_file = base + ext
                            break

                return {
                    'title': info.get('title'),
                    'file_path': downloaded_file,
                    'filename': os.path.basename(downloaded_file),
                    'filesize': os.path.getsize(downloaded_file) if os.path.exists(downloaded_file) else 0
                }
        except Exception as e:
            err_str = str(e)
            if "This video is not available" in err_str:
                msg = "This video is unavailable, private, or has been removed."
            else:
                msg = err_str.replace("ERROR: [youtube] ", "").strip()
            logger.error(f"Error downloading media from {url}: {e}")
            raise RuntimeError(msg)

    @staticmethod
    def get_playlist_info(url: str, max_videos: int = 10) -> Dict[str, Any]:
        """Extract metadata for a YouTube playlist up to max_videos limit (max 10)."""
        limit = min(max_videos, 10)
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist',
            'playlistend': limit
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    raise ValueError("Could not retrieve playlist information.")

                entries = info.get('entries', [])
                playlist_items = []
                for entry in entries[:limit]:
                    playlist_items.append({
                        'id': entry.get('id'),
                        'title': entry.get('title'),
                        'url': f"https://www.youtube.com/watch?v={entry.get('id')}",
                        'duration': entry.get('duration')
                    })

                return {
                    'title': info.get('title', 'YouTube Playlist'),
                    'total_entries': len(playlist_items),
                    'limit': limit,
                    'items': playlist_items
                }
        except Exception as e:
            logger.error(f"Error fetching playlist info for {url}: {e}")
            raise RuntimeError(f"Failed to fetch playlist info: {e}")

    @staticmethod
    def download_playlist(
        url: str,
        media_type: str = "video",
        quality: Optional[str] = None,
        max_videos: int = 10
    ) -> List[Dict[str, Any]]:
        """Download videos in a playlist up to max_videos limit (max 10)."""
        playlist_info = YouTubeService.get_playlist_info(url, max_videos=max_videos)
        download_results = []
        
        for item in playlist_info.get('items', []):
            try:
                res = YouTubeService.download_media(item['url'], media_type=media_type, quality=quality)
                download_results.append(res)
            except Exception as e:
                logger.error(f"Failed to download playlist item {item['title']}: {e}")
                download_results.append({
                    'title': item.get('title'),
                    'error': str(e)
                })

        return download_results

