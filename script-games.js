// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// PWA Install Prompt
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

document.addEventListener("DOMContentLoaded", () => {

  // DRAWER LOGIC
  const drawerBtn = document.getElementById('btn-hamburger');
  const drawer = document.getElementById('side-drawer');
  const drawerCloseBtn = document.getElementById('btn-close-drawer');
  const drawerOverlay = document.querySelector('.side-drawer-overlay');

  if (drawer && drawerBtn && drawerCloseBtn && drawerOverlay) {
    const openDrawer = () => drawer.classList.add('is-open');
    const closeDrawer = () => drawer.classList.remove('is-open');
    drawerBtn.addEventListener('click', openDrawer);
    drawerCloseBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    
    // Connect drawer favorite button
    const drawerFavBtn = document.querySelector('.drawer-btn-favorites');
    if (drawerFavBtn) {
      drawerFavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        const favsBtn = document.getElementById('nav-btn-favorites') || document.getElementById('bottom-nav-btn-favorites');
        if(favsBtn && !favsBtn.classList.contains('is-active')) {
          favsBtn.click();
        } else if (favsBtn) {
          // Already in favorites, scroll to it
          const gamesSection = document.querySelector(".games-section");
          gamesSection?.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }

  // RECENTLY PLAYED LOGIC
  const RECENT_KEY = "goarxyz_recent_v1";
  const getRecent = () => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
  };
  const saveRecent = (game) => {
    const recent = getRecent();
    const filtered = recent.filter(g => g.slug !== game.slug);
    filtered.unshift(game);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 10))); } catch (e) {}
  };
  
  const renderRecent = () => {
    const list = document.getElementById('drawer-recent-list');
    if (!list) return;
    const recent = getRecent();
    if (recent.length === 0) {
      list.innerHTML = '<span style="color:var(--text-dim);font-size:0.85rem;">No games played yet.</span>';
      return;
    }
    list.innerHTML = recent.map(g => `
      <a href="/game/${g.slug}/" class="recent-game-item">
        <img src="${g.img}" alt="${g.title}">
        <span>${g.title}</span>
      </a>
    `).join('');
  };
  renderRecent();

  // Track game clicks for Recently Played
  const allGameCards = document.querySelectorAll('.game-card[data-slug]');
  allGameCards.forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.dataset.slug;
      const title = card.querySelector('h3')?.textContent || 'Game';
      const img = card.querySelector('img')?.src || '';
      saveRecent({ slug, title, img });
    });
  });

  // BRANDED GAME OVERLAY LOGIC
  const gameOverlay = document.getElementById('game-brand-overlay');
  const btnPlayGame = document.getElementById('btn-play-game');
  const gameIframe = document.getElementById('game-iframe');
  
  if (gameOverlay && btnPlayGame && gameIframe) {
    btnPlayGame.addEventListener('click', () => {
      gameOverlay.classList.add('is-hidden');
      const dataSrc = gameIframe.getAttribute('data-src');
      if (dataSrc && !gameIframe.hasAttribute("src")) {
        gameIframe.setAttribute("src", dataSrc);
      }
    });
  }

  const trackEvent = (eventName, params = {}) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }
  };

  const form = document.querySelector(".search-form");
  const input = document.getElementById("search-input") || form?.querySelector('input[name="q"]');
  const clearBtn = document.getElementById("search-clear");
  const randomBtn = document.getElementById("btn-random-game");
  const pwaBtn = document.getElementById("btn-pwa-install");
  
  const favHeaderBtn = document.getElementById("nav-btn-favorites");
  const bottomFavBtn = document.getElementById("bottom-nav-btn-favorites");
  const favCountBadge = document.getElementById("fav-count");
  const heroFavBtn = document.getElementById("hero-fav-btn");
  
  const cards = Array.from(document.querySelectorAll(".game-card[data-search]"));
  const categorySections = Array.from(document.querySelectorAll(".category-showcase[data-category-section]"));
  const gamesSection = document.querySelector(".games-section");
  const emptyState = document.getElementById("empty-state");

  // LocalStorage Helpers
  const FAV_KEY = "goarxyz_favorites_v1";
  const OLD_FAV_KEY = "playgama_favorites_v1";
  const getFavorites = () => {
    try {
      let raw = localStorage.getItem(FAV_KEY);
      if (!raw) {
        raw = localStorage.getItem(OLD_FAV_KEY);
        if (raw) localStorage.setItem(FAV_KEY, raw);
      }
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };
  const saveFavorites = (favs) => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
    updateFavBadges();
  };

  const updateFavBadges = () => {
    const favs = getFavorites();
    if (favCountBadge) favCountBadge.textContent = favs.length;
  };
  updateFavBadges();

  // Stagger Animations for Game Cards
  const observer = new IntersectionObserver((entries) => {
    let delay = 0;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = `${delay}ms`;
        delay += 30; // 30ms stagger
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px 50px 0px', threshold: 0.1 });

  cards.forEach(card => {
    observer.observe(card);
  });

  // PWA Button
  if (pwaBtn) {
    pwaBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          trackEvent("pwa_installed");
        }
        deferredPrompt = null;
      } else {
        trackEvent("pwa_install_click");
        alert("To install, use your browser's 'Add to Home Screen' option.");
      }
    });
  }

  // Favorites logic
  const handleFavToggle = (btn) => {
    const isCurrentlyFav = btn.classList.contains("is-active");
    if (isCurrentlyFav) {
      favHeaderBtn?.classList.remove("is-active");
      bottomFavBtn?.classList.remove("is-active");
      window.applyFilter("", "all");
    } else {
      favHeaderBtn?.classList.add("is-active");
      bottomFavBtn?.classList.add("is-active");
      window.applyFilter("", "favorites");
      gamesSection?.scrollIntoView({ behavior: "smooth" });
    }
  };
  favHeaderBtn?.addEventListener("click", (e) => { e.preventDefault(); handleFavToggle(favHeaderBtn); });
  bottomFavBtn?.addEventListener("click", (e) => { e.preventDefault(); handleFavToggle(bottomFavBtn); });

  const navItems = Array.from(document.querySelectorAll(".nav-item, .bottom-nav-item"));
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      const cat = item.dataset.nav;
      if (cat === "favorites") return;
      if (cat === "home") {
        if(window.location.pathname === "/") {
          e.preventDefault();
          navItems.forEach(p => p.classList.remove("is-active"));
          navItems.filter(p => p.dataset.nav === "home").forEach(p => p.classList.add("is-active"));
          favHeaderBtn?.classList.remove("is-active");
          bottomFavBtn?.classList.remove("is-active");
          if (input) input.value = "";
          window.applyFilter("", "all");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    });
  });

  // Game Cards Heart toggle
  cards.forEach((card) => {
    const link = card.querySelector(".game-card__link");
    const title = card.querySelector("h3")?.textContent || "Game";
    const slug = card.dataset.slug;
    if (!slug) return;

    link?.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = card.dataset.search ? card.dataset.search.split(" ")[1] : "Instant Play";
      if (typeof window.openGameTheaterModal === "function") {
        window.openGameTheaterModal(slug, title, cat);
      } else {
        window.location.href = `/game/${slug}/`;
      }
      trackEvent("select_content", { content_type: "game", item_id: slug });
    });

    // Add heart icon to cards dynamically
    const favIcon = document.createElement("button");
    favIcon.className = "game-card__fav-btn";
    favIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
    favIcon.setAttribute("aria-label", "Favorite");
    favIcon.title = "Save to Favorites";
    
    // Position it at top right
    const imgWrap = card.querySelector('.game-card__img-wrap');
    if (imgWrap) imgWrap.appendChild(favIcon);

    const checkFav = () => {
      const isFav = getFavorites().includes(slug);
      favIcon.classList.toggle("is-active", isFav);
      favIcon.style.opacity = isFav ? "1" : "";
    };
    checkFav();

    favIcon.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const favs = getFavorites();
      const idx = favs.indexOf(slug);
      if (idx > -1) {
        favs.splice(idx, 1);
        trackEvent("remove_from_favorites", { item_id: slug });
      } else {
        favs.push(slug);
        trackEvent("add_to_favorites", { item_id: slug });
      }
      saveFavorites(favs);
      checkFav();
    });
  });

  window.applyFilter = (query = "", filterMode = "all") => {
    const normalizedQuery = query.trim().toLowerCase();
    const favs = getFavorites();
    let visibleCount = 0;
    
    if (clearBtn) clearBtn.classList.toggle("is-active", Boolean(normalizedQuery));

    cards.forEach((card) => {
      let matches = true;
      if (normalizedQuery) {
        matches = (card.dataset.search || "").includes(normalizedQuery);
      } else if (filterMode === "favorites") {
        matches = favs.includes(card.dataset.slug || "");
      }
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (visibleCount === 0 && emptyState) {
      emptyState.hidden = false;
      if (filterMode === "favorites") {
        emptyState.innerHTML = `<h3>No favorite games saved yet</h3><p>Click the heart icon on any game card to add it to your personal favorites!</p>`;
      } else {
        emptyState.innerHTML = `<h3>No games match "${normalizedQuery}"</h3><p>Try searching for a different game name, keyword, or explore our categories.</p>`;
      }
    } else if (emptyState) {
      emptyState.hidden = true;
    }
  };

  // Live Search
  let searchTimeout = null;
  input?.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = input.value;
      window.applyFilter(q, q ? "search" : "all");
    }, 120);
  });
  
  clearBtn?.addEventListener("click", () => {
    if (input) { input.value = ""; input.focus(); }
    window.applyFilter("", "all");
    window.history.replaceState({}, "", "/");
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const normalizedQuery = input?.value.trim() || "";
    if (normalizedQuery) {
      gamesSection?.scrollIntoView({ behavior: "smooth" });
    }
    window.applyFilter(normalizedQuery, normalizedQuery ? "search" : "all");
  });

  // Random Game
  randomBtn?.addEventListener("click", () => {
    const allCards = Array.from(document.querySelectorAll(".game-card[data-search]"));
    if (allCards.length === 0) return;
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    const link = randomCard.querySelector("a")?.getAttribute("href");
    if (link) window.location.href = link;
  });

  // Search Suggestions (simplified logic)
  const suggestionsBox = document.getElementById("search-suggestions");
  let selectedSuggestionIndex = -1;
  if (input && suggestionsBox && cards.length > 0) {
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.remove("is-active");
      }
    });

    input.addEventListener("focus", () => {
      if (input.value.trim().length > 0 && suggestionsBox.children.length > 0) {
        suggestionsBox.classList.add("is-active");
      }
    });

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        suggestionsBox.classList.remove("is-active");
        suggestionsBox.innerHTML = "";
        return;
      }
      const tokens = q.split(/\s+/).filter(Boolean);
      const matches = cards.filter(card => {
        const text = card.dataset.search?.toLowerCase() || "";
        return tokens.every(t => text.includes(t));
      }).slice(0, 6);

      if (matches.length > 0) {
        suggestionsBox.innerHTML = matches.map((card, i) => {
          const imgUrl = card.querySelector("img")?.src || "";
          const title = card.querySelector("h3")?.textContent || "";
          const slug = card.dataset.slug;
          return `<li class="search-suggestion-item" data-index="${i}" data-slug="${slug}">
              <img src="${imgUrl}" class="search-suggestion-img" alt="">
              <div class="search-suggestion-info">
                <span class="search-suggestion-title">${title}</span>
              </div>
            </li>`;
        }).join("");
        suggestionsBox.classList.add("is-active");
        selectedSuggestionIndex = -1;
      } else {
        suggestionsBox.classList.remove("is-active");
        suggestionsBox.innerHTML = "";
      }
    });

    suggestionsBox.addEventListener("click", (e) => {
      const item = e.target.closest(".search-suggestion-item");
      if (item) window.location.href = "/game/" + item.dataset.slug + "/";
    });
  }

  // Scroll to Top
  const scrollTopBtn = document.getElementById("scroll-to-top");
  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 500) scrollTopBtn.classList.add("is-visible");
      else scrollTopBtn.classList.remove("is-visible");
    });
    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // URL Params initialization
  const params = new URLSearchParams(window.location.search);
  const existingQuery = params.get("q");
  if (existingQuery && input) {
    input.value = existingQuery;
    window.applyFilter(existingQuery, "search");
  }
});




  async function loadTopAnime() {
    if (window.NYAnime && typeof window.NYAnime.loadCatalog === 'function') {
      window.NYAnime.loadCatalog('top', null, 'Top Airing Series');
    }
  }

  async function searchAnime(query) {
    if (window.NYAnime && typeof window.NYAnime.loadCatalog === 'function') {
      window.NYAnime.loadCatalog('search', query, `Results for "${query}"`);
    }
  }

  async function fetchAnime(url) {
    if (window.NYAnime && typeof window.NYAnime.fetchDirect === 'function') {
      window.NYAnime.fetchDirect(url);
    }
  }

  window.loadTopAnime = loadTopAnime;
  window.searchAnime = searchAnime;
  window.fetchAnime = fetchAnime;
  window.openAnimeModal = function(item) {
    if (window.NYAnime && typeof window.NYAnime.openDetailsModal === 'function') {
      window.NYAnime.openDetailsModal(item);
    }
  };

// ==========================================================================
  // SimpMusic Web Engine (Ported & Enhanced for goarxyz)
  // ==========================================================================
  window.SimpMusic = {
    player: null,
    isPlaying: false,
    currentTrack: null,
    queue: [],
    currentIndex: -1,
    repeatMode: 'off', // 'off' | 'all' | 'one'
    isShuffle: false,
    autoplaySimilar: true, // Spotify-style Autoplay: similar tracks lined up next
    similarTracks: [],
    playingFromContext: 'Similar Tracks (Autoplay)',
    progressInterval: null,
    lyrics: null,
    autoScrollLyrics: true,
    likedTracks: [],
    recentHistory: [],

    init() {
      this.loadStorage();
      this.initYouTube();
      this.bindUI();
      this.updateLibraryUI();
    },

    loadStorage() {
      try {
        this.likedTracks = JSON.parse(localStorage.getItem('goarxyz_liked_music') || '[]');
        this.recentHistory = JSON.parse(localStorage.getItem('goarxyz_recent_music') || '[]');
      } catch (e) {
        this.likedTracks = [];
        this.recentHistory = [];
      }
    },

    saveStorage() {
      try {
        localStorage.setItem('goarxyz_liked_music', JSON.stringify(this.likedTracks));
        localStorage.setItem('goarxyz_recent_music', JSON.stringify(this.recentHistory.slice(0, 50)));
      } catch (e) {}
    },

    isLiked(videoId) {
      return this.likedTracks.some(t => (t.id || t.videoId) === videoId);
    },

    toggleLike(track) {
      if (!track) return;
      const id = track.id || track.videoId;
      const idx = this.likedTracks.findIndex(t => (t.id || t.videoId) === id);
      if (idx >= 0) {
        this.likedTracks.splice(idx, 1);
      } else {
        this.likedTracks.unshift({
          id: id,
          videoId: id,
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail
        });
      }
      this.saveStorage();
      this.updateLikeButtons();
      this.updateLibraryUI();
    },

    updateLikeButtons() {
      if (!this.currentTrack) return;
      const id = this.currentTrack.id || this.currentTrack.videoId;
      const liked = this.isLiked(id);
      const modalFav = document.getElementById('simpmusic-modal-fav');
      if (modalFav) {
        modalFav.classList.toggle('is-fav', liked);
        const svg = modalFav.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', liked ? 'currentColor' : 'none');
        }
      }
    },

    initYouTube() {
      const initEngine = () => {
        if (window.YT && window.YT.Player) {
          this.player = new YT.Player('yt-player-container', {
            height: '120',
            width: '200',
            playerVars: {
              'autoplay': 1,
              'controls': 0,
              'playsinline': 1,
              'disablekb': 1,
              'fs': 0,
              'rel': 0,
              'modestbranding': 1,
              'iv_load_policy': 3,
              'origin': window.location.origin
            },
            events: {
              'onReady': () => {
                window.ytPlayer = this.player;
              },
              'onStateChange': (e) => this.onStateChange(e),
              'onError': (e) => this.onError(e)
            }
          });
          window.ytPlayer = this.player;
        }
      };

      if (!window.YT || !window.YT.Player) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = () => {
          initEngine();
        };
      } else {
        initEngine();
      }
    },

    onStateChange(event) {
      if (event.data === YT.PlayerState.PLAYING) {
        this.isPlaying = true;
        this.setPlayingUI(true);
        if (this.player && this.player.getDuration) {
          const dur = this.player.getDuration() || 0;
          this.updateDurationDisplay(dur);
        }
        clearInterval(this.progressInterval);
        this.progressInterval = setInterval(() => this.updateProgress(), 400);
      } else if (event.data === YT.PlayerState.PAUSED) {
        this.isPlaying = false;
        this.setPlayingUI(false);
        clearInterval(this.progressInterval);
      } else if (event.data === YT.PlayerState.ENDED) {
        this.isPlaying = false;
        this.setPlayingUI(false);
        clearInterval(this.progressInterval);
        this.onTrackEnded();
      }
    },

    onError(e) {
      console.warn("SimpMusic playback notice:", e.data);
      if (e.data === 101 || e.data === 150 || e.data === 2) {
        setTimeout(() => this.playNext(), 1200);
      }
    },

    onTrackEnded() {
      if (this.repeatMode === 'one') {
        if (this.player && this.player.seekTo) {
          this.player.seekTo(0);
          this.player.playVideo();
        }
      } else {
        this.playNext();
      }
    },

    playTrack(track, queueList = null, index = -1, contextName = null) {
      if (!track) return;
      const videoId = track.id || track.videoId;
      if (!videoId) return;

      if (contextName) {
        this.playingFromContext = contextName;
      } else if (track.isSimilarTrack) {
        this.playingFromContext = 'Similar Tracks (Autoplay)';
      }

      this.currentTrack = {
        id: videoId,
        videoId: videoId,
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        thumbnail: track.thumbnail || '/logo.svg',
        isSimilarTrack: Boolean(track.isSimilarTrack)
      };

      if (queueList && Array.isArray(queueList)) {
        this.queue = queueList.map(item => ({
          id: item.id || item.videoId,
          videoId: item.id || item.videoId,
          title: item.title || item.name || 'Unknown Title',
          artist: item.artist || (item.author && item.author.name) || 'Unknown Artist',
          thumbnail: item.thumbnail || (item.thumbnails && item.thumbnails[0]?.url) || '/logo.svg',
          duration: item.duration || 0,
          isSimilarTrack: Boolean(item.isSimilarTrack)
        }));
        this.currentIndex = index >= 0 ? index : this.queue.findIndex(t => (t.id || t.videoId) === videoId);
      } else {
        const existingIdx = this.queue.findIndex(t => (t.id || t.videoId) === videoId);
        if (existingIdx >= 0) {
          this.currentIndex = existingIdx;
        } else {
          // If track was in similarTracks, remove it from similarTracks
          this.similarTracks = this.similarTracks.filter(t => (t.id || t.videoId) !== videoId);
          this.queue.unshift(this.currentTrack);
          this.currentIndex = 0;
        }
      }

      // Add to recent playback history
      const rIdx = this.recentHistory.findIndex(t => (t.id || t.videoId) === videoId);
      if (rIdx >= 0) this.recentHistory.splice(rIdx, 1);
      this.recentHistory.unshift(this.currentTrack);
      this.saveStorage();
      this.updateLibraryUI();

      // Update UI components
      this.updatePlayerUI(this.currentTrack);

      // Play through YT engine
      if (this.player && typeof this.player.loadVideoById === 'function') {
        this.player.loadVideoById(videoId);
      }

      this.updateCardHighlights(videoId);
      this.fetchLyrics(this.currentTrack);
      this.fetchUpNext(videoId);

      // Media Session Integration
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: this.currentTrack.title,
          artist: this.currentTrack.artist,
          album: 'SimpMusic',
          artwork: [{ src: this.currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
        });
        navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      }
    },

    togglePlay() {
      if (!this.player || typeof this.player.getPlayerState !== 'function') return;
      const state = this.player.getPlayerState();
      if (state === 1) {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
      }
    },

    playNext() {
      if (this.queue.length === 0 && this.similarTracks.length === 0) return;

      if (this.isShuffle) {
        const remaining = this.queue.slice(this.currentIndex + 1);
        const pool = [...remaining, ...this.similarTracks];
        if (pool.length > 0) {
          const rand = pool[Math.floor(Math.random() * pool.length)];
          this.playTrack(rand, null, -1, 'Shuffle Radio');
          return;
        }
      }

      let nextIndex = this.currentIndex + 1;
      if (nextIndex < this.queue.length) {
        this.currentIndex = nextIndex;
        this.playTrack(this.queue[nextIndex], this.queue, nextIndex);
        return;
      }

      // Autoplay: Seamlessly transition to the lined-up similar tracks
      if (this.autoplaySimilar && this.similarTracks.length > 0) {
        const nextSimilar = this.similarTracks.shift();
        this.queue.push(nextSimilar);
        this.currentIndex = this.queue.length - 1;
        this.playTrack(nextSimilar, this.queue, this.currentIndex, 'Similar Tracks (Autoplay)');
        return;
      }

      if (this.repeatMode === 'all' && this.queue.length > 0) {
        this.currentIndex = 0;
        this.playTrack(this.queue[0], this.queue, 0);
      }
    },

    playPrev() {
      if (!this.player) return;
      if (this.player.getCurrentTime && this.player.getCurrentTime() > 3) {
        this.player.seekTo(0, true);
        return;
      }
      if (this.queue.length === 0) return;
      let prevIndex = this.currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = this.queue.length - 1;
      }
      this.currentIndex = prevIndex;
      this.playTrack(this.queue[prevIndex], this.queue, prevIndex);
    },

    seek(pct) {
      if (!this.player || typeof this.player.getDuration !== 'function') return;
      const dur = this.player.getDuration() || 0;
      if (dur > 0) {
        const time = Math.max(0, Math.min(dur, pct * dur));
        this.player.seekTo(time, true);
      }
    },

    setVolume(val) {
      if (this.player && typeof this.player.setVolume === 'function') {
        this.player.setVolume(val);
      }
    },

    updateProgress() {
      if (!this.player || typeof this.player.getCurrentTime !== 'function') return;
      const cur = this.player.getCurrentTime() || 0;
      const dur = this.player.getDuration() || 0;
      const pct = dur > 0 ? (cur / dur) * 100 : 0;

      const miniFill = document.getElementById('player-progress-fill');
      if (miniFill) miniFill.style.width = pct + '%';

      const modalFill = document.getElementById('simpmusic-scrub-fill');
      const modalThumb = document.getElementById('simpmusic-scrub-thumb');
      if (modalFill) modalFill.style.width = pct + '%';
      if (modalThumb) modalThumb.style.left = pct + '%';

      const timeCurrent = document.getElementById('player-time-current');
      const modalTimeCurrent = document.getElementById('simpmusic-time-current');
      const formattedCur = this.formatTime(cur);
      if (timeCurrent) timeCurrent.textContent = formattedCur;
      if (modalTimeCurrent) modalTimeCurrent.textContent = formattedCur;

      if (this.lyrics && this.lyrics.synced && this.lyrics.lines.length > 0) {
        this.highlightActiveLyric(cur);
      }
    },

    updateDurationDisplay(dur) {
      const formatted = this.formatTime(dur);
      const timeTotal = document.getElementById('player-time-total');
      const modalTimeTotal = document.getElementById('simpmusic-time-total');
      if (timeTotal) timeTotal.textContent = formatted;
      if (modalTimeTotal) modalTimeTotal.textContent = formatted;
    },

    formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return '0:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    },

    setPlayingUI(playing) {
      document.querySelectorAll('#player-play-pause, #simpmusic-mini-play-pause, #simpmusic-btn-play-pause').forEach(btn => {
        const playIcon = btn.querySelector('.icon-play');
        const pauseIcon = btn.querySelector('.icon-pause');
        if (playIcon) playIcon.style.display = playing ? 'none' : 'block';
        if (pauseIcon) pauseIcon.style.display = playing ? 'block' : 'none';
      });

      const miniEq = document.getElementById('simpmusic-mini-eq');
      if (miniEq) miniEq.style.display = playing ? 'flex' : 'none';

      const headerEq = document.getElementById('simpmusic-header-live-eq');
      if (headerEq) headerEq.style.display = playing ? 'flex' : 'none';

      document.querySelectorAll('.media-selection-card').forEach(c => {
        const eqBadge = c.querySelector('.simpmusic-card-eq-badge');
        if (c.classList.contains('is-current-track')) {
          if (eqBadge) eqBadge.style.display = playing ? 'flex' : 'none';
        }
      });
    },

    updatePlayerUI(track) {
      const miniPlayer = document.getElementById('simpmusic-mini-player');
      if (miniPlayer) miniPlayer.style.display = 'flex';
      document.body.classList.add('has-music-playing');

      const miniArt = document.getElementById('player-art');
      const miniTitle = document.getElementById('player-title');
      const miniArtist = document.getElementById('player-artist');
      if (miniArt) miniArt.src = track.thumbnail;
      if (miniTitle) miniTitle.textContent = track.title;
      if (miniArtist) miniArtist.textContent = track.artist;

      const modalArt = document.getElementById('simpmusic-modal-art');
      const modalTitle = document.getElementById('simpmusic-modal-title');
      const modalArtist = document.getElementById('simpmusic-modal-artist');
      if (modalArt) modalArt.src = track.thumbnail;
      if (modalTitle) modalTitle.textContent = track.title;
      if (modalArtist) modalArtist.textContent = track.artist;

      // Spotify Context Header update
      const contextHeader = document.getElementById('simpmusic-context-header');
      if (contextHeader) {
        contextHeader.textContent = `PLAYING FROM ${this.playingFromContext.toUpperCase()}`;
      }

      this.updateLikeButtons();
      this.updateNextPreviewUI();
      this.renderQueueUI();
    },

    updateNextPreviewUI() {
      const nextTitleEl = document.getElementById('simpmusic-next-preview-title');
      const nextArtistEl = document.getElementById('simpmusic-next-preview-artist');
      if (!nextTitleEl || !nextArtistEl) return;

      const nextTrack = this.getNextUpcomingTrack();
      if (nextTrack) {
        nextTitleEl.textContent = nextTrack.title;
        nextArtistEl.textContent = `${nextTrack.artist}${nextTrack.isSimilarTrack ? ' • Similar Track' : ''}`;
      } else if (this.autoplaySimilar) {
        nextTitleEl.textContent = 'Finding similar songs...';
        nextArtistEl.textContent = 'YouTube Music Autoplay';
      } else {
        nextTitleEl.textContent = 'End of queue';
        nextArtistEl.textContent = 'Autoplay is turned off';
      }
    },

    getNextUpcomingTrack() {
      if (this.currentIndex + 1 < this.queue.length) {
        return this.queue[this.currentIndex + 1];
      }
      if (this.similarTracks && this.similarTracks.length > 0) {
        return this.similarTracks[0];
      }
      return null;
    },

    updateCardHighlights(activeVideoId) {
      document.querySelectorAll('.media-selection-card').forEach(card => {
        const vid = card.getAttribute('data-video-id');
        const isCurrent = vid === activeVideoId;
        card.classList.toggle('is-current-track', isCurrent);

        let badge = card.querySelector('.simpmusic-card-eq-badge');
        if (isCurrent) {
          if (!badge) {
            badge = document.createElement('div');
            badge.className = 'simpmusic-card-eq-badge';
            badge.innerHTML = `<div class="simpmusic-eq"><span></span><span></span><span></span></div><span>Playing</span>`;
            card.querySelector('.media-card__img-wrap')?.appendChild(badge);
          }
          badge.style.display = 'flex';
        } else if (badge) {
          badge.remove();
        }
      });
    },

    async fetchLyrics(track) {
      const container = document.getElementById('simpmusic-lyrics-container');
      const statusEl = document.getElementById('simpmusic-lyrics-status');
      if (container) container.innerHTML = '<div class="simpmusic-lyrics-placeholder">Searching lyrics on YouTube Music &amp; LRCLIB...</div>';

      this.lyrics = null;
      try {
        const res = await fetch(`/api/music/lyrics?videoId=${track.id}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
        if (!res.ok) throw new Error('Lyrics request failed');
        const data = await res.json();
        this.lyrics = data;

        if (!container) return;
        container.innerHTML = '';

        if (data.lines && data.lines.length > 0) {
          if (statusEl) {
            statusEl.innerHTML = data.synced
              ? '<span class="lyrics-dot"></span> Synchronized Live Lyrics'
              : '<span class="lyrics-dot" style="background:#888;"></span> Plain Lyrics';
          }
          data.lines.forEach((line, idx) => {
            const p = document.createElement('div');
            p.className = 'simpmusic-lyric-line';
            p.id = `lyric-line-${idx}`;
            p.textContent = line.text;
            if (data.synced && line.time !== undefined) {
              p.setAttribute('data-time', line.time);
              p.addEventListener('click', () => {
                if (this.player && this.player.seekTo) {
                  this.player.seekTo(line.time, true);
                }
              });
            }
            container.appendChild(p);
          });
        } else {
          if (statusEl) statusEl.textContent = 'Lyrics Unavailable';
          container.innerHTML = '<div class="simpmusic-lyrics-placeholder">No synchronized lyrics found for this track.</div>';
        }
      } catch (e) {
        console.warn("Lyrics fetch notice:", e);
        if (container) container.innerHTML = '<div class="simpmusic-lyrics-placeholder">Lyrics temporarily unavailable.</div>';
      }
    },

    highlightActiveLyric(currentTime) {
      if (!this.lyrics || !this.lyrics.synced || !this.lyrics.lines) return;
      const lines = this.lyrics.lines;
      let activeIdx = -1;

      for (let i = 0; i < lines.length; i++) {
        if (currentTime >= lines[i].time) {
          activeIdx = i;
        } else {
          break;
        }
      }

      if (activeIdx >= 0) {
        document.querySelectorAll('.simpmusic-lyric-line').forEach((el, idx) => {
          el.classList.toggle('is-active', idx === activeIdx);
        });

        if (this.autoScrollLyrics) {
          const activeEl = document.getElementById(`lyric-line-${activeIdx}`);
          const container = document.getElementById('simpmusic-lyrics-container');
          if (activeEl && container) {
            const containerHeight = container.clientHeight;
            const elOffset = activeEl.offsetTop - container.offsetTop;
            container.scrollTo({
              top: elOffset - containerHeight / 2 + 20,
              behavior: 'smooth'
            });
          }
        }
      }
    },

    async fetchUpNext(videoId) {
      try {
        const res = await fetch(`/api/music/upnext?videoId=${videoId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const currentId = this.currentTrack ? (this.currentTrack.id || this.currentTrack.videoId) : null;
          
          const freshSimilar = data
            .map(item => ({
              id: item.id || item.videoId,
              videoId: item.id || item.videoId,
              title: item.title,
              artist: item.artist,
              thumbnail: item.thumbnail || '/logo.svg',
              duration: item.duration || 0,
              isSimilarTrack: true
            }))
            .filter(t => t.videoId !== currentId);

          this.similarTracks = freshSimilar;

          // If autoplay is enabled, line up similar tracks in the queue immediately
          if (this.autoplaySimilar) {
            // Check how many upcoming tracks are already queued
            const upcomingTracks = this.queue.slice(this.currentIndex + 1);
            const nonSimilarUpcoming = upcomingTracks.filter(t => !t.isSimilarTrack);

            // Clean out old auto-appended similar tracks so we have the freshest recommendations for current track
            this.queue = [...this.queue.slice(0, this.currentIndex + 1), ...nonSimilarUpcoming];

            // Append fresh similar tracks lined up to go next
            freshSimilar.forEach(st => {
              if (!this.queue.some(q => (q.id || q.videoId) === st.videoId)) {
                this.queue.push(st);
              }
            });
          }

          this.updateNextPreviewUI();
          this.renderQueueUI();
        }
      } catch (e) {
        console.warn('Notice: Error fetching similar tracks', e);
      }
    },

    formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '0:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    },

    renderQueueUI() {
      const queueList = document.getElementById('simpmusic-queue-list');
      const queueCount = document.getElementById('simpmusic-queue-count');
      if (!queueList) return;

      const currentTrack = this.queue[this.currentIndex] || this.currentTrack;
      const upcomingTracks = this.queue.slice(this.currentIndex + 1);
      const nextInQueue = upcomingTracks.filter(t => !t.isSimilarTrack);
      const similarUpcoming = upcomingTracks.filter(t => t.isSimilarTrack);

      const totalLinedUp = nextInQueue.length + similarUpcoming.length;
      if (queueCount) {
        queueCount.textContent = `${totalLinedUp} songs lined up next`;
      }

      queueList.innerHTML = '';

      if (!currentTrack && totalLinedUp === 0) {
        queueList.innerHTML = '<div class="simpmusic-empty-state">Queue is empty. Play any song to start radio!</div>';
        return;
      }

      // Helper function to build a queue track element
      const buildQueueItem = (track, globalIndex, isCurrent = false, isSimilar = false) => {
        const item = document.createElement('div');
        item.className = `simpmusic-queue-item ${isCurrent ? 'is-current' : ''}`;
        const durationStr = track.duration ? this.formatTime(track.duration) : '';

        item.innerHTML = `
          <img class="simpmusic-queue-item-art" src="${track.thumbnail || '/logo.svg'}" alt="Art">
          <div class="simpmusic-queue-item-meta">
            <div class="simpmusic-queue-item-title">
              ${track.title}
              ${isSimilar ? '<span class="simpmusic-similar-tag">Similar</span>' : ''}
            </div>
            <div class="simpmusic-queue-item-artist">${track.artist}</div>
          </div>
          ${durationStr ? `<span class="simpmusic-queue-item-duration">${durationStr}</span>` : ''}
          ${isCurrent ? '<div class="simpmusic-eq"><span></span><span></span><span></span></div>' : ''}
          ${!isCurrent ? `
            <button class="simpmusic-queue-item-remove" title="Remove track from queue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          ` : ''}
        `;

        item.addEventListener('click', (e) => {
          if (e.target.closest('.simpmusic-queue-item-remove')) {
            e.stopPropagation();
            this.queue.splice(globalIndex, 1);
            if (globalIndex < this.currentIndex) this.currentIndex--;
            this.renderQueueUI();
            this.updateNextPreviewUI();
            return;
          }
          if (!isCurrent) {
            this.currentIndex = globalIndex;
            this.playTrack(track, this.queue, globalIndex, isSimilar ? 'Similar Tracks (Autoplay)' : null);
          }
        });

        return item;
      };

      // 1. SECTION: NOW PLAYING
      if (currentTrack) {
        const nowPlayingHeader = document.createElement('div');
        nowPlayingHeader.className = 'simpmusic-queue-section-header';
        nowPlayingHeader.innerHTML = `
          <span class="simpmusic-queue-section-title">Now Playing</span>
          <span class="simpmusic-queue-section-badge">Active</span>
        `;
        queueList.appendChild(nowPlayingHeader);
        queueList.appendChild(buildQueueItem(currentTrack, this.currentIndex, true, false));
      }

      // 2. SECTION: NEXT IN QUEUE (Manual or Playlist Tracks)
      if (nextInQueue.length > 0) {
        const queueHeader = document.createElement('div');
        queueHeader.className = 'simpmusic-queue-section-header';
        queueHeader.innerHTML = `
          <span class="simpmusic-queue-section-title">Next In Queue</span>
          <span class="simpmusic-queue-section-badge">${nextInQueue.length} ${nextInQueue.length === 1 ? 'song' : 'songs'}</span>
        `;
        queueList.appendChild(queueHeader);

        nextInQueue.forEach((track) => {
          const actualIndex = this.queue.indexOf(track);
          queueList.appendChild(buildQueueItem(track, actualIndex, false, false));
        });
      }

      // 3. SECTION: NEXT UP: SIMILAR TRACKS (AUTOPLAY)
      if (similarUpcoming.length > 0) {
        const similarHeader = document.createElement('div');
        similarHeader.className = 'simpmusic-queue-section-header';
        similarHeader.innerHTML = `
          <span class="simpmusic-queue-section-title">Similar Tracks Lined Up Next</span>
          <span class="simpmusic-queue-section-badge" style="background: rgba(29, 185, 84, 0.15); color: #1ed760; border-color: rgba(29, 185, 84, 0.3);">
            Autoplay Radio (${similarUpcoming.length})
          </span>
        `;
        queueList.appendChild(similarHeader);

        similarUpcoming.forEach((track) => {
          const actualIndex = this.queue.indexOf(track);
          queueList.appendChild(buildQueueItem(track, actualIndex, false, true));
        });
      } else if (this.autoplaySimilar) {
        const loadingNotice = document.createElement('div');
        loadingNotice.className = 'simpmusic-queue-section-header';
        loadingNotice.style.justifyContent = 'center';
        loadingNotice.style.padding = '14px';
        loadingNotice.innerHTML = `
          <span style="font-size: 0.75rem; color: var(--text-dim);">Lining up similar tracks from YouTube Music...</span>
        `;
        queueList.appendChild(loadingNotice);
      }
    },

    updateLibraryUI() {
      const countEl = document.getElementById('simpmusic-library-count');
      if (countEl) countEl.textContent = `${this.likedTracks.length} Liked Songs`;

      const likedGrid = document.getElementById('simpmusic-liked-grid');
      if (likedGrid) {
        likedGrid.innerHTML = '';
        if (this.likedTracks.length === 0) {
          likedGrid.innerHTML = '<div class="simpmusic-empty-state">No liked tracks yet. Tap the heart on any song to save it here!</div>';
        } else {
          this.likedTracks.forEach(item => {
            likedGrid.appendChild(this.createSongCard(item, this.likedTracks));
          });
        }
      }

      const recentGrid = document.getElementById('simpmusic-recent-grid');
      if (recentGrid) {
        recentGrid.innerHTML = '';
        if (this.recentHistory.length === 0) {
          recentGrid.innerHTML = '<div class="simpmusic-empty-state">Your playback history will appear here.</div>';
        } else {
          this.recentHistory.slice(0, 18).forEach(item => {
            recentGrid.appendChild(this.createSongCard(item, this.recentHistory));
          });
        }
      }
    },

    createSongCard(item, contextQueue = null) {
      const videoId = item.id || item.videoId;
      let thumb = item.thumbnail || '';
      if (item.thumbnails && item.thumbnails.length > 0) {
        thumb = item.thumbnails[item.thumbnails.length - 1].url;
      }
      if (!thumb) thumb = '/logo.svg';

      const card = document.createElement('div');
      card.className = 'spotify-card media-selection-card';
      card.setAttribute('data-video-id', videoId);

      const isCurrent = this.currentTrack && (this.currentTrack.id === videoId || this.currentTrack.videoId === videoId);
      if (isCurrent) card.classList.add('is-current-track');

      const isFav = this.isLiked(videoId);

      card.innerHTML = `
        <div class="spotify-card-cover media-card__img-wrap">
          <img src="${thumb}" alt="${item.title || item.name}" loading="lazy">
          ${isCurrent && this.isPlaying ? '<div class="simpmusic-card-eq-badge"><div class="simpmusic-eq"><span></span><span></span><span></span></div><span>Playing</span></div>' : ''}
          <button class="spotify-play-btn media-card__play-btn" aria-label="Play ${item.title || item.name}">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
          <div class="simpmusic-card-actions">
            <button class="simpmusic-card-btn ${isFav ? 'is-fav' : ''}" title="Like song" data-action="like">
              <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
            <button class="simpmusic-card-btn" title="Add to queue" data-action="queue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>
        <div class="media-card__info">
          <h4>${item.title || item.name}</h4>
          <p>${item.artist || (item.author && item.author.name) || 'Artist'}</p>
        </div>
      `;

      card.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
          e.stopPropagation();
          const action = actionBtn.getAttribute('data-action');
          if (action === 'like') {
            this.toggleLike(item);
            const nowFav = this.isLiked(videoId);
            actionBtn.classList.toggle('is-fav', nowFav);
            const svg = actionBtn.querySelector('svg');
            if (svg) svg.setAttribute('fill', nowFav ? 'currentColor' : 'none');
          } else if (action === 'queue') {
            this.queue.push({
              id: videoId,
              videoId: videoId,
              title: item.title || item.name,
              artist: item.artist || (item.author && item.author.name) || 'Artist',
              thumbnail: thumb
            });
            this.renderQueueUI();
          }
          return;
        }

        // Spotify behavior: if song is already playing, clicking its card opens the full Now Playing view!
        if (isCurrent && this.isPlaying) {
          const modal = document.getElementById('simpmusic-modal');
          if (modal) modal.style.display = 'flex';
          return;
        }

        this.playTrack({
          id: videoId,
          videoId: videoId,
          title: item.title || item.name,
          artist: item.artist || (item.author && item.author.name) || 'Artist',
          thumbnail: thumb
        }, contextQueue);
      });

      return card;
    },

    bindUI() {
      const expandTrigger = document.getElementById('simpmusic-mini-expand-trigger');
      const expandBtn = document.getElementById('player-btn-expand');
      const miniPlayer = document.getElementById('simpmusic-mini-player');
      const modal = document.getElementById('simpmusic-modal');
      const modalBackdrop = document.getElementById('simpmusic-modal-backdrop');
      const minimizeBtn = document.getElementById('simpmusic-btn-minimize');

      const openModal = () => {
        if (modal) modal.style.display = 'flex';
      };
      const closeModal = () => {
        if (modal) modal.style.display = 'none';
      };

      if (expandTrigger) expandTrigger.addEventListener('click', openModal);
      if (expandBtn) expandBtn.addEventListener('click', openModal);
      if (minimizeBtn) minimizeBtn.addEventListener('click', closeModal);
      if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

      // Spotify behavior: Clicking anywhere on the mini player opens the full Now Playing view
      if (miniPlayer) {
        miniPlayer.addEventListener('click', (e) => {
          if (e.target.closest('.simpmusic-mini-btn') || 
              e.target.closest('#simpmusic-mini-progress-track') ||
              e.target.closest('#player-play-pause') ||
              e.target.closest('#player-btn-prev') ||
              e.target.closest('#player-btn-next') ||
              e.target.closest('#player-btn-expand')) {
            return;
          }
          openModal();
        });
      }

      // Escape key closes modal
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
          closeModal();
        }
      });

      // Modal navigation tabs
      document.querySelectorAll('.simpmusic-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.simpmusic-tab-btn').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          const tab = btn.getAttribute('data-tab');
          document.querySelectorAll('.simpmusic-tab-content').forEach(c => {
            c.style.display = 'none';
            c.classList.remove('is-active');
          });
          const target = document.getElementById(`simpmusic-tab-${tab}`);
          if (target) {
            target.style.display = 'flex';
            target.classList.add('is-active');
          }
        });
      });

      // Spotify "Next Up Similar Track" Preview Card in player tab clicks to Queue tab
      const nextPreview = document.getElementById('simpmusic-next-preview');
      const viewQueueBtn = document.getElementById('simpmusic-view-queue-btn');
      const goToQueueTab = () => {
        const queueTabBtn = document.getElementById('simpmusic-tab-queue-btn') || document.querySelector('.simpmusic-tab-btn[data-tab="queue"]');
        if (queueTabBtn) queueTabBtn.click();
      };
      if (nextPreview) nextPreview.addEventListener('click', goToQueueTab);
      if (viewQueueBtn) viewQueueBtn.addEventListener('click', (e) => { e.stopPropagation(); goToQueueTab(); });

      // Autoplay toggle button in Queue tab
      const autoplayToggle = document.getElementById('simpmusic-autoplay-toggle');
      if (autoplayToggle) {
        autoplayToggle.addEventListener('click', () => {
          this.autoplaySimilar = !this.autoplaySimilar;
          autoplayToggle.classList.toggle('is-active', this.autoplaySimilar);
          autoplayToggle.textContent = `Autoplay: ${this.autoplaySimilar ? 'ON' : 'OFF'}`;
          if (this.autoplaySimilar && this.currentTrack) {
            const vid = this.currentTrack.id || this.currentTrack.videoId;
            this.fetchUpNext(vid);
          } else {
            this.updateNextPreviewUI();
            this.renderQueueUI();
          }
        });
      }

      // Quick lyrics button in volume row
      const quickLyricsBtn = document.getElementById('simpmusic-quick-lyrics-btn');
      if (quickLyricsBtn) {
        quickLyricsBtn.addEventListener('click', () => {
          const lyricsTabBtn = document.querySelector('.simpmusic-tab-btn[data-tab="lyrics"]');
          if (lyricsTabBtn) lyricsTabBtn.click();
        });
      }

      // Play / Pause buttons
      const handlePlayPause = () => this.togglePlay();
      document.querySelectorAll('#player-play-pause, #simpmusic-mini-play-pause, #simpmusic-btn-play-pause').forEach(btn => {
        btn.addEventListener('click', handlePlayPause);
      });

      // Next / Prev buttons
      document.querySelectorAll('#player-btn-next, #simpmusic-btn-next').forEach(btn => {
        btn.addEventListener('click', () => this.playNext());
      });
      document.querySelectorAll('#player-btn-prev, #simpmusic-btn-prev').forEach(btn => {
        btn.addEventListener('click', () => this.playPrev());
      });

      // Mini scrub bar
      const miniTrack = document.getElementById('simpmusic-mini-progress-track');
      if (miniTrack) {
        miniTrack.addEventListener('click', (e) => {
          const rect = miniTrack.getBoundingClientRect();
          const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          this.seek(pos);
        });
      }

      // Modal scrub bar
      const scrubBar = document.getElementById('simpmusic-scrub-bar');
      if (scrubBar) {
        let isDragging = false;
        const onSeek = (e) => {
          const rect = scrubBar.getBoundingClientRect();
          const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          this.seek(pos);
        };
        scrubBar.addEventListener('click', onSeek);
        scrubBar.addEventListener('mousedown', (e) => {
          isDragging = true;
          onSeek(e);
        });
        window.addEventListener('mousemove', (e) => {
          if (isDragging) onSeek(e);
        });
        window.addEventListener('mouseup', () => {
          isDragging = false;
        });
      }

      // Favorite button in modal
      const modalFav = document.getElementById('simpmusic-modal-fav');
      if (modalFav) {
        modalFav.addEventListener('click', () => {
          this.toggleLike(this.currentTrack);
        });
      }

      // Shuffle button
      const shuffleBtn = document.getElementById('simpmusic-btn-shuffle');
      if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
          this.isShuffle = !this.isShuffle;
          shuffleBtn.classList.toggle('is-active', this.isShuffle);
        });
      }

      // Repeat button (cycle: off -> all -> one -> off)
      const repeatBtn = document.getElementById('simpmusic-btn-repeat');
      if (repeatBtn) {
        const oneIndicator = repeatBtn.querySelector('.repeat-one-indicator');
        repeatBtn.addEventListener('click', () => {
          if (this.repeatMode === 'off') {
            this.repeatMode = 'all';
            repeatBtn.classList.add('is-active');
            if (oneIndicator) oneIndicator.style.display = 'none';
          } else if (this.repeatMode === 'all') {
            this.repeatMode = 'one';
            repeatBtn.classList.add('is-active');
            if (oneIndicator) oneIndicator.style.display = 'block';
          } else {
            this.repeatMode = 'off';
            repeatBtn.classList.remove('is-active');
            if (oneIndicator) oneIndicator.style.display = 'none';
          }
        });
      }

      // Volume slider & mute
      const volSlider = document.getElementById('simpmusic-vol-slider');
      const volBtn = document.getElementById('simpmusic-vol-btn');
      let lastVolume = 100;
      if (volSlider) {
        volSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.setVolume(val);
          lastVolume = val > 0 ? val : lastVolume;
          updateVolIcon(val === 0);
        });
      }
      const updateVolIcon = (isMuted) => {
        if (!volBtn) return;
        const volHigh = volBtn.querySelector('.vol-high');
        const volMuted = volBtn.querySelector('.vol-muted');
        if (volHigh) volHigh.style.display = isMuted ? 'none' : 'block';
        if (volMuted) volMuted.style.display = isMuted ? 'block' : 'none';
      };
      if (volBtn) {
        volBtn.addEventListener('click', () => {
          if (!this.player) return;
          if (this.player.isMuted && this.player.isMuted()) {
            this.player.unMute();
            if (volSlider) volSlider.value = lastVolume;
            updateVolIcon(false);
          } else {
            this.player.mute();
            if (volSlider) volSlider.value = 0;
            updateVolIcon(true);
          }
        });
      }

      // Auto-scroll toggle
      const autoScrollBtn = document.getElementById('simpmusic-autoscroll-toggle');
      if (autoScrollBtn) {
        autoScrollBtn.addEventListener('click', () => {
          this.autoScrollLyrics = !this.autoScrollLyrics;
          autoScrollBtn.classList.toggle('is-active', this.autoScrollLyrics);
          autoScrollBtn.textContent = `Auto-scroll: ${this.autoScrollLyrics ? 'ON' : 'OFF'}`;
        });
      }

      // Queue: Clear & Shuffle
      const clearQueueBtn = document.getElementById('simpmusic-queue-clear');
      if (clearQueueBtn) {
        clearQueueBtn.addEventListener('click', () => {
          this.queue = this.currentTrack ? [this.currentTrack] : [];
          this.currentIndex = 0;
          this.renderQueueUI();
        });
      }
      const shuffleQueueBtn = document.getElementById('simpmusic-queue-shuffle');
      if (shuffleQueueBtn) {
        shuffleQueueBtn.addEventListener('click', () => {
          if (this.queue.length <= 1) return;
          const current = this.queue[this.currentIndex];
          const others = this.queue.filter((_, idx) => idx !== this.currentIndex);
          for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
          }
          this.queue = [current, ...others];
          this.currentIndex = 0;
          this.renderQueueUI();
        });
      }

      // SimpMusic Subnav Views
      document.querySelectorAll('#simpmusic-subnav .nav-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          document.querySelectorAll('#simpmusic-subnav .nav-item').forEach(n => n.classList.remove('is-active'));
          item.classList.add('is-active');

          const view = item.getAttribute('data-view');
          document.querySelectorAll('.simpmusic-view-tab').forEach(tab => tab.style.display = 'none');
          const targetView = document.getElementById(`simpmusic-view-${view}`);
          if (targetView) targetView.style.display = 'block';

          if (view === 'charts') {
            this.loadCharts();
          } else if (view === 'library') {
            this.updateLibraryUI();
          }
        });
      });

      // SimpMusic Genre Nav Items
      document.querySelectorAll('#simpmusic-subnav .nav-item[data-genre]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          document.querySelectorAll('#simpmusic-subnav .nav-item').forEach(n => n.classList.remove('is-active'));
          item.classList.add('is-active');
          const genre = item.getAttribute('data-genre');
          document.querySelectorAll('.simpmusic-view-tab').forEach(tab => tab.style.display = 'none');
          const discoverTab = document.getElementById('simpmusic-view-discover');
          if (discoverTab) discoverTab.style.display = 'block';
          window.searchMusic(genre);
        });
      });

      // Mood Bento Cards
      document.querySelectorAll('.simpmusic-mood-card').forEach(card => {
        card.addEventListener('click', () => {
          const query = card.getAttribute('data-query');
          if (query) {
            document.querySelectorAll('.simpmusic-view-tab').forEach(tab => tab.style.display = 'none');
            const discoverTab = document.getElementById('simpmusic-view-discover');
            if (discoverTab) discoverTab.style.display = 'block';
            window.searchMusic(query);
          }
        });
      });

      // Play All Liked
      const playLikedBtn = document.getElementById('simpmusic-btn-play-liked');
      if (playLikedBtn) {
        playLikedBtn.addEventListener('click', () => {
          if (this.likedTracks.length > 0) {
            this.playTrack(this.likedTracks[0], this.likedTracks, 0);
          }
        });
      }

      // Clear History
      const clearHistBtn = document.getElementById('simpmusic-btn-clear-history');
      if (clearHistBtn) {
        clearHistBtn.addEventListener('click', () => {
          this.recentHistory = [];
          this.saveStorage();
          this.updateLibraryUI();
        });
      }

      // Live search input with auto-suggestions & clear
      const searchInput = document.getElementById('music-search-input');
      const clearSearchBtn = document.getElementById('music-search-clear');
      const suggestionsBox = document.getElementById('music-search-suggestions');

      let debounceTimer;
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const val = searchInput.value.trim();
          if (clearSearchBtn) clearSearchBtn.style.display = val.length > 0 ? 'flex' : 'none';

          clearTimeout(debounceTimer);
          if (val.length >= 2) {
            debounceTimer = setTimeout(() => {
              fetch(`/api/music/suggestions?q=${encodeURIComponent(val)}`)
                .then(r => r.json())
                .then(list => {
                  if (!suggestionsBox) return;
                  if (Array.isArray(list) && list.length > 0) {
                    suggestionsBox.innerHTML = '';
                    list.slice(0, 7).forEach(s => {
                      const item = document.createElement('div');
                      item.className = 'simpmusic-suggestion-item';
                      item.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><span>${s}</span>`;
                      item.addEventListener('click', () => {
                        searchInput.value = s;
                        suggestionsBox.style.display = 'none';
                        window.searchMusic(s);
                      });
                      suggestionsBox.appendChild(item);
                    });
                    suggestionsBox.style.display = 'block';
                  } else {
                    suggestionsBox.style.display = 'none';
                  }
                })
                .catch(() => {
                  if (suggestionsBox) suggestionsBox.style.display = 'none';
                });
            }, 250);
          } else if (suggestionsBox) {
            suggestionsBox.style.display = 'none';
          }
        });

        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && searchInput.value.trim() !== '') {
            if (suggestionsBox) suggestionsBox.style.display = 'none';
            window.searchMusic(searchInput.value.trim());
          }
        });
      }

      if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
          searchInput.value = '';
          clearSearchBtn.style.display = 'none';
          if (suggestionsBox) suggestionsBox.style.display = 'none';
          searchInput.focus();
        });
      }

      document.addEventListener('click', (e) => {
        if (suggestionsBox && !e.target.closest('.system-search')) {
          suggestionsBox.style.display = 'none';
        }
      });
    },

    async loadCharts() {
      const chartsGrid = document.getElementById('simpmusic-charts-grid');
      if (!chartsGrid) return;
      if (chartsGrid.children.length > 0) return;

      chartsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-dim);">Loading Top Global Charts...</div>';
      try {
        const res = await fetch('/api/music/search?q=top%2050%20global%20hits%20chart');
        const data = await res.json();
        chartsGrid.innerHTML = '';
        if (Array.isArray(data)) {
          data.forEach(item => {
            chartsGrid.appendChild(this.createSongCard(item, data));
          });
        }
      } catch (e) {
        chartsGrid.innerHTML = '<div class="simpmusic-empty-state">Failed to load charts. Please try again.</div>';
      }
    }
  };

  // Initialize SimpMusic on startup
  window.SimpMusic.init();


  // --- Enhanced Full Streamable Anime Player Logic ---
  const animePlayerModal = document.getElementById('anime-player-modal');
  const animePlayerClose = document.getElementById('anime-player-close');
  const animePlayerIframe = document.getElementById('anime-player-iframe');
  const animePlayerPlaceholder = document.getElementById('anime-player-placeholder');
  const animePlayerLoader = document.getElementById('anime-player-loader');
  const animePlayerTitle = document.getElementById('anime-player-title');
  const animePlayerEpTitle = document.getElementById('anime-player-episode-title');
  const animePlayerEpList = document.getElementById('anime-player-episodes-list');
  const animePlayerServers = document.getElementById('anime-player-servers');
  const animeEpisodesCount = document.getElementById('anime-episodes-count');
  const animeEpSearch = document.getElementById('anime-ep-search');
  const animeBtnPrev = document.getElementById('anime-btn-prev');
  const animeBtnNext = document.getElementById('anime-btn-next');
  const animeBtnPopout = document.getElementById('anime-btn-popout');

  let currentAnime = null;
  let currentEpisode = 1;
  let totalEpisodesCount = 12;
  let activeServers = [];
  let currentServerUrl = '';

  if (animePlayerClose) {
    animePlayerClose.addEventListener('click', () => {
      animePlayerModal.style.display = 'none';
      if (animePlayerIframe) animePlayerIframe.src = '';
    });
  }

  // Prev / Next Episode Listeners
  if (animeBtnPrev) {
    animeBtnPrev.addEventListener('click', () => {
      if (currentEpisode > 1) {
        selectEpisode(currentEpisode - 1);
      }
    });
  }

  if (animeBtnNext) {
    animeBtnNext.addEventListener('click', () => {
      if (currentEpisode < totalEpisodesCount) {
        selectEpisode(currentEpisode + 1);
      }
    });
  }

  // Popout Stream / New Tab
  if (animeBtnPopout) {
    animeBtnPopout.addEventListener('click', () => {
      if (currentServerUrl) {
        window.open(currentServerUrl, '_blank', 'noopener,noreferrer');
      }
    });
  }

  // Episode Search Filter
  if (animeEpSearch) {
    animeEpSearch.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const buttons = animePlayerEpList.querySelectorAll('.anime-episode-btn');
      buttons.forEach(btn => {
        const epNum = btn.getAttribute('data-ep') || '';
        const title = btn.textContent.toLowerCase();
        if (!q || epNum === q || title.includes(q)) {
          btn.style.display = 'flex';
        } else {
          btn.style.display = 'none';
        }
      });
    });
  }

  // Handle Watch Now button clicks
  document.addEventListener('click', (e) => {
    const watchBtn = e.target.closest('.watch-anime-btn');
    if (watchBtn) {
      const itemData = JSON.parse(watchBtn.getAttribute('data-anime-data'));
      const aModal = document.getElementById("anime-modal");
      if (aModal) {
        aModal.classList.remove("show");
        aModal.style.display = "none";
      }
      openAnimePlayer(itemData);
    }
  });

  function openAnimePlayer(anime) {
    currentAnime = anime;
    currentEpisode = 1;
    totalEpisodesCount = anime.episodes || 12;
    
    const displayTitle = anime.title_english || anime.title || 'Anime';
    if (animePlayerTitle) animePlayerTitle.textContent = displayTitle;
    if (animePlayerModal) animePlayerModal.style.display = 'flex';
    
    if (animeEpisodesCount) animeEpisodesCount.textContent = totalEpisodesCount;
    if (animeEpSearch) animeEpSearch.value = '';

    renderEpisodesList(totalEpisodesCount);
    selectEpisode(1);
  }

  function renderEpisodesList(total, episodesData = []) {
    if (!animePlayerEpList) return;
    animePlayerEpList.innerHTML = '';

    for (let i = 1; i <= total; i++) {
      const epData = episodesData.find(e => e.number === i);
      const epLabel = epData && epData.title ? epData.title : `Episode ${i}`;
      
      const btn = document.createElement('div');
      btn.className = 'anime-episode-btn';
      btn.setAttribute('data-ep', i);
      if (i === currentEpisode) btn.classList.add('active');
      
      btn.innerHTML = `
        <div class="anime-episode-number">${i}</div>
        <div class="anime-episode-title">${epLabel}</div>
      `;
      
      btn.addEventListener('click', () => {
        selectEpisode(i);
      });
      animePlayerEpList.appendChild(btn);
    }
  }

  function selectEpisode(epNum) {
    currentEpisode = epNum;
    if (animePlayerEpTitle) animePlayerEpTitle.textContent = `Episode ${epNum}`;
    
    // Update active episode class
    const allBtns = animePlayerEpList.querySelectorAll('.anime-episode-btn');
    allBtns.forEach(b => {
      if (parseInt(b.getAttribute('data-ep'), 10) === epNum) {
        b.classList.add('active');
        b.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        b.classList.remove('active');
      }
    });

    // Update prev/next button disabled state
    if (animeBtnPrev) animeBtnPrev.disabled = (epNum <= 1);
    if (animeBtnNext) animeBtnNext.disabled = (epNum >= totalEpisodesCount);

    loadEpisodeStream(currentAnime, epNum);
  }

  async function loadEpisodeStream(anime, epNum) {
    if (!animePlayerIframe) return;

    // Show loading state
    if (animePlayerLoader) animePlayerLoader.style.display = 'flex';
    if (animePlayerPlaceholder) animePlayerPlaceholder.style.display = 'none';
    animePlayerIframe.style.display = 'none';
    animePlayerIframe.src = '';
    if (animePlayerServers) animePlayerServers.innerHTML = '';

    const queryTitle = anime.title_english || anime.title || '';

    try {
      const res = await fetch(`/api/anime/stream?title=${encodeURIComponent(queryTitle)}&episode=${epNum}`);
      const data = await res.json();

      if (data && data.servers && data.servers.length > 0) {
        activeServers = data.servers;

        // If backend returned more accurate total episodes or titles
        if (data.totalEpisodes && data.totalEpisodes > totalEpisodesCount) {
          totalEpisodesCount = data.totalEpisodes;
          if (animeEpisodesCount) animeEpisodesCount.textContent = totalEpisodesCount;
          renderEpisodesList(totalEpisodesCount, data.episodes || []);
          const activeBtn = animePlayerEpList.querySelector(`.anime-episode-btn[data-ep="${epNum}"]`);
          if (activeBtn) activeBtn.classList.add('active');
        }

        if (data.episodeTitle && animePlayerEpTitle) {
          animePlayerEpTitle.textContent = data.episodeTitle;
        }

        // Render Server selection pills
        renderServerPills(activeServers);

        // Auto-select Server 1
        switchServer(activeServers[0]);
      } else {
        fallbackTrailerOrPlaceholder(anime);
      }
    } catch (err) {
      console.error('Stream load error:', err);
      fallbackTrailerOrPlaceholder(anime);
    } finally {
      if (animePlayerLoader) animePlayerLoader.style.display = 'none';
    }
  }

  function renderServerPills(servers) {
    if (!animePlayerServers) return;
    animePlayerServers.innerHTML = '';

    servers.forEach((srv, idx) => {
      const pill = document.createElement('button');
      pill.className = 'anime-server-pill';
      if (idx === 0) pill.classList.add('active');
      pill.textContent = srv.name;
      pill.title = `Switch to ${srv.name}`;

      pill.addEventListener('click', () => {
        animePlayerServers.querySelectorAll('.anime-server-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        switchServer(srv);
      });

      animePlayerServers.appendChild(pill);
    });
  }

  function switchServer(srv) {
    if (!srv || !srv.url) return;
    currentServerUrl = srv.url;
    animePlayerIframe.src = srv.url;
    animePlayerIframe.style.display = 'block';
    if (animePlayerPlaceholder) animePlayerPlaceholder.style.display = 'none';
  }

  function fallbackTrailerOrPlaceholder(anime) {
    if (anime && anime.trailer && anime.trailer.embed_url) {
      currentServerUrl = anime.trailer.embed_url + '&autoplay=1';
      animePlayerIframe.src = currentServerUrl;
      animePlayerIframe.style.display = 'block';
      if (animePlayerPlaceholder) animePlayerPlaceholder.style.display = 'none';
    } else {
      animePlayerIframe.style.display = 'none';
      if (animePlayerPlaceholder) animePlayerPlaceholder.style.display = 'flex';
      animePlayerIframe.src = '';
    }
  }


// --- DECOUPLED ARCHITECTURE LOGIC (GAMES) ---
document.addEventListener('DOMContentLoaded', () => {
  const views = {
    games: document.getElementById('games-section')
  };
  
  const bottomNav = document.getElementById('main-bottom-nav');
  const globalHeader = document.querySelector('.site-header, .header');
  if (globalHeader) globalHeader.style.display = 'none';

  // Ensure local section is active and visible
  if (views.games) {
    views.games.classList.add('is-active');
    views.games.style.display = 'flex';
  }

  // Update navigation highlights
  document.querySelectorAll('#main-bottom-nav .bottom-nav-item').forEach(el => el.classList.remove('is-active'));
  const activeBtn = document.getElementById('sys-btn-games');
  if (activeBtn) activeBtn.classList.add('is-active');

  function switchSystem(sys) {
    if (sys === 'hub' || sys === 'index') {
      window.location.href = '/';
    } else if (sys !== 'games' && sys) {
      window.location.href = '/' + sys;
    }
  }

  window.switchSystem = switchSystem;

  // Hub Portal Cards
  document.querySelectorAll('.hub-card').forEach(card => {
    card.addEventListener('click', () => {
      const sys = card.getAttribute('data-sys');
      if (sys) switchSystem(sys);
    });
  });

  // Bottom Navigation Dock
  document.querySelectorAll('#main-bottom-nav .bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const href = btn.getAttribute('href') || '';
      const sys = href.replace('#', '') || btn.id.replace('sys-btn-', '');
      switchSystem(sys);
    });
  });

  // Hash Navigation Listener
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'games') {
      switchSystem(hash);
    }
  });

  // Initial Route Check
  const hashOnLoad = window.location.hash.replace('#', '');
  if (hashOnLoad && hashOnLoad !== 'games') {
    switchSystem(hashOnLoad);
  }

  // --- Games System Wireup ---
  const gamesNavs = [
    { id: 'btn-games-home', mode: 'all' },
    { id: 'btn-games-action', mode: 'action' },
    { id: 'btn-games-puzzle', mode: 'puzzle' },
    { id: 'btn-games-racing', mode: 'racing' },
    { id: 'btn-games-favorites', mode: 'favorites' }
  ];

  gamesNavs.forEach(nav => {
    const el = document.getElementById(nav.id);
    if(el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#games-section .nav-item').forEach(n => n.classList.remove('is-active'));
        el.classList.add('is-active');
        if(typeof window.applyFilter === 'function') {
           window.applyFilter('', nav.mode);
        }
      });
    }
  });

  // Games Category Chips
  document.querySelectorAll('#games-category-chips .chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#games-category-chips .chip-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const cat = btn.getAttribute('data-cat') || 'all';
      if (typeof window.applyFilter === 'function') {
        window.applyFilter('', cat);
      }
    });
  });

  // Games Search Input
  const gamesSearch = document.getElementById('games-search');
  if(gamesSearch) {
    gamesSearch.addEventListener('input', (e) => {
      const q = e.target.value;
      if(typeof window.applyFilter === 'function') {
        window.applyFilter(q, q ? "search" : "all");
      }
    });
  }

  // Carousel Populate Safely for Games Section
  const track = document.querySelector('#games-section .carousel-track') || document.querySelector('.carousel-track');
  if(track) {
    track.innerHTML = '';
    const gameCards = Array.from(document.querySelectorAll('#game-grid .game-card')).slice(0, 12);
    gameCards.forEach(g => {
       const imgEl = g.querySelector('img');
       const titleEl = g.querySelector('h3');
       const catEl = g.querySelector('.game-card__cat');
       const slug = g.getAttribute('data-slug') || '';
       const title = titleEl ? titleEl.textContent : '';
       const cat = catEl ? catEl.textContent : 'Arcade';
       const img = imgEl ? imgEl.src : '';
       if (!img || !title) return;
       
       const slide = document.createElement('div');
       slide.className = 'carousel-slide';
       slide.innerHTML = `
         <div class="carousel-slide__thumb-wrap">
           <img src="${img}" alt="${title}" loading="lazy">
           <span class="carousel-slide__badge">Hot</span>
           <button class="carousel-slide__play" aria-label="Play ${title}">
             <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
           </button>
         </div>
         <div class="carousel-slide__info">
           <div class="carousel-caption">${title}</div>
           <div class="carousel-sub">${cat}</div>
         </div>
       `;
       slide.addEventListener('click', (e) => {
         e.preventDefault();
         if (typeof window.openGameTheaterModal === 'function' && slug) {
           window.openGameTheaterModal(slug, title, cat);
         }
       });
       track.appendChild(slide);
    });
  }

  // Hub Top Picks Filter & Launch Wireup
  const hubPickTabs = document.querySelectorAll('.hub-pick-tab');
  const hubPickCards = document.querySelectorAll('#hub-picks-grid .media-selection-card');
  if (hubPickTabs.length > 0 && hubPickCards.length > 0) {
    hubPickTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        hubPickTabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        const filter = tab.getAttribute('data-pick-filter') || tab.getAttribute('data-filter') || 'all';
        hubPickCards.forEach(card => {
          const type = card.getAttribute('data-type');
          if (filter === 'all' || type === filter) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    hubPickCards.forEach(card => {
      card.addEventListener('click', () => {
        const type = card.getAttribute('data-type');
        if (type === 'games') {
          const slug = card.getAttribute('data-slug');
          const title = card.getAttribute('data-title');
          const cat = card.getAttribute('data-cat') || 'Arcade';
          if (typeof window.switchSystem === 'function') window.switchSystem('games');
          if (typeof window.openGameTheaterModal === 'function' && slug) {
            setTimeout(() => window.openGameTheaterModal(slug, title, cat), 100);
          }
        } else if (type === 'music') {
          const query = card.getAttribute('data-query') || card.getAttribute('data-title');
          if (typeof window.switchSystem === 'function') window.switchSystem('music');
          if (query && typeof window.searchMusic === 'function') {
            const mSearch = document.getElementById('music-search-input');
            if (mSearch) mSearch.value = query;
            const mLoading = document.getElementById("music-loading");
            const mGrid = document.getElementById("music-grid");
            if (mLoading) mLoading.style.display = "block";
            if (mGrid) mGrid.innerHTML = "";
            setTimeout(() => window.searchMusic(query), 100);
          }
        } else if (type === 'anime') {
          const animeTitle = card.getAttribute('data-anime-title') || card.getAttribute('data-title');
          if (typeof window.switchSystem === 'function') window.switchSystem('anime');
          if (animeTitle) {
            const aSearch = document.getElementById('anime-search');
            if (aSearch) {
              aSearch.value = animeTitle;
              const evt = new KeyboardEvent('keypress', { key: 'Enter', bubbles: true });
              aSearch.dispatchEvent(evt);
            }
          }
        }
      });
    });
  }

  // Music Featured Banners Wireup
  document.querySelectorAll('.featured-play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const q = btn.getAttribute('data-query');
      if (q && typeof window.searchMusic === 'function') {
        const mSearch = document.getElementById('music-search-input');
        if (mSearch) mSearch.value = q;
        const mLoading = document.getElementById("music-loading");
        const mGrid = document.getElementById("music-grid");
        if (mLoading) mLoading.style.display = "block";
        if (mGrid) mGrid.innerHTML = "";
        window.searchMusic(q);
      }
    });
  });

  // Anime Featured Banners Wireup
  document.querySelectorAll('.featured-anime-play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const title = btn.getAttribute('data-anime-title');
      if (title) {
        const aSearch = document.getElementById('anime-search');
        if (aSearch) {
          aSearch.value = title;
          const evt = new KeyboardEvent('keypress', { key: 'Enter', bubbles: true });
          aSearch.dispatchEvent(evt);
        }
      }
    });
  });

  // Music System Wireup handled by SimpMusic.bindUI()


  // --- Anime System Wireup ---
  const aSearch = document.getElementById('anime-search-input');
  if(aSearch) {
    aSearch.addEventListener('keypress', (e) => {
      if(e.key === 'Enter' && aSearch.value.trim() !== '') {
        const aLoading = document.getElementById("anime-loading");
        const aGrid = document.getElementById("anime-grid");
        if(aLoading) aLoading.style.display = "block";
        if(aGrid) aGrid.innerHTML = "";
        window.searchAnime(aSearch.value.trim());
      }
    });
  }

  // Anime Genre Chips
  document.querySelectorAll('#anime-genre-chips .chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#anime-genre-chips .chip-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const filter = btn.getAttribute('data-filter');
      const query = btn.getAttribute('data-query');
      if (filter === 'top') {
        window.fetchAnime('https://api.jikan.moe/v4/top/anime?filter=airing&limit=24');
      } else if (filter === 'bypopularity') {
        window.fetchAnime('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=24');
      } else if (filter === 'movie') {
        window.fetchAnime('https://api.jikan.moe/v4/top/anime?type=movie&limit=24');
      } else if (query) {
        window.searchAnime(query);
      }
    });
  });

  // Anime Sidebar Genre Nav Items
  const animeNavItems = [
    { id: 'btn-anime-home', type: 'filter', val: 'top', title: 'Top Airing' },
    { id: 'btn-anime-top', type: 'filter', val: 'top', title: 'Top Airing' },
    { id: 'btn-anime-popular', type: 'filter', val: 'bypopularity', title: 'Popular' },
    { id: 'btn-anime-action', type: 'query', val: 'Action', title: 'Action' },
    { id: 'btn-anime-adventure', type: 'query', val: 'Adventure', title: 'Adventure' },
    { id: 'btn-anime-scifi', type: 'query', val: 'Sci-Fi', title: 'Sci-Fi' },
    { id: 'btn-anime-fantasy', type: 'query', val: 'Fantasy', title: 'Fantasy' },
    { id: 'btn-anime-movies', type: 'filter', val: 'movie', title: 'Movies' }
  ];

  animeNavItems.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#anime-section .nav-item').forEach(n => n.classList.remove('is-active'));
        el.classList.add('is-active');
        const titleEl = document.getElementById('anime-section-title');
        if (titleEl) titleEl.textContent = `${item.title} Catalog`;
        if (item.type === 'filter') {
          if (item.val === 'top') window.fetchAnime('https://api.jikan.moe/v4/top/anime?filter=airing&limit=24');
          else if (item.val === 'bypopularity') window.fetchAnime('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=24');
          else if (item.val === 'movie') window.fetchAnime('https://api.jikan.moe/v4/top/anime?type=movie&limit=24');
        } else if (item.type === 'query') {
          window.searchAnime(item.val);
        }
      });
    }
  });

  // Anime Featured Premiere Buttons
  document.querySelectorAll('.featured-anime-play').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.getAttribute('data-anime-title') || 'Jujutsu Kaisen';
      if (typeof window.searchAnime === 'function') {
        window.searchAnime(title);
      }
    });
  });

  // Hub Omni Search Input
  const hubSearch = document.getElementById('hub-omni-search');
  if (hubSearch) {
    hubSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && hubSearch.value.trim() !== '') {
        const query = hubSearch.value.trim();
        switchSystem('games');
        const gamesSearch = document.getElementById('games-search');
        if (gamesSearch) gamesSearch.value = query;
        if (typeof window.applyFilter === 'function') {
          window.applyFilter(query, 'search');
        }
      }
    });
  }

  // Hub Quick Pills
  document.querySelectorAll('.hub-quick-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const sys = pill.getAttribute('data-sys') || 'games';
      const cat = pill.getAttribute('data-cat');
      const genre = pill.getAttribute('data-genre');
      const filter = pill.getAttribute('data-filter');

      switchSystem(sys);

      if (sys === 'games' && cat) {
        const chip = document.querySelector(`#games-category-chips .chip-btn[data-cat="${cat}"]`);
        if (chip) chip.click();
        else if (typeof window.applyFilter === 'function') window.applyFilter('', cat);
      } else if (sys === 'music' && genre) {
        const chip = document.querySelector(`#music-genre-chips .chip-btn[data-query*="${genre}"]`);
        if (chip) chip.click();
        else if (typeof window.searchMusic === 'function') window.searchMusic(genre);
      } else if (sys === 'anime') {
        if (filter) {
          const chip = document.querySelector(`#anime-genre-chips .chip-btn[data-filter="${filter}"]`);
          if (chip) chip.click();
        } else if (genre) {
          const chip = document.querySelector(`#anime-genre-chips .chip-btn[data-query="${genre}"]`);
          if (chip) chip.click();
        }
      }
    });
  });

  // Hub Spotlight Items
  document.querySelectorAll('.hub-spotlight-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-hub-jump');
      const slug = item.getAttribute('data-slug');
      const query = item.getAttribute('data-query');
      const animeTitle = item.getAttribute('data-anime-title');

      if (target === 'game') {
        switchSystem('games');
        if (slug) {
          const gameCard = document.querySelector(`.game-card[data-slug="${slug}"]`);
          if (gameCard) {
            gameCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            gameCard.classList.add('spotlight-flash');
            setTimeout(() => gameCard.classList.remove('spotlight-flash'), 2000);
          }
        }
      } else if (target === 'music') {
        switchSystem('music');
        if (query && typeof window.searchMusic === 'function') {
          window.searchMusic(query);
        }
      } else if (target === 'anime') {
        switchSystem('anime');
        if (animeTitle && typeof window.searchAnime === 'function') {
          window.searchAnime(animeTitle);
        }
      }
    });
  });

  // LEGAL POLICIES AND COOKIE CONSENT ENGINE
  const legalModal = document.getElementById('legal-policy-modal');
  const legalModalBody = document.getElementById('legal-modal-body-content');
  const closeLegalModalBtn = document.getElementById('btn-close-legal-modal');
  const cookiePrefsModal = document.getElementById('cookie-preferences-modal');
  const closeCookiePrefsBtn = document.getElementById('btn-close-cookie-prefs');
  const cookieConsentBar = document.getElementById('cookie-consent-bar');

  const policies = {
    privacy: {
      title: "Privacy Policy",
      content: `
        <h3>goarxyz Privacy Policy</h3>
        <p class="policy-updated">Last updated: September 2026</p>
        <p>At <strong>goarxyz</strong>, your privacy and digital autonomy are fundamental values. This Privacy Policy details how goarxyz manages session telemetry, media preferences, and analytics.</p>
        
        <h4>1. Information We Collect</h4>
        <p>goarxyz is designed as a client-first entertainment platform. We do not require personal registration, account creation, or payment details. Data collected is strictly categorized as:</p>
        <ul>
          <li><strong>Client-Side Local State:</strong> Favorited games, volume levels, recent media, and theme preferences stored directly in your browser's <code>localStorage</code>. This data never leaves your device.</li>
          <li><strong>Aggregated Telemetry:</strong> Anonymized diagnostic signals (load speed, browser runtime, general geographical region) collected via Google Tag Manager to maintain streaming stability and game performance.</li>
          <li><strong>Server Logs:</strong> Transient network requests necessary to deliver media proxies and streaming endpoints, automatically purged.</li>
        </ul>

        <h4>2. Use of Information</h4>
        <p>We use operational data solely to:</p>
        <ul>
          <li>Deliver rapid, uninterrupted gameplay and high-fidelity media playback.</li>
          <li>Ensure multi-server failover for video and audio content.</li>
          <li>Diagnose latency bottlenecks and enhance progressive web app (PWA) caching.</li>
        </ul>

        <h4>3. Zero Data Brokerage</h4>
        <p>goarxyz never sells, leases, or trades user data or browsing activity to third-party data brokers, marketers, or advertisers.</p>

        <h4>4. Your Rights and Controls</h4>
        <p>You may purge your local favorites and playback cache at any time through your browser settings or customize your telemetry preferences in the Cookie Settings panel below.</p>
      `
    },
    terms: {
      title: "Terms of Service",
      content: `
        <h3>goarxyz Terms of Service</h3>
        <p class="policy-updated">Last updated: September 2026</p>
        <p>Welcome to <strong>goarxyz</strong>. By accessing or using the goarxyz entertainment portal, you agree to comply with and be bound by these Terms of Service.</p>

        <h4>1. Platform Usage</h4>
        <p>goarxyz is provided for personal, non-commercial entertainment and informational enjoyment. Users agree not to misuse platform infrastructure, reverse engineer proxy mechanisms, or bypass rate limits.</p>

        <h4>2. Content and Catalog Indexing</h4>
        <p>goarxyz aggregates, curates, and interfaces with publicly accessible digital media streams and open web game engines. All respective game assets, audio compositions, and video productions remain the intellectual property of their original creators.</p>

        <h4>3. Disclaimer of Warranties</h4>
        <p>The platform is provided on an "AS IS" and "AS AVAILABLE" basis. While goarxyz implements rigorous multi-server redundancy, we make no express warranties regarding uninterrupted uptime or third-party host availability.</p>

        <h4>4. Modifications to Terms</h4>
        <p>goarxyz reserves the right to revise these terms periodically to reflect compliance updates and feature expansions. Continued usage of goarxyz constitutes acceptance of updated terms.</p>
      `
    },
    cookies: {
      title: "Cookie &amp; Storage Policy",
      content: `
        <h3>goarxyz Cookie Policy</h3>
        <p class="policy-updated">Last updated: September 2026</p>
        <p>This Cookie Policy explains how <strong>goarxyz</strong> utilizes cookies, browser web storage (<code>localStorage</code>), and Google Tag Manager (GTM) telemetry.</p>

        <h4>1. What are Cookies and Local Storage?</h4>
        <p>Cookies and local web storage are small data files placed on your browser or device that permit web applications to remember your state across visits and sessions.</p>

        <h4>2. Categories of Storage We Use</h4>
        <ul>
          <li><strong>Essential Storage:</strong> Required for the core operation of goarxyz. Stores your favorited titles, recent play histories, and PWA offline assets.</li>
          <li><strong>Performance &amp; Telemetry (GTM):</strong> With your consent, we deploy Google Tag Manager to collect anonymous performance telemetry (playback initialization latency, failed stream failovers, and page performance).</li>
          <li><strong>Functional Preferences:</strong> Remembers your preferred video servers, player volume, and active genre filters.</li>
        </ul>

        <h4>3. Managing Your Choices</h4>
        <p>You have full control over your telemetry preferences. You can adjust your consent anytime using the "Cookie Settings" button in the footer.</p>
      `
    }
  };

  const openLegalModal = (policyKey) => {
    if (!policies[policyKey] || !legalModal || !legalModalBody) return;
    legalModalBody.innerHTML = policies[policyKey].content;
    legalModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  const closeLegalModal = () => {
    if (legalModal) legalModal.style.display = 'none';
    document.body.style.overflow = '';
  };

  document.getElementById('btn-open-privacy')?.addEventListener('click', (e) => { e.preventDefault(); openLegalModal('privacy'); });
  document.getElementById('btn-open-terms')?.addEventListener('click', (e) => { e.preventDefault(); openLegalModal('terms'); });
  document.getElementById('btn-open-cookies')?.addEventListener('click', (e) => { e.preventDefault(); openLegalModal('cookies'); });
  document.getElementById('link-bar-cookie-policy')?.addEventListener('click', (e) => { e.preventDefault(); openLegalModal('cookies'); });
  closeLegalModalBtn?.addEventListener('click', closeLegalModal);
  legalModal?.addEventListener('click', (e) => { if (e.target === legalModal) closeLegalModal(); });

  // GOOGLE CONSENT MODE V2 & CMP CONTROLLER
  const GOOGLE_CONSENT_KEY = 'goarxyz_google_consent_v2';
  
  // Persistent Customer ID & Session tracking (BigQuery / CDP standard)
  const getCustomerIds = () => {
    let pseudoId = localStorage.getItem('goarxyz_customer_uid');
    if (!pseudoId) {
      pseudoId = 'cuid_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      try { localStorage.setItem('goarxyz_customer_uid', pseudoId); } catch(e) {}
    }
    let sessId = sessionStorage.getItem('goarxyz_sess_id');
    if (!sessId) {
      sessId = 'sess_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      try { sessionStorage.setItem('goarxyz_sess_id', sessId); } catch(e) {}
    }
    return { pseudoId, sessId };
  };

  const getGoogleConsent = () => {
    try { return JSON.parse(localStorage.getItem(GOOGLE_CONSENT_KEY)); } catch { return null; }
  };

  const applyGoogleConsent = (consentObj) => {
    try { localStorage.setItem(GOOGLE_CONSENT_KEY, JSON.stringify(consentObj)); } catch (e) {}

    // Dispatch official Google Consent Mode v2 signals
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'ad_storage': consentObj.ad_storage,
        'ad_user_data': consentObj.ad_user_data,
        'ad_personalization': consentObj.ad_personalization,
        'analytics_storage': consentObj.analytics_storage,
        'personalization_storage': consentObj.personalization_storage,
        'functionality_storage': 'granted',
        'security_storage': 'granted'
      });
    }

    // Push standard GTM consent event to dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'consent_update',
      consent_status: consentObj.status,
      consent_timestamp: consentObj.timestamp
    });

    // Log consent change to customer database telemetry
    trackEvent('user_consent_decision', {
      consent_status: consentObj.status,
      analytics: consentObj.analytics_storage,
      ads: consentObj.ad_storage,
      personalization: consentObj.personalization_storage
    });
  };

  const openCookiePrefs = () => {
    const current = getGoogleConsent() || {
      analytics_storage: 'granted',
      personalization_storage: 'granted',
      ad_storage: 'granted'
    };
    const aToggle = document.getElementById('pref-analytics-toggle');
    const pToggle = document.getElementById('pref-personalization-toggle');
    const adToggle = document.getElementById('pref-ads-toggle');
    if (aToggle) aToggle.checked = current.analytics_storage === 'granted';
    if (pToggle) pToggle.checked = current.personalization_storage === 'granted';
    if (adToggle) adToggle.checked = current.ad_storage === 'granted';
    if (cookiePrefsModal) cookiePrefsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  const closeCookiePrefs = () => {
    if (cookiePrefsModal) cookiePrefsModal.style.display = 'none';
    document.body.style.overflow = '';
  };

  document.getElementById('btn-open-consent-settings')?.addEventListener('click', (e) => { e.preventDefault(); openCookiePrefs(); });
  document.getElementById('cookie-manage-prefs')?.addEventListener('click', openCookiePrefs);
  closeCookiePrefsBtn?.addEventListener('click', closeCookiePrefs);
  cookiePrefsModal?.addEventListener('click', (e) => { if (e.target === cookiePrefsModal) closeCookiePrefs(); });

  // Accept All Action (Google Standard)
  const handleAcceptAll = () => {
    applyGoogleConsent({
      status: 'all',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
      personalization_storage: 'granted',
      timestamp: Date.now()
    });
    if (cookieConsentBar) cookieConsentBar.style.display = 'none';
    closeCookiePrefs();
  };

  // Reject All Action (Google Standard)
  const handleRejectAll = () => {
    applyGoogleConsent({
      status: 'essential_only',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      personalization_storage: 'denied',
      timestamp: Date.now()
    });
    if (cookieConsentBar) cookieConsentBar.style.display = 'none';
    closeCookiePrefs();
  };

  document.getElementById('cookie-accept-all')?.addEventListener('click', handleAcceptAll);
  document.getElementById('cookie-dialog-accept-all')?.addEventListener('click', handleAcceptAll);

  document.getElementById('cookie-reject-all')?.addEventListener('click', handleRejectAll);
  document.getElementById('cookie-dialog-reject-all')?.addEventListener('click', handleRejectAll);

  // Confirm Granular Choices from Dialog
  document.getElementById('btn-save-cookie-prefs')?.addEventListener('click', () => {
    const aToggle = document.getElementById('pref-analytics-toggle');
    const pToggle = document.getElementById('pref-personalization-toggle');
    const adToggle = document.getElementById('pref-ads-toggle');

    const allowAnalytics = aToggle ? aToggle.checked : false;
    const allowPersonalization = pToggle ? pToggle.checked : false;
    const allowAds = adToggle ? adToggle.checked : false;

    applyGoogleConsent({
      status: 'custom',
      ad_storage: allowAds ? 'granted' : 'denied',
      ad_user_data: allowAds ? 'granted' : 'denied',
      ad_personalization: allowAds ? 'granted' : 'denied',
      analytics_storage: allowAnalytics ? 'granted' : 'denied',
      personalization_storage: allowPersonalization ? 'granted' : 'denied',
      timestamp: Date.now()
    });
    closeCookiePrefs();
    if (cookieConsentBar) cookieConsentBar.style.display = 'none';
  });

  // Footer / Banner Policy Links
  document.getElementById('link-bar-privacy-policy')?.addEventListener('click', (e) => { e.preventDefault(); openLegalModal('privacy'); });
  document.getElementById('link-bar-cookie-policy')?.addEventListener('click', (e) => { e.preventDefault(); openLegalModal('cookies'); });

  // Show Google CMP Banner if user has not yet consented
  const existingGoogleConsent = getGoogleConsent();
  if (!existingGoogleConsent && cookieConsentBar) {
    setTimeout(() => {
      cookieConsentBar.style.display = 'block';
    }, 700);
  }

  // ENTERPRISE TELEMETRY PIPELINE (Google Tag Manager + First-Party Customer Database)
  window.trackEvent = function(eventName, eventParams = {}) {
    const consent = getGoogleConsent();
    const isAnalyticsGranted = !consent || consent.analytics_storage === 'granted';

    // 1. Google Tag Manager / GA4 DataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      brand: 'goarxyz',
      ...eventParams
    });

    // 2. First-Party Customer Database Telemetry Pipeline (/api/analytics/collect)
    const { pseudoId, sessId } = getCustomerIds();
    const payload = {
      eventName,
      userPseudoId: pseudoId,
      sessionId: sessId,
      consentGranted: isAnalyticsGranted,
      page: window.location.pathname + window.location.hash,
      properties: eventParams
    };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/collect', blob);
      } else {
        fetch('/api/analytics/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
      }
    } catch(e) {}
  };
});

// SimpMusic System Bridging & Display Logic

window.openGameTheaterModal = function(slug, title, category = "Instant Play") {
  const modal = document.getElementById("goarxyz-game-modal");
  const iframe = document.getElementById("goarxyz-inapp-game-frame");
  const loader = document.getElementById("game-modal-loader");
  const titleEl = document.getElementById("game-modal-title");
  const badgeEl = document.getElementById("game-modal-badge");
  const favBtn = document.getElementById("btn-game-modal-fav");

  if (!modal || !iframe) return;

  if (titleEl) titleEl.textContent = title || slug;
  if (badgeEl) badgeEl.textContent = category.toUpperCase();

  activeGameSession = {
    slug,
    title,
    category,
    startTime: Date.now()
  };

  // Update favorite status on the modal button
  const isFav = (typeof getFavorites === 'function' && getFavorites().includes(slug));
  if (favBtn) {
    favBtn.classList.toggle("is-active", isFav);
    const span = favBtn.querySelector("span");
    if (span) span.textContent = isFav ? "Favorited" : "Favorite";
  }

  // Show loader and set iframe URL
  if (loader) loader.classList.remove("is-hidden");
  iframe.onload = () => {
    if (loader) loader.classList.add("is-hidden");
  };
  iframe.src = `https://play.famobi.com/${slug}/?customer=A1000`;

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Dispatch telemetry
  if (typeof window.trackEvent === 'function') {
    window.trackEvent("inapp_game_start", {
      item_id: slug,
      item_name: title,
      content_type: "game",
      category: category
    });
  }
};

window.closeGameTheaterModal = function() {
  const modal = document.getElementById("goarxyz-game-modal");
  const iframe = document.getElementById("goarxyz-inapp-game-frame");
  if (!modal) return;

  if (activeGameSession && typeof window.trackEvent === 'function') {
    const durationSeconds = Math.round((Date.now() - activeGameSession.startTime) / 1000);
    window.trackEvent("inapp_game_complete", {
      item_id: activeGameSession.slug,
      item_name: activeGameSession.title,
      duration_seconds: durationSeconds
    });
  }

  activeGameSession = null;
  if (iframe) iframe.src = "about:blank";
  modal.style.display = "none";
  document.body.style.overflow = "";
};

// Wire modal buttons
document.getElementById("btn-game-modal-close")?.addEventListener("click", window.closeGameTheaterModal);
document.getElementById("game-modal-backdrop")?.addEventListener("click", window.closeGameTheaterModal);

document.getElementById("btn-game-modal-reload")?.addEventListener("click", () => {
  const iframe = document.getElementById("goarxyz-inapp-game-frame");
  const loader = document.getElementById("game-modal-loader");
  if (iframe && iframe.src && iframe.src !== "about:blank") {
    if (loader) loader.classList.remove("is-hidden");
    iframe.src = iframe.src;
  }
});

document.getElementById("btn-game-modal-fullscreen")?.addEventListener("click", () => {
  const frameWrap = document.getElementById("game-modal-frame-wrap");
  if (!frameWrap) return;
  if (!document.fullscreenElement) {
    frameWrap.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

document.getElementById("btn-game-modal-fav")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (!activeGameSession || typeof getFavorites !== 'function' || typeof saveFavorites !== 'function') return;
  const favs = getFavorites();
  const slug = activeGameSession.slug;
  const idx = favs.indexOf(slug);
  const favBtn = document.getElementById("btn-game-modal-fav");
  if (idx > -1) {
    favs.splice(idx, 1);
    favBtn?.classList.remove("is-active");
    if (favBtn?.querySelector("span")) favBtn.querySelector("span").textContent = "Favorite";
    window.trackEvent?.("remove_from_favorites", { item_id: slug });
  } else {
    favs.push(slug);
    favBtn?.classList.add("is-active");
    if (favBtn?.querySelector("span")) favBtn.querySelector("span").textContent = "Favorited";
    window.trackEvent?.("add_to_favorites", { item_id: slug });
  }
  saveFavorites(favs);
});

// Close game modal on Escape
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const gameModal = document.getElementById("goarxyz-game-modal");
    if (gameModal && gameModal.style.display !== "none") {
      window.closeGameTheaterModal();
    }
    const settingsModal = document.getElementById("platform-settings-modal");
    if (settingsModal && settingsModal.style.display !== "none") {
      window.closePlatformSettingsModal?.();
    }
  }
});

/* ==========================================================================
   Hub Live Media Showcase Video Controller
   ========================================================================== */


// Games Page Filter & Nav Wireup
document.addEventListener('DOMContentLoaded', () => {
  const gamesNavs = [
    { id: 'btn-games-home', mode: 'all' },
    { id: 'btn-games-action', mode: 'action' },
    { id: 'btn-games-puzzle', mode: 'puzzle' },
    { id: 'btn-games-racing', mode: 'racing' },
    { id: 'btn-games-favorites', mode: 'favorites' }
  ];

  gamesNavs.forEach(nav => {
    const el = document.getElementById(nav.id);
    if(el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#games-section .nav-item').forEach(n => n.classList.remove('is-active'));
        el.classList.add('is-active');
        if(typeof window.applyFilter === 'function') {
           window.applyFilter('', nav.mode);
        }
      });
    }
  });

  document.querySelectorAll('#games-category-chips .chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#games-category-chips .chip-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const cat = btn.getAttribute('data-cat') || 'all';
      if (typeof window.applyFilter === 'function') {
        window.applyFilter('', cat);
      }
    });
  });

  const gamesSearch = document.getElementById('games-search');
  if(gamesSearch) {
    gamesSearch.addEventListener('input', (e) => {
      const q = e.target.value;
      if(typeof window.applyFilter === 'function') {
        window.applyFilter(q, q ? "search" : "all");
      }
    });
  }

  // Populate Games Carousel
  const track = document.querySelector('#games-section .carousel-track') || document.querySelector('.carousel-track');
  if(track) {
    track.innerHTML = '';
    const gameCards = Array.from(document.querySelectorAll('#games-section .game-grid .game-card')).slice(0, 12);
    gameCards.forEach(g => {
       const imgEl = g.querySelector('img');
       const titleEl = g.querySelector('h3');
       const catEl = g.querySelector('.game-card__cat');
       const slug = g.getAttribute('data-slug') || '';
       const title = titleEl ? titleEl.textContent : '';
       const cat = catEl ? catEl.textContent : 'Arcade';
       const img = imgEl ? imgEl.src : '';
       if (!img || !title) return;
       
       const slide = document.createElement('div');
       slide.className = 'carousel-slide';
       slide.innerHTML = `
         <div class="carousel-slide__thumb-wrap">
           <img src="${img}" alt="${title}" loading="lazy">
           <span class="carousel-slide__badge">Hot</span>
           <button class="carousel-slide__play" aria-label="Play ${title}">
             <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
           </button>
         </div>
         <div class="carousel-slide__info">
           <div class="carousel-caption">${title}</div>
           <div class="carousel-sub">${cat}</div>
         </div>
       `;
       slide.addEventListener('click', (e) => {
         e.preventDefault();
         if (typeof window.openGameTheaterModal === 'function' && slug) {
           window.openGameTheaterModal(slug, title, cat);
         }
       });
       track.appendChild(slide);
    });
  }

  // Wire custom Play in New Tab button in the game modal
  const popoutBtn = document.getElementById("btn-game-modal-popout");
  if (popoutBtn) {
    popoutBtn.addEventListener("click", () => {
      if (activeGameSession) {
        window.open(`https://play.famobi.com/${activeGameSession.slug}/?customer=A1000`, '_blank');
        window.trackEvent?.("inapp_game_popout", { item_id: activeGameSession.slug, item_name: activeGameSession.title });
      }
    });
  }

  // Wire category filter clicks for individual game cards so they direct correctly
  document.querySelectorAll('.game-card__link').forEach(link => {
    const card = link.closest('.game-card');
    const slug = card?.getAttribute('data-slug');
    const title = card?.querySelector('h3')?.textContent;
    if (link && card && slug) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = card.dataset.search ? card.dataset.search.split(" ")[1] : "Instant Play";
        if (typeof window.openGameTheaterModal === 'function') {
          window.openGameTheaterModal(slug, title, cat);
        } else {
          window.location.href = `/game/${slug}/`;
        }
      });
    }
  });
});
