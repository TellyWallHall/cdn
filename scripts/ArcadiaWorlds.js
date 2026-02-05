
    // ==================== App State ====================
    const APP = {
      servers: [
        { name: 'Oasis Archive', url: 'https://jelly.oasis-archive.org', token: null, userId: null },
        { name: "Jade's Worlds", url: 'https://jelly.jadesworlds.com', token: null, userId: null }
      ],
      username: '',
      currentTab: 'home',
      currentNestedTab: 'video',
      currentAudioTab: 'songs',
      searchFilter: 'all',
      accentColor: '#8b5cf6',
      quality: 'auto',
      library: {
        movies: [],
        tvshows: [],
        music: [],
        audiobooks: [],
        all: []
      },
      downloads: [],
      favorites: [],
      watchHistory: [],
      currentMedia: null,
      isPlaying: false,
      currentLibraryPath: [],
      libraryCache: {}
    };

    // ==================== Local Storage ====================
    const Storage = {
      save(key, value) {
        try {
          localStorage.setItem(`arcadia_${key}`, JSON.stringify(value));
        } catch (e) {
          console.error('Storage save error:', e);
        }
      },
      load(key, defaultValue = null) {
        try {
          const item = localStorage.getItem(`arcadia_${key}`);
          return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
          return defaultValue;
        }
      },
      remove(key) {
        localStorage.removeItem(`arcadia_${key}`);
      }
    };

    // ==================== Zip Helper ====================
    class ZipWriter {
      constructor() {
        this.entries = [];
      }
      
      addFile(name, blob) {
        this.entries.push({ name, blob });
      }
      
      async getBlob() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        
        return new Promise((resolve) => {
          script.onload = async () => {
            const JSZip = window.JSZip;
            const zip = new JSZip();
            
            for (const entry of this.entries) {
              zip.file(entry.name, entry.blob);
            }
            
            const blob = await zip.generateAsync({ type: 'blob' });
            resolve(blob);
          };
          
          document.head.appendChild(script);
        });
      }
    }

    // ==================== API Functions ====================
    const API = {
      async authenticate(serverIndex, username, password) {
        const server = APP.servers[serverIndex];
        try {
          const response = await fetch(`${server.url}/Users/AuthenticateByName`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Emby-Authorization': `MediaBrowser Client="Arcadia Worlds", Device="Web", DeviceId="${this.getDeviceId()}", Version="1.0.0"`
            },
            body: JSON.stringify({ Username: username, Pw: password })
          });
          
          if (!response.ok) throw new Error('Authentication failed');
          
          const data = await response.json();
          server.token = data.AccessToken;
          server.userId = data.User.Id;
          return true;
        } catch (e) {
          console.error(`Auth error for ${server.name}:`, e);
          return false;
        }
      },
      
      getDeviceId() {
        let deviceId = Storage.load('deviceId');
        if (!deviceId) {
          deviceId = 'arcadia_' + Math.random().toString(36).substr(2, 9);
          Storage.save('deviceId', deviceId);
        }
        return deviceId;
      },
      
      getHeaders(serverIndex) {
        const server = APP.servers[serverIndex];
        return {
          'X-Emby-Authorization': `MediaBrowser Client="Arcadia Worlds", Device="Web", DeviceId="${this.getDeviceId()}", Version="1.0.0", Token="${server.token}"`
        };
      },
      
      async fetchLibraryPaginated(serverIndex, callback) {
        const server = APP.servers[serverIndex];
        if (!server.token) return;
        
        let startIndex = 0;
        const limit = 100;
        let hasMore = true;
        
        try {
          while (hasMore) {
            const response = await fetch(
              `${server.url}/Users/${server.userId}/Items?Recursive=true&IncludeItemTypes=Movie,Series,MusicAlbum,Audio,AudioBook,MusicArtist&Fields=Overview,Genres,People,MediaSources,ParentId,AlbumArtist,Artists&SortBy=DateCreated&SortOrder=Descending&StartIndex=${startIndex}&Limit=${limit}`,
              { headers: this.getHeaders(serverIndex) }
            );
            
            if (!response.ok) throw new Error('Failed to fetch library');
            
            const data = await response.json();
            const items = data.Items.map(item => ({ ...item, serverIndex, serverName: server.name }));
            
            if (items.length > 0) {
              callback(items);
            }
            
            hasMore = startIndex + limit < data.TotalRecordCount;
            startIndex += limit;
          }
        } catch (e) {
          console.error(`Fetch library error for ${server.name}:`, e);
        }
      },
      
      async fetchFolders(serverIndex, parentId = null) {
        const server = APP.servers[serverIndex];
        if (!server.token) return [];
        
        try {
          let url = `${server.url}/Users/${server.userId}/Items`;
          if (parentId) {
            url += `?ParentId=${parentId}`;
          }
          url += parentId ? '&' : '?';
          url += 'Fields=Overview,Genres,MediaSources&SortBy=SortName&SortOrder=Ascending';
          
          const response = await fetch(url, { headers: this.getHeaders(serverIndex) });
          if (!response.ok) throw new Error('Failed to fetch folders');
          
          const data = await response.json();
          return data.Items.map(item => ({ ...item, serverIndex, serverName: server.name }));
        } catch (e) {
          console.error(`Fetch folders error:`, e);
          return [];
        }
      },
      
      async fetchEpisodes(serverIndex, seriesId) {
        const server = APP.servers[serverIndex];
        if (!server.token) return [];
        
        try {
          const response = await fetch(
            `${server.url}/Shows/${seriesId}/Episodes?UserId=${server.userId}&Fields=Overview,MediaSources`,
            { headers: this.getHeaders(serverIndex) }
          );
          
          if (!response.ok) throw new Error('Failed to fetch episodes');
          
          const data = await response.json();
          return data.Items.map(item => ({ ...item, serverIndex, serverName: server.name }));
        } catch (e) {
          console.error('Fetch episodes error:', e);
          return [];
        }
      },
      
      async search(query) {
        const results = [];
        for (let i = 0; i < APP.servers.length; i++) {
          const server = APP.servers[i];
          if (!server.token) continue;
          
          try {
            const response = await fetch(
              `${server.url}/Users/${server.userId}/Items?SearchTerm=${encodeURIComponent(query)}&Recursive=true&Fields=Overview,Genres&Limit=50`,
              { headers: this.getHeaders(i) }
            );
            
            if (response.ok) {
              const data = await response.json();
              results.push(...data.Items.map(item => ({ ...item, serverIndex: i, serverName: server.name })));
            }
          } catch (e) {
            console.error(`Search error for ${server.name}:`, e);
          }
        }
        return results;
      },
      
      getImageUrl(item, type = 'Primary', maxWidth = 400) {
        const server = APP.servers[item.serverIndex];
        if (!server || !item.ImageTags || !item.ImageTags[type]) {
          return null;
        }
        return `${server.url}/Items/${item.Id}/Images/${type}?maxWidth=${maxWidth}&tag=${item.ImageTags[type]}`;
      },
      
      getStreamUrl(item) {
        const server = APP.servers[item.serverIndex];
        if (!server || !server.token) return null;
        
        const quality = APP.quality === 'auto' ? '' : `&MaxStreamingBitrate=${APP.quality === '1080' ? 40000000 : APP.quality === '720' ? 20000000 : 10000000}`;
        return `${server.url}/Videos/${item.Id}/stream?static=true&api_key=${server.token}${quality}`;
      },
      
      getAudioStreamUrl(item) {
        const server = APP.servers[item.serverIndex];
        if (!server || !server.token) return null;
        return `${server.url}/Audio/${item.Id}/stream?static=true&api_key=${server.token}`;
      },
      
      async downloadFile(item) {
        const server = APP.servers[item.serverIndex];
        if (!server || !server.token) return null;
        
        const isVideo = ['Movie', 'Episode', 'Series'].includes(item.Type);
        const url = isVideo ? this.getStreamUrl(item) : this.getAudioStreamUrl(item);
        
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
          if (!response.ok) throw new Error('Download failed');
          return await response.blob();
        } catch (e) {
          console.error('Download error:', e);
          return null;
        }
      },
      
      async getAlbumTracks(serverIndex, albumId) {
        const server = APP.servers[serverIndex];
        if (!server.token) return [];
        
        try {
          const response = await fetch(
            `${server.url}/Users/${server.userId}/Items?ParentId=${albumId}&Fields=Overview&SortBy=IndexNumber`,
            { headers: this.getHeaders(serverIndex) }
          );
          
          if (!response.ok) throw new Error('Failed to fetch album tracks');
          
          const data = await response.json();
          return data.Items.map(item => ({ ...item, serverIndex, serverName: server.name }));
        } catch (e) {
          console.error('Fetch album tracks error:', e);
          return [];
        }
      },
      
      async getArtistAlbums(serverIndex, artistId, artistName) {
        const server = APP.servers[serverIndex];
        if (!server.token) return [];
        
        try {
          const response = await fetch(
            `${server.url}/Users/${server.userId}/Items?ArtistIds=${artistId}&IncludeItemTypes=MusicAlbum&Fields=Overview&Recursive=true&Limit=200`,
            { headers: this.getHeaders(serverIndex) }
          );
          
          if (!response.ok) throw new Error('Failed to fetch artist albums');
          
          const data = await response.json();
          return data.Items.map(item => ({ ...item, serverIndex, serverName: server.name }));
        } catch (e) {
          console.error('Fetch artist albums error:', e);
          return [];
        }
      }
    };

    // ==================== UI Functions ====================
    const UI = {
      showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toast-icon');
        const msg = document.getElementById('toast-message');
        
        msg.textContent = message;
        icon.className = type === 'success' ? 'fas fa-check-circle text-green-400 text-xl' :
                        type === 'error' ? 'fas fa-exclamation-circle text-red-400 text-xl' :
                        'fas fa-info-circle text-blue-400 text-xl';
        
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
      },
      
      setAccentColor(color) {
        APP.accentColor = color;
        document.documentElement.style.setProperty('--accent-color', color);
        Storage.save('accentColor', color);
        
        document.querySelectorAll('.accent-color').forEach(btn => {
          btn.classList.toggle('ring-2', btn.dataset.color === color);
          btn.classList.toggle('ring-white', btn.dataset.color === color);
          btn.classList.toggle('ring-offset-2', btn.dataset.color === color);
        });
      },
      
      switchTab(tab) {
        APP.currentTab = tab;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`tab-${tab}`).classList.remove('hidden');
        
        document.querySelectorAll('.nav-tab').forEach(btn => {
          const isActive = btn.dataset.tab === tab;
          btn.classList.toggle('text-violet-400', isActive);
          btn.classList.toggle('text-gray-500', !isActive);
        });
        
        if (tab === 'library' && APP.currentLibraryPath.length === 0) {
          this.loadLibraryRoot();
        }
      },
      
      switchNestedTab(tab) {
        APP.currentNestedTab = tab;
        document.querySelectorAll('.nested-tab').forEach(btn => {
          const isActive = btn.dataset.nested === tab;
          btn.classList.toggle('nested-tab-active', isActive);
          btn.classList.toggle('text-gray-400', !isActive);
        });
        
        document.querySelectorAll('.nested-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`nested-${tab}`).classList.remove('hidden');
      },
      
      switchAudioTab(tab) {
        APP.currentAudioTab = tab;
        document.querySelectorAll('.audio-tab').forEach(btn => {
          const isActive = btn.dataset.audio === tab;
          btn.classList.toggle('border-b-2', isActive);
          btn.classList.toggle('border-violet-500', isActive);
          btn.classList.toggle('text-white', isActive);
          btn.classList.toggle('text-gray-400', !isActive);
        });
        
        document.querySelectorAll('.audio-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`audio-${tab}`).classList.remove('hidden');
      },
      
      createMediaCard(item, size = 'medium') {
        const imageUrl = API.getImageUrl(item);
        const sizeClasses = {
          small: 'w-24 h-36',
          medium: 'w-32 h-48',
          large: 'w-40 h-60'
        };
        
        const card = document.createElement('div');
        card.className = `media-card ${sizeClasses[size]} flex-shrink-0 rounded-xl overflow-hidden relative cursor-pointer carousel-item`;
        card.innerHTML = `
          <div class="absolute inset-0 ${imageUrl ? 'bg-cover bg-center' : 'bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center'}" 
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ''}>
            ${!imageUrl ? `<i class="fas ${item.Type === 'Movie' ? 'fa-film' : item.Type === 'Series' ? 'fa-tv' : 'fa-music'} text-3xl opacity-50"></i>` : ''}
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <div class="absolute bottom-0 left-0 right-0 p-2">
            <p class="text-xs font-medium line-clamp-2">${item.Name}</p>
            <p class="text-xs text-gray-400">${item.ProductionYear || ''}</p>
          </div>
          ${item.UserData?.PlaybackPositionTicks ? `
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div class="h-full progress-bar" style="width: ${(item.UserData.PlaybackPositionTicks / item.RunTimeTicks * 100)}%"></div>
            </div>
          ` : ''}
        `;
        
        card.addEventListener('click', () => this.showMediaDetail(item));
        return card;
      },
      
      createSongRow(item, index) {
        const imageUrl = API.getImageUrl(item);
        const duration = item.RunTimeTicks ? this.formatDuration(item.RunTimeTicks) : '';
        
        const row = document.createElement('div');
        row.className = 'flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors';
        row.innerHTML = `
          <span class="w-6 text-center text-gray-500 text-sm">${index + 1}</span>
          <div class="w-10 h-10 rounded-lg flex-shrink-0 ${imageUrl ? 'bg-cover bg-center' : 'bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center'}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ''}>
            ${!imageUrl ? '<i class="fas fa-music text-sm opacity-50"></i>' : ''}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${item.Name}</p>
            <p class="text-xs text-gray-400 truncate">${item.AlbumArtist || item.Artists?.join(', ') || 'Unknown Artist'}</p>
          </div>
          <span class="text-xs text-gray-500">${duration}</span>
          <button class="song-menu w-8 h-8 flex items-center justify-center text-gray-500">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        `;
        
        row.addEventListener('click', (e) => {
          if (!e.target.closest('.song-menu')) {
            this.playMedia(item);
          }
        });
        
        return row;
      },
      
      createAlbumCard(item) {
        const imageUrl = API.getImageUrl(item);
        
        const card = document.createElement('div');
        card.className = 'cursor-pointer';
        card.innerHTML = `
          <div class="aspect-square rounded-xl overflow-hidden ${imageUrl ? 'bg-cover bg-center' : 'bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center'}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ''}>
            ${!imageUrl ? '<i class="fas fa-compact-disc text-3xl opacity-50"></i>' : ''}
          </div>
          <p class="text-sm font-medium mt-2 line-clamp-1">${item.Name}</p>
          <p class="text-xs text-gray-400 line-clamp-1">${item.AlbumArtist || 'Unknown Artist'}</p>
        `;
        
        card.addEventListener('click', () => this.showMediaDetail(item));
        return card;
      },
      
      createArtistCard(item) {
        const imageUrl = API.getImageUrl(item);
        
        const card = document.createElement('div');
        card.className = 'cursor-pointer text-center';
        card.innerHTML = `
          <div class="aspect-square rounded-full overflow-hidden mx-auto ${imageUrl ? 'bg-cover bg-center' : 'bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center'}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ''}>
            ${!imageUrl ? '<i class="fas fa-user text-xl opacity-50"></i>' : ''}
          </div>
          <p class="text-xs font-medium mt-2 line-clamp-1">${item.Name}</p>
        `;
        
        card.addEventListener('click', () => this.showMediaDetail(item));
        return card;
      },
      
      formatDuration(ticks) {
        const seconds = Math.floor(ticks / 10000000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      },
      
      formatDurationLong(ticks) {
        const seconds = Math.floor(ticks / 10000000);
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
          return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
      },
      
      async loadLibraryRoot() {
        const container = document.getElementById('library-folders');
        container.innerHTML = '<div class="shimmer h-12 rounded-xl"></div>'.repeat(4);
        
        // Load root folders from both servers
        const folders = [];
        for (let i = 0; i < APP.servers.length; i++) {
          const serverFolders = await API.fetchFolders(i);
          folders.push(...serverFolders);
        }
        
        container.innerHTML = '';
        folders.forEach(folder => {
          const item = this.createFolderItem(folder);
          container.appendChild(item);
        });
        
        if (folders.length === 0) {
          container.innerHTML = '<p class="text-gray-500 text-center py-8">No folders found</p>';
        }
      },
      
      createFolderItem(item) {
        const isPlayable = ['Movie', 'Episode', 'Audio', 'AudioBook'].includes(item.Type);
        const imageUrl = API.getImageUrl(item, 'Primary', 100);
        
        const div = document.createElement('div');
        div.className = 'folder-item flex items-center gap-3 p-3 rounded-xl cursor-pointer';
        div.innerHTML = `
          <div class="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${imageUrl ? 'bg-cover bg-center' : 'bg-white/5'}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ''}>
            ${!imageUrl ? `<i class="fas ${this.getIconForType(item.Type)} text-lg text-gray-400"></i>` : ''}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">${item.Name}</p>
            <p class="text-xs text-gray-400">${item.Type} • ${item.serverName}</p>
          </div>
          <i class="fas ${isPlayable ? 'fa-play' : 'fa-chevron-right'} text-gray-500"></i>
        `;
        
        div.addEventListener('click', () => {
          if (isPlayable) {
            this.playMedia(item);
          } else {
            this.navigateToFolder(item);
          }
        });
        
        return div;
      },
      
      getIconForType(type) {
        const icons = {
          'Folder': 'fa-folder',
          'CollectionFolder': 'fa-folder',
          'Movie': 'fa-film',
          'Series': 'fa-tv',
          'Season': 'fa-layer-group',
          'Episode': 'fa-play-circle',
          'MusicAlbum': 'fa-compact-disc',
          'MusicArtist': 'fa-user',
          'Audio': 'fa-music',
          'AudioBook': 'fa-book'
        };
        return icons[type] || 'fa-file';
      },
      
      async navigateToFolder(item) {
        APP.currentLibraryPath.push(item);
        this.updateBreadcrumb();
        
        const container = document.getElementById('library-folders');
        container.innerHTML = '<div class="shimmer h-12 rounded-xl"></div>'.repeat(4);
        
        const folders = await API.fetchFolders(item.serverIndex, item.Id);
        
        container.innerHTML = '';
        folders.forEach(folder => {
          const folderItem = this.createFolderItem(folder);
          container.appendChild(folderItem);
        });
        
        if (folders.length === 0) {
          container.innerHTML = '<p class="text-gray-500 text-center py-8">No items found</p>';
        }
      },
      
      updateBreadcrumb() {
        const breadcrumb = document.getElementById('library-breadcrumb');
        breadcrumb.innerHTML = `
          <button class="breadcrumb-item text-violet-400 whitespace-nowrap" data-path="root">
            <i class="fas fa-home"></i> Library
          </button>
        `;
        
        APP.currentLibraryPath.forEach((item, index) => {
          breadcrumb.innerHTML += `
            <i class="fas fa-chevron-right text-gray-600 text-xs"></i>
            <button class="breadcrumb-item text-gray-300 hover:text-white whitespace-nowrap" data-path="${index}">
              ${item.Name}
            </button>
          `;
        });
        
        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(btn => {
          btn.addEventListener('click', () => {
            const path = btn.dataset.path;
            if (path === 'root') {
              APP.currentLibraryPath = [];
              this.loadLibraryRoot();
            } else {
              const index = parseInt(path);
              APP.currentLibraryPath = APP.currentLibraryPath.slice(0, index + 1);
              this.navigateToFolder(APP.currentLibraryPath[index]);
            }
            this.updateBreadcrumb();
          });
        });
      },
      
      async showMediaDetail(item) {
        const modal = document.getElementById('detail-modal');
        const backdrop = document.getElementById('detail-backdrop');
        const poster = document.getElementById('detail-poster');
        
        const backdropUrl = API.getImageUrl(item, 'Backdrop', 800) || API.getImageUrl(item, 'Primary', 800);
        const posterUrl = API.getImageUrl(item);
        
        backdrop.style.backgroundImage = backdropUrl ? `url('${backdropUrl}')` : 'linear-gradient(135deg, #4c1d95, #7c3aed)';
        poster.style.backgroundImage = posterUrl ? `url('${posterUrl}')` : '';
        
        document.getElementById('detail-title').textContent = item.Name;
        document.getElementById('detail-meta').textContent = `${item.ProductionYear || ''} ${item.RunTimeTicks ? '• ' + this.formatDurationLong(item.RunTimeTicks) : ''}`;
        document.getElementById('detail-rating').innerHTML = item.CommunityRating ? 
          `<i class="fas fa-star text-yellow-400 text-sm"></i><span class="text-sm">${item.CommunityRating.toFixed(1)}</span>` : '';
        document.getElementById('detail-overview').textContent = item.Overview || 'No description available.';
        
        // Genres
        const genresContainer = document.getElementById('detail-genres');
        genresContainer.innerHTML = (item.Genres || []).map(g => 
          `<span class="px-2 py-1 bg-white/10 rounded-full text-xs">${g}</span>`
        ).join('');
        
        // Hide all content sections first
        document.getElementById('detail-episodes-section').classList.add('hidden');
        document.getElementById('detail-tracks-section').classList.add('hidden');
        document.getElementById('detail-artist-albums-section').classList.add('hidden');
        document.getElementById('detail-artist-songs-section').classList.add('hidden');
        document.getElementById('detail-cast-section').classList.add('hidden');
        
        // Episodes for TV Shows
        if (item.Type === 'Series') {
          document.getElementById('detail-episodes-section').classList.remove('hidden');
          const episodesContainer = document.getElementById('detail-episodes');
          episodesContainer.innerHTML = '<div class="shimmer h-16 rounded-xl"></div>'.repeat(3);
          
          const episodes = await API.fetchEpisodes(item.serverIndex, item.Id);
          episodesContainer.innerHTML = '';
          
          episodes.forEach(ep => {
            const epDiv = document.createElement('div');
            epDiv.className = 'flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors';
            const epImage = API.getImageUrl(ep, 'Primary', 200);
            epDiv.innerHTML = `
              <div class="w-24 h-14 rounded-lg flex-shrink-0 ${epImage ? 'bg-cover bg-center' : 'bg-white/10 flex items-center justify-center'}"
                   ${epImage ? `style="background-image: url('${epImage}')"` : ''}>
                ${!epImage ? '<i class="fas fa-play"></i>' : ''}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm">S${ep.ParentIndexNumber || 1}E${ep.IndexNumber || 1}: ${ep.Name}</p>
                <p class="text-xs text-gray-400 line-clamp-1">${ep.Overview || ''}</p>
              </div>
              ${ep.UserData?.PlaybackPositionTicks ? `
                <div class="w-16">
                  <div class="h-1 bg-white/20 rounded-full">
                    <div class="h-full progress-bar rounded-full" style="width: ${(ep.UserData.PlaybackPositionTicks / ep.RunTimeTicks * 100)}%"></div>
                  </div>
                </div>
              ` : ''}
            `;
            epDiv.addEventListener('click', () => {
              this.playMedia(ep);
              modal.classList.add('hidden');
            });
            episodesContainer.appendChild(epDiv);
          });
        }
        
        // Tracks for Albums
        if (item.Type === 'MusicAlbum') {
          document.getElementById('detail-tracks-section').classList.remove('hidden');
          const tracksContainer = document.getElementById('detail-tracks');
          tracksContainer.innerHTML = '<div class="shimmer h-12 rounded-xl"></div>'.repeat(3);
          
          const tracks = await API.getAlbumTracks(item.serverIndex, item.Id);
          tracksContainer.innerHTML = '';
          
          tracks.forEach((track, index) => {
            const trackDiv = this.createSongRow(track, index);
            trackDiv.classList.add('bg-white/5');
            tracksContainer.appendChild(trackDiv);
          });
        }
        
        // Albums and Songs for Artists
        if (item.Type === 'MusicArtist') {
          document.getElementById('detail-artist-albums-section').classList.remove('hidden');
          document.getElementById('detail-artist-songs-section').classList.remove('hidden');
          
          // Load artist albums
          const albumsContainer = document.getElementById('detail-artist-albums');
          albumsContainer.innerHTML = '<div class="shimmer h-32 rounded-xl"></div>'.repeat(3);
          
          const albums = await API.getArtistAlbums(item.serverIndex, item.Id, item.Name);
          albumsContainer.innerHTML = '';
          
          if (albums.length === 0) {
            albumsContainer.innerHTML = '<p class="text-gray-500 text-sm col-span-3">No albums found</p>';
          } else {
            albums.slice(0, 12).forEach(album => {
              albumsContainer.appendChild(this.createArtistAlbumCard(album));
            });
          }
          
          // Load songs from artist's albums
          const songsContainer = document.getElementById('detail-artist-songs');
          songsContainer.innerHTML = '<div class="shimmer h-12 rounded-xl"></div>'.repeat(5);
          
          const allSongs = [];
          for (const album of albums.slice(0, 5)) {
            const tracks = await API.getAlbumTracks(item.serverIndex, album.Id);
            allSongs.push(...tracks);
          }
          
          songsContainer.innerHTML = '';
          if (allSongs.length === 0) {
            songsContainer.innerHTML = '<p class="text-gray-500 text-sm">No songs found</p>';
          } else {
            allSongs.slice(0, 20).forEach((song, index) => {
              const songRow = this.createSongRow(song, index);
              songRow.classList.add('bg-white/5');
              songsContainer.appendChild(songRow);
            });
          }
        }
        
        // Cast for videos
        if (['Movie', 'Series', 'Episode'].includes(item.Type)) {
          document.getElementById('detail-cast-section').classList.remove('hidden');
          const castContainer = document.getElementById('detail-cast');
          castContainer.innerHTML = (item.People || []).slice(0, 10).map(person => {
            return `
              <div class="flex-shrink-0 text-center w-16">
                <div class="w-14 h-14 rounded-full bg-white/10 mx-auto flex items-center justify-center">
                  <i class="fas fa-user text-gray-500"></i>
                </div>
                <p class="text-xs mt-1 line-clamp-1">${person.Name}</p>
                <p class="text-xs text-gray-500 line-clamp-1">${person.Role || person.Type}</p>
              </div>
            `;
          }).join('');
        }
        
        // Store current item for actions
        modal.dataset.itemId = item.Id;
        modal.dataset.serverIndex = item.serverIndex;
        APP.detailItem = item;
        
        modal.classList.remove('hidden');
      },
      
      createArtistAlbumCard(item) {
        const imageUrl = API.getImageUrl(item);
        
        const card = document.createElement('div');
        card.className = 'cursor-pointer text-center';
        card.innerHTML = `
          <div class="aspect-square rounded-xl overflow-hidden ${imageUrl ? 'bg-cover bg-center' : 'bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center'}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ''}>
            ${!imageUrl ? '<i class="fas fa-compact-disc text-2xl opacity-50"></i>' : ''}
          </div>
          <p class="text-xs font-medium mt-2 line-clamp-1">${item.Name}</p>
          <p class="text-xs text-gray-400 line-clamp-1">${item.ProductionYear || ''}</p>
        `;
        
        card.addEventListener('click', () => this.showMediaDetail(item));
        return card;
      },
      
      playMedia(item) {
        APP.currentMedia = item;
        const isVideo = ['Movie', 'Episode', 'Series'].includes(item.Type);
        
        // Update mini player
        const miniPlayer = document.getElementById('mini-player');
        const miniThumb = document.getElementById('mini-thumb');
        const miniTitle = document.getElementById('mini-title');
        const miniArtist = document.getElementById('mini-artist');
        
        const imageUrl = API.getImageUrl(item);
        miniThumb.style.backgroundImage = imageUrl ? `url('${imageUrl}')` : '';
        miniTitle.textContent = item.Name;
        miniArtist.textContent = item.AlbumArtist || item.SeriesName || item.serverName;
        
        miniPlayer.classList.remove('hidden');
        
        // Update full player
        const playerBg = document.getElementById('player-bg');
        const playerArtwork = document.getElementById('player-artwork');
        const playerTitle = document.getElementById('player-title');
        const playerArtist = document.getElementById('player-artist');
        
        const backdropUrl = API.getImageUrl(item, 'Backdrop', 800) || API.getImageUrl(item, 'Primary', 800);
        playerBg.style.backgroundImage = backdropUrl ? `url('${backdropUrl}')` : '';
        playerArtwork.style.backgroundImage = imageUrl ? `url('${imageUrl}')` : '';
        playerTitle.textContent = item.Name;
        playerArtist.textContent = item.AlbumArtist || item.SeriesName || '';
        
        document.getElementById('player-source-name').textContent = item.serverName;
        
        // Show/hide video container
        const videoContainer = document.getElementById('video-container');
        const audioArtworkContainer = document.getElementById('audio-artwork-container');
        const videoPlayer = document.getElementById('video-player');
        
        if (isVideo) {
          videoContainer.classList.remove('hidden');
          audioArtworkContainer.classList.add('hidden');
          videoPlayer.src = API.getStreamUrl(item);
          videoPlayer.play();
        } else {
          videoContainer.classList.add('hidden');
          audioArtworkContainer.classList.remove('hidden');
          // Create audio element if needed
          if (!APP.audioElement) {
            APP.audioElement = new Audio();
            APP.audioElement.addEventListener('timeupdate', () => this.updateProgress());
            APP.audioElement.addEventListener('ended', () => this.handleMediaEnd());
          }
          APP.audioElement.src = API.getAudioStreamUrl(item);
          APP.audioElement.play();
        }
        
        APP.isPlaying = true;
        this.updatePlayButton();
        this.addToWatchHistory(item);
      },
      
      togglePlay() {
        const isVideo = APP.currentMedia && ['Movie', 'Episode', 'Series'].includes(APP.currentMedia.Type);
        const media = isVideo ? document.getElementById('video-player') : APP.audioElement;
        
        if (!media) return;
        
        if (APP.isPlaying) {
          media.pause();
        } else {
          media.play();
        }
        APP.isPlaying = !APP.isPlaying;
        this.updatePlayButton();
      },
      
      updatePlayButton() {
        const miniPlay = document.getElementById('mini-play');
        const playerPlay = document.getElementById('player-play');
        const icon = APP.isPlaying ? 'fa-pause' : 'fa-play';
        
        miniPlay.innerHTML = `<i class="fas ${icon}"></i>`;
        playerPlay.innerHTML = `<i class="fas ${icon} text-2xl"></i>`;
      },
      
      updateProgress() {
        const isVideo = APP.currentMedia && ['Movie', 'Episode', 'Series'].includes(APP.currentMedia.Type);
        const media = isVideo ? document.getElementById('video-player') : APP.audioElement;
        
        if (!media || !media.duration) return;
        
        const progress = (media.currentTime / media.duration) * 100;
        document.getElementById('mini-progress').style.width = `${progress}%`;
        document.getElementById('player-seek').value = progress;
        document.getElementById('player-current').textContent = this.formatTime(media.currentTime);
        document.getElementById('player-duration').textContent = this.formatTime(media.duration);
      },
      
      formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      },
      
      handleMediaEnd() {
        APP.isPlaying = false;
        this.updatePlayButton();
      },
      
      seekTo(percent) {
        const isVideo = APP.currentMedia && ['Movie', 'Episode', 'Series'].includes(APP.currentMedia.Type);
        const media = isVideo ? document.getElementById('video-player') : APP.audioElement;
        
        if (!media || !media.duration) return;
        
        media.currentTime = (percent / 100) * media.duration;
      },
      
      addToWatchHistory(item) {
        const existing = APP.watchHistory.findIndex(h => h.Id === item.Id);
        if (existing > -1) {
          APP.watchHistory.splice(existing, 1);
        }
        APP.watchHistory.unshift({
          Id: item.Id,
          Name: item.Name,
          Type: item.Type,
          timestamp: Date.now(),
          serverIndex: item.serverIndex
        });
        
        if (APP.watchHistory.length > 50) {
          APP.watchHistory = APP.watchHistory.slice(0, 50);
        }
        
        Storage.save('watchHistory', APP.watchHistory);
        this.updateWatchHistory();
      },
      
      updateWatchHistory() {
        const container = document.getElementById('watch-history');
        if (APP.watchHistory.length === 0) {
          container.innerHTML = '<p class="text-gray-500 text-sm">No watch history yet</p>';
          return;
        }
        
        container.innerHTML = APP.watchHistory.slice(0, 10).map(item => `
          <div class="flex items-center gap-3 py-2">
            <i class="fas ${this.getIconForType(item.Type)} text-gray-500 w-6 text-center"></i>
            <div class="flex-1 min-w-0">
              <p class="text-sm truncate">${item.Name}</p>
              <p class="text-xs text-gray-500">${new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
          </div>
        `).join('');
      },
      
      toggleFavorite(item) {
        const existing = APP.favorites.findIndex(f => f.Id === item.Id);
        if (existing > -1) {
          APP.favorites.splice(existing, 1);
          this.showToast('Removed from favorites');
        } else {
          APP.favorites.unshift({
            Id: item.Id,
            Name: item.Name,
            Type: item.Type,
            serverIndex: item.serverIndex,
            ImageTags: item.ImageTags
          });
          this.showToast('Added to favorites');
        }
        
        Storage.save('favorites', APP.favorites);
        this.updateFavorites();
      },
      
      updateFavorites() {
        const container = document.getElementById('favorites-list');
        if (APP.favorites.length === 0) {
          container.innerHTML = '<p class="text-gray-500 text-sm">No favorites yet</p>';
          return;
        }
        
        container.innerHTML = '';
        APP.favorites.slice(0, 10).forEach(item => {
          const card = this.createMediaCard(item, 'small');
          container.appendChild(card);
        });
      },
      
      async startDownload(item) {
        const existingIndex = APP.downloads.findIndex(d => d.Id === item.Id);
        if (existingIndex > -1) {
          this.showToast('Already downloading or downloaded', 'info');
          return;
        }
        
        // Determine if this is a container (needs zipping)
        const isContainer = ['Series', 'MusicAlbum', 'MusicArtist', 'AudioBook'].includes(item.Type);
        let fileCount = 1;
        let files = [];
        
        const download = {
          Id: item.Id,
          Name: item.Name,
          Type: item.Type,
          serverIndex: item.serverIndex,
          ImageTags: item.ImageTags,
          status: 'downloading',
          progress: 0,
          blob: null,
          isContainer: isContainer,
          fileCount: fileCount
        };
        
        APP.downloads.push(download);
        this.updateDownloadsList();
        this.updateDownloadsBadge();
        this.showToast(`Download started for ${item.Name}`);
        
        try {
          if (!isContainer) {
            // Single file download
            const blob = await API.downloadFile(item);
            if (blob) {
              download.blob = blob;
              download.status = 'ready';
              download.progress = 100;
              this.updateDownloadsList();
              this.updateDownloadsBadge();
              this.showToast(`${item.Name} ready to save`);
            } else {
              download.status = 'error';
              this.updateDownloadsList();
              this.showToast('Download failed', 'error');
            }
          } else {
            // Container - get files and zip them
            let itemsToDownload = [];
            
            if (item.Type === 'Series') {
              itemsToDownload = await API.fetchEpisodes(item.serverIndex, item.Id);
            } else if (item.Type === 'MusicAlbum') {
              itemsToDownload = await API.getAlbumTracks(item.serverIndex, item.Id);
            } else if (item.Type === 'MusicArtist') {
              const albums = await API.getArtistAlbums(item.serverIndex, item.Id);
              // For each album, get tracks
              for (const album of albums) {
                const tracks = await API.getAlbumTracks(item.serverIndex, album.Id);
                itemsToDownload.push(...tracks);
              }
            }
            
            download.fileCount = itemsToDownload.length;
            this.updateDownloadsList();
            
            // Download all files
            const zip = new ZipWriter();
            let downloadedCount = 0;
            
            for (const file of itemsToDownload) {
              const blob = await API.downloadFile(file);
              if (blob) {
                const isAudio = file.Type === 'Audio';
                const ext = isAudio ? 'mp3' : 'mp4';
                const fileName = `${file.Name || file.Id}.${ext}`;
                zip.addFile(fileName, blob);
                downloadedCount++;
                download.progress = Math.round((downloadedCount / itemsToDownload.length) * 100);
                this.updateDownloadsList();
              }
            }
            
            // Generate zip
            download.status = 'zipping';
            this.updateDownloadsList();
            this.showToast('Creating zip file...');
            
            const zipBlob = await zip.getBlob();
            download.blob = zipBlob;
            download.status = 'ready';
            download.progress = 100;
            this.updateDownloadsList();
            this.updateDownloadsBadge();
            this.showToast(`${item.Name} ready to save (${itemsToDownload.length} files)`);
          }
        } catch (e) {
          console.error('Download error:', e);
          download.status = 'error';
          this.updateDownloadsList();
          this.showToast('Download failed', 'error');
        }
        
        Storage.save('downloads', APP.downloads.map(d => ({ ...d, blob: null })));
      },
      
      async saveDownload(download) {
        if (!download.blob) {
          this.showToast('File not ready', 'error');
          return;
        }
        
        try {
          if ('showSaveFilePicker' in window) {
            const isVideo = ['Movie', 'Episode'].includes(download.Type);
            const isZip = download.isContainer;
            const extension = isZip ? 'zip' : isVideo ? 'mp4' : 'mp3';
            const mimeType = isZip ? 'application/zip' : isVideo ? 'video/mp4' : 'audio/mpeg';
            
            const handle = await window.showSaveFilePicker({
              suggestedName: `${download.Name}.${extension}`,
              types: [{
                description: isZip ? 'ZIP archive' : isVideo ? 'Video file' : 'Audio file',
                accept: { [mimeType]: [`.${extension}`] }
              }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(download.blob);
            await writable.close();
            
            download.status = 'saved';
            this.updateDownloadsList();
            this.showToast('File saved successfully');
          } else {
            // Fallback for browsers without File System Access API
            const url = URL.createObjectURL(download.blob);
            const a = document.createElement('a');
            const isZip = download.isContainer;
            const isVideo = ['Movie', 'Episode'].includes(download.Type);
            const extension = isZip ? 'zip' : isVideo ? 'mp4' : 'mp3';
            a.href = url;
            a.download = `${download.Name}.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
            
            download.status = 'saved';
            this.updateDownloadsList();
            this.showToast('Download started');
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            this.showToast('Save failed', 'error');
          }
        }
      },
      
      updateDownloadsList() {
        const container = document.getElementById('downloads-list');
        const empty = document.getElementById('downloads-empty');
        
        if (APP.downloads.length === 0) {
          container.innerHTML = '';
          empty.classList.remove('hidden');
          return;
        }
        
        empty.classList.add('hidden');
        container.innerHTML = '';
        
        APP.downloads.forEach((download, index) => {
          const div = document.createElement('div');
          div.className = 'glass rounded-xl p-4';
          
          const statusIcon = download.status === 'downloading' ? 'fa-spinner fa-spin' :
                            download.status === 'zipping' ? 'fa-compress-alt fa-spin' :
                            download.status === 'ready' ? 'fa-check-circle text-green-400' :
                            download.status === 'saved' ? 'fa-check-circle text-violet-400' :
                            'fa-exclamation-circle text-red-400';
          
          const statusText = download.status === 'downloading' ? `Downloading... ${download.progress}%` :
                            download.status === 'zipping' ? 'Creating zip...' :
                            download.status === 'ready' ? 'Ready to save' :
                            download.status === 'saved' ? 'Saved' : 'Error';
          
          div.innerHTML = `
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <i class="fas ${this.getIconForType(download.Type)} text-gray-400"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">${download.Name}</p>
                <div class="flex items-center gap-2 mt-1">
                  <i class="fas ${statusIcon} text-sm"></i>
                  <span class="text-xs text-gray-400">
                    ${statusText}
                  </span>
                  ${download.fileCount > 1 ? `<span class="text-xs text-gray-500 ml-auto">${download.fileCount} files</span>` : ''}
                </div>
              </div>
              ${download.status === 'ready' ? `
                <button class="save-download px-4 py-2 bg-violet-600 rounded-lg text-sm font-medium flex-shrink-0" data-index="${index}">
                  <i class="fas fa-download mr-1"></i> Save
                </button>
              ` : ''}
              ${download.status !== 'downloading' && download.status !== 'zipping' ? `
                <button class="remove-download w-8 h-8 flex items-center justify-center text-gray-500 flex-shrink-0" data-index="${index}">
                  <i class="fas fa-times"></i>
                </button>
              ` : ''}
            </div>
            ${(download.status === 'downloading' || download.status === 'zipping') ? `
              <div class="h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                <div class="h-full progress-bar rounded-full transition-all" style="width: ${download.progress}%"></div>
              </div>
            ` : ''}
          `;
          
          container.appendChild(div);
        });
        
        container.querySelectorAll('.save-download').forEach(btn => {
          btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            this.saveDownload(APP.downloads[index]);
          });
        });
        
        container.querySelectorAll('.remove-download').forEach(btn => {
          btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            APP.downloads.splice(index, 1);
            this.updateDownloadsList();
            this.updateDownloadsBadge();
            Storage.save('downloads', APP.downloads.map(d => ({ ...d, blob: null })));
          });
        });
      },
      
      updateDownloadsBadge() {
        const badge = document.getElementById('downloads-badge');
        const readyCount = APP.downloads.filter(d => d.status === 'ready').length;
        
        if (readyCount > 0) {
          badge.textContent = readyCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      },
      
      async performSearch(query) {
        const resultsContainer = document.getElementById('search-results');
        
        if (!query.trim()) {
          resultsContainer.innerHTML = `
            <div class="text-center text-gray-500 py-12">
              <i class="fas fa-search text-4xl mb-3 opacity-50"></i>
              <p>Search for your favorite media</p>
            </div>
          `;
          return;
        }
        
        resultsContainer.innerHTML = '<div class="shimmer h-16 rounded-xl mb-2"></div>'.repeat(5);
        
        let results = await API.search(query);
        
        // Apply filter
        if (APP.searchFilter !== 'all') {
          results = results.filter(item => item.Type.toLowerCase() === APP.searchFilter.toLowerCase());
        }
        
        if (results.length === 0) {
          resultsContainer.innerHTML = `
            <div class="text-center text-gray-500 py-12">
              <i class="fas fa-search text-4xl mb-3 opacity-50"></i>
              <p>No results found</p>
            </div>
          `;
          return;
        }
        
        resultsContainer.innerHTML = '';
        results.forEach(item => {
          const imageUrl = API.getImageUrl(item, 'Primary', 100);
          const div = document.createElement('div');
          div.className = 'flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors';
          div.innerHTML = `
            <div class="w-12 h-12 rounded-lg flex-shrink-0 ${imageUrl ? 'bg-cover bg-center' : 'bg-white/10 flex items-center justify-center'}"
                 ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ''}>
              ${!imageUrl ? `<i class="fas ${this.getIconForType(item.Type)} text-gray-400"></i>` : ''}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">${item.Name}</p>
              <p class="text-xs text-gray-400">${item.Type} • ${item.serverName}</p>
            </div>
          `;
          
          div.addEventListener('click', () => {
            if (['Movie', 'Episode', 'Audio', 'AudioBook'].includes(item.Type)) {
              this.playMedia(item);
            } else {
              this.showMediaDetail(item);
            }
            document.getElementById('search-overlay').classList.add('hidden');
          });
          
          resultsContainer.appendChild(div);
        });
      },
      
      renderHome() {
        // Render hero
        const featured = APP.library.all.find(i => i.Type === 'Movie' || i.Type === 'Series') || APP.library.all[0];
        if (featured) {
          const heroImage = document.getElementById('hero-image');
          const backdropUrl = API.getImageUrl(featured, 'Backdrop', 800) || API.getImageUrl(featured, 'Primary', 800);
          heroImage.style.backgroundImage = backdropUrl ? `url('${backdropUrl}')` : '';
          document.getElementById('hero-title').textContent = featured.Name;
          document.getElementById('hero-subtitle').textContent = featured.Overview || '';
          
          document.getElementById('hero-play').onclick = () => this.playMedia(featured);
          document.getElementById('hero-info').onclick = () => this.showMediaDetail(featured);
        }
        
        // Continue watching
        const continueSection = document.getElementById('continue-watching-section');
        const continueContainer = document.getElementById('continue-watching');
        const inProgress = APP.library.all.filter(i => i.UserData?.PlaybackPositionTicks);
        
        if (inProgress.length > 0) {
          continueSection.classList.remove('hidden');
          continueContainer.innerHTML = '';
          inProgress.slice(0, 10).forEach(item => {
            continueContainer.appendChild(this.createMediaCard(item, 'medium'));
          });
        }
        
        // Recently added video
        const recentVideo = document.getElementById('recently-added-video');
        recentVideo.innerHTML = '';
        APP.library.all.filter(i => ['Movie', 'Series'].includes(i.Type)).slice(0, 15).forEach(item => {
          recentVideo.appendChild(this.createMediaCard(item, 'medium'));
        });
        
        // Movies
        const moviesCarousel = document.getElementById('movies-carousel');
        moviesCarousel.innerHTML = '';
        const movies = APP.library.all.filter(i => i.Type === 'Movie');
        movies.slice(0, 15).forEach(item => {
          moviesCarousel.appendChild(this.createMediaCard(item, 'medium'));
        });
        
        // TV Shows
        const tvCarousel = document.getElementById('tvshows-carousel');
        tvCarousel.innerHTML = '';
        const tvshows = APP.library.all.filter(i => i.Type === 'Series');
        tvshows.slice(0, 15).forEach(item => {
          tvCarousel.appendChild(this.createMediaCard(item, 'medium'));
        });
        
        // Audio content
        this.renderAudioContent();
      },
      
      renderAudioContent() {
        // Songs
        const songsList = document.getElementById('songs-list');
        songsList.innerHTML = '';
        const songs = APP.library.all.filter(i => i.Type === 'Audio');
        if (songs.length === 0) {
          songsList.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No songs found</p>';
        } else {
          songs.slice(0, 50).forEach((item, index) => {
            songsList.appendChild(this.createSongRow(item, index));
          });
        }
        
        // Albums
        const albumsGrid = document.getElementById('albums-grid');
        albumsGrid.innerHTML = '';
        const albums = APP.library.all.filter(i => i.Type === 'MusicAlbum');
        if (albums.length === 0) {
          albumsGrid.innerHTML = '<p class="text-gray-500 text-sm text-center col-span-2 py-4">No albums found</p>';
        } else {
          albums.slice(0, 20).forEach(item => {
            albumsGrid.appendChild(this.createAlbumCard(item));
          });
        }
        
        // Artists
        const artistsGrid = document.getElementById('artists-grid');
        artistsGrid.innerHTML = '';
        const artists = APP.library.all.filter(i => i.Type === 'MusicArtist');
        if (artists.length === 0) {
          artistsGrid.innerHTML = '<p class="text-gray-500 text-sm text-center col-span-3 py-4">No artists found</p>';
        } else {
          artists.slice(0, 20).forEach(item => {
            artistsGrid.appendChild(this.createArtistCard(item));
          });
        }
        
        // Audiobooks
        const audiobooksGrid = document.getElementById('audiobooks-grid');
        audiobooksGrid.innerHTML = '';
        if (APP.library.audiobooks.length === 0) {
          audiobooksGrid.innerHTML = '<p class="text-gray-500 text-sm text-center col-span-2 py-4">No audiobooks found</p>';
        } else {
          APP.library.audiobooks.slice(0, 20).forEach(item => {
            audiobooksGrid.appendChild(this.createAlbumCard(item));
          });
        }
      }
    };

    // ==================== Event Listeners ====================
    document.addEventListener('DOMContentLoaded', () => {
      // Initialize SDK
      if (window.elementSdk) {
        window.elementSdk.init({
          defaultConfig: {},
          onConfigChange: async () => {},
          mapToCapabilities: () => ({ recolorables: [], borderables: [], fontEditable: undefined, fontSizeable: undefined }),
          mapToEditPanelValues: () => new Map()
        });
      }
      
      // Load saved data
      const savedAuth = Storage.load('auth');
      if (savedAuth) {
        APP.servers = savedAuth.servers;
        APP.username = savedAuth.username;
        initializeApp();
      }
      
      APP.accentColor = Storage.load('accentColor', '#8b5cf6');
      UI.setAccentColor(APP.accentColor);
      
      APP.quality = Storage.load('quality', 'auto');
      document.getElementById('quality-select').value = APP.quality;
      
      APP.watchHistory = Storage.load('watchHistory', []);
      APP.favorites = Storage.load('favorites', []);
      APP.downloads = Storage.load('downloads', []);
      
      // Login form
      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password1 = document.getElementById('password1').value;
        const password2 = document.getElementById('password2').value;
        
        if (!username || !password1 || !password2) {
          document.getElementById('login-error').textContent = 'Please fill in all fields';
          document.getElementById('login-error').classList.remove('hidden');
          return;
        }
        
        const loginBtn = document.getElementById('login-btn');
        const loginStatus = document.getElementById('login-status');
        const loginError = document.getElementById('login-error');
        
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Connecting...';
        loginError.classList.add('hidden');
        loginStatus.classList.remove('hidden');
        
        // Authenticate with server 1
        loginStatus.textContent = 'Connecting to Oasis Archive...';
        const auth1 = await API.authenticate(0, username, password1);
        
        // Authenticate with server 2
        loginStatus.textContent = "Connecting to Jade's Worlds...";
        const auth2 = await API.authenticate(1, username, password2);
        
        if (!auth1 && !auth2) {
          loginError.textContent = 'Failed to connect to both servers. Please check your credentials.';
          loginError.classList.remove('hidden');
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<span>Connect to Servers</span><i class="fas fa-arrow-right"></i>';
          loginStatus.classList.add('hidden');
          return;
        }
        
        APP.username = username;
        
        // Save auth
        Storage.save('auth', {
          servers: APP.servers,
          username: APP.username
        });
        
        await initializeApp();
      });
      
      // Tab navigation
      document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', () => UI.switchTab(btn.dataset.tab));
      });
      
      // Nested tabs
      document.querySelectorAll('.nested-tab').forEach(btn => {
        btn.addEventListener('click', () => UI.switchNestedTab(btn.dataset.nested));
      });
      
      // Audio tabs
      document.querySelectorAll('.audio-tab').forEach(btn => {
        btn.addEventListener('click', () => UI.switchAudioTab(btn.dataset.audio));
      });
      
      // Search
      document.getElementById('search-toggle').addEventListener('click', () => {
        document.getElementById('search-overlay').classList.remove('hidden');
        document.getElementById('search-input').focus();
      });
      
      document.getElementById('search-close').addEventListener('click', () => {
        document.getElementById('search-overlay').classList.add('hidden');
      });
      
      let searchTimeout;
      document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => UI.performSearch(e.target.value), 300);
      });
      
      document.querySelectorAll('.search-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.search-filter').forEach(b => {
            b.classList.remove('bg-violet-600');
            b.classList.add('bg-white/5');
          });
          btn.classList.remove('bg-white/5');
          btn.classList.add('bg-violet-600');
          APP.searchFilter = btn.dataset.filter;
          UI.performSearch(document.getElementById('search-input').value);
        });
      });
      
      // Refresh
      document.getElementById('refresh-btn').addEventListener('click', async () => {
        const btn = document.getElementById('refresh-btn');
        btn.querySelector('i').classList.add('fa-spin');
        await loadLibraries();
        btn.querySelector('i').classList.remove('fa-spin');
        UI.showToast('Library refreshed');
      });
      
      // Mini player controls
      document.getElementById('mini-play').addEventListener('click', () => UI.togglePlay());
      document.getElementById('mini-expand').addEventListener('click', () => {
        document.getElementById('full-player').classList.remove('hidden');
      });
      
      // Full player controls
      document.getElementById('player-close').addEventListener('click', () => {
        document.getElementById('full-player').classList.add('hidden');
      });
      
      document.getElementById('player-play').addEventListener('click', () => UI.togglePlay());
      
      document.getElementById('player-seek').addEventListener('input', (e) => {
        UI.seekTo(parseFloat(e.target.value));
      });
      
      document.getElementById('player-download').addEventListener('click', () => {
        if (APP.currentMedia) {
          UI.startDownload(APP.currentMedia);
        }
      });
      
      document.getElementById('player-favorite').addEventListener('click', () => {
        if (APP.currentMedia) {
          UI.toggleFavorite(APP.currentMedia);
        }
      });
      
      // Video player events
      const videoPlayer = document.getElementById('video-player');
      videoPlayer.addEventListener('timeupdate', () => UI.updateProgress());
      videoPlayer.addEventListener('ended', () => UI.handleMediaEnd());
      videoPlayer.addEventListener('play', () => {
        APP.isPlaying = true;
        UI.updatePlayButton();
      });
      videoPlayer.addEventListener('pause', () => {
        APP.isPlaying = false;
        UI.updatePlayButton();
      });
      
      // Detail modal
      document.getElementById('detail-close').addEventListener('click', () => {
        document.getElementById('detail-modal').classList.add('hidden');
      });
      
      document.getElementById('detail-play').addEventListener('click', () => {
        if (APP.detailItem) {
          UI.playMedia(APP.detailItem);
          document.getElementById('detail-modal').classList.add('hidden');
        }
      });
      
      document.getElementById('detail-download-btn').addEventListener('click', () => {
        if (APP.detailItem) {
          UI.startDownload(APP.detailItem);
        }
      });
      
      document.getElementById('detail-fav-btn').addEventListener('click', () => {
        if (APP.detailItem) {
          UI.toggleFavorite(APP.detailItem);
        }
      });
      
      // Profile settings
      document.querySelectorAll('.accent-color').forEach(btn => {
        btn.addEventListener('click', () => UI.setAccentColor(btn.dataset.color));
      });
      
      document.getElementById('quality-select').addEventListener('change', (e) => {
        APP.quality = e.target.value;
        Storage.save('quality', APP.quality);
        UI.showToast('Quality preference saved');
      });
      
      document.getElementById('logout-btn').addEventListener('click', () => {
        Storage.remove('auth');
        APP.servers.forEach(s => { s.token = null; s.userId = null; });
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        UI.showToast('Logged out');
      });
      
      // Toast close
      document.getElementById('toast-close').addEventListener('click', () => {
        document.getElementById('toast').classList.add('hidden');
      });
    });

    async function initializeApp() {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('main-app').classList.remove('hidden');
      
      document.getElementById('profile-username').textContent = APP.username;
      
      // Update server status
      document.getElementById('server1-status').textContent = APP.servers[0].token ? 'Connected' : 'Disconnected';
      document.getElementById('server1-status').className = APP.servers[0].token ? 
        'text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400' : 
        'text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400';
      
      document.getElementById('server2-status').textContent = APP.servers[1].token ? 'Connected' : 'Disconnected';
      document.getElementById('server2-status').className = APP.servers[1].token ? 
        'text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400' : 
        'text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400';
      
      // Load libraries
      await loadLibraries();
      
      // Update UI
      UI.updateWatchHistory();
      UI.updateFavorites();
      UI.updateDownloadsList();
      UI.updateDownloadsBadge();
    }

    async function loadLibraries() {
      // Start rendering immediately as items load
      await Promise.all([
        loadServerLibrary(0),
        loadServerLibrary(1)
      ]);
      
      // Render home with whatever we have
      UI.renderHome();
    }

    async function loadServerLibrary(serverIndex) {
      await API.fetchLibraryPaginated(serverIndex, (items) => {
        APP.library.all.push(...items);
        
        // Update UI as items arrive - only if we're on the home tab
        if (APP.currentTab === 'home') {
          UI.renderHome();
        }
      });
    }
  
