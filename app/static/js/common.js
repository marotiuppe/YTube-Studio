// common.js - Shared utilities across YTube Studio pages

// Network-based Quality Detection
function getNetworkBasedDefaultQuality() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return '720p';

    const type = conn.effectiveType;
    const downlink = conn.downlink;

    if (type === '4g' || (downlink && downlink >= 5)) {
        return '1080p';
    } else if (type === '3g' || (downlink && downlink >= 1.5)) {
        return '720p';
    } else {
        return '480p';
    }
}

function scrollMainContentToTop() {
    const mainElem = document.querySelector('.main-content');
    if (mainElem) {
        mainElem.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = n => n.toString().padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

// LocalStorage downloaded media list helper
const STORAGE_KEY_DOWNLOADED = 'yt_studio_downloaded_media';

function getDownloadedMediaList() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_DOWNLOADED)) || [];
    } catch {
        return [];
    }
}

function saveDownloadedMediaItem(item) {
    if (!item || !item.file_path) return;
    if (item.file_path.toLowerCase().endsWith('.zip') || (item.filename && item.filename.toLowerCase().endsWith('.zip'))) return;
    let list = getDownloadedMediaList();
    if (!list.some(m => m.file_path === item.file_path)) {
        list.unshift(item);
        localStorage.setItem(STORAGE_KEY_DOWNLOADED, JSON.stringify(list));
    }
}

function clearDownloadedMediaHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY_DOWNLOADED);
    } catch (e) {
        console.error('Failed to clear download history:', e);
    }
}

// Poll Background Job Progress
function pollJobProgress(jobId, onProgress, onSuccess, onError) {
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`/api/jobs/${jobId}`);
            const data = await res.json();
            if (data.success) {
                const job = data.data;
                if (onProgress && job.progress) {
                    onProgress(job.progress, job.status);
                }
                if (job.status === 'completed') {
                    clearInterval(interval);
                    if (onSuccess) onSuccess(job.result);
                } else if (job.status === 'failed') {
                    clearInterval(interval);
                    if (onError) onError(job.error || 'Job failed');
                }
            }
        } catch (e) {
            clearInterval(interval);
            if (onError) onError(e.message);
        }
    }, 1000);
}
