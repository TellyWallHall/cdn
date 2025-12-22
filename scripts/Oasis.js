
    const defaultConfig = {
      app_title: 'The Oasis',
      welcome_message: 'Welcome to the Oasis',
      login_button_text: 'Enter the Oasis'
    };

    const config = window.elementSdk?.config || defaultConfig;

    async function onConfigChange(newConfig) {
      const appTitle = newConfig.app_title || defaultConfig.app_title;
      const welcomeMessage = newConfig.welcome_message || defaultConfig.welcome_message;
      const loginButtonText = newConfig.login_button_text || defaultConfig.login_button_text;

      document.getElementById('appTitle').textContent = appTitle;
      document.getElementById('headerTitle').textContent = appTitle;
      document.getElementById('welcomeMessage').textContent = welcomeMessage;
      document.getElementById('loginButton').textContent = loginButtonText;
    }

    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities: (config) => ({
          recolorables: [],
          borderables: [],
          fontEditable: undefined,
          fontSizeable: undefined
        }),
        mapToEditPanelValues: (config) => new Map([
          ['app_title', config.app_title || defaultConfig.app_title],
          ['welcome_message', config.welcome_message || defaultConfig.welcome_message],
          ['login_button_text', config.login_button_text || defaultConfig.login_button_text]
        ])
      });
    }

    onConfigChange(config);

    const SERVER_URL = 'https://jelly.oasis-archive.org';
    
    class JellyfinClient {
      constructor() {
        this.token = localStorage.getItem('jellyfin_token');
        this.userId = localStorage.getItem('jellyfin_userId');
        this.currentPath = [];
        this.favorites = JSON.parse(localStorage.getItem('jellyfin_favorites') || '[]');
        this.playbackState = JSON.parse(localStorage.getItem('jellyfin_playback') || '{}');
        this.history = JSON.parse(localStorage.getItem('jellyfin_history') || '[]');
        this.queue = [];
        this.allItems = [];
        this.loadQueue();
      }

      async authenticate(username, password) {
        const response = await fetch(`${SERVER_URL}/Users/AuthenticateByName`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': 'MediaBrowser Client="OasisPlayer", Device="WebBrowser", DeviceId="' + this.getDeviceId() + '", Version="1.0.0"'
          },
          body: JSON.stringify({
            Username: username,
            Pw: password
          })
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        this.token = data.AccessToken;
        this.userId = data.User.Id;
        
        localStorage.setItem('jellyfin_token', this.token);
        localStorage.setItem('jellyfin_userId', this.userId);
        
        return data;
      }

      getDeviceId() {
        let deviceId = localStorage.getItem('jellyfin_deviceId');
        if (!deviceId) {
          deviceId = 'web_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('jellyfin_deviceId', deviceId);
        }
        return deviceId;
      }

      getHeaders() {
        return {
          'X-Emby-Authorization': `MediaBrowser Client="OasisPlayer", Device="WebBrowser", DeviceId="${this.getDeviceId()}", Version="1.0.0", Token="${this.token}"`
        };
      }

      async getItems(parentId = null) {
        const url = parentId 
          ? `${SERVER_URL}/Users/${this.userId}/Items?ParentId=${parentId}&SortBy=IsFolder,SortName&SortOrder=Ascending`
          : `${SERVER_URL}/Users/${this.userId}/Views`;
        
        const response = await fetch(url, { headers: this.getHeaders() });
        const data = await response.json();
        return data.Items || [];
      }

      async recursiveSearch(query) {
        const response = await fetch(
          `${SERVER_URL}/Users/${this.userId}/Items?searchTerm=${encodeURIComponent(query)}&Recursive=true&Limit=50`,
          { headers: this.getHeaders() }
        );
        const data = await response.json();
        return data.Items || [];
      }

      async getItem(itemId) {
        const response = await fetch(`${SERVER_URL}/Users/${this.userId}/Items/${itemId}`, {
          headers: this.getHeaders()
        });
        return await response.json();
      }

      getStreamUrl(itemId) {
        return `${SERVER_URL}/Items/${itemId}/Download?api_key=${this.token}`;
      }

      getVideoStreamUrl(itemId) {
        return `${SERVER_URL}/Videos/${itemId}/stream?static=true&api_key=${this.token}`;
      }

      async downloadItem(item) {
        try {
          const extension = this.getFileExtension(item);
          const filename = item.Name + extension;
          
          if ('showSaveFilePicker' in window) {
            // Get file handle first (requires user gesture)
            const handle = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [{
                description: 'Media File',
                accept: { 'application/octet-stream': [extension] }
              }]
            });
            
            // Now fetch and write the file
            const streamUrl = this.getStreamUrl(item.Id);
            const response = await fetch(streamUrl, { headers: this.getHeaders() });
            const blob = await response.blob();
            
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return true;
          } else {
            // Fallback for browsers without File System Access API
            const streamUrl = this.getStreamUrl(item.Id);
            const response = await fetch(streamUrl, { headers: this.getHeaders() });
            const blob = await response.blob();
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            return true;
          }
        } catch (error) {
          throw error;
        }
      }

      async downloadFolder(item) {
        try {
          const folderName = item.Name + '.zip';
          
          if (!('showSaveFilePicker' in window)) {
            throw new Error('Folder download requires a modern browser');
          }
          
          // Get file handle first (requires user gesture)
          const handle = await window.showSaveFilePicker({
            suggestedName: folderName,
            types: [{
              description: 'ZIP Archive',
              accept: { 'application/zip': ['.zip'] }
            }]
          });
          
          // Create zip using JSZip
          const JSZip = window.JSZip;
          if (!JSZip) {
            throw new Error('ZIP library not loaded');
          }
          
          const zip = new JSZip();
          
          // Recursively add items to zip
          await this.addFolderToZip(zip, item.Id, '');
          
          // Generate zip blob
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          
          // Write to file handle
          const writable = await handle.createWritable();
          await writable.write(zipBlob);
          await writable.close();
          
          return true;
        } catch (error) {
          throw error;
        }
      }

      async addFolderToZip(zip, folderId, pathPrefix) {
        try {
          const items = await this.getItems(folderId);
          
          for (const item of items) {
            if (item.IsFolder) {
              // Recursively add nested folders
              const newPath = pathPrefix ? `${pathPrefix}/${item.Name}` : item.Name;
              await this.addFolderToZip(zip, item.Id, newPath);
            } else if (item.MediaType === 'Video' || item.MediaType === 'Audio' || item.Type === 'Video' || item.Type === 'Audio') {
              // Add media file to zip
              try {
                const streamUrl = this.getStreamUrl(item.Id);
                const response = await fetch(streamUrl, { headers: this.getHeaders() });
                
                if (!response.ok) {
                  console.warn(`Failed to fetch ${item.Name}: ${response.status}`);
                  continue;
                }
                
                const blob = await response.blob();
                const extension = this.getFileExtension(item);
                const fileName = item.Name + extension;
                const filePath = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;
                zip.file(filePath, blob, { binary: true });
              } catch (error) {
                console.warn(`Error adding ${item.Name} to zip:`, error);
                // Continue with other files even if one fails
              }
            }
          }
        } catch (error) {
          console.error(`Error processing folder ${folderId}:`, error);
          throw error;
        }
      }

      getFileExtension(item) {
        if (item.Path) {
          const match = item.Path.match(/\.([^.]+)$/);
          if (match) return '.' + match[1];
        }
        
        if (item.Type === 'Audio') return '.mp3';
        if (item.Type === 'Video') return '.mp4';
        if (item.MediaType === 'Audio') return '.mp3';
        if (item.MediaType === 'Video') return '.mp4';
        
        return '';
      }

      toggleFavorite(itemId) {
        const index = this.favorites.indexOf(itemId);
        if (index > -1) {
          this.favorites.splice(index, 1);
        } else {
          this.favorites.push(itemId);
        }
        localStorage.setItem('jellyfin_favorites', JSON.stringify(this.favorites));
      }

      isFavorite(itemId) {
        return this.favorites.includes(itemId);
      }

      addToHistory(item) {
        const historyItem = {
          id: item.Id,
          name: item.Name,
          type: item.Type || item.MediaType,
          timestamp: Date.now()
        };
        
        this.history = this.history.filter(h => h.id !== item.Id);
        this.history.unshift(historyItem);
        this.history = this.history.slice(0, 50);
        
        localStorage.setItem('jellyfin_history', JSON.stringify(this.history));
      }

      getHistory() {
        return this.history;
      }

      clearHistory() {
        this.history = [];
        localStorage.setItem('jellyfin_history', JSON.stringify(this.history));
      }

      addToQueue(item) {
        if (!this.queue.find(q => q.Id === item.Id)) {
          this.queue.push(item);
          this.saveQueue();
        }
      }

      removeFromQueue(itemId) {
        this.queue = this.queue.filter(q => q.Id !== itemId);
        this.saveQueue();
      }

      clearQueue() {
        this.queue = [];
        this.saveQueue();
      }

      getQueue() {
        return this.queue;
      }

      saveQueue() {
        localStorage.setItem('jellyfin_queue', JSON.stringify(this.queue));
      }

      loadQueue() {
        const saved = localStorage.getItem('jellyfin_queue');
        if (saved) {
          try {
            this.queue = JSON.parse(saved);
          } catch (e) {
            this.queue = [];
          }
        }
      }

      getNextInQueue(currentId) {
        const currentIndex = this.queue.findIndex(q => q.Id === currentId);
        if (currentIndex >= 0 && currentIndex < this.queue.length - 1) {
          return this.queue[currentIndex + 1];
        }
        return null;
      }

      getPrevInQueue(currentId) {
        const currentIndex = this.queue.findIndex(q => q.Id === currentId);
        if (currentIndex > 0) {
          return this.queue[currentIndex - 1];
        }
        return null;
      }

      savePlaybackState(itemId, position) {
        this.playbackState = { itemId, position, timestamp: Date.now() };
        localStorage.setItem('jellyfin_playback', JSON.stringify(this.playbackState));
      }

      getPlaybackState() {
        return this.playbackState;
      }
    }

    class UIController {
      constructor(client) {
        this.client = client;
        this.currentItems = [];
        this.currentMedia = null;
        this.isPlaying = false;
        this.currentView = 'list';
        this.currentSort = 'name';
        this.searchTimeout = null;
        
        this.initElements();
        this.attachEventListeners();
      }

      initElements() {
        this.loginScreen = document.getElementById('loginScreen');
        this.mainApp = document.getElementById('mainApp');
        this.loginForm = document.getElementById('loginForm');
        this.errorMessage = document.getElementById('errorMessage');
        this.fileList = document.getElementById('fileList');
        this.breadcrumbs = document.getElementById('breadcrumbs');
        this.mediaPlayer = document.getElementById('mediaPlayer');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.audioPlayerUI = document.getElementById('audioPlayerUI');
        this.miniPlayer = document.getElementById('miniPlayer');
        this.queuePanel = document.getElementById('queuePanel');
        this.loading = document.getElementById('loading');
        this.toast = document.getElementById('toast');
        this.emptyState = document.getElementById('emptyState');
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
      }

      attachEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshCurrentView());
        document.getElementById('closePlayer').addEventListener('click', () => this.closePlayer());
        document.getElementById('minimizePlayer').addEventListener('click', () => this.minimizePlayer());
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('prevBtn').addEventListener('click', () => this.playPrevious());
        document.getElementById('nextBtn').addEventListener('click', () => this.playNext());
        
        document.getElementById('miniPlayPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('miniPrevBtn').addEventListener('click', () => this.playPrevious());
        document.getElementById('miniNextBtn').addEventListener('click', () => this.playNext());
        document.getElementById('expandPlayerBtn').addEventListener('click', () => this.expandPlayer());
        document.getElementById('miniPlayerInfo').addEventListener('click', () => this.expandPlayer());
        
        document.getElementById('queueBtn').addEventListener('click', () => this.toggleQueue());
        document.getElementById('closeQueue').addEventListener('click', () => this.toggleQueue());
        document.getElementById('clearQueue').addEventListener('click', () => this.clearQueue());
        document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());
        document.getElementById('favoritesBtn').addEventListener('click', () => this.showFavorites());
        
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.searchInput.addEventListener('blur', () => {
          setTimeout(() => this.searchResults.classList.add('hidden'), 200);
        });
        
        document.querySelectorAll('.view-btn').forEach(btn => {
          btn.addEventListener('click', (e) => this.changeView(e.currentTarget.dataset.view));
        });
        
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
          btn.addEventListener('click', (e) => this.changeSort(e.currentTarget.dataset.sort));
        });
        
        const progressBar = document.getElementById('progressBar');
        progressBar.addEventListener('click', (e) => this.seekMedia(e));
        
        const miniProgressBar = document.getElementById('miniProgressBar');
        miniProgressBar.addEventListener('click', (e) => this.seekMedia(e, true));
        
        this.videoPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.videoPlayer.addEventListener('ended', () => this.handleMediaEnded());
        this.audioPlayer.addEventListener('ended', () => this.handleMediaEnded());
        
        this.videoPlayer.addEventListener('play', () => {
          this.isPlaying = true;
          this.updatePlayPauseButton();
        });
        this.videoPlayer.addEventListener('pause', () => {
          this.isPlaying = false;
          this.updatePlayPauseButton();
        });
        this.audioPlayer.addEventListener('play', () => {
          this.isPlaying = true;
          this.updatePlayPauseButton();
        });
        this.audioPlayer.addEventListener('pause', () => {
          this.isPlaying = false;
          this.updatePlayPauseButton();
        });
      }

      async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        this.showLoading();
        this.hideError();

        try {
          await this.client.authenticate(username, password);
          
          if (rememberMe) {
            localStorage.setItem('jellyfin_remember', 'true');
          } else {
            localStorage.removeItem('jellyfin_remember');
          }

          this.showMainApp();
          await this.loadRootItems();
        } catch (error) {
          this.showError('Login failed. Please check your credentials.');
        } finally {
          this.hideLoading();
        }
      }

      handleLogout() {
        localStorage.removeItem('jellyfin_token');
        localStorage.removeItem('jellyfin_userId');
        localStorage.removeItem('jellyfin_remember');
        this.client.token = null;
        this.client.userId = null;
        this.showLoginScreen();
      }

      showMainApp() {
        this.loginScreen.style.display = 'none';
        this.mainApp.classList.add('active');
      }

      showLoginScreen() {
        this.mainApp.classList.remove('active');
        this.loginScreen.style.display = 'flex';
        document.getElementById('password').value = '';
      }

      async loadRootItems() {
        this.showLoading();
        try {
          this.client.currentPath = [];
          const items = await this.client.getItems();
          this.currentItems = items;
          this.renderItems(items);
          this.renderBreadcrumbs();
        } catch (error) {
          this.showToast('Failed to load items');
        } finally {
          this.hideLoading();
        }
      }

      async loadItems(parentId, parentName) {
        this.showLoading();
        try {
          const items = await this.client.getItems(parentId);
          this.currentItems = items;
          this.client.currentPath.push({ id: parentId, name: parentName });
          this.renderItems(items);
          this.renderBreadcrumbs();
        } catch (error) {
          this.showToast('Failed to load items');
        } finally {
          this.hideLoading();
        }
      }

      async navigateToPath(index) {
        if (index === -1) {
          await this.loadRootItems();
        } else {
          this.client.currentPath = this.client.currentPath.slice(0, index + 1);
          const parent = this.client.currentPath[index];
          this.showLoading();
          try {
            const items = await this.client.getItems(parent.id);
            this.currentItems = items;
            this.renderItems(items);
            this.renderBreadcrumbs();
          } catch (error) {
            this.showToast('Failed to load items');
          } finally {
            this.hideLoading();
          }
        }
      }

      renderBreadcrumbs() {
        this.breadcrumbs.innerHTML = '';
        
        const home = document.createElement('span');
        home.className = 'breadcrumb';
        home.textContent = 'Home';
        home.onclick = () => this.navigateToPath(-1);
        this.breadcrumbs.appendChild(home);

        this.client.currentPath.forEach((path, index) => {
          const crumb = document.createElement('span');
          crumb.className = 'breadcrumb';
          crumb.textContent = path.name;
          crumb.onclick = () => this.navigateToPath(index);
          this.breadcrumbs.appendChild(crumb);
        });
      }

      changeView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        if (view === 'grid') {
          this.fileList.classList.add('grid-view');
        } else {
          this.fileList.classList.remove('grid-view');
        }
      }

      changeSort(sort) {
        this.currentSort = sort;
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.sort === sort);
        });
        
        this.sortItems();
        this.renderItems(this.currentItems);
      }

      sortItems() {
        switch(this.currentSort) {
          case 'name':
            this.currentItems.sort((a, b) => {
              if (a.IsFolder !== b.IsFolder) return b.IsFolder ? 1 : -1;
              return a.Name.localeCompare(b.Name);
            });
            break;
          case 'date':
            this.currentItems.sort((a, b) => {
              if (a.IsFolder !== b.IsFolder) return b.IsFolder ? 1 : -1;
              return new Date(b.DateCreated) - new Date(a.DateCreated);
            });
            break;
          case 'size':
            this.currentItems.sort((a, b) => {
              if (a.IsFolder !== b.IsFolder) return b.IsFolder ? 1 : -1;
              return (b.Size || 0) - (a.Size || 0);
            });
            break;
          case 'type':
            this.currentItems.sort((a, b) => {
              if (a.IsFolder !== b.IsFolder) return b.IsFolder ? 1 : -1;
              return (a.Type || '').localeCompare(b.Type || '');
            });
            break;
        }
      }

      async handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.length < 2) {
          this.searchResults.classList.add('hidden');
          return;
        }

        this.searchTimeout = setTimeout(async () => {
          try {
            const results = await this.client.recursiveSearch(query);
            this.renderSearchResults(results);
          } catch (error) {
            this.showToast('Search failed');
          }
        }, 300);
      }

      stopAllMedia() {
        this.videoPlayer.pause();
        this.audioPlayer.pause();
        this.videoPlayer.currentTime = 0;
        this.audioPlayer.currentTime = 0;
      }

      renderSearchResults(results) {
        this.searchResults.innerHTML = '';
        
        if (results.length === 0) {
          this.searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
          this.searchResults.classList.remove('hidden');
          return;
        }

        results.forEach(item => {
          const div = document.createElement('div');
          div.className = 'search-result-item';
          
          const icon = this.getItemIcon(item);
          div.innerHTML = `
            <div class="search-result-icon">
              <i class="${icon.icon}"></i>
            </div>
            <div class="search-result-info">
              <div class="search-result-name">${item.Name}</div>
              <div class="search-result-path">${item.Path || item.Type}</div>
            </div>
          `;
          
          div.addEventListener('click', () => {
            this.searchResults.classList.add('hidden');
            this.searchInput.value = '';
            
            if (item.Type === 'Folder' || item.IsFolder) {
              this.loadItems(item.Id, item.Name);
            } else if (item.MediaType === 'Video' || item.Type === 'Video') {
              this.playVideo(item);
            } else if (item.MediaType === 'Audio' || item.Type === 'Audio') {
              this.playAudio(item);
            }
          });
          
          this.searchResults.appendChild(div);
        });
        
        this.searchResults.classList.remove('hidden');
      }

      renderItems(items) {
        this.fileList.innerHTML = '';
        
        if (items.length === 0) {
          this.emptyState.classList.remove('hidden');
          return;
        }
        
        this.emptyState.classList.add('hidden');

        items.forEach(item => {
          const fileItem = this.createFileItem(item);
          this.fileList.appendChild(fileItem);
        });
      }

      createFileItem(item) {
        const div = document.createElement('div');
        div.className = 'file-item';

        const icon = this.getItemIcon(item);
        div.innerHTML = `
          <div class="file-icon ${icon.class}">
            <i class="${icon.icon}"></i>
          </div>
          <div class="file-info">
            <div class="file-name">${item.Name}</div>
            <div class="file-meta">${this.getItemMeta(item)}</div>
          </div>
          <div class="file-actions">
            <button class="file-menu-btn" title="Actions">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="file-menu">
              ${item.Type !== 'Folder' && (item.MediaType === 'Audio' || item.Type === 'Audio' || item.MediaType === 'Video' || item.Type === 'Video') ? `
                <div class="file-menu-item queue-add">
                  <i class="fas fa-plus"></i>
                  <span>Add to Queue</span>
                </div>
              ` : ''}
              <div class="file-menu-item favorite ${this.client.isFavorite(item.Id) ? 'active' : ''}">
                <i class="fas fa-star"></i>
                <span>${this.client.isFavorite(item.Id) ? 'Remove from Favorites' : 'Add to Favorites'}</span>
              </div>
              <div class="file-menu-item download">
                <i class="fas fa-download"></i>
                <span>Download${item.Type === 'Folder' ? ' as ZIP' : ''}</span>
              </div>
              ${item.Type !== 'Folder' ? `
                <div class="file-menu-item share">
                  <i class="fas fa-share-alt"></i>
                  <span>Share</span>
                </div>
              ` : ''}
            </div>
          </div>
        `;

        div.querySelector('.file-info').addEventListener('click', () => {
          if (item.Type === 'Folder' || item.IsFolder) {
            this.loadItems(item.Id, item.Name);
          } else if (item.MediaType === 'Video' || item.Type === 'Video') {
            this.playVideo(item);
          } else if (item.MediaType === 'Audio' || item.Type === 'Audio') {
            this.playAudio(item);
          }
        });

        const menuBtn = div.querySelector('.file-menu-btn');
        const menu = div.querySelector('.file-menu');
        
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.file-menu.active').forEach(m => {
            if (m !== menu) m.classList.remove('active');
          });
          menu.classList.toggle('active');
        });

        const queueBtn = div.querySelector('.queue-add');
        if (queueBtn) {
          queueBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addToQueue(item);
            menu.classList.remove('active');
          });
        }

        const favoriteBtn = div.querySelector('.favorite');
        favoriteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFavorite(item.Id, favoriteBtn);
          menu.classList.remove('active');
        });

        const downloadBtn = div.querySelector('.download');
        downloadBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          menu.classList.remove('active');
          await this.downloadFile(item);
        });

        const shareBtn = div.querySelector('.share');
        if (shareBtn) {
          shareBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            menu.classList.remove('active');
            await this.shareFile(item);
          });
        }

        document.addEventListener('click', (e) => {
          if (!div.contains(e.target)) {
            menu.classList.remove('active');
          }
        });

        return div;
      }

      getItemIcon(item) {
        if (item.Type === 'Folder' || item.IsFolder) {
          return { icon: 'fas fa-folder', class: 'folder' };
        }
        if (item.MediaType === 'Video' || item.Type === 'Video') {
          return { icon: 'fas fa-film', class: 'video' };
        }
        if (item.MediaType === 'Audio' || item.Type === 'Audio') {
          return { icon: 'fas fa-music', class: 'audio' };
        }
        return { icon: 'fas fa-file', class: '' };
      }

      getItemMeta(item) {
        if (item.Type === 'Folder') {
          return `${item.ChildCount || 0} items`;
        }
        const parts = [];
        if (item.RunTimeTicks) {
          const minutes = Math.floor(item.RunTimeTicks / 600000000);
          parts.push(`${minutes} min`);
        }
        if (item.Size) {
          parts.push(this.formatFileSize(item.Size));
        }
        return parts.join(' • ');
      }

      formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1073741824).toFixed(1) + ' GB';
      }

      addToQueue(item) {
        this.client.addToQueue(item);
        this.showToast('Added to queue');
        this.renderQueue();
      }

      toggleFavorite(itemId, btn) {
        this.client.toggleFavorite(itemId);
        const isFavorite = this.client.isFavorite(itemId);
        btn.classList.toggle('active', isFavorite);
        const span = btn.querySelector('span');
        if (span) {
          span.textContent = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
        }
        this.showToast(isFavorite ? 'Added to favorites' : 'Removed from favorites');
      }

      async downloadFile(item) {
        try {
          if (item.Type === 'Folder' || item.IsFolder) {
            // Show loading after user picks save location
            await this.client.downloadFolder(item);
            this.showToast('Folder downloaded');
          } else {
            await this.client.downloadItem(item);
            this.showToast('Download complete');
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            this.showToast('Download cancelled');
          } else {
            this.showToast('Download failed: ' + error.message);
          }
        }
      }

      async shareFile(item) {
        if (navigator.share) {
          try {
            this.showLoading();
            
            // Fetch the file as a blob
            const streamUrl = this.client.getStreamUrl(item.Id);
            const response = await fetch(streamUrl, { headers: this.client.getHeaders() });
            const blob = await response.blob();
            
            // Create a File object from the blob
            const extension = this.client.getFileExtension(item);
            const filename = item.Name + extension;
            const file = new File([blob], filename, { type: blob.type });
            
            // Share the file
            await navigator.share({
              title: item.Name,
              text: `Check out ${item.Name}`,
              files: [file]
            });
            
            this.hideLoading();
          } catch (error) {
            this.hideLoading();
            if (error.name === 'AbortError') {
              this.showToast('Share cancelled');
            } else {
              this.showToast('Share failed');
            }
          }
        } else {
          this.showToast('Sharing not supported on this device');
        }
      }

      playVideo(item) {
        this.stopAllMedia();
        
        this.client.addToHistory(item);
        this.client.addToQueue(item);
        
        this.currentMedia = item;
        this.miniPlayer.classList.add('active');
        this.mainApp.classList.add('with-mini-player');
        
        document.getElementById('miniPlayerTitle').textContent = item.Name;
        document.getElementById('miniPlayerMeta').textContent = item.Type || 'Video';
        
        this.videoPlayer.src = this.client.getVideoStreamUrl(item.Id);
        this.audioPlayer.src = '';
        
        const playbackState = this.client.getPlaybackState();
        if (playbackState.itemId === item.Id) {
          this.videoPlayer.currentTime = playbackState.position || 0;
        }
        
        this.videoPlayer.play().then(() => {
          this.isPlaying = true;
          this.updatePlayPauseButton();
        }).catch(error => {
          console.error('Play error:', error);
          this.isPlaying = false;
          this.updatePlayPauseButton();
        });
        
        this.updatePlayerUI();
        this.renderQueue();
      }

      playAudio(item) {
        this.stopAllMedia();
        
        this.client.addToHistory(item);
        this.client.addToQueue(item);
        
        this.currentMedia = item;
        this.miniPlayer.classList.add('active');
        this.mainApp.classList.add('with-mini-player');
        
        document.getElementById('miniPlayerTitle').textContent = item.Name;
        document.getElementById('miniPlayerMeta').textContent = item.Album || 'Unknown Album';
        
        this.audioPlayer.src = this.client.getStreamUrl(item.Id);
        this.videoPlayer.src = '';
        
        const playbackState = this.client.getPlaybackState();
        if (playbackState.itemId === item.Id) {
          this.audioPlayer.currentTime = playbackState.position || 0;
        }
        
        this.audioPlayer.play().then(() => {
          this.isPlaying = true;
          this.updatePlayPauseButton();
        }).catch(error => {
          console.error('Play error:', error);
          this.isPlaying = false;
          this.updatePlayPauseButton();
        });
        
        this.updatePlayerUI();
        this.renderQueue();
      }

      expandPlayer() {
        if (!this.currentMedia) return;
        
        this.updatePlayerUI();
        this.mediaPlayer.classList.add('active');
      }

      updatePlayerUI() {
        if (!this.currentMedia) return;
        
        const isVideo = (this.currentMedia.MediaType === 'Video' || this.currentMedia.Type === 'Video');
        
        if (isVideo) {
          this.videoPlayer.classList.remove('hidden');
          this.audioPlayerUI.classList.add('hidden');
          document.getElementById('playerTitle').textContent = this.currentMedia.Name;
        } else {
          this.videoPlayer.classList.add('hidden');
          this.audioPlayerUI.classList.remove('hidden');
          document.getElementById('playerTitle').textContent = this.currentMedia.Name;
          document.getElementById('audioTitle').textContent = this.currentMedia.Name;
          document.getElementById('audioMeta').textContent = this.currentMedia.Album || 'Unknown Album';
        }
      }

      minimizePlayer() {
        this.mediaPlayer.classList.remove('active');
      }

      closePlayer() {
        this.stopAllMedia();
        
        this.mediaPlayer.classList.remove('active');
        this.miniPlayer.classList.remove('active');
        this.mainApp.classList.remove('with-mini-player');
        
        if (this.currentMedia) {
          const player = this.videoPlayer.src ? this.videoPlayer : this.audioPlayer;
          this.client.savePlaybackState(this.currentMedia.Id, player.currentTime);
        }
        
        this.videoPlayer.src = '';
        this.audioPlayer.src = '';
        this.currentMedia = null;
        this.isPlaying = false;
        this.updatePlayPauseButton();
      }

      togglePlayPause() {
        if (!this.currentMedia) return;
        
        const isVideo = (this.currentMedia.MediaType === 'Video' || this.currentMedia.Type === 'Video');
        const player = isVideo ? this.videoPlayer : this.audioPlayer;
        
        if (this.isPlaying) {
          player.pause();
          this.isPlaying = false;
        } else {
          player.play().then(() => {
            this.isPlaying = true;
          }).catch(error => {
            console.error('Play error:', error);
            this.isPlaying = false;
          });
        }
        this.updatePlayPauseButton();
      }

      playNext() {
        if (!this.currentMedia) return;
        
        const next = this.client.getNextInQueue(this.currentMedia.Id);
        if (next) {
          if (next.MediaType === 'Video' || next.Type === 'Video') {
            this.playVideo(next);
          } else {
            this.playAudio(next);
          }
        } else {
          this.showToast('End of queue');
        }
      }

      playPrevious() {
        if (!this.currentMedia) return;
        
        const prev = this.client.getPrevInQueue(this.currentMedia.Id);
        if (prev) {
          if (prev.MediaType === 'Video' || prev.Type === 'Video') {
            this.playVideo(prev);
          } else {
            this.playAudio(prev);
          }
        } else {
          this.showToast('Start of queue');
        }
      }

      updatePlayPauseButton() {
        const icon = document.querySelector('#playPauseBtn i');
        const miniIcon = document.querySelector('#miniPlayPauseBtn i');
        
        if (icon) icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        if (miniIcon) miniIcon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
      }

      updateMiniPlayer() {
        if (this.currentMedia) {
          document.getElementById('miniPlayerTitle').textContent = this.currentMedia.Name;
          document.getElementById('miniPlayerMeta').textContent = this.currentMedia.Album || this.currentMedia.Type;
        }
      }

      seekMedia(e, isMini = false) {
        if (!this.currentMedia) return;
        
        const isVideo = (this.currentMedia.MediaType === 'Video' || this.currentMedia.Type === 'Video');
        const player = isVideo ? this.videoPlayer : this.audioPlayer;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        player.currentTime = player.duration * percent;
      }

      updateProgress() {
        const isVideo = this.currentMedia && (this.currentMedia.MediaType === 'Video' || this.currentMedia.Type === 'Video');
        const player = isVideo ? this.videoPlayer : this.audioPlayer;
        
        if (!player.duration || isNaN(player.duration)) return;
        
        const percent = (player.currentTime / player.duration) * 100;
        
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('miniProgressFill').style.width = percent + '%';
      }

      handleMediaEnded() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        
        if (this.currentMedia) {
          this.playNext();
        }
      }

      toggleQueue() {
        this.queuePanel.classList.toggle('active');
        if (this.queuePanel.classList.contains('active')) {
          this.renderQueue();
        }
      }

      clearQueue() {
        this.client.clearQueue();
        this.renderQueue();
        this.showToast('Queue cleared');
      }

      renderQueue() {
        const queueContent = document.getElementById('queueContent');
        const queue = this.client.getQueue();
        
        if (queue.length === 0) {
          queueContent.innerHTML = `
            <div class="queue-empty">
              <i class="fas fa-music"></i>
              <p>Queue is empty</p>
            </div>
          `;
          return;
        }

        queueContent.innerHTML = '';
        
        queue.forEach(item => {
          const div = document.createElement('div');
          div.className = 'queue-item';
          
          if (this.currentMedia && item.Id === this.currentMedia.Id) {
            div.classList.add('active');
          }
          
          const icon = this.getItemIcon(item);
          div.innerHTML = `
            <div class="queue-item-icon">
              <i class="${icon.icon}"></i>
            </div>
            <div class="queue-item-info">
              <div class="queue-item-name">${item.Name}</div>
              <div class="queue-item-meta">${item.Album || item.Type || 'Media'}</div>
            </div>
            <button class="queue-item-remove">
              <i class="fas fa-times"></i>
            </button>
          `;
          
          div.querySelector('.queue-item-info').addEventListener('click', () => {
            if (item.MediaType === 'Video' || item.Type === 'Video') {
              this.playVideo(item);
            } else {
              this.playAudio(item);
            }
            this.queuePanel.classList.remove('active');
          });
          
          div.querySelector('.queue-item-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            this.client.removeFromQueue(item.Id);
            this.renderQueue();
            this.showToast('Removed from queue');
          });
          
          queueContent.appendChild(div);
        });
      }

      showHistory() {
        const history = this.client.getHistory();
        
        if (history.length === 0) {
          this.showToast('No history yet');
          return;
        }

        this.fileList.innerHTML = '';
        this.emptyState.classList.add('hidden');
        document.getElementById('sectionTitle').textContent = 'History';
        
        history.forEach(historyItem => {
          const div = document.createElement('div');
          div.className = 'file-item';
          
          const icon = historyItem.type === 'Video' ? 'fas fa-film' : 
                       historyItem.type === 'Audio' ? 'fas fa-music' : 'fas fa-file';
          const iconClass = historyItem.type === 'Video' ? 'video' : 
                           historyItem.type === 'Audio' ? 'audio' : '';
          
          const date = new Date(historyItem.timestamp);
          const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
          
          div.innerHTML = `
            <div class="file-icon ${iconClass}">
              <i class="${icon}"></i>
            </div>
            <div class="file-info">
              <div class="file-name">${historyItem.name}</div>
              <div class="file-meta">${timeStr}</div>
            </div>
          `;
          
          div.addEventListener('click', async () => {
            try {
              const item = await this.client.getItem(historyItem.id);
              if (historyItem.type === 'Video') {
                this.playVideo(item);
              } else if (historyItem.type === 'Audio') {
                this.playAudio(item);
              }
            } catch (error) {
              this.showToast('Failed to load item');
            }
          });
          
          this.fileList.appendChild(div);
        });
      }

      async showFavorites() {
        const favorites = this.client.favorites;
        
        if (favorites.length === 0) {
          this.showToast('No favorites yet');
          return;
        }

        this.showLoading();
        this.fileList.innerHTML = '';
        this.emptyState.classList.add('hidden');
        document.getElementById('sectionTitle').textContent = 'Favorites';
        
        try {
          for (const favId of favorites) {
            try {
              const item = await this.client.getItem(favId);
              const fileItem = this.createFileItem(item);
              this.fileList.appendChild(fileItem);
            } catch (error) {
              console.warn(`Failed to load favorite item ${favId}`);
            }
          }
          
          if (this.fileList.children.length === 0) {
            this.emptyState.classList.remove('hidden');
          }
        } catch (error) {
          this.showToast('Failed to load favorites');
        } finally {
          this.hideLoading();
        }
      }

      async refreshCurrentView() {
        if (this.client.currentPath.length === 0) {
          await this.loadRootItems();
        } else {
          const current = this.client.currentPath[this.client.currentPath.length - 1];
          this.showLoading();
          try {
            const items = await this.client.getItems(current.id);
            this.currentItems = items;
            this.renderItems(items);
          } catch (error) {
            this.showToast('Failed to refresh');
          } finally {
            this.hideLoading();
          }
        }
      }

      showLoading() {
        this.loading.classList.add('active');
      }

      hideLoading() {
        this.loading.classList.remove('active');
      }

      showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
      }

      hideError() {
        this.errorMessage.classList.add('hidden');
      }

      showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.add('active');
        setTimeout(() => {
          this.toast.classList.remove('active');
        }, 3000);
      }
    }

    const client = new JellyfinClient();
    const ui = new UIController(client);

    if (localStorage.getItem('jellyfin_remember') === 'true' && client.token) {
      ui.showMainApp();
      ui.loadRootItems();
    }

