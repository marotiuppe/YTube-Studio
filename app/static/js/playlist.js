// playlist.js - Playlist Batch Downloader Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const formPlaylistFetch = document.getElementById('form-playlist-fetch');
    const inputPlaylistUrl = document.getElementById('input-playlist-url');
    const loaderPlaylistInfo = document.getElementById('loader-playlist-info');
    const cardPlaylistInfo = document.getElementById('card-playlist-info');
    const txtPlaylistTitle = document.getElementById('txt-playlist-title');
    const txtPlaylistCount = document.getElementById('txt-playlist-count');
    const containerPlaylistItems = document.getElementById('container-playlist-items');
    const btnStartPlaylistDownload = document.getElementById('btn-start-playlist-download');
    let currentPlaylistData = null;

    const progressContainer = document.getElementById('progress-container');
    const txtProgressStatus = document.getElementById('txt-progress-status');
    const txtProgressPercent = document.getElementById('txt-progress-percent');
    const progressFill = document.getElementById('progress-fill');

    if (formPlaylistFetch) {
        formPlaylistFetch.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = inputPlaylistUrl ? inputPlaylistUrl.value.trim() : '';
            if (!url) return;

            if (cardPlaylistInfo) cardPlaylistInfo.classList.add('hidden');
            if (loaderPlaylistInfo) loaderPlaylistInfo.classList.remove('hidden');

            try {
                const res = await fetch('/api/playlist/info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url, max_videos: 10 })
                });
                const result = await res.json();
                if (result.success && result.data) {
                    currentPlaylistData = result.data;
                    if (txtPlaylistTitle) txtPlaylistTitle.textContent = currentPlaylistData.title || 'YouTube Playlist';
                    if (txtPlaylistCount) txtPlaylistCount.textContent = `${currentPlaylistData.total_entries || 0} items found`;
                    
                    if (containerPlaylistItems) {
                        containerPlaylistItems.innerHTML = '';
                        (currentPlaylistData.items || []).forEach((item, idx) => {
                            const row = document.createElement('div');
                            row.className = 'playlist-item-row';
                            row.innerHTML = `
                                <span><strong>${idx + 1}.</strong> ${item.title}</span>
                                <span>${formatDuration(item.duration)}</span>
                            `;
                            containerPlaylistItems.appendChild(row);
                        });
                    }
                    if (cardPlaylistInfo) cardPlaylistInfo.classList.remove('hidden');
                }
            } catch (err) {
                alert(`Playlist fetch error: ${err.message}`);
            } finally {
                if (loaderPlaylistInfo) loaderPlaylistInfo.classList.add('hidden');
            }
        });
    }

    if (btnStartPlaylistDownload) {
        btnStartPlaylistDownload.addEventListener('click', async () => {
            if (!currentPlaylistData || !inputPlaylistUrl.value) return;
            if (progressContainer) progressContainer.classList.remove('hidden');

            try {
                const res = await fetch('/api/playlist/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: inputPlaylistUrl.value.trim(),
                        media_type: 'video',
                        quality: 'best',
                        max_videos: 10
                    })
                });
                const data = await res.json();
                if (data.success && data.job_id) {
                    pollJobProgress(
                        data.job_id,
                        (pct) => {
                            if (txtProgressPercent) txtProgressPercent.textContent = `${Math.round(pct)}%`;
                            if (progressFill) progressFill.style.width = `${pct}%`;
                        },
                        (result) => {
                            if (progressContainer) progressContainer.classList.add('hidden');
                            alert(`Downloaded ${result.length} playlist videos!`);
                            result.forEach(item => saveDownloadedMediaItem(item));
                        },
                        (err) => {
                            if (progressContainer) progressContainer.classList.add('hidden');
                            alert(`Playlist download failed: ${err}`);
                        }
                    );
                }
            } catch (e) {
                if (progressContainer) progressContainer.classList.add('hidden');
                alert(`Playlist download error: ${e.message}`);
            }
        });
    }
});
