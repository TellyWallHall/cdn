
    // Global state
    const SERVERS = [
      { name: 'Oasis', url: 'https://jelly.oasis-archive.org', apiKey: '', userId: '', badge: 'server-oasis' },
      { name: 'Jade', url: 'https://jelly.jadesworlds.com', apiKey: '', userId: '', badge: 'server-jade' }
    ];
    
    let USERNAME = '';
    let currentView = 'home';
    let currentMediaItem = null;
    let currentServer = null;
    
    // Utility Functions
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
      setTimeout(() => {
        toast.style.transform = 'translateY(-100%)';
        toast.style.opacity = '0';
      }, 3000);
    }
    
    function formatDuration(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    }
    
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function getImageUrl(server, itemId, tag, type = 'Primary') {
      if (!itemId || !server) return '';
      return `${server.url}/Items/${itemId}/Images/${type}?maxHeight=400&tag=${tag || ''}&quality=90&api_key=${server.apiKey}`;
    }
    
    // Authentication
    async function login(username, passwordOasis, passwordJade) {
      try {
        // Login to Oasis
        const oasisResponse = await fetch(`${SERVERS[0].url}/Users/AuthenticateByName`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': 'MediaBrowser Client="Media Dashboard", Device="Web", DeviceId="web-client", Version="1.0.0"'
          },
          body: JSON.stringify({
            Username: username,
            Pw: passwordOasis
          })
        });
        
        if (!oasisResponse.ok) {
          throw new Error('Oasis authentication failed');
        }
        
        const oasisData = await oasisResponse.json();
        SERVERS[0].apiKey = oasisData.AccessToken;
        SERVERS[0].userId = oasisData.User.Id;
        
        // Login to Jade
        const jadeResponse = await fetch(`${SERVERS[1].url}/Users/AuthenticateByName`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': 'MediaBrowser Client="Media Dashboard", Device="Web", DeviceId="web-client", Version="1.0.0"'
          },
          body: JSON.stringify({
            Username: username,
            Pw: passwordJade
          })
        });
        
        if (!jadeResponse.ok) {
          throw new Error('Jade authentication failed');
        }
        
        const jadeData = await jadeResponse.json();
        SERVERS[1].apiKey = jadeData.AccessToken;
        SERVERS[1].userId = jadeData.User.Id;
        
        USERNAME = username;
        
        // Store credentials
        const credentials = {
          username,
          oasis: { apiKey: SERVERS[0].apiKey, userId: SERVERS[0].userId },
          jade: { apiKey: SERVERS[1].apiKey, userId: SERVERS[1].userId },
          timestamp: Date.now()
        };
        
        localStorage.setItem('unified_credentials', JSON.stringify(credentials));
        localStorage.setItem('password_oasis', passwordOasis);
        localStorage.setItem('password_jade', passwordJade);
        
        return true;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    }
    
    function logout() {
      localStorage.removeItem('unified_credentials');
      SERVERS.forEach(s => {
        s.apiKey = '';
        s.userId = '';
      });
      USERNAME = '';
      document.getElementById('dashboard').classList.add('hidden');
      document.getElementById('login-screen').classList.remove('hidden');
      stopPlayer();
    }
    
    function checkAuth() {
      const credentialsStr = localStorage.getItem('unified_credentials');
      if (!credentialsStr) return false;
      
      try {
        const credentials = JSON.parse(credentialsStr);
        const age = Date.now() - credentials.timestamp;
        
        if (age > 30 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem('unified_credentials');
          return false;
        }
        
        USERNAME = credentials.username;
        SERVERS[0].apiKey = credentials.oasis.apiKey;
        SERVERS[0].userId = credentials.oasis.userId;
        SERVERS[1].apiKey = credentials.jade.apiKey;
        SERVERS[1].userId = credentials.jade.userId;
        
        return true;
      } catch {
        return false;
      }
    }
    
    // API Functions
    async function apiRequest(server, endpoint, options = {}) {
      const url = `${server.url}${endpoint}`;
      const headers = {
        'X-Emby-Token': server.apiKey,
        ...options.headers
      };
      
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      return response.json();
    }
    
    async function loadFromBothServers(endpoint) {
      const results = await Promise.allSettled(
        SERVERS.map(server => apiRequest(server, endpoint))
      );
      
      const items = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const serverItems = result.value.Items || result.value;
          const itemsArray = Array.isArray(serverItems) ? serverItems : [serverItems];
          itemsArray.forEach(item => {
            items.push({ ...item, _server: SERVERS[index] });
          });
        }
      });
      
      return items;
    }
    
    async function loadHomeData() {
      try {
        // Load continue watching from both servers
        const resumeItems = await loadFromBothServers(`/Users/${SERVERS[0].userId}/Items/Resume?Limit=10&Fields=PrimaryImageAspectRatio&MediaTypes=Video,Audio`);
        if (resumeItems.length > 0) {
          renderContinueWatching(resumeItems);
        }
        
        // Load recently added
        const recentOasis = await apiRequest(SERVERS[0], `/Users/${SERVERS[0].userId}/Items/Latest?Limit=10&Fields=PrimaryImageAspectRatio`);
        const recentJade = await apiRequest(SERVERS[1], `/Users/${SERVERS[1].userId}/Items/Latest?Limit=10&Fields=PrimaryImageAspectRatio`);
        const recent = [
          ...recentOasis.map(item => ({ ...item, _server: SERVERS[0] })),
          ...recentJade.map(item => ({ ...item, _server: SERVERS[1] }))
        ];
        if (recent.length > 0) {
          renderRecentlyAdded(recent);
        }
        
        // Load top rated movies from both servers
        const topMovies = await Promise.all(
          SERVERS.map(async server => {
            try {
              const libs = await apiRequest(server, `/Users/${server.userId}/Views`);
              const moviesLib = libs.Items.find(lib => lib.CollectionType === 'movies');
              if (moviesLib) {
                const data = await apiRequest(server, `/Users/${server.userId}/Items?ParentId=${moviesLib.Id}&IncludeItemTypes=Movie&Limit=10&SortBy=CommunityRating&SortOrder=Descending&Fields=PrimaryImageAspectRatio`);
                return data.Items.map(item => ({ ...item, _server: server }));
              }
              return [];
            } catch {
              return [];
            }
          })
        );
        
        const allTopMovies = topMovies.flat();
        if (allTopMovies.length > 0) {
          allTopMovies.sort((a, b) => (b.CommunityRating || 0) - (a.CommunityRating || 0));
          renderTopMovies(allTopMovies.slice(0, 15));
        }
        
      } catch (error) {
        console.error('Error loading home data:', error);
        showToast('Failed to load some content');
      }
    }
    
    // Rendering Functions
    function renderContinueWatching(items) {
      const container = document.getElementById('continue-list');
      const section = document.getElementById('continue-section');
      container.innerHTML = '';
      
      items.forEach(item => {
        const progress = item.UserData?.PlayedPercentage || 0;
        const card = document.createElement('div');
        card.className = 'media-card flex-shrink-0 w-40 snap-start cursor-pointer';
        card.innerHTML = `
          <div class="relative rounded-xl overflow-hidden bg-gray-800 mb-2">
            <img src="${getImageUrl(item._server, item.Id, item.ImageTags?.Primary)}" alt="${item.Name}" class="w-full h-24 object-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; this.alt='${item.Name}';">
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div class="progress-bar h-full" style="width: ${progress}%"></div>
            </div>
            <div class="absolute top-2 right-2 server-badge ${item._server.badge}">${item._server.name}</div>
          </div>
          <p class="text-sm font-medium truncate">${item.Name}</p>
        `;
        card.addEventListener('click', () => showMediaDetail(item));
        container.appendChild(card);
      });
      
      section.classList.remove('hidden');
    }
    
    function renderRecentlyAdded(items) {
      const container = document.getElementById('recent-list');
      const section = document.getElementById('recent-section');
      container.innerHTML = '';
      
      items.slice(0, 15).forEach(item => {
        const card = document.createElement('div');
        card.className = 'media-card flex-shrink-0 w-32 snap-start cursor-pointer';
        card.innerHTML = `
          <div class="relative rounded-xl overflow-hidden bg-gray-800 mb-2 aspect-[2/3]">
            <img src="${getImageUrl(item._server, item.Id, item.ImageTags?.Primary)}" alt="${item.Name}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; this.alt='${item.Name}';">
            <div class="absolute top-2 right-2 server-badge ${item._server.badge}">${item._server.name}</div>
          </div>
          <p class="text-sm font-medium truncate">${item.Name}</p>
        `;
        card.addEventListener('click', () => showMediaDetail(item));
        container.appendChild(card);
      });
      
      section.classList.remove('hidden');
    }
    
    function renderTopMovies(items) {
      const container = document.getElementById('top-movies-list');
      const section = document.getElementById('top-movies-section');
      container.innerHTML = '';
      
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'media-card flex-shrink-0 w-32 snap-start cursor-pointer';
        card.innerHTML = `
          <div class="relative rounded-xl overflow-hidden bg-gray-800 mb-2 aspect-[2/3]">
            <img src="${getImageUrl(item._server, item.Id, item.ImageTags?.Primary)}" alt="${item.Name}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; this.alt='${item.Name}';">
            ${item.CommunityRating ? `<div class="absolute top-2 left-2 bg-black/70 backdrop-blur px-2 py-1 rounded-lg text-xs font-semibold" style="color: var(--accent-color)">⭐ ${item.CommunityRating.toFixed(1)}</div>` : ''}
            <div class="absolute top-2 right-2 server-badge ${item._server.badge}">${item._server.name}</div>
          </div>
          <p class="text-sm font-medium truncate">${item.Name}</p>
        `;
        card.addEventListener('click', () => showMediaDetail(item));
        container.appendChild(card);
      });
      
      section.classList.remove('hidden');
    }
    
    // Load Movies Library
    async function loadMoviesLibrary(genre = 'all') {
      try {
        const allMovies = await Promise.all(
          SERVERS.map(async server => {
            try {
              const libs = await apiRequest(server, `/Users/${server.userId}/Views`);
              const moviesLib = libs.Items.find(lib => lib.CollectionType === 'movies');
              if (moviesLib) {
                const params = genre === 'all' 
                  ? `ParentId=${moviesLib.Id}&IncludeItemTypes=Movie&Recursive=true&SortBy=SortName&SortOrder=Ascending&Fields=PrimaryImageAspectRatio`
                  : `ParentId=${moviesLib.Id}&IncludeItemTypes=Movie&Recursive=true&Genres=${genre}&SortBy=SortName&SortOrder=Ascending&Fields=PrimaryImageAspectRatio`;
                const data = await apiRequest(server, `/Users/${server.userId}/Items?${params}`);
                return data.Items.map(item => ({ ...item, _server: server }));
              }
              return [];
            } catch {
              return [];
            }
          })
        );
        
        const movies = allMovies.flat();
        movies.sort((a, b) => a.Name.localeCompare(b.Name));
        
        const container = document.getElementById('movies-content');
        container.innerHTML = '';
        
        if (movies.length === 0) {
          container.innerHTML = '<p class="col-span-2 text-center text-gray-500 py-12">No movies found</p>';
          return;
        }
        
        movies.forEach(movie => {
          const card = document.createElement('div');
          card.className = 'media-card cursor-pointer';
          card.innerHTML = `
            <div class="relative rounded-xl overflow-hidden bg-gray-800 mb-2 aspect-[2/3]">
              <img src="${getImageUrl(movie._server, movie.Id, movie.ImageTags?.Primary)}" alt="${movie.Name}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; this.alt='${movie.Name}';">
              <div class="absolute top-2 right-2 server-badge ${movie._server.badge}">${movie._server.name}</div>
            </div>
            <p class="text-sm font-medium truncate">${movie.Name}</p>
            ${movie.ProductionYear ? `<p class="text-xs text-gray-400">${movie.ProductionYear}</p>` : ''}
          `;
          card.addEventListener('click', () => showMediaDetail(movie));
          container.appendChild(card);
        });
        
      } catch (error) {
        console.error('Error loading movies:', error);
        showToast('Failed to load movies');
      }
    }
    
    // Load TV Shows Library
    async function loadTVLibrary(genre = 'all') {
      try {
        const allShows = await Promise.all(
          SERVERS.map(async server => {
            try {
              const libs = await apiRequest(server, `/Users/${server.userId}/Views`);
              const tvLib = libs.Items.find(lib => lib.CollectionType === 'tvshows');
              if (tvLib) {
                const params = genre === 'all'
                  ? `ParentId=${tvLib.Id}&IncludeItemTypes=Series&Recursive=true&SortBy=SortName&SortOrder=Ascending&Fields=PrimaryImageAspectRatio`
                  : `ParentId=${tvLib.Id}&IncludeItemTypes=Series&Recursive=true&Genres=${genre}&SortBy=SortName&SortOrder=Ascending&Fields=PrimaryImageAspectRatio`;
                const data = await apiRequest(server, `/Users/${server.userId}/Items?${params}`);
                return data.Items.map(item => ({ ...item, _server: server }));
              }
              return [];
            } catch {
              return [];
            }
          })
        );
        
        const shows = allShows.flat();
        shows.sort((a, b) => a.Name.localeCompare(b.Name));
        
        const container = document.getElementById('tv-content');
        container.innerHTML = '';
        
        if (shows.length === 0) {
          container.innerHTML = '<p class="col-span-2 text-center text-gray-500 py-12">No TV shows found</p>';
          return;
        }
        
        shows.forEach(show => {
          const card = document.createElement('div');
          card.className = 'media-card cursor-pointer';
          card.innerHTML = `
            <div class="relative rounded-xl overflow-hidden bg-gray-800 mb-2 aspect-[2/3]">
              <img src="${getImageUrl(show._server, show.Id, show.ImageTags?.Primary)}" alt="${show.Name}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; this.alt='${show.Name}';">
              <div class="absolute top-2 right-2 server-badge ${show._server.badge}">${show._server.name}</div>
            </div>
            <p class="text-sm font-medium truncate">${show.Name}</p>
            ${show.ProductionYear ? `<p class="text-xs text-gray-400">${show.ProductionYear}</p>` : ''}
          `;
          card.addEventListener('click', () => showMediaDetail(show));
          container.appendChild(card);
        });
        
      } catch (error) {
        console.error('Error loading TV shows:', error);
        showToast('Failed to load TV shows');
      }
    }
    
    // Load Music Library
    async function loadMusicLibrary() {
      try {
        const allArtists = await Promise.all(
          SERVERS.map(async server => {
            try {
              const libs = await apiRequest(server, `/Users/${server.userId}/Views`);
              const musicLib = libs.Items.find(lib => lib.CollectionType === 'music');
              if (musicLib) {
                const data = await apiRequest(server, `/Artists?UserId=${server.userId}&ParentId=${musicLib.Id}&SortBy=SortName&SortOrder=Ascending&Fields=PrimaryImageAspectRatio`);
                return data.Items.map(item => ({ ...item, _server: server }));
              }
              return [];
            } catch {
              return [];
            }
          })
        );
        
        const artists = allArtists.flat();
        artists.sort((a, b) => a.Name.localeCompare(b.Name));
        
        const container = document.getElementById('music-content');
        container.innerHTML = '';
        
        if (artists.length === 0) {
          container.innerHTML = '<p class="col-span-3 text-center text-gray-500 py-12">No artists found</p>';
          return;
        }
        
        artists.forEach(artist => {
          const card = document.createElement('div');
          card.className = 'media-card cursor-pointer';
          card.innerHTML = `
            <div class="relative rounded-full overflow-hidden bg-gray-800 mb-2 aspect-square">
              <img src="${getImageUrl(artist._server, artist.Id, artist.ImageTags?.Primary)}" alt="${artist.Name}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; this.alt='${artist.Name}';">
              <div class="absolute bottom-1 right-1 server-badge ${artist._server.badge}">${artist._server.name}</div>
            </div>
            <p class="text-xs font-medium truncate text-center">${artist.Name}</p>
          `;
          card.addEventListener('click', () => showArtistDetail(artist));
          container.appendChild(card);
        });
        
      } catch (error) {
        console.error('Error loading music:', error);
        showToast('Failed to load music');
      }
    }
    
    // Show Detail Views
    function showMediaDetail(item) {
      currentMediaItem = item;
      currentServer = item._server;
      
      if (item.Type === 'Series') {
        showSeriesDetail(item);
      } else if (item.Type === 'Movie') {
        showMovieDetail(item);
      }
    }
    
    async function showSeriesDetail(series) {
      try {
        // Clear previous content
        document.getElementById('show-detail-hero').style.backgroundImage = '';
        document.getElementById('show-detail-hero').style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
        document.getElementById('episodes-list').innerHTML = '';
        
        // Update header
        document.getElementById('show-detail-title').textContent = series.Name;
        document.getElementById('show-server-badge').className = `absolute top-4 right-4 server-badge ${series._server.badge} z-10`;
        document.getElementById('show-server-badge').textContent = series._server.name;
        
        // Update meta
        const meta = [];
        if (series.ProductionYear) meta.push(series.ProductionYear);
        if (series.OfficialRating) meta.push(series.OfficialRating);
        document.getElementById('show-detail-meta').innerHTML = meta.map(m => `<span>${m}</span>`).join('<span>•</span>');
        
        // Update overview
        document.getElementById('show-detail-overview').textContent = series.Overview || 'No description available.';
        
        // Update backdrop
        if (series.BackdropImageTags && series.BackdropImageTags.length > 0) {
          document.getElementById('show-detail-hero').style.backgroundImage = `url('${getImageUrl(series._server, series.Id, series.BackdropImageTags[0], 'Backdrop')}')`;
          document.getElementById('show-detail-hero').style.backgroundSize = 'cover';
          document.getElementById('show-detail-hero').style.backgroundPosition = 'center';
        }
        
        // Load seasons
        const seasonsData = await apiRequest(series._server, `/Shows/${series.Id}/Seasons?UserId=${series._server.userId}&Fields=PrimaryImageAspectRatio`);
        const select = document.getElementById('season-select');
        select.innerHTML = seasonsData.Items.map(season =>
          `<option value="${season.Id}">${season.Name}</option>`
        ).join('');
        
        select.onchange = () => loadEpisodes(series._server, series.Id, select.value);
        
        await loadEpisodes(series._server, series.Id, seasonsData.Items[0].Id);
        
        switchView('show-detail');
        
      } catch (error) {
        console.error('Error loading series detail:', error);
        showToast('Failed to load series details');
      }
    }
    
    async function loadEpisodes(server, seriesId, seasonId) {
      try {
        const data = await apiRequest(server, `/Shows/${seriesId}/Episodes?UserId=${server.userId}&SeasonId=${seasonId}&Fields=PrimaryImageAspectRatio,Overview`);
        const container = document.getElementById('episodes-list');
        container.innerHTML = '';
        
        data.Items.forEach(episode => {
          const progress = episode.UserData?.PlayedPercentage || 0;
          const episodeCard = document.createElement('div');
          episodeCard.className = 'card-gradient rounded-xl p-3 glow-border cursor-pointer hover:bg-white/10 transition-colors';
          episodeCard.innerHTML = `
            <div class="flex gap-3">
              <div class="relative w-32 h-18 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                <img src="${getImageUrl(server, episode.Id, episode.ImageTags?.Primary)}" alt="${episode.Name}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; this.alt='${episode.Name}';">
                ${progress > 0 ? `<div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20"><div class="progress-bar h-full" style="width: ${progress}%"></div></div>` : ''}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm mb-1">${episode.IndexNumber}. ${episode.Name}</p>
                <p class="text-xs text-gray-400 line-clamp-2">${episode.Overview || 'No description'}</p>
                ${episode.RunTimeTicks ? `<p class="text-xs text-gray-500 mt-1">${formatDuration(episode.RunTimeTicks / 10000)}</p>` : ''}
              </div>
            </div>
          `;
          episodeCard.addEventListener('click', () => playMedia({ ...episode, _server: server }));
          container.appendChild(episodeCard);
        });
        
      } catch (error) {
        console.error('Error loading episodes:', error);
      }
    }
    
    async function showMovieDetail(movie) {
      try {
        // Clear all previous content first
        document.getElementById('movie-detail-hero').style.backgroundImage = '';
        document.getElementById('movie-detail-hero').style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
        document.getElementById('movie-genres-info').classList.add('hidden');
        document.getElementById('movie-year-info').classList.add('hidden');
        document.getElementById('movie-rating-info').classList.add('hidden');
        document.getElementById('movie-runtime-info').classList.add('hidden');
        document.getElementById('movie-cast-section').classList.add('hidden');
        document.getElementById('movie-cast-list').innerHTML = '';
        
        const fullMovie = await apiRequest(movie._server, `/Users/${movie._server.userId}/Items/${movie.Id}`);
        
        document.getElementById('movie-detail-title').textContent = fullMovie.Name;
        document.getElementById('movie-server-badge').className = `absolute top-4 right-4 server-badge ${movie._server.badge} z-10`;
        document.getElementById('movie-server-badge').textContent = movie._server.name;
        
        const meta = [];
        if (fullMovie.ProductionYear) meta.push(fullMovie.ProductionYear);
        if (fullMovie.OfficialRating) meta.push(fullMovie.OfficialRating);
        if (fullMovie.RunTimeTicks) meta.push(formatDuration(fullMovie.RunTimeTicks / 10000));
        document.getElementById('movie-detail-meta').innerHTML = meta.map(m => `<span>${m}</span>`).join('<span>•</span>');
        
        document.getElementById('movie-detail-overview').textContent = fullMovie.Overview || 'No description available.';
        
        if (fullMovie.BackdropImageTags && fullMovie.BackdropImageTags.length > 0) {
          document.getElementById('movie-detail-hero').style.backgroundImage = `url('${getImageUrl(movie._server, fullMovie.Id, fullMovie.BackdropImageTags[0], 'Backdrop')}')`;
          document.getElementById('movie-detail-hero').style.backgroundSize = 'cover';
          document.getElementById('movie-detail-hero').style.backgroundPosition = 'center';
        }
        
        // Info
        if (fullMovie.Genres && fullMovie.Genres.length > 0) {
          document.getElementById('movie-genres-text').textContent = fullMovie.Genres.join(', ');
          document.getElementById('movie-genres-info').classList.remove('hidden');
        }
        if (fullMovie.ProductionYear) {
          document.getElementById('movie-year-text').textContent = fullMovie.ProductionYear;
          document.getElementById('movie-year-info').classList.remove('hidden');
        }
        if (fullMovie.CommunityRating) {
          document.getElementById('movie-rating-text').innerHTML = `⭐ ${fullMovie.CommunityRating.toFixed(1)}/10`;
          document.getElementById('movie-rating-info').classList.remove('hidden');
        }
        if (fullMovie.RunTimeTicks) {
          document.getElementById('movie-runtime-text').textContent = formatDuration(fullMovie.RunTimeTicks / 10000);
          document.getElementById('movie-runtime-info').classList.remove('hidden');
        }
        
        // Cast
        if (fullMovie.People && fullMovie.People.length > 0) {
          const container = document.getElementById('movie-cast-list');
          container.innerHTML = '';
          fullMovie.People.slice(0, 10).forEach(person => {
            const castCard = document.createElement('div');
            castCard.className = 'flex-shrink-0 w-24 text-center';
            castCard.innerHTML = `
              <div class="w-24 h-24 rounded-full bg-gray-800 mb-2 overflow-hidden mx-auto">
                ${person.PrimaryImageTag ? `<img src="${getImageUrl(movie._server, person.Id, person.PrimaryImageTag, 'Primary')}" alt="${person.Name}" class="w-full h-full object-cover" loading="lazy">` : '<div class="w-full h-full flex items-center justify-center text-gray-600"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>'}
              </div>
              <p class="text-xs font-medium truncate">${person.Name}</p>
              <p class="text-xs text-gray-400 truncate">${person.Role || person.Type}</p>
            `;
            container.appendChild(castCard);
          });
          document.getElementById('movie-cast-section').classList.remove('hidden');
        }
        
        document.getElementById('movie-play-btn').onclick = () => playMedia({ ...fullMovie, _server: movie._server });
        
        switchView('movie-detail');
        
      } catch (error) {
        console.error('Error loading movie detail:', error);
        showToast('Failed to load movie details');
      }
    }
    
    async function showArtistDetail(artist) {
      try {
        document.getElementById('artist-name').textContent = artist.Name;
        document.getElementById('artist-server-badge').className = `server-badge ${artist._server.badge}`;
        document.getElementById('artist-server-badge').textContent = artist._server.name;
        
        // Load albums
        const albumsData = await apiRequest(artist._server, `/Users/${artist._server.userId}/Items?IncludeItemTypes=MusicAlbum&Recursive=true&ArtistIds=${artist.Id}&SortBy=ProductionYear&SortOrder=Descending&Fields=PrimaryImageAspectRatio`);
        
        document.getElementById('artist-album-count').textContent = albumsData.Items.length;
        
        const container = document.getElementById('artist-albums-list');
        container.innerHTML = '';
        
        albumsData.Items.forEach(album => {
          const albumCard = document.createElement('div');
          albumCard.className = 'album-card card-gradient rounded-xl p-3 glow-border cursor-pointer flex gap-3';
          albumCard.innerHTML = `
            <div class="w-20 h-20 rounded-lg bg-gray-800 flex-shrink-0 overflow-hidden">
              <img src="${getImageUrl(artist._server, album.Id, album.ImageTags?.Primary)}" alt="${album.Name}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; this.alt='${album.Name}';">
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">${album.Name}</p>
              <p class="text-xs text-gray-400">${album.ProductionYear || 'Unknown Year'}</p>
              <p class="text-xs text-gray-500">${album.ChildCount || 0} tracks</p>
            </div>
          `;
          albumCard.addEventListener('click', () => showAlbumDetail({ ...album, _server: artist._server }));
          container.appendChild(albumCard);
        });
        
        switchView('artist-detail');
        
      } catch (error) {
        console.error('Error loading artist detail:', error);
        showToast('Failed to load artist details');
      }
    }
    
    async function showAlbumDetail(album) {
      try {
        document.getElementById('album-title').textContent = album.Name;
        const albumArtist = album.AlbumArtist || 'Unknown Artist';
        document.getElementById('album-artist').textContent = albumArtist.replace(/;/g, ', ');
        document.getElementById('album-year').textContent = album.ProductionYear ? `Released ${album.ProductionYear}` : '';
        
        if (album.ImageTags?.Primary) {
          document.getElementById('album-artwork').innerHTML = `<img src="${getImageUrl(album._server, album.Id, album.ImageTags.Primary)}" alt="${album.Name}" class="w-full h-full object-cover" loading="lazy">`;
        }
        
        // Load tracks
        const tracksData = await apiRequest(album._server, `/Users/${album._server.userId}/Items?ParentId=${album.Id}&SortBy=SortName&SortOrder=Ascending`);
        
        const container = document.getElementById('album-tracks-list');
        container.innerHTML = '';
        
        tracksData.Items.forEach((track, index) => {
          const trackCard = document.createElement('div');
          trackCard.className = 'flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer';
          trackCard.innerHTML = `
            <div class="w-8 text-center text-sm text-gray-400">${track.IndexNumber || index + 1}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">${track.Name}</p>
            </div>
            <div class="text-sm text-gray-400">${track.RunTimeTicks ? formatDuration(track.RunTimeTicks / 10000) : ''}</div>
            <button class="track-play-btn w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          `;
          
          const playBtn = trackCard.querySelector('.track-play-btn');
          playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playMedia({ ...track, _server: album._server });
          });
          
          trackCard.addEventListener('click', () => playMedia({ ...track, _server: album._server }));
          container.appendChild(trackCard);
        });
        
        document.getElementById('album-play-all-btn').onclick = () => {
          if (tracksData.Items.length > 0) {
            playMedia({ ...tracksData.Items[0], _server: album._server });
          }
        };
        
        switchView('album-detail');
        
      } catch (error) {
        console.error('Error loading album detail:', error);
        showToast('Failed to load album details');
      }
    }
    
    // Search
    let searchTimeout;
    let currentSearchFilter = 'all';
    let cachedSearchResults = [];
    
    async function performSearch(query) {
      if (!query.trim()) {
        document.getElementById('search-results').innerHTML = '<p class="col-span-2 text-center text-gray-500 py-12">Search across all servers</p>';
        cachedSearchResults = [];
        return;
      }
      
      try {
        const allResults = await Promise.all(
          SERVERS.map(async server => {
            try {
              const data = await apiRequest(server, `/Users/${server.userId}/Items?SearchTerm=${encodeURIComponent(query)}&Limit=50&Fields=PrimaryImageAspectRatio&Recursive=true`);
              return data.Items.map(item => ({ ...item, _server: server }));
            } catch {
              return [];
            }
          })
        );
        
        cachedSearchResults = allResults.flat();
        renderSearchResults();
        
      } catch (error) {
        console.error('Error searching:', error);
        showToast('Search failed');
      }
    }
    
    function renderSearchResults() {
      const container = document.getElementById('search-results');
      container.innerHTML = '';
      
      let results = cachedSearchResults;
      
      // Filter by type
      if (currentSearchFilter !== 'all') {
        results = cachedSearchResults.filter(item => item.Type === currentSearchFilter);
      }
      
      if (results.length === 0) {
        container.innerHTML = '<p class="col-span-2 text-center text-gray-500 py-12">No results found</p>';
        return;
      }
      
      results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'media-card cursor-pointer';
        card.innerHTML = `
          <div class="relative rounded-xl overflow-hidden bg-gray-800 mb-2 aspect-[2/3]">
            <img src="${getImageUrl(item._server, item.Id, item.ImageTags?.Primary)}" alt="${item.Name}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.background='linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'; this.alt='${item.Name}';">
            <div class="absolute top-2 right-2 server-badge ${item._server.badge}">${item._server.name}</div>
          </div>
          <p class="text-sm font-medium truncate">${item.Name}</p>
          <p class="text-xs text-gray-400">${item.Type}</p>
        `;
        card.addEventListener('click', () => {
          if (item.Type === 'MusicArtist') {
            showArtistDetail(item);
          } else if (item.Type === 'MusicAlbum') {
            showAlbumDetail(item);
          } else {
            showMediaDetail(item);
          }
        });
        container.appendChild(card);
      });
    }
    
    // Player
    function playMedia(item) {
      currentMediaItem = item;
      currentServer = item._server;
      
      const mediaUrl = `${item._server.url}/Items/${item.Id}/Download?api_key=${item._server.apiKey}`;
      
      const miniPlayer = document.getElementById('mini-player');
      const videoPlayer = document.getElementById('video-player');
      const audioPlayer = document.getElementById('audio-player');
      const mediaContainer = document.getElementById('media-container');
      
      miniPlayer.classList.remove('hidden');
      
      if (item.MediaType === 'Video') {
        videoPlayer.src = mediaUrl;
        audioPlayer.pause();
        audioPlayer.src = '';
        videoPlayer.style.display = 'block';
        audioPlayer.style.display = 'none';
        mediaContainer.classList.remove('hidden');
      } else if (item.MediaType === 'Audio') {
        audioPlayer.src = mediaUrl;
        videoPlayer.pause();
        videoPlayer.src = '';
        audioPlayer.style.display = 'block';
        videoPlayer.style.display = 'none';
        mediaContainer.classList.remove('hidden');
      }
      
      document.getElementById('mini-title').textContent = item.Name;
      const artistText = item.AlbumArtist || item.SeriesName || item.Album || '';
      document.getElementById('mini-artist').textContent = artistText.replace(/;/g, ', ');
      
      if (item.ImageTags?.Primary) {
        document.getElementById('mini-artwork').innerHTML = `<img src="${getImageUrl(item._server, item.Id, item.ImageTags.Primary)}" alt="${item.Name}" class="w-full h-full object-cover" loading="lazy">`;
      }
      
      const activePlayer = item.MediaType === 'Video' ? videoPlayer : audioPlayer;
      activePlayer.play().catch(err => console.error('Autoplay failed:', err));
      
      document.getElementById('play-icon').classList.add('hidden');
      document.getElementById('pause-icon').classList.remove('hidden');
      document.querySelector('#mini-play-pause svg').outerHTML = '<svg class="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      
      showToast(`Now playing: ${item.Name}`);
    }
    
    function stopPlayer() {
      const videoPlayer = document.getElementById('video-player');
      const audioPlayer = document.getElementById('audio-player');
      
      videoPlayer.pause();
      videoPlayer.src = '';
      audioPlayer.pause();
      audioPlayer.src = '';
      
      document.getElementById('mini-player').classList.add('hidden');
      currentMediaItem = null;
    }
    
    function updatePlaybackUI() {
      const videoPlayer = document.getElementById('video-player');
      const audioPlayer = document.getElementById('audio-player');
      const activePlayer = videoPlayer.style.display !== 'none' ? videoPlayer : audioPlayer;
      
      if (!isNaN(activePlayer.duration)) {
        const progress = (activePlayer.currentTime / activePlayer.duration) * 100;
        document.getElementById('seek-bar').value = progress;
        document.getElementById('current-time').textContent = formatTime(activePlayer.currentTime);
        document.getElementById('total-time').textContent = formatTime(activePlayer.duration);
      }
    }
    
    // View Management
    function switchView(viewName) {
      document.querySelectorAll('#main-content > div').forEach(view => {
        view.classList.add('hidden');
      });
      
      document.getElementById(`${viewName}-view`).classList.remove('hidden');
      
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        item.classList.add('text-gray-400');
        if (item.dataset.view === viewName) {
          item.classList.add('active');
          item.classList.remove('text-gray-400');
        }
      });
      
      currentView = viewName;
    }
    
    // Event Listeners
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const passwordOasis = document.getElementById('password-oasis').value;
      const passwordJade = document.getElementById('password-jade').value;
      const loginBtn = document.getElementById('login-btn');
      const errorMsg = document.getElementById('login-error');
      
      loginBtn.disabled = true;
      loginBtn.textContent = 'Connecting...';
      errorMsg.classList.add('hidden');
      
      try {
        await login(username, passwordOasis, passwordJade);
        
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        
        document.getElementById('user-initial').textContent = username.charAt(0).toUpperCase();
        document.getElementById('settings-user-initial').textContent = username.charAt(0).toUpperCase();
        document.getElementById('settings-username').textContent = username;
        
        document.querySelectorAll('.theme-option').forEach(opt => {
          opt.querySelector('.theme-check').classList.add('hidden');
        });
        document.querySelector('.theme-option[data-theme="teal"] .theme-check').classList.remove('hidden');
        
        await loadHomeData();
        
      } catch (error) {
        errorMsg.textContent = 'Failed to connect to one or both servers';
        errorMsg.classList.remove('hidden');
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Connect to Both Servers';
      }
    });
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        switchView(view);
        if (view === 'home') loadHomeData();
      });
    });
    
    // Browse buttons
    document.getElementById('browse-movies').addEventListener('click', () => {
      loadMoviesLibrary();
      switchView('movies');
    });
    
    document.getElementById('browse-tv').addEventListener('click', () => {
      loadTVLibrary();
      switchView('tv');
    });
    
    document.getElementById('browse-music').addEventListener('click', () => {
      loadMusicLibrary();
      switchView('music');
    });
    
    // Back buttons
    document.getElementById('back-from-movies').addEventListener('click', () => switchView('home'));
    document.getElementById('back-from-tv').addEventListener('click', () => switchView('home'));
    document.getElementById('back-from-music').addEventListener('click', () => switchView('home'));
    document.getElementById('back-from-show-detail').addEventListener('click', () => switchView('tv'));
    document.getElementById('back-from-movie-detail').addEventListener('click', () => switchView('movies'));
    document.getElementById('back-from-artist-detail').addEventListener('click', () => switchView('music'));
    document.getElementById('back-from-album-detail').addEventListener('click', () => {
      if (currentMediaItem && currentMediaItem.AlbumArtist) {
        // Go back to artist - we'd need to store the artist reference
        switchView('music');
      } else {
        switchView('music');
      }
    });
    document.getElementById('back-from-search').addEventListener('click', () => switchView('home'));
    
    // Genre filters for movies
    document.querySelectorAll('#movies-view [data-genre]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#movies-view [data-genre]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        loadMoviesLibrary(pill.dataset.genre);
      });
    });
    
    // Genre filters for TV
    document.querySelectorAll('#tv-view [data-genre]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#tv-view [data-genre]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        loadTVLibrary(pill.dataset.genre);
      });
    });
    
    // Search
    document.getElementById('search-btn').addEventListener('click', () => {
      switchView('search');
      document.getElementById('search-input').focus();
    });
    
    document.getElementById('search-input').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => performSearch(e.target.value), 500);
    });
    
    // Search filter pills
    document.querySelectorAll('.search-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.search-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentSearchFilter = pill.dataset.filter;
        renderSearchResults();
      });
    });
    
    // Player controls
    document.getElementById('mini-play-pause').addEventListener('click', () => {
      const videoPlayer = document.getElementById('video-player');
      const audioPlayer = document.getElementById('audio-player');
      const activePlayer = videoPlayer.style.display !== 'none' ? videoPlayer : audioPlayer;
      
      if (activePlayer.paused) {
        activePlayer.play();
      } else {
        activePlayer.pause();
      }
    });
    
    document.getElementById('play-pause-btn').addEventListener('click', () => {
      const videoPlayer = document.getElementById('video-player');
      const audioPlayer = document.getElementById('audio-player');
      const activePlayer = videoPlayer.style.display !== 'none' ? videoPlayer : audioPlayer;
      
      if (activePlayer.paused) {
        activePlayer.play();
      } else {
        activePlayer.pause();
      }
    });
    
    document.getElementById('mini-expand').addEventListener('click', () => {
      const miniPlayer = document.getElementById('mini-player');
      const expandedControls = document.getElementById('expanded-controls');
      const expandIcon = document.getElementById('expand-icon');
      
      if (miniPlayer.classList.contains('expanded')) {
        miniPlayer.classList.remove('expanded');
        expandedControls.classList.add('hidden');
        expandIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>';
      } else {
        miniPlayer.classList.add('expanded');
        expandedControls.classList.remove('hidden');
        expandIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>';
      }
    });
    
    document.getElementById('close-player-btn').addEventListener('click', stopPlayer);
    
    document.getElementById('rewind-btn').addEventListener('click', () => {
      const videoPlayer = document.getElementById('video-player');
      const audioPlayer = document.getElementById('audio-player');
      const activePlayer = videoPlayer.style.display !== 'none' ? videoPlayer : audioPlayer;
      activePlayer.currentTime = Math.max(0, activePlayer.currentTime - 15);
    });
    
    document.getElementById('forward-btn').addEventListener('click', () => {
      const videoPlayer = document.getElementById('video-player');
      const audioPlayer = document.getElementById('audio-player');
      const activePlayer = videoPlayer.style.display !== 'none' ? videoPlayer : audioPlayer;
      activePlayer.currentTime = Math.min(activePlayer.duration, activePlayer.currentTime + 15);
    });
    
    document.getElementById('volume-bar').addEventListener('input', (e) => {
      const videoPlayer = document.getElementById('video-player');
      const audioPlayer = document.getElementById('audio-player');
      videoPlayer.volume = e.target.value / 100;
      audioPlayer.volume = e.target.value / 100;
    });
    
    document.getElementById('seek-bar').addEventListener('input', (e) => {
      const videoPlayer = document.getElementById('video-player');
      const audioPlayer = document.getElementById('audio-player');
      const activePlayer = videoPlayer.style.display !== 'none' ? videoPlayer : audioPlayer;
      const seekTime = (e.target.value / 100) * activePlayer.duration;
      activePlayer.currentTime = seekTime;
    });
    
    document.getElementById('video-player').addEventListener('timeupdate', updatePlaybackUI);
    document.getElementById('audio-player').addEventListener('timeupdate', updatePlaybackUI);
    
    document.getElementById('video-player').addEventListener('play', () => {
      document.getElementById('play-icon').classList.add('hidden');
      document.getElementById('pause-icon').classList.remove('hidden');
      document.querySelector('#mini-play-pause svg').outerHTML = '<svg class="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    });
    
    document.getElementById('video-player').addEventListener('pause', () => {
      document.getElementById('play-icon').classList.remove('hidden');
      document.getElementById('pause-icon').classList.add('hidden');
      document.querySelector('#mini-play-pause svg').outerHTML = '<svg class="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    });
    
    document.getElementById('audio-player').addEventListener('play', () => {
      document.getElementById('play-icon').classList.add('hidden');
      document.getElementById('pause-icon').classList.remove('hidden');
      document.querySelector('#mini-play-pause svg').outerHTML = '<svg class="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    });
    
    document.getElementById('audio-player').addEventListener('pause', () => {
      document.getElementById('play-icon').classList.remove('hidden');
      document.getElementById('pause-icon').classList.add('hidden');
      document.querySelector('#mini-play-pause svg').outerHTML = '<svg class="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    });
    
    // User menu
    document.getElementById('user-menu-btn').addEventListener('click', () => {
      document.getElementById('user-menu').classList.toggle('hidden');
    });
    
    document.getElementById('menu-settings').addEventListener('click', () => {
      document.getElementById('user-menu').classList.add('hidden');
      switchView('settings');
    });
    
    document.getElementById('menu-logout').addEventListener('click', () => {
      document.getElementById('user-menu').classList.add('hidden');
      logout();
    });
    
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    document.addEventListener('click', (e) => {
      const userMenu = document.getElementById('user-menu');
      const userMenuBtn = document.getElementById('user-menu-btn');
      if (!userMenu.contains(e.target) && !userMenuBtn.contains(e.target)) {
        userMenu.classList.add('hidden');
      }
    });
    
    // Theme selection
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        document.body.className = `h-full gradient-bg text-white overflow-auto theme-${theme}`;
        
        document.querySelectorAll('.theme-option .theme-check').forEach(check => check.classList.add('hidden'));
        option.querySelector('.theme-check').classList.remove('hidden');
        
        showToast('Theme updated');
      });
    });
    
    // Initialize
    if (checkAuth()) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      
      document.getElementById('user-initial').textContent = USERNAME.charAt(0).toUpperCase();
      document.getElementById('settings-user-initial').textContent = USERNAME.charAt(0).toUpperCase();
      document.getElementById('settings-username').textContent = USERNAME;
      
      document.querySelectorAll('.theme-option').forEach(opt => {
        opt.querySelector('.theme-check').classList.add('hidden');
      });
      document.querySelector('.theme-option[data-theme="teal"] .theme-check').classList.remove('hidden');
      
      loadHomeData();
    }
  
