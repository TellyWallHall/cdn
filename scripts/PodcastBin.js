
    const SERVER_URL = "https://podcast.oasis-archive.org";
    
    const state = {
      history: JSON.parse(localStorage.getItem('oasisHistory') || '[]'),
      currentPodcast: null,
      currentEpisode: null,
      isPlaying: false
    };
    
    const els = {
      loadingOverlay: document.getElementById('loadingOverlay'),
      breadcrumbs: document.getElementById('breadcrumbs'),
      searchInput: document.getElementById('searchInput'),
      historyTags: document.getElementById('historyTags'),
      contentArea: document.getElementById('contentArea'),
      audioPlayer: document.getElementById('audioPlayer'),
      playerArtwork: document.getElementById('playerArtwork'),
      playerTitle: document.getElementById('playerTitle'),
      playerPodcast: document.getElementById('playerPodcast'),
      playPauseBtn: document.getElementById('playPauseBtn'),
      playPauseIcon: document.getElementById('playPauseIcon'),
      rewindBtn: document.getElementById('rewindBtn'),
      forwardBtn: document.getElementById('forwardBtn'),
      progressBar: document.getElementById('progressBar'),
      progressFill: document.getElementById('progressFill'),
      currentTime: document.getElementById('currentTime'),
      duration: document.getElementById('duration'),
      audioElement: document.getElementById('audioElement'),
      appTitle: document.getElementById('appTitle'),
      rssUpload: document.getElementById('rssUpload')
    };
    
    function applyConfig() {
      els.appTitle.textContent = config.app_title || defaultConfig.app_title;
      els.searchInput.placeholder = config.search_placeholder || defaultConfig.search_placeholder;
    }
    
    function renderHistory() {
      if (state.history.length === 0) {
        els.historyTags.innerHTML = '';
        return;
      }
      els.historyTags.innerHTML = state.history.slice(0, 5).map(q => `
        <button class="history-tag px-3 py-1 rounded text-xs" onclick="doSearch('${q.replace(/'/g, "\\'")}')">${q}</button>
      `).join('');
    }
    
    async function doSearch(query) {
      if (!query.trim()) return;
      
      els.searchInput.value = query;
      
      if (!state.history.includes(query)) {
        state.history.unshift(query);
        if (state.history.length > 10) state.history.pop();
        localStorage.setItem('oasisHistory', JSON.stringify(state.history));
        renderHistory();
      }
      
      els.loadingOverlay.classList.add('active');
      els.breadcrumbs.style.display = 'flex';
      els.breadcrumbs.innerHTML = `
        <span class="crumb-link" onclick="goHome()"><i class="fas fa-home"></i> OFFICE</span>
        <i class="fas fa-chevron-right text-amber-800" style="font-size: 10px;"></i>
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
              <div class="text-base font-bold mb-2 text-amber-100">TELEGRAM LOST</div>
              <div class="text-sm px-4">Ain't nothin' on the wire by that name, partner</div>
            </div>
          `;
          return;
        }
        
        els.contentArea.innerHTML = `
          <div class="space-y-2">
            ${data.map(pod => `
              <div class="podcast-card rounded-lg p-3 flex items-center gap-3 active:scale-95 transition-transform" onclick="loadEpisodes('${encodeURIComponent(pod.rss)}', '${pod.title.replace(/'/g, "\\'")}', '${pod.image}')">
                <img src="${pod.image}" class="podcast-artwork rounded" alt="${pod.title}" loading="lazy" onerror="this.style.background='#8b7765'; this.alt='Image unavailable';">
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-amber-200 truncate text-sm">${pod.title}</div>
                  <div class="text-xs text-amber-500 truncate">${pod.artist}</div>
                </div>
                <i class="fas fa-chevron-right text-amber-600 text-sm"></i>
              </div>
            `).join('')}
          </div>
        `;
      } catch (e) {
        els.loadingOverlay.classList.remove('active');
        els.contentArea.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="text-base font-bold mb-2 text-red-400">WIRE DOWN</div>
            <div class="text-sm px-4">Telegraph lines busted - check your connection</div>
          </div>
        `;
      }
    }
    
    async function loadEpisodes(rssEncoded, title, image) {
      const rss = decodeURIComponent(rssEncoded);
      state.currentPodcast = { title, image, rss };
      
      els.loadingOverlay.classList.add('active');
      els.breadcrumbs.innerHTML = `
        <span class="crumb-link" onclick="goHome()"><i class="fas fa-home"></i> OFFICE</span>
        <i class="fas fa-chevron-right text-amber-800" style="font-size: 10px;"></i>
        <span class="crumb-link" onclick="doSearch('${els.searchInput.value.replace(/'/g, "\\'")}')"><i class="fas fa-satellite-dish"></i> RESULTS</span>
        <i class="fas fa-chevron-right text-amber-800" style="font-size: 10px;"></i>
        <span class="crumb-active"><i class="fas fa-podcast"></i> ${title}</span>
      `;
      
      try {
        const res = await fetch(`${SERVER_URL}/api/episodes?rss=${encodeURIComponent(rss)}`);
        const episodes = await res.json();
        els.loadingOverlay.classList.remove('active');
        
        if (episodes.length === 0) {
          els.contentArea.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon"><i class="fas fa-inbox"></i></div>
              <div class="text-base font-bold mb-2 text-amber-100">MAILBOX EMPTY</div>
              <div class="text-sm px-4">No dispatches found for this station</div>
            </div>
          `;
          return;
        }
        
        els.contentArea.innerHTML = `
          <div>
            <div class="paper-texture rounded-lg p-3 mb-3 vintage-border">
              <div class="flex items-center gap-3 mb-3">
                <img src="${image}" class="w-16 h-16 rounded border-2 border-amber-700/40 object-cover" alt="${title}" loading="lazy" onerror="this.style.background='#8b7765'; this.alt='Image unavailable';">
                <div class="flex-1 min-w-0">
                  <h2 class="font-bold text-amber-200 text-base truncate">${title}</h2>
                  <p class="text-xs text-amber-500">${episodes.length} episodes</p>
                </div>
              </div>
              <button id="rssFeedBtn" onclick="prepareRSS('${rss.replace(/'/g, "\\'")}', '${title.replace(/'/g, "\\'")}', 'rssFeedBtn')" class="control-btn w-full py-2 px-3 rounded text-xs flex items-center justify-center gap-2">
                <i class="fas fa-download"></i>
                <span>DOWNLOAD RSS FEED</span>
              </button>
            </div>
            <div class="space-y-2">
              ${episodes.map((ep, i) => `
                <div class="episode-card rounded-lg p-3">
                  <div class="flex items-start gap-3 mb-2" onclick="playEpisode(${i}, ${JSON.stringify(episodes).replace(/"/g, '&quot;')})">
                    <div class="w-10 h-10 rounded bg-amber-800/20 flex items-center justify-center flex-shrink-0 border border-amber-700/40">
                      <i class="fas fa-play text-amber-400 text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-amber-200 text-sm leading-tight line-clamp-2">${ep.title}</div>
                      <div class="text-xs text-amber-500 mt-1">${ep.date || 'Unknown date'}</div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button id="downloadBtn_${i}" onclick="event.stopPropagation(); prepareEpisodeDownload('${ep.url.replace(/'/g, "\\'")}', '${ep.title.replace(/'/g, "\\'")}', 'downloadBtn_${i}')" class="control-btn flex-1 py-2 px-3 rounded text-xs flex items-center justify-center gap-2">
                      <i class="fas fa-download"></i>
                      <span>DOWNLOAD</span>
                    </button>
                    <button id="shareBtn_${i}" onclick="event.stopPropagation(); prepareEpisodeShare('${ep.url.replace(/'/g, "\\'")}', '${ep.title.replace(/'/g, "\\'")}', '${title.replace(/'/g, "\\'")}', 'shareBtn_${i}')" class="control-btn flex-1 py-2 px-3 rounded text-xs flex items-center justify-center gap-2">
                      <i class="fas fa-share-alt"></i>
                      <span>SHARE</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } catch (e) {
        els.loadingOverlay.classList.remove('active');
        els.contentArea.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="text-base font-bold mb-2 text-red-400">DISPATCH FAILED</div>
            <div class="text-sm px-4">Couldn't retrieve episodes</div>
          </div>
        `;
      }
    }
    
    function playEpisode(index, episodes) {
      const ep = episodes[index];
      state.currentEpisode = ep;
      
      els.playerArtwork.src = state.currentPodcast?.image || '';
      els.playerTitle.textContent = ep.title;
      els.playerPodcast.textContent = state.currentPodcast?.title || '-';
      
      els.audioElement.src = ep.url;
      els.audioElement.load();
      els.audioElement.play();
      state.isPlaying = true;
      els.playPauseIcon.className = 'fas fa-pause';
      
      els.audioPlayer.classList.remove('hidden');
    }
    
    function togglePlayPause() {
      if (state.isPlaying) {
        els.audioElement.pause();
        els.playPauseIcon.className = 'fas fa-play';
      } else {
        els.audioElement.play();
        els.playPauseIcon.className = 'fas fa-pause';
      }
      state.isPlaying = !state.isPlaying;
    }
    
    function formatTime(seconds) {
      if (isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function goHome() {
      els.breadcrumbs.style.display = 'none';
      els.searchInput.value = '';
      els.contentArea.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-satellite-dish"></i></div>
          <div class="text-base font-bold mb-2 text-amber-300">AWAITING TRANSMISSION</div>
          <div class="text-sm text-center max-w-xs px-4 text-amber-500">Enter a search term above to scan the archives</div>
        </div>
      `;
    }
    
    async function prepareRSS(rssUrl, podcastTitle, btnId) {
      const btn = document.getElementById(btnId);
      const originalHTML = btn.innerHTML;
      
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PREPARING...';
      btn.disabled = true;
      
      try {
        const response = await fetch(rssUrl);
        const rssContent = await response.text();
        const blob = new Blob([rssContent], { type: 'application/rss+xml' });
        
        btn.innerHTML = '<i class="fas fa-check"></i> CLICK TO SAVE';
        btn.disabled = false;
        btn.onclick = () => saveRSS(blob, podcastTitle, btnId, originalHTML);
      } catch (error) {
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> FAILED - TRY AGAIN';
        btn.disabled = false;
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.onclick = () => prepareRSS(rssUrl, podcastTitle, btnId);
        }, 3000);
      }
    }
    
    async function saveRSS(blob, podcastTitle, btnId, originalHTML) {
      const btn = document.getElementById(btnId);
      
      try {
        if ('showSaveFilePicker' in window) {
          const handle = await window.showSaveFilePicker({
            suggestedName: `${podcastTitle.replace(/[^a-z0-9]/gi, '_')}.xml`,
            types: [{
              description: 'RSS Feed',
              accept: { 'application/rss+xml': ['.xml'] }
            }]
          });
          
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          btn.innerHTML = '<i class="fas fa-check-circle"></i> SAVED!';
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${podcastTitle.replace(/[^a-z0-9]/gi, '_')}.xml`;
          a.click();
          URL.revokeObjectURL(url);
          
          btn.innerHTML = '<i class="fas fa-check-circle"></i> DOWNLOADED!';
        }
        
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.onclick = () => prepareRSS(arguments[1], podcastTitle, btnId);
        }, 3000);
      } catch (error) {
        if (error.name === 'AbortError') {
          btn.innerHTML = '<i class="fas fa-times"></i> CANCELLED - CLICK TO RETRY';
        } else {
          btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> FAILED - TRY AGAIN';
        }
        setTimeout(() => {
          btn.innerHTML = originalHTML;
        }, 3000);
      }
    }
    
    async function prepareEpisodeDownload(episodeUrl, episodeTitle, btnId) {
      const btn = document.getElementById(btnId);
      const originalHTML = btn.innerHTML;
      
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PREPARING...';
      btn.disabled = true;
      
      try {
        const response = await fetch(episodeUrl);
        const blob = await response.blob();
        const extension = episodeUrl.split('.').pop().split('?')[0] || 'mp3';
        
        btn.innerHTML = '<i class="fas fa-check"></i> CLICK TO SAVE';
        btn.disabled = false;
        btn.onclick = (e) => {
          e.stopPropagation();
          saveEpisode(blob, episodeTitle, extension, btnId, originalHTML, episodeUrl);
        };
      } catch (error) {
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> FAILED';
        btn.disabled = false;
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.onclick = (e) => {
            e.stopPropagation();
            prepareEpisodeDownload(episodeUrl, episodeTitle, btnId);
          };
        }, 3000);
      }
    }
    
    async function saveEpisode(blob, episodeTitle, extension, btnId, originalHTML, episodeUrl) {
      const btn = document.getElementById(btnId);
      
      try {
        if ('showSaveFilePicker' in window) {
          const handle = await window.showSaveFilePicker({
            suggestedName: `${episodeTitle.replace(/[^a-z0-9]/gi, '_')}.${extension}`,
            types: [{
              description: 'Audio File',
              accept: { 'audio/*': [`.${extension}`] }
            }]
          });
          
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          btn.innerHTML = '<i class="fas fa-check-circle"></i> SAVED!';
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${episodeTitle.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
          a.click();
          URL.revokeObjectURL(url);
          
          btn.innerHTML = '<i class="fas fa-check-circle"></i> DOWNLOADED!';
        }
        
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.onclick = (e) => {
            e.stopPropagation();
            prepareEpisodeDownload(episodeUrl, episodeTitle, btnId);
          };
        }, 3000);
      } catch (error) {
        if (error.name === 'AbortError') {
          btn.innerHTML = '<i class="fas fa-times"></i> CANCELLED';
        } else {
          btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> FAILED';
        }
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.onclick = (e) => {
            e.stopPropagation();
            prepareEpisodeDownload(episodeUrl, episodeTitle, btnId);
          };
        }, 3000);
      }
    }
    
    async function prepareEpisodeShare(episodeUrl, episodeTitle, podcastTitle, btnId) {
      const btn = document.getElementById(btnId);
      const originalHTML = btn.innerHTML;
      
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PREPARING...';
      btn.disabled = true;
      
      try {
        if (navigator.share) {
          const response = await fetch(episodeUrl);
          const blob = await response.blob();
          const extension = episodeUrl.split('.').pop().split('?')[0] || 'mp3';
          const file = new File([blob], `${episodeTitle.replace(/[^a-z0-9]/gi, '_')}.${extension}`, { type: blob.type });
          
          btn.innerHTML = '<i class="fas fa-check"></i> CLICK TO SHARE';
          btn.disabled = false;
          btn.onclick = (e) => {
            e.stopPropagation();
            triggerShare(file, episodeUrl, episodeTitle, podcastTitle, btnId, originalHTML);
          };
        } else {
          await navigator.clipboard.writeText(episodeUrl);
          btn.innerHTML = '<i class="fas fa-check-circle"></i> LINK COPIED!';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.onclick = (e) => {
              e.stopPropagation();
              prepareEpisodeShare(episodeUrl, episodeTitle, podcastTitle, btnId);
            };
          }, 3000);
        }
      } catch (error) {
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> FAILED';
        btn.disabled = false;
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.onclick = (e) => {
            e.stopPropagation();
            prepareEpisodeShare(episodeUrl, episodeTitle, podcastTitle, btnId);
          };
        }, 3000);
      }
    }
    
    async function triggerShare(file, episodeUrl, episodeTitle, podcastTitle, btnId, originalHTML) {
      const btn = document.getElementById(btnId);
      
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: episodeTitle,
            text: `${episodeTitle} - ${podcastTitle}`,
            files: [file]
          });
        } else {
          await navigator.share({
            title: episodeTitle,
            text: `${episodeTitle} - ${podcastTitle}`,
            url: episodeUrl
          });
        }
        
        btn.innerHTML = '<i class="fas fa-check-circle"></i> SHARED!';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.onclick = (e) => {
            e.stopPropagation();
            prepareEpisodeShare(episodeUrl, episodeTitle, podcastTitle, btnId);
          };
        }, 3000);
      } catch (error) {
        if (error.name !== 'AbortError') {
          btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> TOO BIG';
        } else {
          btn.innerHTML = '<i class="fas fa-times"></i> CANCELLED';
        }
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.onclick = (e) => {
            e.stopPropagation();
            prepareEpisodeShare(episodeUrl, episodeTitle, podcastTitle, btnId);
          };
        }, 3000);
      }
    }
    
    async function handleRSSUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      els.loadingOverlay.classList.add('active');
      
      try {
        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error('Invalid RSS/XML format');
        }
        
        // Extract podcast info
        const channel = xmlDoc.querySelector('channel');
        if (!channel) {
          throw new Error('No channel found in RSS feed');
        }
        
        const title = channel.querySelector('title')?.textContent || 'Unknown Podcast';
        const imageEl = channel.querySelector('image url') || channel.querySelector('itunes\\:image, image[href]');
        const image = imageEl?.textContent || imageEl?.getAttribute('href') || '';
        
        // Extract ALL episodes (no limit)
        const items = xmlDoc.querySelectorAll('item');
        const episodes = Array.from(items).map(item => {
          const enclosure = item.querySelector('enclosure');
          return {
            title: item.querySelector('title')?.textContent || 'Untitled Episode',
            url: enclosure?.getAttribute('url') || '',
            date: item.querySelector('pubDate')?.textContent || ''
          };
        }).filter(ep => ep.url); // Only include episodes with valid audio URLs
        
        els.loadingOverlay.classList.remove('active');
        
        if (episodes.length === 0) {
          els.contentArea.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon"><i class="fas fa-inbox"></i></div>
              <div class="text-base font-bold mb-2 text-amber-100">NO EPISODES FOUND</div>
              <div class="text-sm px-4">This RSS feed doesn't contain any audio episodes</div>
            </div>
          `;
          return;
        }
        
        // Set current podcast state
        state.currentPodcast = { title, image, rss: '' };
        
        // Update breadcrumbs
        els.breadcrumbs.style.display = 'flex';
        els.breadcrumbs.innerHTML = `
          <span class="crumb-link" onclick="goHome()"><i class="fas fa-home"></i> OFFICE</span>
          <i class="fas fa-chevron-right text-amber-800" style="font-size: 10px;"></i>
          <span class="crumb-active"><i class="fas fa-upload"></i> UPLOADED: ${title}</span>
        `;
        
        // Render episodes
        els.contentArea.innerHTML = `
          <div>
            <div class="paper-texture rounded-lg p-3 mb-3 vintage-border">
              <div class="flex items-center gap-3 mb-3">
                ${image ? `<img src="${image}" class="w-16 h-16 rounded border-2 border-amber-700/40 object-cover" alt="${title}" loading="lazy" onerror="this.style.background='#8b7765'; this.alt='Image unavailable';">` : `<div class="w-16 h-16 rounded border-2 border-amber-700/40 bg-amber-900/30 flex items-center justify-center"><i class="fas fa-podcast text-amber-400"></i></div>`}
                <div class="flex-1 min-w-0">
                  <h2 class="font-bold text-amber-200 text-base truncate">${title}</h2>
                  <p class="text-xs text-amber-500">${episodes.length} episodes (all loaded)</p>
                </div>
              </div>
            </div>
            <div class="space-y-2">
              ${episodes.map((ep, i) => `
                <div class="episode-card rounded-lg p-3">
                  <div class="flex items-start gap-3 mb-2" onclick="playEpisode(${i}, ${JSON.stringify(episodes).replace(/"/g, '&quot;')})">
                    <div class="w-10 h-10 rounded bg-amber-800/20 flex items-center justify-center flex-shrink-0 border border-amber-700/40">
                      <i class="fas fa-play text-amber-400 text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-amber-200 text-sm leading-tight line-clamp-2">${ep.title}</div>
                      <div class="text-xs text-amber-500 mt-1">${ep.date || 'Unknown date'}</div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button id="downloadBtn_${i}" onclick="event.stopPropagation(); prepareEpisodeDownload('${ep.url.replace(/'/g, "\\'")}', '${ep.title.replace(/'/g, "\\'")}', 'downloadBtn_${i}')" class="control-btn flex-1 py-2 px-3 rounded text-xs flex items-center justify-center gap-2">
                      <i class="fas fa-download"></i>
                      <span>DOWNLOAD</span>
                    </button>
                    <button id="shareBtn_${i}" onclick="event.stopPropagation(); prepareEpisodeShare('${ep.url.replace(/'/g, "\\'")}', '${ep.title.replace(/'/g, "\\'")}', '${title.replace(/'/g, "\\'")}', 'shareBtn_${i}')" class="control-btn flex-1 py-2 px-3 rounded text-xs flex items-center justify-center gap-2">
                      <i class="fas fa-share-alt"></i>
                      <span>SHARE</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        
        // Reset file input
        event.target.value = '';
        
      } catch (error) {
        els.loadingOverlay.classList.remove('active');
        els.contentArea.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="text-base font-bold mb-2 text-red-400">UPLOAD FAILED</div>
            <div class="text-sm px-4">${error.message || 'Could not parse RSS feed'}</div>
          </div>
        `;
        event.target.value = '';
      }
    }
    
    // Event Listeners
    els.rssUpload.addEventListener('change', handleRSSUpload);
    
    els.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        doSearch(e.target.value);
      }
    });
    
    els.playPauseBtn.addEventListener('click', togglePlayPause);
    
    els.rewindBtn.addEventListener('click', () => {
      els.audioElement.currentTime = Math.max(0, els.audioElement.currentTime - 15);
    });
    
    els.forwardBtn.addEventListener('click', () => {
      els.audioElement.currentTime = Math.min(els.audioElement.duration, els.audioElement.currentTime + 30);
    });
    
    els.progressBar.addEventListener('click', (e) => {
      const rect = els.progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      els.audioElement.currentTime = percent * els.audioElement.duration;
    });
    
    els.audioElement.addEventListener('timeupdate', () => {
      const percent = (els.audioElement.currentTime / els.audioElement.duration) * 100;
      els.progressFill.style.width = `${percent}%`;
      els.currentTime.textContent = formatTime(els.audioElement.currentTime);
    });
    
    els.audioElement.addEventListener('loadedmetadata', () => {
      els.duration.textContent = formatTime(els.audioElement.duration);
    });
    
    els.audioElement.addEventListener('ended', () => {
      state.isPlaying = false;
      els.playPauseIcon.className = 'fas fa-play';
    });
    
    // Initialize
    renderHistory();
    applyConfig();
  
