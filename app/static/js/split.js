// split.js - Video Splitter Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const containerSplitMediaList = document.getElementById('container-split-media-list');
    const wrapperSplitWorkspace = document.getElementById('wrapper-split-workspace');
    const playerSplitPreview = document.getElementById('player-split-preview');
    const txtSplitVideoName = document.getElementById('txt-split-video-name');
    const txtSplitVideoDuration = document.getElementById('txt-split-video-duration');
    
    const formSplitVideo = document.getElementById('form-split-video');
    const inputSplitFilepath = document.getElementById('input-split-filepath');
    const inputSplitDuration = document.getElementById('input-split-duration');
    const inputSplitParts = document.getElementById('input-split-parts');
    const selectSplitFormat = document.getElementById('select-split-format');
    const chkSplitAccurate = document.getElementById('chk-split-accurate');
    
    const btnSplitMinus = document.getElementById('btn-split-minus');
    const btnSplitPlus = document.getElementById('btn-split-plus');
    const containerSplitPresets = document.getElementById('container-split-presets');
    const txtSplitBreakdownSummary = document.getElementById('txt-split-breakdown-summary');
    const containerSplitSegments = document.getElementById('container-split-segments');
    
    const progressContainer = document.getElementById('progress-container');
    const txtProgressStatus = document.getElementById('txt-progress-status');
    const txtProgressPercent = document.getElementById('txt-progress-percent');
    const progressFill = document.getElementById('progress-fill');

    function updateSplitBreakdown() {
        if (!containerSplitSegments || !inputSplitDuration || !inputSplitParts) return;
        const totalSec = parseFloat(inputSplitDuration.value) || 0;
        const parts = parseInt(inputSplitParts.value) || 2;
        containerSplitSegments.innerHTML = '';

        if (totalSec <= 0 || parts <= 0) return;

        const partSec = totalSec / parts;
        if (txtSplitBreakdownSummary) {
            txtSplitBreakdownSummary.textContent = `Splitting video into ${parts} equal parts (~${formatDuration(partSec)} per segment)...`;
        }

        for (let i = 0; i < parts; i++) {
            const start = i * partSec;
            const end = (i + 1) * partSec;
            const row = document.createElement('div');
            row.className = 'segment-item-tag';
            row.innerHTML = `
                <div>
                    <span class="segment-part-badge">Part ${i + 1}</span>
                    <span>${formatDuration(start)} - ${formatDuration(end)}</span>
                </div>
                <span class="segment-duration-tag">~${formatDuration(partSec)}</span>
            `;
            containerSplitSegments.appendChild(row);
        }
    }

    function renderSplitMediaGrid() {
        if (!containerSplitMediaList) return;
        containerSplitMediaList.innerHTML = '';
        const list = getDownloadedMediaList();

        if (list.length === 0) {
            containerSplitMediaList.innerHTML = '<p class="empty-library-msg">No downloaded videos yet. <a href="/download.html" style="color:var(--brand-orange)">Download a video first!</a></p>';
            return;
        }

        list.forEach(item => {
            const card = document.createElement('div');
            card.className = 'media-library-card';
            card.innerHTML = `
                <div class="media-card-thumb">
                    <img src="${item.thumbnail || 'https://via.placeholder.com/240x130'}" alt="${item.title || 'Downloaded Video'}">
                </div>
                <div class="media-card-title">${item.title || item.filename}</div>
                <div class="media-card-badge" title="${item.filename}">${item.filename}</div>
            `;
            card.addEventListener('click', () => {
                document.querySelectorAll('.media-library-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                if (inputSplitFilepath) inputSplitFilepath.value = item.file_path;
                if (txtSplitVideoName) txtSplitVideoName.textContent = item.title || item.filename;

                if (playerSplitPreview && wrapperSplitWorkspace) {
                    playerSplitPreview.src = `/api/download-file?path=${encodeURIComponent(item.file_path)}`;
                    wrapperSplitWorkspace.classList.remove('hidden');
                    playerSplitPreview.onloadedmetadata = () => {
                        if (playerSplitPreview.duration && inputSplitDuration) {
                            const dur = Math.round(playerSplitPreview.duration);
                            inputSplitDuration.value = dur;
                            if (txtSplitVideoDuration) txtSplitVideoDuration.textContent = `Duration: ${formatDuration(dur)}`;
                            updateSplitBreakdown();
                        }
                    };
                }
            });
            containerSplitMediaList.appendChild(card);
        });

        // Auto-select file if auto_file URL parameter exists
        const urlParams = new URLSearchParams(window.location.search);
        const autoFile = urlParams.get('auto_file');
        if (autoFile) {
            const list = getDownloadedMediaList();
            const targetItem = list.find(m => m.file_path === autoFile) || { file_path: autoFile, title: 'Downloaded Video', filename: 'video.mp4' };
            if (inputSplitFilepath) inputSplitFilepath.value = targetItem.file_path;
            if (txtSplitVideoName) txtSplitVideoName.textContent = targetItem.title || targetItem.filename;

            if (playerSplitPreview && wrapperSplitWorkspace) {
                playerSplitPreview.src = `/api/download-file?path=${encodeURIComponent(targetItem.file_path)}`;
                wrapperSplitWorkspace.classList.remove('hidden');
                playerSplitPreview.onloadedmetadata = () => {
                    if (playerSplitPreview.duration && inputSplitDuration) {
                        const dur = Math.round(playerSplitPreview.duration);
                        inputSplitDuration.value = dur;
                        if (txtSplitVideoDuration) txtSplitVideoDuration.textContent = `Duration: ${formatDuration(dur)}`;
                        updateSplitBreakdown();
                    }
                };
            }
        }
    }

    const btnClearSplitHistory = document.getElementById('btn-clear-split-history');
    if (btnClearSplitHistory) {
        btnClearSplitHistory.addEventListener('click', () => {
            clearDownloadedMediaHistory();
            renderSplitMediaGrid();
            if (wrapperSplitWorkspace) wrapperSplitWorkspace.classList.add('hidden');
        });
    }

    if (btnSplitMinus) {
        btnSplitMinus.addEventListener('click', () => {
            let val = parseInt(inputSplitParts.value) || 2;
            if (val > 2) {
                inputSplitParts.value = val - 1;
                updateSplitBreakdown();
            }
        });
    }

    if (btnSplitPlus) {
        btnSplitPlus.addEventListener('click', () => {
            let val = parseInt(inputSplitParts.value) || 2;
            if (val < 20) {
                inputSplitParts.value = val + 1;
                updateSplitBreakdown();
            }
        });
    }

    if (containerSplitPresets) {
        containerSplitPresets.addEventListener('click', (e) => {
            const pill = e.target.closest('.preset-pill');
            if (!pill) return;
            document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const parts = pill.getAttribute('data-parts');
            if (parts && inputSplitParts) {
                inputSplitParts.value = parts;
                updateSplitBreakdown();
            }
        });
    }

    if (formSplitVideo) {
        formSplitVideo.addEventListener('submit', async (e) => {
            e.preventDefault();
            const filePath = inputSplitFilepath ? inputSplitFilepath.value.trim() : '';
            const parts = parseInt(inputSplitParts ? inputSplitParts.value : 2);
            const duration = parseFloat(inputSplitDuration ? inputSplitDuration.value : 0);
            const format = selectSplitFormat ? selectSplitFormat.value : 'mp4';
            const accurate = chkSplitAccurate ? chkSplitAccurate.checked : false;

            if (!filePath || !parts || !duration) {
                alert('Please select a video file to split.');
                return;
            }

            if (progressContainer) progressContainer.classList.remove('hidden');

            try {
                const res = await fetch('/api/split', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_path: filePath,
                        part_count: parts,
                        total_duration: duration,
                        accurate: accurate,
                        output_format: format
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
                            if (result.file_path) {
                                window.location.href = `/api/download-file?path=${encodeURIComponent(result.file_path)}`;
                            }
                        },
                        (err) => {
                            if (progressContainer) progressContainer.classList.add('hidden');
                            alert(`Splitting failed: ${err}`);
                        }
                    );
                }
            } catch (e) {
                if (progressContainer) progressContainer.classList.add('hidden');
                alert(`Splitting error: ${e.message}`);
            }
        });
    }

    renderSplitMediaGrid();
});
