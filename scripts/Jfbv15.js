    const defaultConfig = {
      background_color: '#0f172a',
      surface_color: '#1e293b',
      text_color: '#e2e8f0',
      primary_action_color: '#8b5cf6',
      secondary_action_color: '#6366f1',
      browser_title: 'Jellyfin Browser',
      font_family: 'system-ui, -apple-system, sans-serif',
      font_size: 16
    };

    const jellyfinConfig = {
      serverUrl: 'https://jelly.oasis-archive.org',
      username: 'guest',
      password: 'guest2001'
    };

    let jellyfinClient = null;
    let currentPath = [];
    let currentItems = [];
    let filteredItems = [];
    let selectedItems = new Set();
    let currentSort = { by: 'name', order: 'asc' };
    let currentFilter = 'all';
    
    // Playlist state
    let currentPlaylist = [];
    let currentPlayIndex = -1;
    let currentMediaElement = null;
    let isPlaylistMode = false;
    let autoplayEnabled = true;
    
    // Image cache
    const imageCache = new Map();
    
    // Resume playback state (stored in localStorage)
    const RESUME_KEY = 'jellyfin_resume_state';

    async function onConfigChange(config) {
      const appElement = document.getElementById('app');
      const browserTitle = document.getElementById('browser-title');
      
      const backgroundColor = config.background_color || defaultConfig.background_color;
      const textColor = config.text_color || defaultConfig.text_color;
      const primaryColor = config.primary_action_color || defaultConfig.primary_action_color;
      const fontFamily = config.font_family || defaultConfig.font_family;
      const fontSize = config.font_size || defaultConfig.font_size;
      
      appElement.style.background = `linear-gradient(135deg, ${backgroundColor} 0%, ${primaryColor}40 50%, ${backgroundColor} 100%)`;
      browserTitle.style.fontFamily = `${fontFamily}, system-ui, sans-serif`;
      browserTitle.style.fontSize = `${fontSize * 1.875}px`;
      browserTitle.style.color = textColor;
      browserTitle.textContent = config.browser_title || defaultConfig.browser_title;
    }

    function mapToCapabilities(config) {
      return {
        recolorables: [
          {
            get: () => config.background_color || defaultConfig.background_color,
            set: (value) => {
              config.background_color = value;
              window.elementSdk.setConfig({ background_color: value });
            }
          },
          {
            get: () => config.surface_color || defaultConfig.surface_color,
            set: (value) => {
              config.surface_color = value;
              window.elementSdk.setConfig({ surface_color: value });
            }
          },
          {
            get: () => config.text_color || defaultConfig.text_color,
            set: (value) => {
              config.text_color = value;
              window.elementSdk.setConfig({ text_color: value });
            }
          },
          {
            get: () => config.primary_action_color || defaultConfig.primary_action_color,
            set: (value) => {
              config.primary_action_color = value;
              window.elementSdk.setConfig({ primary_action_color: value });
            }
          },
          {
            get: () => config.secondary_action_color || defaultConfig.secondary_action_color,
            set: (value) => {
              config.secondary_action_color = value;
              window.elementSdk.setConfig({ secondary_action_color: value });
            }
          }
        ],
        borderables: [],
        fontEditable: {
          get: () => config.font_family || defaultConfig.font_family,
          set: (value) => {
            config.font_family = value;
            window.elementSdk.setConfig({ font_family: value });
          }
        },
        fontSizeable: {
          get: () => config.font_size || defaultConfig.font_size,
          set: (value) => {
            config.font_size = value;
            window.elementSdk.setConfig({ font_size: value });
          }
        }
      };
    }

    function mapToEditPanelValues(config) {
      return new Map([
        ['browser_title', config.browser_title || defaultConfig.browser_title]
      ]);
    }

    class JellyfinClient {
      constructor(serverUrl, username, password) {
        this.serverUrl = serverUrl;
        this.username = username;
        this.password = password;
        this.accessToken = null;
        this.userId = null;
      }

      async authenticate() {
        const response = await fetch(`${this.serverUrl}/Users/AuthenticateByName`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': `MediaBrowser Client="Jellyfin Browser", Device="Browser", DeviceId="browser-${Date.now()}", Version="1.0.0"`
          },
          body: JSON.stringify({
            Username: this.username,
            Pw: this.password
          })
        });

        if (!response.ok) throw new Error('Authentication failed');

        const data = await response.json();
        this.accessToken = data.AccessToken;
        this.userId = data.User.Id;
        return data;
      }

      async getItems(parentId = null) {
        const params = new URLSearchParams({
          SortBy: 'IsFolder,SortName',
          SortOrder: 'Ascending',
          Recursive: 'false',
          Fields: 'Size,DateCreated,PrimaryImageAspectRatio'
        });

        if (parentId) params.append('ParentId', parentId);

        const response = await fetch(`${this.serverUrl}/Users/${this.userId}/Items?${params}`, {
          headers: { 'X-Emby-Token': this.accessToken }
        });

        if (!response.ok) throw new Error('Failed to fetch items');
        const data = await response.json();
        return data.Items || [];
      }

      getThumbnailUrl(itemId, width = 300) {
        return `${this.serverUrl}/Items/${itemId}/Images/Primary?maxWidth=${width}&quality=90&api_key=${this.accessToken}`;
      }

      async searchItems(query, parentId = null) {
        const params = new URLSearchParams({
          SearchTerm: query,
          Recursive: 'true',
          SortBy: 'IsFolder,SortName',
          SortOrder: 'Ascending',
          Limit: '500',
          Fields: 'Size,DateCreated,PrimaryImageAspectRatio'
        });

        if (parentId) params.append('ParentId', parentId);

        const response = await fetch(`${this.serverUrl}/Users/${this.userId}/Items?${params}`, {
          headers: { 'X-Emby-Token': this.accessToken }
        });

        if (!response.ok) throw new Error('Failed to search');
        const data = await response.json();
        return data.Items;
      }

      getStreamUrl(itemId) {
        return `${this.serverUrl}/Items/${itemId}/Download?api_key=${this.accessToken}`;
      }
    }

    function showToast(message, duration = 3000) {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => toast.remove(), duration);
    }

    function getFileIcon(item) {
      if (item.IsFolder) return '📁';
      const type = item.Type || item.MediaType;
      if (type === 'Video') return '🎬';
      if (type === 'Audio') return '🎵';
      if (type === 'Photo') return '���️';
      return '📄';
    }

    function getItemType(item) {
      if (item.IsFolder) return 'folder';
      const type = item.Type || item.MediaType;
      if (type === 'Movie' || type === 'Episode' || type === 'Video') return 'video';
      if (type === 'Audio') return 'audio';
      if (type === 'Photo') return 'image';
      return 'other';
    }

    function formatFileSize(bytes) {
      if (!bytes) return '';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let unitIndex = 0;
      
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      
      return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    function formatDate(dateString) {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString();
    }

    function sortItems(items, sortBy, order) {
      const sorted = [...items];
      
      sorted.sort((a, b) => {
        if (a.IsFolder !== b.IsFolder) return a.IsFolder ? -1 : 1;
        
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = (a.Name || '').localeCompare(b.Name || '');
        } else if (sortBy === 'size') {
          comparison = (a.Size || 0) - (b.Size || 0);
        } else if (sortBy === 'date') {
          const dateA = a.DateCreated ? new Date(a.DateCreated).getTime() : 0;
          const dateB = b.DateCreated ? new Date(b.DateCreated).getTime() : 0;
          comparison = dateA - dateB;
        }
        
        return order === 'asc' ? comparison : -comparison;
      });
      
      return sorted;
    }

    function filterItems(items, filterType) {
      if (filterType === 'all') return items;
      
      return items.filter(item => {
        const type = getItemType(item);
        if (filterType === 'folders') return type === 'folder';
        if (filterType === 'videos') return type === 'video';
        if (filterType === 'audio') return type === 'audio';
        if (filterType === 'images') return type === 'image';
        return true;
      });
    }

    function applyFilterAndSort() {
      filteredItems = filterItems(currentItems, currentFilter);
      filteredItems = sortItems(filteredItems, currentSort.by, currentSort.order);
      selectedItems.clear();
      updateSelectionToolbar();
      renderFileList();
    }

    function updateSortButtons() {
      const buttons = {
        name: document.getElementById('sort-name'),
        size: document.getElementById('sort-size'),
        date: document.getElementById('sort-date')
      };
      
      Object.keys(buttons).forEach(key => {
        const btn = buttons[key];
        if (key === currentSort.by) {
          btn.classList.remove('bg-slate-700/70');
          btn.classList.add('bg-purple-600', 'font-medium');
          const arrow = currentSort.order === 'asc' ? '↑' : '↓';
          btn.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)} ${arrow}`;
        } else {
          btn.classList.remove('bg-purple-600', 'font-medium');
          btn.classList.add('bg-slate-700/70');
          btn.textContent = key.charAt(0).toUpperCase() + key.slice(1);
        }
      });
    }

    function updateFilterButtons() {
      const buttons = {
        all: document.getElementById('filter-all'),
        folders: document.getElementById('filter-folders'),
        videos: document.getElementById('filter-videos'),
        audio: document.getElementById('filter-audio'),
        images: document.getElementById('filter-images')
      };
      
      Object.keys(buttons).forEach(key => {
        const btn = buttons[key];
        if (key === currentFilter) {
          btn.classList.remove('bg-slate-700/70');
          btn.classList.add('bg-purple-600', 'font-medium');
        } else {
          btn.classList.remove('bg-purple-600', 'font-medium');
          btn.classList.add('bg-slate-700/70');
        }
      });
    }

    function updateSelectionToolbar() {
      const toolbar = document.getElementById('selection-toolbar');
      const count = document.getElementById('selection-count');
      
      count.textContent = `${selectedItems.size} selected`;
      
      if (selectedItems.size > 0) {
        toolbar.classList.remove('hidden');
      } else {
        toolbar.classList.add('hidden');
      }
    }

    function toggleItemSelection(itemId) {
      if (selectedItems.has(itemId)) {
        selectedItems.delete(itemId);
      } else {
        selectedItems.add(itemId);
      }
      updateSelectionToolbar();
      renderFileList();
    }

    function selectAll() {
      filteredItems.forEach(item => selectedItems.add(item.Id));
      updateSelectionToolbar();
      renderFileList();
    }

    function deselectAll() {
      selectedItems.clear();
      updateSelectionToolbar();
      renderFileList();
    }

    async function downloadSelected() {
      const selectedItemsArray = filteredItems.filter(item => selectedItems.has(item.Id));
      
      if (selectedItemsArray.length === 0) {
        showToast('No items selected');
        return;
      }

      const files = selectedItemsArray.filter(item => !item.IsFolder);
      const folders = selectedItemsArray.filter(item => item.IsFolder);

      if (folders.length > 0) {
        showToast(`📦 Preparing ${folders.length} folder(s) for download...`);
        
        for (const folder of folders) {
          await downloadFolderAsZip(folder);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (files.length > 0) {
        // Try File System Access API for directory picker
        if (window.showDirectoryPicker && files.length > 1) {
          try {
            const dirHandle = await window.showDirectoryPicker();
            
            showToast(`💾 Downloading ${files.length} file(s)...`);
            
            for (let i = 0; i < files.length; i++) {
              const item = files[i];
              try {
                const downloadUrl = jellyfinClient.getStreamUrl(item.Id);
                const response = await fetch(downloadUrl);
                
                if (!response.ok) throw new Error('Download failed');
                
                const blob = await response.blob();
                const fileHandle = await dirHandle.getFileHandle(item.Name, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                
                if (i % 3 === 0 || i === files.length - 1) {
                  showToast(`💾 Downloaded ${i + 1}/${files.length} files...`);
                }
              } catch (error) {
                console.error(`Failed to download ${item.Name}:`, error);
              }
            }
            
            showToast(`✓ Downloaded ${files.length} file(s)`);
          } catch (err) {
            if (err.name === 'AbortError') return; // User cancelled
            // Fallback to individual downloads
            for (const item of files) {
              await downloadFile(item);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } else {
          // Download files individually
          for (const item of files) {
            await downloadFile(item);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      selectedItems.clear();
      updateSelectionToolbar();
      renderFileList();
    }

    async function downloadFolderAsZip(folder) {
      try {
        // Get all items in the folder recursively
        const allItems = await getAllItemsRecursive(folder.Id);
        const files = allItems.filter(item => !item.IsFolder);
        
        if (files.length === 0) {
          showToast(`⚠ Folder "${folder.Name}" is empty`);
          return;
        }

        showToast(`📦 Creating ZIP for "${folder.Name}" (${files.length} files)...`);

        // Use JSZip library loaded from CDN
        const zip = new JSZip();
        
        // Download all files and add to zip
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const url = jellyfinClient.getStreamUrl(file.Id);
            const response = await fetch(url);
            
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            
            // Get relative path for the file
            const relativePath = getRelativePath(file, allItems, folder.Id);
            zip.file(relativePath, blob);
            
            // Show progress
            if (i % 5 === 0 || i === files.length - 1) {
              showToast(`📦 Adding files... ${i + 1}/${files.length}`);
            }
          } catch (error) {
            console.error(`Failed to add ${file.Name}:`, error);
          }
        }

        // Generate and download the zip
        showToast('🔄 Generating ZIP file...');
        const zipBlob = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        
        // Try File System Access API first
        if (window.showSaveFilePicker) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: `${folder.Name}.zip`,
              types: [{
                description: 'ZIP Archive',
                accept: { 'application/zip': ['.zip'] }
              }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(zipBlob);
            await writable.close();
            
            showToast(`✓ Downloaded "${folder.Name}.zip"`);
          } catch (err) {
            if (err.name === 'AbortError') return; // User cancelled
            throw err;
          }
        } else {
          // Fallback to traditional download
          const link = document.createElement('a');
          link.href = URL.createObjectURL(zipBlob);
          link.download = `${folder.Name}.zip`;
          link.click();
          
          // Clean up
          setTimeout(() => URL.revokeObjectURL(link.href), 10000);
          
          showToast(`✓ Downloaded "${folder.Name}.zip"`);
        }
      } catch (error) {
        showToast(`�� Failed to download folder: ${error.message}`);
      }
    }

    async function getAllItemsRecursive(parentId, items = []) {
      try {
        const folderItems = await jellyfinClient.getItems(parentId);
        
        for (const item of folderItems) {
          items.push(item);
          
          if (item.IsFolder) {
            await getAllItemsRecursive(item.Id, items);
          }
        }
        
        return items;
      } catch (error) {
        console.error('Error getting items:', error);
        return items;
      }
    }

    function getRelativePath(file, allItems, rootFolderId) {
      // Build path by traversing parent relationships
      const pathParts = [file.Name];
      let currentId = file.ParentId;
      
      // Traverse up to root folder
      while (currentId && currentId !== rootFolderId) {
        const parent = allItems.find(item => item.Id === currentId);
        if (parent) {
          pathParts.unshift(parent.Name);
          currentId = parent.ParentId;
        } else {
          break;
        }
      }
      
      return pathParts.join('/');
    }

    function renderBreadcrumb() {
      const breadcrumb = document.getElementById('breadcrumb');
      breadcrumb.innerHTML = '';
      
      const homeBtn = document.createElement('button');
      homeBtn.className = 'px-3 py-2 min-h-[44px] bg-purple-600/40 hover:bg-purple-600/60 rounded-lg transition-colors';
      homeBtn.textContent = '🏠';
      homeBtn.onclick = () => navigateToFolder(null, []);
      breadcrumb.appendChild(homeBtn);
      
      currentPath.forEach((item, index) => {
        const separator = document.createElement('span');
        separator.className = 'text-purple-400 px-1';
        separator.textContent = '/';
        breadcrumb.appendChild(separator);
        
        const btn = document.createElement('button');
        btn.className = 'px-3 py-2 min-h-[44px] bg-purple-600/40 hover:bg-purple-600/60 rounded-lg transition-colors truncate max-w-xs';
        btn.textContent = item.name;
        btn.onclick = () => {
          const newPath = currentPath.slice(0, index + 1);
          navigateToFolder(item.id, newPath);
        };
        breadcrumb.appendChild(btn);
      });
    }

    function saveResumeState(item, currentTime) {
      const state = {
        itemId: item.Id,
        itemName: item.Name,
        itemType: getItemType(item),
        currentTime: currentTime,
        timestamp: Date.now()
      };
      localStorage.setItem(RESUME_KEY, JSON.stringify(state));
    }

    function getResumeState() {
      try {
        const state = localStorage.getItem(RESUME_KEY);
        return state ? JSON.parse(state) : null;
      } catch {
        return null;
      }
    }

    function clearResumeState() {
      localStorage.removeItem(RESUME_KEY);
    }

    // Progress tracking functions
    const PROGRESS_KEY_PREFIX = 'jellyfin_progress_';

    function saveFileProgress(itemId, currentTime, duration) {
      const percentComplete = (currentTime / duration) * 100;
      const progress = {
        currentTime: currentTime,
        duration: duration,
        percentComplete: percentComplete,
        completed: percentComplete >= 95, // Mark as completed at 95%
        lastUpdated: Date.now()
      };
      localStorage.setItem(PROGRESS_KEY_PREFIX + itemId, JSON.stringify(progress));
    }

    function getFileProgress(itemId) {
      try {
        const data = localStorage.getItem(PROGRESS_KEY_PREFIX + itemId);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    }

    function clearFileProgress(itemId) {
      localStorage.removeItem(PROGRESS_KEY_PREFIX + itemId);
    }

    function closeMediaPlayer() {
      // Save current playback position before closing
      if (currentMediaElement && currentPlaylist[currentPlayIndex]) {
        const currentTime = currentMediaElement.currentTime;
        const duration = currentMediaElement.duration;
        
        // Only save if not finished (within 5 seconds of end)
        if (duration - currentTime > 5) {
          saveResumeState(currentPlaylist[currentPlayIndex], currentTime);
          showToast('💾 Progress saved');
        } else {
          clearResumeState();
        }
      }
      
      const player = document.getElementById('media-player');
      player.innerHTML = '';
      player.classList.add('hidden');
      currentMediaElement = null;
      currentPlaylist = [];
      currentPlayIndex = -1;
      isPlaylistMode = false;
      renderFileList();
    }

    function buildPlaylist(startItem) {
      const itemType = getItemType(startItem);
      if (itemType !== 'video' && itemType !== 'audio') return [];
      
      return filteredItems.filter(item => getItemType(item) === itemType);
    }

    function playNext() {
      if (!isPlaylistMode || currentPlaylist.length === 0) return;
      
      if (currentPlayIndex < currentPlaylist.length - 1) {
        currentPlayIndex++;
        const nextItem = currentPlaylist[currentPlayIndex];
        const itemType = getItemType(nextItem);
        
        if (itemType === 'video') {
          playVideo(nextItem, true);
        } else if (itemType === 'audio') {
          playAudio(nextItem, true);
        }
      } else {
        showToast('🎬 Playlist finished');
        closeMediaPlayer();
      }
    }

    function playPrevious() {
      if (!isPlaylistMode || currentPlaylist.length === 0) return;
      
      if (currentPlayIndex > 0) {
        currentPlayIndex--;
        const prevItem = currentPlaylist[currentPlayIndex];
        const itemType = getItemType(prevItem);
        
        if (itemType === 'video') {
          playVideo(prevItem, true);
        } else if (itemType === 'audio') {
          playAudio(prevItem, true);
        }
      }
    }

    function playVideo(item, fromPlaylist = false, resumeTime = null) {
      if (!fromPlaylist) {
        currentPlaylist = buildPlaylist(item);
        currentPlayIndex = currentPlaylist.findIndex(i => i.Id === item.Id);
        isPlaylistMode = currentPlaylist.length > 1;
      }
      
      const player = document.getElementById('media-player');
      const streamUrl = jellyfinClient.getStreamUrl(item.Id);
      
      player.innerHTML = `
        <div class="rounded-lg overflow-hidden bg-black">
          <div class="flex justify-between items-center p-3 bg-black/70">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold truncate">${item.Name}</h3>
              ${isPlaylistMode ? `<p class="text-sm text-purple-300">${currentPlayIndex + 1} / ${currentPlaylist.length}</p>` : ''}
            </div>
            <button onclick="closeMediaPlayer()" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm ml-2">
              ✕
            </button>
          </div>
          <video id="current-video" controls autoplay class="w-full" style="max-height: 500px;">
            <source src="${streamUrl}" type="video/mp4">
          </video>
          ${isPlaylistMode ? `
            <div class="playlist-controls">
              <button class="playlist-btn" onclick="playPrevious()" ${currentPlayIndex === 0 ? 'disabled' : ''}>
                ⏮ Previous
              </button>
              <button class="playlist-btn" onclick="toggleAutoplay()">
                ${autoplayEnabled ? '🔁 Autoplay ON' : '⏸ Autoplay OFF'}
              </button>
              <button class="playlist-btn" onclick="playNext()" ${currentPlayIndex === currentPlaylist.length - 1 ? 'disabled' : ''}>
                Next ⏭
              </button>
            </div>
          ` : ''}
        </div>
      `;
      
      player.classList.remove('hidden');
      currentMediaElement = document.getElementById('current-video');
      
      // Resume from saved time if provided
      if (resumeTime !== null && resumeTime > 0) {
        currentMediaElement.addEventListener('loadedmetadata', () => {
          currentMediaElement.currentTime = resumeTime;
          showToast(`⏩ Resumed from ${formatTime(resumeTime)}`);
        }, { once: true });
      }
      
      // Periodically save progress
      let saveInterval = setInterval(() => {
        if (currentMediaElement && !currentMediaElement.paused && currentMediaElement.duration) {
          saveResumeState(item, currentMediaElement.currentTime);
          saveFileProgress(item.Id, currentMediaElement.currentTime, currentMediaElement.duration);
        }
      }, 10000); // Save every 10 seconds
      
      currentMediaElement.addEventListener('ended', () => {
        clearInterval(saveInterval);
        clearResumeState();
        // Mark as completed
        if (currentMediaElement.duration) {
          saveFileProgress(item.Id, currentMediaElement.duration, currentMediaElement.duration);
        }
        if (isPlaylistMode && autoplayEnabled && currentPlayIndex < currentPlaylist.length - 1) {
          playNext();
        }
      });
      
      // Clear interval when player is closed
      const originalClose = window.closeMediaPlayer;
      window.closeMediaPlayer = function() {
        clearInterval(saveInterval);
        originalClose();
      };
      
      hideResumeBanner();
      renderFileList();
    }

    function playAudio(item, fromPlaylist = false, resumeTime = null) {
      if (!fromPlaylist) {
        currentPlaylist = buildPlaylist(item);
        currentPlayIndex = currentPlaylist.findIndex(i => i.Id === item.Id);
        isPlaylistMode = currentPlaylist.length > 1;
      }
      
      const player = document.getElementById('media-player');
      const streamUrl = jellyfinClient.getStreamUrl(item.Id);
      
      player.innerHTML = `
        <div class="rounded-lg overflow-hidden p-4 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div class="flex justify-between items-center mb-3">
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-bold truncate">${item.Name}</h3>
              ${isPlaylistMode ? `<p class="text-sm text-purple-100 mt-1">${currentPlayIndex + 1} / ${currentPlaylist.length}</p>` : ''}
            </div>
            <button onclick="closeMediaPlayer()" class="ml-3 px-3 py-1 bg-purple-700 hover:bg-purple-600 rounded text-sm">
              ✕
            </button>
          </div>
          <audio id="current-audio" controls autoplay class="w-full mb-3">
            <source src="${streamUrl}">
          </audio>
          ${isPlaylistMode ? `
            <div class="playlist-controls">
              <button class="playlist-btn" onclick="playPrevious()" ${currentPlayIndex === 0 ? 'disabled' : ''}>
                ⏮ Previous
              </button>
              <button class="playlist-btn" onclick="toggleAutoplay()">
                ${autoplayEnabled ? '🔁 Autoplay ON' : '⏸ Autoplay OFF'}
              </button>
              <button class="playlist-btn" onclick="playNext()" ${currentPlayIndex === currentPlaylist.length - 1 ? 'disabled' : ''}>
                Next ⏭
              </button>
            </div>
          ` : ''}
        </div>
      `;
      
      player.classList.remove('hidden');
      currentMediaElement = document.getElementById('current-audio');
      
      // Resume from saved time if provided
      if (resumeTime !== null && resumeTime > 0) {
        currentMediaElement.addEventListener('loadedmetadata', () => {
          currentMediaElement.currentTime = resumeTime;
          showToast(`⏩ Resumed from ${formatTime(resumeTime)}`);
        }, { once: true });
      }
      
      // Periodically save progress
      let saveInterval = setInterval(() => {
        if (currentMediaElement && !currentMediaElement.paused && currentMediaElement.duration) {
          saveResumeState(item, currentMediaElement.currentTime);
          saveFileProgress(item.Id, currentMediaElement.currentTime, currentMediaElement.duration);
        }
      }, 10000); // Save every 10 seconds
      
      currentMediaElement.addEventListener('ended', () => {
        clearInterval(saveInterval);
        clearResumeState();
        // Mark as completed
        if (currentMediaElement.duration) {
          saveFileProgress(item.Id, currentMediaElement.duration, currentMediaElement.duration);
        }
        if (isPlaylistMode && autoplayEnabled && currentPlayIndex < currentPlaylist.length - 1) {
          playNext();
        }
      });
      
      // Clear interval when player is closed
      const originalClose = window.closeMediaPlayer;
      window.closeMediaPlayer = function() {
        clearInterval(saveInterval);
        originalClose();
      };
      
      hideResumeBanner();
      renderFileList();
    }

    function toggleAutoplay() {
      autoplayEnabled = !autoplayEnabled;
      showToast(autoplayEnabled ? '🔁 Autoplay enabled' : '⏸ Autoplay disabled');
      
      const currentItem = currentPlaylist[currentPlayIndex];
      const itemType = getItemType(currentItem);
      if (itemType === 'video') {
        playVideo(currentItem, true);
      } else if (itemType === 'audio') {
        playAudio(currentItem, true);
      }
    }

    function formatTime(seconds) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function showResumeBanner() {
      const resumeState = getResumeState();
      if (!resumeState) return;
      
      const banner = document.getElementById('resume-banner');
      const title = document.getElementById('resume-title');
      const info = document.getElementById('resume-info');
      
      title.textContent = `Continue ${resumeState.itemType === 'video' ? 'watching' : 'listening to'}: ${resumeState.itemName}`;
      info.textContent = `Resume from ${formatTime(resumeState.currentTime)}`;
      
      banner.classList.remove('hidden');
    }

    function hideResumeBanner() {
      const banner = document.getElementById('resume-banner');
      banner.classList.add('hidden');
    }

    async function resumePlayback() {
      const resumeState = getResumeState();
      if (!resumeState) return;
      
      try {
        // Search for the item by ID
        showToast('🔍 Finding your media...');
        
        const allItems = await jellyfinClient.searchItems(resumeState.itemName);
        const item = allItems.find(i => i.Id === resumeState.itemId);
        
        if (!item) {
          showToast('⚠ Could not find the media file');
          clearResumeState();
          hideResumeBanner();
          return;
        }
        
        // Play the item with resume time
        if (resumeState.itemType === 'video') {
          playVideo(item, false, resumeState.currentTime);
        } else if (resumeState.itemType === 'audio') {
          playAudio(item, false, resumeState.currentTime);
        }
      } catch (error) {
        showToast('✗ Failed to resume playback');
        console.error(error);
      }
    }

    async function downloadFile(item) {
      try {
        const downloadUrl = jellyfinClient.getStreamUrl(item.Id);
        
        // Try File System Access API first
        if (window.showSaveFilePicker) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: item.Name,
              types: [{
                description: 'File',
                accept: { '*/*': [] }
              }]
            });
            
            showToast(`💾 Downloading ${item.Name}...`);
            
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            showToast(`✓ Downloaded ${item.Name}`);
          } catch (err) {
            if (err.name === 'AbortError') return; // User cancelled
            throw err;
          }
        } else {
          // Fallback to traditional download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = item.Name;
          link.click();
          showToast(`💾 Downloading ${item.Name}`);
        }
      } catch (error) {
        showToast(`✗ Download failed: ${error.message}`);
      }
    }

    function renderFileList() {
      const fileList = document.getElementById('file-list');
      fileList.innerHTML = '';
      
      filteredItems.forEach(item => {
        const isPlaying = isPlaylistMode && currentPlaylist[currentPlayIndex]?.Id === item.Id;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = `file-item flex items-center gap-3 p-4 ${
          selectedItems.has(item.Id) ? 'selected' : ''
        } ${isPlaying ? 'now-playing' : ''}`;
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedItems.has(item.Id);
        checkbox.className = 'w-5 h-5 rounded border-purple-500 text-purple-600 cursor-pointer';
        checkbox.onclick = (e) => {
          e.stopPropagation();
          toggleItemSelection(item.Id);
        };
        itemDiv.appendChild(checkbox);
        
        // Icon/Thumbnail
        const iconContainer = document.createElement('div');
        iconContainer.className = 'flex-shrink-0';
        
        const hasImage = item.ImageTags && item.ImageTags.Primary;
        
        if (hasImage && !item.IsFolder) {
          const img = document.createElement('img');
          img.className = 'w-16 h-16 object-cover rounded';
          img.alt = item.Name;
          
          const thumbnailUrl = jellyfinClient.getThumbnailUrl(item.Id);
          
          // Check cache first
          if (imageCache.has(item.Id)) {
            img.src = imageCache.get(item.Id);
          } else {
            // Load and cache
            img.src = thumbnailUrl;
            img.onload = () => imageCache.set(item.Id, thumbnailUrl);
            img.onerror = () => {
              img.style.display = 'none';
              const fallbackIcon = document.createElement('span');
              fallbackIcon.className = 'text-3xl';
              fallbackIcon.textContent = getFileIcon(item);
              iconContainer.appendChild(fallbackIcon);
            };
          }
          
          iconContainer.appendChild(img);
        } else {
          const icon = document.createElement('span');
          icon.className = 'text-3xl';
          icon.textContent = isPlaying ? '▶️' : getFileIcon(item);
          iconContainer.appendChild(icon);
        }
        
        itemDiv.appendChild(iconContainer);
        
        // Info
        const info = document.createElement('div');
        info.className = 'flex-1 min-w-0';
        
        const name = document.createElement('div');
        name.className = 'font-medium truncate';
        name.textContent = item.Name;
        info.appendChild(name);
        
        const meta = document.createElement('div');
        meta.className = 'text-xs text-purple-400/80 flex gap-2 mt-1';
        
        if (!item.IsFolder && item.Size) {
          const size = document.createElement('span');
          size.textContent = formatFileSize(item.Size);
          meta.appendChild(size);
        }
        
        if (item.DateCreated) {
          const date = document.createElement('span');
          date.textContent = formatDate(item.DateCreated);
          meta.appendChild(date);
        }
        
        // Show progress for media files
        const itemType = getItemType(item);
        if ((itemType === 'video' || itemType === 'audio') && !item.IsFolder) {
          const progress = getFileProgress(item.Id);
          if (progress) {
            const progressSpan = document.createElement('span');
            progressSpan.className = progress.completed ? 'text-green-400 font-bold' : 'text-blue-400 font-medium';
            
            if (progress.completed) {
              progressSpan.textContent = '✓ Completed';
            } else {
              progressSpan.textContent = `⏸ ${Math.round(progress.percentComplete)}%`;
            }
            
            meta.appendChild(progressSpan);
          }
        }
        
        if (meta.children.length > 0) info.appendChild(meta);
        
        // Add progress bar for media files with progress
        const itemTypeForBar = getItemType(item);
        if ((itemTypeForBar === 'video' || itemTypeForBar === 'audio') && !item.IsFolder) {
          const progress = getFileProgress(item.Id);
          if (progress && !progress.completed) {
            const progressBar = document.createElement('div');
            progressBar.className = 'w-full h-1 bg-slate-700 rounded-full mt-2 overflow-hidden';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'h-full bg-blue-500 transition-all';
            progressFill.style.width = `${progress.percentComplete}%`;
            
            progressBar.appendChild(progressFill);
            info.appendChild(progressBar);
          }
        }
        
        itemDiv.appendChild(info);
        
        // Actions
        const actions = document.createElement('div');
        actions.className = 'flex gap-1';
        
        if (item.IsFolder) {
          itemDiv.onclick = (e) => {
            if (e.target === checkbox) return;
            clearSearch();
            navigateToFolder(item.Id, [...currentPath, { id: item.Id, name: item.Name }]);
          };
        } else {
          const type = getItemType(item);
          if (type === 'video' || type === 'audio') {
            const playBtn = document.createElement('button');
            playBtn.className = 'px-3 py-1.5 min-h-[40px] bg-purple-600 hover:bg-purple-500 rounded transition-colors text-sm';
            
            // Check if there's saved progress
            const progress = getFileProgress(item.Id);
            const hasProgress = progress && !progress.completed && progress.currentTime > 5;
            
            playBtn.textContent = hasProgress ? '⏯' : '▶';
            playBtn.title = hasProgress ? `Resume from ${formatTime(progress.currentTime)}` : 'Play';
            
            playBtn.onclick = (e) => {
              e.stopPropagation();
              const resumeTime = hasProgress ? progress.currentTime : null;
              if (type === 'video') playVideo(item, false, resumeTime);
              else playAudio(item, false, resumeTime);
            };
            actions.appendChild(playBtn);
          }
          
          const downloadBtn = document.createElement('button');
          downloadBtn.className = 'px-3 py-1.5 min-h-[40px] bg-indigo-600 hover:bg-indigo-500 rounded transition-colors text-sm';
          downloadBtn.textContent = '⬇️';
          downloadBtn.onclick = (e) => {
            e.stopPropagation();
            downloadFile(item);
          };
          actions.appendChild(downloadBtn);
        }
        
        // Add download button for folders
        if (item.IsFolder) {
          const downloadFolderBtn = document.createElement('button');
          downloadFolderBtn.className = 'px-3 py-1.5 min-h-[40px] bg-indigo-600 hover:bg-indigo-500 rounded transition-colors text-sm';
          downloadFolderBtn.textContent = '📦';
          downloadFolderBtn.title = 'Download as ZIP';
          downloadFolderBtn.onclick = (e) => {
            e.stopPropagation();
            downloadFolderAsZip(item);
          };
          actions.appendChild(downloadFolderBtn);
        }
        
        itemDiv.appendChild(actions);
        fileList.appendChild(itemDiv);
      });
    }

    async function navigateToFolder(folderId, path) {
      currentPath = path;
      renderBreadcrumb();
      
      const loading = document.getElementById('loading');
      const fileListContainer = document.getElementById('file-list-container');
      const emptyState = document.getElementById('empty-state');
      
      loading.classList.remove('hidden');
      fileListContainer.classList.add('hidden');
      emptyState.classList.add('hidden');
      
      try {
        currentItems = await jellyfinClient.getItems(folderId);
        
        loading.classList.add('hidden');
        
        if (currentItems.length === 0) {
          emptyState.classList.remove('hidden');
          document.getElementById('empty-message').textContent = 'This folder is empty';
        } else {
          fileListContainer.classList.remove('hidden');
          applyFilterAndSort();
        }
      } catch (error) {
        loading.classList.add('hidden');
        emptyState.classList.remove('hidden');
        document.getElementById('empty-message').textContent = `Error: ${error.message}`;
        showToast('Error: ' + error.message);
      }
    }

    async function performSearch(query) {
      if (!query.trim() || query.length < 2) return;

      const loading = document.getElementById('loading');
      const fileListContainer = document.getElementById('file-list-container');
      const emptyState = document.getElementById('empty-state');
      const clearBtn = document.getElementById('clear-search');

      loading.classList.remove('hidden');
      fileListContainer.classList.add('hidden');
      emptyState.classList.add('hidden');
      clearBtn.classList.remove('hidden');

      try {
        const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
        currentItems = await jellyfinClient.searchItems(query, currentFolderId);
        applyFilterAndSort();

        loading.classList.add('hidden');

        if (filteredItems.length === 0) {
          emptyState.classList.remove('hidden');
          document.getElementById('empty-message').textContent = `No results for "${query}"`;
        } else {
          fileListContainer.classList.remove('hidden');
          showToast(`Found ${filteredItems.length} result(s)`);
        }
      } catch (error) {
        loading.classList.add('hidden');
        showToast('Search failed: ' + error.message);
      }
    }

    function clearSearch() {
      const searchInput = document.getElementById('search-input');
      const clearBtn = document.getElementById('clear-search');

      searchInput.value = '';
      clearBtn.classList.add('hidden');

      const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
      navigateToFolder(currentFolderId, currentPath);
    }

    function refreshCurrentFolder() {
      const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
      navigateToFolder(currentFolderId, currentPath);
      showToast('🔄 Refreshed');
    }

    async function initialize() {
      const statusDiv = document.getElementById('connection-indicator');
      
      try {
        jellyfinClient = new JellyfinClient(
          jellyfinConfig.serverUrl,
          jellyfinConfig.username,
          jellyfinConfig.password
        );
        
        await jellyfinClient.authenticate();
        
        statusDiv.innerHTML = `
          <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-green-400 font-medium">Connected</span>
        `;
        
        await navigateToFolder(null, []);

        // Search
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('clear-search');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout);
          const query = e.target.value.trim();

          if (query.length === 0) {
            clearSearch();
            return;
          }

          if (query.length < 2) return;

          searchTimeout = setTimeout(() => performSearch(query), 400);
        });

        clearBtn.addEventListener('click', clearSearch);

        // Sort buttons
        document.getElementById('sort-name').addEventListener('click', () => {
          if (currentSort.by === 'name') {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
          } else {
            currentSort.by = 'name';
            currentSort.order = 'asc';
          }
          updateSortButtons();
          applyFilterAndSort();
        });

        document.getElementById('sort-size').addEventListener('click', () => {
          if (currentSort.by === 'size') {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
          } else {
            currentSort.by = 'size';
            currentSort.order = 'asc';
          }
          updateSortButtons();
          applyFilterAndSort();
        });

        document.getElementById('sort-date').addEventListener('click', () => {
          if (currentSort.by === 'date') {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
          } else {
            currentSort.by = 'date';
            currentSort.order = 'asc';
          }
          updateSortButtons();
          applyFilterAndSort();
        });

        // Filter buttons
        document.getElementById('filter-all').addEventListener('click', () => {
          currentFilter = 'all';
          updateFilterButtons();
          applyFilterAndSort();
        });

        document.getElementById('filter-folders').addEventListener('click', () => {
          currentFilter = 'folders';
          updateFilterButtons();
          applyFilterAndSort();
        });

        document.getElementById('filter-videos').addEventListener('click', () => {
          currentFilter = 'videos';
          updateFilterButtons();
          applyFilterAndSort();
        });

        document.getElementById('filter-audio').addEventListener('click', () => {
          currentFilter = 'audio';
          updateFilterButtons();
          applyFilterAndSort();
        });

        document.getElementById('filter-images').addEventListener('click', () => {
          currentFilter = 'images';
          updateFilterButtons();
          applyFilterAndSort();
        });

        // Selection buttons
        document.getElementById('select-all-btn').addEventListener('click', selectAll);
        document.getElementById('deselect-all-btn').addEventListener('click', deselectAll);
        document.getElementById('download-selected-btn').addEventListener('click', downloadSelected);

        // Refresh
        document.getElementById('refresh-btn').addEventListener('click', refreshCurrentFolder);

        // Resume banner buttons
        document.getElementById('resume-btn').addEventListener('click', resumePlayback);
        document.getElementById('dismiss-resume-btn').addEventListener('click', () => {
          clearResumeState();
          hideResumeBanner();
          showToast('Resume state cleared');
        });

        // Show resume banner if there's saved state
        showResumeBanner();

      } catch (error) {
        statusDiv.innerHTML = `
          <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-red-400 font-medium">Connection Failed</span>
        `;
        
        const emptyState = document.getElementById('empty-state');
        const loading = document.getElementById('loading');
        loading.classList.add('hidden');
        emptyState.classList.remove('hidden');
        document.getElementById('empty-message').textContent = `Error: ${error.message}`;
        
        showToast('Connection failed: ' + error.message);
      }
    }

    window.closeMediaPlayer = closeMediaPlayer;
    window.playNext = playNext;
    window.playPrevious = playPrevious;
    window.toggleAutoplay = toggleAutoplay;

    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities,
        mapToEditPanelValues
      });
    }

    initialize();