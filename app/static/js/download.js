// download.js - Downloader Page Logic

document.addEventListener('DOMContentLoaded', () => {
    let currentVideoData = null;

    const formFetchInfo = document.getElementById('form-fetch-info');
    const inputYtUrl = document.getElementById('input-yt-url');
    const loaderVideoInfo = document.getElementById('loader-video-info');
    const cardVideoInfo = document.getElementById('card-video-info');
    const containerHomeGrid = document.getElementById('container-home-grid');
    const imgThumbnail = document.getElementById('img-thumbnail');
    const iframePlayer = document.getElementById('iframe-player');
    const btnPlayPreview = document.getElementById('btn-play-preview');
    const badgeDuration = document.getElementById('badge-duration');
    const txtVideoTitle = document.getElementById('txt-video-title');
    const txtUploader = document.getElementById('txt-uploader');
    
    const progressContainer = document.getElementById('progress-container');
    const txtProgressStatus = document.getElementById('txt-progress-status');
    const txtProgressPercent = document.getElementById('txt-progress-percent');
    const progressFill = document.getElementById('progress-fill');

    const modalQualitySelect = document.getElementById('modal-quality-select');
    const btnOpenDownloadModal = document.getElementById('btn-open-download-modal');
    const btnCloseQualityModal = document.getElementById('btn-close-quality-modal');
    const selectVideoQuality = document.getElementById('select-video-quality');
    const btnStartDownload = document.getElementById('btn-start-download');
    const toggleOptions = document.querySelectorAll('.toggle-option');

    // LocalStorage Caching
    const CACHE_TTL_MS = 10 * 60 * 1000;

    function getCachedMetadata(query) {
        if (!query) return null;
        try {
            const cacheKey = `yt_studio_cache_${encodeURIComponent(query.toLowerCase().trim())}`;
            const item = localStorage.getItem(cacheKey);
            if (!item) return null;
            const parsed = JSON.parse(item);
            if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
                return parsed.data;
            }
            localStorage.removeItem(cacheKey);
            return null;
        } catch {
            return null;
        }
    }

    function setCachedMetadata(query, data) {
        if (!query || !data) return;
        try {
            const cacheKey = `yt_studio_cache_${encodeURIComponent(query.toLowerCase().trim())}`;
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        } catch (e) {
            console.warn('LocalStorage caching full:', e);
        }
    }

    function removeAllCardLoadingStates() {
        document.querySelectorAll('.card-loading-overlay').forEach(el => el.remove());
    }

    function attachCardLoadingState(card) {
        if (!card || card.querySelector('.card-loading-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'card-loading-overlay';
        overlay.innerHTML = `
            <div class="card-loading-spinner"></div>
            <span>Loading video...</span>
        `;
        card.appendChild(overlay);
    }

    function createVideoCardElement(item) {
        const card = document.createElement('div');
        card.className = 'home-video-card';
        const thumbUrl = item.thumbnail || 'https://via.placeholder.com/320x180';
        card.innerHTML = `
            <div class="home-card-thumb-wrapper">
                <img src="${thumbUrl}" alt="${item.title}">
                <span class="duration-badge">${formatDuration(item.duration)}</span>
            </div>
            <div class="home-card-info">
                <div class="user-avatar-mini">
                    <i data-lucide="play-circle" style="color: var(--brand-orange)"></i>
                </div>
                <div class="home-card-details">
                    <div class="home-card-title">${item.title}</div>
                    <div class="home-card-meta">${item.uploader}</div>
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
            attachCardLoadingState(card);
            const targetQuery = item.url || item.id;
            if (inputYtUrl) inputYtUrl.value = targetQuery;
            executeFetchInfo(targetQuery);
            scrollMainContentToTop();
        });
        return card;
    }

    function renderHomeGrid(relatedList) {
        if (!containerHomeGrid) return;
        containerHomeGrid.innerHTML = '';
        if (!relatedList || relatedList.length === 0) {
            containerHomeGrid.classList.add('hidden');
            return;
        }

        const sec1 = document.createElement('div');
        sec1.className = 'feed-section-block';
        sec1.innerHTML = `
            <div class="feed-section-header">
                <i data-lucide="sparkles"></i>
                <span>Recommended Videos</span>
            </div>
            <div class="video-cards-subgrid" id="subgrid-top-videos"></div>
        `;
        const subgrid = sec1.querySelector('#subgrid-top-videos');
        relatedList.forEach(v => subgrid.appendChild(createVideoCardElement(v)));
        containerHomeGrid.appendChild(sec1);

        if (window.lucide) window.lucide.createIcons();
        containerHomeGrid.classList.remove('hidden');
    }

    async function executeFetchInfo(targetUrlOrQuery) {
        let query = targetUrlOrQuery || (inputYtUrl && inputYtUrl.value.trim() ? inputYtUrl.value.trim() : 'Trending');
        if (!query) query = 'Trending';

        if (inputYtUrl && targetUrlOrQuery) {
            inputYtUrl.value = targetUrlOrQuery;
        }

        const isDirectUrl = query.startsWith('http://') || query.startsWith('https://') || query.includes('youtu.be/') || query.includes('watch?v=');

        const cachedData = getCachedMetadata(query);
        if (cachedData) {
            currentVideoData = cachedData;
            if (isDirectUrl) {
                if (containerHomeGrid) containerHomeGrid.classList.add('hidden');
                if (cardVideoInfo) {
                    cardVideoInfo.classList.remove('hidden');
                    renderVideoMetadata(currentVideoData);
                }
            } else {
                if (cardVideoInfo) cardVideoInfo.classList.add('hidden');
                if (containerHomeGrid) containerHomeGrid.classList.remove('hidden');
                if (currentVideoData.related_videos && currentVideoData.related_videos.length > 0) {
                    const topThumb = currentVideoData.thumbnail || (currentVideoData.id ? `https://i.ytimg.com/vi/${currentVideoData.id}/hqdefault.jpg` : null);
                    const fullList = [{
                        id: currentVideoData.id,
                        title: currentVideoData.title,
                        uploader: currentVideoData.uploader,
                        duration: currentVideoData.duration,
                        thumbnail: topThumb,
                        url: currentVideoData.url
                    }, ...currentVideoData.related_videos];
                    renderHomeGrid(fullList);
                } else {
                    renderHomeGrid([currentVideoData]);
                }
            }
            if (loaderVideoInfo) loaderVideoInfo.classList.add('hidden');
            removeAllCardLoadingStates();
            scrollMainContentToTop();
            return;
        }

        if (isDirectUrl) {
            if (containerHomeGrid) containerHomeGrid.classList.add('hidden');
            if (cardVideoInfo) cardVideoInfo.classList.add('hidden');
            if (loaderVideoInfo) loaderVideoInfo.classList.remove('hidden');
        } else {
            if (cardVideoInfo) cardVideoInfo.classList.add('hidden');
            if (loaderVideoInfo) loaderVideoInfo.classList.add('hidden');
            if (containerHomeGrid) {
                containerHomeGrid.classList.remove('hidden');
                containerHomeGrid.innerHTML = `
                    <div class="skeleton-grid-placeholder">
                        <div class="skeleton-card-item"></div>
                        <div class="skeleton-card-item"></div>
                        <div class="skeleton-card-item"></div>
                        <div class="skeleton-card-item"></div>
                        <div class="skeleton-card-item"></div>
                        <div class="skeleton-card-item"></div>
                    </div>
                `;
            }
        }
        scrollMainContentToTop();

        try {
            const response = await fetch('/api/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: query })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                currentVideoData = result.data;
                setCachedMetadata(query, currentVideoData);

                if (isDirectUrl) {
                    if (containerHomeGrid) containerHomeGrid.classList.add('hidden');
                    if (cardVideoInfo) {
                        cardVideoInfo.classList.remove('hidden');
                        renderVideoMetadata(currentVideoData);
                    }
                } else {
                    if (cardVideoInfo) cardVideoInfo.classList.add('hidden');
                    if (containerHomeGrid) containerHomeGrid.classList.remove('hidden');
                    if (currentVideoData.related_videos && currentVideoData.related_videos.length > 0) {
                        const topThumb = currentVideoData.thumbnail || (currentVideoData.id ? `https://i.ytimg.com/vi/${currentVideoData.id}/hqdefault.jpg` : null);
                        const fullList = [{
                            id: currentVideoData.id,
                            title: currentVideoData.title,
                            uploader: currentVideoData.uploader,
                            duration: currentVideoData.duration,
                            thumbnail: topThumb,
                            url: currentVideoData.url
                        }, ...currentVideoData.related_videos];
                        renderHomeGrid(fullList);
                    } else {
                        renderHomeGrid([currentVideoData]);
                    }
                }
            }
        } catch (error) {
            console.error('Fetch info error:', error);
        } finally {
            if (loaderVideoInfo) loaderVideoInfo.classList.add('hidden');
            removeAllCardLoadingStates();
        }
    }

    function renderVideoMetadata(data) {
        if (iframePlayer) {
            iframePlayer.src = '';
            iframePlayer.classList.add('hidden');
        }
        if (imgThumbnail) {
            imgThumbnail.classList.remove('hidden');
            imgThumbnail.src = data.thumbnail || 'https://via.placeholder.com/480x270';
        }
        if (btnPlayPreview) btnPlayPreview.classList.remove('hidden');
        if (badgeDuration) {
            badgeDuration.classList.remove('hidden');
            badgeDuration.textContent = formatDuration(data.duration);
        }
        if (txtVideoTitle) txtVideoTitle.textContent = data.title;
        if (txtUploader) txtUploader.textContent = data.uploader || 'Unknown Channel';

        populateFormatOptions('video');
    }

    function populateFormatOptions(mediaType) {
        if (!selectVideoQuality || !currentVideoData) return;
        selectVideoQuality.innerHTML = '';

        if (mediaType === 'audio') {
            const formats = currentVideoData.audio_formats || [];
            if (formats.length === 0) {
                selectVideoQuality.innerHTML = '<option value="best">Best Audio Quality (MP3)</option>';
            } else {
                formats.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.bitrate || 'best';
                    opt.textContent = `MP3 Audio (${f.bitrate || 'Best Quality'})`;
                    selectVideoQuality.appendChild(opt);
                });
            }
        } else {
            const formats = currentVideoData.video_formats || [];
            if (formats.length === 0) {
                selectVideoQuality.innerHTML = '<option value="720p">720p HD (MP4)</option><option value="1080p">1080p Full HD (MP4)</option>';
            } else {
                formats.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.resolution || '720p';
                    opt.textContent = `${f.resolution} MP4 Video`;
                    selectVideoQuality.appendChild(opt);
                });
            }
        }
    }

    if (btnPlayPreview) {
        btnPlayPreview.addEventListener('click', () => {
            if (!currentVideoData || !currentVideoData.id) return;
            iframePlayer.src = `https://www.youtube.com/embed/${currentVideoData.id}?autoplay=1`;
            iframePlayer.classList.remove('hidden');
            imgThumbnail.classList.add('hidden');
            btnPlayPreview.classList.add('hidden');
            badgeDuration.classList.add('hidden');
        });
    }

    if (formFetchInfo) {
        formFetchInfo.addEventListener('submit', (e) => {
            e.preventDefault();
            executeFetchInfo(inputYtUrl ? inputYtUrl.value.trim() : '');
        });
    }

    const containerCategoryChips = document.getElementById('container-category-chips');
    if (containerCategoryChips) {
        containerCategoryChips.addEventListener('click', (e) => {
            const chip = e.target.closest('.cat-chip');
            if (!chip) return;

            document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            let query = chip.getAttribute('data-query') || chip.textContent.trim();
            if (inputYtUrl) inputYtUrl.value = query;
            executeFetchInfo(query);
        });
    }

    if (btnOpenDownloadModal && modalQualitySelect) {
        btnOpenDownloadModal.addEventListener('click', () => {
            modalQualitySelect.classList.remove('hidden');
        });
    }

    if (btnCloseQualityModal && modalQualitySelect) {
        btnCloseQualityModal.addEventListener('click', () => {
            modalQualitySelect.classList.add('hidden');
        });
    }

    if (btnStartDownload) {
        btnStartDownload.addEventListener('click', async () => {
            if (!currentVideoData || !currentVideoData.url) return;
            const selectedType = document.querySelector('input[name="media_type"]:checked')?.value || 'video';
            const selectedQuality = selectVideoQuality ? selectVideoQuality.value : 'best';

            if (modalQualitySelect) modalQualitySelect.classList.add('hidden');
            if (progressContainer) progressContainer.classList.remove('hidden');

            try {
                const res = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentVideoData.url,
                        media_type: selectedType,
                        quality: selectedQuality
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
                            saveDownloadedMediaItem(result);
                            window.location.href = `/api/download-file?path=${encodeURIComponent(result.file_path)}`;
                        },
                        (err) => {
                            if (progressContainer) progressContainer.classList.add('hidden');
                            alert(`Download failed: ${err}`);
                        }
                    );
                }
            } catch (e) {
                if (progressContainer) progressContainer.classList.add('hidden');
                alert(`Download error: ${e.message}`);
            }
        });
    }

    const btnQuickSplit = document.getElementById('btn-quick-split');
    if (btnQuickSplit) {
        btnQuickSplit.addEventListener('click', async () => {
            if (!currentVideoData || !currentVideoData.url) {
                window.location.href = '/split.html';
                return;
            }

            if (progressContainer) progressContainer.classList.remove('hidden');
            if (txtProgressStatus) txtProgressStatus.textContent = 'Downloading video for splitting...';

            try {
                const res = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: currentVideoData.url,
                        media_type: 'video',
                        quality: 'best'
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
                            saveDownloadedMediaItem(result);
                            window.location.href = `/split.html?auto_file=${encodeURIComponent(result.file_path)}`;
                        },
                        (err) => {
                            if (progressContainer) progressContainer.classList.add('hidden');
                            alert(`Download for splitting failed: ${err}`);
                        }
                    );
                }
            } catch (e) {
                if (progressContainer) progressContainer.classList.add('hidden');
                alert(`Split setup error: ${e.message}`);
            }
        });
    }

    executeFetchInfo('Trending');
});
