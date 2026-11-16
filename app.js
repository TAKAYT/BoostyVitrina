/* ТАКА — Премиум-Минимал (строгий матчинг, авто-уровень подписки, YT/TG, ПК-гид) */
(function () {
  "use strict";

  const BLOG_URL = "https://boosty.to/darktaka";
  const YT_CHANNEL_ID = "UCVIQOnICNIBcLshYisdechQ";
  const STORAGE_KEY = "taka_vitrina_filters_v4";
  const THEME_KEY = "taka_theme_v4";
  const MASCOT_HIDDEN_KEY = "taka_mascot_hidden_v4";
  const TOUR_DONE_KEY = "taka_tour_done_v4";

  const PLACEHOLDER_SVG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">' +
        '<rect width="400" height="600" fill="#191C22"/>' +
        '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6B7280" font-family="sans-serif" font-size="22" font-weight="700">ТАКА</text>' +
      "</svg>"
    );

  const TYPE_LABELS = {
    manhwa: "Манхва",
    manhua: "Маньхуа",
    manga: "Манга"
  };

  const DEFAULT_TIERS = [
    {
      tier: 1,
      kicker: "1 УРОВЕНЬ • БАЗОВЫЙ",
      title: "Базовая библиотека",
      desc: "Доступ к основной базе озвучки и ранним сериям (~8 ₽/день).",
      price: 250,
      old_price: 0,
      discount: "",
      url: "https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link",
      ymEvent: "click_tariff_250",
      featured: false
    },
    {
      tier: 2,
      kicker: "2 УРОВЕНЬ • ОПТИМАЛЬНЫЙ",
      title: "Всё включено + Лицензии",
      desc: "Все тайтлы 1 ур. + закрытые Лицензии + ТГ-чат и стримы.",
      price: 500,
      old_price: 0,
      discount: "",
      url: "https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link",
      ymEvent: "click_tariff_500",
      featured: true
    },
    {
      tier: 3,
      kicker: "3 УРОВЕНЬ • УСКОРЕНИЕ",
      title: "Максимальная поддержка",
      desc: "Все бонусы 1 и 2 ур. + ускоренный выход новых глав.",
      price: 1000,
      old_price: 0,
      discount: "",
      url: "https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link",
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
    typeOverrides: {},
    specialTitles: {
      frozen_titles: [],
      romance_sakura: [],
      completed_titles: [],
      hidden_tags_overrides: {}
    },
    access: "all",
    type: "all",
    genre: "all",
    special: "all",
    sort: "newest",
    search: "",
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
      .replace(/(\d+\s*[-–]\s*\d+\s*глав.*)/gi, "")
      .replace(/[^a-zа-я0-9]/gi, "");
  }

  function parseTierSafe(raw) {
    const subId = String(raw.tier_id || raw.subscription_level_id || raw.level_id || "");
    if (subId === "3988841") return 2;
    if (subId === "3979820") return 3;
    if (subId === "3988840") return 1;

    const priceNum = Number(raw.price || 0);
    if (priceNum >= 900) return 3;
    if (priceNum >= 450) return 2;

    if (raw.is_license === true) return 2;

    const tagStr = [...(raw.tags || []), ...(raw.hidden_tags || [])].join(" ").toLowerCase();
    if (tagStr.includes("лиценз") || tagStr.includes("2 ур") || tagStr.includes("2ур")) return 2;

    if (Array.isArray(raw.all_posts)) {
      const hasTier2Post = raw.all_posts.some((p) => {
        const pt = parseInt(String(p.tier ?? 1).replace(/\D/g, ""), 10) || 1;
        return pt === 2 || Number(p.price || 0) >= 450;
      });
      if (hasTier2Post) return 2;
    }

    const parsed = parseInt(String(raw.tier ?? 1).replace(/\D/g, ""), 10) || 1;
    return parsed >= 1 && parsed <= 3 ? parsed : 1;
  }

  function normalizeTypeKey(rawType) {
    const s = String(rawType || "").trim().toLowerCase();
    if (s === "manhua" || s === "маньхуа") return "manhua";
    if (s === "manga" || s === "манга") return "manga";
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
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
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
        genre: state.genre,
        special: state.special,
        sort: state.sort,
        search: state.search,
        viewMode: state.viewMode
      }));
    } catch (_) {}
  }

  function loadSavedFilters() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      ["access", "type", "genre", "special", "sort", "search", "viewMode"].forEach((k) => {
        if (saved[k] !== undefined) state[k] = saved[k];
      });
    } catch (_) {}
  }

  /* -------------------- THEME -------------------- */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "dark";
    applyTheme(saved);
    document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.textContent = theme === "dark" ? "Тёмная" : "Светлая";
  }

  /* -------------------- GEO BLOCK -------------------- */
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
          if (d && ["KR", "JP", "CN"].includes(String(d.country || "").toUpperCase())) showGeoBlock();
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

  /* -------------------- AVATAR -------------------- */
  function setupAvatar(avatarUrl) {
    const img = document.getElementById("heroAvatarImg");
    const fb = document.getElementById("heroAvatarFallback");
    if (!img || !fb) return;

    const candidates = [avatarUrl, "media_cache/avatar.png", "media_cache/avatar.jpg", "avatar.png", "avatar.jpg"].filter(Boolean);
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

  async function loadYoutubeFallback() {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`;
      const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
      if (!r.ok) return [];
      const j = await r.json();
      if (!Array.isArray(j.items)) return [];
      return j.items.slice(0, 12).map((it) => {
        const vidId = (it.guid || "").split(":").pop();
        return {
          title: it.title || "Видео ТАКА",
          url: it.link || "https://www.youtube.com/@TAKA_YT",
          thumbnail: it.thumbnail || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : ""),
          date: (it.pubDate || "").slice(0, 10)
        };
      });
    } catch (_) {
      return [];
    }
  }

  async function loadCatalog() {
    const summary = document.getElementById("resultsSummary");
    if (window.location.protocol === "file:") {
      if (summary) summary.textContent = "Локальный режим (file://): открой сайт через GitHub Pages или локальный сервер.";
      setupAvatar();
      return;
    }

    let data = await fetchJsonOptional("catalog.json");
    if (!data) data = await fetchJsonOptional("data.json");
    if (!data) data = await fetchJsonOptional("data/titles.json");

    if (!data) {
      if (summary) summary.textContent = "Ошибка загрузки каталога (файл данных не найден).";
      setupAvatar();
      return;
    }

    const [typeOv, specOv, ytExtra, tgExtra] = await Promise.all([
      fetchJsonOptional("type_overrides.json"),
      fetchJsonOptional("special_titles.json"),
      fetchJsonOptional("youtube.json") || fetchJsonOptional("data/youtube.json"),
      fetchJsonOptional("news_tg.json") || fetchJsonOptional("data/news_tg.json")
    ]);

    if (typeOv) {
      Object.entries(typeOv).forEach(([k, v]) => {
        if (!k.startsWith("_") && v) state.typeOverrides[strictNormalize(k)] = normalizeTypeKey(v);
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
      const ts = parseDateValue(state.meta.updated_at);
      if (ts > 0) state.referenceNow = ts;
    }

    const items = Array.isArray(data) ? data : (data.items || data.catalog || data.titles || []);
    state.catalog = items.map((item, idx) => normalizeItem(item, idx));

    state.ytVideos = data.yt_videos || data.youtube || state.meta.yt_videos || ytExtra || [];
    state.tgNews = data.tg_news || data.tg_posts || state.meta.tg_news || tgExtra || [];

    if (state.ytVideos.length === 0) {
      loadYoutubeFallback().then((vids) => {
        if (vids.length > 0) {
          state.ytVideos = vids;
          setText("ytCountBadge", vids.length);
        }
      });
    }

    setupAvatar(state.meta.avatar || state.meta.avatar_url || state.meta.blog_avatar);
    syncTiersFromMeta();
    renderTiers();
    populateHeaderAndStats();
    populateGenreSelect();
    syncControlsFromState();
    renderShelf();
    renderCatalog();
    initMascotGuide();
  }

  function normalizeItem(raw, idx) {
    const title = raw.title || "Без названия";
    const norm = strictNormalize(title);

    const posts = Array.isArray(raw.all_posts) ? raw.all_posts : (Array.isArray(raw.chapters) ? raw.chapters : []);
    const freeCh = Number(raw.free_chapters) || 0;
    let paidCh = Number(raw.paid_chapters) || 0;
    const postsSum = posts.reduce((acc, p) => acc + extractChapterSpan(p.range), 0);
    const totalCh = Math.max(
      Number(raw.total_chapters || raw.totalChapters || raw.chapters_total || raw.chapters_count || 0),
      freeCh + paidCh,
      postsSum
    );
    if (paidCh === 0 && totalCh > freeCh) paidCh = totalCh - freeCh;

    const tier = parseTierSafe(raw);
    const price = Number(raw.price) || (tier === 2 ? 500 : tier === 3 ? 1000 : 250);
    const typeKey = state.typeOverrides[norm] || normalizeTypeKey(raw.type);

    const isFrozen = Boolean(raw.is_frozen) || state.specialTitles.frozen_titles.includes(norm);
    const isRomance = Boolean(raw.is_romance) || state.specialTitles.romance_sakura.includes(norm);
    const isCompleted = Boolean(raw.is_completed) || state.specialTitles.completed_titles.includes(norm);

    const baseHidden = Array.isArray(raw.hidden_tags) ? raw.hidden_tags : [];
    const ovHidden = state.specialTitles.hidden_tags_overrides[norm] || [];
    const hiddenTags = Array.from(new Set([...baseHidden, ...ovHidden]));

    const updatedTs = parseDateValue(raw.updated);
    const daysAgo = updatedTs > 0 ? (state.referenceNow - updatedTs) / 86400000 : 9999;
    const isWeekNew = updatedTs > 0 ? daysAgo <= 7 && Boolean(raw.week_range || raw.is_week_new) : Boolean(raw.is_week_new);
    const isMonthNew = updatedTs > 0 ? daysAgo <= 31 : Boolean(raw.is_month_new);

    return {
      id: raw.id || idx,
      title,
      type: typeKey,
      typeLabel: TYPE_LABELS[typeKey] || "Манхва",
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      hidden_tags: hiddenTags,
      image: raw.image || raw.cover || PLACEHOLDER_SVG,
      url: raw.url || BLOG_URL,
      tier,
      price,
      total_chapters: totalCh,
      free_chapters: freeCh,
      paid_chapters: paidCh,
      updated: raw.updated || "",
      updatedTs,
      is_license: Boolean(raw.is_license || tier === 2),
      is_frozen: isFrozen,
      is_romance: isRomance,
      is_completed: isCompleted,
      is_week_new: isWeekNew,
      is_month_new: isMonthNew,
      week_range: raw.week_range || "",
      week_post_image: raw.week_post_image || raw.post_image || raw.image || PLACEHOLDER_SVG,
      week_post_link: raw.week_post_link || (posts.length ? posts[posts.length - 1].url : raw.url) || BLOG_URL,
      week_chapters_count: Number(raw.week_chapters_count || extractChapterSpan(raw.week_range)),
      month_range: raw.month_range || raw.week_range || "",
      all_posts: posts.map((p) => ({
        title: p.title || title,
        range: p.range || "",
        url: p.url || raw.url || BLOG_URL,
        date: p.date || raw.updated || "",
        is_free: Boolean(p.is_free),
        is_recent: Boolean(p.is_recent),
        tier: parseTierSafe({ tier: p.tier || tier, price: p.price || price })
      }))
    };
  }

  /* -------------------- TIERS & STATS -------------------- */
  function syncTiersFromMeta() {
    const rawTiers = state.meta.tiers;
    if (!Array.isArray(rawTiers) || rawTiers.length === 0) return;
    state.tiers = DEFAULT_TIERS.map((def) => {
      const found = rawTiers.find((t) => parseTierSafe(t) === def.tier);
      if (!found) return def;
      const price = Number(found.price) || def.price;
      const oldPrice = Number(found.old_price || 0);
      const discount = found.discount || (oldPrice > price ? `-${Math.round((1 - price / oldPrice) * 100)}%` : "");
      return {
        ...def,
        title: found.name || found.title || def.title,
        price,
        old_price: oldPrice,
        discount,
        url: found.url || def.url
      };
    });
  }

  function renderTiers() {
    const grid = document.getElementById("tiersGrid");
    if (!grid) return;

    grid.innerHTML = state.tiers.map((t) => {
      const disc = t.discount ? `<span class="tariff-discount">${escapeHtml(t.discount)}</span>` : "";
      const btnLabel = t.tier === 2 ? `Открыть всё • ${t.price} ₽/мес` : `Открыть • ${t.price} ₽/мес`;
      return `
        <div class="tariff-card ${t.featured ? "is-featured" : ""}" data-tier-card="${t.tier}">
          <div class="tariff-head">
            <div>
              <span class="tariff-kicker">${escapeHtml(t.kicker)}</span>
              <h3>${escapeHtml(t.title)}</h3>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              ${disc}
              <button type="button" class="tariff-help-btn" data-tier-help="${t.tier}" aria-label="Подробнее">?</button>
            </div>
          </div>
          <p class="tariff-desc">${escapeHtml(t.desc)}</p>
          <a href="${escapeHtml(t.url)}" target="_blank" rel="noopener noreferrer" class="btn tariff-cta" data-ym-event="${t.ymEvent}">
            ${escapeHtml(btnLabel)}
          </a>
        </div>
      `;
    }).join("");
  }

  function populateHeaderAndStats() {
    const total = state.catalog.length;
    setText("heroUtpText", `${total} тайтлов • Бесплатные серии без ожидания`);
    setText("ytCountBadge", state.ytVideos.length);
    setText("tgCountBadge", state.tgNews.length);

    const paidSubs = Number(state.meta.paid_subscribers || state.meta.subscribers_paid || 176);
    const goalTarget = Number(state.meta.goal_target || 200);
    const pct = Math.min(100, Math.round((paidSubs / Math.max(1, goalTarget)) * 100));
    setText("goalNumbersRight", `${paidSubs} / ${goalTarget} (${pct}%)`);
    const bar = document.getElementById("goalBar");
    if (bar) bar.style.width = pct + "%";

    const freeSum = state.catalog.reduce((acc, it) => acc + it.free_chapters, 0);
    const paidSum = state.catalog.reduce((acc, it) => acc + it.paid_chapters, 0);
    const totalSum = state.catalog.reduce((acc, it) => acc + it.total_chapters, 0);

    setText("statSubs", state.meta.total_subscribers || state.meta.followers || "1 436");
    setText("statFreeCh", freeSum.toLocaleString("ru-RU") + " гл.");
    setText("statPaidCh", paidSum.toLocaleString("ru-RU") + " гл.");
    setText("statTotalCh", totalSum.toLocaleString("ru-RU") + " гл.");

    setText("cntAll", total);
    setText("cntFree", state.catalog.filter((i) => i.free_chapters > 0).length);
    setText("cntTier1", state.catalog.filter((i) => i.tier === 1).length);
    setText("cntTier2", state.catalog.filter((i) => i.tier === 2).length);

    if (state.meta.updated_at) setText("lastSyncText", "Обновлено: " + state.meta.updated_at);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function populateGenreSelect() {
    const counts = {};
    state.catalog.forEach((it) => it.tags.forEach((t) => { if (t) counts[t] = (counts[t] || 0) + 1; }));
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const sel = document.getElementById("genreSelect");
    if (!sel) return;
    sel.innerHTML = `<option value="all">Все жанры</option>` + sorted.map((g) => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");
  }

  /* -------------------- RELEASES SHELF -------------------- */
  function getShelfItems(mode) {
    return state.catalog
      .filter((i) => (mode === "week" ? i.is_week_new : i.is_month_new))
      .sort((a, b) => b.updatedTs - a.updatedTs)
      .slice(0, mode === "week" ? 24 : 32);
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
      track.innerHTML = `<div class="results-summary" style="padding:8px;">Свежих релизов за этот период нет.</div>`;
      return;
    }

    track.innerHTML = items.map((item) => {
      const img = state.shelfMode === "week" ? (item.week_post_image || item.image) : item.image;
      const range = state.shelfMode === "week" ? (item.week_range ? "Новое: " + item.week_range : item.updated) : (item.month_range || item.updated);
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
      trackEvent("click_boosty_post", { title: item.title });
      window.open(buildUtmUrl(item.week_post_link, item.title), "_blank", "noopener,noreferrer");
    }
  }

  /* -------------------- CATALOG RENDER -------------------- */
  function getFilteredCatalog() {
    const q = state.search.trim().toLowerCase();
    const list = state.catalog.filter((item) => {
      if (state.access === "free" && item.free_chapters <= 0) return false;
      if (state.access === "tier1" && item.tier !== 1) return false;
      if (state.access === "tier2" && item.tier !== 2) return false;
      if (state.type !== "all" && item.type !== state.type) return false;
      if (state.genre !== "all" && !item.tags.includes(state.genre)) return false;
      if (state.special === "completed" && !item.is_completed) return false;
      if (state.special === "romance" && !item.is_romance) return false;
      if (state.special === "frozen" && !item.is_frozen) return false;
      if (q) {
        const hay = [item.title, item.typeLabel, ...item.tags, ...item.hidden_tags].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (state.sort === "chapters_desc") return b.total_chapters - a.total_chapters;
      if (state.sort === "free_desc") return b.free_chapters - a.free_chapters;
      if (state.sort === "alpha") return a.title.localeCompare(b.title, "ru");
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

    updateResetVisibility();

    if (list.length === 0) {
      grid.innerHTML = "";
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";

    const frag = document.createDocumentFragment();
    list.forEach((item) => {
      const card = document.createElement("article");
      const cls = ["title-card"];
      if (item.is_completed) cls.push("card-completed");
      else if (item.is_frozen) cls.push("card-frozen");
      else if (item.is_romance) cls.push("card-romance");
      card.className = cls.join(" ");
      card.dataset.id = item.id;
      card.oncontextmenu = () => false;

      let statusBadge = "";
      if (item.is_frozen) statusBadge = `<span class="card-badge badge-frozen">Заморожен</span>`;
      else if (item.is_completed) statusBadge = `<span class="card-badge badge-completed">Завершён</span>`;
      else if (item.is_romance) statusBadge = `<span class="card-badge badge-romance">Романтика</span>`;
      else if (item.is_license) statusBadge = `<span class="card-badge badge-license">Лицензия</span>`;

      const firstTag = item.tags[0] ? ` • ${escapeHtml(item.tags[0])}` : "";
      const hasFree = item.free_chapters > 0;

      const btnsHtml = hasFree
        ? `<button type="button" class="btn card-btn card-btn-free" data-open-chapters="${item.id}">Бесплатно: ${item.free_chapters} гл.</button>
           <button type="button" class="btn card-btn card-btn-accent" data-open-chapters="${item.id}">Открыть ${item.total_chapters} гл. • ${item.price} ₽</button>`
        : `<button type="button" class="btn card-btn card-btn-accent" data-open-chapters="${item.id}">Открыть ${item.total_chapters} гл. • ${item.price} ₽</button>
           <button type="button" class="btn card-btn card-btn-secondary" data-open-chapters="${item.id}">Выбрать главы</button>`;

      card.innerHTML = `
        <div class="card-cover-wrap" data-open-chapters="${item.id}">
          <div class="cover-skeleton"></div>
          <img src="${escapeHtml(item.image)}" onerror="this.onerror=null;this.src='${PLACEHOLDER_SVG}';" alt="${escapeHtml(item.title)}" class="card-cover-img" loading="lazy" decoding="async">
          <div class="card-top-badges">
            <div>${statusBadge}</div>
            <span class="card-badge">${item.total_chapters} гл.</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-list-main">
            <h3 class="card-title" data-open-chapters="${item.id}">${escapeHtml(item.title)}</h3>
            <div class="card-meta-line">${escapeHtml(item.typeLabel)}${firstTag}</div>
          </div>
          <div class="card-actions">
            ${btnsHtml}
            <div class="card-footer-row">
              <span>${escapeHtml(item.updated || "")}</span>
              <button type="button" class="card-share-btn" data-share-id="${item.id}">Поделиться</button>
            </div>
          </div>
        </div>
      `;
      frag.appendChild(card);
    });

    grid.innerHTML = "";
    grid.appendChild(frag);
  }

  function updateResetVisibility() {
    const has = state.access !== "all" || state.type !== "all" || state.genre !== "all" || state.special !== "all" || state.search.trim() !== "";
    const resetBtn = document.getElementById("resetFiltersBtn");
    if (resetBtn) resetBtn.style.display = has ? "inline-flex" : "none";

    const cnt = (state.access !== "all" ? 1 : 0) + (state.type !== "all" ? 1 : 0) + (state.genre !== "all" ? 1 : 0) + (state.special !== "all" ? 1 : 0);
    const badge = document.getElementById("mobileFilterCountBadge");
    if (badge) {
      badge.textContent = cnt;
      badge.style.display = cnt > 0 ? "inline-block" : "none";
    }
  }

  function syncControlsFromState() {
    ["searchInput", "mobileSearchInput"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = state.search;
    });
    const tf = document.getElementById("typeFilter"); if (tf) tf.value = state.type;
    const gf = document.getElementById("genreSelect"); if (gf) gf.value = state.genre;
    const sf = document.getElementById("specialFilter"); if (sf) sf.value = state.special;
    const sortF = document.getElementById("sortFilter"); if (sortF) sortF.value = state.sort;

    document.querySelectorAll("#accessTabs .access-tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.access === state.access);
    });
    document.getElementById("viewGridBtn")?.classList.toggle("active", state.viewMode === "grid");
    document.getElementById("viewListBtn")?.classList.toggle("active", state.viewMode === "list");
  }

  /* -------------------- MODALS -------------------- */
  function openChaptersModal(itemId, highlightRecent) {
    const item = state.catalog.find((i) => String(i.id) === String(itemId));
    if (!item) return;
    const body = document.getElementById("chaptersModalBody");
    if (!body) return;

    const posts = item.all_posts.length > 0
      ? item.all_posts
      : [{ title: item.title, range: `1-${item.total_chapters} гл.`, url: item.url, date: item.updated, is_free: item.free_chapters > 0, is_recent: item.is_week_new, tier: item.tier }];

    const tierObj = state.tiers.find((t) => t.tier === item.tier) || state.tiers[0];

    const rowsHtml = posts.map((p) => {
      const postUrl = buildUtmUrl(p.url, item.title);
      const isFree = p.is_free;
      const cls = `chapter-row ${isFree ? "is-free" : ""} ${highlightRecent && p.is_recent ? "is-recent" : ""}`;
      const newBadge = highlightRecent && p.is_recent ? `<span class="chapter-new-tag">Новое</span>` : "";
      const btn = isFree
        ? `<span class="chapter-row-btn free-btn">Смотреть ↗</span>`
        : `<span class="chapter-row-btn paid-btn">🔒 ${p.tier} ур. ↗</span>`;

      return `
        <a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer" class="${cls}" data-ym-event="${isFree ? "click_free_chapters" : "click_boosty_post"}" data-ym-title="${escapeHtml(item.title)}">
          <div class="chapter-row-main">
            <div class="chapter-row-title">${escapeHtml(p.range ? p.range + " — " + p.title : p.title)} ${newBadge}</div>
            <div class="chapter-row-meta">${escapeHtml(p.date || item.updated || "—")} • ${isFree ? "Бесплатно" : `По подписке ${p.tier} ур.`}</div>
          </div>
          ${btn}
        </a>
      `;
    }).join("");

    body.innerHTML = `
      <div class="chapters-hero">
        <div class="chapters-cover-box">
          <img src="${escapeHtml(item.image)}" onerror="this.onerror=null;this.src='${PLACEHOLDER_SVG}';" alt="${escapeHtml(item.title)}">
        </div>
        <div class="chapters-hero-info">
          <h2>${escapeHtml(item.title)}</h2>
          <div class="chapters-hero-badges">
            <span class="ch-pill">${escapeHtml(item.typeLabel)}</span>
            <span class="ch-pill">Всего: ${item.total_chapters} гл.</span>
            <span class="ch-pill ch-pill-free">Бесплатно: ${item.free_chapters} гл.</span>
          </div>
        </div>
      </div>
      <div class="chapters-grid-list">${rowsHtml}</div>
      ${item.paid_chapters > 0 ? `
        <div class="chapters-subscribe-banner">
          <span>Открыть все ${item.total_chapters} гл. по подписке (${item.tier} ур.)</span>
          <a href="${escapeHtml(tierObj.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" data-ym-event="${tierObj.ymEvent}">Подписаться • ${item.price} ₽</a>
        </div>` : ""}
    `;
    openModal("chaptersModal");
  }

  function openYtModal() {
    trackEvent("open_yt_modal");
    const grid = document.getElementById("ytVideosGrid");
    if (grid) {
      grid.innerHTML = state.ytVideos.length === 0
        ? `<p class="modal-text">Видео пока не загружены.</p>`
        : state.ytVideos.map((v) => {
            const chRange = v.chapters_range || extractChaptersFromTitle(v.title);
            return `
              <article class="yt-video-card">
                <div class="yt-thumb-wrap"><img src="${escapeHtml(v.thumbnail || v.image || PLACEHOLDER_SVG)}" alt="${escapeHtml(v.title)}" loading="lazy" decoding="async"></div>
                <div class="yt-card-body">
                  <div class="yt-card-meta"><span>${escapeHtml(v.date || "")}</span><span>${escapeHtml(chRange ? "Главы: " + chRange : "")}</span></div>
                  <h3 class="yt-card-title">${escapeHtml(v.title)}</h3>
                  <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" class="btn yt-watch-btn">Смотреть на YouTube ↗</a>
                </div>
              </article>
            `;
          }).join("");
    }
    openModal("ytModal");
  }

  function openTgModal() {
    trackEvent("open_tg_modal");
    const grid = document.getElementById("tgPostsGrid");
    if (grid) {
      grid.innerHTML = state.tgNews.length === 0
        ? `<p class="modal-text">Посты пока не загружены. Нажми «Подписаться» ниже или обнови кэш.</p>`
        : state.tgNews.map((post, idx) => `
            <button type="button" class="tg-post-card" data-tg-idx="${idx}">
              ${post.image ? `<img src="${escapeHtml(post.image)}" alt="" class="tg-post-thumb" loading="lazy" decoding="async">` : ""}
              <div class="tg-post-preview">
                <div class="tg-post-date">${escapeHtml(post.date || "")} • Читать на сайте</div>
                <div class="tg-post-snippet">${escapeHtml(post.text || "")}</div>
              </div>
            </button>
          `).join("");
    }
    openModal("tgModal");
  }

  function openTgPostReader(idx) {
    const post = state.tgNews[idx];
    const body = document.getElementById("tgPostReaderBody");
    if (!post || !body) return;
    body.innerHTML = `
      <div class="tg-post-date" style="margin-bottom:10px;">${escapeHtml(post.date || "")} • Telegram ТАКА</div>
      ${post.image ? `<div class="tg-reader-media"><img src="${escapeHtml(post.image)}" alt=""></div>` : ""}
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

    grid.innerHTML = items.length === 0
      ? `<p class="modal-text">Новинок за этот период нет.</p>`
      : items.map((item) => {
          const img = mode === "week" ? (item.week_post_image || item.image) : item.image;
          const rangeText = mode === "week" ? (item.week_range || "Свежее обновление") : (item.month_range || "За месяц");
          return `
            <button type="button" class="media-feed-card" data-feed-id="${item.id}">
              <div class="media-feed-cover"><img src="${escapeHtml(img)}" data-fallback="${escapeHtml(item.image)}" onerror="this.onerror=null;this.src=this.dataset.fallback;" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async"></div>
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
    const t = state.tiers.find((x) => String(x.tier) === String(tierKey));
    const body = document.getElementById("tierInfoBody");
    if (!t || !body) return;
    body.innerHTML = `
      <h2 class="modal-title-sm">${escapeHtml(t.title)} (${t.price} ₽/мес)</h2>
      <p class="modal-text">${escapeHtml(t.desc)}</p>
      <a href="${escapeHtml(t.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-full" data-ym-event="${t.ymEvent}">Оформить на Boosty ↗</a>
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
    if (!Array.from(document.querySelectorAll(".modal-backdrop")).some((m) => m.style.display === "flex")) {
      document.body.style.overflow = "";
    }
  }

  function closeMobileFilterSheet() {
    document.getElementById("filtersPanel")?.classList.remove("mobile-open");
    const bd = document.getElementById("mobileSheetBackdrop");
    if (bd) bd.style.display = "none";
  }

  /* -------------------- PC ANIME MASCOT GUIDE (>= 1024px ONLY) -------------------- */
  function initMascotGuide() {
    if (window.innerWidth < 1024 || ("ontouchstart" in window && window.innerWidth < 1024)) return;
    if (localStorage.getItem(MASCOT_HIDDEN_KEY) === "1") return;

    const wrap = document.createElement("div");
    wrap.className = "mascot-widget";
    wrap.id = "mascotWidget";
    wrap.innerHTML = `
      <div class="mascot-bubble" id="mascotBubble">
        <button type="button" class="mascot-bubble-close" id="mascotCloseBtn" aria-label="Скрыть гида">✕</button>
        <span id="mascotText">Привет! Нажми на любую карточку, чтобы выбрать бесплатные или платные главы.</span>
      </div>
      <div class="mascot-sprite-wrap" id="mascotSpriteWrap" title="Запустить обучение">
        <img src="media_cache/mascot.jpg" onerror="this.onerror=null;this.src='media_cache/mascot.png';" alt="Гид" class="mascot-sprite" loading="lazy" decoding="async">
      </div>
    `;
    document.body.appendChild(wrap);

    document.getElementById("mascotCloseBtn")?.addEventListener("click", () => {
      wrap.remove();
      try { localStorage.setItem(MASCOT_HIDDEN_KEY, "1"); } catch (_) {}
    });

    document.getElementById("mascotSpriteWrap")?.addEventListener("click", startTour);

    document.querySelectorAll("[data-tier-card='2']").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        setText("mascotText", "Оптимальный выбор: открывает все 164+ тайтла, Лицензии и чат!");
      });
    });
  }

  /* -------------------- 4-STEP TOUR (OPTIMIZED FOR MOBILE & PC) -------------------- */
  const TOUR_STEPS = [
    { selector: "#filtersPanel", mobileSelector: "#mobileFilterBar", title: "Поиск и фильтры", text: "Ищите по названию, жанру или скрытому тегу." },
    { selector: "#releasesSection", title: "Лента новинок", text: "Свежие релизы за неделю и месяц. Если вышло >10 глав, откроется выбор выпусков." },
    { selector: ".catalog-grid", title: "Бесплатные и платные главы", text: "Нажмите на карточку — зелёные главы можно смотреть сразу бесплатно." },
    { selector: "#tiersSection", title: "Тарифы подписки", text: "2-й уровень (500 ₽) открывает всю базу и закрытые Лицензии." }
  ];
  let tourIndex = 0;

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
    const target = document.querySelector((isMob && step.mobileSelector) ? step.mobileSelector : step.selector);
    if (!target) {
      tourIndex++;
      renderTourStep();
      return;
    }

    overlay.style.display = "block";
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
      const r = target.getBoundingClientRect();
      spotlight.style.top = Math.max(6, r.top - 4) + "px";
      spotlight.style.left = Math.max(6, r.left - 4) + "px";
      spotlight.style.width = Math.min(window.innerWidth - 12, r.width + 8) + "px";
      spotlight.style.height = Math.min(window.innerHeight - 160, r.height + 8) + "px";

      if (!isMob) {
        const top = r.bottom + 180 < window.innerHeight ? r.bottom + 14 : Math.max(16, r.top - 175);
        tooltip.style.top = top + "px";
        tooltip.style.left = Math.min(window.innerWidth - 320, Math.max(16, r.left)) + "px";
      }

      setText("tourStepBadge", `Шаг ${tourIndex + 1} из ${TOUR_STEPS.length}`);
      setText("tourTitle", step.title);
      setText("tourText", step.text);
      setText("tourNextBtn", tourIndex === TOUR_STEPS.length - 1 ? "Готово" : "Далее");
    }, 280);
  }

  function endTour() {
    const overlay = document.getElementById("tourOverlay");
    if (overlay) overlay.style.display = "none";
    try { localStorage.setItem(TOUR_DONE_KEY, "1"); } catch (_) {}
  }

  /* -------------------- EVENTS -------------------- */
  function bindEvents() {
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

    document.getElementById("modalTabWeekBtn")?.addEventListener("click", () => { state.modalShelfMode = "week"; renderMediaFeedGrid(); });
    document.getElementById("modalTabMonthBtn")?.addEventListener("click", () => { state.modalShelfMode = "month"; renderMediaFeedGrid(); });

    document.getElementById("mobileFiltersToggle")?.addEventListener("click", () => {
      const p = document.getElementById("filtersPanel");
      const bd = document.getElementById("mobileSheetBackdrop");
      const open = !p?.classList.contains("mobile-open");
      p?.classList.toggle("mobile-open", open);
      if (bd) bd.style.display = open ? "block" : "none";
    });
    document.getElementById("mobileSheetClose")?.addEventListener("click", closeMobileFilterSheet);
    document.getElementById("mobileSheetBackdrop")?.addEventListener("click", closeMobileFilterSheet);

    const onSearch = (val) => {
      state.search = val;
      ["searchInput", "mobileSearchInput"].forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.value !== val) el.value = val;
      });
      saveFilters();
      renderCatalog();
    };
    document.getElementById("searchInput")?.addEventListener("input", (e) => onSearch(e.target.value));
    document.getElementById("mobileSearchInput")?.addEventListener("input", (e) => onSearch(e.target.value));

    document.getElementById("typeFilter")?.addEventListener("change", (e) => { state.type = e.target.value; saveFilters(); renderCatalog(); });
    document.getElementById("genreSelect")?.addEventListener("change", (e) => { state.genre = e.target.value; saveFilters(); renderCatalog(); });
    document.getElementById("specialFilter")?.addEventListener("change", (e) => { state.special = e.target.value; saveFilters(); renderCatalog(); });
    document.getElementById("sortFilter")?.addEventListener("change", (e) => { state.sort = e.target.value; saveFilters(); renderCatalog(); });

    const reset = () => {
      state.access = "all"; state.type = "all"; state.genre = "all"; state.special = "all"; state.sort = "newest"; state.search = "";
      saveFilters(); syncControlsFromState(); renderCatalog();
    };
    document.getElementById("resetFiltersBtn")?.addEventListener("click", reset);
    document.getElementById("emptyResetBtn")?.addEventListener("click", reset);

    document.getElementById("viewGridBtn")?.addEventListener("click", () => { state.viewMode = "grid"; saveFilters(); syncControlsFromState(); renderCatalog(); });
    document.getElementById("viewListBtn")?.addEventListener("click", () => { state.viewMode = "list"; saveFilters(); syncControlsFromState(); renderCatalog(); });

    document.addEventListener("click", (e) => {
      const ym = e.target.closest("[data-ym-event]");
      if (ym) trackEvent(ym.dataset.ymEvent, { title: ym.dataset.ymTitle || "" });

      const cl = e.target.closest("[data-close-modal]");
      if (cl) { closeModal(cl.dataset.closeModal); return; }
      if (e.target.classList.contains("modal-backdrop")) { closeModal(e.target.id); return; }

      const acc = e.target.closest("#accessTabs .access-tab");
      if (acc) { state.access = acc.dataset.access; saveFilters(); syncControlsFromState(); renderCatalog(); return; }

      const help = e.target.closest("[data-tier-help]");
      if (help) { openTierInfoModal(help.dataset.tierHelp); return; }

      const share = e.target.closest("[data-share-id]");
      if (share) {
        const it = state.catalog.find((x) => String(x.id) === String(share.dataset.shareId));
        if (it) {
          navigator.clipboard?.writeText(buildUtmUrl(it.url, it.title)).catch(() => {});
          const orig = share.textContent; share.textContent = "Скопировано";
          setTimeout(() => { share.textContent = orig; }, 1200);
        }
        return;
      }

      const ch = e.target.closest("[data-open-chapters]");
      if (ch) { openChaptersModal(ch.dataset.openChapters, false); return; }

      const rel = e.target.closest("[data-release-id]");
      if (rel) { handleReleaseClick(rel.dataset.releaseId, state.shelfMode); return; }

      const feed = e.target.closest("[data-feed-id]");
      if (feed) { handleReleaseClick(feed.dataset.feedId, state.modalShelfMode); return; }

      const tg = e.target.closest("[data-tg-idx]");
      if (tg) { openTgPostReader(Number(tg.dataset.tgIdx)); return; }
    });

    document.getElementById("tourSkipBtn")?.addEventListener("click", endTour);
    document.getElementById("tourNextBtn")?.addEventListener("click", () => { tourIndex++; renderTourStep(); });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        endTour();
        closeMobileFilterSheet();
        const open = Array.from(document.querySelectorAll(".modal-backdrop")).filter((m) => m.style.display === "flex");
        if (open.length) closeModal(open[open.length - 1].id);
      }
    });
  }

  initTheme();
  checkGeoRestriction();
  loadSavedFilters();
  bindEvents();
  loadCatalog();
})();
