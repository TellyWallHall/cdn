    const defaultConfig = {
      background_color: '#0a0f1e',
      surface_color: '#151b2e',
      text_color: '#e2e8f0',
      primary_action_color: '#3b82f6',
      secondary_action_color: '#475569',
      font_family: 'system-ui',
      font_size: 15,
      page_title: 'Jellyfin',
      search_placeholder: 'Search files...',
      empty_message: 'No items found'
    };

    const serverUrl = 'jelly.oasis-archive.org';
    const username = 'guest';
    const password = 'guest2001';
    
    let accessToken = null;
    let userId = null;
    let currentPath = [];
    let allItems = [];
    let displayedItems = [];
    let mediaPlayer = null;
    let searchQuery = '';
    let isSearching = false;
    let itemCache = new Map();
    let searchCache = new Map();
    let loadingTimeout = null;
    let historyData = [];
    let favoritesData = [];
    let viewMode = 'grid';
    let sortBy = 'name';
    let sortOrder = 'asc';
    let filterType = 'all';
    let playQueue = [];
    let currentQueueIndex = -1;
    let downloadProgress = 0;
    let isSelectionMode = false;
    let selectedItems = new Set();
    let queuePanelOpen = false;

    function loadFromStorage() {
      try {
        const history = localStorage.getItem('jellyfin_history');
        const favorites = localStorage.getItem('jellyfin_favorites');
        historyData = history ? JSON.parse(history) : [];
        favoritesData = favorites ? JSON.parse(favorites) : [];
      } catch (e) {
        historyData = [];
        favoritesData = [];
      }
    }

    function saveToStorage() {
      try {
        localStorage.setItem('jellyfin_history', JSON.stringify(historyData));
        localStorage.setItem('jellyfin_favorites', JSON.stringify(favoritesData));
      } catch (e) {
        console.error('Failed to save to localStorage');
      }
    }

    async function authenticateJellyfin() {
      try {
        const response = await fetch(`https://${serverUrl}/Users/AuthenticateByName`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': 'MediaBrowser Client="Web", Device="Mobile", DeviceId="canva-mobile", Version="2.0.0"'
          },
          body: JSON.stringify({
            Username: username,
            Pw: password
          })
        });
        
        if (!response.ok) throw new Error('Authentication failed');
        
        const data = await response.json();
        accessToken = data.AccessToken;
        userId = data.User.Id;
        return true;
      } catch (error) {
        console.error('Auth error:', error);
        return false;
      }
    }

    async function fetchItems(parentId = null) {
      if (!accessToken) return [];
      
      const cacheKey = parentId || 'root';
      if (itemCache.has(cacheKey)) {
        return itemCache.get(cacheKey);
      }
      
      try {
        const url = parentId 
          ? `https://${serverUrl}/Users/${userId}/Items?ParentId=${parentId}&Fields=Path,MediaSources,Overview,PrimaryImageAspectRatio&SortBy=IsFolder,SortName&SortOrder=Descending,Ascending&Limit=1000`
          : `https://${serverUrl}/Users/${userId}/Items?Fields=Path,MediaSources,Overview,PrimaryImageAspectRatio&SortBy=IsFolder,SortName&SortOrder=Descending,Ascending&Limit=1000`;
        
        const response = await fetch(url, {
          headers: {
            'X-Emby-Authorization': `MediaBrowser Client="Web", Device="Mobile", DeviceId="canva-mobile", Version="2.0.0", Token="${accessToken}"`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch items');
        
        const data = await response.json();
        const items = data.Items || [];
        itemCache.set(cacheKey, items);
        return items;
      } catch (error) {
        console.error('Fetch error:', error);
        return [];
      }
    }

    async function searchRecursive(query, parentId = null, maxDepth = 5, currentDepth = 0) {
      if (currentDepth >= maxDepth || !query) return [];
      
      const cacheKey = `search_${parentId || 'root'}_${query}`;
      if (searchCache.has(cacheKey)) {
        return searchCache.get(cacheKey);
      }
      
      const results = [];
      const items = await fetchItems(parentId);
      const lowerQuery = query.toLowerCase();
      
      for (const item of items) {
        if (item.Name.toLowerCase().includes(lowerQuery)) {
          results.push(item);
        }
        
        if (item.IsFolder && currentDepth < maxDepth - 1) {
          const subResults = await searchRecursive(query, item.Id, maxDepth, currentDepth + 1);
          results.push(...subResults);
        }
      }
      
      searchCache.set(cacheKey, results);
      return results;
    }

    function getItemIcon(type, isFolder) {
      if (isFolder) return '📁';
      if (type === 'Video' || type === 'Movie' || type === 'Episode') return '🎬';
      if (type === 'Audio' || type === 'MusicAlbum') return '🎵';
      if (type === 'Photo') return '🖼️';
      return '📄';
    }

    function formatDuration(ticks) {
      if (!ticks) return '';
      const minutes = Math.floor(ticks / 600000000);
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }

    function getThumbnailUrl(itemId) {
      return `https://${serverUrl}/Items/${itemId}/Images/Primary?maxHeight=300&quality=90&api_key=${accessToken}`;
    }

    function getStreamUrl(itemId) {
      return `https://${serverUrl}/Items/${itemId}/Download?api_key=${accessToken}`;
    }

    function getVideoStreamUrl(itemId) {
      return `https://${serverUrl}/Videos/${itemId}/stream?Static=true&MediaSourceId=${itemId}&api_key=${accessToken}`;
    }

    function getAudioStreamUrl(itemId) {
      return `https://${serverUrl}/Audio/${itemId}/universal?UserId=${userId}&DeviceId=canva-mobile&MaxStreamingBitrate=140000000&Container=opus,mp3,aac,m4a,flac,webma,webm,wav,ogg&TranscodingContainer=aac&TranscodingProtocol=hls&AudioCodec=aac&api_key=${accessToken}`;
    }

    function addToHistory(item) {
      const existing = historyData.find(h => h.item_id === item.Id);
      if (existing) {
        existing.timestamp = new Date().toISOString();
        historyData = historyData.filter(h => h.item_id !== item.Id);
        historyData.unshift(existing);
      } else {
        historyData.unshift({
          item_id: item.Id,
          item_name: item.Name,
          item_type: item.Type,
          timestamp: new Date().toISOString()
        });
        
        if (historyData.length > 100) {
          historyData = historyData.slice(0, 100);
        }
      }
      saveToStorage();
    }

    function toggleFavorite(item) {
      const existing = favoritesData.find(f => f.item_id === item.Id);
      if (existing) {
        favoritesData = favoritesData.filter(f => f.item_id !== item.Id);
        showToast('Removed from favorites');
      } else {
        favoritesData.push({
          item_id: item.Id,
          item_name: item.Name,
          item_type: item.Type,
          timestamp: new Date().toISOString()
        });
        showToast('Added to favorites');
      }
      saveToStorage();
      render();
    }

    function isFavorite(itemId) {
      return favoritesData.some(f => f.item_id === itemId);
    }

    async function downloadFile(item) {
      try {
        if (!window.showSaveFilePicker) {
          showToast('File System API not supported');
          return;
        }
        
        showToast(`Preparing: ${item.Name}`);
        
        const response = await fetch(getStreamUrl(item.Id));
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: item.Name,
          types: [{
            description: 'Media Files',
            accept: {
              '*/*': [getFileExtension(item.Name)]
            }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        showToast(`Downloaded: ${item.Name}`);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Download error:', error);
          showToast('Download failed');
        }
      }
    }
    
    function getFileExtension(filename) {
      const parts = filename.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    }

    async function shareFile(item) {
      if (!navigator.share) {
        showToast('Sharing not supported on this device');
        return;
      }
      
      try {
        const streamUrl = getStreamUrl(item.Id);
        await navigator.share({
          title: item.Name,
          text: `Check out this file: ${item.Name}`,
          url: streamUrl
        });
        showToast('Shared successfully');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share error:', error);
          showToast('Share failed');
        }
      }
    }

    async function downloadFolderAsZip(folder) {
      const config = window.elementSdk?.config || defaultConfig;
      
      if (!window.showDirectoryPicker) {
        showToast('File System API not supported');
        return;
      }
      
      try {
        const dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'downloads'
        });
        
        const modal = document.createElement('div');
        modal.id = 'download-modal';
        modal.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 16px;">
            <div style="background: ${config.surface_color}; border-radius: 12px; padding: 20px; max-width: 400px; width: 100%;">
              <h3 style="margin: 0 0 12px 0; color: ${config.text_color}; font-size: ${config.font_size * 1.2}px;">Downloading Folder</h3>
              <p id="download-status" style="color: ${config.text_color}; opacity: 0.8; font-size: ${config.font_size * 0.9}px; margin-bottom: 16px;">Preparing...</p>
              <div style="width: 100%; height: 8px; background: ${config.background_color}; border-radius: 4px; overflow: hidden;">
                <div id="download-progress-fill" style="height: 100%; background: ${config.primary_action_color}; width: 0%; transition: width 0.3s;"></div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        
        const items = await fetchItems(folder.Id);
        const files = items.filter(item => !item.IsFolder);
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const statusEl = document.getElementById('download-status');
          const progressEl = document.getElementById('download-progress-fill');
          
          if (statusEl) statusEl.textContent = `Downloading ${i + 1}/${files.length}: ${file.Name}`;
          if (progressEl) progressEl.style.width = `${((i + 1) / files.length) * 100}%`;
          
          const response = await fetch(getStreamUrl(file.Id));
          if (!response.ok) continue;
          
          const blob = await response.blob();
          const fileHandle = await dirHandle.getFileHandle(file.Name, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        modal.remove();
        showToast(`Downloaded ${files.length} files to ${dirHandle.name}`);
      } catch (error) {
        const modal = document.getElementById('download-modal');
        if (modal) modal.remove();
        
        if (error.name !== 'AbortError') {
          console.error('Folder download error:', error);
          showToast('Folder download failed');
        }
      }
    }

    async function bulkDownload() {
      const items = Array.from(selectedItems).map(id => displayedItems.find(item => item.Id === id)).filter(Boolean);
      
      if (items.length === 0) {
        showToast('No items selected');
        return;
      }
      
      for (const item of items) {
        if (item.IsFolder) {
          await downloadFolderAsZip(item);
        } else {
          await downloadFile(item);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      showToast(`Downloaded ${items.length} items`);
      toggleSelectionMode();
    }

    async function bulkAddToQueue() {
      const items = Array.from(selectedItems).map(id => displayedItems.find(item => item.Id === id)).filter(Boolean);
      const mediaItems = items.filter(item => !item.IsFolder && (item.Type === 'Audio' || item.Type === 'Video' || item.Type === 'Movie' || item.Type === 'Episode'));
      
      if (mediaItems.length === 0) {
        showToast('No media files selected');
        return;
      }
      
      mediaItems.forEach(item => {
        if (!playQueue.find(i => i.Id === item.Id)) {
          playQueue.push(item);
        }
      });
      
      showToast(`Added ${mediaItems.length} items to queue`);
      toggleSelectionMode();
    }

    function toggleSelectionMode() {
      isSelectionMode = !isSelectionMode;
      if (!isSelectionMode) {
        selectedItems.clear();
      }
      render();
    }

    function toggleSelection(itemId) {
      if (selectedItems.has(itemId)) {
        selectedItems.delete(itemId);
      } else {
        selectedItems.add(itemId);
      }
      updateSelectionBar();
      
      const checkbox = document.getElementById(`checkbox-${itemId}`);
      if (checkbox) {
        checkbox.checked = selectedItems.has(itemId);
      }
    }

    function updateSelectionBar() {
      const config = window.elementSdk?.config || defaultConfig;
      let bar = document.getElementById('selection-bar');
      
      if (selectedItems.size === 0 && bar) {
        bar.remove();
        return;
      }
      
      if (selectedItems.size > 0 && !bar) {
        bar = document.createElement('div');
        bar.id = 'selection-bar';
        bar.style.cssText = `position: fixed; top: 0; left: 0; right: 0; background: ${config.primary_action_color}; padding: 12px 16px; z-index: 100; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);`;
        document.body.appendChild(bar);
      }
      
      if (bar) {
        bar.innerHTML = `
          <span style="color: white; font-size: ${config.font_size}px; flex: 1;">${selectedItems.size} selected</span>
          <button onclick="bulkDownload()" style="background: white; color: ${config.primary_action_color}; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: ${config.font_size * 0.9}px; font-weight: 600;">Download</button>
          <button onclick="bulkAddToQueue()" style="background: white; color: ${config.primary_action_color}; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: ${config.font_size * 0.9}px; font-weight: 600;">Add to Queue</button>
          <button onclick="toggleSelectionMode()" style="background: none; border: none; color: white; cursor: pointer; font-size: ${config.font_size * 1.2}px; padding: 4px;">✕</button>
        `;
      }
    }

    function showToast(message) {
      const existing = document.getElementById('toast-message');
      if (existing) existing.remove();
      
      const toast = document.createElement('div');
      toast.id = 'toast-message';
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${window.elementSdk?.config?.surface_color || defaultConfig.surface_color};
        color: ${window.elementSdk?.config?.text_color || defaultConfig.text_color};
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: fadeIn 0.2s ease;
        max-width: 80%;
        text-align: center;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.2s';
        setTimeout(() => toast.remove(), 200);
      }, 2500);
    }

    function addToQueue(item) {
      if (!playQueue.find(i => i.Id === item.Id)) {
        playQueue.push(item);
        showToast(`Added to queue (${playQueue.length} items)`);
        if (mediaPlayer) {
          updatePlayerQueueButton();
        }
      }
    }

    window.clearQueue = function() {
      playQueue = [];
      currentQueueIndex = -1;
      queuePanelOpen = false;
      if (mediaPlayer) {
        closePlayer();
      }
    };

    window.toggleQueuePanel = function() {
      queuePanelOpen = !queuePanelOpen;
      const panel = document.getElementById('player-queue-panel');
      if (panel) {
        if (queuePanelOpen) {
          panel.classList.add('queue-panel-open');
        } else {
          panel.classList.remove('queue-panel-open');
        }
      }
    };

    window.jumpToQueueItem = function(index) {
      if (index >= 0 && index < playQueue.length) {
        currentQueueIndex = index;
        closePlayer();
        setTimeout(() => {
          playMedia(playQueue[index], true);
        }, 100);
      }
    };

    function updatePlayerQueueButton() {
      const btn = document.getElementById('queue-toggle-btn');
      if (btn) {
        const config = window.elementSdk?.config || defaultConfig;
        btn.textContent = `Queue (${playQueue.length})`;
        btn.style.display = playQueue.length > 0 ? 'block' : 'none';
      }
    }

    let playerExpanded = true;
    let currentMediaItem = null;

    function playMedia(item, fromQueue = false) {
      const isVideo = item.Type === 'Video' || item.Type === 'Movie' || item.Type === 'Episode';
      const isAudio = item.Type === 'Audio';
      
      if (!isVideo && !isAudio) return;
      
      addToHistory(item);
      currentMediaItem = item;
      
      if (fromQueue) {
        currentQueueIndex = playQueue.findIndex(i => i.Id === item.Id);
      }
      
      if (mediaPlayer) {
        closePlayer();
      }
      
      playerExpanded = true;
      queuePanelOpen = false;
      const config = window.elementSdk?.config || defaultConfig;
      
      const playerHtml = `
        <div id="player-container" style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000; transition: all 0.3s ease;">
          <div id="expanded-view" style="width: 100%; height: 100%; max-height: 100%; background: ${config.background_color}; display: flex; flex-direction: column;">
            <div style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; background: ${config.surface_color}; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h3 id="player-title" style="color: ${config.text_color}; font-size: ${config.font_size * 1.05}px; margin: 0; font-family: ${config.font_family}, -apple-system, sans-serif; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 12px;">${item.Name}</h3>
              <div style="display: flex; gap: 8px;">
                <button onclick="togglePlayerSize()" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: ${config.font_size * 0.9}px;"><i class="fa-solid fa-chevron-down"></i></button>
                <button onclick="closePlayer()" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: ${config.font_size * 0.9}px;"><i class="fa-solid fa-xmark"></i></button>
              </div>
            </div>
            <div id="media-container" style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; background: #000;">
              ${isVideo ? `<video id="media-element" controls autoplay playsinline style="max-width: 100%; max-height: 100%; border-radius: 8px;"><source src="${getVideoStreamUrl(item.Id)}" type="video/mp4"></video>` : ''}
              ${isAudio ? `
                <div style="text-align: center; width: 100%; max-width: 500px;">
                  <div style="width: 120px; height: 120px; margin: 0 auto 24px; background: ${config.surface_color}; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 64px;">🎵</div>
                  <audio id="media-element" controls autoplay style="width: 100%;"><source src="${getAudioStreamUrl(item.Id)}" type="audio/mpeg"></audio>
                </div>
              ` : ''}
            </div>
            <div style="padding: 16px; background: ${config.surface_color}; border-top: 1px solid rgba(255,255,255,0.1); position: relative;">
              <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 12px;">
                <button onclick="skipPrevious()" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: ${config.font_size * 1.1}px;"><i class="fa-solid fa-backward-step"></i></button>
                <button onclick="togglePlayPause()" id="play-pause-btn" style="background: ${config.primary_action_color}; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: ${config.font_size * 1.1}px; min-width: 80px;"><i class="fa-solid fa-pause"></i></button>
                <button onclick="skipNext()" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: ${config.font_size * 1.1}px;"><i class="fa-solid fa-forward-step"></i></button>
                ${playQueue.length > 0 ? `<button onclick="toggleQueuePanel()" id="queue-toggle-btn" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: ${config.font_size * 0.9}px;"><i class="fa-solid fa-turn-down"></i> ${playQueue.length}</button>` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span id="current-time" style="color: ${config.text_color}; font-size: ${config.font_size * 0.85}px; min-width: 45px;">0:00</span>
                <input type="range" id="progress-slider" min="0" max="100" value="0" style="flex: 1; cursor: pointer;">
                <span id="duration-time" style="color: ${config.text_color}; font-size: ${config.font_size * 0.85}px; min-width: 45px;">0:00</span>
              </div>
              
              <div id="player-queue-panel" style="position: absolute; bottom: 100%; left: 0; right: 0; max-height: 300px; background: ${config.background_color}; border-top: 1px solid rgba(255,255,255,0.1); overflow-y: auto; transform: translateY(100%); opacity: 0; pointer-events: none; transition: all 0.3s ease;">
                <div style="padding: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: ${config.font_size}px; font-weight: 600; color: ${config.text_color};">Play Queue</span>
                    <button onclick="clearQueue(); toggleQueuePanel();" style="background: none; border: none; color: ${config.text_color}; opacity: 0.6; cursor: pointer; font-size: ${config.font_size}px;">Clear</button>
                  </div>
                  <div id="queue-items-list">
                    ${playQueue.map((qItem, idx) => `
                      <div onclick="jumpToQueueItem(${idx})" style="padding: 10px; margin-bottom: 6px; background: ${idx === currentQueueIndex ? config.primary_action_color : config.surface_color}; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        <span style="font-size: 18px; color: ${config.text_color};">${getItemIcon(qItem.Type, false)}</span>
                        <div style="flex: 1; min-width: 0;">
                          <div style="color: ${config.text_color}; font-size: ${config.font_size * 0.9}px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: ${idx === currentQueueIndex ? '600' : '400'};">${qItem.Name}</div>
                          ${qItem.RunTimeTicks ? `<div style="color: ${config.text_color}; opacity: 0.6; font-size: ${config.font_size * 0.75}px;">${formatDuration(qItem.RunTimeTicks)}</div>` : ''}
                        </div>
                        ${idx === currentQueueIndex ? `<i class="fa-solid fa-play" style="color: white; font-size: ${config.font_size * 0.9}px;"></i>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div id="mini-player" style="display: none; padding: 12px 16px; background: ${config.surface_color}; border-top: 2px solid ${config.primary_action_color}; box-shadow: 0 -4px 12px rgba(0,0,0,0.3);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 48px; height: 48px; background: ${config.background_color}; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; color: ${config.text_color};">${isVideo ? '<i class="fa-solid fa-film"></i>' : '<i class="fa-solid fa-music"></i>'}</div>
              <div style="flex: 1; min-width: 0;">
                <div id="mini-title" style="color: ${config.text_color}; font-size: ${config.font_size * 0.95}px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.Name}</div>
                <div id="mini-progress" style="color: ${config.text_color}; opacity: 0.6; font-size: ${config.font_size * 0.75}px;">0:00 / 0:00</div>
              </div>
              <div style="display: flex; gap: 8px; flex-shrink: 0;">
                <button onclick="skipPrevious()" style="background: none; border: none; color: ${config.text_color}; cursor: pointer; font-size: 18px; padding: 4px;"><i class="fa-solid fa-backward-step"></i></button>
                <button onclick="togglePlayPause()" id="mini-play-btn" style="background: ${config.primary_action_color}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 16px;"><i class="fa-solid fa-pause"></i></button>
                <button onclick="skipNext()" style="background: none; border: none; color: ${config.text_color}; cursor: pointer; font-size: 18px; padding: 4px;"><i class="fa-solid fa-forward-step"></i></button>
                <button onclick="togglePlayerSize()" style="background: none; border: none; color: ${config.text_color}; cursor: pointer; font-size: 18px; padding: 4px;"><i class="fa-solid fa-chevron-up"></i></button>
                <button onclick="closePlayer()" style="background: none; border: none; color: ${config.text_color}; cursor: pointer; font-size: 18px; padding: 4px;"><i class="fa-solid fa-xmark"></i></button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const playerDiv = document.createElement('div');
      playerDiv.id = 'media-player';
      playerDiv.innerHTML = playerHtml;
      document.body.appendChild(playerDiv);
      mediaPlayer = playerDiv;
      
      const mediaElement = document.getElementById('media-element');
      if (mediaElement) {
        mediaElement.addEventListener('timeupdate', updateProgress);
        mediaElement.addEventListener('loadedmetadata', () => {
          const duration = formatTime(mediaElement.duration);
          document.getElementById('duration-time').textContent = duration;
        });
        mediaElement.addEventListener('play', () => {
          document.getElementById('play-pause-btn').innerHTML = '<i class="fa-solid fa-pause"></i>';
          const miniBtn = document.getElementById('mini-play-btn');
          if (miniBtn) miniBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        });
        mediaElement.addEventListener('pause', () => {
          document.getElementById('play-pause-btn').innerHTML = '<i class="fa-solid fa-play"></i>';
          const miniBtn = document.getElementById('mini-play-btn');
          if (miniBtn) miniBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        });
        
        if (fromQueue) {
          mediaElement.addEventListener('ended', () => {
            playNextInQueue();
          });
        }
      }
      
      const progressSlider = document.getElementById('progress-slider');
      if (progressSlider) {
        progressSlider.addEventListener('input', (e) => {
          if (mediaElement) {
            const time = (e.target.value / 100) * mediaElement.duration;
            mediaElement.currentTime = time;
          }
        });
      }
    }

    function formatTime(seconds) {
      if (isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function updateProgress() {
      const mediaElement = document.getElementById('media-element');
      if (!mediaElement) return;
      
      const currentTime = formatTime(mediaElement.currentTime);
      const duration = formatTime(mediaElement.duration);
      const progress = (mediaElement.currentTime / mediaElement.duration) * 100;
      
      const currentTimeEl = document.getElementById('current-time');
      if (currentTimeEl) currentTimeEl.textContent = currentTime;
      
      const progressSlider = document.getElementById('progress-slider');
      if (progressSlider) progressSlider.value = progress || 0;
      
      const miniProgress = document.getElementById('mini-progress');
      if (miniProgress) miniProgress.textContent = `${currentTime} / ${duration}`;
    }

    window.togglePlayerSize = function() {
      playerExpanded = !playerExpanded;
      const expandedView = document.getElementById('expanded-view');
      const miniPlayer = document.getElementById('mini-player');
      
      if (playerExpanded) {
        expandedView.style.display = 'flex';
        miniPlayer.style.display = 'none';
      } else {
        expandedView.style.display = 'none';
        miniPlayer.style.display = 'block';
      }
    };

    window.togglePlayPause = function() {
      const mediaElement = document.getElementById('media-element');
      if (!mediaElement) return;
      
      if (mediaElement.paused) {
        mediaElement.play();
      } else {
        mediaElement.pause();
      }
    };

    window.skipNext = function() {
      if (playQueue.length > 0 && currentQueueIndex < playQueue.length - 1) {
        playNextInQueue();
      } else {
        showToast('No next track');
      }
    };

    window.skipPrevious = function() {
      if (playQueue.length > 0 && currentQueueIndex > 0) {
        currentQueueIndex--;
        closePlayer();
        setTimeout(() => {
          playMedia(playQueue[currentQueueIndex], true);
        }, 100);
      } else {
        const mediaElement = document.getElementById('media-element');
        if (mediaElement) {
          mediaElement.currentTime = 0;
        }
      }
    };

    function playNextInQueue() {
      if (currentQueueIndex < playQueue.length - 1) {
        currentQueueIndex++;
        closePlayer();
        setTimeout(() => {
          playMedia(playQueue[currentQueueIndex], true);
        }, 300);
      } else {
        showToast('Queue finished');
        clearQueue();
      }
    }

    window.closePlayer = function() {
      if (mediaPlayer) {
        mediaPlayer.remove();
        mediaPlayer = null;
      }
    };

    async function navigateToFolder(item) {
      if (!item.IsFolder) return;
      
      searchQuery = '';
      isSearching = false;
      showLoading();
      currentPath.push(item);
      allItems = await fetchItems(item.Id);
      applySortAndFilter();
      render();
    }

    async function navigateUp() {
      if (currentPath.length === 0) return;
      
      searchQuery = '';
      isSearching = false;
      showLoading();
      currentPath.pop();
      const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].Id : null;
      allItems = await fetchItems(parentId);
      applySortAndFilter();
      render();
    }

    function applySortAndFilter() {
      let filtered = [...allItems];
      
      if (filterType !== 'all') {
        filtered = filtered.filter(item => {
          if (filterType === 'video') return item.Type === 'Video' || item.Type === 'Movie' || item.Type === 'Episode';
          if (filterType === 'audio') return item.Type === 'Audio';
          if (filterType === 'folder') return item.IsFolder;
          return true;
        });
      }
      
      filtered.sort((a, b) => {
        let compareA, compareB;
        
        if (a.IsFolder && !b.IsFolder) return -1;
        if (!a.IsFolder && b.IsFolder) return 1;
        
        if (sortBy === 'name') {
          compareA = a.Name.toLowerCase();
          compareB = b.Name.toLowerCase();
        } else if (sortBy === 'date') {
          compareA = new Date(a.DateCreated || 0).getTime();
          compareB = new Date(b.DateCreated || 0).getTime();
        } else if (sortBy === 'size') {
          compareA = a.Size || 0;
          compareB = b.Size || 0;
        }
        
        if (sortOrder === 'asc') {
          return compareA > compareB ? 1 : -1;
        } else {
          return compareA < compareB ? 1 : -1;
        }
      });
      
      displayedItems = filtered;
    }

    function showLoading() {
      const config = window.elementSdk?.config || defaultConfig;
      const app = document.getElementById('app');
      
      app.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: ${config.background_color}; color: ${config.primary_action_color};">
          <div class="loading-spinner"></div>
          <p style="margin-top: 16px; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.7; font-family: ${config.font_family}, -apple-system, sans-serif;">Loading...</p>
        </div>
      `;
    }

    async function handleSearch(query) {
      searchQuery = query;
      
      if (loadingTimeout) clearTimeout(loadingTimeout);
      
      if (!query.trim()) {
        isSearching = false;
        applySortAndFilter();
        render();
        return;
      }
      
      isSearching = true;
      
      const skeletonCount = 3;
      renderSkeletons(skeletonCount);
      
      loadingTimeout = setTimeout(async () => {
        const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].Id : null;
        const results = await searchRecursive(query, parentId);
        displayedItems = results;
        render();
      }, 300);
    }

    function renderSkeletons(count) {
      const config = window.elementSdk?.config || defaultConfig;
      const app = document.getElementById('app');
      const pathString = currentPath.length > 0 ? currentPath.map(p => p.Name).join(' / ') : 'Root';
      
      app.innerHTML = `
        <div style="height: 100%; width: 100%; background: ${config.background_color}; color: ${config.text_color}; font-family: ${config.font_family}, -apple-system, sans-serif; display: flex; flex-direction: column;">
          ${renderHeader(config, pathString)}
          <div class="virtual-scroll" style="flex: 1; padding: 12px; overflow-y: auto;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;">
              ${Array(count).fill(0).map(() => `
                <div class="skeleton" style="background: ${config.surface_color}; border-radius: 12px; padding: 14px; height: 90px;"></div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    function renderHeader(config, pathString) {
      return `
        <div class="search-bar" style="padding: 12px; background: ${config.surface_color}; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            ${currentPath.length > 0 ? `<button onclick="navigateUp()" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 8px 12px; border-radius: 8px; font-size: ${config.font_size * 1.2}px; line-height: 1; flex-shrink: 0;"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
            <h1 style="margin: 0; font-size: ${config.font_size * 1.3}px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${config.page_title}</h1>
            <button onclick="toggleSelectionMode()" style="background: ${isSelectionMode ? config.primary_action_color : config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 8px 12px; border-radius: 8px; font-size: ${config.font_size * 0.9}px; flex-shrink: 0;">${isSelectionMode ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-regular fa-square-check"></i>'}</button>
            <button onclick="toggleViewMode()" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 8px 12px; border-radius: 8px; font-size: ${config.font_size}px; flex-shrink: 0;">${viewMode === 'grid' ? '<i class="fa-solid fa-list"></i>' : '<i class="fa-solid fa-table-cells-large"></i>'}</button>
          </div>
          <input 
            type="search" 
            placeholder="${config.search_placeholder}"
            value="${searchQuery}"
            oninput="handleSearch(this.value)"
            style="width: 100%; padding: 10px 14px; background: ${config.background_color}; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: ${config.text_color}; font-size: ${config.font_size}px; font-family: ${config.font_family}, -apple-system, sans-serif; margin-bottom: 8px;"
          />
          <div style="display: flex; gap: 6px; margin-bottom: 6px; overflow-x: auto;">
            <select onchange="changeSortBy(this.value)" style="padding: 6px 10px; background: ${config.background_color}; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: ${config.text_color}; font-size: ${config.font_size * 0.85}px; font-family: ${config.font_family}, -apple-system, sans-serif;">
              <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Name</option>
              <option value="date" ${sortBy === 'date' ? 'selected' : ''}>Date</option>
              <option value="size" ${sortBy === 'size' ? 'selected' : ''}>Size</option>
            </select>
            <button onclick="toggleSortOrder()" style="padding: 6px 10px; background: ${config.background_color}; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: ${config.text_color}; font-size: ${config.font_size * 0.85}px;">${sortOrder === 'asc' ? '<i class="fa-solid fa-arrow-up-short-wide"></i>' : '<i class="fa-solid fa-arrow-down-short-wide"></i>'}</button>
            <select onchange="changeFilter(this.value)" style="padding: 6px 10px; background: ${config.background_color}; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: ${config.text_color}; font-size: ${config.font_size * 0.85}px; font-family: ${config.font_family}, -apple-system, sans-serif;">
              <option value="all" ${filterType === 'all' ? 'selected' : ''}>All</option>
              <option value="video" ${filterType === 'video' ? 'selected' : ''}>Videos</option>
              <option value="audio" ${filterType === 'audio' ? 'selected' : ''}>Audio</option>
              <option value="folder" ${filterType === 'folder' ? 'selected' : ''}>Folders</option>
            </select>
            <button onclick="showHistory()" style="padding: 6px 10px; background: ${config.background_color}; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: ${config.text_color}; font-size: ${config.font_size * 0.85}px;"><i class="fa-solid fa-clock-rotate-left"></i></button>
            <button onclick="showFavorites()" style="padding: 6px 10px; background: ${config.background_color}; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: ${config.text_color}; font-size: ${config.font_size * 0.85}px;"><i class="fa-solid fa-star"></i></button>
          </div>
          <div style="margin-top: 6px; font-size: ${config.font_size * 0.85}px; opacity: 0.6;"><i class="fa-solid fa-location-dot"></i> ${pathString}${isSearching ? ' (searching...)' : ''}</div>
        </div>
      `;
    }

    window.toggleViewMode = function() {
      viewMode = viewMode === 'grid' ? 'list' : 'grid';
      render();
    };

    window.changeSortBy = function(value) {
      sortBy = value;
      applySortAndFilter();
      render();
    };

    window.toggleSortOrder = function() {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      applySortAndFilter();
      render();
    };

    window.changeFilter = function(value) {
      filterType = value;
      applySortAndFilter();
      render();
    };

    window.showHistory = function() {
      const config = window.elementSdk?.config || defaultConfig;
      const sorted = [...historyData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div onclick="this.parentElement.remove()" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px;">
          <div onclick="event.stopPropagation()" style="background: ${config.surface_color}; border-radius: 12px; padding: 20px; max-width: 500px; width: 100%; max-height: 80%; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h2 style="margin: 0; color: ${config.text_color}; font-size: ${config.font_size * 1.3}px;"><i class="fa-solid fa-clock-rotate-left"></i> Recent History</h2>
              ${sorted.length > 0 ? `<button onclick="clearHistory(); this.closest('div').parentElement.remove();" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: ${config.font_size * 0.85}px;"><i class="fa-solid fa-trash"></i> Clear</button>` : ''}
            </div>
            ${sorted.length === 0 ? `<p style="color: ${config.text_color}; opacity: 0.6; text-align: center; padding: 24px;">No history yet</p>` : sorted.map(h => `
              <div style="padding: 12px; margin-bottom: 8px; background: ${config.background_color}; border-radius: 8px; color: ${config.text_color}; font-size: ${config.font_size * 0.9}px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">${getItemIcon(h.item_type, false)}</span>
                <div style="flex: 1;">
                  <div>${h.item_name}</div>
                  <div style="font-size: ${config.font_size * 0.75}px; opacity: 0.6; margin-top: 4px;">${new Date(h.timestamp).toLocaleString()}</div>
                </div>
              </div>
            `).join('')}
            <button onclick="this.closest('div').parentElement.remove()" style="width: 100%; margin-top: 12px; padding: 10px; background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; border-radius: 8px; cursor: pointer; font-family: ${config.font_family}, -apple-system, sans-serif;">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    };

    window.clearHistory = function() {
      historyData = [];
      saveToStorage();
      showToast('History cleared');
    };

    window.showFavorites = function() {
      const config = window.elementSdk?.config || defaultConfig;
      
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div onclick="this.parentElement.remove()" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px;">
          <div onclick="event.stopPropagation()" style="background: ${config.surface_color}; border-radius: 12px; padding: 20px; max-width: 500px; width: 100%; max-height: 80%; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h2 style="margin: 0; color: ${config.text_color}; font-size: ${config.font_size * 1.3}px;"><i class="fa-solid fa-star" style="color: #fbbf24;"></i> Favorites</h2>
              ${favoritesData.length > 0 ? `<button onclick="clearFavorites(); this.closest('div').parentElement.remove();" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: ${config.font_size * 0.85}px;"><i class="fa-solid fa-trash"></i> Clear</button>` : ''}
            </div>
            ${favoritesData.length === 0 ? `<p style="color: ${config.text_color}; opacity: 0.6; text-align: center; padding: 24px;">No favorites yet</p>` : favoritesData.map(f => `
              <div style="padding: 12px; margin-bottom: 8px; background: ${config.background_color}; border-radius: 8px; color: ${config.text_color}; font-size: ${config.font_size * 0.9}px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">${getItemIcon(f.item_type, false)}</span>
                <div style="flex: 1;">${f.item_name}</div>
              </div>
            `).join('')}
            <button onclick="this.closest('div').parentElement.remove()" style="width: 100%; margin-top: 12px; padding: 10px; background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; border-radius: 8px; cursor: pointer; font-family: ${config.font_family}, -apple-system, sans-serif;">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    };

    window.clearFavorites = function() {
      favoritesData = [];
      saveToStorage();
      showToast('Favorites cleared');
      render();
    };

    function render() {
      const config = window.elementSdk?.config || defaultConfig;
      const app = document.getElementById('app');
      
      const pathString = currentPath.length > 0 
        ? currentPath.map(p => p.Name).join(' / ') 
        : 'Root';
      
      const gridStyle = viewMode === 'grid' 
        ? 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;'
        : 'display: flex; flex-direction: column; gap: 8px;';
      
      app.innerHTML = `
        <div style="height: 100%; width: 100%; background: ${config.background_color}; color: ${config.text_color}; font-family: ${config.font_family}, -apple-system, sans-serif; display: flex; flex-direction: column;">
          ${renderHeader(config, pathString)}
          
          <div class="virtual-scroll" style="flex: 1; padding: 12px; overflow-y: auto;">
            ${displayedItems.length === 0 ? `
              <div style="text-align: center; padding: 48px 16px; color: ${config.text_color}; opacity: 0.5; font-size: ${config.font_size}px;">
                ${config.empty_message}
              </div>
            ` : `
              <div style="${gridStyle}">
                ${displayedItems.map((item, idx) => renderItem(item, idx, config)).join('')}
              </div>
            `}
          </div>
        </div>
      `;
      
      if (isSelectionMode) {
        updateSelectionBar();
      }
    }

    function renderItem(item, idx, config) {
      const isFav = isFavorite(item.Id);
      const hasThumbnail = !item.IsFolder && (item.Type === 'Video' || item.Type === 'Movie' || item.Type === 'Episode' || item.Type === 'Photo');
      const itemId = `item-${item.Id}`;
      
      if (!window.itemsMap) window.itemsMap = new Map();
      window.itemsMap.set(itemId, item);
      
      if (viewMode === 'list') {
        return `
          <div class="item-card fade-in" style="background: ${config.surface_color}; border-radius: 8px; padding: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 12px; animation-delay: ${idx * 0.01}s;" onclick="${isSelectionMode ? `event.stopPropagation(); toggleSelection('${item.Id}')` : `handleItemClick(window.itemsMap.get('${itemId}'))`}">
            ${isSelectionMode ? `
              <input type="checkbox" id="checkbox-${item.Id}" ${selectedItems.has(item.Id) ? 'checked' : ''} onclick="event.stopPropagation(); toggleSelection('${item.Id}')" style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0;">
            ` : ''}
            <span style="font-size: 24px; flex-shrink: 0;">${getItemIcon(item.Type, item.IsFolder)}</span>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: ${config.font_size}px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.Name}</div>
              <div style="font-size: ${config.font_size * 0.75}px; opacity: 0.6;">${item.Type}${item.RunTimeTicks ? ` · ${formatDuration(item.RunTimeTicks)}` : ''}</div>
            </div>
            ${!isSelectionMode && !item.IsFolder ? `
              <div style="display: flex; gap: 6px; flex-shrink: 0;">
                ${(item.Type === 'Video' || item.Type === 'Movie' || item.Type === 'Episode' || item.Type === 'Audio') ? `
                  <button onclick="event.stopPropagation(); playMedia(window.itemsMap.get('${itemId}'))" class="btn-primary" style="background: ${config.primary_action_color}; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: ${config.font_size * 0.85}px;"><i class="fa-solid fa-play"></i></button>
                  <button onclick="event.stopPropagation(); addToQueue(window.itemsMap.get('${itemId}'))" class="btn-primary" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 6px 10px; border-radius: 6px; font-size: ${config.font_size * 0.85}px;"><i class="fa-solid fa-turn-down"></i></button>
                ` : ''}
                <button onclick="event.stopPropagation(); downloadFile(window.itemsMap.get('${itemId}'))" class="btn-primary" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 6px 10px; border-radius: 6px; font-size: ${config.font_size * 0.85}px;"><i class="fa-solid fa-download"></i></button>
                <button onclick="event.stopPropagation(); toggleFavorite(window.itemsMap.get('${itemId}'))" style="background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px; color: ${isFav ? '#fbbf24' : config.text_color};">${isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>'}</button>
              </div>
            ` : ''}
            ${!isSelectionMode && item.IsFolder ? `
              <button onclick="event.stopPropagation(); downloadFolderAsZip(window.itemsMap.get('${itemId}'))" class="btn-primary" style="background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 6px 12px; border-radius: 6px; font-size: ${config.font_size * 0.85}px; flex-shrink: 0;"><i class="fa-solid fa-download"></i> Folder</button>
            ` : ''}
          </div>
        `;
      }
      
      return `
        <div class="item-card fade-in" style="background: ${config.surface_color}; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); animation-delay: ${idx * 0.02}s; cursor: pointer; position: relative;" onclick="${isSelectionMode ? `event.stopPropagation(); toggleSelection('${item.Id}')` : `handleItemClick(window.itemsMap.get('${itemId}'))`}">
          ${isFav ? `<div class="favorite-badge" style="color: #fbbf24;"><i class="fa-solid fa-star"></i></div>` : ''}
          ${isSelectionMode ? `
            <div style="position: absolute; top: 8px; left: 8px; z-index: 10;">
              <input type="checkbox" id="checkbox-${item.Id}" ${selectedItems.has(item.Id) ? 'checked' : ''} onclick="event.stopPropagation(); toggleSelection('${item.Id}')" style="width: 24px; height: 24px; cursor: pointer;">
            </div>
          ` : ''}
          ${hasThumbnail ? `<img src="${getThumbnailUrl(item.Id)}" class="thumbnail" onerror="this.style.display='none';" />` : `<div class="thumbnail" style="display: flex; align-items: center; justify-content: center; font-size: 48px;">${getItemIcon(item.Type, item.IsFolder)}</div>`}
          <div style="padding: 14px;">
            <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px;">
              <span style="font-size: 24px; flex-shrink: 0;">${getItemIcon(item.Type, item.IsFolder)}</span>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: ${config.font_size * 1.05}px; font-weight: 600; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.Name}</div>
                <div style="font-size: ${config.font_size * 0.8}px; opacity: 0.6;">${item.Type}${item.RunTimeTicks ? ` · ${formatDuration(item.RunTimeTicks)}` : ''}</div>
              </div>
            </div>
            ${!isSelectionMode && !item.IsFolder ? `
              <div style="display: flex; gap: 6px;">
                ${(item.Type === 'Video' || item.Type === 'Movie' || item.Type === 'Episode' || item.Type === 'Audio') ? `
                  <button onclick="event.stopPropagation(); playMedia(window.itemsMap.get('${itemId}'))" class="btn-primary" style="flex: 1; background: ${config.primary_action_color}; color: white; border: none; padding: 8px; border-radius: 8px; font-size: ${config.font_size * 0.85}px; font-family: ${config.font_family}, -apple-system, sans-serif; font-weight: 500;"><i class="fa-solid fa-play"></i></button>
                  <button onclick="event.stopPropagation(); addToQueue(window.itemsMap.get('${itemId}'))" class="btn-primary" style="flex: 1; background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 8px; border-radius: 8px; font-size: ${config.font_size * 0.85}px; font-family: ${config.font_family}, -apple-system, sans-serif; font-weight: 500;"><i class="fa-solid fa-turn-down"></i></button>
                ` : ''}
                <button onclick="event.stopPropagation(); downloadFile(window.itemsMap.get('${itemId}'))" class="btn-primary" style="flex: 1; background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 8px; border-radius: 8px; font-size: ${config.font_size * 0.85}px; font-family: ${config.font_family}, -apple-system, sans-serif; font-weight: 500;"><i class="fa-solid fa-download"></i></button>
                <button onclick="event.stopPropagation(); toggleFavorite(window.itemsMap.get('${itemId}'))" class="btn-primary" style="background: ${config.secondary_action_color}; color: ${isFav ? '#fbbf24' : config.text_color}; border: none; padding: 8px 10px; border-radius: 8px; font-size: ${config.font_size * 0.85}px;">${isFav ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>'}</button>
              </div>
            ` : ''}
            ${!isSelectionMode && item.IsFolder ? `
              <button onclick="event.stopPropagation(); downloadFolderAsZip(window.itemsMap.get('${itemId}'))" class="btn-primary" style="width: 100%; background: ${config.secondary_action_color}; color: ${config.text_color}; border: none; padding: 8px; border-radius: 8px; font-size: ${config.font_size * 0.85}px; font-family: ${config.font_family}, -apple-system, sans-serif; font-weight: 500;"><i class="fa-solid fa-download"></i> Download Folder</button>
            ` : ''}
          </div>
        </div>
      `;
    }

    window.handleItemClick = function(item) {
      if (item.IsFolder) {
        navigateToFolder(item);
      }
    };

    window.downloadFile = downloadFile;
    window.shareFile = shareFile;
    window.downloadFolderAsZip = downloadFolderAsZip;
    window.bulkDownload = bulkDownload;
    window.bulkAddToQueue = bulkAddToQueue;
    window.playMedia = playMedia;
    window.navigateUp = navigateUp;
    window.handleSearch = handleSearch;
    window.toggleFavorite = toggleFavorite;
    window.addToQueue = addToQueue;
    window.toggleSelectionMode = toggleSelectionMode;
    window.toggleSelection = toggleSelection;

    async function init() {
      loadFromStorage();
      showLoading();
      const authenticated = await authenticateJellyfin();
      
      if (!authenticated) {
        const config = window.elementSdk?.config || defaultConfig;
        document.getElementById('app').innerHTML = `
          <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: ${config.background_color}; color: ${config.text_color}; font-family: ${config.font_family}, -apple-system, sans-serif; text-align: center; padding: 24px;">
            <div>
              <div style="font-size: 48px; margin-bottom: 16px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i></div>
              <h2 style="font-size: ${config.font_size * 1.3}px; margin-bottom: 8px;">Connection Failed</h2>
              <p style="font-size: ${config.font_size}px; opacity: 0.7;">Unable to connect to Jellyfin</p>
            </div>
          </div>
        `;
        return;
      }
      
      allItems = await fetchItems();
      applySortAndFilter();
      render();
    }

    async function onConfigChange(config) {
      render();
    }

    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities: (config) => ({
          recolorables: [
            { get: () => config.background_color || defaultConfig.background_color, set: (v) => { config.background_color = v; window.elementSdk.setConfig({ background_color: v }); } },
            { get: () => config.surface_color || defaultConfig.surface_color, set: (v) => { config.surface_color = v; window.elementSdk.setConfig({ surface_color: v }); } },
            { get: () => config.text_color || defaultConfig.text_color, set: (v) => { config.text_color = v; window.elementSdk.setConfig({ text_color: v }); } },
            { get: () => config.primary_action_color || defaultConfig.primary_action_color, set: (v) => { config.primary_action_color = v; window.elementSdk.setConfig({ primary_action_color: v }); } },
            { get: () => config.secondary_action_color || defaultConfig.secondary_action_color, set: (v) => { config.secondary_action_color = v; window.elementSdk.setConfig({ secondary_action_color: v }); } }
          ],
          borderables: [],
          fontEditable: { get: () => config.font_family || defaultConfig.font_family, set: (v) => { config.font_family = v; window.elementSdk.setConfig({ font_family: v }); } },
          fontSizeable: { get: () => config.font_size || defaultConfig.font_size, set: (v) => { config.font_size = v; window.elementSdk.setConfig({ font_size: v }); } }
        }),
        mapToEditPanelValues: (config) => new Map([
          ['page_title', config.page_title || defaultConfig.page_title],
          ['search_placeholder', config.search_placeholder || defaultConfig.search_placeholder],
          ['empty_message', config.empty_message || defaultConfig.empty_message]
        ])
      });
    }

    init();
