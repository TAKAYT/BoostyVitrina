/* ТАКА — Каталог озвучки манги (обновлённая логика витрины) */
(function () {
  "use strict";

  const BLOG_URL = "https://boosty.to/darktaka";
  const STORAGE_KEY = "taka_vitrina_filters_v2";
  const TOUR_DONE_KEY = "taka_tour_completed_v2";
  const THEME_KEY = "taka_theme_v2";

  const TYPE_LABELS = {
    manhwa: "манхва",
    manhua: "маньхуа",
    manga: "манга"
  };

  const TIER_INFO = {
    "1": {
      title: "1 уровень • Базовый (250 ₽/мес)",
      desc: "Доступ к основной библиотеке озвучки и свежим главам без ожидания. Выходит примерно 8 ₽ в день.",
      url: "https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link",
      ymEvent: "click_tariff_250"
    },
    "2": {
      title: "2 уровень • Оптимальный выбор (500 ₽/мес)",
      desc: "Все тайтлы 1 уровня + закрытые Лицензии + закрытый ТГ-чат и стримы. Самый популярный тариф.",
      url: "https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link",
      ymEvent: "click_tariff_500"
    },
    "3": {
      title: "3 уровень • Ускорение (1 000 ₽/мес)",
      desc: "Все бонусы 1 и 2 уровней + максимальная поддержка канала и ускоренный выход новых глав.",
      url: "https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link",
      ymEvent: "click_tariff_1000"
    }
  };

  const state = {
    catalog: [],
    meta: {},
    ytVideos: [],
    tgNews: [],
    archiveMonths: {},
    access: "all",
    type: "all",
    sort: "newest",
    search: "",
    genres: [],
    special: "all",
    archiveKey: "current",
    viewMode: "grid",
    shelfMode: "week",
    modalShelfMode: "week"
  };

  /* -------------------- UTILS & METRIKA -------------------- */
  function trackEvent(eventName, params) {
    try {
      if (typeof window.ym === "function") {
        window.ym(114099972, "reachGoal", eventName, params || {});
      }
    } catch (_) {}
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function translitSlug(text) {
    const map = {
      а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
      з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
      п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
      ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
    };
    return String(text || "")
      .toLowerCase()
      .split("")
      .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
      .join("")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "title";
  }

  function buildUtmUrl(rawUrl, title) {
    if (!rawUrl) return BLOG_URL;
    try {
      const url = new URL(rawUrl, BLOG_URL);
      url.searchParams.set("utm_source", "vitrina");
      url.searchParams.set("utm_campaign", translitSlug(title));
      return url.toString();
    } catch (_) {
      return rawUrl;
    }
  }

  function parseDateValue(dateStr) {
    if (!dateStr) return 0;
    const m = String(dateStr).match(/(\d{2})[.\/-](\d{2})[.\/-](\d{4})/);
    if (m) {
      return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
    }
    const iso = Date.parse(dateStr);
    return Number.isNaN(iso) ? 0 : iso;
  }

  function extractChapterSpan(rangeStr) {
    const nums = String(rangeStr || "").match(/\d+/g);
    if (!nums || nums.length === 0) return 0;
    if (nums.length === 1) return 1;
    const a = Number(nums[0]);
    const b = Number(nums[nums.length - 1]);
    return b >= a ? b - a + 1 : 1;
  }

  function extractChaptersFromTitle(title) {
    const m = String(title || "").match(/(\d+\s*[-–]\s*\d+\s*(?:гл|глав\w*)?|\d+\s*гл\w*)/i);
    return m ? m[1].replace(/\s+/g, "") : "";
  }

  function saveFilters() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        access: state.access,
        type: state.type,
        sort: state.sort,
        search: state.search,
        genres: state.genres,
        special: state.special,
        viewMode: state.viewMode
      }));
    } catch (_) {}
  }

  function loadSavedFilters() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.access) state.access = saved.access;
      if (saved.type) state.type = saved.type;
      if (saved.sort) state.sort = saved.sort;
      if (typeof saved.search === "string") state.search = saved.search;
      if (Array.isArray(saved.genres)) state.genres = saved.genres;
      if (saved.special) state.special = saved.special;
      if (saved.viewMode) state.viewMode = saved.viewMode;
    } catch (_) {}
  }

  /* -------------------- GEO-BLOCK (KR / JP / CN) -------------------- */
  function checkGeoRestriction() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const lang = (navigator.language || "").toLowerCase();
      if (
        /seoul|tokyo|shanghai|beijing|hong_kong|taipei/i.test(tz) ||
        /^(ko|ja|zh)\b/.test(lang)
      ) {
        showGeoBlock();
        return;
      }
      fetch("https://api.country.is/")
        .then((r) => r.json())
        .then((d) => {
          if (d && ["KR", "JP", "CN"].includes(String(d.country || "").toUpperCase())) {
            showGeoBlock();
          }
        })
        .catch(() => {});
    } catch (_) {}
  }

  function showGeoBlock() {
    const app = document.getElementById("mainApp");
    const block = document.getElementById("geoBlockScreen");
    if (app) app.style.display = "none";
    if (block) block.style.display = "flex";
  }

  /* -------------------- AMBIENT PARTICLES -------------------- */
  function initAmbient() {
    const layer = document.getElementById("ambientLayer");
    if (!layer || window.innerWidth <= 768) return;
    const count = 14;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "ambient-particle";
      el.style.left = Math.random() * 100 + "%";
      el.style.animationDuration = (10 + Math.random() * 14) + "s";
      el.style.animationDelay = (-Math.random() * 14) + "s";
      layer.appendChild(el);
    }
  }

  /* -------------------- DATA LOADING -------------------- */
  async function loadCatalog() {
    const summary = document.getElementById("resultsSummary");
    if (window.location.protocol === "file:") {
      if (summary) {
        summary.textContent = "Локальный режим (file://): браузер блокирует загрузку JSON. Открой сайт через GitHub Pages или локальный сервер.";
      }
      return;
    }

    const candidates = ["catalog.json", "data.json"];
    let data = null;
    let lastErr = null;

    for (const file of candidates) {
      try {
        const resp = await fetch(file + "?v=" + Date.now());
        if (resp.ok) {
          data = await resp.json();
          break;
        }
        lastErr = `${file}: HTTP ${resp.status}`;
      } catch (e) {
        lastErr = e.message;
      }
    }

    if (!data) {
      console.error("Catalog load error:", lastErr);
      if (summary) {
        summary.textContent = `Ошибка загрузки каталога (${lastErr || "файл не найден"}).`;
      }
      return;
    }

    try {
      const items = Array.isArray(data) ? data : (data.items || data.catalog || []);
      state.catalog = items.map((item, idx) => normalizeItem(item, idx));
      state.meta = Array.isArray(data) ? {} : (data.meta || data);
      state.ytVideos = Array.isArray(data.yt_videos) ? data.yt_videos : (state.meta.yt_videos || []);
      state.tgNews = Array.isArray(data.tg_news) ? data.tg_news : (state.meta.tg_news || []);
      state.archiveMonths = data.popularity_archive || state.meta.popularity_archive || {};

      if (state.meta.avatar) {
        const av = document.querySelector(".hero-avatar");
        if (av) {
          av.src = state.meta.avatar;
          av.style.display = "block";
        }
      }

      populateHeaderAndStats();
      populateGenresAndArchive();
      syncControlsFromState();
      renderShelf();
      renderCatalog();
      initConversionTriggers();
      maybeStartFirstTour();
    } catch (err) {
      console.error("Catalog parse error:", err);
      if (summary) summary.textContent = "Ошибка обработки данных каталога: " + err.message;
    }
  }

  function normalizeItem(raw, idx) {
    const posts = Array.isArray(raw.all_posts) ? raw.all_posts : [];
    const totalCh = Number(raw.total_chapters || raw.chapters_total || 0);
    const freeCh = Number(raw.free_chapters || 0);
    const paidCh = Number(raw.paid_chapters !== undefined ? raw.paid_chapters : Math.max(0, totalCh - freeCh));
    const typeKey = ["manhwa", "manhua", "manga"].includes(raw.type) ? raw.type : "manhwa";

    return {
      id: raw.id || idx,
      title: raw.title || "Без названия",
      type: typeKey,
      typeLabel: TYPE_LABELS[typeKey] || "манхва",
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      hidden_tags: Array.isArray(raw.hidden_tags) ? raw.hidden_tags : [],
      image: raw.image || "media_cache/avatar.png",
      url: raw.url || BLOG_URL,
      tier: Number(raw.tier || 1),
      price: Number(raw.price || (Number(raw.tier) === 2 ? 500 : 250)),
      total_chapters: totalCh,
      free_chapters: freeCh,
      paid_chapters: paidCh,
      updated: raw.updated || "",
      updatedTs: parseDateValue(raw.updated),
      popularity: Number(raw.popularity || raw.views || 0),
      is_license: Boolean(raw.is_license || Number(raw.tier) === 2),
      is_frozen: Boolean(raw.is_frozen),
      is_romance: Boolean(raw.is_romance),
      is_completed: Boolean(raw.is_completed),
      is_week_new: Boolean(raw.is_week_new || raw.week_range),
      is_month_new: Boolean(raw.is_month_new || raw.month_range || raw.week_range),
      week_range: raw.week_range || "",
      week_post_image: raw.week_post_image || raw.image || "",
      week_post_link: raw.week_post_link || raw.url || BLOG_URL,
      week_chapters_count: Number(raw.week_chapters_count || extractChapterSpan(raw.week_range)),
      month_range: raw.month_range || raw.week_range || "",
      all_posts: posts.map((p) => ({
        title: p.title || raw.title,
        range: p.range || "",
        url: p.url || raw.url || BLOG_URL,
        date: p.date || raw.updated || "",
        is_free: Boolean(p.is_free),
        is_recent: Boolean(p.is_recent),
        tier: Number(p.tier || raw.tier || 1)
      }))
    };
  }

  function populateHeaderAndStats() {
    const total = state.catalog.length;
    const totalBadge = document.getElementById("headerTotalBadge");
    if (totalBadge) totalBadge.textContent = total + " тайтлов";

    const ytBadge = document.getElementById("ytCountBadge");
    if (ytBadge) ytBadge.textContent = state.ytVideos.length;

    const tgBadge = document.getElementById("tgCountBadge");
    if (tgBadge) tgBadge.textContent = state.tgNews.length;

    const paidSubs = Number(state.meta.paid_subscribers || state.meta.subscribers_paid || 176);
    const goalTarget = Number(state.meta.goal_target || 200);
    const pct = Math.min(100, Math.round((paidSubs / Math.max(1, goalTarget)) * 100));
    const left = Math.max(0, goalTarget - paidSubs);

    const goalText = document.getElementById("goalText");
    const goalLeftText = document.getElementById("goalLeftText");
    const goalBar = document.getElementById("goalBar");
    if (goalText) goalText.textContent = `${paidSubs} из ${goalTarget} платных подписчиков (${pct}%)`;
    if (goalLeftText) goalLeftText.textContent = left > 0 ? `— осталось ${left}` : "— цель достигнута!";
    if (goalBar) goalBar.style.width = pct + "%";

    const subsAll = state.meta.total_subscribers || state.meta.followers || "1 436";
    const freeSum = state.catalog.reduce((acc, it) => acc + it.free_chapters, 0);
    const paidSum = state.catalog.reduce((acc, it) => acc + it.paid_chapters, 0);
    const totalSum = state.catalog.reduce((acc, it) => acc + it.total_chapters, 0);

    setText("statSubs", subsAll);
    setText("statTitles", total);
    setText("statFreeCh", freeSum.toLocaleString("ru-RU") + " гл.");
    setText("statPaidCh", paidSum.toLocaleString("ru-RU") + " гл.");
    setText("statTotalCh", totalSum.toLocaleString("ru-RU") + " гл.");

    setText("cntAll", total);
    setText("cntFree", state.catalog.filter((i) => i.free_chapters > 0).length);
    setText("cntTier1", state.catalog.filter((i) => i.tier === 1).length);
    setText("cntTier2", state.catalog.filter((i) => i.tier === 2).length);
    setText("cntCompleted", state.catalog.filter((i) => i.is_completed).length);
    setText("cntRomance", state.catalog.filter((i) => i.is_romance).length);
    setText("cntFrozen", state.catalog.filter((i) => i.is_frozen).length);

    const syncEl = document.getElementById("lastSyncText");
    if (syncEl && state.meta.updated_at) {
      syncEl.textContent = "Обновлено: " + state.meta.updated_at;
    }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function populateGenresAndArchive() {
    const genreCounts = {};
    state.catalog.forEach((item) => {
      item.tags.forEach((tag) => {
        if (!tag) return;
        genreCounts[tag] = (genreCounts[tag] || 0) + 1;
      });
    });

    const sortedGenres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);
    const container = document.getElementById("genreChips");
    if (container) {
      const allChip = `<button type="button" class="genre-chip ${state.genres.length === 0 ? "active" : ""}" data-genre="__all">Все жанры</button>`;
      const chips = sortedGenres.map((g) => {
        const active = state.genres.includes(g) ? "active" : "";
        return `<button type="button" class="genre-chip ${active}" data-genre="${escapeHtml(g)}">${escapeHtml(g)}</button>`;
      }).join("");
      container.innerHTML = allChip + chips;
    }

    const archiveSelect = document.getElementById("monthArchiveSelect");
    if (archiveSelect && state.archiveMonths) {
      Object.keys(state.archiveMonths).forEach((k) => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        archiveSelect.appendChild(opt);
      });
    }
  }

  /* -------------------- RELEASES SHELF -------------------- */
  function getShelfItems(mode) {
    if (mode === "week") {
      return state.catalog.filter((i) => i.is_week_new || i.week_range).slice(0, 24);
    }
    return state.catalog.filter((i) => i.is_month_new || i.month_range).slice(0, 30);
  }

  function renderShelf() {
    const weekItems = getShelfItems("week");
    const monthItems = getShelfItems("month");
    setText("weekCountSpan", weekItems.length);
    setText("monthCountSpan", monthItems.length);

    const items = state.shelfMode === "week" ? weekItems : monthItems;
    const track = document.getElementById("releasesTrack");
    if (!track) return;

    if (items.length === 0) {
      track.innerHTML = `<div class="results-summary" style="padding:8px;">Свежих релизов пока нет.</div>`;
      return;
    }

    track.innerHTML = items.map((item) => {
      const img = state.shelfMode === "week" ? (item.week_post_image || item.image) : item.image;
      const range = state.shelfMode === "week"
        ? (item.week_range ? "Новое: " + item.week_range : item.updated)
        : (item.month_range ? "За месяц: " + item.month_range : item.updated);

      return `
        <button type="button" class="release-mini-card" data-release-id="${item.id}">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(item.title)}" class="release-mini-img" loading="lazy">
          <div class="release-mini-info">
            <div class="release-mini-title">${escapeHtml(item.title)}</div>
            <div class="release-mini-range">${escapeHtml(range)}</div>
          </div>
        </button>
      `;
    }).join("");
  }

  function handleReleaseClick(itemId, mode) {
    const item = state.catalog.find((i) => String(i.id) === String(itemId));
    if (!item) return;

    const span = mode === "week" ? item.week_chapters_count : extractChapterSpan(item.month_range);
    if (span > 10 || item.all_posts.length > 1 || !item.week_post_link) {
      closeModal("mediaFeedModal");
      openChaptersModal(item.id, true);
    } else {
      trackEvent("click_boosty_post", { title: item.title, source: "releases_shelf" });
      window.open(buildUtmUrl(item.week_post_link, item.title), "_blank", "noopener,noreferrer");
    }
  }

  /* -------------------- FILTERING & CATALOG RENDER -------------------- */
  function getFilteredCatalog() {
    const q = state.search.trim().toLowerCase();

    let list = state.catalog.filter((item) => {
      if (state.access === "free" && item.free_chapters <= 0) return false;
      if (state.access === "tier1" && item.tier !== 1) return false;
      if (state.access === "tier2" && item.tier !== 2) return false;

      if (state.type !== "all" && item.type !== state.type) return false;

      if (state.special === "completed" && !item.is_completed) return false;
      if (state.special === "romance" && !item.is_romance) return false;
      if (state.special === "frozen" && !item.is_frozen) return false;

      if (state.genres.length > 0) {
        const hasAll = state.genres.every((g) => item.tags.includes(g));
        if (!hasAll) return false;
      }

      if (q) {
        const haystack = [
          item.title,
          item.typeLabel,
          ...item.tags,
          ...item.hidden_tags
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (state.sort === "popular") {
        if (state.archiveKey !== "current" && state.archiveMonths[state.archiveKey]) {
          const map = state.archiveMonths[state.archiveKey];
          return (Number(map[b.title] || 0)) - (Number(map[a.title] || 0));
        }
        return b.popularity - a.popularity || b.updatedTs - a.updatedTs;
      }
      if (state.sort === "chapters_desc") return b.total_chapters - a.total_chapters;
      if (state.sort === "free_desc") return b.free_chapters - a.free_chapters;
      return b.updatedTs - a.updatedTs;
    });

    return list;
  }

  function renderCatalog() {
    const grid = document.getElementById("catalogGrid");
    const empty = document.getElementById("emptyState");
    const summary = document.getElementById("resultsSummary");
    if (!grid) return;

    const list = getFilteredCatalog();
    grid.classList.toggle("is-list", state.viewMode === "list");

    const counts = { manhwa: 0, manhua: 0, manga: 0 };
    list.forEach((i) => { counts[i.type] = (counts[i.type] || 0) + 1; });

    if (summary) {
      summary.textContent = `Найдено: ${list.length} из ${state.catalog.length} (манхва: ${counts.manhwa}, маньхуа: ${counts.manhua}, манга: ${counts.manga})`;
    }

    updateResetButtonVisibility();

    if (list.length === 0) {
      grid.innerHTML = "";
      if (empty) empty.style.display = "block";
      return;
    }

    if (empty) empty.style.display = "none";

    grid.innerHTML = list.map((item) => {
      const cardClasses = ["title-card"];
      if (item.is_completed) cardClasses.push("card-completed");
      else if (item.is_frozen) cardClasses.push("card-frozen");
      else if (item.is_romance) cardClasses.push("card-romance");

      let statusBadge = "";
      if (item.is_frozen) statusBadge = `<span class="card-badge badge-frozen">Заморожен</span>`;
      else if (item.is_completed) statusBadge = `<span class="card-badge badge-completed">Все главы</span>`;
      else if (item.is_romance) statusBadge = `<span class="card-badge badge-romance">Романтика</span>`;
      else if (item.is_license) statusBadge = `<span class="card-badge badge-license">Лицензия</span>`;

      const freeBadge = item.free_chapters > 0
        ? `<span class="card-bottom-free">Бесплатно: ${item.free_chapters} гл.</span>`
        : "";

      const firstTag = item.tags[0] ? ` • ${escapeHtml(item.tags[0])}` : "";
      const hasFree = item.free_chapters > 0;
      const chaptersText = hasFree
        ? `${item.total_chapters} гл. • <span class="free-hl">${item.free_chapters} бесплатно</span>`
        : `${item.total_chapters} гл. • по подписке`;

      const btnText = hasFree ? "Смотреть главы (есть бесплатные)" : "Выбрать главы";
      const btnClass = hasFree ? "btn-watch-chapters has-free" : "btn-watch-chapters";

      return `
        <article class="${cardClasses.join(" ")}" data-id="${item.id}">
          <div class="card-cover-wrap" data-open-chapters="${item.id}">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="card-cover-img" loading="lazy">
            <div class="card-cover-gradient"></div>
            <div class="card-top-badges">
              <div>${statusBadge}</div>
              <span class="card-badge">${item.total_chapters} гл.</span>
            </div>
            ${freeBadge}
          </div>
          <div class="card-body">
            <div class="card-list-main">
              <h3 class="card-title" data-open-chapters="${item.id}">${escapeHtml(item.title)}</h3>
              <div class="card-meta-line">
                <span class="card-type-pill">${escapeHtml(item.typeLabel)}</span>
                <span>${firstTag.replace(/^ • /, "")}</span>
              </div>
              <div class="card-chapters-line">${chaptersText}</div>
            </div>
            <div class="card-actions">
              <button type="button" class="${btnClass}" data-open-chapters="${item.id}">${btnText}</button>
              <div class="card-footer-row">
                <span>${escapeHtml(item.updated || "")}</span>
                <span class="card-tier-hint">${item.tier} ур. • ${item.price} ₽</span>
                <button type="button" class="card-share-btn" data-share-id="${item.id}">Поделиться</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function updateResetButtonVisibility() {
    const hasFilter =
      state.access !== "all" ||
      state.type !== "all" ||
      state.search.trim() !== "" ||
      state.genres.length > 0 ||
      state.special !== "all";

    const resetBtn = document.getElementById("resetFiltersBtn");
    if (resetBtn) resetBtn.style.display = hasFilter ? "inline-block" : "none";

    const mobileCount =
      (state.access !== "all" ? 1 : 0) +
      (state.type !== "all" ? 1 : 0) +
      (state.special !== "all" ? 1 : 0) +
      state.genres.length;

    const badge = document.getElementById("mobileFilterCountBadge");
    if (badge) {
      badge.textContent = mobileCount;
      badge.style.display = mobileCount > 0 ? "inline-block" : "none";
    }
  }

  function resetAllFilters() {
    state.access = "all";
    state.type = "all";
    state.sort = "newest";
    state.search = "";
    state.genres = [];
    state.special = "all";
    state.archiveKey = "current";
    saveFilters();
    syncControlsFromState();
    renderCatalog();
  }

  function syncControlsFromState() {
    const s1 = document.getElementById("searchInput");
    const s2 = document.getElementById("mobileSearchInput");
    if (s1) s1.value = state.search;
    if (s2) s2.value = state.search;

    const tf = document.getElementById("typeFilter");
    if (tf) tf.value = state.type;

    const sf = document.getElementById("sortFilter");
    if (sf) sf.value = state.sort;

    document.querySelectorAll("#accessTabs .access-tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.access === state.access);
    });

    document.querySelectorAll("#specialTabs .special-tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.special === state.special);
    });

    document.querySelectorAll("#genreChips .genre-chip").forEach((b) => {
      if (b.dataset.genre === "__all") {
        b.classList.toggle("active", state.genres.length === 0);
      } else {
        b.classList.toggle("active", state.genres.includes(b.dataset.genre));
      }
    });

    ["viewGridBtn", "viewGridBtnDesktop"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("active", state.viewMode === "grid");
    });
    ["viewListBtn", "viewListBtnDesktop"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("active", state.viewMode === "list");
    });
  }

  /* -------------------- MODALS: CHAPTERS, YT, TG, MEDIA FEED -------------------- */
  function openChaptersModal(itemId, highlightRecent) {
    const item = state.catalog.find((i) => String(i.id) === String(itemId));
    if (!item) return;

    const body = document.getElementById("chaptersModalBody");
    if (!body) return;

    const posts = item.all_posts.length > 0
      ? item.all_posts
      : [{
          title: item.title,
          range: item.total_chapters ? `1-${item.total_chapters} гл.` : "Все выпуски",
          url: item.url,
          date: item.updated,
          is_free: item.free_chapters > 0,
          is_recent: item.is_week_new,
          tier: item.tier
        }];

    const latestPost = posts[posts.length - 1];
    const bundleUrl = buildUtmUrl(item.url, item.title);
    const latestUrl = buildUtmUrl(latestPost.url, item.title);
    const tierData = TIER_INFO[String(item.tier)] || TIER_INFO["1"];

    const rowsHtml = posts.map((p) => {
      const postUrl = buildUtmUrl(p.url, item.title);
      const isFree = p.is_free;
      const rowCls = `chapter-row ${isFree ? "is-free" : "is-paid"} ${(highlightRecent && p.is_recent) ? "is-recent" : ""}`;
      const newBadge = (highlightRecent && p.is_recent) ? `<span class="chapter-new-tag">Новое</span>` : "";
      const btnCls = `chapter-row-btn ${isFree ? "free-btn" : "paid-btn"}`;
      const btnLabel = isFree ? "Смотреть бесплатно ↗" : `🔒 По подписке (${p.tier} ур.) ↗`;
      const ymEv = isFree ? "click_free_chapters" : "click_boosty_post";

      return `
        <a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer" class="${rowCls}" data-ym-event="${ymEv}" data-ym-title="${escapeHtml(item.title)}">
          <div class="chapter-row-main">
            <div class="chapter-row-title">
              <span>${escapeHtml(p.range ? p.range + " — " + p.title : p.title)}</span>
              ${newBadge}
            </div>
            <div class="chapter-row-meta">Опубликовано: ${escapeHtml(p.date || item.updated || "—")} • ${isFree ? "Доступно всем без подписки" : `Нужен ${p.tier} уровень на Boosty`}</div>
          </div>
          <span class="${btnCls}">${btnLabel}</span>
        </a>
      `;
    }).join("");

    const paidNotice = item.paid_chapters > 0
      ? `<div class="chapters-subscribe-banner">
           <span>Платные выпуски (${item.paid_chapters} гл.) открываются сразу после оформления ${item.tier} уровня (${item.price} ₽/мес).</span>
           <a href="${escapeHtml(tierData.url)}" target="_blank" rel="noopener noreferrer" class="btn-primary" data-ym-event="${tierData.ymEvent}">Подписаться • ${item.price} ₽</a>
         </div>`
      : "";

    body.innerHTML = `
      <div class="chapters-hero">
        <div class="chapters-cover-box">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
        </div>
        <div class="chapters-hero-info">
          <div class="chapters-hero-badges">
            <span class="card-type-pill">${escapeHtml(item.typeLabel)}</span>
            <span class="meta-pill">Всего: ${item.total_chapters} гл.</span>
          </div>
          <h2 id="chaptersModalTitle">${escapeHtml(item.title)}</h2>
          <p class="chapters-hero-sub">Бесплатно: ${item.free_chapters} гл. • По подписке: ${item.paid_chapters} гл.</p>
        </div>
      </div>

      <div class="chapters-quick-actions">
        <a href="${escapeHtml(latestUrl)}" target="_blank" rel="noopener noreferrer" class="btn-primary btn-full" data-ym-event="click_boosty_post" data-ym-title="${escapeHtml(item.title)}">
          Свежий выпуск (${escapeHtml(latestPost.range || "последний")}) ↗
        </a>
        <a href="${escapeHtml(bundleUrl)}" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-full">
          Весь плейлист (бандл) ↗
        </a>
      </div>

      <div class="chapters-list-title">Выпуски по главам (зелёные — бесплатные, с замком — по подписке):</div>
      <div class="chapters-list">${rowsHtml}</div>
      ${paidNotice}
    `;

    openModal("chaptersModal");
  }

  function openYtModal() {
    trackEvent("open_yt_modal");
    const grid = document.getElementById("ytVideosGrid");
    if (grid) {
      if (state.ytVideos.length === 0) {
        grid.innerHTML = `<p class="modal-text">Видео пока не загружены.</p>`;
      } else {
        grid.innerHTML = state.ytVideos.map((v) => {
          const chRange = v.chapters_range || extractChaptersFromTitle(v.title);
          return `
            <article class="yt-video-card">
              <div class="yt-thumb-wrap">
                <img src="${escapeHtml(v.thumbnail || v.image || "media_cache/avatar.png")}" alt="${escapeHtml(v.title)}" loading="lazy">
              </div>
              <div class="yt-card-body">
                <div class="yt-card-meta">
                  <span>${escapeHtml(v.date || "")}</span>
                  <span>${escapeHtml(chRange ? "Главы: " + chRange : "")}</span>
                </div>
                <h3 class="yt-card-title">${escapeHtml(v.title)}</h3>
                <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" class="yt-watch-btn">Смотреть на YouTube ↗</a>
              </div>
            </article>
          `;
        }).join("");
      }
    }
    openModal("ytModal");
  }

  function openTgModal() {
    trackEvent("open_tg_modal");
    const grid = document.getElementById("tgPostsGrid");
    if (grid) {
      if (state.tgNews.length === 0) {
        grid.innerHTML = `<p class="modal-text">Посты пока не загружены.</p>`;
      } else {
        grid.innerHTML = state.tgNews.map((post, idx) => `
          <button type="button" class="tg-post-card" data-tg-idx="${idx}">
            ${post.image ? `<img src="${escapeHtml(post.image)}" alt="" class="tg-post-thumb" loading="lazy">` : ""}
            <div class="tg-post-preview">
              <div class="tg-post-date">${escapeHtml(post.date || "")} • Читать на сайте</div>
              <div class="tg-post-snippet">${escapeHtml(post.text || "")}</div>
            </div>
          </button>
        `).join("");
      }
    }
    openModal("tgModal");
  }

  function openTgPostReader(idx) {
    const post = state.tgNews[idx];
    if (!post) return;
    const body = document.getElementById("tgPostReaderBody");
    if (!body) return;

    const mediaHtml = post.image
      ? `<div class="tg-reader-media">
           <div class="tg-reader-bg" style="background-image: url('${escapeHtml(post.image)}')"></div>
           <img src="${escapeHtml(post.image)}" alt="Изображение поста">
         </div>`
      : "";

    body.innerHTML = `
      <div class="tg-post-date" style="margin-bottom:10px;">${escapeHtml(post.date || "")} • Telegram-канал ТАКА</div>
      ${mediaHtml}
      <div class="tg-reader-text">${escapeHtml(post.text || "")}</div>
    `;
    openModal("tgPostReaderModal");
  }

  function openMediaFeedModal() {
    renderMediaFeedGrid();
    openModal("mediaFeedModal");
  }

  function renderMediaFeedGrid() {
    const grid = document.getElementById("mediaFeedGrid");
    if (!grid) return;

    const mode = state.modalShelfMode;
    const items = getShelfItems(mode);

    document.getElementById("modalTabWeekBtn")?.classList.toggle("active", mode === "week");
    document.getElementById("modalTabMonthBtn")?.classList.toggle("active", mode === "month");

    if (items.length === 0) {
      grid.innerHTML = `<p class="modal-text">Новинок за этот период нет.</p>`;
      return;
    }

    grid.innerHTML = items.map((item) => {
      const img = mode === "week" ? (item.week_post_image || item.image) : item.image;
      const rangeText = mode === "week"
        ? (item.week_range ? `Вышло за неделю: ${item.week_range}` : "Свежее обновление")
        : (item.month_range ? `Вышло за месяц: ${item.month_range}` : "Обновление за месяц");

      return `
        <button type="button" class="media-feed-card" data-feed-id="${item.id}">
          <div class="media-feed-cover">
            <div class="media-feed-blur-bg" style="background-image: url('${escapeHtml(img)}')"></div>
            <img src="${escapeHtml(img)}" alt="${escapeHtml(item.title)}" loading="lazy">
          </div>
          <div class="media-feed-info">
            <div class="media-feed-date">${escapeHtml(item.updated || "")}</div>
            <div class="media-feed-title">${escapeHtml(item.title)}</div>
            <div class="media-feed-sub">${escapeHtml(rangeText)}</div>
          </div>
        </button>
      `;
    }).join("");
  }

  function openTierInfoModal(tierKey) {
    const info = TIER_INFO[String(tierKey)];
    const body = document.getElementById("tierInfoBody");
    if (!info || !body) return;

    body.innerHTML = `
      <h2 class="modal-title-sm">${escapeHtml(info.title)}</h2>
      <p class="modal-text">${escapeHtml(info.desc)}</p>
      <a href="${escapeHtml(info.url)}" target="_blank" rel="noopener noreferrer" class="btn-primary btn-full" data-ym-event="${info.ymEvent}">
        Оформить на Boosty ↗
      </a>
    `;
    openModal("tierInfoModal");
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
    const anyOpen = Array.from(document.querySelectorAll(".modal-backdrop")).some((m) => m.style.display === "flex");
    if (!anyOpen) document.body.style.overflow = "";
  }

  /* -------------------- CONVERSION TOAST & CAT WIDGET -------------------- */
  function initConversionTriggers() {
    setTimeout(() => {
      if (sessionStorage.getItem("taka_toast_closed")) return;
      const toast = document.getElementById("conversionPushToast");
      const content = document.getElementById("toastContent");
      if (!toast || !content) return;

      content.innerHTML = `
        <strong>Оптимальный доступ к каталогу</strong>
        Откройте все ${state.catalog.length} тайтлов, закрытые Лицензии и чат всего за 500 ₽/мес.
        <a href="${TIER_INFO["2"].url}" target="_blank" rel="noopener noreferrer" data-ym-event="click_tariff_500">Открыть всё • 500 ₽</a>
      `;
      toast.style.display = "block";
    }, 18000);
  }

  /* -------------------- ONBOARDING TOUR (4 STEPS) -------------------- */
  const TOUR_STEPS = [
    {
      selector: "#openYtModalBtn",
      title: "Ролики YouTube и новости ТГ",
      text: "Свежие видео с YouTube и посты из Telegram открываются прямо здесь в один клик."
    },
    {
      selector: "#releasesSection",
      title: "Лента новинок",
      text: "Переключайтесь между новинками за неделю и месяц или откройте ленту с обложками."
    },
    {
      selector: ".filters-panel",
      mobileSelector: ".mobile-filter-bar",
      title: "Удобный поиск и фильтры",
      text: "Ищите по названию или жанру. Нажмите «Ещё фильтры» для коллекций Сакуры, Завершённых и Замороженных."
    },
    {
      selector: ".catalog-grid",
      title: "Выбор глав внутри тайтла",
      text: "Нажмите на любую карточку — откроется список выпусков. Зелёные главы доступны бесплатно!"
    }
  ];

  let tourIndex = 0;

  function maybeStartFirstTour() {
    try {
      if (!localStorage.getItem(TOUR_DONE_KEY)) {
        setTimeout(() => startTour(), 900);
      }
    } catch (_) {}
  }

  function startTour() {
    tourIndex = 0;
    renderTourStep();
  }

  function renderTourStep() {
    const overlay = document.getElementById("tourOverlay");
    const spotlight = document.getElementById("tourSpotlight");
    const tooltip = document.getElementById("tourTooltip");
    if (!overlay || !spotlight || !tooltip) return;

    if (tourIndex >= TOUR_STEPS.length) {
      endTour();
      return;
    }

    const step = TOUR_STEPS[tourIndex];
    const sel = (window.innerWidth <= 768 && step.mobileSelector) ? step.mobileSelector : step.selector;
    const target = document.querySelector(sel);

    if (!target) {
      tourIndex++;
      renderTourStep();
      return;
    }

    overlay.style.display = "block";
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      spotlight.style.top = Math.max(4, rect.top - 4) + "px";
      spotlight.style.left = Math.max(4, rect.left - 4) + "px";
      spotlight.style.width = (rect.width + 8) + "px";
      spotlight.style.height = (rect.height + 8) + "px";

      if (window.innerWidth > 768) {
        const topPos = rect.bottom + 14 + 170 < window.innerHeight ? rect.bottom + 14 : Math.max(16, rect.top - 180);
        tooltip.style.top = topPos + "px";
        tooltip.style.left = Math.min(window.innerWidth - 330, Math.max(16, rect.left)) + "px";
      }

      setText("tourStepBadge", `Шаг ${tourIndex + 1} из ${TOUR_STEPS.length}`);
      setText("tourTitle", step.title);
      setText("tourText", step.text);
      setText("tourNextBtn", tourIndex === TOUR_STEPS.length - 1 ? "Готово" : "Далее");
    }, 260);
  }

  function endTour() {
    const overlay = document.getElementById("tourOverlay");
    if (overlay) overlay.style.display = "none";
    try { localStorage.setItem(TOUR_DONE_KEY, "1"); } catch (_) {}
  }

  /* -------------------- EVENT LISTENERS -------------------- */
  function bindEvents() {
    const themeBtn = document.getElementById("themeToggleBtn");
    if (localStorage.getItem(THEME_KEY) === "light") {
      document.body.classList.add("theme-light");
      if (themeBtn) themeBtn.textContent = "Тёплая";
    }
    themeBtn?.addEventListener("click", () => {
      const isLight = document.body.classList.toggle("theme-light");
      themeBtn.textContent = isLight ? "Тёплая" : "Тёмная";
      try { localStorage.setItem(THEME_KEY, isLight ? "light" : "dark"); } catch (_) {}
    });

    document.getElementById("openYtModalBtn")?.addEventListener("click", openYtModal);
    document.getElementById("openTgModalBtn")?.addEventListener("click", openTgModal);
    document.getElementById("orderVoiceBtn")?.addEventListener("click", () => openModal("orderModal"));
    document.getElementById("openMediaFeedBtn")?.addEventListener("click", openMediaFeedModal);
    document.getElementById("startTourBtn")?.addEventListener("click", startTour);

    document.getElementById("tabWeekBtn")?.addEventListener("click", () => {
      state.shelfMode = "week";
      document.getElementById("tabWeekBtn")?.classList.add("active");
      document.getElementById("tabMonthBtn")?.classList.remove("active");
      renderShelf();
    });
    document.getElementById("tabMonthBtn")?.addEventListener("click", () => {
      state.shelfMode = "month";
      document.getElementById("tabMonthBtn")?.classList.add("active");
      document.getElementById("tabWeekBtn")?.classList.remove("active");
      renderShelf();
    });

    const track = document.getElementById("releasesTrack");
    document.getElementById("shelfPrevBtn")?.addEventListener("click", () => {
      track?.scrollBy({ left: -520, behavior: "smooth" });
    });
    document.getElementById("shelfNextBtn")?.addEventListener("click", () => {
      track?.scrollBy({ left: 520, behavior: "smooth" });
    });

    document.getElementById("modalTabWeekBtn")?.addEventListener("click", () => {
      state.modalShelfMode = "week";
      renderMediaFeedGrid();
    });
    document.getElementById("modalTabMonthBtn")?.addEventListener("click", () => {
      state.modalShelfMode = "month";
      renderMediaFeedGrid();
    });

    document.getElementById("mobileFiltersToggle")?.addEventListener("click", () => {
      document.getElementById("filtersPanel")?.classList.toggle("mobile-open");
    });

    const onSearch = (val) => {
      state.search = val;
      const s1 = document.getElementById("searchInput");
      const s2 = document.getElementById("mobileSearchInput");
      if (s1 && s1.value !== val) s1.value = val;
      if (s2 && s2.value !== val) s2.value = val;
      saveFilters();
      renderCatalog();
    };
    document.getElementById("searchInput")?.addEventListener("input", (e) => onSearch(e.target.value));
    document.getElementById("mobileSearchInput")?.addEventListener("input", (e) => onSearch(e.target.value));

    document.getElementById("typeFilter")?.addEventListener("change", (e) => {
      state.type = e.target.value;
      saveFilters();
      renderCatalog();
    });
    document.getElementById("sortFilter")?.addEventListener("change", (e) => {
      state.sort = e.target.value;
      saveFilters();
      renderCatalog();
    });
    document.getElementById("monthArchiveSelect")?.addEventListener("change", (e) => {
      state.archiveKey = e.target.value;
      if (state.archiveKey !== "current") {
        state.sort = "popular";
        const sf = document.getElementById("sortFilter");
        if (sf) sf.value = "popular";
      }
      renderCatalog();
    });

    document.getElementById("moreFiltersBtn")?.addEventListener("click", () => {
      const drawer = document.getElementById("extraFiltersDrawer");
      const btn = document.getElementById("moreFiltersBtn");
      if (!drawer) return;
      const open = drawer.style.display === "none";
      drawer.style.display = open ? "flex" : "none";
      btn?.classList.toggle("active", open);
    });

    document.getElementById("resetFiltersBtn")?.addEventListener("click", resetAllFilters);
    document.getElementById("emptyResetBtn")?.addEventListener("click", resetAllFilters);

    const setView = (mode) => {
      state.viewMode = mode;
      saveFilters();
      syncControlsFromState();
      renderCatalog();
    };
    document.getElementById("viewGridBtn")?.addEventListener("click", () => setView("grid"));
    document.getElementById("viewListBtn")?.addEventListener("click", () => setView("list"));
    document.getElementById("viewGridBtnDesktop")?.addEventListener("click", () => setView("grid"));
    document.getElementById("viewListBtnDesktop")?.addEventListener("click", () => setView("list"));

    document.addEventListener("click", (e) => {
      const ymTarget = e.target.closest("[data-ym-event]");
      if (ymTarget) {
        trackEvent(ymTarget.dataset.ymEvent, { title: ymTarget.dataset.ymTitle || "" });
      }

      const closeTarget = e.target.closest("[data-close-modal]");
      if (closeTarget) {
        closeModal(closeTarget.dataset.closeModal);
        return;
      }
      if (e.target.classList.contains("modal-backdrop")) {
        closeModal(e.target.id);
        return;
      }

      const accBtn = e.target.closest("#accessTabs .access-tab");
      if (accBtn) {
        state.access = accBtn.dataset.access;
        saveFilters();
        syncControlsFromState();
        renderCatalog();
        return;
      }

      const spBtn = e.target.closest("#specialTabs .special-tab");
      if (spBtn) {
        state.special = spBtn.dataset.special;
        saveFilters();
        syncControlsFromState();
        renderCatalog();
        return;
      }

      const genreBtn = e.target.closest("#genreChips .genre-chip");
      if (genreBtn) {
        const g = genreBtn.dataset.genre;
        if (g === "__all") {
          state.genres = [];
        } else if (state.genres.includes(g)) {
          state.genres = state.genres.filter((x) => x !== g);
        } else {
          state.genres = [...state.genres, g];
        }
        saveFilters();
        syncControlsFromState();
        renderCatalog();
        return;
      }

      const tierBtn = e.target.closest(".tier-help-btn");
      if (tierBtn) {
        openTierInfoModal(tierBtn.dataset.tier);
        return;
      }

      const shareBtn = e.target.closest("[data-share-id]");
      if (shareBtn) {
        const item = state.catalog.find((i) => String(i.id) === String(shareBtn.dataset.shareId));
        if (item) {
          const shareUrl = buildUtmUrl(item.url, item.title);
          navigator.clipboard?.writeText(shareUrl).catch(() => {});
          const orig = shareBtn.textContent;
          shareBtn.textContent = "Скопировано!";
          setTimeout(() => { shareBtn.textContent = orig; }, 1400);
        }
        return;
      }

      const chTrigger = e.target.closest("[data-open-chapters]");
      if (chTrigger) {
        openChaptersModal(chTrigger.dataset.openChapters, false);
        return;
      }

      const relCard = e.target.closest("[data-release-id]");
      if (relCard) {
        handleReleaseClick(relCard.dataset.releaseId, state.shelfMode);
        return;
      }

      const feedCard = e.target.closest("[data-feed-id]");
      if (feedCard) {
        handleReleaseClick(feedCard.dataset.feedId, state.modalShelfMode);
        return;
      }

      const tgCard = e.target.closest("[data-tg-idx]");
      if (tgCard) {
        openTgPostReader(Number(tgCard.dataset.tgIdx));
        return;
      }
    });

    document.getElementById("toastCloseBtn")?.addEventListener("click", () => {
      const t = document.getElementById("conversionPushToast");
      if (t) t.style.display = "none";
      sessionStorage.setItem("taka_toast_closed", "1");
    });

    document.getElementById("tourSkipBtn")?.addEventListener("click", endTour);
    document.getElementById("tourNextBtn")?.addEventListener("click", () => {
      tourIndex++;
      renderTourStep();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        endTour();
        const openModals = Array.from(document.querySelectorAll(".modal-backdrop")).filter((m) => m.style.display === "flex");
        if (openModals.length > 0) {
          closeModal(openModals[openModals.length - 1].id);
        }
      }
    });
  }

  /* -------------------- INIT -------------------- */
  checkGeoRestriction();
  loadSavedFilters();
  initAmbient();
  bindEvents();
  loadCatalog();
})();
