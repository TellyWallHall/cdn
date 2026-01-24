
    // ========== CONFIGURATION ==========
    const HARD_CODED_URL = "https://tube.oasis-archive.org";
    let API_URL = HARD_CODED_URL;
    let currentVideo = null;
    let preparedBlob = null;
    let preparedFileName = '';

    // ========== INITIALIZATION ==========
    window.onload = () => {
      if (API_URL.endsWith('/')) API_URL = API_URL.slice(0, -1);
      
      fetch(API_URL + "/")
        .then(r => r.json())
        .then(data => {
          document.getElementById('connect-screen').style.display = 'none';
          document.getElementById('app').style.display = 'flex';
          goHome();
        })
        .catch(e => {
          document.getElementById('status-text').innerText = "Connection Failed.\n\n1. Check your internet.\n2. Server might be offline.";
          document.getElementById('status-text').style.color = "#ff4444";
          document.querySelector('.loader-ring').classList.remove('animate-spin');
          document.getElementById('retry-btn').style.display = 'block';
        });
      
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Escape key closes player or popups
        if (e.key === 'Escape') {
          if (document.getElementById('player-overlay').style.display !== 'none') {
            minimizePlayer();
          } else if (document.getElementById('dl-popup').style.display !== 'none') {
            closeDlPopup();
          } else if (document.getElementById('share-popup').style.display !== 'none') {
            closeSharePopup();
          } else if (document.getElementById('settings-popup').style.display !== 'none') {
            closeSettings();
          } else if (document.getElementById('library-popup').style.display !== 'none') {
            closeLibrary();
          }
        }
        
        // Space bar toggle play/pause in mini player
        if (e.key === ' ' && document.getElementById('mini-player').style.display !== 'none' && e.target.tagName !== 'INPUT') {
          e.preventDefault();
          toggleMiniPlay();
        }
      });
    };

    // ========== NAVIGATION ==========
    function setActiveNav(tab) {
      document.querySelectorAll('.nav-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tab;
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-gray-400', !isActive);
      });
    }

    async function goHome() {
      setActiveNav('home');
      runSearch('trending');
    }

    // ========== SEARCH ==========
    async function runSearch(q = null) {
      const query = q || document.getElementById('q-input').value;
      if (!query) return;
      
      showLoader();
      
      try {
        const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        renderGrid(data);
      } catch (e) {
        showToast('Search failed. Please try again.', 'error');
        hideLoader();
        showEmpty();
      }
    }

    // ========== SUBSCRIPTIONS ==========
    async function loadSubs() {
      setActiveNav('subs');
      const subs = JSON.parse(localStorage.getItem('oasis_client_subs') || '[]');
      
      if (subs.length === 0) {
        showEmpty('No subscriptions yet', 'Subscribe to channels to see their latest videos here');
        return;
      }
      
      showLoader();
      
      try {
        const promises = subs.map(s => 
          fetch(`${API_URL}/api/search?q=${encodeURIComponent(s)}&sort=date`)
            .then(r => r.json())
            .catch(err => {
              console.error('Failed to fetch for:', s, err);
              return [];
            })
        );
        const results = await Promise.all(promises);
        const mixed = results.flat().sort((a, b) => {
          const dateA = a.upload_date || a.date || 0;
          const dateB = b.upload_date || b.date || 0;
          return dateB - dateA;
        });
        
        if (mixed.length === 0) {
          showEmpty('No videos found', 'Your subscribed channels have no recent videos');
        } else {
          renderGrid(mixed);
        }
      } catch (e) {
        console.error('Subscription feed error:', e);
        showToast('Could not load subscription feed.', 'error');
        hideLoader();
        showEmpty('Error loading feed', 'Please check your connection and try again');
      }
    }

    // ========== VIDEO GRID ==========
    function renderGrid(videos) {
      const grid = document.getElementById('video-grid');
      hideLoader();
      
      if (!videos || videos.length === 0) {
        showEmpty();
        return;
      }
      
      document.getElementById('empty-state').style.display = 'none';
      
      grid.innerHTML = videos.map(v => {
        // Ensure we have a valid ID
        const videoId = v.id || v.video_id || '';
        if (!videoId) {
          console.warn('Video missing ID:', v);
          return '';
        }
        
        const title = v.title || 'Untitled Video';
        const uploader = v.uploader || v.channel || 'Unknown';
        const thumbnail = v.thumbnail || v.thumbnails?.[0]?.url || '';
        const duration = v.duration || 0;
        const views = v.view_count || v.views || 0;
        const uploadDate = v.upload_date || v.date || 0;
        
        return `
        <article class="video-card cursor-pointer animate-fade" onclick="loadPlayer('${escapeHtml(videoId)}')">
          <div class="relative aspect-video bg-[#1f1f1f] rounded-xl overflow-hidden mb-3">
            ${thumbnail ? `<img 
              src="${escapeHtml(thumbnail)}" 
              alt="${escapeHtml(title)}"
              class="w-full h-full object-cover"
              loading="lazy"
              onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center bg-[#1f1f1f]\\' ><i class=\\'fas fa-play text-4xl text-gray-600\\'></i></div>'"
            >` : `<div class="w-full h-full flex items-center justify-center bg-[#1f1f1f]"><i class="fas fa-play text-4xl text-gray-600"></i></div>`}
            ${duration ? `<span class="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-medium">${formatDuration(duration)}</span>` : ''}
          </div>
          <div class="flex gap-3">
            <div class="w-9 h-9 bg-[#ff0000] rounded-full flex-shrink-0 flex items-center justify-center">
              <i class="fas fa-user text-xs"></i>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-sm line-clamp-2 mb-1">${escapeHtml(title)}</h3>
              <p class="text-gray-400 text-xs">${escapeHtml(uploader)}</p>
              <p class="text-gray-400 text-xs">${views ? formatViews(views) + ' views' : ''} ${uploadDate ? '• ' + formatDate(uploadDate) : ''}</p>
            </div>
          </div>
        </article>
      `;
      }).filter(html => html !== '').join('');
    }

    function showLoader() {
      document.getElementById('video-grid').innerHTML = Array(8).fill(`
        <div class="animate-fade">
          <div class="skeleton aspect-video rounded-xl mb-3"></div>
          <div class="flex gap-3">
            <div class="skeleton w-9 h-9 rounded-full flex-shrink-0"></div>
            <div class="flex-1">
              <div class="skeleton h-4 rounded mb-2"></div>
              <div class="skeleton h-3 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      `).join('');
      document.getElementById('empty-state').style.display = 'none';
    }

    function hideLoader() {
      document.getElementById('loader').style.display = 'none';
    }

    function showEmpty(title = 'No videos found', subtitle = 'Try searching for something or check your subscriptions') {
      document.getElementById('video-grid').innerHTML = '';
      const empty = document.getElementById('empty-state');
      empty.querySelector('h3').textContent = title;
      empty.querySelector('p').textContent = subtitle;
      empty.style.display = 'flex';
    }

    // ========== PLAYER ==========
    async function loadPlayer(id) {
      document.getElementById('player-overlay').style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      try {
        const res = await fetch(`${API_URL}/api/info?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        
        if (data.error) {
          showToast('Error: ' + data.error, 'error');
          closePlayer();
          return;
        }
        
        // Store complete video data including the ID
        currentVideo = {
          id: id,
          title: data.title || 'Unknown',
          uploader: data.uploader || 'Unknown',
          thumbnail: data.thumbnail || '',
          duration: data.duration || 0,
          views: data.view_count || data.views || 0,
          description: data.description || 'No description available.',
          stream_url: data.stream_url,
          date: data.upload_date || Date.now()
        };
        
        const player = document.getElementById('vid-player');
        player.src = currentVideo.stream_url;
        player.play();
        
        document.getElementById('p-title').innerText = currentVideo.title;
        document.getElementById('p-uploader').innerText = currentVideo.uploader;
        document.getElementById('p-views').innerText = currentVideo.views ? formatViews(currentVideo.views) + ' views' : '— views';
        document.getElementById('p-description').querySelector('p').innerText = currentVideo.description;
        
        // Update subscribe button state
        updateSubButton();
        
        // Add to history
        addToHistory(currentVideo);
        
      } catch (e) {
        console.error('Player error:', e);
        showToast('Could not load video.', 'error');
        closePlayer();
      }
    }

    function closePlayer() {
      document.getElementById('player-overlay').style.display = 'none';
      document.getElementById('mini-player').style.display = 'none';
      document.body.style.overflow = '';
      const player = document.getElementById('vid-player');
      const miniPlayer = document.getElementById('mini-vid-player');
      player.pause();
      player.src = '';
      miniPlayer.pause();
      miniPlayer.src = '';
      currentVideo = null;
      preparedBlob = null;
    }

    function minimizePlayer() {
      const player = document.getElementById('vid-player');
      const miniPlayer = document.getElementById('mini-vid-player');
      const currentTime = player.currentTime;
      const isPaused = player.paused;
      
      // Transfer video state to mini player
      miniPlayer.src = player.src;
      miniPlayer.currentTime = currentTime;
      
      // Update mini player info
      document.getElementById('mini-title').textContent = currentVideo?.title || 'Video';
      document.getElementById('mini-uploader').textContent = currentVideo?.uploader || 'Channel';
      
      // Hide main player, show mini player
      document.getElementById('player-overlay').style.display = 'none';
      document.getElementById('mini-player').style.display = 'block';
      document.body.style.overflow = '';
      
      // Continue playback if it was playing
      if (!isPaused) {
        miniPlayer.play();
        document.getElementById('mini-play-icon').className = 'fas fa-pause text-sm';
      } else {
        document.getElementById('mini-play-icon').className = 'fas fa-play text-sm';
      }
    }

    function expandPlayer() {
      const miniPlayer = document.getElementById('mini-vid-player');
      const player = document.getElementById('vid-player');
      const currentTime = miniPlayer.currentTime;
      const isPaused = miniPlayer.paused;
      
      // Transfer video state back to main player
      player.src = miniPlayer.src;
      player.currentTime = currentTime;
      
      // Show main player, hide mini player
      document.getElementById('player-overlay').style.display = 'flex';
      document.getElementById('mini-player').style.display = 'none';
      document.body.style.overflow = 'hidden';
      
      // Continue playback if it was playing
      if (!isPaused) {
        player.play();
      }
    }

    function toggleMiniPlay() {
      const miniPlayer = document.getElementById('mini-vid-player');
      const icon = document.getElementById('mini-play-icon');
      
      if (miniPlayer.paused) {
        miniPlayer.play();
        icon.className = 'fas fa-pause text-sm';
      } else {
        miniPlayer.pause();
        icon.className = 'fas fa-play text-sm';
      }
    }

    function updateSubButton() {
      if (!currentVideo) return;
      const subs = JSON.parse(localStorage.getItem('oasis_client_subs') || '[]');
      const isSubbed = subs.includes(currentVideo.uploader);
      const btn = document.getElementById('sub-btn');
      
      if (isSubbed) {
        btn.textContent = 'Subscribed';
        btn.classList.remove('bg-white', 'text-black', 'hover:bg-gray-200');
        btn.classList.add('bg-[#272727]', 'text-white', 'hover:bg-[#3a3a3a]');
      } else {
        btn.textContent = 'Subscribe';
        btn.classList.add('bg-white', 'text-black', 'hover:bg-gray-200');
        btn.classList.remove('bg-[#272727]', 'text-white', 'hover:bg-[#3a3a3a]');
      }
    }

    function toggleSub() {
      if (!currentVideo) return;
      let subs = JSON.parse(localStorage.getItem('oasis_client_subs') || '[]');
      const name = currentVideo.uploader;
      
      if (subs.includes(name)) {
        subs = subs.filter(s => s !== name);
        showToast('Unsubscribed from ' + name);
      } else {
        subs.push(name);
        showToast('Subscribed to ' + name, 'success');
      }
      
      localStorage.setItem('oasis_client_subs', JSON.stringify(subs));
      updateSubButton();
    }

    // ========== DOWNLOAD WITH FILE SYSTEM ACCESS API ==========
    function openDlPopup() {
      if (!currentVideo) return;
      preparedBlob = null;
      document.getElementById('dl-name').value = currentVideo.title;
      document.getElementById('dl-progress').style.display = 'none';
      document.getElementById('dl-save-btn').style.display = 'none';
      document.getElementById('dl-audio-btn').style.display = 'none';
      document.getElementById('dl-start-btn').style.display = 'block';
      document.getElementById('dl-popup').style.display = 'flex';
      document.getElementById('dl-name').focus();
    }

    function closeDlPopup() {
      // Cancel any ongoing audio extraction
      if (currentAudioController) {
        currentAudioController.abort();
        currentAudioController = null;
      }
      
      document.getElementById('dl-popup').style.display = 'none';
      preparedBlob = null;
      preparedAudioBlob = null;
    }

    async function startDownload() {
      if (!currentVideo) return;
      
      const name = document.getElementById('dl-name').value || currentVideo.title;
      preparedFileName = name.replace(/[^a-zA-Z0-9\s\-\_]/g, '') + '.mp4';
      const url = `${API_URL}/api/proxy_download?url=${encodeURIComponent(currentVideo.stream_url)}&name=${encodeURIComponent(name)}`;
      
      document.getElementById('dl-start-btn').style.display = 'none';
      document.getElementById('dl-progress').style.display = 'block';
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Download failed');
        
        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10) || 0;
        
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          received += value.length;
          
          if (total > 0) {
            const percent = Math.round((received / total) * 100);
            document.getElementById('dl-percent').textContent = percent + '%';
            document.getElementById('dl-bar').style.width = percent + '%';
            document.getElementById('dl-size').textContent = formatBytes(received) + ' / ' + formatBytes(total);
          } else {
            document.getElementById('dl-percent').textContent = formatBytes(received);
            document.getElementById('dl-bar').style.width = '50%';
            document.getElementById('dl-size').textContent = formatBytes(received) + ' downloaded';
          }
        }
        
        preparedBlob = new Blob(chunks, { type: 'video/mp4' });
        
        document.getElementById('dl-percent').textContent = '100%';
        document.getElementById('dl-bar').style.width = '100%';
        document.getElementById('dl-size').textContent = formatBytes(received) + ' ready to save';
        document.getElementById('dl-save-btn').style.display = 'block';
        document.getElementById('dl-audio-btn').style.display = 'block';
        
        showToast('Download ready! Tap "Save to Device" to save.', 'success');
        
      } catch (e) {
        showToast('Download failed: ' + e.message, 'error');
        document.getElementById('dl-start-btn').style.display = 'block';
        document.getElementById('dl-progress').style.display = 'none';
      }
    }

    async function saveFile() {
      if (!preparedBlob) {
        showToast('No file prepared. Please try downloading again.', 'error');
        return;
      }
      
      // Check for File System Access API support
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: preparedFileName,
            types: [{
              description: 'Video File',
              accept: { 'video/mp4': ['.mp4'] }
            }]
          });
          
          const writable = await handle.createWritable();
          await writable.write(preparedBlob);
          await writable.close();
          
          showToast('Video saved successfully!', 'success');
          closeDlPopup();
          
        } catch (e) {
          if (e.name !== 'AbortError') {
            // Fallback to traditional download
            fallbackDownload();
          }
        }
      } else {
        // Fallback for browsers without File System Access API
        fallbackDownload();
      }
    }

    function fallbackDownload() {
      if (!preparedBlob) return;
      
      const url = URL.createObjectURL(preparedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = preparedFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Download started!', 'success');
      closeDlPopup();
    }

    // ========== AUDIO EXTRACTION ==========
    let currentAudioController = null;
    
    let preparedAudioBlob = null;
    let preparedAudioFileName = '';
    
    async function extractAudio() {
      if (!currentVideo) {
        showToast('No video selected.', 'error');
        return;
      }
      
      preparedAudioFileName = (currentVideo.title.replace(/[^a-zA-Z0-9\s\-\_]/g, '') || 'audio') + '.wav';
      
      // Hide other buttons, show progress
      document.getElementById('dl-save-btn').style.display = 'none';
      document.getElementById('dl-audio-btn').style.display = 'none';
      document.getElementById('dl-start-btn').style.display = 'none';
      document.getElementById('dl-save-audio-btn').style.display = 'none';
      
      const progressDiv = document.getElementById('dl-progress');
      const progressBar = document.getElementById('dl-bar');
      const progressPercent = document.getElementById('dl-percent');
      
      progressDiv.style.display = 'block';
      progressPercent.textContent = '0%';
      progressBar.style.width = '0%';
      progressBar.classList.remove('bg-[#3ea6ff]');
      progressBar.classList.add('bg-[#ff0000]');
      progressPercent.classList.remove('text-[#3ea6ff]');
      progressPercent.classList.add('text-[#ff0000]');
      document.getElementById('dl-size').textContent = 'Extracting audio...';
      document.getElementById('dl-status').textContent = '';
      
      try {
        const audioBlob = await downloadAudioDirectly(currentVideo.stream_url, (percent, loaded, total, status) => {
          progressPercent.textContent = percent + '%';
          progressBar.style.width = percent + '%';
          if (total > 0) {
            document.getElementById('dl-size').textContent = formatBytes(loaded) + ' / ' + formatBytes(total);
          } else {
            document.getElementById('dl-size').textContent = formatBytes(loaded) + ' downloaded';
          }
          if (status) {
            document.getElementById('dl-status').textContent = status;
          }
        });
        
        if (!audioBlob) {
          throw new Error('Download was cancelled');
        }
        
        preparedAudioBlob = audioBlob;
        
        progressPercent.textContent = '100%';
        progressBar.style.width = '100%';
        document.getElementById('dl-size').textContent = formatBytes(audioBlob.size) + ' ready to save';
        document.getElementById('dl-status').textContent = '';
        
        // Show save audio button
        document.getElementById('dl-save-audio-btn').style.display = 'block';
        
        showToast('Audio ready! Tap "Save Audio" to save.', 'success');
        
      } catch (e) {
        if (e.message === 'Download was cancelled') {
          showToast('Audio extraction cancelled.', 'info');
        } else {
          showToast('Audio extraction failed: ' + e.message, 'error');
        }
        
        // Reset UI
        progressDiv.style.display = 'none';
        progressBar.classList.remove('bg-[#ff0000]');
        progressBar.classList.add('bg-[#3ea6ff]');
        progressPercent.classList.remove('text-[#ff0000]');
        progressPercent.classList.add('text-[#3ea6ff]');
        document.getElementById('dl-save-btn').style.display = 'block';
        document.getElementById('dl-audio-btn').style.display = 'block';
      }
    }
    
    async function saveAudioFile() {
      if (!preparedAudioBlob) {
        showToast('No audio file prepared. Please try again.', 'error');
        return;
      }
      
      // Check for File System Access API support
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: preparedAudioFileName,
            types: [{
              description: 'Audio File',
              accept: { 'audio/wav': ['.wav'] }
            }]
          });
          
          const writable = await handle.createWritable();
          await writable.write(preparedAudioBlob);
          await writable.close();
          
          showToast('Audio saved successfully!', 'success');
          
          // Reset UI
          const progressDiv = document.getElementById('dl-progress');
          const progressBar = document.getElementById('dl-bar');
          const progressPercent = document.getElementById('dl-percent');
          
          progressDiv.style.display = 'none';
          progressBar.classList.remove('bg-[#ff0000]');
          progressBar.classList.add('bg-[#3ea6ff]');
          progressPercent.classList.remove('text-[#ff0000]');
          progressPercent.classList.add('text-[#3ea6ff]');
          document.getElementById('dl-save-btn').style.display = 'block';
          document.getElementById('dl-audio-btn').style.display = 'block';
          document.getElementById('dl-save-audio-btn').style.display = 'none';
          
          preparedAudioBlob = null;
          
        } catch (e) {
          if (e.name !== 'AbortError') {
            // Fallback to traditional download
            fallbackAudioDownload(preparedAudioBlob, preparedAudioFileName);
            
            // Reset UI
            const progressDiv = document.getElementById('dl-progress');
            const progressBar = document.getElementById('dl-bar');
            const progressPercent = document.getElementById('dl-percent');
            
            progressDiv.style.display = 'none';
            progressBar.classList.remove('bg-[#ff0000]');
            progressBar.classList.add('bg-[#3ea6ff]');
            progressPercent.classList.remove('text-[#ff0000]');
            progressPercent.classList.add('text-[#3ea6ff]');
            document.getElementById('dl-save-btn').style.display = 'block';
            document.getElementById('dl-audio-btn').style.display = 'block';
            document.getElementById('dl-save-audio-btn').style.display = 'none';
            
            preparedAudioBlob = null;
          }
        }
      } else {
        // Fallback for browsers without File System Access API
        fallbackAudioDownload(preparedAudioBlob, preparedAudioFileName);
        
        // Reset UI
        const progressDiv = document.getElementById('dl-progress');
        const progressBar = document.getElementById('dl-bar');
        const progressPercent = document.getElementById('dl-percent');
        
        progressDiv.style.display = 'none';
        progressBar.classList.remove('bg-[#ff0000]');
        progressBar.classList.add('bg-[#3ea6ff]');
        progressPercent.classList.remove('text-[#ff0000]');
        progressPercent.classList.add('text-[#3ea6ff]');
        document.getElementById('dl-save-btn').style.display = 'block';
        document.getElementById('dl-audio-btn').style.display = 'block';
        document.getElementById('dl-save-audio-btn').style.display = 'none';
        
        preparedAudioBlob = null;
      }
    }

    async function extractAudioShare() {
      if (!currentVideo) {
        showToast('No video selected.', 'error');
        return;
      }
      
      const audioFileName = (currentVideo.title.replace(/[^a-zA-Z0-9\s\-\_]/g, '') || 'audio') + '.mp3';
      
      // Hide other buttons, show progress
      document.getElementById('share-file-btn').style.display = 'none';
      document.getElementById('share-audio-btn').style.display = 'none';
      document.getElementById('share-prepare-btn').style.display = 'none';
      
      const progressDiv = document.getElementById('share-progress');
      progressDiv.style.display = 'block';
      document.getElementById('share-percent').textContent = '0%';
      document.getElementById('share-bar').style.width = '0%';
      
      try {
        const audioBlob = await downloadAudioDirectly(currentVideo.stream_url, (percent, loaded, total) => {
          document.getElementById('share-percent').textContent = percent + '%';
          document.getElementById('share-bar').style.width = percent + '%';
        });
        
        if (!audioBlob) {
          throw new Error('Download was cancelled');
        }
        
        document.getElementById('share-percent').textContent = '100%';
        document.getElementById('share-bar').style.width = '100%';
        
        // Share or download the file
        if (navigator.canShare && navigator.canShare({ files: [new File([audioBlob], audioFileName, { type: 'audio/mpeg' })] })) {
          try {
            const file = new File([audioBlob], audioFileName, { type: 'audio/mpeg' });
            
            await navigator.share({
              title: currentVideo?.title || 'Audio',
              text: `Audio from: ${currentVideo?.title}`,
              files: [file]
            });
            
            showToast('Shared successfully!', 'success');
            
          } catch (e) {
            if (e.name !== 'AbortError') {
              showToast('Sharing failed. Downloading instead...', 'info');
              fallbackAudioDownload(audioBlob, audioFileName);
            }
          }
        } else {
          showToast('File sharing not supported. Downloading instead...', 'info');
          fallbackAudioDownload(audioBlob, audioFileName);
        }
        
        // Reset UI
        progressDiv.style.display = 'none';
        document.getElementById('share-file-btn').style.display = 'block';
        document.getElementById('share-audio-btn').style.display = 'block';
        
      } catch (e) {
        if (e.message === 'Download was cancelled') {
          showToast('Audio extraction cancelled.', 'info');
        } else {
          showToast('Audio extraction failed: ' + e.message, 'error');
        }
        
        // Reset UI
        progressDiv.style.display = 'none';
        document.getElementById('share-file-btn').style.display = 'block';
        document.getElementById('share-audio-btn').style.display = 'block';
      }
    }

    async function downloadAudioDirectly(streamUrl, progressCallback) {
      // Create abort controller for cancellation
      currentAudioController = new AbortController();
      
      try {
        // Use the proxy endpoint to avoid CORS issues
        const proxyUrl = `${API_URL}/api/proxy_download?url=${encodeURIComponent(streamUrl)}&name=temp`;
        
        progressCallback(10, 0, 0, 'Downloading video...');
        const videoBlob = await fetchWithProgress(proxyUrl, (percent, loaded, total) => {
          // Map 0-100% download to 10-50% overall progress
          const overallPercent = 10 + Math.floor(percent * 0.4);
          progressCallback(overallPercent, loaded, total, 'Downloading video...');
        }, currentAudioController.signal);
        
        if (!videoBlob) {
          throw new Error('Download was cancelled');
        }
        
        progressCallback(50, videoBlob.size, videoBlob.size, 'Decoding audio...');
        
        // Now convert video to audio using Web Audio API
        const audioBlob = await extractAudioFromVideo(videoBlob, (percent, status) => {
          // Map 0-100% extraction to 50-100% overall progress
          const overallPercent = 50 + Math.floor(percent * 0.5);
          progressCallback(overallPercent, 0, 0, status);
        });
        
        currentAudioController = null;
        return audioBlob;
        
      } catch (e) {
        currentAudioController = null;
        if (e.name === 'AbortError') {
          return null;
        }
        console.error('Audio extraction error:', e);
        throw e;
      }
    }

    async function fetchWithProgress(url, progressCallback, signal) {
      try {
        const response = await fetch(url, { signal });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10) || 0;
        
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          received += value.length;
          
          if (total > 0) {
            const percent = Math.round((received / total) * 100);
            progressCallback(percent, received, total);
          } else {
            progressCallback(50, received, 0);
          }
        }
        
        return new Blob(chunks, { type: 'video/mp4' });
        
      } catch (error) {
        if (error.name === 'AbortError') {
          throw error;
        }
        console.error('Fetch error:', error);
        throw new Error('Failed to download video. Check your connection.');
      }
    }

    async function extractAudioFromVideo(videoBlob, progressCallback) {
      try {
        progressCallback(10, 'Reading video file...');
        
        // Create array buffer from blob
        const arrayBuffer = await videoBlob.arrayBuffer();
        
        progressCallback(30, 'Decoding audio...');
        
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Decode the entire audio at once
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        progressCallback(70, 'Converting to WAV...');
        
        // Convert audio buffer to WAV
        const wavBlob = audioBufferToWav(audioBuffer);
        
        progressCallback(95, 'Finalizing...');
        
        // Clean up
        await audioContext.close();
        
        progressCallback(100, 'Complete!');
        
        return wavBlob;
        
      } catch (error) {
        console.error('Audio extraction failed:', error);
        throw new Error('Failed to extract audio: ' + error.message);
      }
    }
    
    function audioBufferToWav(audioBuffer) {
      const numChannels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;
      
      // Interleave channels
      const length = audioBuffer.length * numChannels * 2;
      const buffer = new ArrayBuffer(44 + length);
      const view = new DataView(buffer);
      const channels = [];
      let offset = 0;
      let pos = 0;
      
      // Write WAV header
      const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
      const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };
      
      // "RIFF" chunk descriptor
      setUint32(0x46464952); // "RIFF"
      setUint32(36 + length); // file length - 8
      setUint32(0x45564157); // "WAVE"
      
      // "fmt " sub-chunk
      setUint32(0x20746d66); // "fmt "
      setUint32(16); // chunk length
      setUint16(format); // audio format (1 = PCM)
      setUint16(numChannels);
      setUint32(sampleRate);
      setUint32(sampleRate * numChannels * bitDepth / 8); // byte rate
      setUint16(numChannels * bitDepth / 8); // block align
      setUint16(bitDepth);
      
      // "data" sub-chunk
      setUint32(0x61746164); // "data"
      setUint32(length); // chunk length
      
      // Write audio data
      for (let i = 0; i < numChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
      }
      
      offset = pos;
      for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          let sample = Math.max(-1, Math.min(1, channels[channel][i]));
          sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, sample, true);
          offset += 2;
        }
      }
      
      return new Blob([buffer], { type: 'audio/wav' });
    }

    function fallbackAudioDownload(audioBlob, fileName) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Audio download started!', 'success');
    }

    // ========== SHARE WITH WEB SHARE API ==========
    function openSharePopup() {
      if (!currentVideo) return;
      preparedBlob = null;
      document.getElementById('share-progress').style.display = 'none';
      document.getElementById('share-file-btn').style.display = 'none';
      document.getElementById('share-audio-btn').style.display = 'none';
      document.getElementById('share-prepare-btn').style.display = 'block';
      document.getElementById('share-popup').style.display = 'flex';
    }

    function closeSharePopup() {
      // Cancel any ongoing audio extraction
      if (currentAudioController) {
        currentAudioController.abort();
        currentAudioController = null;
      }
      
      document.getElementById('share-popup').style.display = 'none';
      preparedBlob = null;
    }

    async function prepareShare() {
      if (!currentVideo) return;
      
      const name = currentVideo.title.replace(/[^a-zA-Z0-9\s\-\_]/g, '') + '.mp4';
      preparedFileName = name;
      const url = `${API_URL}/api/proxy_download?url=${encodeURIComponent(currentVideo.stream_url)}&name=${encodeURIComponent(currentVideo.title)}`;
      
      document.getElementById('share-prepare-btn').style.display = 'none';
      document.getElementById('share-progress').style.display = 'block';
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to fetch video');
        
        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10) || 0;
        
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          received += value.length;
          
          if (total > 0) {
            const percent = Math.round((received / total) * 100);
            document.getElementById('share-percent').textContent = percent + '%';
            document.getElementById('share-bar').style.width = percent + '%';
          } else {
            document.getElementById('share-percent').textContent = formatBytes(received);
            document.getElementById('share-bar').style.width = '50%';
          }
        }
        
        preparedBlob = new Blob(chunks, { type: 'video/mp4' });
        
        document.getElementById('share-percent').textContent = '100%';
        document.getElementById('share-bar').style.width = '100%';
        document.getElementById('share-file-btn').style.display = 'block';
        document.getElementById('share-audio-btn').style.display = 'block';
        
        showToast('File ready for sharing!', 'success');
        
      } catch (e) {
        showToast('Failed to prepare file: ' + e.message, 'error');
        document.getElementById('share-prepare-btn').style.display = 'block';
        document.getElementById('share-progress').style.display = 'none';
      }
    }

    async function shareFile() {
      if (!preparedBlob) {
        showToast('No file prepared. Please try again.', 'error');
        return;
      }
      
      if (navigator.canShare && navigator.canShare({ files: [new File([preparedBlob], preparedFileName, { type: 'video/mp4' })] })) {
        try {
          const file = new File([preparedBlob], preparedFileName, { type: 'video/mp4' });
          
          await navigator.share({
            title: currentVideo?.title || 'Video',
            text: `Check out this video: ${currentVideo?.title}`,
            files: [file]
          });
          
          showToast('Shared successfully!', 'success');
          closeSharePopup();
          
        } catch (e) {
          if (e.name !== 'AbortError') {
            showToast('Sharing failed. Try using the other options.', 'error');
          }
        }
      } else {
        showToast('File sharing not supported on this device. Use the download option instead.', 'error');
      }
    }

    function copyLink() {
      if (!currentVideo) return;
      const link = `${API_URL}/watch?v=${currentVideo.id}`;
      
      navigator.clipboard.writeText(link).then(() => {
        showToast('Link copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed to copy link.', 'error');
      });
    }

    async function shareNative() {
      if (!currentVideo) return;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: currentVideo.title,
            text: `Check out: ${currentVideo.title}`,
            url: `${API_URL}/watch?v=${currentVideo.id}`
          });
        } catch (e) {
          if (e.name !== 'AbortError') {
            showToast('Sharing failed.', 'error');
          }
        }
      } else {
        copyLink();
      }
    }

    function shareToTwitter() {
      if (!currentVideo) return;
      const text = encodeURIComponent(`Check out: ${currentVideo.title}`);
      const url = encodeURIComponent(`${API_URL}/watch?v=${currentVideo.id}`);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
    }

    function shareToWhatsApp() {
      if (!currentVideo) return;
      const text = encodeURIComponent(`Check out: ${currentVideo.title} ${API_URL}/watch?v=${currentVideo.id}`);
      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    }

    // ========== LIBRARY ==========
    function showLibrary() {
      setActiveNav('library');
      
      const history = JSON.parse(localStorage.getItem('oasis_history') || '[]');
      const saved = JSON.parse(localStorage.getItem('oasis_saved') || '[]');
      const subs = JSON.parse(localStorage.getItem('oasis_client_subs') || '[]');
      
      document.getElementById('history-count').textContent = history.length + ' videos';
      document.getElementById('saved-count').textContent = saved.length + ' videos';
      document.getElementById('subs-count').textContent = subs.length + ' channels';
      
      document.getElementById('library-popup').style.display = 'flex';
    }

    function closeLibrary() {
      document.getElementById('library-popup').style.display = 'none';
    }

    function loadHistory() {
      closeLibrary();
      const history = JSON.parse(localStorage.getItem('oasis_history') || '[]');
      if (history.length === 0) {
        showEmpty('No watch history', 'Videos you watch will appear here');
        return;
      }
      renderGrid(history);
    }

    function loadSaved() {
      closeLibrary();
      const saved = JSON.parse(localStorage.getItem('oasis_saved') || '[]');
      if (saved.length === 0) {
        showEmpty('No saved videos', 'Save videos to watch later');
        return;
      }
      renderGrid(saved);
    }

    function loadSubsList() {
      closeLibrary();
      const subs = JSON.parse(localStorage.getItem('oasis_client_subs') || '[]');
      if (subs.length === 0) {
        showEmpty('No subscriptions', 'Subscribe to your favorite channels');
        return;
      }
      // Show subs as a simple list
      const grid = document.getElementById('video-grid');
      grid.innerHTML = subs.map(s => `
        <div class="bg-[#1f1f1f] rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-[#272727] transition-colors" onclick="runSearch('${escapeHtml(s)}')">
          <div class="w-12 h-12 bg-[#ff0000] rounded-full flex items-center justify-center">
            <i class="fas fa-user"></i>
          </div>
          <span class="font-medium">${escapeHtml(s)}</span>
          <i class="fas fa-chevron-right ml-auto text-gray-400"></i>
        </div>
      `).join('');
      document.getElementById('empty-state').style.display = 'none';
    }

    function addToHistory(video) {
      if (!video || !video.id) return;
      
      let history = JSON.parse(localStorage.getItem('oasis_history') || '[]');
      // Remove if already exists
      history = history.filter(v => v.id !== video.id);
      // Add to front with all necessary data
      history.unshift({
        id: video.id,
        title: video.title || 'Unknown',
        uploader: video.uploader || 'Unknown',
        thumbnail: video.thumbnail || '',
        duration: video.duration || 0,
        views: video.views || video.view_count || 0,
        date: video.date || video.upload_date || Date.now()
      });
      // Keep only last 100
      history = history.slice(0, 100);
      localStorage.setItem('oasis_history', JSON.stringify(history));
    }

    function addToPlaylist() {
      if (!currentVideo || !currentVideo.id) return;
      
      let saved = JSON.parse(localStorage.getItem('oasis_saved') || '[]');
      
      // Check if already saved using the correct ID
      if (saved.find(v => v.id === currentVideo.id)) {
        showToast('Already in your saved videos');
        return;
      }
      
      saved.unshift({
        id: currentVideo.id,
        title: currentVideo.title || 'Unknown',
        uploader: currentVideo.uploader || 'Unknown',
        thumbnail: currentVideo.thumbnail || '',
        duration: currentVideo.duration || 0,
        views: currentVideo.views || 0,
        date: currentVideo.date || Date.now()
      });
      
      localStorage.setItem('oasis_saved', JSON.stringify(saved));
      
      // Show animated heart feedback
      const playerOverlay = document.getElementById('player-overlay');
      const heart = document.createElement('div');
      heart.innerHTML = '<i class="fas fa-heart text-6xl text-red-500"></i>';
      heart.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); pointer-events: none; z-index: 100; animation: heartPop 0.6s ease-out;';
      playerOverlay.appendChild(heart);
      setTimeout(() => heart.remove(), 600);
      
      showToast('Added to saved videos', 'success');
    }
    
    // Double-tap to save video
    let lastTap = 0;
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('vid-player').addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
          addToPlaylist();
        }
        lastTap = currentTime;
      });
    });

    // ========== SETTINGS ==========
    function showSettings() {
      document.getElementById('settings-popup').style.display = 'flex';
    }

    function closeSettings() {
      document.getElementById('settings-popup').style.display = 'none';
    }

    function clearHistory() {
      localStorage.removeItem('oasis_history');
      showToast('Watch history cleared');
      closeSettings();
    }

    function clearSaved() {
      localStorage.removeItem('oasis_saved');
      showToast('Saved videos cleared');
      closeSettings();
    }

    function clearSubs() {
      localStorage.removeItem('oasis_client_subs');
      showToast('Subscriptions cleared');
      closeSettings();
    }

    function showAbout() {
      closeSettings();
      showToast('Oasis Video Client v1.1 - Built with ❤️', 'success');
    }

    // ========== TOAST NOTIFICATIONS ==========
    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      
      const colors = {
        info: 'bg-[#272727]',
        success: 'bg-green-600',
        error: 'bg-red-600'
      };
      
      const icons = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle'
      };
      
      toast.className = `toast ${colors[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 pointer-events-auto`;
      toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="text-sm">${escapeHtml(message)}</span>
      `;
      
      container.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    // ========== UTILITY FUNCTIONS ==========
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function formatDuration(seconds) {
      if (!seconds) return '';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      
      if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function formatViews(views) {
      if (!views) return '0';
      if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
      if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
      return views.toString();
    }

    function formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp * 1000);
      const now = new Date();
      const diff = now - date;
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return days + ' days ago';
      if (days < 30) return Math.floor(days / 7) + ' weeks ago';
      if (days < 365) return Math.floor(days / 30) + ' months ago';
      return Math.floor(days / 365) + ' years ago';
    }

    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
  
