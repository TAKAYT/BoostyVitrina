/* ТАКА — Каталог озвучки манги (строгий матчинг, NaN/0-фикс, фильтры, модалки) */
(function () {
  "use strict";

  const BLOG_URL = "https://boosty.to/darktaka";
  const STORAGE_KEY = "taka_vitrina_filters_v3";
  const TOUR_DONE_KEY = "taka_tour_completed_v3";
  const THEME_KEY = "taka_theme_v3";

  const TYPE_LABELS = {
    manhwa: "манхва",
    manhua: "маньхуа",
    manga: "манга"
  };

  const DEFAULT_TIERS = [
    {
      tier: 1,
      kicker: "1 уровень • Базовый",
      title: "Доступ к базе озвучки",
      price: 250,
      old_price: 0,
      discount: "",
      url: "https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link",
      btnText: "Открыть базу • 250 ₽/мес",
      ymEvent: "click_tariff_250",
      featured: false
    },
    {
      tier: 2,
      kicker: "2 уровень • Оптимальный выбор",
      title: "Всё включено + Лицензии",
      price: 500,
      old_price: 0,
      discount: "",
      url: "https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link",
      btnText: "Открыть все тайтлы • 500 ₽/мес",
      ymEvent: "click_tariff_500",
      featured: true
    },
    {
      tier: 3,
      kicker: "3 уровень • Ускорение",
      title: "Максимальная поддержка",
      price: 1000,
      old_price: 0,
      discount: "",
      url: "https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link",
      btnText: "Поддержать • 1 000 ₽/мес",
      ymEvent: "click_tariff_1000",
      featured: false
    }
  ];

  const state = {
    catalog: [],
    meta: {},
    tiers: DEFAULT_TIERS,
    ytVideos: [],
    tgNews: [],
    archiveMonths: {},
    typeOverrides: {},
    specialTitles: {
      frozen_titles: [],
      romance_sakura: [],
      completed_titles: [],
      hidden_tags_overrides: {}
    },
    access: "all",
    type: "all",
    sort: "newest",
    search: "",
    genres: [],
    special: "all",
    archiveKey: "current",
    viewMode: "grid",
    shelfMode: "week",
    modalShelfMode: "week",
    referenceNow: Date.now()
  };

  /* -------------------- HELPERS -------------------- */
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

  function strictNormalize(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/\d+\s*[-–]\s*\d+\s*(?:гл|глав\w*)/gi, "")
      .replace(/[^a-zа-я0-9]/gi, "");
  }

  function parseTier(val) {
    if (typeof val === "number" && !Number.isNaN(val) && val > 0) return val;
    const num = parseInt(String(val || "").replace(/\D/g, ""), 10);
    return num > 0 && num <= 5 ? num : 1;
  }

  function normalizeTypeKey(rawType) {
    const s = String(rawType || "").trim().toLowerCase();
    if (s === "manhua" || s === "маньхуа") return "manhua";
    if (s === "manga" || s === "манга") return "manga";
    if (s === "manhwa" || s === "манхва") return "manhwa";
    return "manhwa";
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

  /* -------------------- GEO-BLOCK -------------------- */
  function checkGeoRestriction() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const lang = (navigator.language || "").toLowerCase();
      if (/seoul|tokyo|shanghai|beijing|hong_kong|taipei/i.test(tz) || /^(ko|ja|zh)\b/.test(lang)) {
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

  /* -------------------- AVATAR FALLBACK -------------------- */
  function setupAvatar(avatarUrl) {
    const img = document.getElementById("heroAvatarImg");
    const fb = document.getElementById("heroAvatarFallback");
    if (!img || !fb) return;

    const candidates = [
      avatarUrl,
      "media_cache/avatar.png",
      "media_cache/avatar.jpg",
      "avatar.png",
      "avatar.jpg"
    ].filter(Boolean);

    let idx = 0;
    function tryNext() {
      if (idx >= candidates.length) {
        img.style.display = "none";
        fb.style.display = "flex";
        return;
      }
      img.src = candidates[idx++];
    }

    img.onerror = tryNext;
    tryNext();
  }

  /* -------------------- DATA LOADING -------------------- */
  async function fetchJsonOptional(path) {
    try {
      const r = await fetch(path + "?v=" + Date.now());
      if (r.ok) return await r.json();
    } catch (_) {}
    return null;
  }

  async function loadCatalog() {
    const summary = document.getElementById("resultsSummary");
    if (window.location.protocol === "file:") {
      if (summary) {
        summary.textContent = "Локальный режим (file://): браузер блокирует JSON. Открой через GitHub Pages или локальный сервер.";
      }
      setupAvatar();
      return;
    }

    let data = await fetchJsonOptional("catalog.json");
    if (!data) data = await fetchJsonOptional("data.json");

    if (!data) {
      if (summary) summary.textContent = "Ошибка загрузки каталога (catalog.json / data.json не найден).";
      setupAvatar();
      return;
    }

    const [typeOv, specOv, ytExtra, tgExtra] = await Promise.all([
      fetchJsonOptional("type_overrides.json"),
      fetchJsonOptional("special_titles.json"),
      fetchJsonOptional("youtube.json"),
      fetchJsonOptional("news_tg.json")
    ]);

    if (typeOv) {
      Object.entries(typeOv).forEach(([k, v]) => {
        if (!k.startsWith("_") && v) {
          state.typeOverrides[strictNormalize(k)] = normalizeTypeKey(v);
        }
      });
    }

    if (specOv) {
      state.specialTitles.frozen_titles = (specOv.frozen_titles || []).map(strictNormalize);
      state.specialTitles.romance_sakura = (specOv.romance_sakura || []).map(strictNormalize);
      state.specialTitles.completed_titles = (specOv.completed_titles || []).map(strictNormalize);
      if (specOv.hidden_tags_overrides) {
        Object.entries(specOv.hidden_tags_overrides).forEach(([k, v]) => {
          state.specialTitles.hidden_tags_overrides[strictNormalize(k)] = Array.isArray(v) ? v : [String(v)];
        });
      }
    }

    state.meta = Array.isArray(data) ? {} : (data.meta || data);
    if (state.meta.updated_at) {
      const parsedMetaTs = parseDateValue(state.meta.updated_at);
      if (parsedMetaTs > 0) state.referenceNow = parsedMetaTs;
    }

    const items = Array.isArray(data) ? data : (data.items || data.catalog || []);
    state.catalog = items.map((item, idx) => normalizeItem(item, idx));

    state.ytVideos = data.yt_videos || data.youtube || state.meta.yt_videos || ytExtra || [];
    state.tgNews = data.tg_news || data.tg_posts || state.meta.tg_news || tgExtra || [];
    state.archiveMonths = data.popularity_archive || state.meta.popularity_archive || {};

    setupAvatar(state.meta.avatar || state.meta.avatar_url || state.meta.blog_avatar);
    syncTiersFromMeta();
    renderTiers();
    populateHeaderAndStats();
    populateGenresAndArchive();
    syncControlsFromState();
    renderShelf();
    renderCatalog();
    initConversionTriggers();
    maybeStartFirstTour();
  }

  function normalizeItem(raw, idx) {
    const title = raw.title || "Без названия";
    const norm = strictNormalize(title);

    const posts = Array.isArray(raw.all_posts) ? raw.all_posts : [];
    const freeCh = Number(raw.free_chapters) || 0;
    let paidCh = Number(raw.paid_chapters) || 0;
    const postsSum = posts.reduce((acc, p) => acc + extractChapterSpan(p.range), 0);
    const totalCh = Math.max(
      Number(raw.total_chapters || raw.chapters_total || raw.chapters_count || 0),
      freeCh + paidCh,
      postsSum
    );
    if (paidCh === 0 && totalCh > freeCh) {
      paidCh = totalCh - freeCh;
    }

    const tier = parseTier(raw.tier);
    const price = Number(raw.price) || (tier === 2 ? 500 : tier === 3 ? 1000 : 250);

    // 100% приоритет type_overrides.json, затем нормализация из JSON
    const typeKey = state.typeOverrides[norm] || normalizeTypeKey(raw.type);

    // 100% приоритет special_titles.json + JSON флаги
    const isFrozen = Boolean(raw.is_frozen) || state.specialTitles.frozen_titles.includes(norm);
    const isRomance = Boolean(raw.is_romance) || state.specialTitles.romance_sakura.includes(norm);
    const isCompleted = Boolean(raw.is_completed) || state.specialTitles.completed_titles.includes(norm);

    const baseHidden = Array.isArray(raw.hidden_tags) ? raw.hidden_tags : [];
    const ovHidden = state.specialTitles.hidden_tags_overrides[norm] || [];
    const hiddenTags = Array.from(new Set([...baseHidden, ...ovHidden]));

    const updatedTs = parseDateValue(raw.updated);
    const daysAgo = updatedTs > 0 ? (state.referenceNow - updatedTs) / 86400000 : 9999;

    const isWeekNew = updatedTs > 0 ? (daysAgo <= 7 && Boolean(raw.week_range || raw.is_week_new)) : Boolean(raw.is_week_new);
    const isMonthNew = updatedTs > 0 ? (daysAgo <= 31) : Boolean(raw.is_month_new);

    return {
      id: raw.id || idx,
      slug: translitSlug(title),
      title,
      type: typeKey,
      typeLabel: TYPE_LABELS[typeKey] || "манхва",
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      hidden_tags: hiddenTags,
      image: raw.image || "media_cache/avatar.png",
      url: raw.url || BLOG_URL,
      tier,
      price,
      total_chapters: totalCh,
      free_chapters: freeCh,
      paid_chapters: paidCh,
      updated: raw.updated || "",
      updatedTs,
      popularity: Number(raw.popularity || raw.views || 0),
      is_license: Boolean(raw.is_license || tier === 2),
      is_frozen: isFrozen,
      is_romance: isRomance,
      is_completed: isCompleted,
      is_week_new: isWeekNew,
      is_month_new: isMonthNew,
      week_range: raw.week_range || "",
      week_post_image: raw.week_post_image || raw.post_image || raw.image || "",
      week_post_link: raw.week_post_link || raw.url || BLOG_URL,
      week_chapters_count: Number(raw.week_chapters_count || extractChapterSpan(raw.week_range)),
      month_range: raw.month_range || raw.week_range || "",
      all_posts: posts.map((p) => ({
        title: p.title || title,
        range: p.range || "",
        url: p.url || raw.url || BLOG_URL,
        date: p.date || raw.updated || "",
        is_free: Boolean(p.is_free),
        is_recent: Boolean(p.is_recent),
        tier: parseTier(p.tier || tier)
      }))
    };
  }

  /* -------------------- TIERS (DYNAMIC + DISCOUNTS, NO DESCRIPTIONS) -------------------- */
  function syncTiersFromMeta() {
    const rawTiers = state.meta.tiers;
    if (!Array.isArray(rawTiers) || rawTiers.length === 0) return;

    state.tiers = DEFAULT_TIERS.map((def) => {
      const found = rawTiers.find((t) => parseTier(t.tier || t.level || t.id) === def.tier);
      if (!found) return def;
      const price = Number(found.price) || def.price;
      const oldPrice = Number(found.old_price || found.original_price || 0);
      const discount = found.discount || (oldPrice > price ? `-${Math.round((1 - price / oldPrice) * 100)}%` : "");
      return {
        ...def,
        title: found.name || found.title || def.title,
        price,
        old_price: oldPrice,
        discount,
        url: found.url || def.url,
        btnText: `${def.tier === 2 ? "Открыть все" : "Подписаться"} • ${price.toLocaleString("ru-RU")} ₽/мес`
      };
    });
  }

  function renderTiers() {
    const grid = document.getElementById("tiersGrid");
    if (!grid) return;

    grid.innerHTML = state.tiers.map((t) => {
      const discountBadge = t.discount ? `<span class="tier-discount-badge">${escapeHtml(t.discount)}</span>` : "";
      const oldPriceHtml = t.old_price > t.price ? `<span class="tier-old-price">${t.old_price.toLocaleString("ru-RU")} ₽</span>` : "";

      return `
        <div class="tier-box ${t.featured ? "tier-box-featured" : ""}">
          <div class="tier-box-head">
            <div>
              <span class="tier-kicker ${t.featured ? "tier-kicker-hot" : ""}">${escapeHtml(t.kicker)}</span>
              <h3>${escapeHtml(t.title)}</h3>
            </div>
            ${discountBadge}
          </div>
          <div class="tier-price-row">
            ${oldPriceHtml}
          </div>
          <a href="${escapeHtml(t.url)}" target="_blank" rel="noopener noreferrer" class="tier-cta-btn ${t.featured ? "tier-cta-featured" : ""}" data-ym-event="${t.ymEvent}">
            ${escapeHtml(t.btnText)}
          </a>
        </div>
      `;
    }).join("");
  }

  function populateHeaderAndStats() {
    const total = state.catalog.length;
    setText("headerTotalBadge", total + " тайтлов");
    setText("ytCountBadge", state.ytVideos.length);
    setText("tgCountBadge", state.tgNews.length);

    const paidSubs = Number(state.meta.paid_subscribers || state.meta.subscribers_paid || 176);
    const goalTarget = Number(state.meta.goal_target || 200);
    const pct = Math.min(100, Math.round((paidSubs / Math.max(1, goalTarget)) * 100));
    const left = Math.max(0, goalTarget - paidSubs);

    setText("goalText", `${paidSubs} из ${goalTarget} платных подписчиков (${pct}%)`);
    setText("goalLeftText", left > 0 ? `— осталось ${left}` : "— цель достигнута!");
    const goalBar = document.getElementById("goalBar");
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

    if (state.meta.updated_at) {
      setText("lastSyncText", "Обновлено: " + state.meta.updated_at);
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
      return state.catalog
        .filter((i) => i.is_week_new)
        .sort((a, b) => b.updatedTs - a.updatedTs)
        .slice(0, 24);
    }
    return state.catalog
      .filter((i) => i.is_month_new)
      .sort((a, b) => b.updatedTs - a.updatedTs)
      .slice(0, 32);
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
      track.innerHTML = `<div class="results-summary" style="padding:8px;">Свежих релизов за выбранный период нет.</div>`;
      return;
    }

    track.innerHTML = items.map((item) => {
      const img = state.shelfMode === "week" ? (item.week_post_image || item.image) : item.image;
      const range = state.shelfMode === "week"
        ? (item.week_range ? "Новое: " + item.week_range : item.updated)
        : (item.month_range ? "За месяц: " + item.month_range : item.updated);

      return `
        <button type="button" class="release-mini-card" data-release-id="${item.id}">
          <img src="${escapeHtml(img)}" data-fallback="${escapeHtml(item.image)}" onerror="this.onerror=null;this.src=this.dataset.fallback;" alt="${escapeHtml(item.title)}" class="release-mini-img" loading="lazy" decoding="async">
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

    const list = state.catalog.filter((item) => {
      if (state.access === "free" && item.free_chapters <= 0) return false;
      if (state.access === "tier1" && item.tier !== 1) return false;
      if (state.access === "tier2" && item.tier !== 2) return false;
      if (state.type !== "all" && item.type !== state.type) return false;
      if (state.special === "completed" && !item.is_completed) return false;
      if (state.special === "romance" && !item.is_romance) return false;
      if (state.special === "frozen" && !item.is_frozen) return false;

      if (state.genres.length > 0 && !state.genres.every((g) => item.tags.includes(g))) {
        return false;
      }

      if (q) {
        const haystack = [item.title, item.typeLabel, ...item.tags, ...item.hidden_tags].join(" ").toLowerCase();
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

      const firstTag = item.tags[0] ? escapeHtml(item.tags[0]) : "";
      const hasFree = item.free_chapters > 0;
      const chaptersText = hasFree
        ? `${item.total_chapters} гл. • <span class="free-hl">${item.free_chapters} бесплатно</span>`
        : `${item.total_chapters} гл. • по подписке`;

      const btnText = hasFree ? "Смотреть (есть бесплатные)" : "Выбрать главы";
      const btnClass = hasFree ? "btn-watch-chapters has-free" : "btn-watch-chapters";

      return `
        <article class="${cardClasses.join(" ")}" data-id="${item.id}" oncontextmenu="return false;">
          <div class="card-cover-wrap" data-open-chapters="${item.id}">
            <img src="${escapeHtml(item.image)}" onerror="this.onerror=null;this.src='media_cache/avatar.png';" alt="${escapeHtml(item.title)}" class="card-cover-img" loading="lazy" decoding="async">
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
                ${firstTag ? `<span>${firstTag}</span>` : ""}
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

    const vg = document.getElementById("viewGridBtn");
    const vl = document.getElementById("viewListBtn");
    if (vg) vg.classList.toggle("active", state.viewMode === "grid");
    if (vl) vl.classList.toggle("active", state.viewMode === "list");
  }

  /* -------------------- MODALS -------------------- */
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
    const tierObj = state.tiers.find((t) => t.tier === item.tier) || state.tiers[0];

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
           <span>Платные выпуски (${item.paid_chapters} гл.) открываются с ${item.tier} уровня (${item.price} ₽/мес).</span>
           <a href="${escapeHtml(tierObj.url)}" target="_blank" rel="noopener noreferrer" class="btn-primary" data-ym-event="${tierObj.ymEvent}">Подписаться • ${item.price} ₽</a>
         </div>`
      : "";

    body.innerHTML = `
      <div class="chapters-hero">
        <div class="chapters-cover-box">
          <img src="${escapeHtml(item.image)}" onerror="this.onerror=null;this.src='media_cache/avatar.png';" alt="${escapeHtml(item.title)}">
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
                <img src="${escapeHtml(v.thumbnail || v.image || "media_cache/avatar.png")}" alt="${escapeHtml(v.title)}" loading="lazy" decoding="async">
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
            ${post.image ? `<img src="${escapeHtml(post.image)}" alt="" class="tg-post-thumb" loading="lazy" decoding="async">` : ""}
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
      ? `<div class="tg-reader-media"><img src="${escapeHtml(post.image)}" alt="Изображение поста"></div>`
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
            <img src="${escapeHtml(img)}" data-fallback="${escapeHtml(item.image)}" onerror="this.onerror=null;this.src=this.dataset.fallback;" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">
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

  function closeMobileFilterSheet() {
    document.getElementById("filtersPanel")?.classList.remove("mobile-open");
    const bd = document.getElementById("mobileSheetBackdrop");
    if (bd) bd.style.display = "none";
  }

  /* -------------------- CONVERSION TOAST -------------------- */
  function initConversionTriggers() {
    setTimeout(() => {
      if (sessionStorage.getItem("taka_toast_closed")) return;
      const toast = document.getElementById("conversionPushToast");
      const content = document.getElementById("toastContent");
      if (!toast || !content) return;

      const t2 = state.tiers.find((t) => t.tier === 2) || state.tiers[0];
      content.innerHTML = `
        <strong>Оптимальный доступ к каталогу</strong>
        Откройте все ${state.catalog.length} тайтлов, Лицензии и чат за ${t2.price} ₽/мес.
        <a href="${escapeHtml(t2.url)}" target="_blank" rel="noopener noreferrer" data-ym-event="${t2.ymEvent}">Открыть всё • ${t2.price} ₽</a>
      `;
      toast.style.display = "block";
    }, 18000);
  }

  /* -------------------- ONBOARDING TOUR (PC + MOBILE) -------------------- */
  const TOUR_STEPS = [
    {
      selector: "#openYtModalBtn",
      title: "YouTube и Telegram",
      text: "Свежие ролики и новости из ТГ-канала открываются прямо здесь в один клик."
    },
    {
      selector: "#releasesSection",
      title: "Лента новинок",
      text: "Переключайтесь между новинками за неделю и месяц или смотрите ленту с фото."
    },
    {
      selector: ".filters-panel",
      mobileSelector: "#mobileFilterBar",
      title: "Поиск и фильтры",
      text: "Ищите по названию, жанру или скрытому тегу. На телефоне кнопка «Фильтры» открывает все настройки."
    },
    {
      selector: ".catalog-grid",
      title: "Выбор глав внутри тайтла",
      text: "Нажмите на любую карточку — откроются выпуски. Зелёные главы доступны бесплатно!"
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
    closeMobileFilterSheet();
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
    const isMob = window.innerWidth <= 768;
    const sel = (isMob && step.mobileSelector) ? step.mobileSelector : step.selector;
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
      const top = Math.max(6, rect.top - 4);
      const left = Math.max(6, rect.left - 4);
      const width = Math.min(window.innerWidth - 12, rect.width + 8);
      const height = Math.min(window.innerHeight - 160, rect.height + 8);

      spotlight.style.top = top + "px";
      spotlight.style.left = left + "px";
      spotlight.style.width = width + "px";
      spotlight.style.height = height + "px";

      if (!isMob) {
        const tipTop = rect.bottom + 14 + 170 < window.innerHeight ? rect.bottom + 14 : Math.max(16, rect.top - 180);
        tooltip.style.top = tipTop + "px";
        tooltip.style.left = Math.min(window.innerWidth - 330, Math.max(16, rect.left)) + "px";
      }

      setText("tourStepBadge", `Шаг ${tourIndex + 1} из ${TOUR_STEPS.length}`);
      setText("tourTitle", step.title);
      setText("tourText", step.text);
      setText("tourNextBtn", tourIndex === TOUR_STEPS.length - 1 ? "Готово" : "Далее");
    }, 320);
  }

  function endTour() {
    const overlay = document.getElementById("tourOverlay");
    if (overlay) overlay.style.display = "none";
    try { localStorage.setItem(TOUR_DONE_KEY, "1"); } catch (_) {}
  }

  /* -------------------- EVENTS -------------------- */
  function bindEvents() {
    const themeBtn = document.getElementById("themeToggleBtn");
    if (localStorage.getItem(THEME_KEY) === "light") {
      document.body.classList.add("theme-light");
      if (themeBtn) themeBtn.textContent = "Светлая";
    }
    themeBtn?.addEventListener("click", () => {
      const isLight = document.body.classList.toggle("theme-light");
      themeBtn.textContent = isLight ? "Светлая" : "Тёмная";
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
    document.getElementById("shelfPrevBtn")?.addEventListener("click", () => track?.scrollBy({ left: -520, behavior: "smooth" }));
    document.getElementById("shelfNextBtn")?.addEventListener("click", () => track?.scrollBy({ left: 520, behavior: "smooth" }));

    document.getElementById("modalTabWeekBtn")?.addEventListener("click", () => {
      state.modalShelfMode = "week";
      renderMediaFeedGrid();
    });
    document.getElementById("modalTabMonthBtn")?.addEventListener("click", () => {
      state.modalShelfMode = "month";
      renderMediaFeedGrid();
    });

    document.getElementById("mobileFiltersToggle")?.addEventListener("click", () => {
      const panel = document.getElementById("filtersPanel");
      const bd = document.getElementById("mobileSheetBackdrop");
      const open = !panel?.classList.contains("mobile-open");
      panel?.classList.toggle("mobile-open", open);
      if (bd) bd.style.display = open ? "block" : "none";
    });
    document.getElementById("mobileSheetClose")?.addEventListener("click", closeMobileFilterSheet);
    document.getElementById("mobileSheetBackdrop")?.addEventListener("click", closeMobileFilterSheet);

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
        closeMobileFilterSheet();
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
  bindEvents();
  loadCatalog();
})();
