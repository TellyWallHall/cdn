
      // ==================== App State ====================
      const APP = {
        servers: [
          {
            name: "Oasis Archive",
            url: "https://jelly.oasis-archive.org",
            token: null,
            userId: null,
          },
          {
            name: "Jade's Worlds",
            url: "https://jelly.jadesworlds.com",
            token: null,
            userId: null,
          },
        ],
        username: "",
        currentTab: "home",
        currentNestedTab: "video",
        currentAudioTab: "songs",
        searchFilter: "all",
        accentColor: "#8b5cf6",
        quality: "auto",
        theme: "dark", // 'light' or 'dark'
        library: {
          movies: [],
          tvshows: [],
          music: [],
          audiobooks: [],
          all: [],
        },
streamUrl: '',
        downloads: [],
        favorites: [],
        watchHistory: [],
        resumeData: {}, // Track resume positions
        currentMedia: null,
        isPlaying: false,
        currentLibraryPath: [],
        libraryCache: {},
        queue: [],
        queueIndex: 0,
        repeatMode: "off", // 'off', 'all', 'one'
        shuffleEnabled: false,
        shuffledQueue: [],
        offlineMode: false,
        offlineCache: {}, // Store downloadable metadata
        currentPlaySessionId: null,
        hlsInstance: null, 
    subtitleTracks: [],
    audioTracks: [],
    currentSubtitleIndex: -1,
    currentAudioIndex: 0,
    currentMediaSourceId: null,
    defaultAudioStreamIndex: 0,
    preferredSubtitleLang: null,
    preferredAudioLang: null,
      };

      // ==================== Local Storage ====================
      const Storage = {
        save(key, value) {
          try {
            localStorage.setItem(`arcadia_${key}`, JSON.stringify(value));
          } catch (e) {
            console.error("Storage save error:", e);
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
        },
      };

      // ==================== API Functions ====================
      const API = {
        async authenticate(serverIndex, username, password) {
          const server = APP.servers[serverIndex];
          try {
            const response = await fetch(
              `${server.url}/Users/AuthenticateByName`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Emby-Authorization": `MediaBrowser Client="Arcadia Worlds", Device="Web", DeviceId="${this.getDeviceId()}", Version="1.0.0"`,
                },
                body: JSON.stringify({ Username: username, Pw: password }),
              },
            );

            if (!response.ok) throw new Error("Authentication failed");

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
          let deviceId = Storage.load("deviceId");
          if (!deviceId) {
            deviceId = "arcadia_" + Math.random().toString(36).substr(2, 9);
            Storage.save("deviceId", deviceId);
          }
          return deviceId;
        },

        getHeaders(serverIndex) {
          const server = APP.servers[serverIndex];
          return {
            "X-Emby-Authorization": `MediaBrowser Client="Arcadia Worlds", Device="Web", DeviceId="${this.getDeviceId()}", Version="1.0.0", Token="${server.token}"`,
          };
        },

updateMediaSession(item) {
    if (!('mediaSession' in navigator)) return;
    const imageUrl = API.getImageUrl(item, "Primary", 512);
    navigator.mediaSession.metadata = new MediaMetadata({
        title: item.Name,
        artist: item.AlbumArtist || item.SeriesName || item.serverName,
        album: item.Album || "",
        artwork: imageUrl ? [{ src: imageUrl, sizes: "512x512", type: "image/jpeg" }] : []
    });
    navigator.mediaSession.setActionHandler("play", () => UI.togglePlay());
    navigator.mediaSession.setActionHandler("pause", () => UI.togglePlay());
    navigator.mediaSession.setActionHandler("previoustrack", () => {
        const prev = UI.getPreviousTrack();
        if (prev) UI.playMedia(prev);
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
        const next = UI.getNextTrack();
        if (next) UI.playMedia(next);
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
        const isVideo = APP.currentMedia &&
            ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type);
        const media = isVideo
            ? document.getElementById("video-player")
            : APP.audioElement;
        if (media && details.seekTime != null) {
            media.currentTime = details.seekTime;
        }
    });
},

async getNextUpAll() {
    const nextUp = [];
    for (let i = 0; i < APP.servers.length; i++) {
        const server = APP.servers[i];
        if (!server.token) continue;
        try {
            const response = await fetch(
                `${server.url}/Shows/NextUp?UserId=${server.userId}&Fields=Overview,MediaSources&Limit=20`,
                { headers: this.getHeaders(i) }
            );
            if (response.ok) {
                const data = await response.json();
                nextUp.push(...data.Items.map(item => ({
                    ...item, serverIndex: i, serverName: server.name
                })));
            }
        } catch (e) {}
    }
    return nextUp;
},

async getResumableItems(serverIndex) {
    const server = APP.servers[serverIndex];
    if (!server.token) return [];
    try {
        const response = await fetch(
            `${server.url}/Users/${server.userId}/Items/Resume?Limit=20&Fields=Overview,MediaSources`,
            { headers: this.getHeaders(serverIndex) }
        );
        if (!response.ok) return [];
        const data = await response.json();
        return data.Items.map(item => ({
            ...item, serverIndex, serverName: server.name
        }));
    } catch (e) { return []; }
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
                `${server.url}/Users/${server.userId}/Items?Recursive=true&IncludeItemTypes=Movie,Series,MusicAlbum,Audio,AudioBook,MusicArtist,Book&Fields=Overview,Genres,People,MediaSources,ParentId,AlbumArtist,Artists&SortBy=DateCreated&SortOrder=Descending&StartIndex=${startIndex}&Limit=${limit}`,
                { headers: this.getHeaders(serverIndex) },
              );

              if (!response.ok) throw new Error("Failed to fetch library");

              const data = await response.json();
              const items = data.Items.map((item) => ({
                ...item,
                serverIndex,
                serverName: server.name,
              }));

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

async reportPlaybackStart(item) {
  const server = APP.servers[item.serverIndex];
  if (!server.token) return;
  try {
    await fetch(`${server.url}/Sessions/Playing`, {
      method: "POST",
      headers: {
        ...this.getHeaders(item.serverIndex),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ItemId: item.Id,
        CanSeek: true,
        PlayMethod: "DirectStream",
        PlaySessionId: APP.currentPlaySessionId || this.getDeviceId()
      })
    });
  } catch (e) {
    console.error("Report playback start error:", e);
  }
},

async reportPlaybackProgress(item, positionSeconds, isPaused) {
  const server = APP.servers[item.serverIndex];
  if (!server.token) return;
  try {
    await fetch(`${server.url}/Sessions/Playing/Progress`, {
      method: "POST",
      headers: {
        ...this.getHeaders(item.serverIndex),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ItemId: item.Id,
        PositionTicks: Math.floor(positionSeconds * 10000000),
        IsPaused: isPaused,
        PlayMethod: "DirectStream",
        PlaySessionId: APP.currentPlaySessionId || this.getDeviceId()
      })
    });
  } catch (e) {
    console.error("Report playback progress error:", e);
  }
},

async reportPlaybackStopped(item, positionSeconds) {
  const server = APP.servers[item.serverIndex];
  if (!server.token) return;
  try {
    await fetch(`${server.url}/Sessions/Playing/Stopped`, {
      method: "POST",
      headers: {
        ...this.getHeaders(item.serverIndex),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ItemId: item.Id,
        PositionTicks: Math.floor(positionSeconds * 10000000),
        PlayMethod: "DirectStream",
        PlaySessionId: APP.currentPlaySessionId || this.getDeviceId()
      })
    });
  } catch (e) {
    console.error("Report playback stopped error:", e);
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
            url += parentId ? "&" : "?";
            url +=
              "Fields=Overview,Genres,MediaSources&SortBy=SortName&SortOrder=Ascending";

            const response = await fetch(url, {
              headers: this.getHeaders(serverIndex),
            });
            if (!response.ok) throw new Error("Failed to fetch folders");

            const data = await response.json();
            return data.Items.map((item) => ({
              ...item,
              serverIndex,
              serverName: server.name,
            }));
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
              { headers: this.getHeaders(serverIndex) },
            );

            if (!response.ok) throw new Error("Failed to fetch episodes");

            const data = await response.json();
            return data.Items.map((item) => ({
              ...item,
              serverIndex,
              serverName: server.name,
            }));
          } catch (e) {
            console.error("Fetch episodes error:", e);
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
                { headers: this.getHeaders(i) },
              );

              if (response.ok) {
                const data = await response.json();
                results.push(
                  ...data.Items.map((item) => ({
                    ...item,
                    serverIndex: i,
                    serverName: server.name,
                  })),
                );
              }
            } catch (e) {
              console.error(`Search error for ${server.name}:`, e);
            }
          }
          return results;
        },

        getImageUrl(item, type = "Primary", maxWidth = 400) {
          const server = APP.servers[item.serverIndex];
          if (!server || !item.ImageTags || !item.ImageTags[type]) {
            return null;
          }
          return `${server.url}/Items/${item.Id}/Images/${type}?maxWidth=${maxWidth}&tag=${item.ImageTags[type]}`;
        },

getStreamUrl(item) { 
    const server = APP.servers[item.serverIndex];
    if (!server || !server.token) return null;

    const maxBitrate = APP.quality === "auto" ? 40000000
        : APP.quality === "1080" ? 40000000
        : APP.quality === "720" ? 20000000
        : 10000000;
    APP.currentStreamUrl = `${server.url}/Videos/${item.Id}/master.m3u8?api_key=${server.token}&MediaSourceId=${item.Id}&VideoCodec=h264&AudioCodec=aac&MaxStreamingBitrate=${maxBitrate}&TranscodingMaxAudioChannels=2&PlaySessionId=${APP.currentPlaySessionId}`;
    // Use current play session ID (generated fresh in playMedia)
    return APP.currentStreamUrl;
},

        getAudioStreamUrl(item) {
          const server = APP.servers[item.serverIndex];
          if (!server || !server.token) return null;
          APP.currentStreamUrl = `${server.url}/Audio/${item.Id}/stream?static=true&api_key=${server.token}`;
          return APP.currentStreamUrl;
        },

        getFileUrl(item) {
          const server = APP.servers[item.serverIndex];
          if (!server || !server.token) return null;

          // Handle different media types
          switch (item.Type) {
            case "Movie":
            case "Episode":
            case "Series": {
              const quality =
                APP.quality === "auto"
                  ? ""
                  : `&MaxStreamingBitrate=${
                      APP.quality === "1080"
                        ? 40000000
                        : APP.quality === "720"
                          ? 20000000
                          : 10000000
                    }`;
              return `${server.url}/Videos/${item.Id}/stream?static=true&api_key=${server.token}${quality}`;
            }

            case "Audio": {
              return `${server.url}/Audio/${item.Id}/stream?static=true&api_key=${server.token}`;
            }

            case "Book":
            case "EBook":
            case "Pdf": {
              return `${server.url}/Items/${item.Id}/Download?api_key=${server.token}`;
            }

            default:
              return null;
          }
        },

        async downloadFile(item) {
          const url = this.getFileUrl(item);
          if (!url) return null;
          const response = await fetch(url, {
            signal: AbortSignal.timeout(300000),
          });
          if (!response.ok) throw new Error("Download failed");
          return await response.blob();
        },

        async getAlbumTracks(serverIndex, albumId) {
          const server = APP.servers[serverIndex];
          if (!server.token) return [];

          try {
            const response = await fetch(
              `${server.url}/Users/${server.userId}/Items?ParentId=${albumId}&Fields=Overview&SortBy=IndexNumber`,
              { headers: this.getHeaders(serverIndex) },
            );

            if (!response.ok) throw new Error("Failed to fetch album tracks");

            const data = await response.json();
            return data.Items.map((item) => ({
              ...item,
              serverIndex,
              serverName: server.name,
            }));
          } catch (e) {
            console.error("Fetch album tracks error:", e);
            return [];
          }
        },

        async getArtistAlbums(serverIndex, artistId, artistName) {
          const server = APP.servers[serverIndex];
          if (!server.token) return [];

          try {
            const response = await fetch(
              `${server.url}/Users/${server.userId}/Items?ArtistIds=${artistId}&IncludeItemTypes=MusicAlbum&Fields=Overview&Recursive=true&Limit=200`,
              { headers: this.getHeaders(serverIndex) },
            );

            if (!response.ok) throw new Error("Failed to fetch artist albums");

            const data = await response.json();
            return data.Items.map((item) => ({
              ...item,
              serverIndex,
              serverName: server.name,
            }));
          } catch (e) {
            console.error("Fetch artist albums error:", e);
            return [];
          }
        },
      };

      // ==================== UI Functions ====================
      const UI = {
        showToast(message, type = "success") {
          const toast = document.getElementById("toast");
          const icon = document.getElementById("toast-icon");
          const msg = document.getElementById("toast-message");

          msg.textContent = message;
          icon.className =
            type === "success"
              ? "fas fa-check-circle text-green-400 text-xl"
              : type === "error"
                ? "fas fa-exclamation-circle text-red-400 text-xl"
                : "fas fa-info-circle text-blue-400 text-xl";

          toast.classList.remove("hidden");
          setTimeout(() => toast.classList.add("hidden"), 3000);
        },

_resumeCache: null,
_resumeCacheTime: 0,

loadContinueWatching() {
    const continueSection = document.getElementById("continue-watching-section");
    const continueContainer = document.getElementById("continue-watching");
    
    // Cache for 30 seconds
    const now = Date.now();
    if (this._resumeCache && now - this._resumeCacheTime < 30000) {
        this._renderResumeItems(this._resumeCache, continueSection, continueContainer);
        return;
    }
    
    Promise.all([
        API.getResumableItems(0),
        API.getResumableItems(1)
    ]).then(([items1, items2]) => {
        const resumeItems = [...items1, ...items2];
        this._resumeCache = resumeItems;
        this._resumeCacheTime = now;
        this._renderResumeItems(resumeItems, continueSection, continueContainer);
    });
API.getNextUpAll().then(nextUpItems => {
    const section = document.getElementById("next-up-section");
    const container = document.getElementById("next-up");
    if (nextUpItems.length > 0) {
        section.classList.remove("hidden");
        container.innerHTML = "";
        nextUpItems.forEach(item =>
            container.appendChild(this.createMediaCard(item, "medium"))
        );
    } else {
        section.classList.add("hidden");
    }
});
},

_renderResumeItems(resumeItems, section, container) {
    if (resumeItems.length > 0) {
        section.classList.remove("hidden");
        container.innerHTML = "";
        resumeItems.forEach(item =>
            container.appendChild(this.createMediaCard(item, "medium"))
        );
    } else {
        section.classList.add("hidden");
    }
},

copyCurrentStreamUrl() {
  const textarea = document.createElement('textarea');
  textarea.value = APP.currentStreamUrl;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
},

        setAccentColor(color) {
          APP.accentColor = color;
          document.documentElement.style.setProperty("--accent-color", color);
          Storage.save("accentColor", color);

          document.querySelectorAll(".accent-color").forEach((btn) => {
            btn.classList.toggle("ring-2", btn.dataset.color === color);
            btn.classList.toggle("ring-white", btn.dataset.color === color);
            btn.classList.toggle("ring-offset-2", btn.dataset.color === color);
          });
        },

        setTheme(theme) {
          APP.theme = theme;
          Storage.save("theme", theme);

          const root = document.documentElement;
          if (theme === "light") {
            root.classList.add("light-theme");
            document.body.style.backgroundColor = "#f5f5f5";
            document.body.style.color = "#1a1a1a";
          } else {
            root.classList.remove("light-theme");
            document.body.style.backgroundColor = "#0f0f14";
            document.body.style.color = "#ffffff";
          }

          document.querySelectorAll(".theme-btn").forEach((btn) => {
            const isActive = btn.dataset.theme === theme;
            btn.classList.toggle("bg-violet-600", isActive);
            btn.classList.toggle("bg-white/10", !isActive);
            btn.classList.toggle("text-white", isActive);
            btn.classList.toggle("text-gray-400", !isActive);
          });

          Storage.save("theme", theme);
        },

        switchTab(tab) {
          APP.currentTab = tab;
          document
            .querySelectorAll(".tab-content")
            .forEach((el) => el.classList.add("hidden"));
          document.getElementById(`tab-${tab}`).classList.remove("hidden");

          document.querySelectorAll(".nav-tab").forEach((btn) => {
            const isActive = btn.dataset.tab === tab;
            btn.classList.toggle("text-violet-400", isActive);
            btn.classList.toggle("text-gray-500", !isActive);
          });

          // Show/hide download folder button based on tab
          const downloadBtn = document.getElementById("download-folder-btn");
          if (tab === "library" && APP.currentLibraryPath.length > 0) {
            downloadBtn.classList.remove("hidden");
          } else {
            downloadBtn.classList.add("hidden");
          }

          if (tab === "library" && APP.currentLibraryPath.length === 0) {
            this.loadLibraryRoot();
          }
        },

        switchNestedTab(tab) {
          APP.currentNestedTab = tab;
          document.querySelectorAll(".nested-tab").forEach((btn) => {
            const isActive = btn.dataset.nested === tab;
            btn.classList.toggle("nested-tab-active", isActive);
            btn.classList.toggle("text-gray-400", !isActive);
          });

          document
            .querySelectorAll(".nested-content")
            .forEach((el) => el.classList.add("hidden"));
          document.getElementById(`nested-${tab}`).classList.remove("hidden");
        },

        switchAudioTab(tab) {
          APP.currentAudioTab = tab;
          document.querySelectorAll(".audio-tab").forEach((btn) => {
            const isActive = btn.dataset.audio === tab;
            btn.classList.toggle("border-b-2", isActive);
            btn.classList.toggle("border-violet-500", isActive);
            btn.classList.toggle("text-white", isActive);
            btn.classList.toggle("text-gray-400", !isActive);
          });

          document
            .querySelectorAll(".audio-content")
            .forEach((el) => el.classList.add("hidden"));
          document.getElementById(`audio-${tab}`).classList.remove("hidden");
        },
 
attachVideo(videoElement, url) {
    if (APP.hlsInstance) {
        APP.hlsInstance.destroy();
        APP.hlsInstance = null;
    }

    videoElement.pause();
    videoElement.removeAttribute('src');
    videoElement.load();

    // Remove existing track elements
    const existingTracks = videoElement.querySelectorAll("track");
    existingTracks.forEach(t => t.remove());

    if (url && url.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWebVTT: true,      // Enable WebVTT subtitle support
            enableCEA708Captions: true, // Enable CEA-708 captions
            enableIMSC1: true,       // Enable IMSC1 subtitles
        });

        hls.loadSource(url);
        hls.attachMedia(videoElement);

        // Setup track event listeners
        TrackManager.setupHlsTrackEvents(hls);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoElement.play().catch(e => {
                console.warn("Auto-play blocked:", e);
            });

            // Load tracks after manifest is parsed
            if (APP.currentMedia) {
                TrackManager.loadTracks(APP.currentMedia);
            }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.error("HLS fatal error:", data);
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    hls.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                } else {
                    hls.destroy();
                    APP.hlsInstance = null;
                    const fallbackUrl = url.replace('/master.m3u8', '/stream');
                    videoElement.src = fallbackUrl;
                    videoElement.play().catch(() => {});
                }
            }
        });

        APP.hlsInstance = hls;
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        videoElement.src = url;
        videoElement.play().catch(() => {});
        
        // Load tracks for native playback
        if (APP.currentMedia) {
            TrackManager.loadTracks(APP.currentMedia);
        }
    } else {
        videoElement.src = url;
        videoElement.play().catch(() => {});
    }
},

        createMediaCard(item, size = "medium") {
          const imageUrl = API.getImageUrl(item);
          const sizeClasses = {
            small: "w-24 h-36",
            medium: "w-32 h-48",
            large: "w-40 h-60",
          };

          const card = document.createElement("div");
          card.className = `media-card ${sizeClasses[size]} flex-shrink-0 rounded-xl overflow-hidden relative cursor-pointer carousel-item`;
          card.innerHTML = `
          <div class="absolute inset-0 ${imageUrl ? "bg-cover bg-center" : "bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center"}" 
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
            ${!imageUrl ? `<i class="fas ${item.Type === "Movie" ? "fa-film" : item.Type === "Series" ? "fa-tv" : "fa-music"} text-3xl opacity-50"></i>` : ""}
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <div class="absolute bottom-0 left-0 right-0 p-2">
            <p class="text-xs font-medium line-clamp-2">${item.Name}</p>
            <p class="text-xs text-gray-400">${item.ProductionYear || ""}</p>
          </div>
          ${
            item.UserData?.PlaybackPositionTicks
              ? `
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div class="h-full progress-bar" style="width: ${(item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100}%"></div>
            </div>
          `
              : ""
          }
        `;

          card.addEventListener("click", () => this.showMediaDetail(item));
          return card;
        },

        createSongRow(item, index) {
          const imageUrl = API.getImageUrl(item);
          const duration = item.RunTimeTicks
            ? this.formatDuration(item.RunTimeTicks)
            : "";

          const row = document.createElement("div");
          row.className =
            "flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors";
          row.innerHTML = `
          <span class="w-6 text-center text-gray-500 text-sm">${index + 1}</span>
          <div class="w-10 h-10 rounded-lg flex-shrink-0 ${imageUrl ? "bg-cover bg-center" : "bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center"}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
            ${!imageUrl ? '<i class="fas fa-music text-sm opacity-50"></i>' : ""}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${item.Name}</p>
            <p class="text-xs text-gray-400 truncate">${item.AlbumArtist || item.Artists?.join(", ") || "Unknown Artist"}</p>
          </div>
          <span class="text-xs text-gray-500">${duration}</span>
          <button class="song-menu w-8 h-8 flex items-center justify-center text-gray-500">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        `;

          row.addEventListener("click", (e) => {
            if (!e.target.closest(".song-menu")) {
              this.playMedia(item);
            }
          });

          return row;
        },

        createBookCard(item) {
          const imageUrl = API.getImageUrl(item);
          const key = `${item.serverIndex}_${item.Id}`;
          const progress = Reader.readingProgress[key];

          const card = document.createElement("div");
          card.className = "cursor-pointer";
          card.innerHTML = `
        <div class="aspect-[2/3] rounded-xl overflow-hidden relative ${imageUrl ? "bg-cover bg-center" : "bg-gradient-to-br from-amber-900/50 to-orange-900/50 flex items-center justify-center"}"
            ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
            ${!imageUrl ? '<i class="fas fa-book text-2xl opacity-50"></i>' : ""}
            ${
              progress
                ? `
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div class="h-full bg-amber-400" style="width: ${Math.round((progress.page / (progress.total || 1)) * 100)}%"></div>
                </div>
            `
                : ""
            }
        </div>
        <p class="text-xs font-medium mt-2 line-clamp-2">${item.Name}</p>
        ${progress ? `<p class="text-xs text-amber-400">Page ${progress.page}/${progress.total}</p>` : ""}
    `;
          card.addEventListener("click", () => Reader.open(item));
          return card;
        },

        renderBooks() {
          const books = APP.library.all.filter(
            (i) =>
              i.Type === "Book" || i.Type === "Pdf" || i.Type === "Document",
          );

          // Currently reading
          const readingSection = document.getElementById(
            "currently-reading-section",
          );
          const readingContainer = document.getElementById("currently-reading");
          const inProgress = books.filter((b) => {
            const key = `${b.serverIndex}_${b.Id}`;
            return Reader.readingProgress[key];
          });

          if (inProgress.length > 0) {
            readingSection.classList.remove("hidden");
            readingContainer.innerHTML = "";
            inProgress.forEach((item) => {
              readingContainer.appendChild(this.createBookCard(item));
            });
          } else {
            readingSection.classList.add("hidden");
          }

          // All books
          const booksGrid = document.getElementById("books-grid");
          booksGrid.innerHTML = "";
          if (books.length === 0) {
            booksGrid.innerHTML =
              '<p class="text-gray-500 text-sm text-center col-span-3 py-8">No books found</p>';
          } else {
            books.forEach((item) => {
              booksGrid.appendChild(this.createBookCard(item));
            });
          }
        },

        createAlbumCard(item) {
          const imageUrl = API.getImageUrl(item);

          const card = document.createElement("div");
          card.className = "cursor-pointer";
          card.innerHTML = `
          <div class="aspect-square rounded-xl overflow-hidden ${imageUrl ? "bg-cover bg-center" : "bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center"}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
            ${!imageUrl ? '<i class="fas fa-compact-disc text-3xl opacity-50"></i>' : ""}
          </div>
          <p class="text-sm font-medium mt-2 line-clamp-1">${item.Name}</p>
          <p class="text-xs text-gray-400 line-clamp-1">${item.AlbumArtist || "Unknown Artist"}</p>
        `;

          card.addEventListener("click", () => this.showMediaDetail(item));
          return card;
        },

        createArtistCard(item) {
          const imageUrl = API.getImageUrl(item);

          const card = document.createElement("div");
          card.className = "cursor-pointer text-center";
          card.innerHTML = `
          <div class="aspect-square rounded-full overflow-hidden mx-auto ${imageUrl ? "bg-cover bg-center" : "bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center"}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
            ${!imageUrl ? '<i class="fas fa-user text-xl opacity-50"></i>' : ""}
          </div>
          <p class="text-xs font-medium mt-2 line-clamp-1">${item.Name}</p>
        `;

          card.addEventListener("click", () => this.showMediaDetail(item));
          return card;
        },

        formatDuration(ticks) {
          const seconds = Math.floor(ticks / 10000000);
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins}:${secs.toString().padStart(2, "0")}`;
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
          const container = document.getElementById("library-folders");
          container.innerHTML =
            '<div class="shimmer h-12 rounded-xl"></div>'.repeat(4);

          // Load root folders from both servers
          const folders = [];
          for (let i = 0; i < APP.servers.length; i++) {
            const serverFolders = await API.fetchFolders(i);
            folders.push(...serverFolders);
          }

          container.innerHTML = "";
          folders.forEach((folder) => {
            const item = this.createFolderItem(folder);
            container.appendChild(item);
          });

          if (folders.length === 0) {
            container.innerHTML =
              '<p class="text-gray-500 text-center py-8">No folders found</p>';
          }
        },

        createFolderItem(item) {
          const isPlayable = [
            "Movie",
            "Episode",
            "Audio",
            "AudioBook",
          ].includes(item.Type);
          const isViewable = ["Book", "Document", "Pdf"].includes(item.Type);
          const imageUrl = API.getImageUrl(item, "Primary", 100);

          const div = document.createElement("div");
          div.className =
            "folder-item flex items-center gap-3 p-3 rounded-xl cursor-pointer";
          div.innerHTML = `
          <div class="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${imageUrl ? "bg-cover bg-center" : "bg-white/5"}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
            ${!imageUrl ? `<i class="fas ${this.getIconForType(item.Type)} text-lg text-gray-400"></i>` : ""}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">${item.Name}</p>
            <p class="text-xs text-gray-400">${item.Type} • ${item.serverName}</p>
          </div>
          <i class="fas ${isPlayable || isViewable ? "fa-play" : "fa-chevron-right"} text-gray-500"></i>
        `;

          div.addEventListener("click", () => {
            if (isPlayable) {
              this.playMedia(item);
            } else if (isViewable) {
              this.openDocument(item);
            } else {
              this.navigateToFolder(item);
            }
          });

          return div;
        },

        getIconForType(type) {
          const icons = {
            Folder: "fa-folder",
            CollectionFolder: "fa-folder",
            Movie: "fa-film",
            Series: "fa-tv",
            Season: "fa-layer-group",
            Episode: "fa-play-circle",
            MusicAlbum: "fa-compact-disc",
            MusicArtist: "fa-user",
            Audio: "fa-music",
            AudioBook: "fa-book",
            Book: "fa-book",
            Document: "fa-file-pdf",
          };
          return icons[type] || "fa-file";
        },

        async navigateToFolder(item) {
          APP.currentLibraryPath.push(item);
          this.updateBreadcrumb();

          // Show download button when inside a folder
          document
            .getElementById("download-folder-btn")
            .classList.remove("hidden");

          const container = document.getElementById("library-folders");
          container.innerHTML =
            '<div class="shimmer h-12 rounded-xl"></div>'.repeat(4);

          const folders = await API.fetchFolders(item.serverIndex, item.Id);

          container.innerHTML = "";
          folders.forEach((folder) => {
            const folderItem = this.createFolderItem(folder);
            container.appendChild(folderItem);
          });

          if (folders.length === 0) {
            container.innerHTML =
              '<p class="text-gray-500 text-center py-8">No items found</p>';
          }
        },

        updateBreadcrumb() {
          const breadcrumb = document.getElementById("library-breadcrumb");
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

          breadcrumb.querySelectorAll(".breadcrumb-item").forEach((btn) => {
            btn.addEventListener("click", () => {
              const path = btn.dataset.path;
              if (path === "root") {
                APP.currentLibraryPath = [];
                this.loadLibraryRoot();
              } else {
                const index = parseInt(path);
                APP.currentLibraryPath = APP.currentLibraryPath.slice(
                  0,
                  index + 1,
                );
                this.navigateToFolder(APP.currentLibraryPath[index]);
              }
              this.updateBreadcrumb();
            });
          });
        },

        openDocument(item) {
          Reader.open(item);
        },

        async showMediaDetail(item) {
          const modal = document.getElementById("detail-modal");
          const backdrop = document.getElementById("detail-backdrop");
          const poster = document.getElementById("detail-poster");

          const backdropUrl =
            API.getImageUrl(item, "Backdrop", 800) ||
            API.getImageUrl(item, "Primary", 800);
          const posterUrl = API.getImageUrl(item);

          backdrop.style.backgroundImage = backdropUrl
            ? `url('${backdropUrl}')`
            : "linear-gradient(135deg, #4c1d95, #7c3aed)";
          poster.style.backgroundImage = posterUrl ? `url('${posterUrl}')` : "";

          document.getElementById("detail-title").textContent = item.Name;
          document.getElementById("detail-meta").textContent =
            `${item.ProductionYear || ""} ${item.RunTimeTicks ? "• " + this.formatDurationLong(item.RunTimeTicks) : ""}`;
          document.getElementById("detail-rating").innerHTML =
            item.CommunityRating
              ? `<i class="fas fa-star text-yellow-400 text-sm"></i><span class="text-sm">${item.CommunityRating.toFixed(1)}</span>`
              : "";
          document.getElementById("detail-overview").textContent =
            item.Overview || "No description available.";

          // Genres
          const genresContainer = document.getElementById("detail-genres");
          genresContainer.innerHTML = (item.Genres || [])
            .map(
              (g) =>
                `<span class="px-2 py-1 bg-white/10 rounded-full text-xs">${g}</span>`,
            )
            .join("");

          // Hide all content sections first
          document
            .getElementById("detail-episodes-section")
            .classList.add("hidden");
          document
            .getElementById("detail-tracks-section")
            .classList.add("hidden");
          document
            .getElementById("detail-artist-albums-section")
            .classList.add("hidden");
          document
            .getElementById("detail-artist-songs-section")
            .classList.add("hidden");
          document
            .getElementById("detail-cast-section")
            .classList.add("hidden");

          // Episodes for TV Shows
if (item.Type === "Series") {
    document.getElementById("detail-episodes-section").classList.remove("hidden");
    const episodes = await API.fetchEpisodes(item.serverIndex, item.Id);
    
    const seasonMap = {};
    episodes.forEach(ep => {
        const seasonNum = ep.ParentIndexNumber || 1;
        if (!seasonMap[seasonNum]) seasonMap[seasonNum] = [];
        seasonMap[seasonNum].push(ep);
    });
    
    const seasonSelect = document.getElementById("detail-season-select");
    const episodeList = document.getElementById("detail-episode-list");
    
    seasonSelect.innerHTML = "";
    Object.keys(seasonMap).sort((a, b) => a - b).forEach(seasonNum => {
        const option = document.createElement("option");
        option.value = seasonNum;
        option.textContent = `Season ${seasonNum}`;
        seasonSelect.appendChild(option);
    });
    
    const renderEpisodes = (seasonNum) => {
        const eps = seasonMap[seasonNum] || [];
        episodeList.innerHTML = "";
        eps.forEach(ep => {
            const epImg = API.getImageUrl(ep, "Primary", 200);
            const progress = ep.UserData?.PlaybackPositionTicks && ep.RunTimeTicks
                ? Math.round((ep.UserData.PlaybackPositionTicks / ep.RunTimeTicks) * 100)
                : 0;
            const div = document.createElement("div");
            div.className = "flex gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors";
            div.innerHTML = `
                <div class="w-28 h-16 rounded-lg flex-shrink-0 bg-white/10 relative overflow-hidden
                    ${epImg ? 'bg-cover bg-center' : 'flex items-center justify-center'}"
                    ${epImg ? `style="background-image: url('${epImg}')"` : ""}>
                    ${!epImg ? '<i class="fas fa-play-circle text-xl opacity-50"></i>' : ''}
                    ${progress > 0 ? `<div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div class="h-full progress-bar" style="width:${progress}%"></div>
                    </div>` : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium">E${ep.IndexNumber || '?'} · ${ep.Name}</p>
                    <p class="text-xs text-gray-400 line-clamp-2 mt-1">${ep.Overview || ''}</p>
                    <p class="text-xs text-gray-500 mt-1">${ep.RunTimeTicks ? UI.formatDurationLong(ep.RunTimeTicks) : ''}</p>
                </div>`;
            div.addEventListener("click", () => {
                UI.playMedia(ep);
                modal.classList.add("hidden");
            });
            episodeList.appendChild(div);
        });
    };
    
    renderEpisodes(seasonSelect.value);
    seasonSelect.addEventListener("change", () => renderEpisodes(seasonSelect.value));
}

          // Tracks for Albums
          if (item.Type === "MusicAlbum") {
            document
              .getElementById("detail-tracks-section")
              .classList.remove("hidden");
            const tracksContainer = document.getElementById("detail-tracks");
            tracksContainer.innerHTML =
              '<div class="shimmer h-12 rounded-xl"></div>'.repeat(3);

            const tracks = await API.getAlbumTracks(item.serverIndex, item.Id);
            tracksContainer.innerHTML = "";

            tracks.forEach((track, index) => {
              const trackDiv = this.createSongRow(track, index);
              trackDiv.classList.add("bg-white/5");
              tracksContainer.appendChild(trackDiv);
            });
          }

          // Albums and Songs for Artists
          if (item.Type === "MusicArtist") {
            document
              .getElementById("detail-artist-albums-section")
              .classList.remove("hidden");
            document
              .getElementById("detail-artist-songs-section")
              .classList.remove("hidden");

            // Load artist albums
            const albumsContainer = document.getElementById(
              "detail-artist-albums",
            );
            albumsContainer.innerHTML =
              '<div class="shimmer h-32 rounded-xl"></div>'.repeat(3);

            const albums = await API.getArtistAlbums(
              item.serverIndex,
              item.Id,
              item.Name,
            );
            albumsContainer.innerHTML = "";

            if (albums.length === 0) {
              albumsContainer.innerHTML =
                '<p class="text-gray-500 text-sm col-span-3">No albums found</p>';
            } else {
              albums.slice(0, 12).forEach((album) => {
                albumsContainer.appendChild(this.createArtistAlbumCard(album));
              });
            }

            // Load songs from artist's albums
            const songsContainer = document.getElementById(
              "detail-artist-songs",
            );
            songsContainer.innerHTML =
              '<div class="shimmer h-12 rounded-xl"></div>'.repeat(5);

            const allSongs = [];
            for (const album of albums.slice(0, 5)) {
              const tracks = await API.getAlbumTracks(
                item.serverIndex,
                album.Id,
              );
              allSongs.push(...tracks);
            }

            songsContainer.innerHTML = "";
            if (allSongs.length === 0) {
              songsContainer.innerHTML =
                '<p class="text-gray-500 text-sm">No songs found</p>';
            } else {
              allSongs.slice(0, 20).forEach((song, index) => {
                const songRow = this.createSongRow(song, index);
                songRow.classList.add("bg-white/5");
                songsContainer.appendChild(songRow);
              });
            }
          }

          // Cast for videos
          if (["Movie", "Series", "Episode"].includes(item.Type)) {
            document
              .getElementById("detail-cast-section")
              .classList.remove("hidden");
            const castContainer = document.getElementById("detail-cast");
            castContainer.innerHTML = (item.People || [])
              .slice(0, 10)
              .map((person) => {
                return `
              <div class="flex-shrink-0 text-center w-16">
                <div class="w-14 h-14 rounded-full bg-white/10 mx-auto flex items-center justify-center">
                  <i class="fas fa-user text-gray-500"></i>
                </div>
                <p class="text-xs mt-1 line-clamp-1">${person.Name}</p>
                <p class="text-xs text-gray-500 line-clamp-1">${person.Role || person.Type}</p>
              </div>
            `;
              })
              .join("");
          }

          // Store current item for actions
          modal.dataset.itemId = item.Id;
          modal.dataset.serverIndex = item.serverIndex;
          APP.detailItem = item;

          modal.classList.remove("hidden");
        },

        createArtistAlbumCard(item) {
          const imageUrl = API.getImageUrl(item);

          const card = document.createElement("div");
          card.className = "cursor-pointer text-center";
          card.innerHTML = `
          <div class="aspect-square rounded-xl overflow-hidden ${imageUrl ? "bg-cover bg-center" : "bg-gradient-to-br from-violet-600/50 to-purple-600/50 flex items-center justify-center"}"
               ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
            ${!imageUrl ? '<i class="fas fa-compact-disc text-2xl opacity-50"></i>' : ""}
          </div>
          <p class="text-xs font-medium mt-2 line-clamp-1">${item.Name}</p>
          <p class="text-xs text-gray-400 line-clamp-1">${item.ProductionYear || ""}</p>
        `;

          card.addEventListener("click", () => this.showMediaDetail(item));
          return card;
        },

async playMedia(item) {
    if (this._playingLock) return;
    this._playingLock = true;
try {
    // Stop old transcoding session before starting new one
    if (APP.currentMedia && APP.currentPlaySessionId) {
        const isOldVideo = ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type);
        const oldMedia = isOldVideo
            ? document.getElementById("video-player")
            : APP.audioElement;
        const oldPos = oldMedia ? oldMedia.currentTime || 0 : 0;
        API.reportPlaybackStopped(APP.currentMedia, oldPos);
    }

    // Generate unique session ID for this playback
    APP.currentPlaySessionId = 'play_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);

    APP.currentMedia = item;
    const isVideo = ["Movie", "Episode", "Series"].includes(item.Type);
        await this.buildQueueFromItem(item);

          // Update mini player
          const miniPlayer = document.getElementById("mini-player");
          const miniThumb = document.getElementById("mini-thumb");
          const miniTitle = document.getElementById("mini-title");
          const miniArtist = document.getElementById("mini-artist");

          const imageUrl = API.getImageUrl(item);
          miniThumb.style.backgroundImage = imageUrl
            ? `url('${imageUrl}')`
            : "";
          miniTitle.textContent = item.Name;
          miniArtist.textContent =
            item.AlbumArtist || item.SeriesName || item.serverName;

          // Show resume info if available
          const resumeKey = `${item.serverIndex}_${item.Id}`;
          const resumeData = APP.resumeData[resumeKey];
          if (resumeData && resumeData.position > 0) {
            document.getElementById("mini-resume").classList.remove("hidden");
            document.getElementById("mini-resume-time").textContent =
              this.formatTime(resumeData.position);
          } else {
            document.getElementById("mini-resume").classList.add("hidden");
          }

          miniPlayer.classList.remove("hidden");

          // Update full player
          const playerBg = document.getElementById("player-bg");
          const playerArtwork = document.getElementById("player-artwork");
          const playerTitle = document.getElementById("player-title");
          const playerArtist = document.getElementById("player-artist");

          const backdropUrl =
            API.getImageUrl(item, "Backdrop", 800) ||
            API.getImageUrl(item, "Primary", 800);
          playerBg.style.backgroundImage = backdropUrl
            ? `url('${backdropUrl}')`
            : "";
          playerArtwork.style.backgroundImage = imageUrl
            ? `url('${imageUrl}')`
            : "";
          playerTitle.textContent = item.Name;
          playerArtist.textContent = item.AlbumArtist || item.SeriesName || "";

          document.getElementById("player-source-name").textContent =
            item.serverName;

          // Show/hide video container
          const videoContainer = document.getElementById("video-container");
          const audioArtworkContainer = document.getElementById(
            "audio-artwork-container",
          );
          const videoPlayer = document.getElementById("video-player");

// In playMedia, after attaching video:
if (isVideo) {
    videoContainer.classList.remove("hidden");
    audioArtworkContainer.classList.add("hidden");

    // Reset track state
    APP.subtitleTracks = [];
    APP.audioTracks = [];
    APP.currentSubtitleIndex = -1;
    APP.currentAudioIndex = 0;

    if (APP.audioElement) {
        APP.audioElement.pause();
        APP.audioElement.removeAttribute('src');
        APP.audioElement.load();
    }

    // Handle resume position
    if (resumeData && resumeData.position > 0) {
        document.getElementById("player-resume-info").classList.remove("hidden");
        document.getElementById("player-resume-pos").textContent = this.formatTime(resumeData.position);
        videoPlayer.addEventListener("loadedmetadata", function onReady() {
            videoPlayer.currentTime = resumeData.position;
            videoPlayer.removeEventListener("loadedmetadata", onReady);
        });
    } else {
        document.getElementById("player-resume-info").classList.add("hidden");
    }

    this.attachVideo(videoPlayer, API.getStreamUrl(item));
    API.reportPlaybackStart(item);

    // Load tracks after a short delay to ensure video is loading
    setTimeout(() => {
        TrackManager.loadTracks(item);
    }, 1000);
} else {
            videoContainer.classList.add("hidden");
            audioArtworkContainer.classList.remove("hidden");
            if (APP.audioElement) {
              APP.audioElement.pause();
              APP.audioElement.removeAttribute('src');
              APP.audioElement.load(); // Release resources
            }
            // Create audio element if needed
if (!APP.audioElement) {
    APP.audioElement = new Audio();
    APP.audioElement.addEventListener("timeupdate", () => this.updateProgress());
    APP.audioElement.addEventListener("ended", () => {
        if (APP.repeatMode === "one") {
            APP.audioElement.currentTime = 0;
            APP.audioElement.play();
            API.reportPlaybackStart(APP.currentMedia);
        } else {
            const nextTrack = this.getNextTrack();
            if (nextTrack) {
                this.playMedia(nextTrack);
            } else {
                this.handleMediaEnd();
            }
        }
    });
}
            APP.audioElement.src = API.getAudioStreamUrl(item);
            APP.audioElement.play();
          }

          APP.isPlaying = true;
          this.updatePlayButton();
          this.addToWatchHistory(item);
          this.updateQueueDisplay();
          API.updateMediaSession(item)
    } finally {
        SyncPlay.onMediaPlay(item);
        this._playingLock = false;
    }
},

togglePlay() {
    // Check if SyncPlay should handle this
    if (SyncPlay.isConnected && SyncPlay.onPlayPause()) {
        return; // SyncPlay handled it
    }

    const isVideo = APP.currentMedia && ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type);
    const media = isVideo ? document.getElementById("video-player") : APP.audioElement;

    if (!media) return;

    if (APP.isPlaying) {
        media.pause();
        API.reportPlaybackProgress(APP.currentMedia, media.currentTime, true);
    } else {
        media.play();
    }

    APP.isPlaying = !APP.isPlaying;
    this.updatePlayButton();
},

        updatePlayButton() {
          const miniPlay = document.getElementById("mini-play");
          const playerPlay = document.getElementById("player-play");
          const icon = APP.isPlaying ? "fa-pause" : "fa-play";

          miniPlay.innerHTML = `<i class="fas ${icon}"></i>`;
          playerPlay.innerHTML = `<i class="fas ${icon} text-2xl"></i>`;
        },

        updateProgress() {
          const isVideo =
            APP.currentMedia &&
            ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type);
          const media = isVideo
            ? document.getElementById("video-player")
            : APP.audioElement;

          if (!media || !media.duration) return;

if (!APP._lastProgressReport || 
    Date.now() - APP._lastProgressReport > 10000) {
  API.reportPlaybackProgress(
    APP.currentMedia, media.currentTime, !APP.isPlaying
  );
  APP._lastProgressReport = Date.now();
}

          const progress = (media.currentTime / media.duration) * 100;
          document.getElementById("mini-progress").style.width = `${progress}%`;
          document.getElementById("player-seek").value = progress;
          document.getElementById("player-current").textContent =
            this.formatTime(media.currentTime);
          document.getElementById("player-duration").textContent =
            this.formatTime(media.duration);

          // Save resume position every 5 seconds
          if (APP.currentMedia && media.currentTime > 0) {
            const resumeKey = `${APP.currentMedia.serverIndex}_${APP.currentMedia.Id}`;
            if (
              !APP.resumeData[resumeKey] ||
              Math.floor(APP.resumeData[resumeKey].lastSaved / 1000) <
                Math.floor(Date.now() / 1000) - 5
            ) {
              APP.resumeData[resumeKey] = {
                position: media.currentTime,
                duration: media.duration,
                lastWatched: Date.now(),
                lastSaved: Date.now(),
              };
              Storage.save("resumeData", APP.resumeData);
            }
          }
        },

        formatTime(seconds) {
          const hrs = Math.floor(seconds / 60 / 60);
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          const ifHrs = hrs > 0 ? `${hrs}:` : '';
          return `${ifHrs}${mins - (hrs * 60)}:${secs.toString().padStart(2, "0")}`;
        },

handleMediaEnd() {
if (APP.hlsInstance) {
    APP.hlsInstance.destroy();
    APP.hlsInstance = null;
}
    const isVideo = APP.currentMedia &&
        ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type);
    const media = isVideo
        ? document.getElementById("video-player")
        : APP.audioElement;
    APP.isPlaying = false;
    this.updatePlayButton();
    if (media) API.reportPlaybackStopped(APP.currentMedia, media.currentTime);
},

seekTo(percent) {
    const isVideo = APP.currentMedia && ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type);
    const media = isVideo ? document.getElementById("video-player") : APP.audioElement;

    if (!media || !media.duration) return;

    const positionSeconds = (percent / 100) * media.duration;

    // Check if SyncPlay should handle this
    if (SyncPlay.isConnected && SyncPlay.onSeek(positionSeconds)) {
        return; // SyncPlay will sync the seek
    }

    media.currentTime = positionSeconds;
},

        addToWatchHistory(item) {
          const existing = APP.watchHistory.findIndex((h) => h.Id === item.Id);
          if (existing > -1) {
            APP.watchHistory.splice(existing, 1);
          }
          APP.watchHistory.unshift({
            Id: item.Id,
            Name: item.Name,
            Type: item.Type,
            timestamp: Date.now(),
            serverIndex: item.serverIndex,
          });

          if (APP.watchHistory.length > 50) {
            APP.watchHistory = APP.watchHistory.slice(0, 50);
          }

          Storage.save("watchHistory", APP.watchHistory);
          this.updateWatchHistory();
        },

        updateWatchHistory() {
          const container = document.getElementById("watch-history");
          if (APP.watchHistory.length === 0) {
            container.innerHTML =
              '<p class="text-gray-500 text-sm">No watch history yet</p>';
            return;
          }

          container.innerHTML = APP.watchHistory
            .slice(0, 10)
            .map(
              (item) => `
          <div class="flex items-center gap-3 py-2">
            <i class="fas ${this.getIconForType(item.Type)} text-gray-500 w-6 text-center"></i>
            <div class="flex-1 min-w-0">
              <p class="text-sm truncate">${item.Name}</p>
              <p class="text-xs text-gray-500">${new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
          </div>
        `,
            )
            .join("");
        },

        toggleFavorite(item) {
          const existing = APP.favorites.findIndex((f) => f.Id === item.Id);
          if (existing > -1) {
            APP.favorites.splice(existing, 1);
            this.showToast("Removed from favorites");
          } else {
            APP.favorites.unshift({
              Id: item.Id,
              Name: item.Name,
              Type: item.Type,
              serverIndex: item.serverIndex,
              ImageTags: item.ImageTags,
            });
            this.showToast("Added to favorites");
          }

          Storage.save("favorites", APP.favorites);
          this.updateFavorites();
        },

        async buildQueueFromItem(item) {
          APP.queue = [];
          APP.queueIndex = 0;
          APP.shuffledQueue = [];

          // Single playable item - build queue from its context
          if (item.Type === "Audio" && item.ParentId) {
            // For songs, get all songs from the album
            const tracks = await API.getAlbumTracks(
              item.serverIndex,
              item.ParentId,
            );
            APP.queue = tracks.map((t) => ({
              ...t,
              serverIndex: item.serverIndex,
              serverName: item.serverName,
            }));
            APP.queueIndex = APP.queue.findIndex((t) => t.Id === item.Id) || 0;
          } else if (item.Type === "Episode" && item.SeriesId) {
            // For episodes, get all episodes from series
            const episodes = await API.fetchEpisodes(
              item.serverIndex,
              item.SeriesId,
            );
            APP.queue = episodes.map((e) => ({
              ...e,
              serverIndex: item.serverIndex,
              serverName: item.serverName,
            }));
            APP.queueIndex = APP.queue.findIndex((e) => e.Id === item.Id) || 0;
          } else if (item.Type === "MusicAlbum") {
            // For albums, get all tracks
            const tracks = await API.getAlbumTracks(item.serverIndex, item.Id);
            APP.queue = tracks.map((t) => ({
              ...t,
              serverIndex: item.serverIndex,
              serverName: item.serverName,
            }));
          } else if (item.Type === "Series") {
            // For series, get all episodes
            const episodes = await API.fetchEpisodes(item.serverIndex, item.Id);
            APP.queue = episodes.map((e) => ({
              ...e,
              serverIndex: item.serverIndex,
              serverName: item.serverName,
            }));
          } else if (item.Type === "MusicArtist") {
            // For artists, get all tracks from albums
            const albums = await API.getArtistAlbums(item.serverIndex, item.Id);
            const allTracks = [];
            for (const album of albums) {
              const tracks = await API.getAlbumTracks(
                item.serverIndex,
                album.Id,
              );
              allTracks.push(...tracks);
            }
            APP.queue = allTracks.map((t) => ({
              ...t,
              serverIndex: item.serverIndex,
              serverName: item.serverName,
            }));
          } else {
            // Single item fallback
            APP.queue = [item];
          }

          if (APP.shuffleEnabled) {
            this.shuffleQueue();
          }

          this.updateQueueDisplay();
          return APP.queue;
        },

        shuffleQueue() {
          APP.shuffledQueue = [...APP.queue].sort(() => Math.random() - 0.5);
          APP.queueIndex = 0;
        },

        getNextTrack() {
          const currentQueue = APP.shuffleEnabled
            ? APP.shuffledQueue
            : APP.queue;

          if (currentQueue.length === 0) {
            return null;
          }

          if (APP.queueIndex < currentQueue.length - 1) {
            APP.queueIndex++;
            return currentQueue[APP.queueIndex];
          } else if (APP.repeatMode === "all") {
            APP.queueIndex = 0;
            return currentQueue[0];
          }

          return null;
        },

        getPreviousTrack() {
          const currentQueue = APP.shuffleEnabled
            ? APP.shuffledQueue
            : APP.queue;

          if (currentQueue.length === 0) {
            return null;
          }

          if (APP.queueIndex > 0) {
            APP.queueIndex--;
            return currentQueue[APP.queueIndex];
          }

          return null;
        },

        toggleShuffle() {
          APP.shuffleEnabled = !APP.shuffleEnabled;
          const btn = document.getElementById("player-shuffle");

          if (APP.shuffleEnabled) {
            btn.classList.add("text-violet-400");
            this.shuffleQueue();
            this.showToast("Shuffle enabled");
          } else {
            btn.classList.remove("text-violet-400");
            APP.shuffledQueue = [];
            this.showToast("Shuffle disabled");
          }

          this.updateQueueDisplay();
        },

        toggleRepeat() {
          const modes = ["off", "all", "one"];
          const currentIndex = modes.indexOf(APP.repeatMode);
          APP.repeatMode = modes[(currentIndex + 1) % modes.length];

          const btn = document.getElementById("player-repeat");
          const icon = btn.querySelector("i");

          btn.classList.remove("text-violet-400");

          if (APP.repeatMode === "off") {
            btn.classList.remove("text-violet-400");
            this.showToast("Repeat off");
          } else if (APP.repeatMode === "all") {
            btn.classList.add("text-violet-400");
            this.showToast("Repeat all");
          } else if (APP.repeatMode === "one") {
            btn.classList.add("text-violet-400");
            this.showToast("Repeat one");
          }
        },

        updateQueueDisplay() {
          const container = document.getElementById("queue-list");
          const infoEl = document.getElementById("queue-info");
          const currentQueue = APP.shuffleEnabled
            ? APP.shuffledQueue
            : APP.queue;

          infoEl.textContent = `${currentQueue.length} items`;

          if (currentQueue.length === 0) {
            container.innerHTML =
              '<p class="text-gray-500 text-center py-8">Queue is empty</p>';
            return;
          }

          container.innerHTML = "";

          currentQueue.forEach((item, index) => {
            const isCurrentlyPlaying = index === APP.queueIndex;
            const imageUrl = API.getImageUrl(item);
            const duration = item.RunTimeTicks
              ? this.formatDuration(item.RunTimeTicks)
              : "";

            const div = document.createElement("div");
            div.className = `flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
              isCurrentlyPlaying
                ? "bg-violet-600/30 border border-violet-500"
                : "hover:bg-white/5"
            }`;

            div.innerHTML = `
            <div class="w-2 h-2 rounded-full ${isCurrentlyPlaying ? "bg-violet-400" : "bg-transparent"} flex-shrink-0"></div>
            <div class="w-10 h-10 rounded-lg flex-shrink-0 ${imageUrl ? "bg-cover bg-center" : "bg-white/10 flex items-center justify-center"}"
                 ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
              ${!imageUrl ? '<i class="fas fa-music text-xs"></i>' : ""}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate ${isCurrentlyPlaying ? "text-violet-300" : ""}">${item.Name}</p>
              <p class="text-xs text-gray-400 truncate">${item.AlbumArtist || item.Artists?.join(", ") || "Unknown"}</p>
            </div>
            <span class="text-xs text-gray-500">${duration}</span>
            ${isCurrentlyPlaying ? '<i class="fas fa-play text-violet-400 text-sm"></i>' : ""}
          `;

            div.addEventListener("click", () => {
              APP.queueIndex = index;
              this.playMedia(item);
            });

            container.appendChild(div);
          });
        },

        updateFavorites() {
          const container = document.getElementById("favorites-list");
          if (APP.favorites.length === 0) {
            container.innerHTML =
              '<p class="text-gray-500 text-sm">No favorites yet</p>';
            return;
          }

          container.innerHTML = "";
          APP.favorites.slice(0, 10).forEach((item) => {
            const card = this.createMediaCard(item, "small");
            container.appendChild(card);
          });
        },

        async startDownload(item) {
          const existingIndex = APP.downloads.findIndex(
            (d) => d.Id === item.Id,
          );
          if (existingIndex > -1) {
            this.showToast("Already downloading or downloaded", "info");
            return;
          }

          // Determine if this is a container (needs zipping)
          const isContainer = [
            "Series",
            "MusicAlbum",
            "MusicArtist",
            "AudioBook",
          ].includes(item.Type);

          const download = {
            Id: item.Id,
            Name: item.Name,
            Type: item.Type,
            serverIndex: item.serverIndex,
            ImageTags: item.ImageTags,
            status: "downloading",
            progress: 0,
            blob: null,
            isContainer: isContainer,
            fileCount: 1,
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
                download.status = "ready";
                download.progress = 100;
                this.updateDownloadsList();
                this.updateDownloadsBadge();
                this.showToast(`${item.Name} ready to save`);
              } else {
                download.status = "error";
                this.updateDownloadsList();
                this.showToast("Download failed", "error");
              }
            } else {
              // Container - get files and zip them
              let itemsToDownload = [];

              if (item.Type === "Series") {
                itemsToDownload = await API.fetchEpisodes(
                  item.serverIndex,
                  item.Id,
                );
              } else if (item.Type === "MusicAlbum") {
                itemsToDownload = await API.getAlbumTracks(
                  item.serverIndex,
                  item.Id,
                );
              } else if (item.Type === "MusicArtist") {
                const albums = await API.getArtistAlbums(
                  item.serverIndex,
                  item.Id,
                );
                for (const album of albums) {
                  const tracks = await API.getAlbumTracks(
                    item.serverIndex,
                    album.Id,
                  );
                  itemsToDownload.push(...tracks);
                }
              }

              if (itemsToDownload.length === 0) {
                download.status = "error";
                this.updateDownloadsList();
                this.showToast("No files found to download", "error");
                return;
              }

              download.fileCount = itemsToDownload.length;
              this.updateDownloadsList();

              // Load JSZip library
              await this.loadJSZip();

              // Download all files and create zip
              const JSZip = window.JSZip;
              const zip = new JSZip();
              let downloadedCount = 0;

              for (const file of itemsToDownload) {
                try {
                  const blob = await API.downloadFile(file);
                  if (blob) {
                    const isAudio = file.Type === "Audio";
                    const ext = isAudio ? "mp3" : "mp4";
                    const fileName = `${file.Name || file.Id}.${ext}`;
                    zip.file(fileName, blob);
                    downloadedCount++;
                    download.progress = Math.round(
                      (downloadedCount / itemsToDownload.length) * 100,
                    );
                    this.updateDownloadsList();
                  }
                } catch (e) {
                  console.error(`Failed to download ${file.Name}:`, e);
                }
              }

              if (downloadedCount === 0) {
                download.status = "error";
                this.updateDownloadsList();
                this.showToast("Failed to download any files", "error");
                return;
              }

              // Generate zip
              download.status = "zipping";
              this.updateDownloadsList();
              this.showToast("Creating zip file...");

              const zipBlob = await zip.generateAsync({ type: "blob" });
              download.blob = zipBlob;
              download.status = "ready";
              download.progress = 100;
              this.updateDownloadsList();
              this.updateDownloadsBadge();
              this.showToast(
                `${item.Name} ready to save (${downloadedCount}/${itemsToDownload.length} files)`,
              );
            }
          } catch (e) {
            console.error("Download error:", e);
            download.status = "error";
            this.updateDownloadsList();
            this.showToast("Download failed", "error");
          }

          Storage.save(
            "downloads",
            APP.downloads.map((d) => ({ ...d, blob: null })),
          );
        },

        async loadJSZip() {
          return new Promise((resolve, reject) => {
            if (window.JSZip) {
              resolve();
              return;
            }

            const script = document.createElement("script");
            script.src =
              "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load JSZip"));
            document.head.appendChild(script);
          });
        },

        async saveDownload(download) {
          if (!download.blob) {
            this.showToast("File not ready", "error");
            return;
          }

          try {
            const isVideo = ["Movie", "Episode", "Series"].includes(
              download.Type,
            );
            const isAudio = download.Type === "Audio";
            const isBook = ["Book", "EBook", "Pdf"].includes(download.Type);
            const isZip = download.isContainer;

            // Determine file extension and MIME type
            let extension = "bin";
            let mimeType = "application/octet-stream";
            let description = "File";

            if (isZip) {
              extension = "zip";
              mimeType = "application/zip";
              description = "ZIP archive";
            } else if (isVideo) {
              extension = "mp4";
              mimeType = "video/mp4";
              description = "Video file";
            } else if (isAudio) {
              extension = "mp3";
              mimeType = "audio/mpeg";
              description = "Audio file";
            } else if (isBook) {
              extension = "pdf";
              mimeType =
                extension === "pdf"
                  ? "application/pdf"
                  : "application/epub+zip";
              description = extension === "pdf" ? "PDF document" : "eBook file";
            }

            if ("showSaveFilePicker" in window) {
              const handle = await window.showSaveFilePicker({
                suggestedName: `${download.Name}.${extension}`,
                types: [
                  {
                    description,
                    accept: { [mimeType]: [`.${extension}`] },
                  },
                ],
              });

              const writable = await handle.createWritable();
              await writable.write(download.blob);
              await writable.close();

              download.status = "saved";
              this.updateDownloadsList();
              this.showToast("File saved successfully");
            } else {
              // Fallback for browsers without File System Access API
              const url = URL.createObjectURL(download.blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${download.Name}.${extension}`;
              a.click();
              URL.revokeObjectURL(url);

              download.status = "saved";
              this.updateDownloadsList();
              this.showToast("Download started");
            }
          } catch (e) {
            if (e.name !== "AbortError") {
              this.showToast("Save failed", "error");
            }
          }
        },

        updateDownloadsList() {
          const container = document.getElementById("downloads-list");
          const empty = document.getElementById("downloads-empty");

          if (APP.downloads.length === 0) {
            container.innerHTML = "";
            empty.classList.remove("hidden");
            return;
          }

          empty.classList.add("hidden");
          container.innerHTML = "";

          APP.downloads.forEach((download, index) => {
            const div = document.createElement("div");
            div.className = "glass rounded-xl p-4";

            const statusIcon =
              download.status === "downloading"
                ? "fa-spinner fa-spin"
                : download.status === "zipping"
                  ? "fa-compress-alt fa-spin"
                  : download.status === "ready"
                    ? "fa-check-circle text-green-400"
                    : download.status === "saved"
                      ? "fa-check-circle text-violet-400"
                      : "fa-exclamation-circle text-red-400";

            const statusText =
              download.status === "downloading"
                ? `Downloading... ${download.progress}%`
                : download.status === "zipping"
                  ? "Creating zip..."
                  : download.status === "ready"
                    ? "Ready to save"
                    : download.status === "saved"
                      ? "Saved"
                      : "Error";

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
                  ${download.fileCount > 1 ? `<span class="text-xs text-gray-500 ml-auto">${download.fileCount} files</span>` : ""}
                </div>
              </div>
              ${
                download.status === "ready"
                  ? `
                <button class="save-download px-4 py-2 bg-violet-600 rounded-lg text-sm font-medium flex-shrink-0" data-index="${index}">
                  <i class="fas fa-download mr-1"></i> Save
                </button>
              `
                  : ""
              }
              ${
                download.status !== "downloading" &&
                download.status !== "zipping"
                  ? `
                <button class="remove-download w-8 h-8 flex items-center justify-center text-gray-500 flex-shrink-0" data-index="${index}">
                  <i class="fas fa-times"></i>
                </button>
              `
                  : ""
              }
            </div>
            ${
              download.status === "downloading" || download.status === "zipping"
                ? `
              <div class="h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                <div class="h-full progress-bar rounded-full transition-all" style="width: ${download.progress}%"></div>
              </div>
            `
                : ""
            }
          `;

            container.appendChild(div);
          });

          container.querySelectorAll(".save-download").forEach((btn) => {
            btn.addEventListener("click", () => {
              const index = parseInt(btn.dataset.index);
              this.saveDownload(APP.downloads[index]);
            });
          });

          container.querySelectorAll(".remove-download").forEach((btn) => {
            btn.addEventListener("click", () => {
              const index = parseInt(btn.dataset.index);
              APP.downloads.splice(index, 1);
              this.updateDownloadsList();
              this.updateDownloadsBadge();
              Storage.save(
                "downloads",
                APP.downloads.map((d) => ({ ...d, blob: null })),
              );
            });
          });
        },

        updateDownloadsBadge() {
          const badge = document.getElementById("downloads-badge");
          const readyCount = APP.downloads.filter(
            (d) => d.status === "ready",
          ).length;

          if (readyCount > 0) {
            badge.textContent = readyCount;
            badge.classList.remove("hidden");
          } else {
            badge.classList.add("hidden");
          }
        },

        async performSearch(query) {
          const resultsContainer = document.getElementById("search-results");

          if (!query.trim()) {
            resultsContainer.innerHTML = `
            <div class="text-center text-gray-500 py-12">
              <i class="fas fa-search text-4xl mb-3 opacity-50"></i>
              <p>Search for your favorite media</p>
            </div>
          `;
            return;
          }

          resultsContainer.innerHTML =
            '<div class="shimmer h-16 rounded-xl mb-2"></div>'.repeat(5);

          let results = await API.search(query);

          // Apply filter
          if (APP.searchFilter !== "all") {
            results = results.filter(
              (item) =>
                item.Type.toLowerCase() === APP.searchFilter.toLowerCase(),
            );
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

          resultsContainer.innerHTML = "";
          results.forEach((item) => {
            const imageUrl = API.getImageUrl(item, "Primary", 100);
            const div = document.createElement("div");
            div.className =
              "flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors";
            div.innerHTML = `
            <div class="w-12 h-12 rounded-lg flex-shrink-0 ${imageUrl ? "bg-cover bg-center" : "bg-white/10 flex items-center justify-center"}"
                 ${imageUrl ? `style="background-image: url('${imageUrl}')"` : ""}>
              ${!imageUrl ? `<i class="fas ${this.getIconForType(item.Type)} text-gray-400"></i>` : ""}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">${item.Name}</p>
              <p class="text-xs text-gray-400">${item.Type} • ${item.serverName}</p>
            </div>
          `;

            div.addEventListener("click", () => {
              if (
                ["Movie", "Episode", "Audio", "AudioBook"].includes(item.Type)
              ) {
                this.playMedia(item);
              } else {
                this.showMediaDetail(item);
              }
              document.getElementById("search-overlay").classList.add("hidden");
            });

            resultsContainer.appendChild(div);
          });
        },

_renderTimeout: null,
scheduleRenderHome() {
    clearTimeout(this._renderTimeout);
    this._renderTimeout = setTimeout(() => this.renderHome(), 300);
},

        renderHome() {
          // Render hero
          const featured =
            APP.library.all.find(
              (i) => i.Type === "Movie" || i.Type === "Series",
            ) || APP.library.all[0];
          if (featured) {
            const heroImage = document.getElementById("hero-image");
            const backdropUrl =
              API.getImageUrl(featured, "Backdrop", 800) ||
              API.getImageUrl(featured, "Primary", 800);
            heroImage.style.backgroundImage = backdropUrl
              ? `url('${backdropUrl}')`
              : "";
            document.getElementById("hero-title").textContent = featured.Name;
            document.getElementById("hero-subtitle").textContent =
              featured.Overview || "";

            document.getElementById("hero-play").onclick = () =>
              this.playMedia(featured);
            document.getElementById("hero-info").onclick = () =>
              this.showMediaDetail(featured);
          }

    // Continue watching
    const continueSection = document.getElementById("continue-watching-section");
    const continueContainer = document.getElementById("continue-watching");

    this.loadContinueWatching();
          

          // Recently added video
          const recentVideo = document.getElementById("recently-added-video");
          recentVideo.innerHTML = "";
          APP.library.all
            .filter((i) => ["Movie", "Series"].includes(i.Type))
            .slice(0, 15)
            .forEach((item) => {
              recentVideo.appendChild(this.createMediaCard(item, "medium"));
            });

          // Movies
          const moviesCarousel = document.getElementById("movies-carousel");
          moviesCarousel.innerHTML = "";
          const movies = APP.library.all.filter((i) => i.Type === "Movie");
          movies.slice(0, 15).forEach((item) => {
            moviesCarousel.appendChild(this.createMediaCard(item, "medium"));
          });

          // TV Shows
          const tvCarousel = document.getElementById("tvshows-carousel");
          tvCarousel.innerHTML = "";
          const tvshows = APP.library.all.filter((i) => i.Type === "Series");
          tvshows.slice(0, 15).forEach((item) => {
            tvCarousel.appendChild(this.createMediaCard(item, "medium"));
          });

          // Audio content
          this.renderAudioContent();

          this.renderBooks();
        },

        renderAudioContent() {
          // Songs
          const songsList = document.getElementById("songs-list");
          songsList.innerHTML = "";
          const songs = APP.library.all.filter((i) => i.Type === "Audio");
          if (songs.length === 0) {
            songsList.innerHTML =
              '<p class="text-gray-500 text-sm text-center py-4">No songs found</p>';
          } else {
            songs.slice(0, 50).forEach((item, index) => {
              songsList.appendChild(this.createSongRow(item, index));
            });
          }

          // Albums
          const albumsGrid = document.getElementById("albums-grid");
          albumsGrid.innerHTML = "";
          const albums = APP.library.all.filter((i) => i.Type === "MusicAlbum");
          if (albums.length === 0) {
            albumsGrid.innerHTML =
              '<p class="text-gray-500 text-sm text-center col-span-2 py-4">No albums found</p>';
          } else {
            albums.slice(0, 20).forEach((item) => {
              albumsGrid.appendChild(this.createAlbumCard(item));
            });
          }

          // Artists
          const artistsGrid = document.getElementById("artists-grid");
          artistsGrid.innerHTML = "";
          const artists = APP.library.all.filter(
            (i) => i.Type === "MusicArtist",
          );
          if (artists.length === 0) {
            artistsGrid.innerHTML =
              '<p class="text-gray-500 text-sm text-center col-span-3 py-4">No artists found</p>';
          } else {
            artists.slice(0, 20).forEach((item) => {
              artistsGrid.appendChild(this.createArtistCard(item));
            });
          }

          // Audiobooks
          const audiobooksGrid = document.getElementById("audiobooks-grid");
          audiobooksGrid.innerHTML = "";
const audiobooks = APP.library.all.filter(i => i.Type === "AudioBook");
if (audiobooks.length === 0) {
    audiobooksGrid.innerHTML = '<p class="text-gray-500 ...">No audiobooks found</p>';
} else {
    audiobooks.slice(0, 20).forEach(item => {
        audiobooksGrid.appendChild(this.createAlbumCard(item));
    });
}
        },
      };

      //==================== Reader ====================
      const Reader = {
        pdfDoc: null,
        epubBook: null,
        epubRendition: null,
        currentPage: 1,
        totalPages: 1,
        scale: 1.0,
        darkMode: false,
        displayMode: "single", // 'single' or 'scroll'
        currentItem: null,
        mode: null, // 'pdf' or 'epub'
        readingProgress: {},
        bookmarks: {},
        touchStartX: 0,
        touchStartY: 0,
        controlsVisible: true,
        controlsTimeout: null,

        init() {
          this.readingProgress = Storage.load("readingProgress", {});
          this.bookmarks = Storage.load("readerBookmarks", {});
        },

        async open(item) {
          this.currentItem = item;
          this.scale = 1.0;

          const modal = document.getElementById("reader-modal");
          modal.classList.remove("hidden");

          document.getElementById("reader-title").textContent = item.Name;
          document.getElementById("reader-loading").classList.remove("hidden");
          document.getElementById("reader-loading-detail").textContent = "";
          document
            .getElementById("reader-pdf-container")
            .classList.add("hidden");
          document
            .getElementById("reader-epub-container")
            .classList.add("hidden");
          document
            .getElementById("reader-settings-panel")
            .classList.add("hidden");

          const server = APP.servers[item.serverIndex];
          const url = `${server.url}/Items/${item.Id}/Download?api_key=${server.token}`;

          try {
            document.getElementById("reader-loading-detail").textContent =
              "Fetching document...";
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch document");

            const blob = await response.blob();
            const contentType = response.headers.get("content-type") || "";

            // Detect format
            const nameLC = (item.Name || "").toLowerCase();
            const pathLC = (item.Path || "").toLowerCase();
            const isPDF =
              contentType.includes("pdf") ||
              nameLC.endsWith(".pdf") ||
              pathLC.endsWith(".pdf");
            const isEPUB =
              contentType.includes("epub") ||
              nameLC.endsWith(".epub") ||
              pathLC.endsWith(".epub");

            if (isPDF || !isEPUB) {
              // Default to PDF if we can't determine
              await this.loadPDF(blob);
            } else {
              await this.loadEPUB(blob);
            }

            // Restore reading position
            const key = `${item.serverIndex}_${item.Id}`;
            const saved = this.readingProgress[key];
            if (saved) {
              if (this.mode === "pdf" && saved.page) {
                this.goToPage(saved.page);
                UI.showToast(`Resuming from page ${saved.page}`, "info");
              } else if (this.mode === "epub" && saved.location) {
                this.epubRendition.display(saved.location);
                UI.showToast("Resuming where you left off", "info");
              }
            }

            this.updateBookmarksList();
            UI.addToWatchHistory(item);
          } catch (e) {
            console.error("Reader error:", e);
            UI.showToast("Failed to load document", "error");
            this.close();
          }
        },

        async loadPDF(blob) {
          this.mode = "pdf";

          if (!window.pdfjsLib) {
            document.getElementById("reader-loading-detail").textContent =
              "Loading PDF engine...";
            await this.loadScript(
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
            );
            pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }

          document.getElementById("reader-loading-detail").textContent =
            "Rendering...";
          const arrayBuffer = await blob.arrayBuffer();
          this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer })
            .promise;
          this.totalPages = this.pdfDoc.numPages;
          this.currentPage = 1;

          document.getElementById("reader-loading").classList.add("hidden");
          document
            .getElementById("reader-pdf-container")
            .classList.remove("hidden");

          document.getElementById("reader-slider").max = this.totalPages;
          document.getElementById("reader-goto-input").max = this.totalPages;

          if (this.displayMode === "scroll") {
            await this.renderAllPages();
          } else {
            await this.renderPage(this.currentPage);
          }
        },

        async loadEPUB(blob) {
          this.mode = "epub";

          if (!window.ePub) {
            document.getElementById("reader-loading-detail").textContent =
              "Loading EPUB engine...";
            await this.loadScript(
              "https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js",
            );
          }

          document.getElementById("reader-loading-detail").textContent =
            "Rendering...";
          const arrayBuffer = await blob.arrayBuffer();
          this.epubBook = ePub(arrayBuffer);

          document.getElementById("reader-loading").classList.add("hidden");
          const container = document.getElementById("reader-epub-container");
          container.classList.remove("hidden");
          container.innerHTML = "";

          this.epubRendition = this.epubBook.renderTo(container, {
            width: "100%",
            height: "100%",
            spread: "none",
            flow: "paginated",
          });

          await this.epubRendition.display();

          if (this.darkMode) {
            this.applyEpubTheme();
          }

          // Track location for progress
          this.epubRendition.on("relocated", (location) => {
            if (location && location.start) {
              const key = `${this.currentItem.serverIndex}_${this.currentItem.Id}`;
              this.readingProgress[key] = {
                location: location.start.cfi,
                percentage: location.start.percentage || 0,
                lastRead: Date.now(),
              };
              Storage.save("readingProgress", this.readingProgress);

              // Update page display
              const pct = Math.round((location.start.percentage || 0) * 100);
              document.getElementById("reader-page-info").textContent =
                `${pct}% read`;
              document.getElementById("reader-slider").value = pct;
              document.getElementById("reader-slider").max = 100;
            }
          });

          // Swipe for EPUB
          this.epubRendition.on("keyup", (e) => {
            if (e.key === "ArrowLeft") this.prevPage();
            if (e.key === "ArrowRight") this.nextPage();
          });

          // Generate locations for progress bar
          this.epubBook.ready
            .then(() => {
              return this.epubBook.locations.generate(1600);
            })
            .then((locations) => {
              this.totalPages = locations.length;
            });
        },

        async renderPage(pageNum) {
          if (this.mode !== "pdf" || !this.pdfDoc) return;

          const page = await this.pdfDoc.getPage(pageNum);
          const container = document.getElementById("reader-pdf-container");
          const containerWidth = container.clientWidth - 32;

          const baseViewport = page.getViewport({ scale: 1 });
          const fitScale = containerWidth / baseViewport.width;
          const finalScale = fitScale * this.scale;
          const viewport = page.getViewport({ scale: finalScale });

          container.innerHTML = "";

          const canvas = document.createElement("canvas");
          canvas.className = "block mx-auto rounded-lg shadow-lg";
          if (this.darkMode) {
            canvas.style.filter = "invert(0.85) hue-rotate(180deg)";
          }
          container.appendChild(canvas);

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;

          this.currentPage = pageNum;
          this.updatePageInfo();
          this.saveProgress();
        },

        async renderAllPages() {
          if (this.mode !== "pdf" || !this.pdfDoc) return;

          const container = document.getElementById("reader-pdf-container");
          container.innerHTML = "";
          const containerWidth = container.clientWidth - 32;

          for (let i = 1; i <= this.totalPages; i++) {
            const page = await this.pdfDoc.getPage(i);
            const baseViewport = page.getViewport({ scale: 1 });
            const fitScale = containerWidth / baseViewport.width;
            const viewport = page.getViewport({ scale: fitScale * this.scale });

            const wrapper = document.createElement("div");
            wrapper.className = "mb-4";
            wrapper.dataset.page = i;

            const canvas = document.createElement("canvas");
            canvas.className = "block mx-auto rounded-lg shadow-lg";
            if (this.darkMode) {
              canvas.style.filter = "invert(0.85) hue-rotate(180deg)";
            }

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            wrapper.appendChild(canvas);
            container.appendChild(wrapper);

            const ctx = canvas.getContext("2d");
            await page.render({ canvasContext: ctx, viewport }).promise;
          }

          // Track scroll position for page indicator
          container.parentElement.addEventListener("scroll", () => {
            const wrappers = container.querySelectorAll("[data-page]");
            const scrollTop = container.parentElement.scrollTop;
            for (const w of wrappers) {
              if (w.offsetTop + w.offsetHeight / 2 > scrollTop) {
                this.currentPage = parseInt(w.dataset.page);
                this.updatePageInfo();
                break;
              }
            }
          });
        },

        updatePageInfo() {
          if (this.mode === "pdf") {
            document.getElementById("reader-page-info").textContent =
              `Page ${this.currentPage} of ${this.totalPages}`;
            document.getElementById("reader-slider").value = this.currentPage;
            document.getElementById("reader-slider").max = this.totalPages;
            document.getElementById("reader-goto-input").value =
              this.currentPage;
          }
          document.getElementById("reader-zoom-level").textContent =
            `${Math.round(this.scale * 100)}%`;
        },

        nextPage() {
          if (this.mode === "pdf") {
            if (this.displayMode === "scroll") {
              // Scroll to next page
              const container = document.getElementById("reader-pdf-container");
              const nextWrapper = container.querySelector(
                `[data-page="${this.currentPage + 1}"]`,
              );
              if (nextWrapper) {
                nextWrapper.scrollIntoView({ behavior: "smooth" });
              }
            } else if (this.currentPage < this.totalPages) {
              this.renderPage(this.currentPage + 1);
            }
          } else if (this.mode === "epub" && this.epubRendition) {
            this.epubRendition.next();
          }
        },

        prevPage() {
          if (this.mode === "pdf") {
            if (this.displayMode === "scroll") {
              const container = document.getElementById("reader-pdf-container");
              const prevWrapper = container.querySelector(
                `[data-page="${this.currentPage - 1}"]`,
              );
              if (prevWrapper) {
                prevWrapper.scrollIntoView({ behavior: "smooth" });
              }
            } else if (this.currentPage > 1) {
              this.renderPage(this.currentPage - 1);
            }
          } else if (this.mode === "epub" && this.epubRendition) {
            this.epubRendition.prev();
          }
        },

        goToPage(num) {
          num = Math.max(1, Math.min(parseInt(num) || 1, this.totalPages));
          if (this.mode === "pdf") {
            if (this.displayMode === "scroll") {
              const container = document.getElementById("reader-pdf-container");
              const wrapper = container.querySelector(`[data-page="${num}"]`);
              if (wrapper) wrapper.scrollIntoView({ behavior: "smooth" });
            } else {
              this.renderPage(num);
            }
          } else if (this.mode === "epub") {
            const pct = num / 100; // slider is 0-100 for epub
            const cfi = this.epubBook.locations.cfiFromPercentage(pct);
            if (cfi) this.epubRendition.display(cfi);
          }
        },

        zoomIn() {
          this.scale = Math.min(this.scale + 0.25, 4.0);
          this.rerender();
        },

        zoomOut() {
          this.scale = Math.max(this.scale - 0.25, 0.5);
          this.rerender();
        },

        fitWidth() {
          this.scale = 1.0;
          this.rerender();
        },

        rerender() {
          if (this.mode === "pdf") {
            if (this.displayMode === "scroll") {
              this.renderAllPages();
            } else {
              this.renderPage(this.currentPage);
            }
          }
          this.updatePageInfo();
        },

        setDisplayMode(mode) {
          this.displayMode = mode;
          document.querySelectorAll(".reader-mode-btn").forEach((btn) => {
            const isActive = btn.dataset.mode === mode;
            btn.classList.toggle("bg-violet-600", isActive);
            btn.classList.toggle("bg-white/10", !isActive);
          });

          if (this.mode === "pdf" && this.pdfDoc) {
            if (mode === "scroll") {
              this.renderAllPages();
            } else {
              this.renderPage(this.currentPage);
            }
          }
        },

        toggleDarkMode() {
          this.darkMode = !this.darkMode;
          const btn = document.getElementById("reader-dark-mode");
          btn.classList.toggle("text-violet-400", this.darkMode);
          btn.classList.toggle("bg-violet-600/30", this.darkMode);

          const viewport = document.getElementById("reader-viewport");
          viewport.style.background = this.darkMode ? "#0f0f14" : "#1a1a2e";

          if (this.mode === "pdf") {
            this.rerender();
          } else if (this.mode === "epub") {
            this.applyEpubTheme();
          }
        },

        applyEpubTheme() {
          if (!this.epubRendition) return;
          if (this.darkMode) {
            this.epubRendition.themes.override("color", "#d4d4d4");
            this.epubRendition.themes.override("background", "#1a1a2e");
          } else {
            this.epubRendition.themes.override("color", "#1a1a1a");
            this.epubRendition.themes.override("background", "#ffffff");
          }
        },

        toggleBookmark() {
          if (!this.currentItem) return;
          const key = `${this.currentItem.serverIndex}_${this.currentItem.Id}`;
          if (!this.bookmarks[key]) this.bookmarks[key] = [];

          const pageOrLoc =
            this.mode === "pdf"
              ? this.currentPage
              : this.epubRendition?.location?.start?.cfi || null;

          if (!pageOrLoc) return;

          const existing = this.bookmarks[key].findIndex((b) =>
            this.mode === "pdf" ? b.page === pageOrLoc : b.cfi === pageOrLoc,
          );

          const btn = document.getElementById("reader-bookmark");

          if (existing > -1) {
            this.bookmarks[key].splice(existing, 1);
            btn.innerHTML = '<i class="far fa-bookmark"></i>';
            UI.showToast("Bookmark removed");
          } else {
            this.bookmarks[key].push({
              page: this.mode === "pdf" ? pageOrLoc : null,
              cfi: this.mode === "epub" ? pageOrLoc : null,
              timestamp: Date.now(),
            });
            btn.innerHTML = '<i class="fas fa-bookmark text-amber-400"></i>';
            UI.showToast(`Page ${this.currentPage} bookmarked`);
          }

          Storage.save("readerBookmarks", this.bookmarks);
          this.updateBookmarksList();
        },

        updateBookmarksList() {
          const container = document.getElementById("reader-bookmarks-list");
          if (!this.currentItem) return;

          const key = `${this.currentItem.serverIndex}_${this.currentItem.Id}`;
          const marks = this.bookmarks[key] || [];

          // Update bookmark icon for current page
          const btn = document.getElementById("reader-bookmark");
          const isBookmarked = marks.some((b) =>
            this.mode === "pdf" ? b.page === this.currentPage : false,
          );
          btn.innerHTML = isBookmarked
            ? '<i class="fas fa-bookmark text-amber-400"></i>'
            : '<i class="far fa-bookmark"></i>';

          if (marks.length === 0) {
            container.innerHTML =
              '<p class="text-xs text-gray-500">No bookmarks</p>';
            return;
          }

          container.innerHTML = marks
            .map(
              (b, i) => `
            <button class="bookmark-jump w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs flex items-center justify-between" data-index="${i}">
                <span><i class="fas fa-bookmark text-amber-400 mr-2"></i>${b.page ? "Page " + b.page : "Location"}</span>
                <span class="text-gray-500">${new Date(b.timestamp).toLocaleDateString()}</span>
            </button>
        `,
            )
            .join("");

          container.querySelectorAll(".bookmark-jump").forEach((btn) => {
            btn.addEventListener("click", () => {
              const mark = marks[parseInt(btn.dataset.index)];
              if (mark.page) this.goToPage(mark.page);
              else if (mark.cfi && this.epubRendition)
                this.epubRendition.display(mark.cfi);
            });
          });
        },

        saveProgress() {
          if (!this.currentItem) return;
          const key = `${this.currentItem.serverIndex}_${this.currentItem.Id}`;
          this.readingProgress[key] = {
            page: this.currentPage,
            total: this.totalPages,
            lastRead: Date.now(),
          };
          Storage.save("readingProgress", this.readingProgress);
        },

        close() {
          this.saveProgress();

          if (this.epubBook) {
            this.epubBook.destroy();
            this.epubBook = null;
            this.epubRendition = null;
          }

          this.pdfDoc = null;
          this.currentItem = null;
          this.scale = 1.0;

          document.getElementById("reader-modal").classList.add("hidden");
          document.getElementById("reader-pdf-container").innerHTML = "";
          document.getElementById("reader-epub-container").innerHTML = "";
        },

        setupTouchGestures() {
          const viewport = document.getElementById("reader-viewport");
          let startX = 0;
          let startY = 0;

          viewport.addEventListener(
            "touchstart",
            (e) => {
              startX = e.changedTouches[0].screenX;
              startY = e.changedTouches[0].screenY;
            },
            { passive: true },
          );

          viewport.addEventListener(
            "touchend",
            (e) => {
              const endX = e.changedTouches[0].screenX;
              const endY = e.changedTouches[0].screenY;
              const diffX = startX - endX;
              const diffY = startY - endY;

              // Only trigger if horizontal swipe is dominant
              if (
                Math.abs(diffX) > 60 &&
                Math.abs(diffX) > Math.abs(diffY) * 1.5
              ) {
                if (diffX > 0) this.nextPage();
                else this.prevPage();
              }
            },
            { passive: true },
          );

          // Tap center to toggle controls
          viewport.addEventListener("click", (e) => {
            const rect = viewport.getBoundingClientRect();
            const tapX = e.clientX - rect.left;
            const third = rect.width / 3;

            if (tapX < third) {
              this.prevPage();
            } else if (tapX > third * 2) {
              this.nextPage();
            } else {
              // Center tap - toggle controls
              const controls = document.getElementById("reader-controls");
              controls.classList.toggle("hidden");
            }
          });
        },

        loadScript(src) {
          return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              resolve();
              return;
            }
            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
        },
      };
const SyncPlay = {
    // State
    isConnected: false,
    currentGroup: null,
    currentGroupId: null,
    serverIndex: null,
    websocket: null,
    participants: [],
    isReady: false,
    isBuffering: false,
    lastPing: 0,
    pingInterval: null,
    syncInterval: null,
    timeDiff: 0, // Difference between server time and local time
    
    // Settings
    syncThreshold: 1.5, // Seconds - if diff > this, seek to sync
    playbackRateAdjustThreshold: 0.5, // Seconds - use playback rate to catch up
    maxPlaybackRateAdjust: 1.05, // Maximum playback rate for catching up
    
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Modal controls
        document.getElementById("syncplay-btn")?.addEventListener("click", () => this.openModal());
        document.getElementById("syncplay-modal-close")?.addEventListener("click", () => this.closeModal());
        document.getElementById("syncplay-modal")?.addEventListener("click", (e) => {
            if (e.target.id === "syncplay-modal") this.closeModal();
        });

        // Tab switching
        document.querySelectorAll(".syncplay-tab").forEach(tab => {
            tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
        });

        // Create group
        document.getElementById("syncplay-create-btn")?.addEventListener("click", () => this.createGroup());

        // Leave group
        document.getElementById("syncplay-leave")?.addEventListener("click", () => this.leaveGroup());

        // Server select - populate based on connected servers
        this.updateServerSelect();
    },

    updateServerSelect() {
        const select = document.getElementById("syncplay-server-select");
        if (!select) return;

        select.innerHTML = "";
        APP.servers.forEach((server, index) => {
            if (server.token) {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = server.name;
                select.appendChild(option);
            }
        });
    },

    openModal() {
        document.getElementById("syncplay-modal").classList.remove("hidden");
        this.loadGroups();
    },

    closeModal() {
        document.getElementById("syncplay-modal").classList.add("hidden");
    },

    switchTab(tab) {
        document.querySelectorAll(".syncplay-tab").forEach(t => {
            const isActive = t.dataset.tab === tab;
            t.classList.toggle("border-violet-500", isActive);
            t.classList.toggle("text-white", isActive);
            t.classList.toggle("border-transparent", !isActive);
            t.classList.toggle("text-gray-400", !isActive);
        });

        document.querySelectorAll(".syncplay-tab-content").forEach(c => c.classList.add("hidden"));
        document.getElementById(`syncplay-tab-${tab}`).classList.remove("hidden");

        if (tab === "join") {
            this.loadGroups();
        }
    },

    async loadGroups() {
        const loading = document.getElementById("syncplay-groups-loading");
        const empty = document.getElementById("syncplay-groups-empty");
        const list = document.getElementById("syncplay-groups-list");

        loading.classList.remove("hidden");
        empty.classList.add("hidden");
        list.innerHTML = "";

        const allGroups = [];

        // Fetch groups from all connected servers
        for (let i = 0; i < APP.servers.length; i++) {
            const server = APP.servers[i];
            if (!server.token) continue;

            try {
                const groups = await this.fetchGroups(i);
                groups.forEach(g => {
                    allGroups.push({ ...g, serverIndex: i, serverName: server.name });
                });
            } catch (e) {
                console.error(`Failed to fetch groups from ${server.name}:`, e);
            }
        }

        loading.classList.add("hidden");

        if (allGroups.length === 0) {
            empty.classList.remove("hidden");
            return;
        }

        allGroups.forEach(group => {
            const div = document.createElement("div");
            div.className = "glass rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors";
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <i class="fas fa-play text-violet-400 text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium truncate">${group.GroupName || 'Unnamed Group'}</p>
                        <p class="text-xs text-gray-400">
                            ${group.serverName} • ${group.Participants?.length || 1} viewer${(group.Participants?.length || 1) !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <i class="fas fa-chevron-right text-gray-500"></i>
                </div>
                ${group.NowPlayingItem ? `
                    <div class="mt-3 pt-3 border-t border-white/5">
                        <p class="text-xs text-gray-400">Now playing:</p>
                        <p class="text-sm truncate">${group.NowPlayingItem.Name || 'Unknown'}</p>
                    </div>
                ` : ''}
            `;
            div.addEventListener("click", () => this.joinGroup(group.GroupId, group.serverIndex));
            list.appendChild(div);
        });
    },

    async fetchGroups(serverIndex) {
        const server = APP.servers[serverIndex];
        if (!server.token) return [];

        try {
            const response = await fetch(`${server.url}/SyncPlay/List`, {
                headers: API.getHeaders(serverIndex)
            });

            if (!response.ok) return [];
            return await response.json();
        } catch (e) {
            console.error("Failed to fetch SyncPlay groups:", e);
            return [];
        }
    },

    async createGroup() {
        const nameInput = document.getElementById("syncplay-group-input");
        const serverSelect = document.getElementById("syncplay-server-select");
        const groupName = nameInput.value.trim() || `${APP.username}'s Group`;
        const serverIndex = parseInt(serverSelect.value);

        const server = APP.servers[serverIndex];
        if (!server.token) {
            UI.showToast("Server not connected", "error");
            return;
        }

        try {
            UI.showToast("Creating group...", "info");

            // First, connect WebSocket
            await this.connectWebSocket(serverIndex);

            // Create new group
            const response = await fetch(`${server.url}/SyncPlay/New`, {
                method: "POST",
                headers: {
                    ...API.getHeaders(serverIndex),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    GroupName: groupName
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.serverIndex = serverIndex;
            this.currentGroup = { GroupName: groupName };
            this.isConnected = true;

            this.closeModal();
            this.updateUI();
            UI.showToast(`Created group: ${groupName}`);

            // Start ping interval
            this.startPingInterval();

        } catch (e) {
            console.error("Failed to create group:", e);
            UI.showToast("Failed to create group", "error");
        }
    },

    async joinGroup(groupId, serverIndex) {
        const server = APP.servers[serverIndex];
        if (!server.token) {
            UI.showToast("Server not connected", "error");
            return;
        }

        try {
            UI.showToast("Joining group...", "info");

            // Connect WebSocket first
            await this.connectWebSocket(serverIndex);

            // Join group
            const response = await fetch(`${server.url}/SyncPlay/Join`, {
                method: "POST",
                headers: {
                    ...API.getHeaders(serverIndex),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    GroupId: groupId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.serverIndex = serverIndex;
            this.currentGroupId = groupId;
            this.isConnected = true;

            this.closeModal();
            this.updateUI();
            UI.showToast("Joined SyncPlay group");

            // Start ping interval
            this.startPingInterval();

        } catch (e) {
            console.error("Failed to join group:", e);
            UI.showToast("Failed to join group", "error");
        }
    },

    async leaveGroup() {
        if (!this.isConnected || this.serverIndex === null) return;

        const server = APP.servers[this.serverIndex];
        if (!server.token) return;

        try {
            await fetch(`${server.url}/SyncPlay/Leave`, {
                method: "POST",
                headers: API.getHeaders(this.serverIndex)
            });
        } catch (e) {
            console.error("Error leaving group:", e);
        }

        this.disconnect();
        UI.showToast("Left SyncPlay group");
    },

    async connectWebSocket(serverIndex) {
        const server = APP.servers[serverIndex];
        if (!server.token) throw new Error("No token");

        // Close existing connection
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }

        return new Promise((resolve, reject) => {
            const wsUrl = server.url.replace("https://", "wss://").replace("http://", "ws://");
            const ws = new WebSocket(`${wsUrl}/socket?api_key=${server.token}&deviceId=${API.getDeviceId()}`);

            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error("WebSocket connection timeout"));
            }, 10000);

            ws.onopen = () => {
                clearTimeout(timeout);
                console.log("SyncPlay WebSocket connected");
                this.websocket = ws;
                resolve();
            };

            ws.onerror = (e) => {
                clearTimeout(timeout);
                console.error("WebSocket error:", e);
                reject(e);
            };

            ws.onclose = () => {
                console.log("SyncPlay WebSocket closed");
                if (this.websocket === ws) {
                    this.handleDisconnect();
                }
            };

            ws.onmessage = (event) => {
                this.handleWebSocketMessage(event);
            };
        });
    },

    handleWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log("SyncPlay WS message:", message.MessageType, message.Data);

            switch (message.MessageType) {
                case "SyncPlayCommand":
                    this.handleSyncPlayCommand(message.Data);
                    break;

                case "SyncPlayGroupUpdate":
                    this.handleGroupUpdate(message.Data);
                    break;

                case "SyncPlayPlaybackRequest":
                    this.handlePlaybackRequest(message.Data);
                    break;

                case "KeepAlive":
                    // Respond to keep-alive
                    this.sendWebSocketMessage("KeepAlive");
                    break;

                default:
                    // Other message types
                    break;
            }
        } catch (e) {
            console.error("Error handling WebSocket message:", e);
        }
    },

    handleSyncPlayCommand(data) {
        console.log("SyncPlay command:", data.Command, data);

        const video = document.getElementById("video-player");
        const audio = APP.audioElement;
        const media = APP.currentMedia && ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type) ? video : audio;

        if (!media) return;

        switch (data.Command) {
            case "Unpause":
            case "Play":
                this.syncAndPlay(data);
                break;

            case "Pause":
                this.syncAndPause(data);
                break;

            case "Seek":
                this.syncSeek(data);
                break;

            case "Stop":
                if (media) {
                    media.pause();
                    media.currentTime = 0;
                }
                APP.isPlaying = false;
                UI.updatePlayButton();
                break;
        }
    },

    handleGroupUpdate(data) {
        console.log("Group update:", data.Type, data);

        switch (data.Type) {
            case "GroupJoined":
                this.currentGroupId = data.GroupId;
                this.currentGroup = {
                    GroupName: data.GroupName || "SyncPlay Group"
                };
                this.updateUI();
                UI.showToast("Joined SyncPlay group");
                break;

            case "GroupLeft":
                this.disconnect();
                break;

            case "UserJoined":
                UI.showToast(`${data.UserName || "Someone"} joined`);
                this.updateParticipants(data);
                break;

            case "UserLeft":
                UI.showToast(`${data.UserName || "Someone"} left`);
                this.updateParticipants(data);
                break;

            case "GroupDoesNotExist":
                UI.showToast("Group no longer exists", "error");
                this.disconnect();
                break;

            case "StateUpdate":
                this.handleStateUpdate(data);
                break;

            case "PlayQueue":
                this.handlePlayQueueUpdate(data);
                break;
        }
    },

    handlePlaybackRequest(data) {
        console.log("Playback request:", data);
        // Handle playback requests from other users
    },

    handleStateUpdate(data) {
        // Update local state to match group state
        if (data.PositionTicks !== undefined) {
            const positionSeconds = data.PositionTicks / 10000000;
            const video = document.getElementById("video-player");
            const audio = APP.audioElement;
            const media = APP.currentMedia && ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type) ? video : audio;

            if (media && Math.abs(media.currentTime - positionSeconds) > this.syncThreshold) {
                console.log("State sync: seeking to", positionSeconds);
                media.currentTime = positionSeconds;
            }
        }
    },

    handlePlayQueueUpdate(data) {
        // Handle when group changes what's playing
        if (data.PlayingItemId) {
            // Find and play this item
            const item = APP.library.all.find(i => i.Id === data.PlayingItemId);
            if (item) {
                UI.playMedia(item);
            }
        }
    },

    syncAndPlay(data) {
        const video = document.getElementById("video-player");
        const audio = APP.audioElement;
        const media = APP.currentMedia && ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type) ? video : audio;

        if (!media) return;

        // Calculate target position considering server time
        let targetPosition = 0;
        if (data.PositionTicks !== undefined) {
            targetPosition = data.PositionTicks / 10000000;
        }

        // If we have a "When" timestamp, calculate where we should be
        if (data.When) {
            const whenTime = new Date(data.When).getTime();
            const now = Date.now() + this.timeDiff;
            const elapsed = (now - whenTime) / 1000;
            targetPosition += elapsed;
        }

        // Check if we need to seek
        const diff = targetPosition - media.currentTime;
        console.log("Sync play:", { targetPosition, currentTime: media.currentTime, diff });

        if (Math.abs(diff) > this.syncThreshold) {
            // Big difference - seek
            media.currentTime = targetPosition;
        } else if (Math.abs(diff) > this.playbackRateAdjustThreshold) {
            // Small difference - adjust playback rate temporarily
            media.playbackRate = diff > 0 ? this.maxPlaybackRateAdjust : 0.95;
            setTimeout(() => {
                media.playbackRate = 1.0;
            }, Math.abs(diff) * 1000);
        }

        media.play().catch(e => console.warn("Play failed:", e));
        APP.isPlaying = true;
        UI.updatePlayButton();
    },

    syncAndPause(data) {
        const video = document.getElementById("video-player");
        const audio = APP.audioElement;
        const media = APP.currentMedia && ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type) ? video : audio;

        if (!media) return;

        media.pause();

        // Seek to sync position
        if (data.PositionTicks !== undefined) {
            const targetPosition = data.PositionTicks / 10000000;
            media.currentTime = targetPosition;
        }

        APP.isPlaying = false;
        UI.updatePlayButton();
    },

    syncSeek(data) {
        const video = document.getElementById("video-player");
        const audio = APP.audioElement;
        const media = APP.currentMedia && ["Movie", "Episode", "Series"].includes(APP.currentMedia.Type) ? video : audio;

        if (!media) return;

        if (data.PositionTicks !== undefined) {
            const targetPosition = data.PositionTicks / 10000000;
            console.log("Sync seek to:", targetPosition);
            media.currentTime = targetPosition;
        }
    },

    updateParticipants(data) {
        if (data.Participants) {
            this.participants = data.Participants;
        }
        this.updateUI();
    },

    // Send commands to the group
    async sendPlayRequest() {
        if (!this.isConnected || this.serverIndex === null) return;

        const server = APP.servers[this.serverIndex];
        const video = document.getElementById("video-player");
        const media = video;

        try {
            await fetch(`${server.url}/SyncPlay/Unpause`, {
                method: "POST",
                headers: API.getHeaders(this.serverIndex)
            });
        } catch (e) {
            console.error("Failed to send play request:", e);
        }
    },

    async sendPauseRequest() {
        if (!this.isConnected || this.serverIndex === null) return;

        const server = APP.servers[this.serverIndex];

        try {
            await fetch(`${server.url}/SyncPlay/Pause`, {
                method: "POST",
                headers: API.getHeaders(this.serverIndex)
            });
        } catch (e) {
            console.error("Failed to send pause request:", e);
        }
    },

    async sendSeekRequest(positionSeconds) {
        if (!this.isConnected || this.serverIndex === null) return;

        const server = APP.servers[this.serverIndex];
        const positionTicks = Math.floor(positionSeconds * 10000000);

        try {
            await fetch(`${server.url}/SyncPlay/Seek`, {
                method: "POST",
                headers: {
                    ...API.getHeaders(this.serverIndex),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    PositionTicks: positionTicks
                })
            });
        } catch (e) {
            console.error("Failed to send seek request:", e);
        }
    },

    async sendBufferingRequest(isBuffering) {
        if (!this.isConnected || this.serverIndex === null) return;

        const server = APP.servers[this.serverIndex];
        const video = document.getElementById("video-player");
        const positionTicks = video ? Math.floor(video.currentTime * 10000000) : 0;

        const endpoint = isBuffering ? "Buffering" : "Ready";

        try {
            await fetch(`${server.url}/SyncPlay/${endpoint}`, {
                method: "POST",
                headers: {
                    ...API.getHeaders(this.serverIndex),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    When: new Date().toISOString(),
                    PositionTicks: positionTicks,
                    IsPlaying: !isBuffering,
                    PlaylistItemId: APP.currentMedia?.Id || ""
                })
            });

            this.isBuffering = isBuffering;
        } catch (e) {
            console.error("Failed to send buffering request:", e);
        }
    },

    async setPlayQueue(items) {
        if (!this.isConnected || this.serverIndex === null) return;

        const server = APP.servers[this.serverIndex];
        const itemIds = items.map(i => i.Id);

        try {
            await fetch(`${server.url}/SyncPlay/SetNewQueue`, {
                method: "POST",
                headers: {
                    ...API.getHeaders(this.serverIndex),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    PlayingQueue: itemIds,
                    PlayingItemPosition: 0,
                    StartPositionTicks: 0
                })
            });
        } catch (e) {
            console.error("Failed to set play queue:", e);
        }
    },

    // Ping for time sync
    startPingInterval() {
        this.stopPingInterval();

        // Send initial ping
        this.sendPing();

        // Ping every 5 seconds
        this.pingInterval = setInterval(() => {
            this.sendPing();
        }, 5000);
    },

    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    },

    async sendPing() {
        if (!this.isConnected || this.serverIndex === null) return;

        const server = APP.servers[this.serverIndex];
        const sendTime = Date.now();

        try {
            const response = await fetch(`${server.url}/SyncPlay/Ping`, {
                method: "POST",
                headers: {
                    ...API.getHeaders(this.serverIndex),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    Ping: sendTime
                })
            });

            if (response.ok) {
                const receiveTime = Date.now();
                this.lastPing = (receiveTime - sendTime) / 2;
                console.log("SyncPlay ping:", this.lastPing, "ms");
            }
        } catch (e) {
            console.error("Ping failed:", e);
        }
    },

    sendWebSocketMessage(type, data = {}) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

        const message = JSON.stringify({
            MessageType: type,
            Data: data
        });

        this.websocket.send(message);
    },

    disconnect() {
        this.stopPingInterval();

        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }

        this.isConnected = false;
        this.currentGroup = null;
        this.currentGroupId = null;
        this.serverIndex = null;
        this.participants = [];

        this.updateUI();
    },

    handleDisconnect() {
        if (this.isConnected) {
            UI.showToast("Disconnected from SyncPlay", "error");
            this.disconnect();
        }
    },

    updateUI() {
        const btn = document.getElementById("syncplay-btn");
        const indicator = document.getElementById("syncplay-indicator");
        const bar = document.getElementById("syncplay-bar");
        const groupName = document.getElementById("syncplay-group-name");
        const status = document.getElementById("syncplay-status");

        if (this.isConnected) {
            indicator?.classList.remove("hidden");
            bar?.classList.remove("hidden");

            if (groupName) {
                groupName.textContent = this.currentGroup?.GroupName || "SyncPlay Group";
            }
            if (status) {
                const count = this.participants.length || 1;
                status.textContent = `Connected • ${count} viewer${count !== 1 ? 's' : ''}`;
            }
        } else {
            indicator?.classList.add("hidden");
            bar?.classList.add("hidden");
        }
    },

    // Hook into playback controls
    onPlayPause() {
        if (!this.isConnected) return false; // Let normal handling proceed

        if (APP.isPlaying) {
            this.sendPauseRequest();
        } else {
            this.sendPlayRequest();
        }

        return true; // Handled by SyncPlay
    },

    onSeek(positionSeconds) {
        if (!this.isConnected) return false;

        this.sendSeekRequest(positionSeconds);
        return true;
    },

    onMediaPlay(item) {
        if (!this.isConnected) return;

        // Notify group about what we're playing
        if (item.serverIndex === this.serverIndex) {
            this.setPlayQueue([item]);
        }
    }
};
const TrackManager = {
    isLoading: false,
    isSwitchingAudio: false, // Prevent double-switching
    currentStreamType: 'hls', // Track what type of stream we're using
    
    init() {
        this.setupEventListeners();
        APP.preferredSubtitleLang = Storage.load("preferredSubtitleLang", null);
        APP.preferredAudioLang = Storage.load("preferredAudioLang", null);
    },

    setupEventListeners() {
        const subBtn = document.getElementById("player-subtitles");
        const audioBtn = document.getElementById("player-audio-tracks");
        const closeBtn = document.getElementById("track-modal-close");
        const modal = document.getElementById("track-modal");

        if (subBtn) {
            subBtn.addEventListener("click", () => this.showTrackModal("subtitles"));
        }
        if (audioBtn) {
            audioBtn.addEventListener("click", () => this.showTrackModal("audio"));
        }
        if (closeBtn) {
            closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
        }
        if (modal) {
            modal.addEventListener("click", (e) => {
                if (e.target.id === "track-modal") {
                    modal.classList.add("hidden");
                }
            });
        }
    },

    setupHlsTrackEvents(hls) {
        // Optional debugging
    },

    async fetchMediaStreams(item) {
        const server = APP.servers[item.serverIndex];
        if (!server || !server.token) return null;

        try {
            const response = await fetch(
                `${server.url}/Users/${server.userId}/Items/${item.Id}?Fields=MediaStreams,MediaSources`,
                { headers: API.getHeaders(item.serverIndex) }
            );
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error("Failed to fetch media streams:", e);
            return null;
        }
    },

    async loadTracks(item) {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            APP.subtitleTracks = [];
            APP.audioTracks = [];
            APP.currentSubtitleIndex = -1;
            APP.currentAudioIndex = 0;
            this.currentStreamType = 'hls';

            const mediaInfo = await this.fetchMediaStreams(item);
            if (!mediaInfo || !mediaInfo.MediaSources || mediaInfo.MediaSources.length === 0) {
                this.updateTrackButtons();
                return;
            }

            const mediaSource = mediaInfo.MediaSources[0];
            const streams = mediaSource.MediaStreams || [];

            APP.currentMediaSourceId = mediaSource.Id;

            let firstAudioIndex = null;

            streams.forEach((stream) => {
                if (stream.Type === "Subtitle") {
                    APP.subtitleTracks.push({
                        index: stream.Index,
                        displayTitle: stream.DisplayTitle || stream.Title || `Subtitle ${stream.Index}`,
                        language: stream.Language || "und",
                        codec: stream.Codec?.toLowerCase() || "",
                        isExternal: stream.IsExternal || false,
                        isDefault: stream.IsDefault || false,
                        isForced: stream.IsForced || false,
                    });
                } else if (stream.Type === "Audio") {
                    if (firstAudioIndex === null) {
                        firstAudioIndex = stream.Index;
                    }
                    APP.audioTracks.push({
                        index: stream.Index,
                        displayTitle: stream.DisplayTitle || stream.Title || `Audio ${stream.Index}`,
                        language: stream.Language || "und",
                        codec: stream.Codec,
                        channels: stream.Channels,
                        isDefault: stream.IsDefault || false,
                        bitRate: stream.BitRate,
                    });
                }
            });

            // Default to first audio track
            APP.currentAudioIndex = 0;
            APP.defaultAudioStreamIndex = firstAudioIndex || 0;

            this.updateTrackButtons();

            console.log("Loaded tracks:", {
                subtitles: APP.subtitleTracks.map(t => ({ index: t.index, title: t.displayTitle })),
                audio: APP.audioTracks.map(t => ({ index: t.index, title: t.displayTitle })),
                currentAudioIndex: APP.currentAudioIndex
            });
        } catch (e) {
            console.error("Error loading tracks:", e);
        } finally {
            this.isLoading = false;
        }
    },

    updateTrackButtons() {
        const subBtn = document.getElementById("player-subtitles");
        const audioBtn = document.getElementById("player-audio-tracks");

        if (!subBtn || !audioBtn) return;

        if (APP.subtitleTracks.length === 0) {
            subBtn.classList.add("opacity-50");
            subBtn.disabled = true;
        } else {
            subBtn.classList.remove("opacity-50");
            subBtn.disabled = false;
            subBtn.classList.toggle("text-violet-400", APP.currentSubtitleIndex >= 0);
        }

        if (APP.audioTracks.length <= 1) {
            audioBtn.classList.add("opacity-50");
            audioBtn.disabled = true;
        } else {
            audioBtn.classList.remove("opacity-50");
            audioBtn.disabled = false;
            // Highlight if not on default track
            audioBtn.classList.toggle("text-violet-400", APP.currentAudioIndex !== 0);
        }
    },

    showTrackModal(type) {
        // Don't show modal if currently switching
        if (this.isSwitchingAudio) {
            UI.showToast("Please wait...", "info");
            return;
        }

        const modal = document.getElementById("track-modal");
        const title = document.getElementById("track-modal-title");
        const list = document.getElementById("track-list");

        if (!modal || !title || !list) return;

        if (type === "subtitles") {
            title.textContent = "Subtitles";
            list.innerHTML = this.renderSubtitleOptions();
        } else {
            title.textContent = "Audio Tracks";
            list.innerHTML = this.renderAudioOptions();
        }

        modal.classList.remove("hidden");

        list.querySelectorAll(".track-option").forEach(btn => {
            btn.addEventListener("click", () => {
                const trackType = btn.dataset.type;
                const trackIndex = parseInt(btn.dataset.index);

                if (trackType === "subtitle") {
                    this.selectSubtitle(trackIndex);
                } else {
                    this.selectAudioTrack(trackIndex);
                }

                modal.classList.add("hidden");
            });
        });
    },

    renderSubtitleOptions() {
        let html = `
            <button class="track-option w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3 ${APP.currentSubtitleIndex === -1 ? 'bg-violet-600/30 border border-violet-500' : ''}" 
                data-type="subtitle" data-index="-1">
                <i class="fas fa-ban w-5 text-gray-400"></i>
                <span class="flex-1">Off</span>
                ${APP.currentSubtitleIndex === -1 ? '<i class="fas fa-check text-violet-400"></i>' : ''}
            </button>
        `;

        APP.subtitleTracks.forEach((track, index) => {
            const isActive = index === APP.currentSubtitleIndex;
            const flags = [];
            if (track.isDefault) flags.push("Default");
            if (track.isForced) flags.push("Forced");
            if (track.isExternal) flags.push("External");

            html += `
                <button class="track-option w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3 ${isActive ? 'bg-violet-600/30 border border-violet-500' : ''}" 
                    data-type="subtitle" data-index="${index}">
                    <i class="fas fa-closed-captioning w-5 text-gray-400"></i>
                    <div class="flex-1">
                        <p class="font-medium">${track.displayTitle}</p>
                        <p class="text-xs text-gray-400">
                            ${this.getLanguageName(track.language)}
                            ${track.codec ? ` • ${track.codec.toUpperCase()}` : ''}
                            ${flags.length > 0 ? ` • ${flags.join(', ')}` : ''}
                        </p>
                    </div>
                    ${isActive ? '<i class="fas fa-check text-violet-400"></i>' : ''}
                </button>
            `;
        });

        return html;
    },

    renderAudioOptions() {
        if (APP.audioTracks.length === 0) {
            return '<p class="text-gray-500 text-center py-4">No audio tracks available</p>';
        }

        let html = '';

        APP.audioTracks.forEach((track, index) => {
            const isActive = index === APP.currentAudioIndex;
            const details = [];
            if (track.channels) {
                const channelLabel = track.channels === 2 ? 'Stereo' : 
                                    track.channels === 6 ? '5.1' : 
                                    track.channels === 8 ? '7.1' : 
                                    `${track.channels}ch`;
                details.push(channelLabel);
            }
            if (track.codec) details.push(track.codec.toUpperCase());

            html += `
                <button class="track-option w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3 ${isActive ? 'bg-violet-600/30 border border-violet-500' : ''}" 
                    data-type="audio" data-index="${index}">
                    <i class="fas fa-volume-up w-5 text-gray-400"></i>
                    <div class="flex-1">
                        <p class="font-medium">${track.displayTitle}</p>
                        <p class="text-xs text-gray-400">
                            ${this.getLanguageName(track.language)}
                            ${details.length > 0 ? ` • ${details.join(' • ')}` : ''}
                            ${track.isDefault ? ' • Default' : ''}
                        </p>
                    </div>
                    ${isActive ? '<i class="fas fa-check text-violet-400"></i>' : ''}
                </button>
            `;
        });

        return html;
    },

    getLanguageName(code) {
        const languages = {
            'eng': 'English', 'en': 'English',
            'spa': 'Spanish', 'es': 'Spanish',
            'fra': 'French', 'fr': 'French', 'fre': 'French',
            'deu': 'German', 'de': 'German', 'ger': 'German',
            'ita': 'Italian', 'it': 'Italian',
            'por': 'Portuguese', 'pt': 'Portuguese',
            'rus': 'Russian', 'ru': 'Russian',
            'jpn': 'Japanese', 'ja': 'Japanese',
            'kor': 'Korean', 'ko': 'Korean',
            'zho': 'Chinese', 'zh': 'Chinese', 'chi': 'Chinese',
            'ara': 'Arabic', 'ar': 'Arabic',
            'hin': 'Hindi', 'hi': 'Hindi',
            'und': 'Unknown',
        };
        return languages[code?.toLowerCase()] || code || 'Unknown';
    },

    selectSubtitle(index) {
        APP.currentSubtitleIndex = index;
        this.updateTrackButtons();

        if (index === -1) {
            this.disableSubtitles();
            UI.showToast("Subtitles off");
        } else {
            const track = APP.subtitleTracks[index];
            this.enableSubtitle(track);
            UI.showToast(`Subtitles: ${track.displayTitle}`);

            if (track.language && track.language !== 'und') {
                APP.preferredSubtitleLang = track.language;
                Storage.save("preferredSubtitleLang", track.language);
            }
        }
    },

    selectAudioTrack(index) {
        console.log("selectAudioTrack called:", { 
            requestedIndex: index, 
            currentIndex: APP.currentAudioIndex,
            isSwitching: this.isSwitchingAudio 
        });

        if (this.isSwitchingAudio) {
            UI.showToast("Please wait, switching audio...", "info");
            return;
        }

        if (index === APP.currentAudioIndex) {
            UI.showToast("Already selected");
            return;
        }

        const track = APP.audioTracks[index];
        if (!track) {
            console.error("Track not found at index:", index);
            return;
        }

        const previousIndex = APP.currentAudioIndex;
        APP.currentAudioIndex = index;
        this.isSwitchingAudio = true;

        UI.showToast(`Switching to: ${track.displayTitle}...`, "info");

        this.switchAudioTrack(track, () => {
            this.isSwitchingAudio = false;
            this.updateTrackButtons();
            UI.showToast(`Audio: ${track.displayTitle}`);
            
            if (track.language && track.language !== 'und') {
                APP.preferredAudioLang = track.language;
                Storage.save("preferredAudioLang", track.language);
            }
        }, () => {
            this.isSwitchingAudio = false;
            APP.currentAudioIndex = previousIndex;
            this.updateTrackButtons();
            UI.showToast("Failed to switch audio", "error");
        });
    },

    enableSubtitle(track) {
        const video = document.getElementById("video-player");
        if (!video) return;
        
        this.disableSubtitles();

        if (!APP.currentMedia) return;

        const server = APP.servers[APP.currentMedia.serverIndex];
        if (!server || !server.token) return;

        const mediaSourceId = APP.currentMediaSourceId || APP.currentMedia.Id;
        const subtitleUrl = `${server.url}/Videos/${APP.currentMedia.Id}/${mediaSourceId}/Subtitles/${track.index}/Stream.vtt?api_key=${server.token}`;

        console.log("Loading subtitle from:", subtitleUrl);

        fetch(subtitleUrl)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            })
            .then(vttContent => {
                console.log("Subtitle fetched, length:", vttContent.length);
                
                const blob = new Blob([vttContent], { type: 'text/vtt' });
                const blobUrl = URL.createObjectURL(blob);
                
                const existingTracks = video.querySelectorAll("track");
                existingTracks.forEach(t => t.remove());

                const trackElement = document.createElement("track");
                trackElement.kind = "subtitles";
                trackElement.label = track.displayTitle;
                trackElement.srclang = track.language || "en";
                trackElement.src = blobUrl;
                trackElement.default = true;

                video.appendChild(trackElement);

                requestAnimationFrame(() => {
                    for (let i = 0; i < video.textTracks.length; i++) {
                        video.textTracks[i].mode = "showing";
                    }
                });
            })
            .catch(error => {
                console.error("Failed to fetch subtitle:", error);
                UI.showToast("Could not load subtitles", "error");
            });
    },

    disableSubtitles() {
        const video = document.getElementById("video-player");
        if (!video) return;

        for (let i = 0; i < video.textTracks.length; i++) {
            video.textTracks[i].mode = "hidden";
        }

        const trackElements = video.querySelectorAll("track");
        trackElements.forEach(t => {
            if (t.src && t.src.startsWith('blob:')) {
                URL.revokeObjectURL(t.src);
            }
            t.remove();
        });
    },

    // Get current playback position safely
    getCurrentTime() {
        const video = document.getElementById("video-player");
        if (!video) return 0;
        
        const time = video.currentTime;
        if (isNaN(time) || time < 0) return 0;
        return time;
    },

    // Clean up video element completely
    cleanupVideo() {
        const video = document.getElementById("video-player");
        if (!video) return;

        // Remove all event listeners by cloning (optional, but safer)
        // For now, just pause and clear source
        try {
            video.pause();
        } catch (e) {}

        // Destroy HLS instance
        if (APP.hlsInstance) {
            try {
                APP.hlsInstance.destroy();
            } catch (e) {}
            APP.hlsInstance = null;
        }

        // Clear source
        video.removeAttribute('src');
        video.load();
    },

    switchAudioTrack(track, onSuccess, onError) {
        if (!APP.currentMedia) {
            console.error("No current media");
            if (onError) onError();
            return;
        }

        const video = document.getElementById("video-player");
        if (!video) {
            console.error("No video element");
            if (onError) onError();
            return;
        }

        // Capture state BEFORE cleanup
        const currentTime = this.getCurrentTime();
        const wasPlaying = !video.paused;
        const currentSubtitleIndex = APP.currentSubtitleIndex;

        console.log("Audio switch state:", {
            currentTime,
            wasPlaying,
            currentSubtitleIndex,
            targetTrack: track.index,
            currentStreamType: this.currentStreamType
        });

        const server = APP.servers[APP.currentMedia.serverIndex];
        if (!server || !server.token) {
            console.error("No server/token");
            if (onError) onError();
            return;
        }

        // Clean up existing playback
        this.cleanupVideo();

        const mediaSourceId = APP.currentMediaSourceId || APP.currentMedia.Id;
        const audioStreamIndex = track.index;
        const playSessionId = 'play_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);

        // Update play session
        APP.currentPlaySessionId = playSessionId;

        // Try HLS first, then fallbacks
        this.tryHLSStream(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError);
    },

    tryHLSStream(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError) {
        const video = document.getElementById("video-player");
        
        const hlsUrl = `${server.url}/Videos/${APP.currentMedia.Id}/main.m3u8?` +
            `DeviceId=${API.getDeviceId()}` +
            `&MediaSourceId=${mediaSourceId}` +
            `&PlaySessionId=${playSessionId}` +
            `&api_key=${server.token}` +
            `&AudioStreamIndex=${audioStreamIndex}` +
            `&VideoCodec=h264` +
            `&AudioCodec=aac` +
            `&TranscodingProtocol=hls` +
            `&TranscodingContainer=ts` +
            `&SegmentContainer=ts` +
            `&MinSegments=1` +
            `&BreakOnNonKeyFrames=true`;

        console.log("Trying HLS:", hlsUrl);

        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                startPosition: currentTime > 0 ? currentTime : -1,
            });

            let resolved = false;
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
                hls.off(Hls.Events.ERROR, onHlsError);
            };

            const onManifestParsed = () => {
                if (resolved) return;
                resolved = true;
                cleanup();

                console.log("HLS manifest parsed successfully");
                this.currentStreamType = 'hls';
                APP.hlsInstance = hls;

                this.finalizeAudioSwitch(video, currentTime, wasPlaying, currentSubtitleIndex, onSuccess);
            };

            const onHlsError = (event, data) => {
                console.error("HLS error:", data.type, data.details);
                
                if (data.fatal && !resolved) {
                    resolved = true;
                    cleanup();
                    hls.destroy();
                    
                    console.log("HLS failed, trying MP4...");
                    this.tryMP4Stream(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError);
                }
            };

            // Timeout fallback
            timeoutId = setTimeout(() => {
                if (!resolved) {
                    console.log("HLS timeout, trying MP4...");
                    resolved = true;
                    cleanup();
                    hls.destroy();
                    this.tryMP4Stream(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError);
                }
            }, 10000);

            hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
            hls.on(Hls.Events.ERROR, onHlsError);

            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
        } else {
            // Safari - try native HLS
            this.tryNativeHLS(hlsUrl, server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError);
        }
    },

    tryNativeHLS(url, server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError) {
        const video = document.getElementById("video-player");
        
        console.log("Trying native HLS");
        
        video.src = url;

        let resolved = false;
        let timeoutId = null;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            video.removeEventListener('loadedmetadata', onLoad);
            video.removeEventListener('error', onErr);
        };

        const onLoad = () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            
            console.log("Native HLS loaded");
            this.currentStreamType = 'native-hls';
            this.finalizeAudioSwitch(video, currentTime, wasPlaying, currentSubtitleIndex, onSuccess);
        };

        const onErr = () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            
            console.log("Native HLS failed, trying MP4...");
            this.tryMP4Stream(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError);
        };

        timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                cleanup();
                this.tryMP4Stream(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError);
            }
        }, 10000);

        video.addEventListener('loadedmetadata', onLoad);
        video.addEventListener('error', onErr);

        video.load();
    },

    tryMP4Stream(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError) {
        const video = document.getElementById("video-player");
        
        // Use StartTimeTicks for seeking (more reliable with transcoding)
        const startTicks = Math.floor(currentTime * 10000000);
        
        const mp4Url = `${server.url}/Videos/${APP.currentMedia.Id}/stream.mp4?` +
            `DeviceId=${API.getDeviceId()}` +
            `&MediaSourceId=${mediaSourceId}` +
            `&PlaySessionId=${playSessionId}` +
            `&api_key=${server.token}` +
            `&AudioStreamIndex=${audioStreamIndex}` +
            `&VideoCodec=h264` +
            `&AudioCodec=aac` +
            `&MaxAudioChannels=2` +
            `&VideoBitrate=8000000` +
            `&AudioBitrate=192000` +
            `&StartTimeTicks=${startTicks}`;

        console.log("Trying MP4:", mp4Url);

        // Make sure HLS is destroyed
        if (APP.hlsInstance) {
            APP.hlsInstance.destroy();
            APP.hlsInstance = null;
        }

        video.src = mp4Url;

        let resolved = false;
        let timeoutId = null;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            video.removeEventListener('loadeddata', onLoad);
            video.removeEventListener('canplay', onLoad);
            video.removeEventListener('error', onErr);
        };

        const onLoad = () => {
            if (resolved) return;
            resolved = true;
            cleanup();

            console.log("MP4 loaded successfully");
            this.currentStreamType = 'mp4';
            
            // MP4 with StartTimeTicks starts at 0, so don't seek
            this.finalizeAudioSwitch(video, 0, wasPlaying, currentSubtitleIndex, onSuccess);
        };

        const onErr = (e) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            
            console.error("MP4 failed:", e);
            
            // Try without StartTimeTicks
            this.tryMP4StreamSimple(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError);
        };

        timeoutId = setTimeout(() => {
            if (!resolved) {
                console.log("MP4 timeout");
                resolved = true;
                cleanup();
                this.tryMP4StreamSimple(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError);
            }
        }, 15000);

        video.addEventListener('loadeddata', onLoad);
        video.addEventListener('canplay', onLoad);
        video.addEventListener('error', onErr);

        video.load();
    },

    tryMP4StreamSimple(server, mediaSourceId, audioStreamIndex, playSessionId, currentTime, wasPlaying, currentSubtitleIndex, onSuccess, onError) {
        const video = document.getElementById("video-player");
        
        // Simple MP4 without StartTimeTicks
        const mp4Url = `${server.url}/Videos/${APP.currentMedia.Id}/stream.mp4?` +
            `DeviceId=${API.getDeviceId()}` +
            `&MediaSourceId=${mediaSourceId}` +
            `&PlaySessionId=${playSessionId}` +
            `&api_key=${server.token}` +
            `&AudioStreamIndex=${audioStreamIndex}` +
            `&VideoCodec=h264` +
            `&AudioCodec=aac` +
            `&MaxAudioChannels=2`;

        console.log("Trying simple MP4:", mp4Url);

        video.src = mp4Url;

        let resolved = false;

        const cleanup = () => {
            video.removeEventListener('loadeddata', onLoad);
            video.removeEventListener('canplay', onLoad);
            video.removeEventListener('error', onErr);
        };

        const onLoad = () => {
            if (resolved) return;
            resolved = true;
            cleanup();

            console.log("Simple MP4 loaded");
            this.currentStreamType = 'mp4-simple';
            
            // Need to seek manually
            this.finalizeAudioSwitch(video, currentTime, wasPlaying, currentSubtitleIndex, onSuccess);
        };

        const onErr = (e) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            
            console.error("Simple MP4 also failed:", e);
            if (onError) onError();
        };

        video.addEventListener('loadeddata', onLoad);
        video.addEventListener('canplay', onLoad);
        video.addEventListener('error', onErr);

        video.load();
    },

    finalizeAudioSwitch(video, currentTime, wasPlaying, currentSubtitleIndex, onSuccess) {
        console.log("Finalizing audio switch:", { currentTime, wasPlaying, currentSubtitleIndex });

        // Seek to position if needed
        if (currentTime > 0) {
            const doSeek = () => {
                video.removeEventListener('loadedmetadata', doSeek);
                video.removeEventListener('canplay', doSeek);
                
                try {
                    video.currentTime = currentTime;
                } catch (e) {
                    console.warn("Seek failed:", e);
                }
            };

            if (video.readyState >= 1) {
                try {
                    video.currentTime = currentTime;
                } catch (e) {
                    console.warn("Seek failed:", e);
                }
            } else {
                video.addEventListener('loadedmetadata', doSeek);
                video.addEventListener('canplay', doSeek);
            }
        }

        // Play if was playing
        if (wasPlaying) {
            const doPlay = () => {
                video.removeEventListener('canplay', doPlay);
                video.play().catch(e => console.warn("Auto-play blocked:", e));
            };

            if (video.readyState >= 3) {
                video.play().catch(e => console.warn("Auto-play blocked:", e));
            } else {
                video.addEventListener('canplay', doPlay);
            }
        }

        // Re-enable subtitles
        if (currentSubtitleIndex >= 0 && APP.subtitleTracks[currentSubtitleIndex]) {
            setTimeout(() => {
                this.enableSubtitle(APP.subtitleTracks[currentSubtitleIndex]);
            }, 1500);
        }

        if (onSuccess) onSuccess();
    }
};

      // ==================== Event Listeners ====================
      document.addEventListener("DOMContentLoaded", () => {
        // Load saved data from localStorage
        const savedAuth = Storage.load("auth");
        if (savedAuth) {
          APP.servers = savedAuth.servers;
          APP.username = savedAuth.username;
          initializeApp();
        }

        APP.accentColor = Storage.load("accentColor", "#8b5cf6");
        UI.setAccentColor(APP.accentColor);

        APP.theme = Storage.load("theme", "dark");
        UI.setTheme(APP.theme);

        APP.quality = Storage.load("quality", "auto");
        document.getElementById("quality-select").value = APP.quality;

        APP.watchHistory = Storage.load("watchHistory", []);
        APP.favorites = Storage.load("favorites", []);
        APP.downloads = Storage.load("downloads", []);
        APP.resumeData = Storage.load("resumeData", {});

TrackManager.init();

SyncPlay.init();
        // Login form
        document
          .getElementById("login-form")
          .addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = document.getElementById("username").value.trim();
            const password1 = document.getElementById("password1").value;
            const password2 = document.getElementById("password2").value;

            if (!username || !password1) {
              document.getElementById("login-error").textContent =
                "Please fill in all fields";
              document.getElementById("login-error").classList.remove("hidden");
              return;
            }

            const loginBtn = document.getElementById("login-btn");
            const loginStatus = document.getElementById("login-status");
            const loginError = document.getElementById("login-error");

            loginBtn.disabled = true;
            loginBtn.innerHTML =
              '<i class="fas fa-spinner fa-spin mr-2"></i> Connecting...';
            loginError.classList.add("hidden");
            loginStatus.classList.remove("hidden");

            // Authenticate with server 1
            loginStatus.textContent = "Connecting to Oasis Archive...";
            const auth1 = await API.authenticate(0, username, password1);

            // Authenticate with server 2
            loginStatus.textContent = "Connecting to Jade's Worlds...";
            if (password2) {
                const auth2 = await API.authenticate(1, username, password2);
            } else {
                const auth2 = await API.authenticate(1, username, password1);
            } 
            if (!auth1 && !auth2) {
              loginError.textContent =
                "Failed to connect to both servers. Please check your credentials.";
              loginError.classList.remove("hidden");
              loginBtn.disabled = false;
              loginBtn.innerHTML =
                '<span>Connect to Servers</span><i class="fas fa-arrow-right"></i>';
              loginStatus.classList.add("hidden");
              return;
            }

            APP.username = username;

            // Save auth
            Storage.save("auth", {
              servers: APP.servers,
              username: APP.username,
            });

            await initializeApp();
          });

        // Tab navigation
        document.querySelectorAll(".nav-tab").forEach((btn) => {
          btn.addEventListener("click", () => UI.switchTab(btn.dataset.tab));
        });

        // Nested tabs
        document.querySelectorAll(".nested-tab").forEach((btn) => {
          btn.addEventListener("click", () =>
            UI.switchNestedTab(btn.dataset.nested),
          );
        });

        // Audio tabs
        document.querySelectorAll(".audio-tab").forEach((btn) => {
          btn.addEventListener("click", () =>
            UI.switchAudioTab(btn.dataset.audio),
          );
        });

        // Search
        document
          .getElementById("search-toggle")
          .addEventListener("click", () => {
            document
              .getElementById("search-overlay")
              .classList.remove("hidden");
            document.getElementById("search-input").focus();
          });

        document
          .getElementById("search-close")
          .addEventListener("click", () => {
            document.getElementById("search-overlay").classList.add("hidden");
          });

        let searchTimeout;
        document
          .getElementById("search-input")
          .addEventListener("input", (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(
              () => UI.performSearch(e.target.value),
              300,
            );
          });

        document.querySelectorAll(".search-filter").forEach((btn) => {
          btn.addEventListener("click", () => {
            document.querySelectorAll(".search-filter").forEach((b) => {
              b.classList.remove("bg-violet-600");
              b.classList.add("bg-white/5");
            });
            btn.classList.remove("bg-white/5");
            btn.classList.add("bg-violet-600");
            APP.searchFilter = btn.dataset.filter;
            UI.performSearch(document.getElementById("search-input").value);
          });
        });

        // Refresh
        document
          .getElementById("refresh-btn")
          .addEventListener("click", async () => {
            const btn = document.getElementById("refresh-btn");
            btn.querySelector("i").classList.add("fa-spin");
            await loadLibraries();
            btn.querySelector("i").classList.remove("fa-spin");
            UI.showToast("Library refreshed");
          });

        // Download current folder
        document
          .getElementById("download-folder-btn")
          .addEventListener("click", async () => {
            if (APP.currentLibraryPath.length === 0) {
              UI.showToast("Cannot download root folder", "error");
              return;
            }

            const currentFolder =
              APP.currentLibraryPath[APP.currentLibraryPath.length - 1];
            UI.startDownload(currentFolder);
          });

        // Mini player controls
        document
          .getElementById("mini-play")
          .addEventListener("click", () => UI.togglePlay());

        document.getElementById("mini-prev").addEventListener("click", () => {
          const prevTrack = UI.getPreviousTrack();
          if (prevTrack) {
            UI.playMedia(prevTrack);
          }
        });

        document.getElementById("mini-next").addEventListener("click", () => {
          const nextTrack = UI.getNextTrack();
          if (nextTrack) {
            UI.playMedia(nextTrack);
          }
        });

        document.getElementById("mini-expand").addEventListener("click", () => {
          document.getElementById("full-player").classList.remove("hidden");
        });

        // Full player controls
        document
          .getElementById("player-close")
          .addEventListener("click", () => {
            document.getElementById("full-player").classList.add("hidden");
          });

        document
          .getElementById("player-play")
          .addEventListener("click", () => UI.togglePlay());

        document.getElementById("player-next").addEventListener("click", () => {
          const nextTrack = UI.getNextTrack();
          if (nextTrack) {
            UI.playMedia(nextTrack);
          }
        });

        document.getElementById("player-prev").addEventListener("click", () => {
          const prevTrack = UI.getPreviousTrack();
          if (prevTrack) {
            UI.playMedia(prevTrack);
          }
        });

        document
          .getElementById("player-shuffle")
          .addEventListener("click", () => UI.toggleShuffle());

        document
          .getElementById("player-repeat")
          .addEventListener("click", () => UI.toggleRepeat());

        document
          .getElementById("player-seek")
          .addEventListener("input", (e) => {
            UI.seekTo(parseFloat(e.target.value));
          });

        document
          .getElementById("player-download")
          .addEventListener("click", () => {
            if (APP.currentMedia) {
              UI.startDownload(APP.currentMedia);
            }
          });

        document
          .getElementById("player-favorite")
          .addEventListener("click", () => {
            if (APP.currentMedia) {
              UI.toggleFavorite(APP.currentMedia);
            }
          });

        document
          .getElementById("player-queue")
          .addEventListener("click", () => {
            document.getElementById("queue-modal").classList.remove("hidden");
          });
videoPlayer = document.getElementById("video-player");

videoPlayer.addEventListener("waiting", () => {
    if (SyncPlay.isConnected) {
        SyncPlay.sendBufferingRequest(true);
    }
});

videoPlayer.addEventListener("playing", () => {
    if (SyncPlay.isConnected && SyncPlay.isBuffering) {
        SyncPlay.sendBufferingRequest(false);
    }
});

videoPlayer.addEventListener("canplay", () => {
    if (SyncPlay.isConnected && SyncPlay.isBuffering) {
        SyncPlay.sendBufferingRequest(false);
    }
});
        // Player menu
        document.getElementById("player-menu").addEventListener("click", () => {
          const menu = document.createElement("div");
          menu.className = "fixed inset-0 z-50 flex flex-col";
          menu.innerHTML = `
          <div class="flex-1 bg-black/50 backdrop-blur-sm"></div>
          <div class="glass rounded-t-3xl border-t border-white/10 p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold">Now Playing</h3>
              <button class="close-menu w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <button class="view-queue-menu w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3">
                <i class="fas fa-list text-violet-400 w-5"></i>
                <span>View Queue</span>
              </button>
              <button class="copy-stream-url w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3">
                <i class="fas fa-copy text-sky-400 w-5"></i>
                <span>Copy URL</span>
              </button>
              <button class="add-fav-menu w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3">
                <i class="fas fa-heart text-rose-400 w-5"></i>
                <span>Add to Favorites</span>
              </button>
              <button class="show-details-menu w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3">
                <i class="fas fa-info-circle text-gray-400 w-5"></i>
                <span>Show Details</span>
              </button>
            </div>
          </div>
        `;

          document.body.appendChild(menu);

          const backdrop = menu.querySelector('[class*="flex-1"]');
          const closeBtn = menu.querySelector(".close-menu");
          const queueBtn = menu.querySelector(".view-queue-menu");
          const favBtn = menu.querySelector(".add-fav-menu");
          const copyBtn = menu.querySelector(".copy-stream-url");
          const detailsBtn = menu.querySelector(".show-details-menu");

          const close = () => menu.remove();
          backdrop.addEventListener("click", close);
          closeBtn.addEventListener("click", close);

          queueBtn.addEventListener("click", () => {
            menu.remove();
            document.getElementById("queue-modal").classList.remove("hidden");
          });

          favBtn.addEventListener("click", () => {
            if (APP.currentMedia) {
              UI.toggleFavorite(APP.currentMedia);
              menu.remove();
            }
          });

          copyBtn.addEventListener("click", () => {
            if (APP.currentMedia) {
              UI.copyCurrentStreamUrl();
              menu.remove();
            }
          });

        detailsBtn.addEventListener("click", () => {
            if (APP.currentMedia) {
              UI.showMediaDetail(APP.currentMedia);
              menu.remove();
            }
          });
        });

        // Queue modal
        document.getElementById("queue-close").addEventListener("click", () => {
          document.getElementById("queue-modal").classList.add("hidden");
        });

        // Video player events
        const videoPlayer = document.getElementById("video-player");
        videoPlayer.addEventListener("timeupdate", () => UI.updateProgress());
        videoPlayer.addEventListener("ended", () => {
          if (APP.repeatMode === "one") {
            videoPlayer.currentTime = 0;
            videoPlayer.play();
          } else {
            const nextTrack = UI.getNextTrack();
            if (nextTrack) {
              UI.playMedia(nextTrack);
            } else {
              UI.handleMediaEnd();
            }
          }
        });
        videoPlayer.addEventListener("play", () => {
          APP.isPlaying = true;
          UI.updatePlayButton();
        });
        videoPlayer.addEventListener("pause", () => {
          APP.isPlaying = false;
          UI.updatePlayButton();
        });

        // Resume start fresh button
        document
          .getElementById("player-start-fresh")
          .addEventListener("click", () => {
            videoPlayer.currentTime = 0;
            document
              .getElementById("player-resume-info")
              .classList.add("hidden");
            UI.showToast("Starting from beginning");
          });

        // Detail modal
        document
          .getElementById("detail-close")
          .addEventListener("click", () => {
            document.getElementById("detail-modal").classList.add("hidden");
          });

        document.getElementById("detail-play").addEventListener("click", () => {
          if (APP.detailItem) {
            UI.playMedia(APP.detailItem);
            document.getElementById("detail-modal").classList.add("hidden");
          }
        });

        document
          .getElementById("detail-download-btn")
          .addEventListener("click", () => {
            if (APP.detailItem) {
              UI.startDownload(APP.detailItem);
            }
          });

        document
          .getElementById("detail-fav-btn")
          .addEventListener("click", () => {
            if (APP.detailItem) {
              UI.toggleFavorite(APP.detailItem);
            }
          });

        // Profile settings
        document.querySelectorAll(".theme-btn").forEach((btn) => {
          btn.addEventListener("click", () => UI.setTheme(btn.dataset.theme));
        });

        document.querySelectorAll(".accent-color").forEach((btn) => {
          btn.addEventListener("click", () =>
            UI.setAccentColor(btn.dataset.color),
          );
        });

        document
          .getElementById("quality-select")
          .addEventListener("change", (e) => {
            APP.quality = e.target.value;
            Storage.save("quality", APP.quality);
            UI.showToast("Quality preference saved");
          });

        document.getElementById("logout-btn").addEventListener("click", () => {
          Storage.remove("auth");
          APP.servers.forEach((s) => {
            s.token = null;
            s.userId = null;
          });
          document.getElementById("main-app").classList.add("hidden");
          document.getElementById("login-screen").classList.remove("hidden");
          UI.showToast("Logged out");
        });

        // Toast close
        document.getElementById("toast-close").addEventListener("click", () => {
          document.getElementById("toast").classList.add("hidden");
        });

        // Initialize reader
        Reader.init();
        Reader.setupTouchGestures();

        // Reader event listeners
        document
          .getElementById("reader-close")
          .addEventListener("click", () => Reader.close());
        document
          .getElementById("reader-prev")
          .addEventListener("click", () => Reader.prevPage());
        document
          .getElementById("reader-next")
          .addEventListener("click", () => Reader.nextPage());
        document
          .getElementById("reader-zoom-in")
          .addEventListener("click", () => Reader.zoomIn());
        document
          .getElementById("reader-zoom-out")
          .addEventListener("click", () => Reader.zoomOut());
        document
          .getElementById("reader-fit")
          .addEventListener("click", () => Reader.fitWidth());
        document
          .getElementById("reader-dark-mode")
          .addEventListener("click", () => Reader.toggleDarkMode());
        document
          .getElementById("reader-bookmark")
          .addEventListener("click", () => Reader.toggleBookmark());

        document
          .getElementById("reader-slider")
          .addEventListener("input", (e) => {
            Reader.goToPage(parseInt(e.target.value));
          });

        document
          .getElementById("reader-settings-btn")
          .addEventListener("click", () => {
            document
              .getElementById("reader-settings-panel")
              .classList.toggle("hidden");
          });

        document
          .getElementById("reader-goto-btn")
          .addEventListener("click", () => {
            const page = parseInt(
              document.getElementById("reader-goto-input").value,
            );
            Reader.goToPage(page);
            document
              .getElementById("reader-settings-panel")
              .classList.add("hidden");
          });

        document.querySelectorAll(".reader-mode-btn").forEach((btn) => {
          btn.addEventListener("click", () =>
            Reader.setDisplayMode(btn.dataset.mode),
          );
        });

        document
          .getElementById("reader-download-doc")
          .addEventListener("click", () => {
            if (Reader.currentItem) UI.startDownload(Reader.currentItem);
          });

        // Keyboard navigation for reader
        document.addEventListener("keydown", (e) => {
          if (
            document.getElementById("reader-modal").classList.contains("hidden")
          )
            return;
          if (e.key === "ArrowLeft") Reader.prevPage();
          if (e.key === "ArrowRight") Reader.nextPage();
          if (e.key === "Escape") Reader.close();
          if (e.key === "+" || e.key === "=") Reader.zoomIn();
          if (e.key === "-") Reader.zoomOut();
        });
      });

      async function initializeApp() {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-app").classList.remove("hidden");

        document.getElementById("profile-username").textContent = APP.username;

        // Update server status
        document.getElementById("server1-status").textContent = APP.servers[0]
          .token
          ? "Connected"
          : "Disconnected";
        document.getElementById("server1-status").className = APP.servers[0]
          .token
          ? "text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400"
          : "text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400";

        document.getElementById("server2-status").textContent = APP.servers[1]
          .token
          ? "Connected"
          : "Disconnected";
        document.getElementById("server2-status").className = APP.servers[1]
          .token
          ? "text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400"
          : "text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400";

        // Load libraries
        await loadLibraries();

        // Update UI
        UI.updateWatchHistory();
        UI.updateFavorites();
        UI.updateDownloadsList();
        UI.updateDownloadsBadge();
      }

      async function loadLibraries() {
        APP.library.all = [];
        await Promise.all([loadServerLibrary(0), loadServerLibrary(1)]);
        UI.renderHome();
      }

async function loadServerLibrary(serverIndex) {
    await API.fetchLibraryPaginated(serverIndex, (items) => {
        APP.library.all.push(...items);
        if (APP.currentTab === "home") {
            UI.scheduleRenderHome();
        }
    });
}
    
