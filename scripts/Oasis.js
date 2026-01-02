
    const HTML_VERSION = document.getElementById('htmlVersion')?.textContent || '1.0';
    
    const OASIS_CDN_VERSION = '1.3';
    
    const UPDATE_DOWNLOAD_URL = 'https://drive.google.com/file/d/1ejfYZE-lFhDAdxC5ow9IoDfe3LQ0Xcxz/view?usp=drivesdk';
    
    // Check if CDN version is available and compare
    function checkVersionMismatch() {
      if (OASIS_CDN_VERSION && OASIS_CDN_VERSION !== HTML_VERSION) {
        return true;
      }
      return false;
    }
    
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
        this.settings = this.loadSettings();
        this.loadQueue();
      }

      loadSettings() {
        const defaults = {
          autoOpenEnabled: false,
          autoOpenUrl: '',
          autoPlayNext: true,
          resumePlayback: true,
          defaultView: 'list',
          defaultSort: 'name',
          saveQueue: true,
          loopQueue: false,
          shuffle: false,
          showThumbnails: true,
          compactMode: false,
          maxHistoryItems: 50,
          autoMinimizePlayer: false,
          keyboardShortcuts: true,
          showFileSize: true,
          confirmDelete: true,
          playbackSpeed: 1.0,
          skipDuration: 10,
          volumeLevel: 1.0,
          muteOnStart: false,
          rememberVolume: true,
          autoSkipIntro: false,
          autoSkipCredits: false,
          pipEnabled: false,
          continuousPlay: true,
          volumeStep: 5,
          autoAddSimilar: false,
          clearQueueOnExit: false,
          queueLimit: 0,
          showDuration: true,
          showBreadcrumbs: true,
          animations: true,
          darkMode: true,
          progressOnThumbnails: true,
          itemsPerPage: 50,
          doubleClick: false,
          autoScroll: true,
          rememberFolder: true,
          showHidden: false,
          searchDelay: 300,
          hwAcceleration: true,
          preloadNext: true,
          bgDownload: true,
          cacheMetadata: true,
          networkTimeout: 30,
          bufferSize: 10,
          maxDownloads: 3,
          debugMode: false,
          notifications: true,
          trackChangeNotify: true,
          downloadNotify: true,
          notificationDuration: 3,
          showFolderItemCount: true,
          showFileExtensions: true,
          highlightCurrentlyPlaying: true
        };
        const saved = localStorage.getItem('jellyfin_settings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
      }

      saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        localStorage.setItem('jellyfin_settings', JSON.stringify(this.settings));
      }

      getSettings() {
        return this.settings;
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
          ? `${SERVER_URL}/Users/${this.userId}/Items?ParentId=${parentId}&SortBy=IsFolder,SortName&SortOrder=Ascending&Fields=ChildCount`
          : `${SERVER_URL}/Users/${this.userId}/Views?Fields=ChildCount`;
        
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
            const handle = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [{
                description: 'Media File',
                accept: { 'application/octet-stream': [extension] }
              }]
            });
            
            const streamUrl = this.getStreamUrl(item.Id);
            const response = await fetch(streamUrl, { headers: this.getHeaders() });
            const blob = await response.blob();
            
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return true;
          } else {
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

      async downloadFolder(item, onProgress) {
        try {
          const folderName = item.Name + '.zip';
          
          if (!('showSaveFilePicker' in window)) {
            throw new Error('Folder download requires a modern browser');
          }
          
          const handle = await window.showSaveFilePicker({
            suggestedName: folderName,
            types: [{
              description: 'ZIP Archive',
              accept: { 'application/zip': ['.zip'] }
            }]
          });
          
          if (onProgress) onProgress('Creating ZIP archive...');
          
          const JSZip = window.JSZip;
          if (!JSZip) {
            throw new Error('ZIP library not loaded');
          }
          
          const zip = new JSZip();
          
          await this.addFolderToZip(zip, item.Id, '', onProgress);
          
          if (onProgress) onProgress('Finalizing ZIP file...');
          const zipBlob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });
          
          if (onProgress) onProgress('Saving file...');
          const writable = await handle.createWritable();
          await writable.write(zipBlob);
          await writable.close();
          
          return true;
        } catch (error) {
          throw error;
        }
      }

      async addFolderToZip(zip, folderId, pathPrefix, onProgress) {
        try {
          const items = await this.getItems(folderId);
          
          if (onProgress) onProgress(`Processing folder... (${items.length} items)`);
          
          for (const item of items) {
            if (item.IsFolder) {
              const newPath = pathPrefix ? `${pathPrefix}/${item.Name}` : item.Name;
              await this.addFolderToZip(zip, item.Id, newPath, onProgress);
            } else if (item.MediaType === 'Video' || item.MediaType === 'Audio' || item.Type === 'Video' || item.Type === 'Audio') {
              try {
                if (onProgress) onProgress(`Adding ${item.Name}...`);
                
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

      clearFavorites() {
        this.favorites = [];
        localStorage.setItem('jellyfin_favorites', JSON.stringify(this.favorites));
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
        
        const maxItems = this.settings.maxHistoryItems || 50;
        this.history = this.history.slice(0, maxItems);
        
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
        if (this.settings.saveQueue) {
          localStorage.setItem('jellyfin_queue', JSON.stringify(this.queue));
        }
      }

      loadQueue() {
        if (this.settings.saveQueue) {
          const saved = localStorage.getItem('jellyfin_queue');
          if (saved) {
            try {
              this.queue = JSON.parse(saved);
            } catch (e) {
              this.queue = [];
            }
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
        this.settingsPanel = document.getElementById('settingsPanel');
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
        
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.toggleSettings());
        
        document.getElementById('autoOpenToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'autoOpenEnabled'));
        document.getElementById('autoPlayToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'autoPlayNext'));
        document.getElementById('resumePlaybackToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'resumePlayback'));
        document.getElementById('loopQueueToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'loopQueue'));
        document.getElementById('shuffleToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'shuffle'));
        document.getElementById('saveQueueToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'saveQueue'));
        document.getElementById('showThumbnailsToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'showThumbnails'));
        document.getElementById('compactModeToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'compactMode'));
        document.getElementById('autoMinimizeToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'autoMinimizePlayer'));
        document.getElementById('keyboardShortcutsToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'keyboardShortcuts'));
        document.getElementById('showFileSizeToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'showFileSize'));
        document.getElementById('confirmDeleteToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'confirmDelete'));
        document.getElementById('muteOnStartToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'muteOnStart'));
        document.getElementById('rememberVolumeToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'rememberVolume'));
        document.getElementById('autoSkipIntroToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'autoSkipIntro'));
        document.getElementById('autoSkipCreditsToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'autoSkipCredits'));
        document.getElementById('pipToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'pipEnabled'));
        document.getElementById('continuousPlayToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'continuousPlay'));
        document.getElementById('autoAddSimilarToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'autoAddSimilar'));
        document.getElementById('clearQueueOnExitToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'clearQueueOnExit'));
        document.getElementById('showDurationToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'showDuration'));
        document.getElementById('showBreadcrumbsToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'showBreadcrumbs'));
        document.getElementById('animationsToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'animations'));
        document.getElementById('darkModeToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'darkMode'));
        document.getElementById('progressOnThumbToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'progressOnThumbnails'));
        document.getElementById('doubleClickToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'doubleClick'));
        document.getElementById('autoScrollToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'autoScroll'));
        document.getElementById('rememberFolderToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'rememberFolder'));
        document.getElementById('showHiddenToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'showHidden'));
        document.getElementById('hwAccelToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'hwAcceleration'));
        document.getElementById('preloadToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'preloadNext'));
        document.getElementById('bgDownloadToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'bgDownload'));
        document.getElementById('cacheMetadataToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'cacheMetadata'));
        document.getElementById('debugModeToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'debugMode'));
        document.getElementById('notificationsToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'notifications'));
        document.getElementById('trackChangeNotifyToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'trackChangeNotify'));
        document.getElementById('downloadNotifyToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'downloadNotify'));
        document.getElementById('showFolderItemCountToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'showFolderItemCount'));
        document.getElementById('showFileExtensionsToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'showFileExtensions'));
        document.getElementById('highlightCurrentlyPlayingToggle').addEventListener('click', (e) => this.toggleSetting(e.currentTarget, 'highlightCurrentlyPlaying'));
        
        document.getElementById('autoOpenUrl').addEventListener('input', (e) => {
          this.client.saveSettings({ autoOpenUrl: e.target.value });
        });
        
        document.getElementById('playbackSpeedInput').addEventListener('input', (e) => {
          const speed = parseFloat(e.target.value);
          this.client.saveSettings({ playbackSpeed: speed });
          this.applyPlaybackSpeed(speed);
        });
        
        document.getElementById('skipDurationInput').addEventListener('input', (e) => {
          this.client.saveSettings({ skipDuration: parseInt(e.target.value) });
        });
        
        document.getElementById('volumeLevelInput').addEventListener('input', (e) => {
          const volume = parseFloat(e.target.value);
          this.client.saveSettings({ volumeLevel: volume });
          document.getElementById('volumeDisplay').textContent = Math.round(volume * 100) + '%';
          this.applyVolume(volume);
        });
        
        document.getElementById('volumeStepInput').addEventListener('input', (e) => {
          this.client.saveSettings({ volumeStep: parseInt(e.target.value) });
        });
        
        document.getElementById('queueLimitInput').addEventListener('input', (e) => {
          this.client.saveSettings({ queueLimit: parseInt(e.target.value) });
        });
        
        document.getElementById('itemsPerPageInput').addEventListener('input', (e) => {
          this.client.saveSettings({ itemsPerPage: parseInt(e.target.value) });
        });
        
        document.getElementById('maxHistoryInput').addEventListener('input', (e) => {
          this.client.saveSettings({ maxHistoryItems: parseInt(e.target.value) });
        });
        
        document.getElementById('searchDelayInput').addEventListener('input', (e) => {
          this.client.saveSettings({ searchDelay: parseInt(e.target.value) });
        });
        
        document.getElementById('networkTimeoutInput').addEventListener('input', (e) => {
          this.client.saveSettings({ networkTimeout: parseInt(e.target.value) });
        });
        
        document.getElementById('bufferSizeInput').addEventListener('input', (e) => {
          this.client.saveSettings({ bufferSize: parseInt(e.target.value) });
        });
        
        document.getElementById('maxDownloadsInput').addEventListener('input', (e) => {
          this.client.saveSettings({ maxDownloads: parseInt(e.target.value) });
        });
        
        document.getElementById('notificationDurationInput').addEventListener('input', (e) => {
          this.client.saveSettings({ notificationDuration: parseInt(e.target.value) });
        });
        
        document.getElementById('defaultViewSelect').addEventListener('change', (e) => {
          this.client.saveSettings({ defaultView: e.target.value });
          this.changeView(e.target.value);
        });
        
        document.getElementById('defaultSortSelect').addEventListener('change', (e) => {
          this.client.saveSettings({ defaultSort: e.target.value });
          this.changeSort(e.target.value);
        });
        
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.confirmClearHistory());
        document.getElementById('clearFavoritesBtn').addEventListener('click', () => this.confirmClearFavorites());
        document.getElementById('clearAllDataBtn').addEventListener('click', () => this.confirmClearAllData());
        
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
        this.videoPlayer.addEventListener('timeupdate', () => this.handleAutoSkip());
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
        
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
      }

      handleKeyboard(e) {
        const settings = this.client.getSettings();
        if (!settings.keyboardShortcuts) return;
        
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
          case ' ':
            e.preventDefault();
            this.togglePlayPause();
            break;
          case 'ArrowRight':
            e.preventDefault();
            this.skipForward();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            this.skipBackward();
            break;
          case 'ArrowUp':
            e.preventDefault();
            this.adjustVolume(1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            this.adjustVolume(-1);
            break;
          case 'n':
          case 'N':
            this.playNext();
            break;
          case 'p':
          case 'P':
            this.playPrevious();
            break;
          case 'm':
          case 'M':
            const player = this.videoPlayer.src ? this.videoPlayer : this.audioPlayer;
            player.muted = !player.muted;
            this.showToast(player.muted ? 'Muted' : 'Unmuted');
            break;
          case 'f':
          case 'F':
            if (this.videoPlayer.src && document.fullscreenEnabled) {
              if (!document.fullscreenElement) {
                this.videoPlayer.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }
            break;
        }
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
        const settings = this.client.getSettings();
        
        if (settings.clearQueueOnExit) {
          this.client.clearQueue();
        }
        
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
          
          const settings = this.client.getSettings();
          this.changeView(settings.defaultView);
          this.currentSort = settings.defaultSort;
          this.changeSort(settings.defaultSort);
          
          this.renderItems(items);
          this.renderBreadcrumbs();
          
          this.handleAutoOpen();
        } catch (error) {
          this.showToast('Failed to load items');
        } finally {
          this.hideLoading();
        }
      }

      handleAutoOpen() {
        const settings = this.client.getSettings();
        
        if (settings.autoOpenEnabled && settings.autoOpenUrl) {
          try {
            const url = settings.autoOpenUrl.trim();
            if (url) {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          } catch (error) {
            console.error('Failed to auto-open URL:', error);
          }
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
        const settings = this.client.getSettings();
        
        if (!settings.showBreadcrumbs) {
          this.breadcrumbs.style.display = 'none';
          return;
        }
        
        this.breadcrumbs.style.display = 'block';
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

        const settings = this.client.getSettings();
        const delay = settings.searchDelay || 300;

        this.searchTimeout = setTimeout(async () => {
          try {
            const results = await this.client.recursiveSearch(query);
            this.renderSearchResults(results);
          } catch (error) {
            this.showToast('Search failed');
          }
        }, delay);
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
        
        const settings = this.client.getSettings();
        
        let filteredItems = items;
        if (!settings.showHidden) {
          filteredItems = items.filter(item => !item.Name.startsWith('.'));
        }
        
        if (filteredItems.length === 0) {
          this.emptyState.classList.remove('hidden');
          return;
        }
        
        this.emptyState.classList.add('hidden');

        filteredItems.forEach(item => {
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
        const settings = this.client.getSettings();
        
        if (item.Type === 'Folder') {
          if (settings.showFolderItemCount) {
            const count = item.ChildCount || 0;
            return `${count} item${count !== 1 ? 's' : ''}`;
          }
          return 'Folder';
        }
        const parts = [];
        if (settings.showDuration && item.RunTimeTicks) {
          const minutes = Math.floor(item.RunTimeTicks / 600000000);
          parts.push(`${minutes} min`);
        }
        if (settings.showFileSize && item.Size) {
          parts.push(this.formatFileSize(item.Size));
        }
        return parts.join(' • ') || item.Type || 'File';
      }

      formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1073741824).toFixed(1) + ' GB';
      }

      addToQueue(item) {
        const settings = this.client.getSettings();
        const queue = this.client.getQueue();
        
        if (settings.queueLimit > 0 && queue.length >= settings.queueLimit) {
          this.showToast(`Queue limit reached (${settings.queueLimit} items)`);
          return;
        }
        
        this.client.addToQueue(item);
        
        if (settings.notifications) {
          this.showToast('Added to queue');
        }
        
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
            this.showLoadingWithMessage('Preparing download...');
            await this.client.downloadFolder(item, (message) => {
              this.showLoadingWithMessage(message);
            });
            this.hideLoading();
            
            const settings = this.client.getSettings();
            if (settings.notifications && settings.downloadNotify) {
              this.showToast('Folder downloaded');
            }
          } else {
            await this.client.downloadItem(item);
            
            const settings = this.client.getSettings();
            if (settings.notifications && settings.downloadNotify) {
              this.showToast('Download complete');
            }
          }
        } catch (error) {
          this.hideLoading();
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
            
            const streamUrl = this.client.getStreamUrl(item.Id);
            const response = await fetch(streamUrl, { headers: this.client.getHeaders() });
            const blob = await response.blob();
            
            const extension = this.client.getFileExtension(item);
            const filename = item.Name + extension;
            const file = new File([blob], filename, { type: blob.type });
            
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
        
        const settings = this.client.getSettings();
        
        this.videoPlayer.playbackRate = settings.playbackSpeed;
        this.videoPlayer.volume = settings.volumeLevel;
        this.videoPlayer.muted = settings.muteOnStart;
        
        if (settings.resumePlayback) {
          const playbackState = this.client.getPlaybackState();
          if (playbackState.itemId === item.Id) {
            this.videoPlayer.currentTime = playbackState.position || 0;
          }
        }
        
        this.videoPlayer.play().then(() => {
          this.isPlaying = true;
          this.updatePlayPauseButton();
          
          if (settings.autoMinimizePlayer) {
            this.minimizePlayer();
          }
          
          if (settings.pipEnabled && document.pictureInPictureEnabled) {
            this.videoPlayer.requestPictureInPicture().catch(() => {});
          }
          
          if (settings.notifications && settings.trackChangeNotify) {
            this.showToast('Now playing: ' + item.Name);
          }
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
        
        const settings = this.client.getSettings();
        
        this.audioPlayer.playbackRate = settings.playbackSpeed;
        this.audioPlayer.volume = settings.volumeLevel;
        this.audioPlayer.muted = settings.muteOnStart;
        
        if (settings.resumePlayback) {
          const playbackState = this.client.getPlaybackState();
          if (playbackState.itemId === item.Id) {
            this.audioPlayer.currentTime = playbackState.position || 0;
          }
        }
        
        this.audioPlayer.play().then(() => {
          this.isPlaying = true;
          this.updatePlayPauseButton();
          
          if (settings.autoMinimizePlayer) {
            this.minimizePlayer();
          }
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
        
        const settings = this.client.getSettings();
        let next;
        
        if (settings.shuffle && this.client.getQueue().length > 1) {
          const queue = this.client.getQueue();
          const otherItems = queue.filter(item => item.Id !== this.currentMedia.Id);
          next = otherItems[Math.floor(Math.random() * otherItems.length)];
        } else {
          next = this.client.getNextInQueue(this.currentMedia.Id);
        }
        
        if (next) {
          if (next.MediaType === 'Video' || next.Type === 'Video') {
            this.playVideo(next);
          } else {
            this.playAudio(next);
          }
          
          if (settings.trackChangeNotify && settings.notifications) {
            this.showToast('Now playing: ' + next.Name);
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
          
          const settings = this.client.getSettings();
          if (settings.trackChangeNotify && settings.notifications) {
            this.showToast('Now playing: ' + prev.Name);
          }
        } else {
          this.showToast('Start of queue');
        }
      }

      skipForward() {
        if (!this.currentMedia) return;
        const settings = this.client.getSettings();
        const player = this.videoPlayer.src ? this.videoPlayer : this.audioPlayer;
        player.currentTime = Math.min(player.duration, player.currentTime + settings.skipDuration);
      }

      skipBackward() {
        if (!this.currentMedia) return;
        const settings = this.client.getSettings();
        const player = this.videoPlayer.src ? this.videoPlayer : this.audioPlayer;
        player.currentTime = Math.max(0, player.currentTime - settings.skipDuration);
      }

      adjustVolume(delta) {
        const player = this.videoPlayer.src ? this.videoPlayer : this.audioPlayer;
        const settings = this.client.getSettings();
        const step = (settings.volumeStep || 5) / 100;
        player.volume = Math.max(0, Math.min(1, player.volume + delta * step));
        
        if (settings.rememberVolume) {
          this.client.saveSettings({ volumeLevel: player.volume });
        }
        
        this.showToast(`Volume: ${Math.round(player.volume * 100)}%`);
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

      handleAutoSkip() {
        if (!this.videoPlayer.src || !this.videoPlayer.duration) return;
        
        const settings = this.client.getSettings();
        const currentTime = this.videoPlayer.currentTime;
        const duration = this.videoPlayer.duration;
        
        if (settings.autoSkipIntro && currentTime < 60 && currentTime > 0 && currentTime < 2) {
          this.videoPlayer.currentTime = 60;
          if (settings.notifications) {
            this.showToast('Skipped intro');
          }
        }
        
        if (settings.autoSkipCredits && duration - currentTime < 30 && duration - currentTime > 28) {
          this.handleMediaEnded();
        }
      }

      handleMediaEnded() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        
        const settings = this.client.getSettings();
        
        if (this.currentMedia && settings.autoPlayNext) {
          const next = this.client.getNextInQueue(this.currentMedia.Id);
          if (next) {
            this.playNext();
          } else if (settings.loopQueue && this.client.getQueue().length > 0) {
            const firstItem = this.client.getQueue()[0];
            if (firstItem.MediaType === 'Video' || firstItem.Type === 'Video') {
              this.playVideo(firstItem);
            } else {
              this.playAudio(firstItem);
            }
          } else if (settings.continuousPlay) {
            this.playNextInFolder();
          }
        }
      }

      async playNextInFolder() {
        if (!this.currentMedia || this.currentItems.length === 0) return;
        
        const currentIndex = this.currentItems.findIndex(item => item.Id === this.currentMedia.Id);
        if (currentIndex < 0) return;
        
        for (let i = currentIndex + 1; i < this.currentItems.length; i++) {
          const item = this.currentItems[i];
          if (item.MediaType === 'Video' || item.Type === 'Video' || item.MediaType === 'Audio' || item.Type === 'Audio') {
            if (item.MediaType === 'Video' || item.Type === 'Video') {
              this.playVideo(item);
            } else {
              this.playAudio(item);
            }
            return;
          }
        }
        
        this.showToast('No more media in folder');
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

      toggleSettings() {
        this.settingsPanel.classList.toggle('active');
        
        if (this.settingsPanel.classList.contains('active')) {
          this.loadSettingsUI();
        }
      }

      loadSettingsUI() {
        const settings = this.client.getSettings();
        
        // Update version display
        const htmlVersion = document.getElementById('htmlVersion')?.textContent || '1.0.1';
        const cdnVersion = window.OASIS_CDN_VERSION || 'Unknown';
        document.getElementById('versionDisplay').innerHTML = `
          The Oasis v${htmlVersion}
          <br>
          <span style="font-size: 0.85rem; opacity: 0.7;">CDN Script: v${cdnVersion}</span>
        `;
        
        document.getElementById('autoOpenToggle').classList.toggle('active', settings.autoOpenEnabled);
        document.getElementById('autoPlayToggle').classList.toggle('active', settings.autoPlayNext);
        document.getElementById('resumePlaybackToggle').classList.toggle('active', settings.resumePlayback);
        document.getElementById('loopQueueToggle').classList.toggle('active', settings.loopQueue);
        document.getElementById('shuffleToggle').classList.toggle('active', settings.shuffle);
        document.getElementById('saveQueueToggle').classList.toggle('active', settings.saveQueue);
        document.getElementById('showThumbnailsToggle').classList.toggle('active', settings.showThumbnails);
        document.getElementById('compactModeToggle').classList.toggle('active', settings.compactMode);
        document.getElementById('autoMinimizeToggle').classList.toggle('active', settings.autoMinimizePlayer);
        document.getElementById('keyboardShortcutsToggle').classList.toggle('active', settings.keyboardShortcuts);
        document.getElementById('showFileSizeToggle').classList.toggle('active', settings.showFileSize);
        document.getElementById('confirmDeleteToggle').classList.toggle('active', settings.confirmDelete);
        document.getElementById('muteOnStartToggle').classList.toggle('active', settings.muteOnStart);
        document.getElementById('rememberVolumeToggle').classList.toggle('active', settings.rememberVolume);
        document.getElementById('autoSkipIntroToggle').classList.toggle('active', settings.autoSkipIntro);
        document.getElementById('autoSkipCreditsToggle').classList.toggle('active', settings.autoSkipCredits);
        document.getElementById('pipToggle').classList.toggle('active', settings.pipEnabled);
        document.getElementById('continuousPlayToggle').classList.toggle('active', settings.continuousPlay);
        document.getElementById('autoAddSimilarToggle').classList.toggle('active', settings.autoAddSimilar);
        document.getElementById('clearQueueOnExitToggle').classList.toggle('active', settings.clearQueueOnExit);
        document.getElementById('showDurationToggle').classList.toggle('active', settings.showDuration);
        document.getElementById('showBreadcrumbsToggle').classList.toggle('active', settings.showBreadcrumbs);
        document.getElementById('animationsToggle').classList.toggle('active', settings.animations);
        document.getElementById('darkModeToggle').classList.toggle('active', settings.darkMode);
        document.getElementById('progressOnThumbToggle').classList.toggle('active', settings.progressOnThumbnails);
        document.getElementById('doubleClickToggle').classList.toggle('active', settings.doubleClick);
        document.getElementById('autoScrollToggle').classList.toggle('active', settings.autoScroll);
        document.getElementById('rememberFolderToggle').classList.toggle('active', settings.rememberFolder);
        document.getElementById('showHiddenToggle').classList.toggle('active', settings.showHidden);
        document.getElementById('hwAccelToggle').classList.toggle('active', settings.hwAcceleration);
        document.getElementById('preloadToggle').classList.toggle('active', settings.preloadNext);
        document.getElementById('bgDownloadToggle').classList.toggle('active', settings.bgDownload);
        document.getElementById('cacheMetadataToggle').classList.toggle('active', settings.cacheMetadata);
        document.getElementById('debugModeToggle').classList.toggle('active', settings.debugMode);
        document.getElementById('notificationsToggle').classList.toggle('active', settings.notifications);
        document.getElementById('trackChangeNotifyToggle').classList.toggle('active', settings.trackChangeNotify);
        document.getElementById('downloadNotifyToggle').classList.toggle('active', settings.downloadNotify);
        
        document.getElementById('autoOpenUrl').value = settings.autoOpenUrl || '';
        document.getElementById('playbackSpeedInput').value = settings.playbackSpeed;
        document.getElementById('skipDurationInput').value = settings.skipDuration;
        document.getElementById('volumeLevelInput').value = settings.volumeLevel;
        document.getElementById('volumeDisplay').textContent = Math.round(settings.volumeLevel * 100) + '%';
        document.getElementById('volumeStepInput').value = settings.volumeStep;
        document.getElementById('queueLimitInput').value = settings.queueLimit;
        document.getElementById('itemsPerPageInput').value = settings.itemsPerPage;
        document.getElementById('maxHistoryInput').value = settings.maxHistoryItems;
        document.getElementById('searchDelayInput').value = settings.searchDelay;
        document.getElementById('networkTimeoutInput').value = settings.networkTimeout;
        document.getElementById('bufferSizeInput').value = settings.bufferSize;
        document.getElementById('maxDownloadsInput').value = settings.maxDownloads;
        document.getElementById('notificationDurationInput').value = settings.notificationDuration;
        document.getElementById('defaultViewSelect').value = settings.defaultView;
        document.getElementById('defaultSortSelect').value = settings.defaultSort;
      }

      applyPlaybackSpeed(speed) {
        if (this.videoPlayer.src) {
          this.videoPlayer.playbackRate = speed;
        }
        if (this.audioPlayer.src) {
          this.audioPlayer.playbackRate = speed;
        }
      }

      applyVolume(volume) {
        this.videoPlayer.volume = volume;
        this.audioPlayer.volume = volume;
      }

      toggleSetting(toggle, settingKey) {
        toggle.classList.toggle('active');
        const isActive = toggle.classList.contains('active');
        this.client.saveSettings({ [settingKey]: isActive });
        
        if (settingKey === 'autoOpenEnabled' && isActive) {
          this.showToast('Auto-open will trigger on next login');
        }
      }

      confirmClearHistory() {
        const historyCount = this.client.getHistory().length;
        
        if (historyCount === 0) {
          this.showToast('History is already empty');
          return;
        }

        const btn = document.getElementById('clearHistoryBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm Clear?';
        btn.style.background = 'rgba(255, 82, 82, 0.3)';
        
        const confirmHandler = () => {
          this.client.clearHistory();
          this.showToast(`Cleared ${historyCount} history items`);
          btn.innerHTML = originalText;
          btn.style.background = '';
          btn.removeEventListener('click', confirmHandler);
          setTimeout(() => {
            btn.addEventListener('click', () => this.confirmClearHistory());
          }, 100);
        };
        
        btn.addEventListener('click', confirmHandler);
        
        setTimeout(() => {
          if (btn.innerHTML.includes('Confirm')) {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.removeEventListener('click', confirmHandler);
          }
        }, 3000);
      }

      confirmClearFavorites() {
        const favCount = this.client.favorites.length;
        
        if (favCount === 0) {
          this.showToast('No favorites to clear');
          return;
        }

        const btn = document.getElementById('clearFavoritesBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm Clear?';
        btn.style.background = 'rgba(255, 82, 82, 0.3)';
        
        const confirmHandler = () => {
          this.client.clearFavorites();
          this.showToast(`Cleared ${favCount} favorites`);
          btn.innerHTML = originalText;
          btn.style.background = '';
          btn.removeEventListener('click', confirmHandler);
          setTimeout(() => {
            btn.addEventListener('click', () => this.confirmClearFavorites());
          }, 100);
        };
        
        btn.addEventListener('click', confirmHandler);
        
        setTimeout(() => {
          if (btn.innerHTML.includes('Confirm')) {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.removeEventListener('click', confirmHandler);
          }
        }, 3000);
      }

      confirmClearAllData() {
        const btn = document.getElementById('clearAllDataBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm Clear All?';
        btn.style.background = 'rgba(255, 82, 82, 0.3)';
        
        const confirmHandler = () => {
          this.client.clearHistory();
          this.client.clearFavorites();
          this.client.clearQueue();
          localStorage.removeItem('jellyfin_playback');
          this.showToast('All data cleared');
          btn.innerHTML = originalText;
          btn.style.background = '';
          btn.removeEventListener('click', confirmHandler);
          setTimeout(() => {
            btn.addEventListener('click', () => this.confirmClearAllData());
          }, 100);
        };
        
        btn.addEventListener('click', confirmHandler);
        
        setTimeout(() => {
          if (btn.innerHTML.includes('Confirm')) {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.removeEventListener('click', confirmHandler);
          }
        }, 3000);
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
        document.getElementById('loadingMessage').textContent = '';
      }

      showLoadingWithMessage(message) {
        this.loading.classList.add('active');
        document.getElementById('loadingMessage').textContent = message;
      }

      hideLoading() {
        this.loading.classList.remove('active');
        document.getElementById('loadingMessage').textContent = '';
      }

      showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
      }

      hideError() {
        this.errorMessage.classList.add('hidden');
      }

      showToast(message) {
        const settings = this.client.getSettings();
        if (!settings.notifications) return;
        
        this.toast.textContent = message;
        this.toast.classList.add('active');
        
        const duration = (settings.notificationDuration || 3) * 1000;
        setTimeout(() => {
          this.toast.classList.remove('active');
        }, duration);
      }
    }

    // Check version on load
    function checkVersion() {
      // Wait a moment for CDN script to load if it exists
      setTimeout(() => {
        if (checkVersionMismatch()) {
          showUpdateScreen();
        }
      }, 100);
      return true; // Always allow initial load
    }
    
    function showUpdateScreen() {
      const cdnVersion = window.OASIS_CDN_VERSION || 'Unknown';
      document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: radial-gradient(circle at 50% 50%, #1a1f3a 0%, #0a0e27 100%); padding: 2rem; text-align: center;">
          <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ff6b9d; margin-bottom: 2rem;"></i>
          <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #e0e6ff;">Update Required</h1>
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem; color: #e0e6ff; opacity: 0.8;">Your HTML file needs to be updated</p>
          <p style="font-size: 0.95rem; margin-bottom: 2rem; color: #00d9ff;">HTML File: v${HTML_VERSION} → CDN Version: v${cdnVersion}</p>
          <a href="${UPDATE_DOWNLOAD_URL}" target="_blank" rel="noopener noreferrer" style="padding: 1rem 2rem; background: linear-gradient(135deg, #00d9ff 0%, #7b2ff7 100%); border: none; border-radius: 8px; color: white; font-size: 1.1rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(0, 217, 255, 0.3); transition: all 0.3s ease; text-decoration: none; display: inline-block; margin-bottom: 1rem;">
            Download Update
          </a>
          <button onclick="location.reload()" style="padding: 0.875rem 1.5rem; background: rgba(0, 217, 255, 0.1); border: 1px solid rgba(0, 217, 255, 0.3); border-radius: 8px; color: #00d9ff; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">
            Retry
          </button>
          <p style="font-size: 0.85rem; margin-top: 2rem; color: #e0e6ff; opacity: 0.6; max-width: 500px;">Please download version ${cdnVersion} to match the CDN script. After downloading, replace your current HTML file with the new version.</p>
        </div>
      `;
    }
    
    window.updateVersion = function() {
      location.reload();
    };
    
    // Initialize app only if version is correct
    if (checkVersion()) {
      const client = new JellyfinClient();
      const ui = new UIController(client);

      if (localStorage.getItem('jellyfin_remember') === 'true' && client.token) {
        ui.showMainApp();
        ui.loadRootItems();
      }
    }
