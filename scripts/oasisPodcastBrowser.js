const SERVER_URL = "https://podcast.oasis-archive.org";
    
    const state = {
      history: JSON.parse(localStorage.getItem('oasisHistory')) || [],
      isPlaying: false,
      currentTrack: null
    };

    const els = {
      searchInput: document.getElementById('searchInput'),
      clearBtn: document.getElementById('clearBtn'),
      historySection: document.getElementById('historySection'),
      breadcrumbs: document.getElementById('breadcrumbs'),
      contentArea: document.getElementById('contentArea'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      miniPlayer: document.getElementById('miniPlayer'),
      miniPlayBtn: document.getElementById('miniPlayBtn'),
      miniArtwork: document.getElementById('miniArtwork'),
      miniInfo: document.getElementById('miniInfo'),
      miniTitle: document.getElementById('miniTitle'),
      miniArtist: document.getElementById('miniArtist'),
      miniProgress: document.getElementById('miniProgress'),
      miniProgressFill: document.getElementById('miniProgressFill'),
      fullPlayer: document.getElementById('fullPlayer'),
      closePlayerBtn: document.getElementById('closePlayerBtn'),
      fullPlayBtn: document.getElementById('fullPlayBtn'),
      fullArtwork: document.getElementById('fullArtwork'),
      fullTitle: document.getElementById('fullTitle'),
      fullArtist: document.getElementById('fullArtist'),
      progressBar: document.getElementById('progressBar'),
      progressFill: document.getElementById('progressFill'),
      currentTime: document.getElementById('currentTime'),
      duration: document.getElementById('duration'),
      skipBackBtn: document.getElementById('skipBackBtn'),
      skipForwardBtn: document.getElementById('skipForwardBtn'),
      volumeSlider: document.getElementById('volumeSlider'),
      volumeIcon: document.getElementById('volumeIcon'),
      audioElement: document.getElementById('audioElement'),
      toast: document.getElementById('toast'),
      appTitle: document.getElementById('appTitle')
    };

    function showToast(message) {
      els.toast.textContent = message;
      els.toast.classList.add('active');
      setTimeout(() => {
        els.toast.classList.remove('active');
      }, 3000);
    }

    function renderHistory() {
      if (state.history.length === 0) {
        els.historySection.classList.remove('active');
        return;
      }
      
      els.historySection.classList.add('active');
      els.historySection.innerHTML = state.history
        .map(term => `<button class="history-chip" onclick="doSearch('${term.replace(/'/g, "\\'")}')">${term}</button>`)
        .join('');
    }

    async function doSearch(query) {
      if (!query.trim()) return;

      if (!state.history.includes(query)) {
        state.history.unshift(query);
        if (state.history.length > 10) state.history.pop();
        localStorage.setItem('oasisHistory', JSON.stringify(state.history));
        renderHistory();
      }

      els.loadingOverlay.classList.add('active');
      els.breadcrumbs.style.display = 'flex';
      els.breadcrumbs.innerHTML = `
        <span class="crumb-link" onclick="location.reload()"><i class="fas fa-home"></i> OFFICE</span>
        <i class="fas fa-chevron-right" style="font-size: 10px;"></i>
        <span class="crumb-active"><i class="fas fa-satellite-dish"></i> WIRE: ${query}</span>
      `;

      try {
        const res = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        els.loadingOverlay.classList.remove('active');

        if (data.length === 0) {
          els.contentArea.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon"><i class="fas fa-search"></i></div>
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">TELEGRAM LOST</div>
              <div style="font-size: 13px;">Ain't nothin' on the wire by that name, partner</div>
            </div>
          `;
          return;
        }

        els.contentArea.innerHTML = data.map(pod => `
          <div class="podcast-card" onclick="loadEpisodes('${pod.rss}', '${pod.title.replace(/'/g, "\\'")}', '${pod.image}')">
            <img src="${pod.image}" class="podcast-artwork" alt="${pod.title}">
            <div class="podcast-info">
              <div class="podcast-title">${pod.title}</div>
              <div class="podcast-artist">${pod.artist}</div>
            </div>
            <i class="fas fa-chevron-right podcast-chevron"></i>
          </div>
        `).join('');
      } catch (e) {
        els.loadingOverlay.classList.remove('active');
        els.contentArea.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div style="color: #ef4444; font-weight: 600; font-size: 16px; margin-bottom: 8px;">WIRE DOWN</div>
            <div style="font-size: 12px; margin-top: 8px;">Telegraph lines busted - check SERVER_URL</div>
          </div>
        `;
      }
    }

    let lastSearchQuery = '';

    async function loadEpisodes(rss, title, image) {
      els.loadingOverlay.classList.add('active');
      lastSearchQuery = els.searchInput.value;
      els.breadcrumbs.innerHTML = `
        <span class="crumb-link" id="backToSearch"><i class="fas fa-arrow-left"></i> BACK</span>
        <i class="fas fa-chevron-right" style="font-size: 10px;"></i>
        <span class="crumb-active"><i class="fas fa-radio"></i> ${title}</span>
      `;
      
      setTimeout(() => {
        const backBtn = document.getElementById('backToSearch');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            doSearch(lastSearchQuery);
          });
        }
      }, 0);

      try {
        const res = await fetch(`${SERVER_URL}/api/episodes?rss=${encodeURIComponent(rss)}`);
        const eps = await res.json();
        els.loadingOverlay.classList.remove('active');

        els.contentArea.innerHTML = eps.map(ep => `
          <div class="episode-card">
            <div class="episode-info">
              <div class="episode-title"><i class="fas fa-broadcast-tower" style="margin-right: 6px; font-size: 11px;"></i>${ep.title}</div>
            </div>
            <div class="episode-actions">
              <button class="action-btn play-btn" onclick="playTrack('${ep.url}', '${ep.title.replace(/'/g, "\\'")}', '${title.replace(/'/g, "\\'")}', '${image}')" title="PLAY BROADCAST">
                <i class="fas fa-play"></i>
              </button>
              <button class="action-btn download-btn" onclick="downloadEpisode('${ep.url}', '${ep.title.replace(/'/g, "\\'")}', this)" title="SAVE TO SADDLEBAG">
                <i class="fas fa-download"></i>
              </button>
            </div>
          </div>
        `).join('');
      } catch (e) {
        els.loadingOverlay.classList.remove('active');
        showToast('✗ TELEGRAPH LINES DOWN - Can\'t fetch broadcasts');
      }
    }

    async function downloadEpisode(url, title, btnElement) {
      const iconEl = btnElement.querySelector('i');
      const originalClass = iconEl.className;
      
      try {
        const filename = title.replace(/[^a-z0-9\s]/gi, '_').substring(0, 100) + '.mp3';
        
        if ('showSaveFilePicker' in window) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [{
                description: 'Audio Files',
                accept: { 'audio/mpeg': ['.mp3'] }
              }]
            });

            iconEl.className = 'fas fa-spinner fa-spin';
            btnElement.classList.add('downloading');

            const response = await fetch(url);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch audio file - Status: ${response.status}`);
            }

            const blob = await response.blob();

            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();

            showToast('✓ TRANSMISSION SAVED TO SADDLEBAG!');
          } catch (e) {
            if (e.name === 'AbortError') {
              throw e;
            }
            
            iconEl.className = 'fas fa-spinner fa-spin';
            btnElement.classList.add('downloading');
            
            const response = await fetch(url);
            const blob = await response.blob();
            downloadBlob(blob, filename);
          }
        } else {
          iconEl.className = 'fas fa-spinner fa-spin';
          btnElement.classList.add('downloading');
          
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch audio file - Status: ${response.status}`);
          }

          const blob = await response.blob();
          
          downloadBlob(blob, filename);
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          showToast('✗ TRANSMISSION FAILED - Wire busted!');
        }
      } finally {
        iconEl.className = originalClass;
        btnElement.classList.remove('downloading');
      }
    }

    function downloadBlob(blob, filename) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast('✓ RIDIN\' OUT TO YOUR SADDLEBAG!');
    }

    function playTrack(url, title, artist, artwork) {
      state.currentTrack = { url, title, artist, artwork };
      
      els.audioElement.src = url;
      els.audioElement.play();
      state.isPlaying = true;

      els.miniTitle.textContent = title;
      els.miniArtist.textContent = artist;
      els.miniArtwork.src = artwork;
      
      els.fullTitle.textContent = title;
      els.fullArtist.textContent = artist;
      els.fullArtwork.src = artwork;

      els.miniPlayer.classList.add('active');
      updatePlayButtons();
    }

    function togglePlay() {
      if (state.isPlaying) {
        els.audioElement.pause();
        state.isPlaying = false;
      } else {
        els.audioElement.play();
        state.isPlaying = true;
      }
      updatePlayButtons();
    }

    function updatePlayButtons() {
      const icon = state.isPlaying ? 'fa-pause' : 'fa-play';
      els.miniPlayBtn.querySelector('i').className = `fas ${icon}`;
      els.fullPlayBtn.querySelector('i').className = `fas ${icon}`;
    }

    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Event Listeners
    els.searchInput.addEventListener('input', (e) => {
      els.clearBtn.classList.toggle('active', e.target.value.length > 0);
    });

    els.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        doSearch(e.target.value);
      }
    });

    els.clearBtn.addEventListener('click', () => {
      els.searchInput.value = '';
      els.clearBtn.classList.remove('active');
      els.searchInput.focus();
    });

    els.miniPlayBtn.addEventListener('click', togglePlay);
    els.fullPlayBtn.addEventListener('click', togglePlay);

    els.miniInfo.addEventListener('click', () => {
      els.fullPlayer.classList.add('active');
    });

    els.miniArtwork.addEventListener('click', () => {
      els.fullPlayer.classList.add('active');
    });

    els.closePlayerBtn.addEventListener('click', () => {
      els.fullPlayer.classList.remove('active');
    });

    els.skipBackBtn.addEventListener('click', () => {
      els.audioElement.currentTime = Math.max(0, els.audioElement.currentTime - 15);
    });

    els.skipForwardBtn.addEventListener('click', () => {
      els.audioElement.currentTime = Math.min(els.audioElement.duration, els.audioElement.currentTime + 15);
    });

    els.audioElement.addEventListener('timeupdate', () => {
      if (els.audioElement.duration) {
        const progress = (els.audioElement.currentTime / els.audioElement.duration) * 100;
        els.progressFill.style.width = `${progress}%`;
        els.miniProgressFill.style.width = `${progress}%`;
        els.currentTime.textContent = formatTime(els.audioElement.currentTime);
        els.duration.textContent = formatTime(els.audioElement.duration);
      }
    });

    els.audioElement.addEventListener('ended', () => {
      state.isPlaying = false;
      updatePlayButtons();
    });

    els.progressBar.addEventListener('click', (e) => {
      const rect = els.progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      els.audioElement.currentTime = percent * els.audioElement.duration;
    });

    els.miniProgress.addEventListener('click', (e) => {
      const rect = els.miniProgress.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      els.audioElement.currentTime = percent * els.audioElement.duration;
    });

    els.volumeSlider.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      els.audioElement.volume = volume;
      updateVolumeIcon(volume);
      localStorage.setItem('oasisVolume', volume);
    });

    els.volumeIcon.addEventListener('click', () => {
      if (els.audioElement.volume > 0) {
        els.audioElement.dataset.prevVolume = els.audioElement.volume;
        els.audioElement.volume = 0;
        els.volumeSlider.value = 0;
      } else {
        const prevVolume = parseFloat(els.audioElement.dataset.prevVolume) || 1;
        els.audioElement.volume = prevVolume;
        els.volumeSlider.value = prevVolume * 100;
      }
      updateVolumeIcon(els.audioElement.volume);
    });

    function updateVolumeIcon(volume) {
      if (volume === 0) {
        els.volumeIcon.className = 'fas fa-volume-mute volume-icon';
      } else if (volume < 0.5) {
        els.volumeIcon.className = 'fas fa-volume-down volume-icon';
      } else {
        els.volumeIcon.className = 'fas fa-volume-up volume-icon';
      }
    }

    // Initialize
    renderHistory();
    
    // Restore volume
    const savedVolume = localStorage.getItem('oasisVolume');
    if (savedVolume !== null) {
      els.audioElement.volume = parseFloat(savedVolume);
      els.volumeSlider.value = parseFloat(savedVolume) * 100;
      updateVolumeIcon(parseFloat(savedVolume));
    }