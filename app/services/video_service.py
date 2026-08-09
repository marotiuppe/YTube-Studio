import os
import shutil
import subprocess
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

EDITED_DIR = os.path.join(os.getcwd(), "downloads", "edited")
os.makedirs(EDITED_DIR, exist_ok=True)

class VideoService:
    """Service handling video manipulation (trimming, splitting) using FFmpeg."""

    @staticmethod
    def get_ffmpeg_executable() -> str:
        """Return path to ffmpeg executable, using system PATH or portable imageio-ffmpeg static binary."""
        system_ffmpeg = shutil.which('ffmpeg')
        if system_ffmpeg:
            return system_ffmpeg
        try:
            import imageio_ffmpeg
            exe = imageio_ffmpeg.get_ffmpeg_exe()
            if os.path.exists(exe):
                return exe
        except Exception as e:
            logger.warning(f"Failed to resolve imageio-ffmpeg static binary: {e}")
        return 'ffmpeg'

    @staticmethod
    def is_ffmpeg_available() -> bool:
        """Check if FFmpeg binary is accessible (system or static imageio-ffmpeg)."""
        exe = VideoService.get_ffmpeg_executable()
        return os.path.exists(exe) or shutil.which(exe) is not None

    @staticmethod
    def _run_ffmpeg_command(command: List[str]) -> None:
        """Run an FFmpeg command and log output/errors."""
        ffmpeg_bin = VideoService.get_ffmpeg_executable()
        command[0] = ffmpeg_bin
        
        try:
            logger.info(f"Running FFmpeg command: {' '.join(command)}")
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error: {e.stderr}")
            raise RuntimeError(f"FFmpeg process failed: {e.stderr}")
        except FileNotFoundError:
            logger.error("FFmpeg binary not found.")
            raise RuntimeError("FFmpeg binary is not available. Please install imageio-ffmpeg package.")

    @staticmethod
    def cleanup_downloads() -> int:
        """Clean up all temporary files in downloads and downloads/edited directories."""
        removed_count = 0
        downloads_root = os.path.join(os.getcwd(), "downloads")
        
        if not os.path.exists(downloads_root):
            return 0

        for root, _, files in os.walk(downloads_root):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    os.remove(file_path)
                    removed_count += 1
                except Exception as e:
                    logger.warning(f"Failed to remove file {file_path} during cleanup: {e}")
        
        logger.info(f"Cleaned up {removed_count} files from downloads directory.")
        return removed_count

    @staticmethod
    def cleanup_session(session_id: str) -> int:
        """Remove all downloaded/processed files associated with a specific user session."""
        if not session_id or ".." in session_id or "/" in session_id or "\\" in session_id:
            return 0
            
        downloads_root = os.path.join(os.getcwd(), "downloads")
        removed_count = 0
        
        # Remove files with session prefix or session folder
        for root, _, files in os.walk(downloads_root):
            for file in files:
                if session_id in file or session_id in root:
                    file_path = os.path.join(root, file)
                    try:
                        os.remove(file_path)
                        removed_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to remove session file {file_path}: {e}")
        
        logger.info(f"Cleaned up session '{session_id}': removed {removed_count} files.")
        return removed_count


    @staticmethod
    def trim_media(
        input_path: str,
        start_time: str,
        end_time: str,
        accurate: bool = False,
        output_format: Optional[str] = None
    ) -> Dict[str, Any]:
        """Trim media file between start_time and end_time, with optional frame-exact re-encoding."""
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        base_name = os.path.basename(input_path)
        name, orig_ext = os.path.splitext(base_name)
        ext = f".{output_format.lstrip('.')}" if output_format else orig_ext
        
        mode_suffix = "exact" if accurate else "fast"
        output_filename = f"{name}_trimmed_{start_time.replace(':', '-')}_to_{end_time.replace(':', '-')}_{mode_suffix}{ext}"
        output_path = os.path.join(EDITED_DIR, output_filename)

        codec_args = ['-c:v', 'libx264', '-c:a', 'copy'] if accurate else ['-c', 'copy']

        command = [
            'ffmpeg',
            '-y',
            '-ss', start_time,
            '-to', end_time,
            '-i', input_path,
            *codec_args,
            output_path
        ]

        VideoService._run_ffmpeg_command(command)

        return {
            'file_path': output_path,
            'filename': output_filename,
            'filesize': os.path.getsize(output_path) if os.path.exists(output_path) else 0,
            'accurate': accurate
        }

    @staticmethod
    def split_media(
        input_path: str,
        part_count: int,
        total_duration_seconds: float,
        accurate: bool = False,
        output_format: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Split a media file into equal N parts."""
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")
        if part_count <= 1:
            raise ValueError("Part count must be greater than 1 for splitting.")

        segment_duration = total_duration_seconds / part_count
        base_name = os.path.basename(input_path)
        name, orig_ext = os.path.splitext(base_name)
        ext = f".{output_format.lstrip('.')}" if output_format else orig_ext
        
        split_files: List[Dict[str, Any]] = []
        codec_args = ['-c:v', 'libx264', '-c:a', 'copy'] if accurate else ['-c', 'copy']

        for i in range(part_count):
            start_sec = i * segment_duration
            end_sec = (i + 1) * segment_duration if i < part_count - 1 else total_duration_seconds
            
            output_filename = f"{name}_part_{i+1}_of_{part_count}{ext}"
            output_path = os.path.join(EDITED_DIR, output_filename)
            
            command = [
                'ffmpeg',
                '-y',
                '-ss', str(start_sec),
                '-to', str(end_sec),
                '-i', input_path,
                *codec_args,
                output_path
            ]
            
            VideoService._run_ffmpeg_command(command)

            split_files.append({
                'part': i + 1,
                'file_path': output_path,
                'filename': output_filename,
                'filesize': os.path.getsize(output_path) if os.path.exists(output_path) else 0
            })

        import zipfile

        zip_filename = f"{name}_split_{part_count}_parts.zip"
        zip_filepath = os.path.join(EDITED_DIR, zip_filename)

        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for item in split_files:
                if os.path.exists(item['file_path']):
                    zipf.write(item['file_path'], arcname=item['filename'])

        return {
            'file_path': zip_filepath,
            'filename': zip_filename,
            'filesize': os.path.getsize(zip_filepath) if os.path.exists(zip_filepath) else 0,
            'parts_count': part_count,
            'parts': split_files
        }

    @staticmethod
    def mix_media(
        file_paths: List[str],
        output_format: Optional[str] = "mp4"
    ) -> Dict[str, Any]:
        """Mix/concatenate multiple media files into a single continuous video or audio file."""
        if not file_paths or len(file_paths) < 2:
            raise ValueError("At least 2 media files are required for mixing.")
            
        for path in file_paths:
            if not os.path.exists(path):
                raise FileNotFoundError(f"Input file not found: {path}")

        ext = f".{output_format.lstrip('.')}" if output_format else ".mp4"
        output_filename = f"mixed_video_{len(file_paths)}_clips{ext}"
        output_path = os.path.join(EDITED_DIR, output_filename)
        concat_list_file = os.path.join(EDITED_DIR, f"concat_list_{os.getpid()}.txt")

        try:
            with open(concat_list_file, "w", encoding="utf-8") as f:
                for path in file_paths:
                    safe_path = path.replace("\\", "/")
                    f.write(f"file '{safe_path}'\n")

            command = [
                'ffmpeg',
                '-y',
                '-f', 'concat',
                '-safe', '0',
                '-i', concat_list_file,
                '-c', 'copy',
                output_path
            ]
            VideoService._run_ffmpeg_command(command)
        finally:
            if os.path.exists(concat_list_file):
                try:
                    os.remove(concat_list_file)
                except Exception:
                    pass

        return {
            'file_path': output_path,
            'filename': output_filename,
            'filesize': os.path.getsize(output_path) if os.path.exists(output_path) else 0,
            'clips_count': len(file_paths)
        }

