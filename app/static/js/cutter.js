// cutter.js - Video Cutter / Trimmer Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const containerTrimMediaList = document.getElementById('container-trim-media-list');
    const wrapperTrimPreview = document.getElementById('wrapper-trim-preview');
    const playerTrimPreview = document.getElementById('player-trim-preview');
    const formTrimVideo = document.getElementById('form-trim-video');
    const inputTrimFilepath = document.getElementById('input-trim-filepath');
    const inputTrimStart = document.getElementById('input-trim-start');
    const inputTrimEnd = document.getElementById('input-trim-end');
    const selectTrimFormat = document.getElementById('select-trim-format');
    const chkTrimAccurate = document.getElementById('chk-trim-accurate');
    
    const progressContainer = document.getElementById('progress-container');
    const txtProgressStatus = document.getElementById('txt-progress-status');
    const txtProgressPercent = document.getElementById('txt-progress-percent');
    const progressFill = document.getElementById('progress-fill');

    function renderTrimMediaGrid() {
        if (!containerTrimMediaList) return;
        containerTrimMediaList.innerHTML = '';
        const list = getDownloadedMediaList();

        if (list.length === 0) {
            containerTrimMediaList.innerHTML = '<p class="empty-library-msg">No downloaded videos yet. <a href="/download.html" style="color:var(--brand-orange)">Download a video first!</a></p>';
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
                if (inputTrimFilepath) inputTrimFilepath.value = item.file_path;

                if (playerTrimPreview && wrapperTrimPreview) {
                    playerTrimPreview.src = `/api/download-file?path=${encodeURIComponent(item.file_path)}`;
                    wrapperTrimPreview.classList.remove('hidden');
                }
            });
            containerTrimMediaList.appendChild(card);
        });
    }

    if (formTrimVideo) {
        formTrimVideo.addEventListener('submit', async (e) => {
            e.preventDefault();
            const filePath = inputTrimFilepath ? inputTrimFilepath.value.trim() : '';
            const startTime = inputTrimStart ? inputTrimStart.value.trim() : '00:00:00';
            const endTime = inputTrimEnd ? inputTrimEnd.value.trim() : '';
            const format = selectTrimFormat ? selectTrimFormat.value : 'mp4';
            const accurate = chkTrimAccurate ? chkTrimAccurate.checked : false;

            if (!filePath || !endTime) {
                alert('Please select a video file and specify end time.');
                return;
            }

            if (progressContainer) progressContainer.classList.remove('hidden');

            try {
                const res = await fetch('/api/trim', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_path: filePath,
                        start_time: startTime,
                        end_time: endTime,
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
                            saveDownloadedMediaItem(result);
                            window.location.href = `/api/download-file?path=${encodeURIComponent(result.file_path)}`;
                        },
                        (err) => {
                            if (progressContainer) progressContainer.classList.add('hidden');
                            alert(`Trimming failed: ${err}`);
                        }
                    );
                }
            } catch (e) {
                if (progressContainer) progressContainer.classList.add('hidden');
                alert(`Trimming error: ${e.message}`);
            }
        });
    }

    renderTrimMediaGrid();
});
