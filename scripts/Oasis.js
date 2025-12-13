    const defaultConfig = {
      background_color: '#0f172a',
      surface_color: '#1e293b',
      text_color: '#e2e8f0',
      primary_action_color: '#8b5cf6',
      secondary_action_color: '#6366f1',
      browser_title: 'Jellyfin Browser',
      items_per_page: '50',
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
    let itemCache = new Map();
    let isSearching = false;
    let currentPage = 0;
    let totalItems = 0;
    let itemsPerPage = 50;
    let selectedItems = new Set();
    let currentSort = { by: 'name', order: 'asc' };
    let currentFilter = 'all';
    let viewMode = 'list';
    let focusedIndex = -1;
    let downloadQueue = [];

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
      browserTitle.style.fontSize = `${fontSize * 1.5}px`;
      browserTitle.style.color = textColor;
      browserTitle.textContent = config.browser_title || defaultConfig.browser_title;
      
      const newItemsPerPage = parseInt(config.items_per_page || defaultConfig.items_per_page);
      if (newItemsPerPage !== itemsPerPage && newItemsPerPage > 0) {
        itemsPerPage = newItemsPerPage;
        if (currentItems.length > 0) {
          currentPage = 0;
          applyFilterAndSort();
        }
      }
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
        ['browser_title', config.browser_title || defaultConfig.browser_title],
        ['items_per_page', config.items_per_page || defaultConfig.items_per_page]
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
        const authUrl = `${this.serverUrl}/Users/AuthenticateByName`;
        
        const response = await fetch(authUrl, {
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

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        this.accessToken = data.AccessToken;
        this.userId = data.User.Id;
        return data;
      }

      async getItems(parentId = null, startIndex = 0, limit = 100) {
        const cacheKey = `items_${parentId || 'root'}_${startIndex}_${limit}`;
        
        if (itemCache.has(cacheKey)) {
          return itemCache.get(cacheKey);
        }
        
        const params = new URLSearchParams({
          SortBy: 'IsFolder,SortName',
          SortOrder: 'Ascending',
          Recursive: 'false',
          StartIndex: startIndex.toString(),
          Limit: limit.toString(),
          Fields: 'Size,DateCreated'
        });

        if (parentId) {
          params.append('ParentId', parentId);
        }

        const url = `${this.serverUrl}/Users/${this.userId}/Items?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            'X-Emby-Token': this.accessToken
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch items');
        }

        const data = await response.json();
        const result = {
          items: data.Items || [],
          totalRecordCount: data.TotalRecordCount || 0
        };
        
        itemCache.set(cacheKey, result);
        return result;
      }

      async getItemsStream(parentId = null, onProgress) {
        const chunkSize = 100;
        const firstResult = await this.getItems(parentId, 0, chunkSize);
        const totalItems = firstResult.totalRecordCount;
        
        onProgress(firstResult.items, 0, totalItems);
        
        const totalChunks = Math.ceil(totalItems / chunkSize);
        const promises = [];
        
        for (let i = 1; i < totalChunks; i++) {
          const startIndex = i * chunkSize;
          promises.push(
            this.getItems(parentId, startIndex, chunkSize).then(result => {
              onProgress(result.items, startIndex, totalItems);
            })
          );
        }
        
        await Promise.all(promises);
      }

      async searchItems(query, parentId = null) {
        const params = new URLSearchParams({
          SearchTerm: query,
          Recursive: 'true',
          SortBy: 'IsFolder,SortName',
          SortOrder: 'Ascending',
          Limit: '500',
          Fields: 'Size,DateCreated'
        });

        if (parentId) {
          params.append('ParentId', parentId);
        }

        const url = `${this.serverUrl}/Users/${this.userId}/Items?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            'X-Emby-Token': this.accessToken
          }
        });

        if (!response.ok) {
          throw new Error('Failed to search items');
        }

        const data = await response.json();
        return data.Items;
      }

      getStreamUrl(itemId) {
        return `${this.serverUrl}/Items/${itemId}/Download?api_key=${this.accessToken}`;
      }

      getThumbnailUrl(itemId, width = 300) {
        return `${this.serverUrl}/Items/${itemId}/Images/Primary?maxWidth=${width}&quality=90&api_key=${this.accessToken}`;
      }
    }

    function showToast(message, duration = 3000) {
      const existingToast = document.querySelector('.toast');
      if (existingToast) {
        existingToast.remove();
      }

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, duration);
    }

    function getFileIcon(item) {
      if (item.IsFolder) {
        return '📁';
      }
      
      const type = item.Type;
      if (type === 'Video' || item.MediaType === 'Video') return '🎬';
      if (type === 'Audio' || item.MediaType === 'Audio') return '🎵';
      if (type === 'Photo' || item.MediaType === 'Photo') return '🖼️';
      
      return '📄';
    }

    function getItemType(item) {
      if (item.IsFolder) return 'folder';
      const type = item.Type;
      const mediaType = item.MediaType;
      if (type === 'Movie' || type === 'Episode' || type === 'Video' || mediaType === 'Video') return 'video';
      if (type === 'Audio' || mediaType === 'Audio') return 'audio';
      if (type === 'Photo' || mediaType === 'Photo') return 'image';
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
      const date = new Date(dateString);
      return date.toLocaleDateString();
    }

    function sortItems(items, sortBy, order) {
      const sorted = [...items];
      
      sorted.sort((a, b) => {
        if (a.IsFolder !== b.IsFolder) {
          return a.IsFolder ? -1 : 1;
        }
        
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
      totalItems = filteredItems.length;
      currentPage = 0;
      selectedItems.clear();
      updateSelectionToolbar();
      renderCurrentPage();
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
          btn.classList.remove('bg-slate-700/70', 'font-normal');
          btn.classList.add('bg-purple-600', 'font-medium');
          const arrow = currentSort.order === 'asc' ? '↑' : '↓';
          btn.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)} ${arrow}`;
        } else {
          btn.classList.remove('bg-purple-600', 'font-medium');
          btn.classList.add('bg-slate-700/70', 'font-normal');
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
          btn.classList.remove('bg-slate-700/70', 'font-normal');
          btn.classList.add('bg-purple-600', 'font-medium');
        } else {
          btn.classList.remove('bg-purple-600', 'font-medium');
          btn.classList.add('bg-slate-700/70', 'font-normal');
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
      renderCurrentPage();
    }

    function selectAll() {
      const start = currentPage * itemsPerPage;
      const end = Math.min(start + itemsPerPage, filteredItems.length);
      const pageItems = filteredItems.slice(start, end);
      
      pageItems.forEach(item => selectedItems.add(item.Id));
      updateSelectionToolbar();
      renderCurrentPage();
    }

    function selectAllItems() {
      filteredItems.forEach(item => selectedItems.add(item.Id));
      updateSelectionToolbar();
      renderCurrentPage();
      showToast(`✓ Selected all ${filteredItems.length} items`);
    }

    function deselectAll() {
      selectedItems.clear();
      updateSelectionToolbar();
      renderCurrentPage();
    }

    async function getFolderContents(folderId) {
      const allItems = [];
      let startIndex = 0;
      const chunkSize = 100;
      
      while (true) {
        const result = await jellyfinClient.getItems(folderId, startIndex, chunkSize);
        allItems.push(...result.items);
        
        if (allItems.length >= result.totalRecordCount) break;
        startIndex += chunkSize;
      }
      
      const files = [];
      for (const item of allItems) {
        if (item.IsFolder) {
          const subFiles = await getFolderContents(item.Id);
          files.push(...subFiles.map(f => ({ ...f, path: `${item.Name}/${f.path}` })));
        } else {
          files.push({ id: item.Id, name: item.Name, path: item.Name });
        }
      }
      
      return files;
    }

    function ensureFileExtension(filename, mimeType) {
      if (filename.includes('.')) return filename;
      
      const mimeToExt = {
        'video/mp4': '.mp4',
        'video/x-matroska': '.mkv',
        'video/webm': '.webm',
        'video/quicktime': '.mov',
        'video/x-msvideo': '.avi',
        'audio/mpeg': '.mp3',
        'audio/mp4': '.m4a',
        'audio/flac': '.flac',
        'audio/wav': '.wav',
        'audio/ogg': '.ogg',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp'
      };
      
      return filename + (mimeToExt[mimeType] || '');
    }

    async function downloadWithFileSystemAPI(items) {
      if (!window.showSaveFilePicker && !window.showDirectoryPicker) {
        showToast('⚠ File System API not supported, using fallback');
        await downloadWithFallback(items);
        return;
      }

      try {
        // Single file - no zip
        if (items.length === 1 && !items[0].isFolder) {
          const response = await fetch(jellyfinClient.getStreamUrl(items[0].id));
          const blob = await response.blob();
          const suggestedName = ensureFileExtension(items[0].name, blob.type);
          
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: suggestedName
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          showToast(`✓ Saved ${suggestedName}`);
        } 
        // Single folder - zip it
        else if (items.length === 1 && items[0].isFolder) {
          showToast('📦 Creating zip archive...');
          const zip = new JSZip();
          const files = await getFolderContents(items[0].id);
          
          for (const file of files) {
            const response = await fetch(jellyfinClient.getStreamUrl(file.id));
            const blob = await response.blob();
            const filename = ensureFileExtension(file.path, blob.type);
            zip.file(filename, blob);
          }
          
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const suggestedName = `${items[0].name}.zip`;
          
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: suggestedName,
            types: [{
              description: 'ZIP Archive',
              accept: { 'application/zip': ['.zip'] }
            }]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(zipBlob);
          await writable.close();
          
          showToast(`✓ Saved ${suggestedName} with ${files.length} files`);
        }
        // Multiple items with folders - zip everything
        else if (items.some(item => item.isFolder)) {
          showToast('📦 Creating zip archive...');
          const zip = new JSZip();
          
          for (const item of items) {
            if (item.isFolder) {
              const files = await getFolderContents(item.id);
              for (const file of files) {
                const response = await fetch(jellyfinClient.getStreamUrl(file.id));
                const blob = await response.blob();
                const filename = ensureFileExtension(`${item.name}/${file.path}`, blob.type);
                zip.file(filename, blob);
              }
            } else {
              const response = await fetch(jellyfinClient.getStreamUrl(item.id));
              const blob = await response.blob();
              const filename = ensureFileExtension(item.name, blob.type);
              zip.file(filename, blob);
            }
          }
          
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const suggestedName = 'jellyfin-download.zip';
          
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: suggestedName,
            types: [{
              description: 'ZIP Archive',
              accept: { 'application/zip': ['.zip'] }
            }]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(zipBlob);
          await writable.close();
          
          showToast(`✓ Saved ${suggestedName}`);
        }
        // Multiple files only - no zip, use directory picker
        else {
          const dirHandle = await window.showDirectoryPicker();
          
          for (const item of items) {
            const response = await fetch(jellyfinClient.getStreamUrl(item.id));
            const blob = await response.blob();
            const filename = ensureFileExtension(item.name, blob.type);
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          }
          
          showToast(`✓ Saved ${items.length} files`);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          showToast('Download cancelled');
        } else {
          showToast(`✗ Error: ${error.message}`);
        }
      }
    }

    async function downloadFilesToDirectory(dirHandle, files, folderName) {
      const folderHandle = await dirHandle.getDirectoryHandle(folderName, { create: true });
      
      for (const file of files) {
        const pathParts = file.path.split('/');
        let currentHandle = folderHandle;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: true });
        }
        
        const response = await fetch(jellyfinClient.getStreamUrl(file.id));
        const blob = await response.blob();
        const originalFilename = pathParts[pathParts.length - 1];
        const filename = ensureFileExtension(originalFilename, blob.type);
        const fileHandle = await currentHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      }
    }

    async function downloadWithFallback(items) {
      const queueDiv = document.getElementById('download-queue');
      queueDiv.classList.remove('hidden');

      for (const item of items) {
        const queueItem = {
          id: item.id,
          name: item.name,
          status: 'pending',
          progress: 0
        };
        
        downloadQueue.push(queueItem);
        renderDownloadQueue();
        
        try {
          queueItem.status = 'downloading';
          renderDownloadQueue();
          
          const downloadUrl = jellyfinClient.getStreamUrl(item.id);
          const response = await fetch(downloadUrl);
          
          if (!response.ok) throw new Error('Download failed');
          
          const blob = await response.blob();
          const filename = ensureFileExtension(item.name, blob.type);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
          
          queueItem.status = 'completed';
          queueItem.progress = 100;
          renderDownloadQueue();
          
        } catch (error) {
          queueItem.status = 'error';
          queueItem.error = error.message;
          renderDownloadQueue();
        }
      }
    }

    async function downloadSelected() {
      const itemsToDownload = filteredItems.filter(item => selectedItems.has(item.Id));
      
      if (itemsToDownload.length === 0) {
        showToast('No items selected');
        return;
      }

      const items = itemsToDownload.map(item => ({
        id: item.Id,
        name: item.Name,
        isFolder: item.IsFolder
      }));

      await downloadWithFileSystemAPI(items);
      
      selectedItems.clear();
      updateSelectionToolbar();
      renderCurrentPage();
    }

    async function shareSelected() {
      if (!navigator.share) {
        showToast('⚠ Web Share API not supported on this device');
        return;
      }

      const itemsToShare = filteredItems.filter(item => selectedItems.has(item.Id) && !item.IsFolder);
      
      if (itemsToShare.length === 0) {
        showToast('No files selected (folders cannot be shared)');
        return;
      }

      try {
        const files = [];
        
        for (const item of itemsToShare) {
          const response = await fetch(jellyfinClient.getStreamUrl(item.Id));
          const blob = await response.blob();
          const file = new File([blob], item.Name, { type: blob.type });
          files.push(file);
        }

        await navigator.share({
          files: files,
          title: `Sharing ${files.length} file${files.length > 1 ? 's' : ''}`,
          text: `${files.length} file${files.length > 1 ? 's' : ''} from Jellyfin`
        });

        showToast(`✓ Shared ${files.length} file${files.length > 1 ? 's' : ''}`);
        selectedItems.clear();
        updateSelectionToolbar();
        renderCurrentPage();
        
      } catch (error) {
        if (error.name === 'AbortError') {
          showToast('Share cancelled');
        } else {
          showToast(`✗ Share failed: ${error.message}`);
        }
      }
    }

    function renderDownloadQueue() {
      const queueList = document.getElementById('queue-list');
      queueList.innerHTML = '';
      
      downloadQueue.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'download-queue-item';
        
        let statusIcon = '⏳';
        let statusColor = 'text-yellow-400';
        
        if (item.status === 'downloading') {
          statusIcon = '⬇';
          statusColor = 'text-blue-400';
        } else if (item.status === 'completed') {
          statusIcon = '✓';
          statusColor = 'text-green-400';
        } else if (item.status === 'error') {
          statusIcon = '✗';
          statusColor = 'text-red-400';
        }
        
        itemDiv.innerHTML = `
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="${statusColor}">${statusIcon}</span>
              <span class="text-sm truncate">${item.name}</span>
            </div>
            <span class="text-xs text-purple-400">${item.status}</span>
          </div>
          ${item.status === 'downloading' ? `
            <div class="w-full bg-slate-700 rounded-full h-1 mt-2">
              <div class="progress-bar-fill" style="width: ${item.progress}%"></div>
            </div>
          ` : ''}
          ${item.error ? `<div class="text-xs text-red-400 mt-1">${item.error}</div>` : ''}
        `;
        
        queueList.appendChild(itemDiv);
      });
    }

    function clearCompletedDownloads() {
      downloadQueue = downloadQueue.filter(item => item.status !== 'completed');
      renderDownloadQueue();
      
      if (downloadQueue.length === 0) {
        document.getElementById('download-queue').classList.add('hidden');
      }
    }

    function renderBreadcrumb() {
      const breadcrumb = document.getElementById('breadcrumb');
      breadcrumb.innerHTML = '';
      
      const homeBtn = document.createElement('button');
      homeBtn.className = 'breadcrumb-btn bg-purple-600/40 hover:bg-purple-600/60';
      homeBtn.textContent = '🏠';
      homeBtn.onclick = () => navigateToFolder(null, []);
      breadcrumb.appendChild(homeBtn);
      
      currentPath.forEach((item, index) => {
        const separator = document.createElement('span');
        separator.className = 'text-purple-400 px-1';
        separator.textContent = '/';
        breadcrumb.appendChild(separator);
        
        const btn = document.createElement('button');
        btn.className = 'breadcrumb-btn bg-purple-600/40 hover:bg-purple-600/60 truncate max-w-xs';
        btn.textContent = item.name;
        btn.onclick = () => {
          const newPath = currentPath.slice(0, index + 1);
          navigateToFolder(item.id, newPath);
        };
        breadcrumb.appendChild(btn);
      });
    }

    function closeMediaPlayer() {
      const player = document.getElementById('media-player');
      player.innerHTML = '';
      player.classList.add('hidden');
    }

    function playVideo(item) {
      const player = document.getElementById('media-player');
      const streamUrl = jellyfinClient.getStreamUrl(item.Id);
      
      player.innerHTML = `
        <div class="video-player-container rounded-lg overflow-hidden">
          <div class="flex justify-between items-center p-3 bg-black/70">
            <h3 class="text-lg font-semibold truncate">${item.Name}</h3>
            <button onclick="closeMediaPlayer()" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors">
              ✕
            </button>
          </div>
          <video controls autoplay class="w-full" style="max-height: 500px;">
            <source src="${streamUrl}" type="video/mp4">
            Your browser does not support video playback.
          </video>
        </div>
      `;
      
      player.classList.remove('hidden');
      player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function playAudio(item) {
      const player = document.getElementById('media-player');
      const streamUrl = jellyfinClient.getStreamUrl(item.Id);
      
      player.innerHTML = `
        <div class="audio-player-container rounded-lg overflow-hidden p-4">
          <div class="flex justify-between items-center mb-3">
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-bold truncate">${item.Name}</h3>
              ${item.Album ? `<p class="text-sm text-purple-200 truncate">${item.Album}</p>` : ''}
            </div>
            <button onclick="closeMediaPlayer()" class="ml-3 px-3 py-1 bg-purple-700 hover:bg-purple-600 rounded text-sm transition-colors flex-shrink-0">
              ✕
            </button>
          </div>
          <audio controls autoplay class="w-full">
            <source src="${streamUrl}">
            Your browser does not support audio playback.
          </audio>
        </div>
      `;
      
      player.classList.remove('hidden');
      player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function downloadFile(item) {
      const downloadUrl = jellyfinClient.getStreamUrl(item.Id);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = item.Name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      showToast(`⬇ Downloading ${item.Name}...`);
    }

    function renderPagination() {
      const paginationDiv = document.getElementById('pagination');
      const paginationInfo = document.getElementById('pagination-info');
      const paginationControls = document.getElementById('pagination-controls');
      
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      
      if (totalPages <= 1) {
        paginationDiv.classList.add('hidden');
        return;
      }
      
      paginationDiv.classList.remove('hidden');
      
      const start = currentPage * itemsPerPage + 1;
      const end = Math.min((currentPage + 1) * itemsPerPage, totalItems);
      paginationInfo.textContent = `${start}-${end} of ${totalItems}`;
      
      paginationControls.innerHTML = '';
      
      const prevBtn = document.createElement('button');
      prevBtn.className = 'pagination-btn px-3 py-1 bg-slate-800/70 border border-purple-500/30 rounded hover:bg-slate-700/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
      prevBtn.textContent = '←';
      prevBtn.disabled = currentPage === 0;
      prevBtn.onclick = () => goToPage(currentPage - 1);
      paginationControls.appendChild(prevBtn);
      
      const maxButtons = 7;
      let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
      let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);
      
      if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(0, endPage - maxButtons + 1);
      }
      
      if (startPage > 0) {
        const firstBtn = document.createElement('button');
        firstBtn.className = 'pagination-btn px-3 py-1 bg-slate-800/70 border border-purple-500/30 rounded hover:bg-slate-700/70 transition-colors';
        firstBtn.textContent = '1';
        firstBtn.onclick = () => goToPage(0);
        paginationControls.appendChild(firstBtn);
        
        if (startPage > 1) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'px-2 text-purple-400';
          ellipsis.textContent = '...';
          paginationControls.appendChild(ellipsis);
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn px-3 py-1 rounded transition-colors ${
          i === currentPage 
            ? 'bg-purple-600 text-white' 
            : 'bg-slate-800/70 border border-purple-500/30 hover:bg-slate-700/70'
        }`;
        pageBtn.textContent = i + 1;
        pageBtn.onclick = () => goToPage(i);
        paginationControls.appendChild(pageBtn);
      }
      
      if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'px-2 text-purple-400';
          ellipsis.textContent = '...';
          paginationControls.appendChild(ellipsis);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.className = 'pagination-btn px-3 py-1 bg-slate-800/70 border border-purple-500/30 rounded hover:bg-slate-700/70 transition-colors';
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => goToPage(totalPages - 1);
        paginationControls.appendChild(lastBtn);
      }
      
      const nextBtn = document.createElement('button');
      nextBtn.className = 'pagination-btn px-3 py-1 bg-slate-800/70 border border-purple-500/30 rounded hover:bg-slate-700/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
      nextBtn.textContent = '→';
      nextBtn.disabled = currentPage === totalPages - 1;
      nextBtn.onclick = () => goToPage(currentPage + 1);
      paginationControls.appendChild(nextBtn);
    }

    function goToPage(page) {
      currentPage = page;
      focusedIndex = -1;
      renderCurrentPage();
      document.getElementById('file-browser').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderCurrentPage() {
      const start = currentPage * itemsPerPage;
      const end = Math.min(start + itemsPerPage, filteredItems.length);
      const pageItems = filteredItems.slice(start, end);
      
      renderFileList(pageItems);
      renderPagination();
    }

    function renderFileList(items) {
      const fileList = document.getElementById('file-list');
      const browser = document.getElementById('file-browser');
      
      if (viewMode === 'grid') {
        browser.classList.add('grid-view');
      } else {
        browser.classList.remove('grid-view');
      }
      
      fileList.innerHTML = '';
      
      items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `file-item flex items-center gap-3 p-4 hover:bg-slate-700/30 ${
          selectedItems.has(item.Id) ? 'selected' : ''
        } ${focusedIndex === index ? 'focused' : ''}`;
        itemDiv.setAttribute('data-item-id', item.Id);
        itemDiv.setAttribute('data-index', index);
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedItems.has(item.Id);
        checkbox.className = 'w-5 h-5 rounded border-purple-500 text-purple-600 focus:ring-purple-500 cursor-pointer flex-shrink-0';
        checkbox.onclick = (e) => {
          e.stopPropagation();
          toggleItemSelection(item.Id);
        };
        itemDiv.appendChild(checkbox);
        
        // Thumbnail or icon
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'flex-shrink-0';
        
        if (item.ImageTags && item.ImageTags.Primary && (getItemType(item) === 'video' || getItemType(item) === 'image')) {
          const img = document.createElement('img');
          img.src = jellyfinClient.getThumbnailUrl(item.Id);
          img.className = 'thumbnail';
          img.alt = item.Name;
          img.onerror = function() {
            this.style.display = 'none';
            const icon = document.createElement('span');
            icon.className = 'text-3xl';
            icon.textContent = getFileIcon(item);
            this.parentNode.appendChild(icon);
          };
          mediaContainer.appendChild(img);
        } else {
          const iconSpan = document.createElement('span');
          iconSpan.className = 'text-3xl leading-none';
          iconSpan.textContent = getFileIcon(item);
          mediaContainer.appendChild(iconSpan);
        }
        
        itemDiv.appendChild(mediaContainer);
        
        const info = document.createElement('div');
        info.className = 'flex-1 min-w-0 file-item-info';
        
        const name = document.createElement('div');
        name.className = 'font-medium truncate text-base leading-snug';
        name.textContent = item.Name;
        info.appendChild(name);
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'text-xs text-purple-400/80 flex gap-2 mt-1';
        
        if (!item.IsFolder && item.Size) {
          const sizeSpan = document.createElement('span');
          sizeSpan.textContent = formatFileSize(item.Size);
          metaDiv.appendChild(sizeSpan);
        }
        
        if (item.DateCreated) {
          const dateSpan = document.createElement('span');
          dateSpan.textContent = formatDate(item.DateCreated);
          metaDiv.appendChild(dateSpan);
        }
        
        if (metaDiv.children.length > 0) {
          info.appendChild(metaDiv);
        }
        
        itemDiv.appendChild(info);
        
        const actions = document.createElement('div');
        actions.className = 'flex gap-1 flex-shrink-0';
        
        if (item.IsFolder) {
          itemDiv.onclick = (e) => {
            if (e.target === checkbox) return;
            clearSearch();
            navigateToFolder(item.Id, [...currentPath, { id: item.Id, name: item.Name }]);
          };
          itemDiv.style.cursor = 'pointer';
        } else {
          if (item.Type === 'Video' || item.MediaType === 'Video') {
            const playBtn = document.createElement('button');
            playBtn.className = 'action-btn bg-purple-600 hover:bg-purple-500 rounded transition-colors text-sm';
            playBtn.innerHTML = '▶';
            playBtn.title = 'Play';
            playBtn.onclick = (e) => {
              e.stopPropagation();
              playVideo(item);
            };
            actions.appendChild(playBtn);
          }
          
          if (item.Type === 'Audio' || item.MediaType === 'Audio') {
            const playBtn = document.createElement('button');
            playBtn.className = 'action-btn bg-purple-600 hover:bg-purple-500 rounded transition-colors text-sm';
            playBtn.innerHTML = '♪';
            playBtn.title = 'Play';
            playBtn.onclick = (e) => {
              e.stopPropagation();
              playAudio(item);
            };
            actions.appendChild(playBtn);
          }
          
          const downloadBtn = document.createElement('button');
          downloadBtn.className = 'action-btn bg-indigo-600 hover:bg-indigo-500 rounded transition-colors text-sm';
          downloadBtn.innerHTML = '⬇';
          downloadBtn.title = 'Download';
          downloadBtn.onclick = (e) => {
            e.stopPropagation();
            downloadFile(item);
          };
          actions.appendChild(downloadBtn);
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
      const statusBar = document.getElementById('status-bar');
      const statusText = document.getElementById('status-text');
      const loadingProgress = document.getElementById('loading-progress');
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');
      
      loading.classList.remove('hidden');
      fileListContainer.classList.add('hidden');
      emptyState.classList.add('hidden');
      statusBar.classList.add('hidden');
      loadingProgress.classList.add('hidden');
      
      currentItems = [];
      filteredItems = [];
      totalItems = 0;
      currentPage = 0;
      selectedItems.clear();
      updateSelectionToolbar();
      
      try {
        let loadedCount = 0;
        
        await jellyfinClient.getItemsStream(folderId, (items, startIndex, total) => {
          if (loadedCount === 0) {
            currentItems = items;
            totalItems = total;
            
            loading.classList.add('hidden');
            
            if (totalItems === 0) {
              emptyState.classList.remove('hidden');
              document.getElementById('empty-message').textContent = 'This folder is empty';
              return;
            }
            
            fileListContainer.classList.remove('hidden');
            statusBar.classList.remove('hidden');
            
            if (totalItems > itemsPerPage) {
              loadingProgress.classList.remove('hidden');
            }
            
            applyFilterAndSort();
          } else {
            currentItems.splice(startIndex, items.length, ...items);
            applyFilterAndSort();
          }
          
          loadedCount += items.length;
          const percentage = Math.round((loadedCount / totalItems) * 100);
          
          statusText.textContent = `📂 ${loadedCount.toLocaleString()} / ${totalItems.toLocaleString()} items loaded`;
          progressBar.style.width = `${percentage}%`;
          progressText.textContent = `${percentage}%`;
          
          if (loadedCount >= totalItems) {
            setTimeout(() => {
              loadingProgress.classList.add('hidden');
              statusText.textContent = `📂 ${totalItems.toLocaleString()} items`;
            }, 1000);
          }
        });
        
      } catch (error) {
        loading.classList.add('hidden');
        statusBar.classList.remove('hidden');
        loadingProgress.classList.add('hidden');
        statusText.textContent = '✗ Error: ' + error.message;
        showToast('✗ Error loading: ' + error.message);
      }
    }

    async function performSearch(query) {
      if (!query.trim() || query.length < 2) {
        return;
      }

      isSearching = true;
      const loading = document.getElementById('loading');
      const fileListContainer = document.getElementById('file-list-container');
      const emptyState = document.getElementById('empty-state');
      const statusBar = document.getElementById('status-bar');
      const clearBtn = document.getElementById('clear-search');

      loading.classList.remove('hidden');
      fileListContainer.classList.add('hidden');
      emptyState.classList.add('hidden');
      clearBtn.classList.remove('hidden');
      statusBar.classList.remove('hidden');
      const statusText = document.getElementById('status-text');
      const loadingProgress = document.getElementById('loading-progress');
      loadingProgress.classList.add('hidden');
      statusText.textContent = `🔍 Searching for "${query}"...`;

      try {
        const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
        const results = await jellyfinClient.searchItems(query, currentFolderId);
        currentItems = results;
        selectedItems.clear();
        updateSelectionToolbar();
        applyFilterAndSort();

        loading.classList.add('hidden');
        statusText.textContent = `🔍 Found ${totalItems.toLocaleString()} result${totalItems !== 1 ? 's' : ''} for "${query}"`;

        if (totalItems === 0) {
          emptyState.classList.remove('hidden');
          document.getElementById('empty-message').textContent = `No results for "${query}"`;
        } else {
          fileListContainer.classList.remove('hidden');
        }
      } catch (error) {
        loading.classList.add('hidden');
        statusText.textContent = `✗ Search failed: ${error.message}`;
        showToast('✗ Search failed: ' + error.message);
      }
    }

    function clearSearch() {
      const searchInput = document.getElementById('search-input');
      const statusBar = document.getElementById('status-bar');
      const clearBtn = document.getElementById('clear-search');
      const loadingProgress = document.getElementById('loading-progress');

      searchInput.value = '';
      statusBar.classList.add('hidden');
      clearBtn.classList.add('hidden');
      loadingProgress.classList.add('hidden');
      isSearching = false;

      const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
      navigateToFolder(currentFolderId, currentPath);
    }

    function refreshCurrentFolder() {
      const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
      itemCache.clear();
      navigateToFolder(currentFolderId, currentPath);
      showToast('🔄 Refreshed');
    }

    function setupKeyboardNavigation() {
      document.addEventListener('keydown', (e) => {
        const start = currentPage * itemsPerPage;
        const end = Math.min(start + itemsPerPage, filteredItems.length);
        const pageItems = filteredItems.slice(start, end);
        
        if (pageItems.length === 0) return;
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          focusedIndex = Math.min(focusedIndex + 1, pageItems.length - 1);
          renderCurrentPage();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          focusedIndex = Math.max(focusedIndex - 1, 0);
          renderCurrentPage();
        } else if (e.key === 'Enter' && focusedIndex >= 0) {
          e.preventDefault();
          const item = pageItems[focusedIndex];
          if (item.IsFolder) {
            clearSearch();
            navigateToFolder(item.Id, [...currentPath, { id: item.Id, name: item.Name }]);
          } else if (item.Type === 'Video') {
            playVideo(item);
          } else if (item.Type === 'Audio') {
            playAudio(item);
          }
        } else if (e.key === ' ' && focusedIndex >= 0) {
          e.preventDefault();
          const item = pageItems[focusedIndex];
          toggleItemSelection(item.Id);
        } else if (e.key === 'Escape') {
          if (selectedItems.size > 0) {
            deselectAll();
          } else {
            clearSearch();
          }
        }
      });
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

          searchTimeout = setTimeout(() => {
            performSearch(query);
          }, 400);
        });

        clearBtn.addEventListener('click', clearSearch);

        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            clearSearch();
          }
        });

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
        document.getElementById('select-all-items-btn').addEventListener('click', selectAllItems);
        document.getElementById('deselect-all-btn').addEventListener('click', deselectAll);
        document.getElementById('download-selected-btn').addEventListener('click', downloadSelected);
        document.getElementById('share-selected-btn').addEventListener('click', shareSelected);

        // View toggle
        document.getElementById('view-toggle-btn').addEventListener('click', () => {
          viewMode = viewMode === 'list' ? 'grid' : 'list';
          document.getElementById('view-toggle-btn').textContent = viewMode === 'list' ? '☷' : '▦';
          renderCurrentPage();
        });

        // Refresh
        document.getElementById('refresh-btn').addEventListener('click', refreshCurrentFolder);

        // Download queue
        document.getElementById('clear-queue-btn').addEventListener('click', clearCompletedDownloads);

        // Keyboard navigation
        setupKeyboardNavigation();

      } catch (error) {
        statusDiv.innerHTML = `
          <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-red-400 font-medium">Connection Failed</span>
        `;
        showToast('✗ Connection failed: ' + error.message, 5000);
      }
    }

    window.closeMediaPlayer = closeMediaPlayer;

    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities,
        mapToEditPanelValues
      });
    }

    initialize();
