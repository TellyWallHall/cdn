
    // Settings Manager with localStorage
    class SettingsManager {
      constructor() {
        this.defaults = {
          autoplay: true,
          skipIntro: false,
          cinemaMode: false,
          resumePlayback: true,
          quality: 'auto',
          audioTrack: 'default',
          subtitleTrack: 'none',
          volume: 80
        };
        this.load();
      }

      load() {
        const saved = localStorage.getItem('jellyfin_settings');
        if (saved) {
          try {
            this.settings = { ...this.defaults, ...JSON.parse(saved) };
          } catch (e) {
            this.settings = { ...this.defaults };
          }
        } else {
          this.settings = { ...this.defaults };
        }
        this.applyToUI();
      }

      save() {
        localStorage.setItem('jellyfin_settings', JSON.stringify(this.settings));
      }

      get(key) {
        return this.settings[key];
      }

      set(key, value) {
        this.settings[key] = value;
        this.save();
      }

      applyToUI() {
        document.getElementById('autoplay-toggle').checked = this.settings.autoplay;
        document.getElementById('skipintro-toggle').checked = this.settings.skipIntro;
        document.getElementById('cinema-toggle').checked = this.settings.cinemaMode;
        document.getElementById('resume-toggle').checked = this.settings.resumePlayback;
        document.getElementById('quality-select').value = this.settings.quality;
        document.getElementById('audio-select').value = this.settings.audioTrack;
        document.getElementById('subtitle-select').value = this.settings.subtitleTrack;
        document.getElementById('volume-bar').value = this.settings.volume;
      }
    }

    // Playback State Manager
    class PlaybackStateManager {
      constructor() {
        this.load();
      }

      load() {
        const saved = localStorage.getItem('jellyfin_playback_state');
        this.states = saved ? JSON.parse(saved) : {};
      }

      save() {
        localStorage.setItem('jellyfin_playback_state', JSON.stringify(this.states));
      }

      saveState(itemId, currentTime, duration) {
        this.states[itemId] = {
          currentTime,
          duration,
          timestamp: Date.now()
        };
        this.save();
      }

      getState(itemId) {
        return this.states[itemId];
      }

      clearState(itemId) {
        delete this.states[itemId];
        this.save();
      }

      clearAll() {
        this.states = {};
        this.save();
      }
    }

    // Queue Manager
    class QueueManager {
      constructor() {
        this.queue = [];
        this.currentIndex = -1;
      }

      add(item) {
        this.queue.push(item);
        this.updateUI();
      }

      remove(index) {
        this.queue.splice(index, 1);
        if (this.currentIndex >= index && this.currentIndex > 0) {
          this.currentIndex--;
        }
        this.updateUI();
      }

      clear() {
        this.queue = [];
        this.currentIndex = -1;
        this.updateUI();
      }

      next() {
        if (this.currentIndex < this.queue.length - 1) {
          this.currentIndex++;
          return this.queue[this.currentIndex];
        }
        return null;
      }

      previous() {
        if (this.currentIndex > 0) {
          this.currentIndex--;
          return this.queue[this.currentIndex];
        }
        return null;
      }

      getCurrent() {
        return this.queue[this.currentIndex];
      }

      updateUI() {
        const list = document.getElementById('queue-list');
        if (this.queue.length === 0) {
          list.innerHTML = '<p class="text-center text-gray-500 py-8">Queue is empty</p>';
          return;
        }

        list.innerHTML = this.queue.map((item, index) => {
          const isPlaying = index === this.currentIndex;
          return `
            <div class="queue-item flex items-center gap-3 p-3 rounded-xl ${isPlaying ? 'bg-emerald-500/20' : 'bg-white/5'}">
              <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex-shrink-0 overflow-hidden">
                ${item.imageUrl ? `<div class="w-full h-full bg-cover bg-center" style="background-image: url('${item.imageUrl}')"></div>` : ''}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">${item.name}</p>
                <p class="text-xs text-gray-400 truncate">${item.artist || item.type}</p>
              </div>
              ${isPlaying ? `
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ` : `
                <button class="remove-from-queue w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0" data-index="${index}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              `}
            </div>
          `;
        }).join('');

        // Add remove handlers
        list.querySelectorAll('.remove-from-queue').forEach(btn => {
          btn.addEventListener('click', () => {
            this.remove(parseInt(btn.dataset.index));
          });
        });
      }
    }

    // Initialize managers
    const settingsManager = new SettingsManager();
    const playbackStateManager = new PlaybackStateManager();
    const queueManager = new QueueManager();

    // App State
    const state = {
      isLoggedIn: false,
      currentUser: null,
      currentView: 'home',
      browseStack: [],
      selectedMedia: null,
      isPlaying: false,
      currentMediaType: null,
      SERVER_URL: 'https://jelly.oasis-archive.org'
    };

    // DOM Elements
    const els = {
      loginScreen: document.getElementById('login-screen'),
      dashboard: document.getElementById('dashboard'),
      loginForm: document.getElementById('login-form'),
      homeView: document.getElementById('home-view'),
      browseView: document.getElementById('browse-view'),
      detailView: document.getElementById('detail-view'),
      searchView: document.getElementById('search-view'),
      settingsView: document.getElementById('settings-view'),
      miniPlayer: document.getElementById('mini-player'),
      videoPlayer: document.getElementById('video-player'),
      audioPlayer: document.getElementById('audio-player'),
      toast: document.getElementById('toast')
    };

    // SDK Init
    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig: {},
        onConfigChange: async (config) => {},
        mapToCapabilities: (config) => ({
          recolorables: [],
          borderables: [],
          fontEditable: undefined,
          fontSizeable: undefined
        }),
        mapToEditPanelValues: (config) => new Map()
      });
    }

    // Toast
    function showToast(message, duration = 3000) {
      els.toast.textContent = message;
      els.toast.classList.remove('-translate-y-full', 'opacity-0');
      setTimeout(() => {
        els.toast.classList.add('-translate-y-full', 'opacity-0');
      }, duration);
    }

    // Login
    els.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      
      const loginBtn = document.getElementById('login-btn');
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';
      
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/AuthenticateByName`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': `MediaBrowser Client="Media Dashboard", Device="Web", DeviceId="web-${Date.now()}", Version="1.0.0"`
          },
          body: JSON.stringify({ Username: username, Pw: password })
        });
        
        if (response.ok) {
          const data = await response.json();
          state.currentUser = {
            id: data.User.Id,
            name: data.User.Name,
            token: data.AccessToken
          };
          
          if (document.getElementById('remember-me').checked) {
            localStorage.setItem('jellyfin_session', JSON.stringify(state.currentUser));
          }
          
          showDashboard();
          loadHomeContent();
        } else {
          showError('Invalid credentials');
        }
      } catch (error) {
        showError('Connection failed');
      }
      
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    });

    function showError(message) {
      const errorEl = document.getElementById('login-error');
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
      setTimeout(() => errorEl.classList.add('hidden'), 5000);
    }

    function showDashboard() {
      els.loginScreen.classList.add('hidden');
      els.dashboard.classList.remove('hidden');
      const initial = state.currentUser?.name?.charAt(0).toUpperCase() || 'U';
      document.getElementById('user-initial').textContent = initial;
      document.getElementById('settings-user-initial').textContent = initial;
      document.getElementById('settings-username').textContent = state.currentUser?.name || 'User';
      showToast(`Welcome, ${state.currentUser?.name}!`);
    }

    function getAuthHeaders() {
      return {
        'X-Emby-Authorization': `MediaBrowser Client="Media Dashboard", Device="Web", DeviceId="web-${Date.now()}", Version="1.0.0", Token="${state.currentUser?.token || ''}"`,
        'Content-Type': 'application/json'
      };
    }

    // Load Home Content
    async function loadHomeContent() {
      loadContinueWatching();
      loadRecentlyAdded();
    }

    async function loadContinueWatching() {
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items/Resume?Limit=10&MediaTypes=Video&Fields=PrimaryImageAspectRatio`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          const items = data.Items || [];
          
          if (items.length > 0) {
            document.getElementById('continue-section').classList.remove('hidden');
            renderContinueWatching(items);
          }
        }
      } catch (e) {}
    }

    function renderContinueWatching(items) {
      const list = document.getElementById('continue-list');
      list.innerHTML = items.map(item => {
        const progress = item.UserData?.PlayedPercentage || 0;
        const imageUrl = item.ImageTags?.Primary 
          ? `${state.SERVER_URL}/Items/${item.Id}/Images/Primary?maxHeight=200&tag=${item.ImageTags.Primary}`
          : null;
        
        return `
          <button class="media-card flex-shrink-0 w-40 snap-start" data-media-id="${item.Id}">
            <div class="relative rounded-xl overflow-hidden mb-2 aspect-video bg-gradient-to-br from-gray-700 to-gray-800">
              ${imageUrl ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${imageUrl}')"></div>` : ''}
              <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div class="progress-bar h-full" style="width: ${progress}%"></div>
              </div>
            </div>
            <p class="text-sm font-medium truncate">${item.Name}</p>
            <p class="text-xs text-gray-400 truncate">${item.SeriesName || item.ProductionYear || ''}</p>
          </button>
        `;
      }).join('');
      
      list.querySelectorAll('[data-media-id]').forEach(btn => {
        btn.addEventListener('click', () => openMediaDetail(btn.dataset.mediaId));
      });
    }

    async function loadRecentlyAdded() {
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items/Latest?Limit=12&Fields=PrimaryImageAspectRatio`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            document.getElementById('recent-section').classList.remove('hidden');
            renderRecentlyAdded(data);
          }
        }
      } catch (e) {}
    }

    function renderRecentlyAdded(items) {
      const list = document.getElementById('recent-list');
      list.innerHTML = items.map(item => {
        const imageUrl = item.ImageTags?.Primary 
          ? `${state.SERVER_URL}/Items/${item.Id}/Images/Primary?maxHeight=300&tag=${item.ImageTags.Primary}`
          : null;
        
        return `
          <button class="media-card flex-shrink-0 w-32 snap-start" data-media-id="${item.Id}">
            <div class="relative rounded-xl overflow-hidden mb-2 aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800">
              ${imageUrl ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${imageUrl}')"></div>` : ''}
            </div>
            <p class="text-sm font-medium truncate">${item.Name}</p>
          </button>
        `;
      }).join('');
      
      list.querySelectorAll('[data-media-id]').forEach(btn => {
        btn.addEventListener('click', () => openMediaDetail(btn.dataset.mediaId));
      });
    }

    // Quick Access Buttons
    document.getElementById('quick-movies').addEventListener('click', () => browseLibrary('movies'));
    document.getElementById('quick-tv').addEventListener('click', () => browseLibrary('tvshows'));
    document.getElementById('quick-music').addEventListener('click', () => browseLibrary('music'));

    async function browseLibrary(type) {
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Views`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          const lib = data.Items.find(l => l.CollectionType === type);
          if (lib) {
            state.browseStack = [{ id: lib.Id, name: lib.Name, type: 'library' }];
            loadBrowseContent(lib.Id);
          }
        }
      } catch (e) {}
    }

    async function loadBrowseContent(parentId) {
      showView('browse');
      updateBreadcrumb();
      
      const content = document.getElementById('browse-content');
      content.innerHTML = '<div class="skeleton rounded-xl h-32"></div>'.repeat(4);
      
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items?ParentId=${parentId}&SortBy=SortName&Fields=PrimaryImageAspectRatio`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          renderBrowseItems(data.Items || []);
        }
      } catch (e) {
        content.innerHTML = '<p class="text-center text-gray-500 py-12">Failed to load</p>';
      }
    }

    function renderBrowseItems(items) {
      const content = document.getElementById('browse-content');
      
      if (items.length === 0) {
        content.innerHTML = '<p class="text-center text-gray-500 py-12">No items found</p>';
        return;
      }
      
      content.innerHTML = `<div class="grid grid-cols-2 gap-3">${items.map(item => {
        // Detect item types
        const isSeries = item.Type === 'Series';
        const isSeason = item.Type === 'Season';
        const isFolder = item.IsFolder && !isSeries && !isSeason;
        const isMusicArtist = item.Type === 'MusicArtist';
        const isMusicAlbum = item.Type === 'MusicAlbum';
        const isPlayable = item.Type === 'Movie' || item.Type === 'Episode' || item.MediaType === 'Audio' || item.Type === 'MusicAlbum';
        
        const imageUrl = item.ImageTags?.Primary 
          ? `${state.SERVER_URL}/Items/${item.Id}/Images/Primary?maxHeight=300&tag=${item.ImageTags.Primary}`
          : null;
        
        // Determine icon type
        let iconHtml = '';
        if (isSeries || isSeason) {
          iconHtml = `
            <div class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
              </svg>
            </div>
          `;
        } else if (isMusicArtist) {
          iconHtml = `
            <div class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          `;
        } else if (isMusicAlbum) {
          iconHtml = `
            <div class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
              </svg>
            </div>
          `;
        } else if (isFolder) {
          iconHtml = `
            <div class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
          `;
        }
        
        return `
          <button class="media-card text-left" data-item-id="${item.Id}" data-item-type="${item.Type}">
            <div class="relative rounded-xl overflow-hidden mb-2 aspect-square bg-gradient-to-br from-gray-700 to-gray-800">
              ${imageUrl ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${imageUrl}')"></div>` : ''}
              ${iconHtml}
              ${item.ChildCount ? `<div class="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-xs">${item.ChildCount} ${isSeries ? 'seasons' : isMusicArtist ? 'albums' : 'items'}</div>` : ''}
            </div>
            <p class="text-sm font-medium truncate">${item.Name}</p>
            <p class="text-xs text-gray-400">${item.Type === 'MusicArtist' ? 'Artist' : item.Type === 'MusicAlbum' ? 'Album' : item.Type}</p>
          </button>
        `;
      }).join('')}</div>`;
      
      content.querySelectorAll('[data-item-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = items.find(i => i.Id === btn.dataset.itemId);
          const itemType = btn.dataset.itemType;
          
          // Series, Seasons, Albums, and Artists go to detail view
          if (itemType === 'Series' || itemType === 'Season' || itemType === 'MusicAlbum' || itemType === 'MusicArtist') {
            openMediaDetail(item.Id);
          }
          // Folders continue browsing
          else if (item.IsFolder) {
            state.browseStack.push({ id: item.Id, name: item.Name, type: 'folder' });
            loadBrowseContent(item.Id);
          }
          // Everything else opens detail view
          else {
            openMediaDetail(item.Id);
          }
        });
      });
    }

    function updateBreadcrumb() {
      const breadcrumb = document.getElementById('breadcrumb');
      breadcrumb.innerHTML = state.browseStack.map((item, index) => {
        return `
          <span class="breadcrumb-item" data-index="${index}">${item.name}</span>
          ${index < state.browseStack.length - 1 ? '<span class="text-gray-600">/</span>' : ''}
        `;
      }).join('');
      
      breadcrumb.querySelectorAll('.breadcrumb-item').forEach(el => {
        el.addEventListener('click', () => {
          const index = parseInt(el.dataset.index);
          state.browseStack = state.browseStack.slice(0, index + 1);
          const item = state.browseStack[index];
          loadBrowseContent(item.id);
        });
      });
    }

    // Media Detail
    async function openMediaDetail(mediaId) {
      showView('detail');
      
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items/${mediaId}?Fields=Overview,Genres,People,MediaStreams`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const item = await response.json();
          state.selectedMedia = item;
          renderMediaDetail(item);
          
          // Check for resume state
          const savedState = playbackStateManager.getState(item.Id);
          if (savedState && settingsManager.get('resumePlayback')) {
            const percent = (savedState.currentTime / savedState.duration) * 100;
            if (percent > 5 && percent < 95) {
              document.getElementById('play-btn-text').textContent = 'Resume';
            }
          }
        }
      } catch (e) {}
    }

    function renderMediaDetail(item) {
      // Hero
      if (item.BackdropImageTags?.length > 0) {
        const heroEl = document.getElementById('detail-hero');
        heroEl.style.backgroundImage = `url('${state.SERVER_URL}/Items/${item.Id}/Images/Backdrop?maxWidth=800&tag=${item.BackdropImageTags[0]}')`;
        heroEl.style.backgroundSize = 'cover';
        heroEl.style.backgroundPosition = 'center';
      }
      
      // Title & Meta
      document.getElementById('detail-title').textContent = item.Name;
      
      const metaParts = [];
      if (item.ProductionYear) metaParts.push(item.ProductionYear);
      if (item.Type) metaParts.push(item.Type === 'MusicArtist' ? 'Artist' : item.Type === 'MusicAlbum' ? 'Album' : item.Type);
      document.getElementById('detail-meta').innerHTML = metaParts.join(' • ');
      
      document.getElementById('detail-overview').textContent = item.Overview || 'No description available.';
      
      // Show appropriate sections based on type
      document.getElementById('episodes-section').classList.add('hidden');
      document.getElementById('tracks-section').classList.add('hidden');
      document.getElementById('cast-section').classList.add('hidden');
      document.getElementById('info-section').classList.add('hidden');
      
      if (item.Type === 'Series') {
        loadSeasons(item.Id);
      } else if (item.Type === 'MusicAlbum') {
        // Change section title for album tracks
        document.querySelector('#tracks-section h3').textContent = 'Tracks';
        loadTracks(item.Id);
      } else if (item.Type === 'MusicArtist') {
        // Change section title for artist albums
        document.querySelector('#tracks-section h3').textContent = 'Albums';
        loadArtistAlbums(item.Id);
      }
      
      // Info section
      if (item.Genres || item.Artists || item.AlbumArtist) {
        document.getElementById('info-section').classList.remove('hidden');
        
        if (item.Genres?.length > 0) {
          document.getElementById('genres-info').classList.remove('hidden');
          document.getElementById('genres-text').textContent = item.Genres.join(', ');
        }
        
        if (item.AlbumArtist) {
          document.getElementById('artist-info').classList.remove('hidden');
          document.getElementById('artist-text').textContent = item.AlbumArtist;
        }
        
        if (item.ProductionYear) {
          document.getElementById('year-info').classList.remove('hidden');
          document.getElementById('year-text').textContent = item.ProductionYear;
        }
      }
    }

    async function loadArtistAlbums(artistId) {
      // Show loading state
      document.getElementById('tracks-section').classList.remove('hidden');
      const list = document.getElementById('tracks-list');
      list.innerHTML = '<div class="skeleton rounded-xl h-20"></div>'.repeat(3);
      
      try {
        // Try multiple endpoints to find artist's albums
        let albums = [];
        
        // Method 1: Using ArtistIds parameter
        const response1 = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items?ArtistIds=${artistId}&IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=ProductionYear,SortName&SortOrder=Descending&Fields=ChildCount`, {
          headers: getAuthHeaders()
        });
        
        if (response1.ok) {
          const data1 = await response1.json();
          albums = data1.Items || [];
        }
        
        // Method 2: If no results, try getting children directly
        if (albums.length === 0) {
          const response2 = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items?ParentId=${artistId}&SortBy=ProductionYear,SortName&SortOrder=Descending&Fields=ChildCount`, {
            headers: getAuthHeaders()
          });
          
          if (response2.ok) {
            const data2 = await response2.json();
            albums = (data2.Items || []).filter(item => item.Type === 'MusicAlbum' || item.IsFolder);
          }
        }
        
        if (albums.length > 0) {
          list.innerHTML = albums.map(album => {
            const imageUrl = album.ImageTags?.Primary 
              ? `${state.SERVER_URL}/Items/${album.Id}/Images/Primary?maxWidth=200&tag=${album.ImageTags.Primary}`
              : null;
            
            return `
              <button class="media-card flex gap-3 p-3 card-gradient rounded-xl glow-border w-full text-left" data-album-id="${album.Id}">
                <div class="relative w-20 flex-shrink-0 rounded-lg overflow-hidden aspect-square bg-gradient-to-br from-gray-700 to-gray-800">
                  ${imageUrl ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${imageUrl}')"></div>` : `
                    <svg class="w-8 h-8 text-gray-500 m-auto mt-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                    </svg>
                  `}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm truncate">${album.Name}</p>
                  <p class="text-xs text-gray-400 mt-1">${album.ProductionYear || 'Unknown Year'}</p>
                  ${album.ChildCount ? `<p class="text-xs text-gray-400">${album.ChildCount} tracks</p>` : ''}
                </div>
                <svg class="w-5 h-5 text-gray-400 flex-shrink-0 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            `;
          }).join('');
          
          list.querySelectorAll('[data-album-id]').forEach(btn => {
            btn.addEventListener('click', () => openMediaDetail(btn.dataset.albumId));
          });
        } else {
          list.innerHTML = '<p class="text-center text-gray-500 py-8">No albums found for this artist</p>';
        }
      } catch (e) {
        list.innerHTML = '<p class="text-center text-gray-500 py-8">Failed to load albums</p>';
      }
    }

    async function loadSeasons(seriesId) {
      try {
        const response = await fetch(`${state.SERVER_URL}/Shows/${seriesId}/Seasons?UserId=${state.currentUser.id}`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          const seasons = data.Items || [];
          
          if (seasons.length > 0) {
            document.getElementById('episodes-section').classList.remove('hidden');
            const select = document.getElementById('season-select');
            select.innerHTML = seasons.map(s => `<option value="${s.Id}">${s.Name}</option>`).join('');
            
            select.addEventListener('change', () => loadEpisodes(seriesId, select.value));
            loadEpisodes(seriesId, seasons[0].Id);
          }
        }
      } catch (e) {}
    }

    async function loadEpisodes(seriesId, seasonId) {
      const list = document.getElementById('episodes-list');
      list.innerHTML = '<div class="skeleton rounded-xl h-20"></div>'.repeat(3);
      
      try {
        const response = await fetch(`${state.SERVER_URL}/Shows/${seriesId}/Episodes?SeasonId=${seasonId}&UserId=${state.currentUser.id}`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          const episodes = data.Items || [];
          
          list.innerHTML = episodes.map(ep => {
            const imageUrl = ep.ImageTags?.Primary 
              ? `${state.SERVER_URL}/Items/${ep.Id}/Images/Primary?maxWidth=200&tag=${ep.ImageTags.Primary}`
              : null;
            
            return `
              <button class="media-card flex gap-3 p-3 card-gradient rounded-xl glow-border w-full text-left" data-episode-id="${ep.Id}">
                <div class="relative w-24 flex-shrink-0 rounded-lg overflow-hidden aspect-video bg-gradient-to-br from-gray-700 to-gray-800">
                  ${imageUrl ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${imageUrl}')"></div>` : ''}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm truncate">${ep.IndexNumber}. ${ep.Name}</p>
                  <p class="text-xs text-gray-400 line-clamp-2 mt-1">${ep.Overview || ''}</p>
                </div>
              </button>
            `;
          }).join('');
          
          list.querySelectorAll('[data-episode-id]').forEach(btn => {
            btn.addEventListener('click', () => playMedia(btn.dataset.episodeId));
          });
        }
      } catch (e) {}
    }

    async function loadTracks(albumId) {
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items?ParentId=${albumId}&SortBy=SortName`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          const tracks = data.Items || [];
          
          if (tracks.length > 0) {
            document.getElementById('tracks-section').classList.remove('hidden');
            const list = document.getElementById('tracks-list');
            
            list.innerHTML = tracks.map((track, index) => `
              <div class="queue-item flex items-center gap-3 p-2 rounded-lg w-full hover:bg-white/5">
                <button class="flex-1 flex items-center gap-3 text-left min-w-0" data-track-id="${track.Id}">
                  <span class="text-sm text-gray-400 w-6">${index + 1}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm truncate">${track.Name}</p>
                  </div>
                  <span class="text-xs text-gray-400">${formatDuration(track.RunTimeTicks)}</span>
                </button>
                <button class="download-track w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0" data-track-id="${track.Id}" data-track-name="${track.Name}" title="Download track">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                </button>
              </div>
            `).join('');
            
            list.querySelectorAll('button[data-track-id]:not(.download-track)').forEach(btn => {
              btn.addEventListener('click', () => playMedia(btn.dataset.trackId));
            });
            
            list.querySelectorAll('.download-track').forEach(btn => {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadTrack(btn.dataset.trackId, btn.dataset.trackName);
              });
            });
          }
        }
      } catch (e) {}
    }

    function formatDuration(ticks) {
      if (!ticks) return '0:00';
      const seconds = Math.floor(ticks / 10000000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    // Play Media
    document.getElementById('play-btn').addEventListener('click', () => {
      if (state.selectedMedia) {
        playMedia(state.selectedMedia.Id);
      }
    });

    async function playMedia(itemId) {
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items/${itemId}`, {
          headers: getAuthHeaders()
        });
        
        if (!response.ok) return;
        
        const item = await response.json();
        state.currentMediaType = item.MediaType || item.Type;
        
        // Stop and clear both players first
        els.audioPlayer.pause();
        els.videoPlayer.pause();
        els.audioPlayer.src = '';
        els.videoPlayer.src = '';
        
        // Show mini player
        els.miniPlayer.classList.remove('hidden');
        
        // Update mini player info
        document.getElementById('mini-title').textContent = item.Name;
        document.getElementById('mini-artist').textContent = item.AlbumArtist || item.SeriesName || item.Type;
        
        const artworkEl = document.getElementById('mini-artwork');
        if (item.ImageTags?.Primary) {
          artworkEl.innerHTML = `<div class="w-full h-full bg-cover bg-center" style="background-image: url('${state.SERVER_URL}/Items/${item.Id}/Images/Primary?maxHeight=100&tag=${item.ImageTags.Primary}')"></div>`;
        }
        
        // Use simple direct stream URL - let browser handle progressive download
        let streamUrl;
        let player;
        
        if (state.currentMediaType === 'Audio') {
          // Direct audio stream - simple and fast
          streamUrl = `${state.SERVER_URL}/Audio/${item.Id}/stream.mp3?static=true&api_key=${state.currentUser.token}`;
          player = els.audioPlayer;
          // Hide video container for audio
          document.getElementById('media-container').classList.add('hidden');
        } else {
          // Direct video stream - simple and fast
          streamUrl = `${state.SERVER_URL}/Videos/${item.Id}/stream?static=true&api_key=${state.currentUser.token}`;
          player = els.videoPlayer;
          // Show video container for video
          document.getElementById('media-container').classList.remove('hidden');
        }
        
        player.src = streamUrl;
        
        // Check for resume point
        const savedState = playbackStateManager.getState(item.Id);
        if (savedState && settingsManager.get('resumePlayback')) {
          player.addEventListener('loadedmetadata', () => {
            player.currentTime = savedState.currentTime;
          }, { once: true });
        }
        
        player.play();
        state.isPlaying = true;
        updatePlayPauseButton();
        
        // Setup progress tracking (use event delegation to avoid multiple listeners)
        player.ontimeupdate = () => {
          const percent = (player.currentTime / player.duration) * 100;
          document.getElementById('seek-bar').value = percent;
          document.getElementById('current-time').textContent = formatTime(Math.floor(player.currentTime));
          document.getElementById('total-time').textContent = formatTime(Math.floor(player.duration));
          
          // Save state periodically
          if (Math.floor(player.currentTime) % 10 === 0) {
            playbackStateManager.saveState(item.Id, player.currentTime, player.duration);
          }
        };
        
        player.onended = () => {
          playbackStateManager.clearState(item.Id);
          
          if (settingsManager.get('autoplay')) {
            const next = queueManager.next();
            if (next) {
              playMedia(next.id);
            }
          }
        };
        
        showToast('Now playing: ' + item.Name);
      } catch (e) {
        showToast('Playback failed');
      }
    }

    // Player Controls
    document.getElementById('mini-expand').addEventListener('click', () => {
      const expanded = document.getElementById('expanded-controls');
      const isExpanded = !expanded.classList.contains('hidden');
      
      if (isExpanded) {
        expanded.classList.add('hidden');
        els.miniPlayer.classList.remove('expanded');
        document.getElementById('expand-icon').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>';
      } else {
        expanded.classList.remove('hidden');
        els.miniPlayer.classList.add('expanded');
        document.getElementById('expand-icon').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>';
      }
    });

    document.getElementById('mini-play-pause').addEventListener('click', togglePlayPause);
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);

    function togglePlayPause() {
      const player = state.currentMediaType === 'Audio' ? els.audioPlayer : els.videoPlayer;
      
      if (state.isPlaying) {
        player.pause();
        state.isPlaying = false;
      } else {
        player.play();
        state.isPlaying = true;
      }
      
      updatePlayPauseButton();
    }

    function updatePlayPauseButton() {
      const playIcon = document.getElementById('play-icon');
      const pauseIcon = document.getElementById('pause-icon');
      const miniBtn = document.getElementById('mini-play-pause');
      
      if (state.isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        miniBtn.innerHTML = '<svg class="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        miniBtn.innerHTML = '<svg class="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
      }
    }

    document.getElementById('seek-bar').addEventListener('input', (e) => {
      const player = state.currentMediaType === 'Audio' ? els.audioPlayer : els.videoPlayer;
      const time = (e.target.value / 100) * player.duration;
      player.currentTime = time;
    });

    document.getElementById('volume-bar').addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      els.audioPlayer.volume = volume;
      els.videoPlayer.volume = volume;
      settingsManager.set('volume', e.target.value);
    });

    document.getElementById('rewind-btn').addEventListener('click', () => {
      const player = state.currentMediaType === 'Audio' ? els.audioPlayer : els.videoPlayer;
      player.currentTime = Math.max(0, player.currentTime - 15);
    });

    document.getElementById('forward-btn').addEventListener('click', () => {
      const player = state.currentMediaType === 'Audio' ? els.audioPlayer : els.videoPlayer;
      player.currentTime = Math.min(player.duration, player.currentTime + 15);
    });

    document.getElementById('prev-btn').addEventListener('click', () => {
      const prev = queueManager.previous();
      if (prev) playMedia(prev.id);
    });

    document.getElementById('next-btn').addEventListener('click', () => {
      const next = queueManager.next();
      if (next) playMedia(next.id);
    });

    document.getElementById('close-player-btn').addEventListener('click', () => {
      els.miniPlayer.classList.add('hidden');
      els.audioPlayer.pause();
      els.videoPlayer.pause();
      state.isPlaying = false;
    });

    // Queue
    document.getElementById('queue-btn').addEventListener('click', () => {
      if (state.selectedMedia) {
        const imageUrl = state.selectedMedia.ImageTags?.Primary 
          ? `${state.SERVER_URL}/Items/${state.selectedMedia.Id}/Images/Primary?maxHeight=100&tag=${state.selectedMedia.ImageTags.Primary}`
          : null;
        
        queueManager.add({
          id: state.selectedMedia.Id,
          name: state.selectedMedia.Name,
          artist: state.selectedMedia.AlbumArtist || state.selectedMedia.SeriesName,
          type: state.selectedMedia.Type,
          imageUrl
        });
        
        showToast('Added to queue');
      }
    });

    document.getElementById('queue-toggle-btn').addEventListener('click', () => {
      document.getElementById('queue-modal').classList.remove('hidden');
    });

    document.getElementById('view-queue-btn').addEventListener('click', () => {
      document.getElementById('user-menu').classList.add('hidden');
      document.getElementById('queue-modal').classList.remove('hidden');
    });

    document.getElementById('close-queue-modal').addEventListener('click', () => {
      document.getElementById('queue-modal').classList.add('hidden');
    });

    document.getElementById('queue-backdrop').addEventListener('click', () => {
      document.getElementById('queue-modal').classList.add('hidden');
    });

    // Download
    document.getElementById('download-btn').addEventListener('click', async () => {
      if (!state.selectedMedia) return;
      
      // Check if this is an album - show options
      if (state.selectedMedia.Type === 'MusicAlbum') {
        showAlbumDownloadOptions();
      } else {
        downloadSingleItem(state.selectedMedia.Id, state.selectedMedia.Name);
      }
    });

    function showAlbumDownloadOptions() {
      const modal = document.getElementById('download-modal');
      document.getElementById('download-modal-title').textContent = 'Download Album';
      modal.classList.remove('hidden');
      
      document.getElementById('download-content').innerHTML = `
        <div class="space-y-3 py-4">
          <button id="download-album-zip" class="w-full py-4 rounded-xl bg-emerald-500/20 text-emerald-400 font-semibold hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            Download Entire Album as ZIP
          </button>
          <button id="download-album-tracks" class="w-full py-4 rounded-xl bg-blue-500/20 text-blue-400 font-semibold hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Download Individual Tracks
          </button>
        </div>
      `;
      document.getElementById('download-ready').classList.add('hidden');
      
      document.getElementById('download-album-zip').addEventListener('click', async () => {
        await downloadAlbumAsZip();
      });
      
      document.getElementById('download-album-tracks').addEventListener('click', async () => {
        await downloadAlbumTracks();
      });
    }

    async function downloadAlbumAsZip() {
      document.getElementById('download-content').innerHTML = `
        <div class="flex flex-col items-center justify-center py-8">
          <div class="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-4"></div>
          <p class="text-center text-gray-400">Creating ZIP archive...</p>
          <p class="text-center text-xs text-gray-500 mt-2">This may take a moment</p>
        </div>
      `;
      
      try {
        // Import JSZip dynamically
        const JSZip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm').then(m => m.default);
        const zip = new JSZip();
        
        // Fetch tracks
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items?ParentId=${state.selectedMedia.Id}&SortBy=SortName`, {
          headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to fetch tracks');
        
        const data = await response.json();
        const tracks = data.Items || [];
        
        if (tracks.length === 0) throw new Error('No tracks found');
        
        // Download each track and add to zip
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          document.getElementById('download-content').innerHTML = `
            <div class="flex flex-col items-center justify-center py-8">
              <div class="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-4"></div>
              <p class="text-center text-gray-400">Downloading track ${i + 1} of ${tracks.length}...</p>
              <p class="text-center text-xs text-gray-500 mt-2">${track.Name}</p>
            </div>
          `;
          
          const streamUrl = `${state.SERVER_URL}/Items/${track.Id}/Download?api_key=${state.currentUser.token}`;
          const trackResponse = await fetch(streamUrl);
          
          if (!trackResponse.ok) continue;
          
          const blob = await trackResponse.blob();
          const fileName = `${String(track.IndexNumber || i + 1).padStart(2, '0')} - ${sanitizeFileName(track.Name)}.mp3`;
          zip.file(fileName, blob);
        }
        
        // Generate ZIP
        document.getElementById('download-content').innerHTML = `
          <div class="flex flex-col items-center justify-center py-8">
            <div class="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-4"></div>
            <p class="text-center text-gray-400">Finalizing ZIP file...</p>
          </div>
        `;
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Show ready state with download button
        document.getElementById('download-content').classList.add('hidden');
        document.getElementById('download-ready').classList.remove('hidden');
        document.getElementById('share-now-btn').classList.add('hidden');
        
        // Setup download button
        document.getElementById('confirm-download-btn').onclick = async () => {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: `${sanitizeFileName(state.selectedMedia.Name)}.zip`,
              types: [{
                description: 'ZIP Archive',
                accept: { 'application/zip': ['.zip'] }
              }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(zipBlob);
            await writable.close();
            
            document.getElementById('download-modal').classList.add('hidden');
            showToast('Album downloaded!');
          } catch (e) {
            if (e.name !== 'AbortError') {
              showToast('Download canceled');
            }
          }
        };
      } catch (e) {
        document.getElementById('download-modal').classList.add('hidden');
        showToast('Download failed: ' + e.message);
      }
    }

    async function downloadAlbumTracks() {
      document.getElementById('download-content').innerHTML = `
        <div class="flex flex-col items-center justify-center py-8">
          <div class="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-4"></div>
          <p class="text-center text-gray-400">Preparing tracks...</p>
        </div>
      `;
      
      try {
        // Fetch tracks
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items?ParentId=${state.selectedMedia.Id}&SortBy=SortName`, {
          headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to fetch tracks');
        
        const data = await response.json();
        const tracks = data.Items || [];
        
        if (tracks.length === 0) throw new Error('No tracks found');
        
        // Download each track individually with file picker for each
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          document.getElementById('download-content').innerHTML = `
            <div class="flex flex-col items-center justify-center py-8">
              <div class="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-4"></div>
              <p class="text-center text-gray-400">Downloading track ${i + 1} of ${tracks.length}...</p>
              <p class="text-center text-xs text-gray-500 mt-2">${track.Name}</p>
            </div>
          `;
          
          const streamUrl = `${state.SERVER_URL}/Items/${track.Id}/Download?api_key=${state.currentUser.token}`;
          const trackResponse = await fetch(streamUrl);
          
          if (!trackResponse.ok) continue;
          
          const blob = await trackResponse.blob();
          const fileName = `${String(track.IndexNumber || i + 1).padStart(2, '0')} - ${sanitizeFileName(track.Name)}.mp3`;
          
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: fileName,
              types: [{
                description: 'Audio File',
                accept: { 'audio/mpeg': ['.mp3'] }
              }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
          } catch (e) {
            if (e.name === 'AbortError') {
              // User canceled, ask if they want to continue
              break;
            }
          }
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        document.getElementById('download-modal').classList.add('hidden');
        showToast('Download complete!');
        
      } catch (e) {
        document.getElementById('download-modal').classList.add('hidden');
        showToast('Download failed: ' + e.message);
      }
    }

    async function downloadAlbumTracks() {
      document.getElementById('download-content').innerHTML = `
        <div class="flex flex-col items-center justify-center py-8">
          <div class="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-4"></div>
          <p class="text-center text-gray-400">Preparing tracks...</p>
        </div>
      `;
      
      try {
        // Fetch tracks
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items?ParentId=${state.selectedMedia.Id}&SortBy=SortName`, {
          headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to fetch tracks');
        
        const data = await response.json();
        const tracks = data.Items || [];
        
        if (tracks.length === 0) throw new Error('No tracks found');
        
        // Download each track individually
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          document.getElementById('download-content').innerHTML = `
            <div class="flex flex-col items-center justify-center py-8">
              <div class="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-4"></div>
              <p class="text-center text-gray-400">Downloading track ${i + 1} of ${tracks.length}...</p>
              <p class="text-center text-xs text-gray-500 mt-2">${track.Name}</p>
            </div>
          `;
          
          const streamUrl = `${state.SERVER_URL}/Items/${track.Id}/Download?api_key=${state.currentUser.token}`;
          const trackResponse = await fetch(streamUrl);
          
          if (!trackResponse.ok) continue;
          
          const blob = await trackResponse.blob();
          const fileName = `${String(track.IndexNumber || i + 1).padStart(2, '0')} - ${sanitizeFileName(track.Name)}.mp3`;
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        document.getElementById('download-modal').classList.add('hidden');
        showToast(`Downloaded ${tracks.length} tracks!`);
        
      } catch (e) {
        document.getElementById('download-modal').classList.add('hidden');
        showToast('Download failed: ' + e.message);
      }
    }

    async function downloadTrack(trackId, trackName) {
      showToast('Downloading ' + trackName + '...');
      
      try {
        const streamUrl = `${state.SERVER_URL}/Items/${trackId}/Download?api_key=${state.currentUser.token}`;
        const response = await fetch(streamUrl);
        
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        
        const handle = await window.showSaveFilePicker({
          suggestedName: sanitizeFileName(trackName) + '.mp3',
          types: [{
            description: 'Audio File',
            accept: { 'audio/mpeg': ['.mp3'] }
          }]
        });
        
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        showToast('Downloaded ' + trackName);
      } catch (e) {
        if (e.name !== 'AbortError') {
          showToast('Download failed');
        }
      }
    }

    async function downloadSingleItem(itemId, itemName) {
      document.getElementById('download-modal').classList.remove('hidden');
      document.getElementById('download-content').classList.remove('hidden');
      document.getElementById('download-content').innerHTML = `
        <div class="flex items-center justify-center py-8">
          <div class="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin"></div>
        </div>
        <p class="text-center text-gray-400">Processing file...</p>
      `;
      document.getElementById('download-ready').classList.add('hidden');
      
      try {
        const streamUrl = `${state.SERVER_URL}/Items/${itemId}/Download?api_key=${state.currentUser.token}`;
        const response = await fetch(streamUrl);
        
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        
        // Show ready state with download button
        document.getElementById('download-content').classList.add('hidden');
        document.getElementById('download-ready').classList.remove('hidden');
        document.getElementById('share-now-btn').classList.add('hidden');
        
        // Setup download button
        document.getElementById('confirm-download-btn').onclick = async () => {
          try {
            const ext = getFileExtension(state.selectedMedia);
            const mimeTypes = {
              '.mp3': { 'audio/mpeg': ['.mp3'] },
              '.mp4': { 'video/mp4': ['.mp4'] }
            };
            
            const handle = await window.showSaveFilePicker({
              suggestedName: sanitizeFileName(itemName) + ext,
              types: [{
                description: ext === '.mp3' ? 'Audio File' : 'Video File',
                accept: mimeTypes[ext] || { 'application/octet-stream': [ext] }
              }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            document.getElementById('download-modal').classList.add('hidden');
            showToast('Download complete!');
          } catch (e) {
            if (e.name !== 'AbortError') {
              showToast('Download canceled');
            }
          }
        };
      } catch (e) {
        document.getElementById('download-modal').classList.add('hidden');
        showToast('Download failed');
      }
    }

    function sanitizeFileName(name) {
      return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
    }

    function getFileExtension(item) {
      if (item.MediaType === 'Audio') return '.mp3';
      if (item.Type === 'Movie' || item.Type === 'Episode') return '.mp4';
      return '';
    }

    document.getElementById('close-download-modal').addEventListener('click', () => {
      document.getElementById('download-modal').classList.add('hidden');
    });

    // Share
    document.getElementById('share-btn').addEventListener('click', async () => {
      if (!state.selectedMedia) return;
      
      document.getElementById('download-modal-title').textContent = 'Preparing Share';
      document.getElementById('download-modal').classList.remove('hidden');
      document.getElementById('download-content').classList.remove('hidden');
      document.getElementById('download-ready').classList.add('hidden');
      
      try {
        const streamUrl = `${state.SERVER_URL}/Items/${state.selectedMedia.Id}/Download?api_key=${state.currentUser.token}`;
        const response = await fetch(streamUrl);
        
        if (!response.ok) throw new Error('Share failed');
        
        const blob = await response.blob();
        const file = new File([blob], state.selectedMedia.Name + getFileExtension(state.selectedMedia), { type: blob.type });
        
        // Show ready state with share and download buttons
        document.getElementById('download-content').classList.add('hidden');
        document.getElementById('download-ready').classList.remove('hidden');
        
        // Check if sharing is supported
        const canShare = navigator.canShare && navigator.canShare({ files: [file] });
        
        if (canShare) {
          document.getElementById('share-now-btn').classList.remove('hidden');
          document.getElementById('share-now-btn').onclick = async () => {
            try {
              await navigator.share({
                files: [file],
                title: state.selectedMedia.Name
              });
              document.getElementById('download-modal').classList.add('hidden');
              showToast('Shared successfully!');
            } catch (e) {
              if (e.name !== 'AbortError') {
                showToast('Share canceled');
              }
            }
          };
        } else {
          document.getElementById('share-now-btn').classList.add('hidden');
        }
        
        // Setup download button as fallback
        document.getElementById('confirm-download-btn').onclick = async () => {
          try {
            const ext = getFileExtension(state.selectedMedia);
            const mimeTypes = {
              '.mp3': { 'audio/mpeg': ['.mp3'] },
              '.mp4': { 'video/mp4': ['.mp4'] }
            };
            
            const handle = await window.showSaveFilePicker({
              suggestedName: sanitizeFileName(state.selectedMedia.Name) + ext,
              types: [{
                description: ext === '.mp3' ? 'Audio File' : 'Video File',
                accept: mimeTypes[ext] || { 'application/octet-stream': [ext] }
              }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            document.getElementById('download-modal').classList.add('hidden');
            showToast('File saved!');
          } catch (e) {
            if (e.name !== 'AbortError') {
              showToast('Download canceled');
            }
          }
        };
      } catch (e) {
        document.getElementById('download-modal').classList.add('hidden');
        showToast('Share failed');
      }
    });

    // Search
    document.getElementById('search-btn').addEventListener('click', () => showView('search'));

    document.getElementById('search-input').addEventListener('input', debounce(async (e) => {
      const query = e.target.value.trim();
      const results = document.getElementById('search-results');
      
      if (query.length < 2) {
        results.innerHTML = '<p class="col-span-2 text-center text-gray-500 py-12">Search for movies, TV shows, and music</p>';
        return;
      }
      
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items?SearchTerm=${encodeURIComponent(query)}&Recursive=true&Fields=PrimaryImageAspectRatio&Limit=24`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          renderSearchResults(data.Items || []);
        }
      } catch (e) {}
    }, 300));

    function debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    function renderSearchResults(items) {
      const container = document.getElementById('search-results');
      
      if (items.length === 0) {
        container.innerHTML = '<p class="col-span-2 text-center text-gray-500 py-12">No results</p>';
        return;
      }
      
      container.innerHTML = items.map(item => {
        const imageUrl = item.ImageTags?.Primary 
          ? `${state.SERVER_URL}/Items/${item.Id}/Images/Primary?maxHeight=200&tag=${item.ImageTags.Primary}`
          : null;
        
        return `
          <button class="media-card text-left" data-media-id="${item.Id}">
            <div class="relative rounded-xl overflow-hidden mb-2 aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800">
              ${imageUrl ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${imageUrl}')"></div>` : ''}
            </div>
            <p class="text-sm font-medium truncate">${item.Name}</p>
            <p class="text-xs text-gray-400">${item.Type}</p>
          </button>
        `;
      }).join('');
      
      container.querySelectorAll('[data-media-id]').forEach(btn => {
        btn.addEventListener('click', () => openMediaDetail(btn.dataset.mediaId));
      });
    }

    // Settings
    document.getElementById('autoplay-toggle').addEventListener('change', (e) => {
      settingsManager.set('autoplay', e.target.checked);
    });

    document.getElementById('skipintro-toggle').addEventListener('change', (e) => {
      settingsManager.set('skipIntro', e.target.checked);
    });

    document.getElementById('cinema-toggle').addEventListener('change', (e) => {
      settingsManager.set('cinemaMode', e.target.checked);
    });

    document.getElementById('resume-toggle').addEventListener('change', (e) => {
      settingsManager.set('resumePlayback', e.target.checked);
    });

    document.getElementById('quality-select').addEventListener('change', (e) => {
      settingsManager.set('quality', e.target.value);
    });

    document.getElementById('audio-select').addEventListener('change', (e) => {
      settingsManager.set('audioTrack', e.target.value);
    });

    document.getElementById('subtitle-select').addEventListener('change', (e) => {
      settingsManager.set('subtitleTrack', e.target.value);
    });

    document.getElementById('clear-cache-btn').addEventListener('click', () => {
      playbackStateManager.clearAll();
      showToast('Cache cleared');
    });

    document.getElementById('clear-queue-btn').addEventListener('click', () => {
      queueManager.clear();
      showToast('Queue cleared');
    });

    // Navigation
    function showView(viewName) {
      els.homeView.classList.add('hidden');
      els.browseView.classList.add('hidden');
      els.detailView.classList.add('hidden');
      els.searchView.classList.add('hidden');
      els.settingsView.classList.add('hidden');
      document.getElementById('see-all-view').classList.add('hidden');
      
      switch(viewName) {
        case 'home':
          els.homeView.classList.remove('hidden');
          break;
        case 'browse':
          els.browseView.classList.remove('hidden');
          break;
        case 'detail':
          els.detailView.classList.remove('hidden');
          break;
        case 'search':
          els.searchView.classList.remove('hidden');
          break;
        case 'settings':
          els.settingsView.classList.remove('hidden');
          break;
        case 'see-all':
          document.getElementById('see-all-view').classList.remove('hidden');
          break;
      }
      
      state.currentView = viewName;
      updateNavigation();
    }

    function updateNavigation() {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        item.classList.add('text-gray-400');
        
        if (item.dataset.view === state.currentView) {
          item.classList.add('active');
          item.classList.remove('text-gray-400');
        }
      });
    }

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => showView(item.dataset.view));
    });

    document.getElementById('back-from-browse').addEventListener('click', () => {
      if (state.browseStack.length > 1) {
        state.browseStack.pop();
        const parent = state.browseStack[state.browseStack.length - 1];
        loadBrowseContent(parent.id);
      } else {
        showView('home');
      }
    });

    document.getElementById('back-from-detail').addEventListener('click', () => {
      if (state.browseStack.length > 0) {
        showView('browse');
      } else {
        showView('home');
      }
    });

    document.getElementById('back-from-search').addEventListener('click', () => showView('home'));

    // User Menu
    document.getElementById('user-menu-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('user-menu').classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      document.getElementById('user-menu').classList.add('hidden');
    });

    document.getElementById('menu-settings').addEventListener('click', () => {
      document.getElementById('user-menu').classList.add('hidden');
      showView('settings');
    });

    document.getElementById('menu-logout').addEventListener('click', logout);
    document.getElementById('logout-btn').addEventListener('click', logout);

    function logout() {
      localStorage.removeItem('jellyfin_session');
      location.reload();
    }

    // "See All" buttons
    document.getElementById('continue-see-all').addEventListener('click', async () => {
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items/Resume?Limit=100&MediaTypes=Video&Fields=PrimaryImageAspectRatio&SortBy=DatePlayed&SortOrder=Descending`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          showSeeAllView('Continue Watching', data.Items || []);
        }
      } catch (e) {
        showToast('Failed to load items');
      }
    });

    document.getElementById('recent-see-all').addEventListener('click', async () => {
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items/Latest?Limit=100&Fields=PrimaryImageAspectRatio`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          showSeeAllView('Recently Added', data);
        }
      } catch (e) {
        showToast('Failed to load items');
      }
    });

    // Sort button for browse
    document.getElementById('browse-sort-btn').addEventListener('click', () => {
      showSortOptions('browse');
    });

    // Sort button for see all
    document.getElementById('see-all-sort-btn').addEventListener('click', () => {
      showSortOptions('see-all');
    });

    let currentSeeAllItems = [];
    let currentSortBy = 'name';
    let currentSortOrder = 'asc';

    function showSortOptions(context) {
      const modal = document.getElementById('download-modal');
      document.getElementById('download-modal-title').textContent = 'Sort By';
      modal.classList.remove('hidden');
      
      document.getElementById('download-content').innerHTML = `
        <div class="space-y-2 py-4">
          <button class="sort-option w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left px-4" data-sort="name-asc">
            <div class="flex items-center justify-between">
              <span>Name (A-Z)</span>
              ${currentSortBy === 'name' && currentSortOrder === 'asc' ? '<svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
            </div>
          </button>
          <button class="sort-option w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left px-4" data-sort="name-desc">
            <div class="flex items-center justify-between">
              <span>Name (Z-A)</span>
              ${currentSortBy === 'name' && currentSortOrder === 'desc' ? '<svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
            </div>
          </button>
          <button class="sort-option w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left px-4" data-sort="date-desc">
            <div class="flex items-center justify-between">
              <span>Date Added (Newest)</span>
              ${currentSortBy === 'date' && currentSortOrder === 'desc' ? '<svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
            </div>
          </button>
          <button class="sort-option w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left px-4" data-sort="date-asc">
            <div class="flex items-center justify-between">
              <span>Date Added (Oldest)</span>
              ${currentSortBy === 'date' && currentSortOrder === 'asc' ? '<svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
            </div>
          </button>
          <button class="sort-option w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left px-4" data-sort="year-desc">
            <div class="flex items-center justify-between">
              <span>Year (Newest)</span>
              ${currentSortBy === 'year' && currentSortOrder === 'desc' ? '<svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
            </div>
          </button>
          <button class="sort-option w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left px-4" data-sort="year-asc">
            <div class="flex items-center justify-between">
              <span>Year (Oldest)</span>
              ${currentSortBy === 'year' && currentSortOrder === 'asc' ? '<svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
            </div>
          </button>
        </div>
      `;
      document.getElementById('download-ready').classList.add('hidden');
      
      document.querySelectorAll('.sort-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const [sortBy, sortOrder] = btn.dataset.sort.split('-');
          currentSortBy = sortBy;
          currentSortOrder = sortOrder;
          
          if (context === 'see-all' && currentSeeAllItems.length > 0) {
            applySortToSeeAll();
          } else if (context === 'browse' && state.browseStack.length > 0) {
            const current = state.browseStack[state.browseStack.length - 1];
            loadBrowseContentWithSort(current.id, sortBy, sortOrder);
          }
          
          modal.classList.add('hidden');
          showToast(`Sorted by ${sortBy} (${sortOrder === 'asc' ? 'ascending' : 'descending'})`);
        });
      });
    }

    async function loadBrowseContentWithSort(parentId, sortBy, sortOrder) {
      showView('browse');
      updateBreadcrumb();
      
      const content = document.getElementById('browse-content');
      content.innerHTML = '<div class="skeleton rounded-xl h-32"></div>'.repeat(4);
      
      let sortByParam = 'SortName';
      if (sortBy === 'date') sortByParam = 'DateCreated';
      if (sortBy === 'year') sortByParam = 'ProductionYear';
      
      const sortOrderParam = sortOrder === 'desc' ? 'Descending' : 'Ascending';
      
      try {
        const response = await fetch(`${state.SERVER_URL}/Users/${state.currentUser.id}/Items?ParentId=${parentId}&SortBy=${sortByParam}&SortOrder=${sortOrderParam}&Fields=PrimaryImageAspectRatio`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          renderBrowseItems(data.Items || []);
        }
      } catch (e) {
        content.innerHTML = '<p class="text-center text-gray-500 py-12">Failed to load</p>';
      }
    }

    function applySortToSeeAll() {
      const sorted = [...currentSeeAllItems].sort((a, b) => {
        let aVal, bVal;
        
        if (currentSortBy === 'name') {
          aVal = a.Name?.toLowerCase() || '';
          bVal = b.Name?.toLowerCase() || '';
        } else if (currentSortBy === 'date') {
          aVal = new Date(a.DateCreated || 0).getTime();
          bVal = new Date(b.DateCreated || 0).getTime();
        } else if (currentSortBy === 'year') {
          aVal = a.ProductionYear || 0;
          bVal = b.ProductionYear || 0;
        }
        
        if (currentSortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
      
      renderSeeAllItems(sorted);
    }

    function showSeeAllView(title, items) {
      currentSeeAllItems = items;
      currentSortBy = 'name';
      currentSortOrder = 'asc';
      
      document.getElementById('see-all-title').textContent = title;
      showView('see-all');
      
      applySortToSeeAll();
    }

    function renderSeeAllItems(items) {
      const content = document.getElementById('see-all-content');
      
      if (items.length === 0) {
        content.innerHTML = '<p class="text-center text-gray-500 py-12">No items found</p>';
        return;
      }
      
      content.innerHTML = `<div class="grid grid-cols-2 gap-3">${items.map(item => {
        const progress = item.UserData?.PlayedPercentage || 0;
        const imageUrl = item.ImageTags?.Primary 
          ? `${state.SERVER_URL}/Items/${item.Id}/Images/Primary?maxHeight=300&tag=${item.ImageTags.Primary}`
          : null;
        
        return `
          <button class="media-card text-left" data-media-id="${item.Id}">
            <div class="relative rounded-xl overflow-hidden mb-2 aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800">
              ${imageUrl ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${imageUrl}')"></div>` : ''}
              ${progress > 0 ? `
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div class="progress-bar h-full" style="width: ${progress}%"></div>
                </div>
              ` : ''}
            </div>
            <p class="text-sm font-medium truncate">${item.Name}</p>
            <p class="text-xs text-gray-400 truncate">${item.SeriesName || item.ProductionYear || item.Type || ''}</p>
          </button>
        `;
      }).join('')}</div>`;
      
      content.querySelectorAll('[data-media-id]').forEach(btn => {
        btn.addEventListener('click', () => openMediaDetail(btn.dataset.mediaId));
      });
    }

    document.getElementById('back-from-see-all').addEventListener('click', () => {
      showView('home');
    });

    // Check saved session
    function checkSavedSession() {
      const saved = localStorage.getItem('jellyfin_session');
      if (saved) {
        try {
          state.currentUser = JSON.parse(saved);
          showDashboard();
          loadHomeContent();
        } catch (e) {
          localStorage.removeItem('jellyfin_session');
        }
      }
    }

    // Format time helper
    function formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '0:00';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      return `${m}:${String(s).padStart(2, '0')}`;
    }

    // Initialize
    checkSavedSession();
  
