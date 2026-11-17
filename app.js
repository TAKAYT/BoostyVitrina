/* ТАКА — Ядро витрины (синхронизировано с data.json + stats.json от update.py) */
(function () {
  "use strict";

  const C = window.TakaConfig;
  const M = window.TakaModals;
  const T = window.TakaTour;

  const state = {
    catalog: [],
    stats: {},
    tiers: C.DEFAULT_TIERS,
    ytVideos: [],
    tgNews: [],
    typeOverrides: {},
    specialTitles: {
      frozen_titles: [],
      romance_sakura: [],
      completed_titles: [],
      hidden_tags_overrides: {}
    },
    trackedMissingQueries: new Set(),
    access: "all",
    type: "all",
    genres: [],
    special: "all",
    sort: "newest",
    search: "",
    tasteTags: [],
    randomIds: null,
    viewMode: "grid",
    shelfMode: "week",
    modalShelfMode: "week",
    referenceNow: Date.now()
  };

  let searchDebounceTimer = null;
  let missingPingTimer = null;

  /* -------------------- STORAGE -------------------- */
  function saveFilters() {
    try {
      localStorage.setItem(C.STORAGE_KEY, JSON.stringify({
        access: state.access,
        type: state.type,
        genres: state.genres,
        special: state.special,
        sort: state.sort,
        search: state.search,
        tasteTags: state.tasteTags,
        viewMode: state.viewMode
      }));
    } catch (_) {}
  }

  function loadSavedFilters() {
    try {
      const raw = localStorage.getItem(C.STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        ["access", "type", "special", "sort", "search", "viewMode"].forEach((k) => {
          if (saved[k] !== undefined) state[k] = saved[k];
        });
        if (Array.isArray(saved.genres)) state.genres = saved.genres;
        if (Array.isArray(saved.tasteTags)) state.tasteTags = saved.tasteTags;
      }
    } catch (_) {}
  }

  /* -------------------- THEME & CUSTOM RGB COLOR -------------------- */
  function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function applyCustomColor(hex) {
    const root = document.documentElement;
    const resetBtn = document.getElementById("rgbResetBtn");
    const input = document.getElementById("rgbColorInput");
    if (!hex) {
      ["--accent", "--accent-hover", "--accent-soft", "--accent-glow", "--bg-page", "--bg-card", "--bg-elevated", "--bg-hover", "--border-strong", "--ambient-1", "--ambient-2"].forEach((v) => root.style.removeProperty(v));
      if (resetBtn) resetBtn.style.display = "none";
      return;
    }
    if (input) input.value = hex;
    if (resetBtn) resetBtn.style.display = "inline-flex";

    const { h, s } = hexToHsl(hex);
    const sat = Math.max(45, Math.min(92, s));
    const isDark = root.getAttribute("data-theme") !== "light";

    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-hover", `hsl(${h}, ${sat}%, ${isDark ? 68 : 44}%)`);
    root.style.setProperty("--accent-soft", `hsla(${h}, ${sat}%, 58%, 0.14)`);
    root.style.setProperty("--accent-glow", `hsla(${h}, ${sat}%, 58%, 0.30)`);
    root.style.setProperty("--border-strong", `hsla(${h}, ${sat}%, 60%, 0.32)`);
    root.style.setProperty("--ambient-1", `hsla(${h}, ${sat}%, 56%, 0.65)`);
    root.style.setProperty("--ambient-2", `hsla(${(h + 24) % 360}, ${sat}%, 60%, 0.55)`);

    if (isDark) {
      root.style.setProperty("--bg-page", `hsl(${h}, ${Math.min(35, sat)}%, 5.5%)`);
      root.style.setProperty("--bg-card", `hsla(${h}, ${Math.min(32, sat)}%, 10.5%, 0.82)`);
      root.style.setProperty("--bg-elevated", `hsla(${h}, ${Math.min(30, sat)}%, 16%, 0.88)`);
      root.style.setProperty("--bg-hover", `hsla(${h}, ${Math.min(30, sat)}%, 22%, 0.94)`);
    } else {
      root.style.setProperty("--bg-page", `hsl(${h}, ${Math.min(45, sat)}%, 97%)`);
      root.style.setProperty("--bg-card", `rgba(255, 255, 255, 0.91)`);
      root.style.setProperty("--bg-elevated", `hsl(${h}, ${Math.min(38, sat)}%, 93%)`);
      root.style.setProperty("--bg-hover", `hsl(${h}, ${Math.min(38, sat)}%, 89%)`);
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    C.setText("themeToggleBtn", theme === "dark" ? "Тёмная" : "Светлая");
    const savedColor = localStorage.getItem(C.CUSTOM_COLOR_KEY);
    if (savedColor) applyCustomColor(savedColor);
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(C.THEME_KEY, next); } catch (_) {}
  }

  function initTheme() {
    const saved = localStorage.getItem(C.THEME_KEY) || "dark";
    applyTheme(saved);
    document.getElementById("themeToggleBtn")?.addEventListener("click", toggleTheme);

    const colorInput = document.getElementById("rgbColorInput");
    colorInput?.addEventListener("input", (e) => {
      const hex = e.target.value;
      applyCustomColor(hex);
      try { localStorage.setItem(C.CUSTOM_COLOR_KEY, hex); } catch (_) {}
    });

    document.getElementById("rgbResetBtn")?.addEventListener("click", () => {
      try { localStorage.removeItem(C.CUSTOM_COLOR_KEY); } catch (_) {}
      applyCustomColor("");
    });
  }

  /* -------------------- PROMO CONVERSION POPUP -------------------- */
  function initPromoConversion() {
    try {
      const visits = (parseInt(localStorage.getItem(C.VISIT_COUNT_KEY) || "0", 10) || 0) + 1;
      localStorage.setItem(C.VISIT_COUNT_KEY, String(visits));

      const lastShown = parseInt(localStorage.getItem(C.PROMO_LAST_KEY) || "0", 10) || 0;
      const hoursSince = (Date.now() - lastShown) / 3600000;
      if (visits < 2 || hoursSince < 12) return;

      setTimeout(() => {
        const anyModal = Array.from(document.querySelectorAll(".modal-backdrop")).some((m) => m.style.display === "flex");
        const tourOpen = document.getElementById("tourOverlay")?.style.display === "block";
        if (anyModal || tourOpen) return;
        localStorage.setItem(C.PROMO_LAST_KEY, String(Date.now()));
        M.openPromoModal(state, visits - 2);
      }, 9500);
    } catch (_) {}
  }

  /* -------------------- GEO BLOCK (KR / JP / CN / TW / HK) -------------------- */
  function showGeoBlock() {
    const app = document.getElementById("mainApp");
    const block = document.getElementById("geoBlockScreen");
    if (app) app.style.display = "none";
    if (block) block.style.display = "flex";
  }

  function checkGeoRestriction() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const langs = Array.isArray(navigator.languages) ? navigator.languages.join(",") : (navigator.language || "");
      if (/seoul|tokyo|shanghai|beijing|hong_kong|taipei|macau|osaka/i.test(tz) || /\b(ko|ja|zh)(-|,|$)/i.test(langs)) {
        showGeoBlock();
        return;
      }
      fetch("https://api.country.is/")
        .then((r) => r.json())
        .then((d) => {
          if (d && ["KR", "JP", "CN", "TW", "HK"].includes(String(d.country || "").toUpperCase())) showGeoBlock();
        })
        .catch(() => {});
    } catch (_) {}
  }

  /* -------------------- AVATAR -------------------- */
  function setupAvatar(avatarUrl) {
    const img = document.getElementById("heroAvatarImg");
    const fb = document.getElementById("heroAvatarFallback");
    if (!img || !fb) return;

    const candidates = ["media_cache/avatar.png", "media_cache/avatar.jpg", avatarUrl, "avatar.png", "avatar.jpg"].filter(Boolean);
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
      const r = await fetch(path + "?v=" + Date.now(), { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch (_) {}
    return null;
  }

  async function loadYoutubeFallback() {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${C.YT_CHANNEL_ID}`;
      const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
      if (!r.ok) return [];
      const j = await r.json();
      if (!Array.isArray(j.items)) return [];
      return j.items.slice(0, 4).map((it) => {
        const vidId = (it.guid || "").split(":").pop();
        return {
          title: it.title || "Видео ТАКА",
          link: it.link || "https://www.youtube.com/@TAKA_YT",
          image: it.thumbnail || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : ""),
          date: (it.pubDate || "").slice(0, 10)
        };
      });
    } catch (_) {
      return [];
    }
  }

  function filterRecentTgNews(posts) {
    if (!Array.isArray(posts)) return [];
    const cutoff = state.referenceNow - 7 * 86400000;
    return posts.filter((p) => {
      const ts = C.parseDateValue(p.date);
      return ts === 0 || ts >= cutoff;
    });
  }

  function normalizeItem(raw, idx) {
    const title = raw.title || "Без названия";
    const norm = C.strictNormalize(title);

    const posts = Array.isArray(raw.all_posts) ? raw.all_posts : [];
    const freeCh = Number(raw.free_chapters) || 0;
    let paidCh = Number(raw.paid_chapters) || 0;
    const totalCh = Math.max(
      Number(raw.chapters || raw.total_chapters || 0),
      freeCh + paidCh
    );
    if (paidCh === 0 && totalCh > freeCh) paidCh = totalCh - freeCh;

    const tier = C.parseTierSafe(raw);
    const rawPrice = Number(raw.price) || 0;
    const price = rawPrice >= 50 ? rawPrice : (tier === 2 ? 500 : tier === 3 ? 1000 : 250);
    const typeKey = state.typeOverrides[norm] || C.normalizeTypeKey(raw.content_type || raw.type);

    const isFrozen = Boolean(raw.is_frozen) || state.specialTitles.frozen_titles.includes(norm);
    const isRomance = Boolean(raw.is_romance) || state.specialTitles.romance_sakura.includes(norm);
    const isCompleted = Boolean(raw.is_completed) || state.specialTitles.completed_titles.includes(norm);

    const baseHidden = Array.isArray(raw.hidden_tags) ? raw.hidden_tags : [];
    const ovHidden = state.specialTitles.hidden_tags_overrides[norm] || [];
    const hiddenTags = Array.from(new Set([...baseHidden, ...ovHidden]));

    const updatedStr = raw.last_update || raw.updated || "";
    const updatedTs = raw.timestamp ? Number(raw.timestamp) * 1000 : C.parseDateValue(updatedStr);
    const daysAgo = updatedTs > 0 ? (state.referenceNow - updatedTs) / 86400000 : 9999;

    const isWeekNew = updatedTs > 0 ? (daysAgo <= 7 && (Number(raw.week_posts_count || 0) > 0 || Boolean(raw.week_range))) : false;
    const isMonthNew = updatedTs > 0 ? daysAgo <= 31 : false;

    const fallbackUrl = raw.link || raw.url || C.BLOG_URL;
    const safeImg = (raw.image && !String(raw.image).includes("via.placeholder.com")) ? raw.image : C.PLACEHOLDER_SVG;
    const remoteImg = (raw.remote_image && !String(raw.remote_image).includes("via.placeholder.com")) ? raw.remote_image : "";

    return {
      id: raw.id || idx,
      title,
      type: typeKey,
      typeLabel: C.TYPE_LABELS[typeKey] || "Манхва",
      tags: Array.isArray(raw.genres) ? raw.genres : (Array.isArray(raw.tags) ? raw.tags : []),
      hidden_tags: hiddenTags,
      image: safeImg,
      remote_image: remoteImg,
      url: fallbackUrl,
      tier,
      price,
      total_chapters: totalCh,
      free_chapters: freeCh,
      paid_chapters: paidCh,
      free_text: raw.free_text || (freeCh > 0 ? `1-${freeCh} гл. бесплатно` : ""),
      updated: updatedStr,
      updatedTs,
      is_license: Boolean(raw.is_license || tier === 2),
      is_frozen: isFrozen,
      is_romance: isRomance,
      is_completed: isCompleted,
      is_week_new: isWeekNew,
      is_month_new: isMonthNew,
      week_range: raw.week_range || raw.latest_range || "",
      week_post_image: (raw.week_post_image && !String(raw.week_post_image).includes("via.placeholder.com")) ? raw.week_post_image : safeImg,
      week_post_link: raw.week_post_link || raw.latest_post_link || fallbackUrl,
      week_chapters_count: C.extractChapterSpan(raw.week_range || raw.latest_range),
      month_range: totalCh > 0 ? `1-${totalCh} гл.` : (raw.latest_range || raw.week_range || "Все главы"),
      all_posts: posts.map((p) => {
        const directPostUrl = p.link || p.url || (p.post_id ? `${C.BLOG_URL}/posts/${p.post_id}` : fallbackUrl);
        return {
          title: p.title || title,
          range: p.range || "",
          url: directPostUrl,
          date: p.date || updatedStr,
          is_free: Boolean(p.is_free),
          is_recent: p.ts ? (state.referenceNow - Number(p.ts) * 1000) <= 7 * 86400000 : false,
          tier: C.parseTierSafe({ tier_level: p.tier_level || p.tier || tier })
        };
      })
    };
  }

  async function loadCatalog() {
    const summary = document.getElementById("resultsSummary");
    if (window.location.protocol === "file:") {
      if (summary) summary.textContent = "Локальный режим (file://): откройте сайт через GitHub Pages или локальный сервер.";
      setupAvatar();
      return;
    }

    const [dataRaw, statsRaw, typeOv, specOv] = await Promise.all([
      fetchJsonOptional("data.json"),
      fetchJsonOptional("stats.json"),
      fetchJsonOptional("type_overrides.json"),
      fetchJsonOptional("special_titles.json")
    ]);

    const data = dataRaw || (await fetchJsonOptional("catalog.json"));
    if (!data) {
      if (summary) summary.textContent = "Ошибка загрузки каталога (data.json не найден).";
      setupAvatar();
      return;
    }

    if (typeOv) {
      Object.entries(typeOv).forEach(([k, v]) => {
        if (!k.startsWith("_") && v) state.typeOverrides[C.strictNormalize(k)] = C.normalizeTypeKey(v);
      });
    }

    if (specOv) {
      state.specialTitles.frozen_titles = (specOv.frozen_titles || []).map(C.strictNormalize);
      state.specialTitles.romance_sakura = (specOv.romance_sakura || []).map(C.strictNormalize);
      state.specialTitles.completed_titles = (specOv.completed_titles || []).map(C.strictNormalize);
      if (specOv.hidden_tags_overrides) {
        Object.entries(specOv.hidden_tags_overrides).forEach(([k, v]) => {
          state.specialTitles.hidden_tags_overrides[C.strictNormalize(k)] = Array.isArray(v) ? v : [String(v)];
        });
      }
    }

    state.stats = statsRaw || (!Array.isArray(data) ? (data.meta || data) : {});
    if (state.stats.ambient_state?.updated_at) {
      const ts = C.parseDateValue(state.stats.ambient_state.updated_at);
      if (ts > 0) state.referenceNow = ts;
    }

    const items = Array.isArray(data) ? data : (data.items || data.catalog || []);
    state.catalog = items.map((item, idx) => normalizeItem(item, idx));

    state.ytVideos = (state.stats.yt_videos || []).slice(0, 4);
    state.tgNews = filterRecentTgNews(state.stats.tg_news || []);

    if (state.ytVideos.length === 0) {
      loadYoutubeFallback().then((vids) => {
        if (vids.length > 0) {
          state.ytVideos = vids.slice(0, 4);
          C.setText("ytCountBadge", state.ytVideos.length);
        }
      });
    }

    setupAvatar(state.stats.avatar);
    syncTiersFromStats();
    renderTiers();
    populateHeaderAndStats();
    populateGenreCheckboxes();
    syncControlsFromState();
    renderShelf();
    renderCatalog();
    initPromoConversion();
  }

  /* -------------------- TIERS & STATS -------------------- */
  function syncTiersFromStats() {
    const rawTiers = state.stats.tiers;
    if (!Array.isArray(rawTiers) || rawTiers.length === 0) return;
    state.tiers = C.DEFAULT_TIERS.map((def) => {
      const found = rawTiers.find((t) => Number(t.tier) === def.tier);
      if (!found) return def;
      const apiPrice = Number(found.price) || 0;
      const price = apiPrice >= 50 ? apiPrice : def.price;
      const oldPrice = Number(found.old_price || 0);
      const discount = oldPrice > price ? `-${Math.round((1 - price / oldPrice) * 100)}%` : "";
      const safeTitle = (def.tier === 3 && String(found.name || "").includes("2 ур")) ? def.title : (found.name || def.title);
      return {
        ...def,
        title: safeTitle,
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
      const disc = t.discount ? `<span class="tariff-discount">${C.escapeHtml(t.discount)}</span>` : "";
      const btnLabel = t.tier === 2 ? `Открыть все тайтлы • ${t.price} ₽/мес` : `Открыть • ${t.price} ₽/мес`;
      return `
        <div class="tariff-card ${t.featured ? "is-featured" : ""}" data-tier-card="${t.tier}">
          <div class="tariff-head">
            <div>
              <span class="tariff-kicker">${C.escapeHtml(t.kicker)}</span>
              <h3>${C.escapeHtml(t.title)}</h3>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              ${disc}
              <button type="button" class="tariff-help-btn" data-tier-help="${t.tier}" aria-label="Подробнее">?</button>
            </div>
          </div>
          <p class="tariff-desc">${C.escapeHtml(t.desc)}</p>
          <a href="${C.escapeHtml(t.url)}" target="_blank" rel="noopener noreferrer" class="btn tariff-cta" data-ym-event="${t.ymEvent}">
            ${C.escapeHtml(btnLabel)}
          </a>
        </div>
      `;
    }).join("");
  }

  function populateHeaderAndStats() {
    const total = state.catalog.length;
    C.setText("ytCountBadge", state.ytVideos.length);
    C.setText("tgCountBadge", state.tgNews.length);

    const goal = Array.isArray(state.stats.goals) && state.stats.goals[0] ? state.stats.goals[0] : {};
    const paidSubs = Number(goal.current || 176);
    const goalTarget = Number(goal.target || 200);
    const pct = Math.min(100, Math.round((paidSubs / Math.max(1, goalTarget)) * 100));
    if (goal.description) C.setText("goalTitleLeft", `Цель канала: ${goal.description}`);
    C.setText("goalNumbersRight", `${paidSubs} из ${goalTarget} (${pct}%)`);
    const bar = document.getElementById("goalBar");
    if (bar) bar.style.width = pct + "%";

    const freeSum = Number(state.stats.total_free_chapters) || state.catalog.reduce((acc, it) => acc + it.free_chapters, 0);
    const paidSum = Number(state.stats.total_paid_chapters) || state.catalog.reduce((acc, it) => acc + it.paid_chapters, 0);
    const totalSum = Number(state.stats.total_voiced_chapters) || state.catalog.reduce((acc, it) => acc + it.total_chapters, 0);

    C.setText("statSubs", (state.stats.subscribers || 1437).toLocaleString("ru-RU"));
    C.setText("statFreeCh", freeSum.toLocaleString("ru-RU") + " гл.");
    C.setText("statPaidCh", paidSum.toLocaleString("ru-RU") + " гл.");
    C.setText("statTotalCh", totalSum.toLocaleString("ru-RU") + " гл.");

    C.setText("cntAll", total);
    C.setText("cntFree", state.catalog.filter((i) => i.free_chapters > 0).length);
    C.setText("cntTier1", state.catalog.filter((i) => i.tier === 1).length);
    C.setText("cntTier2", state.catalog.filter((i) => i.tier === 2).length);

    const refDate = new Date(state.referenceNow);
    const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    C.setText("catalogDateBadge", `${months[refDate.getMonth()]} ${refDate.getFullYear()}`);
    C.setText("lastSyncText", `Обновлено: ${refDate.toLocaleDateString("ru-RU")}`);
  }

  /* -------------------- МУЛЬТИВЫБОР ЖАНРОВ С ГАЛОЧКАМИ -------------------- */
  function populateGenreCheckboxes() {
    const counts = {};
    state.catalog.forEach((it) => it.tags.forEach((t) => { if (t) counts[t] = (counts[t] || 0) + 1; }));
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const listEl = document.getElementById("genreCheckboxesList");
    if (!listEl) return;

    listEl.innerHTML = sorted.map((g) => {
      const checked = state.genres.includes(g) ? "checked" : "";
      return `
        <label class="multi-genre-item">
          <input type="checkbox" value="${C.escapeHtml(g)}" ${checked}>
          <span>${C.escapeHtml(g)}</span>
          <span class="multi-genre-cnt">${counts[g]}</span>
        </label>
      `;
    }).join("");
    updateGenreButtonLabel();
  }

  function updateGenreButtonLabel() {
    const btn = document.getElementById("genreMultiBtn");
    const label = document.getElementById("genreMultiLabel");
    if (!btn || !label) return;
    if (state.genres.length === 0) {
      label.textContent = "Все жанры";
      btn.classList.remove("has-selection");
    } else if (state.genres.length === 1) {
      label.textContent = state.genres[0];
      btn.classList.add("has-selection");
    } else {
      label.textContent = `Жанры (${state.genres.length})`;
      btn.classList.add("has-selection");
    }
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
    C.setText("weekCountSpan", weekItems.length);
    C.setText("monthCountSpan", monthItems.length);

    const items = state.shelfMode === "week" ? weekItems : monthItems;
    const track = document.getElementById("releasesTrack");
    if (!track) return;

    if (items.length === 0) {
      track.innerHTML = `<div class="results-summary" style="padding:8px;">Свежих релизов за этот период нет.</div>`;
      return;
    }

    track.innerHTML = items.map((item) => {
      const isWeek = state.shelfMode === "week";
      const img = isWeek ? (item.week_post_image || item.image) : item.image;
      const range = isWeek
        ? (item.week_range ? "Новое: " + item.week_range : item.updated)
        : (item.total_chapters > 0 ? `1-${item.total_chapters} гл.` : (item.month_range || item.updated));

      return `
        <button type="button" class="release-mini-card" data-release-id="${item.id}">
          <img src="${C.escapeHtml(img)}" referrerpolicy="no-referrer" data-fb="${C.escapeHtml(isWeek ? item.image : (item.remote_image || ""))}" alt="${C.escapeHtml(item.title)}" class="release-mini-img" loading="lazy" decoding="async">
          <div class="release-mini-info">
            <div class="release-mini-title">${C.escapeHtml(item.title)}</div>
            <div class="release-mini-range">${C.escapeHtml(range)}</div>
          </div>
        </button>
      `;
    }).join("");

    track.querySelectorAll("img").forEach((img) => {
      img.onerror = () => C.handleImgError(img, img.dataset.fb);
    });
  }

  function handleReleaseClick(itemId, mode) {
    const item = state.catalog.find((i) => String(i.id) === String(itemId));
    if (!item) return;
    if (mode === "month") {
      M.closeModal("mediaFeedModal");
      M.openChaptersModal(state, item.id, true, false);
      return;
    }
    const span = item.week_chapters_count;
    if (span > 10 || item.all_posts.length > 1 || !item.week_post_link) {
      M.closeModal("mediaFeedModal");
      M.openChaptersModal(state, item.id, true, false);
    } else {
      C.trackEvent("click_boosty_post", { title: item.title });
      window.open(C.buildUtmUrl(item.week_post_link, item.title), "_blank", "noopener,noreferrer");
    }
  }

  /* -------------------- MISSING SEARCH TRACKING -------------------- */
  function trackMissingSearchIfEmpty(q, count) {
    clearTimeout(missingPingTimer);
    if (count > 0 || q.length < 3) return;
    const slug = "q_" + C.translitSlug(q);
    if (state.trackedMissingQueries.has(slug)) return;

    missingPingTimer = setTimeout(() => {
      state.trackedMissingQueries.add(slug);
      const ns = `takayt_missing_${C.getMonthYearKey()}`;
      fetch(`https://api.counterapi.dev/v1/${ns}/${encodeURIComponent(slug)}/up`).catch(() => {});
    }, 1200);
  }

  /* -------------------- CATALOG RENDER -------------------- */
  function getFilteredCatalog() {
    if (Array.isArray(state.randomIds) && state.randomIds.length > 0) {
      return state.randomIds
        .map((rid) => state.catalog.find((i) => String(i.id) === String(rid)))
        .filter(Boolean);
    }

    const q = state.search.trim().toLowerCase();
    const list = state.catalog.filter((item) => {
      if (state.access === "free" && item.free_chapters <= 0) return false;
      if (state.access === "tier1" && item.tier !== 1) return false;
      if (state.access === "tier2" && item.tier !== 2) return false;
      if (state.type !== "all" && item.type !== state.type) return false;

      if (state.genres.length > 0) {
        const hasGenre = state.genres.some((g) => item.tags.includes(g));
        if (!hasGenre) return false;
      }

      if (state.special === "completed" && !item.is_completed) return false;
      if (state.special === "romance" && !item.is_romance) return false;
      if (state.special === "frozen" && !item.is_frozen) return false;
      if (state.special === "license" && !item.is_license) return false;

      if (state.tasteTags.length > 0) {
        const itemAllTags = [...item.tags, ...item.hidden_tags].map((x) => String(x).toLowerCase());
        const hasTaste = state.tasteTags.some((t) => itemAllTags.includes(t));
        if (!hasTaste) return false;
      }

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
      summary.textContent = state.randomIds
        ? `Случайная подборка: ${list.length} тайтла из ${state.catalog.length}`
        : `Найдено: ${list.length} из ${state.catalog.length} (манхва: ${counts.manhwa}, маньхуа: ${counts.manhua}, манга: ${counts.manga})`;
    }

    updateResetVisibility();
    trackMissingSearchIfEmpty(state.search.trim().toLowerCase(), list.length);

    if (list.length === 0) {
      grid.innerHTML = "";
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";

    const frag = document.createDocumentFragment();
    list.forEach((item, idx) => {
      const card = document.createElement("article");
      const cls = ["title-card"];
      if (item.is_frozen) cls.push("card-frozen");
      else if (item.is_completed) cls.push("card-completed");
      else if (item.is_romance) cls.push("card-romance");
      else if (item.is_license) cls.push("card-license");

      card.className = cls.join(" ");
      card.dataset.id = item.id;
      card.oncontextmenu = () => false;

      const badgesArr = [];
      if (item.is_frozen) badgesArr.push(`<span class="card-badge badge-frozen">❄ Заморожен</span>`);
      if (item.is_completed) badgesArr.push(`<span class="card-badge badge-completed">🔥 Завершён</span>`);
      if (item.is_romance) badgesArr.push(`<span class="card-badge badge-romance">🌸 Романтика</span>`);
      if (item.is_license) badgesArr.push(`<span class="card-badge badge-license">👑 2 ур. Лицензия</span>`);
      const badgesHtml = badgesArr.join("");

      const firstTag = item.tags[0] ? ` • ${C.escapeHtml(item.tags[0])}` : "";
      const hasFree = item.free_chapters > 0;

      const freeInfoHtml = hasFree
        ? `<div class="card-free-line">${item.total_chapters} глав • <strong>${C.escapeHtml(item.free_text)}</strong></div>`
        : `<div class="card-free-line">${item.total_chapters} глав • По подписке</div>`;

      const btnsHtml = hasFree
        ? `<button type="button" class="btn card-btn card-btn-free" data-open-free="${item.id}">Смотреть бесплатно</button>
           <button type="button" class="btn card-btn card-btn-accent" data-open-chapters="${item.id}">Все выпуски (${item.total_chapters} гл.) • ${item.price} ₽</button>`
        : `<button type="button" class="btn card-btn card-btn-accent" data-open-chapters="${item.id}">Открыть ${item.total_chapters} гл. • ${item.price} ₽</button>`;

      const fetchPrio = idx < 8 ? 'fetchpriority="high"' : 'loading="lazy"';

      card.innerHTML = `
        <div class="card-cover-wrap" data-open-chapters="${item.id}">
          <div class="cover-skeleton"></div>
          <img src="${C.escapeHtml(item.image)}" referrerpolicy="no-referrer" data-fb="${C.escapeHtml(item.remote_image || "")}" alt="${C.escapeHtml(item.title)}" class="card-cover-img" ${fetchPrio} decoding="async">
          <div class="card-top-badges">
            <div class="card-status-group">${badgesHtml}</div>
            <span class="card-badge">${item.total_chapters} гл.</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-list-main">
            <h3 class="card-title" data-open-chapters="${item.id}">${C.escapeHtml(item.title)}</h3>
            <div class="card-meta-line">${C.escapeHtml(item.typeLabel)}${firstTag}</div>
            ${freeInfoHtml}
            ${badgesHtml ? `<div class="card-list-badges">${badgesHtml}</div>` : ""}
          </div>
          <div class="card-actions">
            ${btnsHtml}
            <div class="card-footer-row">
              <span>Обновлено: ${C.escapeHtml(item.updated || "—")}</span>
              <button type="button" class="card-share-btn" data-share-id="${item.id}">Поделиться</button>
            </div>
          </div>
        </div>
      `;

      const coverImg = card.querySelector(".card-cover-img");
      if (coverImg) {
        coverImg.onerror = () => C.handleImgError(coverImg, coverImg.dataset.fb);
      }
      frag.appendChild(card);
    });

    grid.innerHTML = "";
    grid.appendChild(frag);
  }

  function updateResetVisibility() {
    const has = state.access !== "all" || state.type !== "all" || state.genres.length > 0 ||
      state.special !== "all" || state.search.trim() !== "" || state.tasteTags.length > 0 || Boolean(state.randomIds);
    const resetBtn = document.getElementById("resetFiltersBtn");
    if (resetBtn) resetBtn.style.display = has ? "inline-flex" : "none";

    const cnt = (state.access !== "all" ? 1 : 0) + (state.type !== "all" ? 1 : 0) +
      (state.genres.length > 0 ? 1 : 0) + (state.special !== "all" ? 1 : 0) + (state.tasteTags.length > 0 ? 1 : 0);
    const badge = document.getElementById("mobileFilterCountBadge");
    if (badge) {
      badge.textContent = cnt;
      badge.style.display = cnt > 0 ? "inline-block" : "none";
    }

    const tasteBtn = document.getElementById("tastePickerBtn");
    if (tasteBtn) {
      tasteBtn.classList.toggle("is-active", state.tasteTags.length > 0);
      tasteBtn.textContent = state.tasteTags.length > 0 ? `Теги (${state.tasteTags.length})` : "Теги";
    }
    const mobileTasteBtn = document.getElementById("mobileTasteBtn");
    if (mobileTasteBtn) {
      mobileTasteBtn.textContent = state.tasteTags.length > 0 ? `Теги (${state.tasteTags.length})` : "Теги";
    }
    document.getElementById("randomPickBtn")?.classList.toggle("is-active", Boolean(state.randomIds));
  }

  function syncControlsFromState() {
    ["searchInput", "mobileSearchInput"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = state.search;
    });
    const tf = document.getElementById("typeFilter"); if (tf) tf.value = state.type;
    const sf = document.getElementById("specialFilter"); if (sf) sf.value = state.special;
    const sortF = document.getElementById("sortFilter"); if (sortF) sortF.value = state.sort;

    document.querySelectorAll("#genreCheckboxesList input[type='checkbox']").forEach((cb) => {
      cb.checked = state.genres.includes(cb.value);
    });
    updateGenreButtonLabel();

    document.querySelectorAll("#accessTabs .access-tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.access === state.access);
    });
    document.getElementById("viewGridBtn")?.classList.toggle("active", state.viewMode === "grid");
    document.getElementById("viewListBtn")?.classList.toggle("active", state.viewMode === "list");
  }

  function closeMobileFilterSheet() {
    document.getElementById("filtersPanel")?.classList.remove("mobile-open");
    const bd = document.getElementById("mobileSheetBackdrop");
    if (bd) bd.style.display = "none";
  }

  function pickRandomFour() {
    if (state.catalog.length === 0) return;
    const pool = [...state.catalog];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    state.randomIds = pool.slice(0, 4).map((x) => x.id);
    renderCatalog();
    document.getElementById("catalogSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* -------------------- EVENTS -------------------- */
  function bindEvents() {
    document.getElementById("openYtModalBtn")?.addEventListener("click", () => M.openYtModal(state));
    document.getElementById("openTgModalBtn")?.addEventListener("click", () => M.openTgModal(state));
    document.getElementById("orderVoiceBtn")?.addEventListener("click", () => M.openModal("orderModal"));
    document.getElementById("openDmcaBtn")?.addEventListener("click", () => M.openModal("dmcaModal"));
    document.getElementById("openMediaFeedBtn")?.addEventListener("click", () => M.openMediaFeedModal(state, getShelfItems));

    const launchTour = () => T.startTour(closeMobileFilterSheet);
    document.getElementById("startTourBtn")?.addEventListener("click", launchTour);
    document.getElementById("footerTourBtn")?.addEventListener("click", launchTour);

    document.getElementById("tastePickerBtn")?.addEventListener("click", () => M.openTasteDrawer(state));
    document.getElementById("mobileTasteBtn")?.addEventListener("click", () => M.openTasteDrawer(state));
    document.getElementById("tasteDrawerClose")?.addEventListener("click", M.closeTasteDrawer);
    document.getElementById("tasteDrawerBackdrop")?.addEventListener("click", M.closeTasteDrawer);
    document.getElementById("tasteTagSearch")?.addEventListener("input", (e) => M.renderTasteTags(state, e.target.value));

    document.getElementById("randomPickBtn")?.addEventListener("click", pickRandomFour);
    document.getElementById("mobileRandomBtn")?.addEventListener("click", pickRandomFour);

    document.getElementById("tasteClearBtn")?.addEventListener("click", () => {
      state.tasteTags = [];
      state.randomIds = null;
      saveFilters();
      M.renderTasteTags(state, document.getElementById("tasteTagSearch")?.value || "");
      renderCatalog();
    });

    document.getElementById("tasteApplyBtn")?.addEventListener("click", () => {
      state.randomIds = null;
      saveFilters();
      M.closeTasteDrawer();
      renderCatalog();
    });

    /* Мультивыбор жанров */
    const genreBtn = document.getElementById("genreMultiBtn");
    const genreDd = document.getElementById("genreDropdown");
    genreBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = genreDd?.style.display === "none";
      if (genreDd) genreDd.style.display = open ? "flex" : "none";
      genreBtn.setAttribute("aria-expanded", String(open));
    });

    document.getElementById("genreCheckboxesList")?.addEventListener("change", (e) => {
      if (e.target.type !== "checkbox") return;
      state.randomIds = null;
      const val = e.target.value;
      if (e.target.checked) {
        if (!state.genres.includes(val)) state.genres.push(val);
      } else {
        state.genres = state.genres.filter((g) => g !== val);
      }
      updateGenreButtonLabel();
      saveFilters();
      renderCatalog();
    });

    document.getElementById("genreClearBtn")?.addEventListener("click", () => {
      state.genres = [];
      state.randomIds = null;
      syncControlsFromState();
      saveFilters();
      renderCatalog();
    });

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
      M.renderMediaFeedGrid(state, getShelfItems);
    });
    document.getElementById("modalTabMonthBtn")?.addEventListener("click", () => {
      state.modalShelfMode = "month";
      M.renderMediaFeedGrid(state, getShelfItems);
    });

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
      state.randomIds = null;
      state.search = val;
      ["searchInput", "mobileSearchInput"].forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.value !== val) el.value = val;
      });
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        saveFilters();
        renderCatalog();
      }, 160);
    };
    document.getElementById("searchInput")?.addEventListener("input", (e) => onSearch(e.target.value));
    document.getElementById("mobileSearchInput")?.addEventListener("input", (e) => onSearch(e.target.value));

    document.getElementById("typeFilter")?.addEventListener("change", (e) => { state.randomIds = null; state.type = e.target.value; saveFilters(); renderCatalog(); });
    document.getElementById("specialFilter")?.addEventListener("change", (e) => { state.randomIds = null; state.special = e.target.value; saveFilters(); renderCatalog(); });
    document.getElementById("sortFilter")?.addEventListener("change", (e) => { state.randomIds = null; state.sort = e.target.value; saveFilters(); renderCatalog(); });

    const reset = () => {
      state.access = "all"; state.type = "all"; state.genres = [];
      state.special = "all"; state.sort = "newest"; state.search = "";
      state.tasteTags = []; state.randomIds = null;
      saveFilters(); syncControlsFromState(); renderCatalog();
    };
    document.getElementById("resetFiltersBtn")?.addEventListener("click", reset);
    document.getElementById("emptyResetBtn")?.addEventListener("click", reset);

    document.getElementById("viewGridBtn")?.addEventListener("click", () => { state.viewMode = "grid"; saveFilters(); syncControlsFromState(); renderCatalog(); });
    document.getElementById("viewListBtn")?.addEventListener("click", () => { state.viewMode = "list"; saveFilters(); syncControlsFromState(); renderCatalog(); });

    document.addEventListener("click", (e) => {
      if (genreDd && genreDd.style.display !== "none" && !e.target.closest("#genreMultiWrap")) {
        genreDd.style.display = "none";
        genreBtn?.setAttribute("aria-expanded", "false");
      }

      const ym = e.target.closest("[data-ym-event]");
      if (ym) C.trackEvent(ym.dataset.ymEvent, { title: ym.dataset.ymTitle || "" });

      const cl = e.target.closest("[data-close-modal]");
      if (cl) { M.closeModal(cl.dataset.closeModal); return; }
      if (e.target.classList.contains("modal-backdrop")) { M.closeModal(e.target.id); return; }

      const acc = e.target.closest("#accessTabs .access-tab");
      if (acc) { state.randomIds = null; state.access = acc.dataset.access; saveFilters(); syncControlsFromState(); renderCatalog(); return; }

      const tasteChip = e.target.closest("[data-taste-tag]");
      if (tasteChip) {
        const tag = tasteChip.dataset.tasteTag;
        if (state.tasteTags.includes(tag)) {
          state.tasteTags = state.tasteTags.filter((x) => x !== tag);
          tasteChip.classList.remove("is-selected");
        } else {
          state.tasteTags.push(tag);
          tasteChip.classList.add("is-selected");
        }
        M.updateTasteApplyButton(state);
        return;
      }

      const help = e.target.closest("[data-tier-help]");
      if (help) { M.openTierInfoModal(state, help.dataset.tierHelp); return; }

      const share = e.target.closest("[data-share-id]");
      if (share) {
        const it = state.catalog.find((x) => String(x.id) === String(share.dataset.shareId));
        if (it) {
          navigator.clipboard?.writeText(C.buildUtmUrl(it.url, it.title)).catch(() => {});
          const orig = share.textContent; share.textContent = "Скопировано";
          setTimeout(() => { share.textContent = orig; }, 1200);
        }
        return;
      }

      const freeBtn = e.target.closest("[data-open-free]");
      if (freeBtn) { M.openChaptersModal(state, freeBtn.dataset.openFree, false, true); return; }

      const ch = e.target.closest("[data-open-chapters]");
      if (ch) { M.openChaptersModal(state, ch.dataset.openChapters, false, false); return; }

      const rel = e.target.closest("[data-release-id]");
      if (rel) { handleReleaseClick(rel.dataset.releaseId, state.shelfMode); return; }

      const feed = e.target.closest("[data-feed-id]");
      if (feed) { handleReleaseClick(feed.dataset.feedId, state.modalShelfMode); return; }

      const tg = e.target.closest("[data-tg-idx]");
      if (tg) { M.openTgPostReader(state, Number(tg.dataset.tgIdx)); return; }
    });

    T.bindTourEvents();

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        T.endTour();
        closeMobileFilterSheet();
        M.closeTasteDrawer();
        if (genreDd) genreDd.style.display = "none";
        const open = Array.from(document.querySelectorAll(".modal-backdrop")).filter((m) => m.style.display === "flex");
        if (open.length) M.closeModal(open[open.length - 1].id);
      }
    });
  }

  initTheme();
  checkGeoRestriction();
  loadSavedFilters();
  bindEvents();
  loadCatalog();
})();
