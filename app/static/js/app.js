document.addEventListener('DOMContentLoaded', () => {
    // Global State
    let currentVideoData = null;
    let currentPlaylistData = null;
    let lastDownloadedFilePath = '';
    let downloadedMediaList = [];


    // DOM Elements - Tabs
    const navTabs = document.querySelectorAll('.yt-pill, .nav-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // DOM Elements - Downloader
    const formFetchInfo = document.getElementById('form-fetch-info');
    const inputYtUrl = document.getElementById('input-yt-url');
    const loaderVideoInfo = document.getElementById('loader-video-info');
    const cardVideoInfo = document.getElementById('card-video-info');
    const imgThumbnail = document.getElementById('img-thumbnail');
    const iframePlayer = document.getElementById('iframe-player');
    const btnPlayPreview = document.getElementById('btn-play-preview');
    const badgeDuration = document.getElementById('badge-duration');
    const txtVideoTitle = document.getElementById('txt-video-title');
    const txtUploader = document.getElementById('txt-uploader');
    const txtViews = document.getElementById('txt-views');
    const toggleOptions = document.querySelectorAll('.toggle-option');
    const selectVideoQuality = document.getElementById('select-video-quality');
    const btnStartDownload = document.getElementById('btn-start-download');
    
    // Progress Bar Elements
    const progressContainer = document.getElementById('progress-container');
    const txtProgressStatus = document.getElementById('txt-progress-status');
    const txtProgressPercent = document.getElementById('txt-progress-percent');
    const progressFill = document.getElementById('progress-fill');

    // Playlist Elements
    const formPlaylistFetch = document.getElementById('form-playlist-fetch');
    const inputPlaylistUrl = document.getElementById('input-playlist-url');
    const loaderPlaylistInfo = document.getElementById('loader-playlist-info');
    const cardPlaylistInfo = document.getElementById('card-playlist-info');
    const txtPlaylistTitle = document.getElementById('txt-playlist-title');
    const txtPlaylistCount = document.getElementById('txt-playlist-count');
    const containerPlaylistItems = document.getElementById('container-playlist-items');
    const btnStartPlaylistDownload = document.getElementById('btn-start-playlist-download');

    // Trimmer & Splitter Media Selector DOM Elements
    const containerTrimMediaList = document.getElementById('container-trim-media-list');
    const containerSplitMediaList = document.getElementById('container-split-media-list');
    const wrapperTrimPreview = document.getElementById('wrapper-trim-preview');
    const playerTrimPreview = document.getElementById('player-trim-preview');
    const wrapperSplitPreview = document.getElementById('wrapper-split-preview');
    const playerSplitPreview = document.getElementById('player-split-preview');

    // Trimmer Form
    const formTrimVideo = document.getElementById('form-trim-video');
    const inputTrimFilepath = document.getElementById('input-trim-filepath');
    const inputTrimStart = document.getElementById('input-trim-start');
    const inputTrimEnd = document.getElementById('input-trim-end');
    const selectTrimFormat = document.getElementById('select-trim-format');
    const chkTrimAccurate = document.getElementById('chk-trim-accurate');

    // Splitter Form
    const formSplitVideo = document.getElementById('form-split-video');
    const inputSplitFilepath = document.getElementById('input-split-filepath');
    const inputSplitParts = document.getElementById('input-split-parts');
    const inputSplitDuration = document.getElementById('input-split-duration');
    const selectSplitFormat = document.getElementById('select-split-format');
    const chkSplitAccurate = document.getElementById('chk-split-accurate');

    function addDownloadedMediaItem(item) {
        if (!item || !item.file_path) return;
        if (!downloadedMediaList.some(m => m.file_path === item.file_path)) {
            downloadedMediaList.unshift(item);
        }
        renderDownloadedMediaGrid();
    }

    const containerMixMediaList = document.getElementById('container-mix-media-list');
    const wrapperMixSelectedQueue = document.getElementById('wrapper-mix-selected-queue');
    const formMixVideo = document.getElementById('form-mix-video');
    const selectMixFormat = document.getElementById('select-mix-format');
    let selectedMixFiles = [];

    function renderMixQueue() {
        if (!wrapperMixSelectedQueue) return;
        wrapperMixSelectedQueue.innerHTML = '';
        if (selectedMixFiles.length === 0) {
            wrapperMixSelectedQueue.innerHTML = '<p class="empty-library-msg">No clips selected yet. Click cards above to add to mix queue.</p>';
            return;
        }

        selectedMixFiles.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'mix-queue-item';
            row.innerHTML = `
                <span><strong>Clip ${index + 1}:</strong> ${item.title || item.filename}</span>
                <button type="button" class="btn-remove-mix" data-index="${index}">&times;</button>
            `;
            row.querySelector('.btn-remove-mix').addEventListener('click', (e) => {
                e.stopPropagation();
                selectedMixFiles.splice(index, 1);
                renderMixQueue();
                renderDownloadedMediaGrid();
            });
            wrapperMixSelectedQueue.appendChild(row);
        });
    }

    function renderDownloadedMediaGrid() {
        [containerTrimMediaList, containerSplitMediaList, containerMixMediaList].forEach(container => {
            if (!container) return;
            container.innerHTML = '';

            if (downloadedMediaList.length === 0) {
                container.innerHTML = '<p class="empty-library-msg">No downloaded videos yet. Download a video in the Downloader tab first!</p>';
                return;
            }

            downloadedMediaList.forEach(item => {
                const card = document.createElement('div');
                const isMixSelected = selectedMixFiles.some(m => m.file_path === item.file_path);
                card.className = `media-library-card ${isMixSelected && container === containerMixMediaList ? 'selected' : ''}`;
                card.innerHTML = `
                    <div class="media-card-thumb">
                        <img src="${item.thumbnail || 'https://via.placeholder.com/240x130'}" alt="${item.title || 'Downloaded Video'}">
                    </div>
                    <div class="media-card-title">${item.title || item.filename}</div>
                    <div class="media-card-badge">${item.filename}</div>
                `;

                card.addEventListener('click', () => {
                    if (container === containerMixMediaList) {
                        const existingIdx = selectedMixFiles.findIndex(m => m.file_path === item.file_path);
                        if (existingIdx >= 0) {
                            selectedMixFiles.splice(existingIdx, 1);
                        } else {
                            selectedMixFiles.push(item);
                        }
                        renderMixQueue();
                        renderDownloadedMediaGrid();
                    } else {
                        const cards = container.querySelectorAll('.media-library-card');
                        cards.forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');

                        if (container === containerTrimMediaList) {
                            inputTrimFilepath.value = item.file_path;
                            if (playerTrimPreview && wrapperTrimPreview) {
                                playerTrimPreview.src = `/api/download-file?path=${encodeURIComponent(item.file_path)}`;
                                wrapperTrimPreview.classList.remove('hidden');
                            }
                        }
                        if (container === containerSplitMediaList) {
                            inputSplitFilepath.value = item.file_path;
                            if (playerSplitPreview && wrapperSplitPreview) {
                                playerSplitPreview.src = `/api/download-file?path=${encodeURIComponent(item.file_path)}`;
                                wrapperSplitPreview.classList.remove('hidden');
                                playerSplitPreview.onloadedmetadata = () => {
                                    if (playerSplitPreview.duration && inputSplitDuration) {
                                        inputSplitDuration.value = Math.round(playerSplitPreview.duration);
                                    }
                                };
                            }
                        }
                    }
                });

                container.appendChild(card);
            });
        });
    }




    // --- Network-based Quality Detection ---
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

    // --- Tab Switching & Home Grid Toggle Logic ---
    const logoGroup = document.querySelector('.yt-logo-group');
    if (logoGroup) {
        logoGroup.addEventListener('click', () => {
            if (currentVideoData && currentVideoData.related_videos) {
                renderHomeGrid(currentVideoData.related_videos);
            }
        });
    }

    const homeNavBtns = document.querySelectorAll('#snav-home, #mnav-home');
    homeNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentVideoData && currentVideoData.related_videos) {
                renderHomeGrid(currentVideoData.related_videos);
            }
        });
    });

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTabId = tab.getAttribute('data-tab');
            
            navTabs.forEach(t => t.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(targetTabId).classList.add('active');
        });
    });

    // --- Media Type Toggle (Video vs Audio) ---
    toggleOptions.forEach(label => {
        label.addEventListener('click', () => {
            toggleOptions.forEach(opt => opt.classList.remove('active'));
            label.classList.add('active');
            const radio = label.querySelector('input[type="radio"]');
            radio.checked = true;
            
            if (currentVideoData) {
                populateFormatOptions(radio.value);
            }
        });
    });

    // --- Play Video Preview ---
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

    // --- LocalStorage History, Likes & Saved Videos Management ---
    const STORAGE_KEY_HISTORY = 'yt_studio_search_history';
    const STORAGE_KEY_LIKES = 'yt_studio_liked_videos';
    const STORAGE_KEY_SAVED = 'yt_studio_saved_videos';

    const containerRecentChips = document.getElementById('container-recent-chips');
    const btnLikeVideo = document.getElementById('btn-like-video');
    const txtLikeCount = document.getElementById('txt-like-count');
    const btnSaveVideo = document.getElementById('btn-save-video');
    const txtSaveStatus = document.getElementById('txt-save-status');

    function getSearchHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY)) || [];
        } catch {
            return [];
        }
    }

    function saveSearchHistory(term) {
        if (!term || term.startsWith('http://') || term.startsWith('https://')) return;
        let history = getSearchHistory();
        history = history.filter(item => item.toLowerCase() !== term.toLowerCase());
        history.unshift(term);
        if (history.length > 6) history = history.slice(0, 6);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        renderRecentSearchChips();
    }

    function getSavedVideos() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED)) || {};
        } catch {
            return {};
        }
    }

    function toggleSaveCurrentVideo() {
        if (!currentVideoData || !currentVideoData.id) return;
        const saved = getSavedVideos();
        const vId = currentVideoData.id;
        if (saved[vId]) {
            delete saved[vId];
        } else {
            saved[vId] = {
                id: vId,
                title: currentVideoData.title,
                uploader: currentVideoData.uploader,
                thumbnail: currentVideoData.thumbnail,
                url: currentVideoData.url
            };
        }
        localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(saved));
        updateSaveButtonState();
        renderRecentSearchChips();
    }

    function updateSaveButtonState() {
        if (!btnSaveVideo || !currentVideoData) return;
        const saved = getSavedVideos();
        const isSaved = !!saved[currentVideoData.id];
        if (isSaved) {
            btnSaveVideo.classList.add('saved');
            if (txtSaveStatus) txtSaveStatus.textContent = 'Saved';
        } else {
            btnSaveVideo.classList.remove('saved');
            if (txtSaveStatus) txtSaveStatus.textContent = 'Save';
        }
    }

    function renderRecentSearchChips() {
        if (!containerRecentChips) return;
        const history = getSearchHistory();
        const saved = Object.values(getSavedVideos());
        containerRecentChips.innerHTML = '';

        if (history.length === 0 && saved.length === 0) {
            containerRecentChips.classList.add('hidden');
            return;
        }

        if (saved.length > 0) {
            const savedChip = document.createElement('div');
            savedChip.className = 'recent-chip';
            savedChip.innerHTML = `<i data-lucide="bookmark" style="width: 16px; height: 16px; color: var(--brand-orange)"></i> <span>Saved Videos (${saved.length})</span>`;
            savedChip.addEventListener('click', () => {
                const lastSaved = saved[saved.length - 1];
                if (lastSaved && lastSaved.url) {
                    inputYtUrl.value = lastSaved.url;
                    formFetchInfo.dispatchEvent(new Event('submit'));
                }
            });
            containerRecentChips.appendChild(savedChip);
        }

        history.forEach(term => {
            const chip = document.createElement('div');
            chip.className = 'recent-chip';
            chip.innerHTML = `<i data-lucide="history" style="width: 16px; height: 16px; color: var(--text-muted)"></i> <span>${term}</span>`;
            chip.addEventListener('click', () => {
                inputYtUrl.value = term;
                formFetchInfo.dispatchEvent(new Event('submit'));
            });
            containerRecentChips.appendChild(chip);
        });

        if (window.lucide) window.lucide.createIcons();
        if (document.activeElement === inputYtUrl) {
            containerRecentChips.classList.remove('hidden');
        } else {
            containerRecentChips.classList.add('hidden');
        }
    }

    if (inputYtUrl && containerRecentChips) {
        inputYtUrl.addEventListener('focus', () => {
            renderRecentSearchChips();
            containerRecentChips.classList.remove('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!inputYtUrl.contains(e.target) && !containerRecentChips.contains(e.target)) {
                containerRecentChips.classList.add('hidden');
            }
        });
    }


    function getLikedVideos() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_LIKES)) || {};
        } catch {
            return {};
        }
    }

    function toggleLikeCurrentVideo() {
        if (!currentVideoData || !currentVideoData.id) return;
        const likes = getLikedVideos();
        const vId = currentVideoData.id;
        likes[vId] = {
            id: vId,
            title: currentVideoData.title,
            uploader: currentVideoData.uploader,
            thumbnail: currentVideoData.thumbnail,
            url: currentVideoData.url
        };
        localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(likes));
        updateLikeButtonState();

        // Open official YouTube video link so like registers directly on user's YouTube account
        if (currentVideoData.url) {
            window.open(currentVideoData.url, '_blank');
        }
    }

    function updateLikeButtonState() {
        if (!btnLikeVideo || !currentVideoData) return;
        const likes = getLikedVideos();
        const isLiked = !!likes[currentVideoData.id];
        if (isLiked) {
            btnLikeVideo.classList.add('liked');
        } else {
            btnLikeVideo.classList.remove('liked');
        }
    }

    if (btnLikeVideo) {
        btnLikeVideo.addEventListener('click', toggleLikeCurrentVideo);
    }

    if (btnSaveVideo) {
        btnSaveVideo.addEventListener('click', toggleSaveCurrentVideo);
    }

    function updateDynamicCategoryChips(tags) {
        const container = document.getElementById('container-category-chips');
        if (!container) return;
        if (!tags || !Array.isArray(tags) || tags.length === 0) return;

        const uniqueTags = Array.from(new Set(tags.slice(0, 6)));
        uniqueTags.forEach(tag => {
            const existing = Array.from(container.children).find(btn => btn.textContent.toLowerCase() === tag.toLowerCase());
            if (!existing) {
                const newChip = document.createElement('button');
                newChip.className = 'cat-chip';
                newChip.setAttribute('data-query', tag);
                newChip.textContent = tag;
                newChip.addEventListener('click', () => {
                    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
                    newChip.classList.add('active');
                    inputYtUrl.value = tag;
                    formFetchInfo.dispatchEvent(new Event('submit'));
                });
                const savedChip = container.querySelector('[data-query="saved"]');
                if (savedChip) {
                    container.insertBefore(newChip, savedChip);
                } else {
                    container.appendChild(newChip);
                }
            }
        });
    }



    // --- Comments Management ---
    const formAddComment = document.getElementById('form-add-comment');
    const inputCommentText = document.getElementById('input-comment-text');
    const txtCommentsCount = document.getElementById('txt-comments-count');
    const containerCommentsList = document.getElementById('container-comments-list');

    const STORAGE_KEY_COMMENTS = 'yt_studio_user_comments';

    function getUserComments(vId) {
        if (!vId) return [];
        try {
            const all = JSON.parse(localStorage.getItem(STORAGE_KEY_COMMENTS)) || {};
            return all[vId] || [];
        } catch {
            return [];
        }
    }

    function saveUserComment(vId, commentText) {
        if (!vId || !commentText) return;
        try {
            const all = JSON.parse(localStorage.getItem(STORAGE_KEY_COMMENTS)) || {};
            if (!all[vId]) all[vId] = [];
            all[vId].unshift({
                author: '@You',
                text: commentText,
                timeAgo: 'Just now',
                likes: 0
            });
            localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(all));
        } catch (e) {
            console.error('Save comment error:', e);
        }
    }

    function renderComments(data) {
        if (!containerCommentsList) return;
        containerCommentsList.innerHTML = '';

        const vId = data ? data.id : null;
        const userComments = getUserComments(vId);
        const fetchedComments = (data && data.comments && data.comments.length > 0) ? data.comments : [];

        const totalComments = userComments.concat(fetchedComments);
        const countDisplay = data && data.comment_count ? data.comment_count.toLocaleString() : totalComments.length;
        if (txtCommentsCount) txtCommentsCount.textContent = `${countDisplay} Comments`;

        if (totalComments.length === 0) {
            containerCommentsList.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted); padding: 0.5rem 0;">No comments found for this video.</p>';
            return;
        }

        totalComments.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            item.innerHTML = `
                <div class="user-avatar-mini">
                    <i data-lucide="user"></i>
                </div>
                <div class="comment-content">
                    <div class="comment-author-bar">
                        <span class="comment-author">${c.author}</span>
                        <span class="comment-time">${c.timeAgo}</span>
                    </div>
                    <div class="comment-text">${c.text}</div>
                    <div class="comment-actions">
                        <button class="comment-action-btn"><i data-lucide="thumbs-up" style="width: 13px; height: 13px;"></i> ${c.likes || 0}</button>
                        <button class="comment-action-btn"><i data-lucide="thumbs-down" style="width: 13px; height: 13px;"></i></button>
                    </div>
                </div>
            `;
            containerCommentsList.appendChild(item);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    if (formAddComment) {
        formAddComment.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = inputCommentText.value.trim();
            if (!text || !currentVideoData) return;

            saveUserComment(currentVideoData.id, text);
            inputCommentText.value = '';
            renderComments(currentVideoData);

            if (currentVideoData.url) {
                window.open(currentVideoData.url, '_blank');
            }
        });
    }

    const containerHomeGrid = document.getElementById('container-home-grid');

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
            formFetchInfo.dispatchEvent(new CustomEvent('fetch-query', { detail: item.url }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        return card;
    }

    function createShortsCardElement(item) {
        const card = document.createElement('div');
        card.className = 'shorts-card';
        const thumbUrl = item.thumbnail || 'https://via.placeholder.com/170x300';
        card.innerHTML = `
            <div class="shorts-thumb-wrapper">
                <img src="${thumbUrl}" alt="${item.title}">
                <span class="shorts-badge"><i data-lucide="zap" style="width: 10px; height: 10px;"></i> Shorts</span>
            </div>
            <div class="shorts-card-info">
                <div class="shorts-card-title">${item.title}</div>
                <div class="shorts-card-meta">${item.uploader}</div>
            </div>
        `;
        card.addEventListener('click', () => {
            formFetchInfo.dispatchEvent(new CustomEvent('fetch-query', { detail: item.url }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
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

        // Separate shorts vs normal videos
        const shortsList = [];
        const videosList = [];

        relatedList.forEach(item => {
            const isShort = (item.duration && item.duration <= 60) || 
                            (item.title && item.title.toLowerCase().includes('short')) ||
                            (item.url && item.url.includes('/shorts/'));
            if (isShort) {
                shortsList.push(item);
            } else {
                videosList.push(item);
            }
        });

        // 1. First 6 Videos (Row 1 & Row 2 Top Results)
        const topVideos = videosList.slice(0, 6);
        if (topVideos.length > 0) {
            const sec1 = document.createElement('div');
            sec1.className = 'feed-section-block';
            sec1.innerHTML = `
                <div class="feed-section-header">
                    <i data-lucide="sparkles"></i>
                    <span>Top Search Recommendations</span>
                </div>
                <div class="video-cards-subgrid" id="subgrid-top-videos"></div>
            `;
            const subgrid = sec1.querySelector('#subgrid-top-videos');
            topVideos.forEach(v => subgrid.appendChild(createVideoCardElement(v)));
            containerHomeGrid.appendChild(sec1);
        }

        // 2. YouTube Shorts Shelf Carousel
        if (shortsList.length > 0) {
            const secShorts = document.createElement('div');
            secShorts.className = 'feed-section-block';
            secShorts.innerHTML = `
                <div class="feed-section-header">
                    <i data-lucide="zap"></i>
                    <span>Shorts Shelf</span>
                </div>
                <div class="shorts-shelf-carousel" id="carousel-shorts-shelf"></div>
            `;
            const carousel = secShorts.querySelector('#carousel-shorts-shelf');
            shortsList.forEach(s => carousel.appendChild(createShortsCardElement(s)));
            containerHomeGrid.appendChild(secShorts);
        }

        // 3. Most Watched Videos Section
        const remainingVideos = videosList.slice(6);
        const mostWatched = remainingVideos.slice(0, 6);
        if (mostWatched.length > 0) {
            const sec2 = document.createElement('div');
            sec2.className = 'feed-section-block';
            sec2.innerHTML = `
                <div class="feed-section-header">
                    <i data-lucide="trending-up"></i>
                    <span>Most Watched Videos</span>
                </div>
                <div class="video-cards-subgrid" id="subgrid-most-watched"></div>
            `;
            const subgrid2 = sec2.querySelector('#subgrid-most-watched');
            mostWatched.forEach(v => subgrid2.appendChild(createVideoCardElement(v)));
            containerHomeGrid.appendChild(sec2);
        }

        // 4. Most Liked Videos Section with Load More Pagination
        const mostLikedAll = remainingVideos.slice(6);
        let displayLimit = 6;

        function renderMostLikedSection() {
            let sec3 = containerHomeGrid.querySelector('#section-most-liked');
            if (!sec3) {
                sec3 = document.createElement('div');
                sec3.id = 'section-most-liked';
                sec3.className = 'feed-section-block';
                containerHomeGrid.appendChild(sec3);
            }
            sec3.innerHTML = '';

            const currentBatch = mostLikedAll.slice(0, displayLimit);
            if (currentBatch.length > 0) {
                sec3.innerHTML = `
                    <div class="feed-section-header">
                        <i data-lucide="thumbs-up"></i>
                        <span>Most Liked & Trending Hits</span>
                    </div>
                    <div class="video-cards-subgrid" id="subgrid-most-liked"></div>
                `;
                const subgrid3 = sec3.querySelector('#subgrid-most-liked');
                currentBatch.forEach(v => subgrid3.appendChild(createVideoCardElement(v)));
            }

            // Remove existing load more container if present
            const oldLoadMore = containerHomeGrid.querySelector('.load-more-container');
            if (oldLoadMore) oldLoadMore.remove();

            // Append "Load More Videos" button and Infinite Scroll sentinel
            if (displayLimit < mostLikedAll.length) {
                const loadMoreBox = document.createElement('div');
                loadMoreBox.className = 'load-more-container';
                loadMoreBox.innerHTML = `
                    <button class="btn-load-more" id="btn-load-more-videos">
                        <span>Loading More Videos...</span>
                        <i data-lucide="chevron-down"></i>
                    </button>
                `;
                const loadMoreBtn = loadMoreBox.querySelector('#btn-load-more-videos');
                loadMoreBtn.addEventListener('click', () => {
                    displayLimit += 6;
                    renderMostLikedSection();
                });
                containerHomeGrid.appendChild(loadMoreBox);

                // Infinite Scroll via IntersectionObserver
                if ('IntersectionObserver' in window) {
                    const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting) {
                            observer.disconnect();
                            displayLimit += 6;
                            renderMostLikedSection();
                        }
                    }, { rootMargin: '200px' });
                    observer.observe(loadMoreBox);
                }
            }

            if (window.lucide) window.lucide.createIcons();
        }

        if (mostLikedAll.length > 0) {
            renderMostLikedSection();
        }

        if (window.lucide) window.lucide.createIcons();
        containerHomeGrid.classList.remove('hidden');
    }


    // --- Instant Local Cache System ---
    const STORAGE_KEY_LAST_DATA = 'yt_studio_last_video_data';
    const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

    function clearVideoCache() {
        try {
            localStorage.removeItem(STORAGE_KEY_LAST_DATA);
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('yt_studio_cache_') || key.startsWith('yt_dcm_cache_'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            currentVideoData = null;
            if (cardVideoInfo) cardVideoInfo.classList.add('hidden');
            if (loaderVideoInfo) loaderVideoInfo.classList.add('hidden');
            if (containerHomeGrid) containerHomeGrid.classList.remove('hidden');
        } catch (e) {
            console.error('Error clearing video cache:', e);
        }
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
            clearVideoCache();
        }
    });

    function getCachedMetadata(query) {
        if (!query) return null;
        try {
            const now = Date.now();
            const cacheKey = 'yt_studio_cache_' + query.toLowerCase().trim();
            const cachedStr = localStorage.getItem(cacheKey);
            if (cachedStr) {
                const parsed = JSON.parse(cachedStr);
                const data = parsed.data || parsed;
                const timestamp = parsed.timestamp;
                if (timestamp && (now - timestamp > CACHE_TTL_MS)) {
                    localStorage.removeItem(cacheKey);
                } else if (data) {
                    return data;
                }
            }

            const lastDataStr = localStorage.getItem(STORAGE_KEY_LAST_DATA);
            if (lastDataStr) {
                const parsed = JSON.parse(lastDataStr);
                const data = parsed.data || parsed;
                const timestamp = parsed.timestamp;
                if (timestamp && (now - timestamp > CACHE_TTL_MS)) {
                    localStorage.removeItem(STORAGE_KEY_LAST_DATA);
                } else if (data && (data.title?.toLowerCase().includes(query.toLowerCase()) || data.url?.toLowerCase().includes(query.toLowerCase()))) {
                    return data;
                }
            }
        } catch {}
        return null;
    }

    function setCachedMetadata(query, data) {
        if (!data) return;
        try {
            const entry = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(STORAGE_KEY_LAST_DATA, JSON.stringify(entry));
            if (query) {
                const cacheKey = 'yt_studio_cache_' + query.toLowerCase().trim();
                localStorage.setItem(cacheKey, JSON.stringify(entry));
            }
        } catch (e) {
            console.error('Cache save error:', e);
        }
    }

    // --- Fetch Video Info ---
    async function executeFetchInfo(targetUrlOrQuery) {
        const query = targetUrlOrQuery || inputYtUrl.value.trim();
        if (!query) return;

        saveSearchHistory(query);

        const isDirectUrl = query.startsWith('http://') || query.startsWith('https://') || query.includes('youtu.be/') || query.includes('watch?v=');

        // 1. Loading State
        cardVideoInfo.classList.add('hidden');
        loaderVideoInfo.classList.remove('hidden');

        // 2. Fetch data from server
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
                    // Direct link or card click -> show video player details card
                    cardVideoInfo.classList.remove('hidden');
                    if (containerHomeGrid) containerHomeGrid.classList.add('hidden');
                    renderVideoMetadata(currentVideoData);
                    updateLikeButtonState();
                    updateSaveButtonState();
                    renderComments(currentVideoData);
                } else {
                    // Text search or category chip -> render video grid layout (no player)
                    cardVideoInfo.classList.add('hidden');
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

                if (currentVideoData.tags) updateDynamicCategoryChips(currentVideoData.tags);
            } else {
                if (cardVideoInfo) cardVideoInfo.classList.add('hidden');
                if (containerHomeGrid) containerHomeGrid.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Fetch info error:', error);
            if (cardVideoInfo) cardVideoInfo.classList.add('hidden');
            if (containerHomeGrid) containerHomeGrid.classList.remove('hidden');
        } finally {
            loaderVideoInfo.classList.add('hidden');
        }
    }

    formFetchInfo.addEventListener('submit', (e) => {
        if (e) e.preventDefault();
        executeFetchInfo(inputYtUrl.value.trim());
    });

    formFetchInfo.addEventListener('fetch-query', (e) => {
        if (e && e.detail) {
            inputYtUrl.value = e.detail;
            executeFetchInfo(e.detail);
        }
    });





    function renderVideoMetadata(data) {
        if (iframePlayer) {
            iframePlayer.src = '';
            iframePlayer.classList.add('hidden');
        }
        imgThumbnail.classList.remove('hidden');
        if (btnPlayPreview) btnPlayPreview.classList.remove('hidden');
        badgeDuration.classList.remove('hidden');

        imgThumbnail.src = data.thumbnail || 'https://via.placeholder.com/480x270';
        badgeDuration.textContent = formatDuration(data.duration);
        txtVideoTitle.textContent = data.title;
        txtUploader.textContent = data.uploader || 'Unknown Channel';

        const txtSubscribers = document.getElementById('txt-subscribers');
        if (txtSubscribers) {
            const subs = data.channel_follower_count;
            if (subs) {
                txtSubscribers.textContent = subs >= 1000000 ? `${(subs/1000000).toFixed(1)}M subscribers` : (subs >= 1000 ? `${(subs/1000).toFixed(0)}K subscribers` : `${subs} subscribers`);
            } else {
                txtSubscribers.textContent = 'Subscriber count hidden';
            }
        }

        const txtViewsCount = document.getElementById('txt-views-count');
        if (txtViewsCount) {
            txtViewsCount.textContent = `${(data.view_count || 0).toLocaleString()} views`;
        }

        const txtUploadDate = document.getElementById('txt-upload-date');
        if (txtUploadDate) {
            txtUploadDate.textContent = data.upload_date ? `Uploaded ${data.upload_date}` : 'Uploaded recently';
        }

        const txtVideoDescription = document.getElementById('txt-video-description');
        if (txtVideoDescription) {
            txtVideoDescription.textContent = data.description || 'No description provided for this video.';
        }

        if (txtLikeCount) {
            const likes = data.like_count;
            txtLikeCount.textContent = likes ? (likes >= 1000 ? `${(likes/1000).toFixed(0)}K` : likes) : '';
        }

        const btnToggleDescription = document.getElementById('btn-toggle-description');
        const ytDescriptionBox = document.getElementById('yt-description-box');
        if (btnToggleDescription && txtVideoDescription && ytDescriptionBox) {
            btnToggleDescription.onclick = (e) => {
                e.stopPropagation();
                if (txtVideoDescription.classList.contains('collapsed')) {
                    txtVideoDescription.classList.remove('collapsed');
                    btnToggleDescription.textContent = 'Show less';
                } else {
                    txtVideoDescription.classList.add('collapsed');
                    btnToggleDescription.textContent = '...more';
                }
            };
            ytDescriptionBox.onclick = () => {
                if (txtVideoDescription.classList.contains('collapsed')) {
                    txtVideoDescription.classList.remove('collapsed');
                    btnToggleDescription.textContent = 'Show less';
                }
            };
        }

        // Quick Action Buttons (Trim, Split & Playlist)
        const btnQuickTrim = document.getElementById('btn-quick-trim');
        const btnQuickSplit = document.getElementById('btn-quick-split');
        const btnQuickPlaylist = document.getElementById('btn-quick-playlist');

        if (btnQuickTrim) {
            btnQuickTrim.onclick = async () => {
                const targetTab = document.getElementById('tab-trimmer');
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                if (targetTab) targetTab.classList.add('active');

                if (lastDownloadedFilePath) {
                    inputTrimFilepath.value = lastDownloadedFilePath;
                    if (playerTrimPreview && wrapperTrimPreview) {
                        playerTrimPreview.src = `/api/download-file?path=${encodeURIComponent(lastDownloadedFilePath)}`;
                        wrapperTrimPreview.classList.remove('hidden');
                    }
                } else if (currentVideoData && currentVideoData.url) {
                    try {
                        txtProgressStatus.textContent = 'Preparing video stream for Trimmer...';
                        if (progressContainer) progressContainer.classList.remove('hidden');
                        const resp = await fetch('/api/download', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: currentVideoData.url, media_type: 'video', quality: '720p' })
                        });
                        const res = await resp.json();
                        let dlData = res.job_id ? await pollJobStatus(res.job_id, 'Preparing video for Trimmer...') : res.data;
                        if (dlData && dlData.file_path) {
                            lastDownloadedFilePath = dlData.file_path;
                            inputTrimFilepath.value = dlData.file_path;
                            addDownloadedMediaItem({
                                title: currentVideoData.title,
                                file_path: dlData.file_path,
                                filename: dlData.filename,
                                thumbnail: currentVideoData.thumbnail
                            });
                            if (playerTrimPreview && wrapperTrimPreview) {
                                playerTrimPreview.src = `/api/download-file?path=${encodeURIComponent(dlData.file_path)}`;
                                wrapperTrimPreview.classList.remove('hidden');
                            }
                        }
                    } catch (err) {
                        console.error('Trim auto download error:', err);
                    } finally {
                        if (progressContainer) progressContainer.classList.add('hidden');
                    }
                }
            };
        }

        if (btnQuickSplit) {
            btnQuickSplit.onclick = async () => {
                const targetTab = document.getElementById('tab-splitter');
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                if (targetTab) targetTab.classList.add('active');

                if (lastDownloadedFilePath) {
                    inputSplitFilepath.value = lastDownloadedFilePath;
                    if (playerSplitPreview && wrapperSplitPreview) {
                        playerSplitPreview.src = `/api/download-file?path=${encodeURIComponent(lastDownloadedFilePath)}`;
                        wrapperSplitPreview.classList.remove('hidden');
                    }
                } else if (currentVideoData && currentVideoData.url) {
                    try {
                        txtProgressStatus.textContent = 'Preparing video stream for Splitter...';
                        if (progressContainer) progressContainer.classList.remove('hidden');
                        const resp = await fetch('/api/download', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: currentVideoData.url, media_type: 'video', quality: '720p' })
                        });
                        const res = await resp.json();
                        let dlData = res.job_id ? await pollJobStatus(res.job_id, 'Preparing video for Splitter...') : res.data;
                        if (dlData && dlData.file_path) {
                            lastDownloadedFilePath = dlData.file_path;
                            inputSplitFilepath.value = dlData.file_path;
                            addDownloadedMediaItem({
                                title: currentVideoData.title,
                                file_path: dlData.file_path,
                                filename: dlData.filename,
                                thumbnail: currentVideoData.thumbnail
                            });
                            if (playerSplitPreview && wrapperSplitPreview) {
                                playerSplitPreview.src = `/api/download-file?path=${encodeURIComponent(dlData.file_path)}`;
                                wrapperSplitPreview.classList.remove('hidden');
                            }
                        }
                    } catch (err) {
                        console.error('Split auto download error:', err);
                    } finally {
                        if (progressContainer) progressContainer.classList.add('hidden');
                    }
                }
            };
        }

        if (btnQuickPlaylist) {
            if (data.playlist_url) {
                btnQuickPlaylist.classList.remove('hidden');
                btnQuickPlaylist.onclick = () => {
                    const targetTab = document.getElementById('tab-playlist');
                    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                    if (targetTab) targetTab.classList.add('active');
                    inputPlaylistUrl.value = data.playlist_url;
                    formPlaylistFetch.dispatchEvent(new Event('submit'));
                };
            } else {
                btnQuickPlaylist.classList.add('hidden');
            }
        }



        // Populate Related Videos Sidebar
        const containerRelatedVideos = document.getElementById('container-related-videos');
        if (containerRelatedVideos) {
            containerRelatedVideos.innerHTML = '';
            const list = data.related_videos || [];
            
            if (list.length === 0) {
                containerRelatedVideos.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem;">No related videos found.</p>';
            } else {
                list.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'related-video-card';
                    card.innerHTML = `
                        <div class="related-thumb-box">
                            <img src="${item.thumbnail}" alt="${item.title}">
                            <span class="related-duration">${formatDuration(item.duration)}</span>
                        </div>
                        <div class="related-info">
                            <div class="related-title">${item.title}</div>
                            <div class="related-channel">${item.uploader}</div>
                        </div>
                    `;
                    card.addEventListener('click', () => {
                        formFetchInfo.dispatchEvent(new CustomEvent('fetch-query', { detail: item.url }));
                    });
                    containerRelatedVideos.appendChild(card);
                });
            }
        }

        const selectedType = document.querySelector('input[name="media_type"]:checked').value;
        populateFormatOptions(selectedType);

        cardVideoInfo.classList.remove('hidden');
    }


    function populateFormatOptions(type) {
        selectVideoQuality.innerHTML = '';

        if (!currentVideoData) return;

        if (type === 'video') {
            const targetQuality = getNetworkBasedDefaultQuality();
            let matchedIndex = -1;

            currentVideoData.video_formats.forEach((fmt, idx) => {
                const opt = document.createElement('option');
                opt.value = fmt.resolution;
                opt.textContent = `${fmt.resolution} (${fmt.ext.toUpperCase()})`;
                selectVideoQuality.appendChild(opt);

                if (fmt.resolution === targetQuality) {
                    matchedIndex = idx;
                }
            });

            if (matchedIndex !== -1) {
                selectVideoQuality.selectedIndex = matchedIndex;
            } else if (selectVideoQuality.options.length > 0) {
                selectVideoQuality.selectedIndex = 0;
            }
        } else {
            currentVideoData.audio_formats.forEach(fmt => {
                const opt = document.createElement('option');
                opt.value = fmt.bitrate;
                opt.textContent = `${fmt.bitrate} MP3 Audio`;
                selectVideoQuality.appendChild(opt);
            });
            if (selectVideoQuality.children.length === 0) {
                const defaultOpt = document.createElement('option');
                defaultOpt.value = '192 kbps';
                defaultOpt.textContent = '192 kbps MP3 Audio';
                selectVideoQuality.appendChild(defaultOpt);
            }
        }
    }

    // --- Helper for Background Job Polling with Progress Bar ---
    async function pollJobStatus(jobId, statusText = 'Processing...') {
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            txtProgressStatus.textContent = statusText;
            txtProgressPercent.textContent = '10%';
            progressFill.style.width = '10%';
        }

        while (true) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            const res = await fetch(`/api/jobs/${jobId}`);
            const data = await res.json();

            if (data.success && data.data) {
                const job = data.data;
                const progress = Math.min(Math.max(job.progress || 20, 10), 100);

                if (progressContainer) {
                    txtProgressPercent.textContent = `${Math.round(progress)}%`;
                    progressFill.style.width = `${progress}%`;
                }

                if (job.status === 'completed') {
                    if (progressContainer) progressContainer.classList.add('hidden');
                    return job.result;
                } else if (job.status === 'failed') {
                    if (progressContainer) progressContainer.classList.add('hidden');
                    throw new Error(job.error || 'Processing job failed.');
                }
            }
        }
    }

    // Modal Elements
    const btnOpenDownloadModal = document.getElementById('btn-open-download-modal');
    const modalQualitySelect = document.getElementById('modal-quality-select');
    const btnCloseQualityModal = document.getElementById('btn-close-quality-modal');

    if (btnOpenDownloadModal) {
        btnOpenDownloadModal.addEventListener('click', () => {
            if (modalQualitySelect) modalQualitySelect.classList.remove('hidden');
        });
    }

    if (btnCloseQualityModal) {
        btnCloseQualityModal.addEventListener('click', () => {
            if (modalQualitySelect) modalQualitySelect.classList.add('hidden');
        });
    }

    if (modalQualitySelect) {
        modalQualitySelect.addEventListener('click', (e) => {
            if (e.target === modalQualitySelect) {
                modalQualitySelect.classList.add('hidden');
            }
        });
    }

    // --- Execute Download ---
    btnStartDownload.addEventListener('click', async () => {
        if (!currentVideoData) return;

        if (modalQualitySelect) modalQualitySelect.classList.add('hidden');

        const url = inputYtUrl.value.trim();
        const mediaType = document.querySelector('input[name="media_type"]:checked').value;
        const quality = selectVideoQuality.value;

        btnStartDownload.disabled = true;


        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, media_type: mediaType, quality })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.detail || 'Media download failed.');
            }

            let downloadData;
            if (result.job_id) {
                downloadData = await pollJobStatus(result.job_id, 'Downloading video stream...');
            } else {
                downloadData = result.data;
            }

            if (downloadData && downloadData.file_path) {
                lastDownloadedFilePath = downloadData.file_path;
                inputTrimFilepath.value = downloadData.file_path;
                inputSplitFilepath.value = downloadData.file_path;

                addDownloadedMediaItem({
                    title: currentVideoData ? currentVideoData.title : downloadData.filename,
                    file_path: downloadData.file_path,
                    filename: downloadData.filename,
                    thumbnail: currentVideoData ? currentVideoData.thumbnail : ''
                });

                // Trigger direct file save to client device

                const downloadUrl = `/api/download-file?path=${encodeURIComponent(downloadData.file_path)}`;
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = downloadData.filename || 'media';
                document.body.appendChild(a);
                a.click();
                a.remove();
            }

        } catch (error) {
            console.error('Download error:', error);
        } finally {
            btnStartDownload.disabled = false;
        }
    });

    // --- Playlist Batch Fetch & Download ---
    if (formPlaylistFetch) {
        formPlaylistFetch.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = inputPlaylistUrl.value.trim();
            if (!url) return;

            cardPlaylistInfo.classList.add('hidden');
            loaderPlaylistInfo.classList.remove('hidden');

            try {
                const response = await fetch('/api/playlist/info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, max_videos: 10 })
                });

                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.detail || 'Failed to fetch playlist.');
                }

                currentPlaylistData = result.data;
                txtPlaylistTitle.textContent = currentPlaylistData.title;
                txtPlaylistCount.textContent = `${currentPlaylistData.total_entries} items ready for batch download`;

                containerPlaylistItems.innerHTML = '';
                currentPlaylistData.items.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'playlist-item-card';
                    row.innerHTML = `
                        <span class="playlist-item-title">${item.title}</span>
                        <span class="filesize-tag">${formatDuration(item.duration)}</span>
                    `;
                    containerPlaylistItems.appendChild(row);
                });

                cardPlaylistInfo.classList.remove('hidden');

            } catch (error) {
                console.error('Playlist error:', error);
            } finally {
                loaderPlaylistInfo.classList.add('hidden');
            }
        });

        btnStartPlaylistDownload.addEventListener('click', async () => {
            if (!currentPlaylistData) return;

            const url = inputPlaylistUrl.value.trim();
            btnStartPlaylistDownload.disabled = true;

            try {
                const response = await fetch('/api/playlist/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, max_videos: 10 })
                });

                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.detail || 'Playlist download failed.');
                }

                let playlistResults;
                if (result.job_id) {
                    playlistResults = await pollJobStatus(result.job_id, 'Downloading playlist batch...');
                } else {
                    playlistResults = result.data;
                }

                if (Array.isArray(playlistResults)) {
                    playlistResults.forEach(res => {
                        if (res.file_path) {
                            const a = document.createElement('a');
                            a.href = `/api/download-file?path=${encodeURIComponent(res.file_path)}`;
                            a.download = res.filename || 'playlist_video';
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                        }
                    });
                }

            } catch (error) {
                console.error('Playlist download error:', error);
            } finally {
                btnStartPlaylistDownload.disabled = false;
            }
        });
    }

    // --- Execute Trim ---
    formTrimVideo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const filePath = inputTrimFilepath.value.trim();
        const startTime = inputTrimStart.value.trim();
        const endTime = inputTrimEnd.value.trim();
        const accurate = chkTrimAccurate.checked;
        const outputFormat = selectTrimFormat.value;

        if (!filePath || !startTime || !endTime) return;

        const btnExecute = document.getElementById('btn-execute-trim');
        btnExecute.disabled = true;

        try {
            const response = await fetch('/api/trim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_path: filePath,
                    start_time: startTime,
                    end_time: endTime,
                    accurate: accurate,
                    output_format: outputFormat
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.detail || 'Trimming failed.');
            }

            let trimData;
            if (result.job_id) {
                trimData = await pollJobStatus(result.job_id, 'Trimming video segment...');
            } else {
                trimData = result.data;
            }

            if (trimData && trimData.file_path) {
                const a = document.createElement('a');
                a.href = `/api/download-file?path=${encodeURIComponent(trimData.file_path)}`;
                a.download = trimData.filename || 'trimmed_media';
                document.body.appendChild(a);
                a.click();
                a.remove();
            }

        } catch (error) {
            console.error('Trim error:', error);
        } finally {
            btnExecute.disabled = false;
        }
    });

    // --- Execute Split ---
    formSplitVideo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const filePath = inputSplitFilepath.value.trim();
        const partCount = parseInt(inputSplitParts.value, 10);
        const totalDuration = parseFloat(inputSplitDuration.value);
        const accurate = chkSplitAccurate.checked;
        const outputFormat = selectSplitFormat.value;

        if (!filePath) {
            alert('Please select a downloaded video or provide a valid target file path first!');
            return;
        }
        if (isNaN(partCount) || partCount <= 1) {
            alert('Number of equal parts must be 2 or greater.');
            return;
        }
        if (isNaN(totalDuration) || totalDuration <= 0) {
            alert('Please enter total duration of the video in seconds.');
            return;
        }

        const btnExecute = document.getElementById('btn-execute-split');
        btnExecute.disabled = true;

        try {
            const response = await fetch('/api/split', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_path: filePath,
                    part_count: partCount,
                    total_duration: totalDuration,
                    accurate: accurate,
                    output_format: outputFormat
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.detail || 'Splitting failed.');
            }

            let splitData;
            if (result.job_id) {
                splitData = await pollJobStatus(result.job_id, 'Splitting video parts into ZIP archive...');
            } else {
                splitData = result.data;
            }

            if (splitData && splitData.file_path) {
                const a = document.createElement('a');
                a.href = `/api/download-file?path=${encodeURIComponent(splitData.file_path)}`;
                a.download = splitData.filename || 'split_video_parts.zip';
                document.body.appendChild(a);
                a.click();
                a.remove();
                addDownloadedMediaItem({
                    title: splitData.filename,
                    file_path: splitData.file_path,
                    filename: splitData.filename,
                    thumbnail: ''
                });
            } else if (Array.isArray(splitData) && splitData.length > 0) {
                splitData.forEach(part => {
                    if (part.file_path) {
                        const a = document.createElement('a');
                        a.href = `/api/download-file?path=${encodeURIComponent(part.file_path)}`;
                        a.download = part.filename || `part_${part.part}`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    }
                });
            } else {
                alert('Splitting finished but no ZIP file was returned.');
            }

        } catch (error) {
            console.error('Split error:', error);
            alert(`Video splitting error: ${error.message}`);
        } finally {
            btnExecute.disabled = false;
        }
    });

    // --- Execute Mix ---
    if (formMixVideo) {
        formMixVideo.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (selectedMixFiles.length < 2) {
                alert('Please select at least 2 downloaded video/audio clips from the library above to mix!');
                return;
            }

            const filePaths = selectedMixFiles.map(m => m.file_path);
            const outputFormat = selectMixFormat ? selectMixFormat.value : 'mp4';
            const btnExecute = document.getElementById('btn-execute-mix');
            if (btnExecute) btnExecute.disabled = true;

            try {
                const response = await fetch('/api/mix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_paths: filePaths,
                        output_format: outputFormat
                    })
                });

                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.detail || 'Mixing failed.');
                }

                let mixData;
                if (result.job_id) {
                    mixData = await pollJobStatus(result.job_id, 'Mixing and merging video clips...');
                } else {
                    mixData = result.data;
                }

                if (mixData && mixData.file_path) {
                    const a = document.createElement('a');
                    a.href = `/api/download-file?path=${encodeURIComponent(mixData.file_path)}`;
                    a.download = mixData.filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    addDownloadedMedia(mixData);
                }
            } catch (error) {
                console.error('Mixing error:', error);
                alert(`Mixing failed: ${error.message}`);
            } finally {
                if (btnExecute) btnExecute.disabled = false;
            }
        });
    }

    // --- Utility Functions ---
    function formatDuration(seconds) {
        if (!seconds) return '00:00';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const pad = n => n.toString().padStart(2, '0');
        return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
    }

    // --- Initial Startup Personalized Auto-Load ---
    async function initPersonalizedHomeFeed() {
        renderRecentSearchChips();

        // 1. Instant Render from local cache (0-ms load, no blank screen)
        try {
            const lastDataStr = localStorage.getItem(STORAGE_KEY_LAST_DATA);
            if (lastDataStr) {
                const parsedObj = JSON.parse(lastDataStr);
                const timestamp = parsedObj.timestamp;
                const parsed = parsedObj.data || parsedObj;
                if (timestamp && (Date.now() - timestamp > CACHE_TTL_MS)) {
                    localStorage.removeItem(STORAGE_KEY_LAST_DATA);
                } else if (parsed && parsed.title) {
                    currentVideoData = parsed;
                    loaderVideoInfo.classList.add('hidden');
                    cardVideoInfo.classList.remove('hidden');
                    renderVideoMetadata(parsed);
                    updateLikeButtonState();
                    updateSaveButtonState();
                    renderComments(parsed);
                    return;
                }
            }
        } catch (e) {
            console.error('Initial cache parse error:', e);
        }

        // 2. Fallback initial load: load popular nature scenery or history to fill home grid
        const history = getSearchHistory();
        const likes = Object.values(getLikedVideos());

        let initialQuery = '3 Hours of Amazing Nature Scenery';
        if (history.length > 0) {
            initialQuery = history[0];
        } else if (likes.length > 0) {
            initialQuery = likes[likes.length - 1].url || likes[likes.length - 1].title;
        }

        cardVideoInfo.classList.add('hidden');
        loaderVideoInfo.classList.remove('hidden');
        executeFetchInfo(initialQuery);
    }

    // --- Mobile Bottom Nav & Category Chips Listeners ---
    document.querySelectorAll('.cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            let query = chip.getAttribute('data-query');
            if (!query || query.trim() === '') {
                query = 'Trending';
            }
            if (query === 'saved') {
                const saved = Object.values(getSavedVideos());
                if (saved.length > 0) {
                    formFetchInfo.dispatchEvent(new CustomEvent('fetch-query', { detail: saved[saved.length - 1].url }));
                }
            } else if (query) {
                inputYtUrl.value = query;
                formFetchInfo.dispatchEvent(new CustomEvent('fetch-query', { detail: query }));
            }
        });
    });

    const mnavMap = {
        'mnav-home': 'tab-downloader',
        'mnav-trimmer': 'tab-trimmer',
        'mnav-splitter': 'tab-splitter',
        'mnav-mixer': 'tab-mixer',
        'mnav-playlist': 'tab-playlist'
    };

    Object.keys(mnavMap).forEach(mId => {
        const btn = document.getElementById(mId);
        if (btn) {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const targetTabId = mnavMap[mId];
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                const targetPanel = document.getElementById(targetTabId);
                if (targetPanel) targetPanel.classList.add('active');
            });
        }
    });

    const mnavSaved = document.getElementById('mnav-saved');
    if (mnavSaved) {
        mnavSaved.addEventListener('click', () => {
            document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
            mnavSaved.classList.add('active');
            const saved = Object.values(getSavedVideos());
            if (saved.length > 0) {
                inputYtUrl.value = saved[saved.length - 1].url;
                formFetchInfo.dispatchEvent(new Event('submit'));
            }
        });
    }

    // --- Left Mini Sidebar Event Handlers ---
    const snavMap = {
        'snav-home': 'tab-downloader',
        'snav-trimmer': 'tab-trimmer',
        'snav-splitter': 'tab-splitter',
        'snav-mixer': 'tab-mixer',
        'snav-playlist': 'tab-playlist'
    };

    Object.keys(snavMap).forEach(sId => {
        const btn = document.getElementById(sId);
        if (btn) {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mini-nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const targetTabId = snavMap[sId];
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                const targetPanel = document.getElementById(targetTabId);
                if (targetPanel) targetPanel.classList.add('active');
            });
        }
    });

    const snavSaved = document.getElementById('snav-saved');
    if (snavSaved) {
        snavSaved.addEventListener('click', () => {
            document.querySelectorAll('.mini-nav-item').forEach(b => b.classList.remove('active'));
            snavSaved.classList.add('active');
            const saved = Object.values(getSavedVideos());
            if (saved.length > 0) {
                inputYtUrl.value = saved[saved.length - 1].url;
                formFetchInfo.dispatchEvent(new Event('submit'));
            }
        });
    }

    // --- Mobile Search Bar Overlay Toggle ---
    const btnMobileSearchToggle = document.getElementById('btn-mobile-search-toggle');
    const btnCloseMobileSearch = document.getElementById('btn-close-mobile-search');
    const ytSearchCenter = document.getElementById('yt-search-center');

    if (btnMobileSearchToggle && ytSearchCenter) {
        btnMobileSearchToggle.addEventListener('click', () => {
            ytSearchCenter.classList.add('mobile-active');
            if (inputYtUrl) inputYtUrl.focus();
        });
    }

    if (btnCloseMobileSearch && ytSearchCenter) {
        btnCloseMobileSearch.addEventListener('click', () => {
            ytSearchCenter.classList.remove('mobile-active');
        });
    }

    // --- Category Chips Carousel Scroll Navigation ---
    const btnCatPrev = document.getElementById('btn-cat-prev');
    const btnCatNext = document.getElementById('btn-cat-next');
    const containerCategoryChips = document.getElementById('container-category-chips');

    if (btnCatPrev && containerCategoryChips) {
        btnCatPrev.addEventListener('click', () => {
            containerCategoryChips.scrollBy({ left: -250, behavior: 'smooth' });
        });
    }

    if (btnCatNext && containerCategoryChips) {
        btnCatNext.addEventListener('click', () => {
            containerCategoryChips.scrollBy({ left: 250, behavior: 'smooth' });
        });
    }

    initPersonalizedHomeFeed();
});







