/* Модальные окна ТАКА: выбор глав (сетка фото №3), YouTube, Telegram, лента новинок, подбор по вкусам */
(function () {
  "use strict";

  const C = window.TakaConfig;

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

  function openChaptersModal(state, itemId, highlightRecent) {
    const item = state.catalog.find((i) => String(i.id) === String(itemId));
    if (!item) return;
    const body = document.getElementById("chaptersModalBody");
    if (!body) return;

    const posts = item.all_posts.length > 0
      ? item.all_posts
      : [{
          title: item.title,
          range: `1-${item.total_chapters} гл.`,
          url: item.url,
          date: item.updated,
          is_free: item.free_chapters > 0,
          is_recent: item.is_week_new,
          tier: item.tier
        }];

    const tierObj = state.tiers.find((t) => t.tier === item.tier) || state.tiers[0];

    const rowsHtml = posts.map((p) => {
      const postUrl = C.buildUtmUrl(p.url, item.title);
      const isFree = p.is_free;
      const cls = `chapter-row ${isFree ? "is-free" : ""} ${highlightRecent && p.is_recent ? "is-recent" : ""}`;
      const newBadge = highlightRecent && p.is_recent ? `<span class="chapter-new-tag">Новое</span>` : "";
      const label = p.range || p.title || "Выпуск";
      const meta = `${p.date || item.updated || "—"} • ${isFree ? "Бесплатно" : `${p.tier} ур. подписки`}`;

      return `
        <a href="${C.escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer" class="${cls}" data-ym-event="${isFree ? "click_free_chapters" : "click_boosty_post"}" data-ym-title="${C.escapeHtml(item.title)}">
          <div class="chapter-row-title">
            <span>${C.escapeHtml(label)}</span>
            ${newBadge}
          </div>
          <div class="chapter-row-meta">${C.escapeHtml(meta)}</div>
        </a>
      `;
    }).join("");

    body.innerHTML = `
      <div class="chapters-hero">
        <div class="chapters-cover-box">
          <img src="${C.escapeHtml(item.image)}" onerror="this.onerror=null;this.src='${C.PLACEHOLDER_SVG}';" alt="${C.escapeHtml(item.title)}">
        </div>
        <div class="chapters-hero-info">
          <h2>${C.escapeHtml(item.title)}</h2>
          <p class="chapters-hero-sub">Тип: ${C.escapeHtml(item.typeLabel)}. Выберите нужный выпуск — вы перейдёте сразу на пост Boosty.</p>
          <div class="chapters-hero-badges">
            <span class="ch-pill">Озвучено: <strong>${item.total_chapters} гл.</strong></span>
            <span class="ch-pill ch-pill-free">Бесплатно: <strong>${item.free_chapters} гл.</strong></span>
            <span class="ch-pill">Платные: <strong>${item.paid_chapters} гл.</strong></span>
          </div>
        </div>
      </div>
      <div class="chapters-grid-list">${rowsHtml}</div>
      ${item.paid_chapters > 0 ? `
        <div class="chapters-subscribe-banner">
          <div>
            <div class="chapters-banner-title">Открыть все ${item.total_chapters} глав без ограничений</div>
            <div class="chapters-banner-sub">Подписка ${item.tier} уровня (${item.price} ₽/мес) откроет закрытые посты сразу</div>
          </div>
          <a href="${C.escapeHtml(C.buildUtmUrl(tierObj.url, item.title))}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" data-ym-event="${tierObj.ymEvent}">Подписаться • ${item.price} ₽</a>
        </div>` : ""}
    `;
    openModal("chaptersModal");
  }

  function openYtModal(state) {
    C.trackEvent("open_yt_modal");
    const grid = document.getElementById("ytVideosGrid");
    if (grid) {
      grid.innerHTML = state.ytVideos.length === 0
        ? `<p class="modal-text">Видео пока не загружены.</p>`
        : state.ytVideos.map((v) => {
            const chRange = C.extractChaptersFromTitle(v.title);
            return `
              <article class="yt-video-card">
                <div class="yt-thumb-wrap"><img src="${C.escapeHtml(v.image || v.thumbnail || C.PLACEHOLDER_SVG)}" alt="${C.escapeHtml(v.title)}" loading="lazy" decoding="async"></div>
                <div class="yt-card-body">
                  <div class="yt-card-meta"><span>${C.escapeHtml(v.date || "")}</span><span>${C.escapeHtml(chRange ? "Главы: " + chRange : "")}</span></div>
                  <h3 class="yt-card-title">${C.escapeHtml(v.title)}</h3>
                  <a href="${C.escapeHtml(v.link || v.url)}" target="_blank" rel="noopener noreferrer" class="btn yt-watch-btn">Смотреть на YouTube ↗</a>
                </div>
              </article>
            `;
          }).join("");
    }
    openModal("ytModal");
  }

  function openTgModal(state) {
    C.trackEvent("open_tg_modal");
    const grid = document.getElementById("tgPostsGrid");
    if (grid) {
      grid.innerHTML = state.tgNews.length === 0
        ? `<p class="modal-text">Посты пока не загружены.</p>`
        : state.tgNews.map((post, idx) => `
            <button type="button" class="tg-post-card" data-tg-idx="${idx}">
              ${post.image ? `<img src="${C.escapeHtml(post.image)}" alt="" class="tg-post-thumb" loading="lazy" decoding="async">` : ""}
              <div class="tg-post-preview">
                <div class="tg-post-date">${C.escapeHtml(post.date || "")} • Читать на сайте</div>
                <div class="tg-post-snippet">${C.escapeHtml(post.short_text || post.full_text || post.text || "")}</div>
              </div>
            </button>
          `).join("");
    }
    openModal("tgModal");
  }

  function openTgPostReader(state, idx) {
    const post = state.tgNews[idx];
    const body = document.getElementById("tgPostReaderBody");
    if (!post || !body) return;
    body.innerHTML = `
      <div class="tg-post-date" style="margin-bottom:10px;">${C.escapeHtml(post.date || "")} • Telegram ТАКА</div>
      ${post.image ? `<div class="tg-reader-media"><img src="${C.escapeHtml(post.image)}" alt=""></div>` : ""}
      <div class="tg-reader-text">${C.escapeHtml(post.full_text || post.text || "")}</div>
    `;
    openModal("tgPostReaderModal");
  }

  function renderMediaFeedGrid(state, getShelfItems) {
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
              <div class="media-feed-cover"><img src="${C.escapeHtml(img)}" data-fallback="${C.escapeHtml(item.image)}" onerror="this.onerror=null;this.src=this.dataset.fallback;" alt="${C.escapeHtml(item.title)}" loading="lazy" decoding="async"></div>
              <div class="media-feed-info">
                <div class="media-feed-date">${C.escapeHtml(item.updated || "")}</div>
                <div class="media-feed-title">${C.escapeHtml(item.title)}</div>
                <div class="media-feed-sub">${C.escapeHtml(rangeText)}</div>
              </div>
            </button>
          `;
        }).join("");
  }

  function openMediaFeedModal(state, getShelfItems) {
    renderMediaFeedGrid(state, getShelfItems);
    openModal("mediaFeedModal");
  }

  function openTierInfoModal(state, tierKey) {
    const t = state.tiers.find((x) => String(x.tier) === String(tierKey));
    const body = document.getElementById("tierInfoBody");
    if (!t || !body) return;
    body.innerHTML = `
      <h2 class="modal-title-sm">${C.escapeHtml(t.title)} (${t.price} ₽/мес)</h2>
      <p class="modal-text">${C.escapeHtml(t.desc)}</p>
      <a href="${C.escapeHtml(t.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-full" data-ym-event="${t.ymEvent}">Оформить на Boosty ↗</a>
    `;
    openModal("tierInfoModal");
  }

  function openTasteModal(state) {
    const grid = document.getElementById("tasteTagsGrid");
    if (!grid) return;

    const counts = {};
    state.catalog.forEach((it) => {
      [...it.tags, ...it.hidden_tags].forEach((tag) => {
        const t = String(tag || "").trim().toLowerCase();
        if (t) counts[t] = (counts[t] || 0) + 1;
      });
    });

    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    grid.innerHTML = sorted.map((t) => {
      const selected = state.tasteTags.includes(t) ? "is-selected" : "";
      return `<button type="button" class="taste-chip ${selected}" data-taste-tag="${C.escapeHtml(t)}">${C.escapeHtml(t)} (${counts[t]})</button>`;
    }).join("");

    openModal("tasteModal");
  }

  window.TakaModals = {
    openModal,
    closeModal,
    openChaptersModal,
    openYtModal,
    openTgModal,
    openTgPostReader,
    renderMediaFeedGrid,
    openMediaFeedModal,
    openTierInfoModal,
    openTasteModal
  };
})();
