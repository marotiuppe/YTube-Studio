// mix.js - Video & Audio Mixer Page Logic

document.addEventListener('DOMContentLoaded', () => {
    const containerMixMediaList = document.getElementById('container-mix-media-list');
    const wrapperMixSelectedQueue = document.getElementById('wrapper-mix-selected-queue');
    const formMixVideo = document.getElementById('form-mix-video');
    const selectMixFormat = document.getElementById('select-mix-format');
    let selectedMixFiles = [];

    const progressContainer = document.getElementById('progress-container');
    const txtProgressStatus = document.getElementById('txt-progress-status');
    const txtProgressPercent = document.getElementById('txt-progress-percent');
    const progressFill = document.getElementById('progress-fill');

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
                renderMixMediaGrid();
            });
            wrapperMixSelectedQueue.appendChild(row);
        });
    }

    function renderMixMediaGrid() {
        if (!containerMixMediaList) return;
        containerMixMediaList.innerHTML = '';
        const list = getDownloadedMediaList();

        if (list.length === 0) {
            containerMixMediaList.innerHTML = '<p class="empty-library-msg">No downloaded videos yet. <a href="/download.html" style="color:var(--brand-orange)">Download videos first!</a></p>';
            return;
        }

        list.forEach(item => {
            const card = document.createElement('div');
            const isSelected = selectedMixFiles.some(m => m.file_path === item.file_path);
            card.className = `media-library-card ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="media-card-thumb">
                    <img src="${item.thumbnail || 'https://via.placeholder.com/240x130'}" alt="${item.title || 'Downloaded Video'}">
                </div>
                <div class="media-card-title">${item.title || item.filename}</div>
                <div class="media-card-badge" title="${item.filename}">${item.filename}</div>
            `;
            card.addEventListener('click', () => {
                const existingIdx = selectedMixFiles.findIndex(m => m.file_path === item.file_path);
                if (existingIdx >= 0) {
                    selectedMixFiles.splice(existingIdx, 1);
                } else {
                    selectedMixFiles.push(item);
                }
                renderMixQueue();
                renderMixMediaGrid();
            });
            containerMixMediaList.appendChild(card);
        });
    }

    if (formMixVideo) {
        formMixVideo.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (selectedMixFiles.length < 2) {
                alert('Please select at least 2 clips to merge and mix.');
                return;
            }

            const paths = selectedMixFiles.map(f => f.file_path);
            const format = selectMixFormat ? selectMixFormat.value : 'mp4';

            if (progressContainer) progressContainer.classList.remove('hidden');

            try {
                const res = await fetch('/api/mix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_paths: paths,
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
                            alert(`Mixing failed: ${err}`);
                        }
                    );
                }
            } catch (e) {
                if (progressContainer) progressContainer.classList.add('hidden');
                alert(`Mixing error: ${e.message}`);
            }
        });
    }

    renderMixMediaGrid();
});
