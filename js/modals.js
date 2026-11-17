/* Модальные окна, выдвижной ползунок тегов, триггеры и выгода в главах ТАКА */
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
    const drawerOpen = document.getElementById("tasteDrawer")?.classList.contains("is-open");
    const anyModal = Array.from(document.querySelectorAll(".modal-backdrop")).some((m) => m.style.display === "flex");
    if (!anyModal && !drawerOpen) {
      document.body.style.overflow = "";
    }
  }

  function openChaptersModal(state, itemId, highlightRecent, focusFree, onOpenCallback) {
    const item = state.catalog.find((i) => String(i.id) === String(itemId));
    if (!item) return;
    const body = document.getElementById("chaptersModalBody");
    if (!body) return;

    if (typeof onOpenCallback === "function") {
      onOpenCallback(item.id);
    }

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
    const normTitle = C.strictNormalize(item.title);

    const rowsHtml = posts.map((p, idx) => {
      const postUrl = C.buildUtmUrl(p.url, item.title);
      const isFree = p.is_free;
      const cls = [
        "chapter-row",
        isFree ? "is-free" : "is-paid-glow",
        focusFree && isFree ? "is-free-focus" : "",
        highlightRecent && p.is_recent ? "is-recent" : ""
      ].filter(Boolean).join(" ");

      const newBadge = highlightRecent && p.is_recent ? `<span class="chapter-new-tag">Новое</span>` : "";

      let label = p.range;
      if (!label) {
        const rawT = String(p.title || "");
        label = C.strictNormalize(rawT) === normTitle ? `Выпуск #${idx + 1}` : (rawT || `Выпуск #${idx + 1}`);
      }
      const meta = `${p.date || item.updated || "—"} • ${isFree ? "Бесплатно" : `${p.tier} ур.`}`;

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

    // Триггер после бесплатных глав
    const freeTriggerHtml = (focusFree && item.paid_chapters > 0 && item.free_chapters > 0)
      ? `<div class="chapters-free-trigger">
           <span>После ${item.free_chapters}-й главы — продолжение уже озвучено до <strong>${item.total_chapters}-й</strong></span>
           <a href="${C.escapeHtml(C.buildUtmUrl(tierObj.url, item.title))}" target="_blank" rel="noopener noreferrer" data-ym-event="${tierObj.ymEvent}">Открыть по ${item.tier} ур. ↗</a>
         </div>`
      : "";

    // Расчёт выгоды в рублях за главу
    let bannerHtml = "";
    if (item.paid_chapters > 0) {
      const perCh = item.price / item.paid_chapters;
      const perChText = perCh < 1 ? "меньше 1 ₽" : `≈ ${Math.round(perCh)} ₽`;
      bannerHtml = `
        <div class="chapters-subscribe-banner">
          <div>
            <div class="chapters-banner-title">Ещё ${item.paid_chapters} глав доступны сразу по ${item.tier} уровню (${perChText} за главу)</div>
            <div class="chapters-banner-sub">Подписка ${item.price} ₽/мес откроет закрытые выпуски без ожидания</div>
          </div>
          <a href="${C.escapeHtml(C.buildUtmUrl(tierObj.url, item.title))}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" data-ym-event="${tierObj.ymEvent}">Подписаться • ${item.price} ₽</a>
        </div>`;
    }

    body.innerHTML = `
      <div class="chapters-hero">
        <div class="chapters-cover-box">
          <img src="${C.escapeHtml(item.image)}" referrerpolicy="no-referrer" data-fb="${C.escapeHtml(item.remote_image || "")}" alt="${C.escapeHtml(item.title)}">
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
      ${freeTriggerHtml}
      <div class="chapters-grid-list">${rowsHtml}</div>
      ${bannerHtml}
    `;

    const heroImg = body.querySelector(".chapters-cover-box img");
    if (heroImg) heroImg.onerror = () => C.handleImgError(heroImg, heroImg.dataset.fb);

    openModal("chaptersModal");

    if (focusFree) {
      const firstFree = body.querySelector(".chapter-row.is-free");
      if (firstFree) {
        setTimeout(() => firstFree.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
      }
    }
  }

  function openYtModal(state) {
    C.trackEvent("open_yt_modal");
    const grid = document.getElementById("ytVideosGrid");
    const vids = state.ytVideos.slice(0, 4);
    if (grid) {
      grid.innerHTML = vids.length === 0
        ? `<p class="modal-text">Видео пока не загружены.</p>`
        : vids.map((v) => {
            const chRange = C.extractChaptersFromTitle(v.title);
            return `
              <article class="yt-video-card">
                <div class="yt-thumb-wrap"><img src="${C.escapeHtml(v.image || v.thumbnail || C.PLACEHOLDER_SVG)}" referrerpolicy="no-referrer" alt="${C.escapeHtml(v.title)}" decoding="async"></div>
                <div class="yt-card-body">
                  <div class="yt-card-meta"><span>${C.escapeHtml(v.date || "")}</span><span>${C.escapeHtml(chRange ? "Главы: " + chRange : "")}</span></div>
                  <h3 class="yt-card-title">${C.escapeHtml(v.title)}</h3>
                  <a href="${C.escapeHtml(v.link || v.url)}" target="_blank" rel="noopener noreferrer" class="btn yt-watch-btn">Смотреть на YouTube ↗</a>
                </div>
              </article>
            `;
          }).join("");
      grid.querySelectorAll("img").forEach((img) => {
        img.onerror = () => C.handleImgError(img, "");
      });
    }
    openModal("ytModal");
  }

  function openTgModal(state) {
    C.trackEvent("open_tg_modal");
    const grid = document.getElementById("tgPostsGrid");
    if (grid) {
      grid.innerHTML = state.tgNews.length === 0
        ? `<p class="modal-text">За последние 7 дней свежих постов не было.</p>`
        : state.tgNews.map((post, idx) => `
            <button type="button" class="tg-post-card" data-tg-idx="${idx}">
              ${post.image ? `<img src="${C.escapeHtml(post.image)}" referrerpolicy="no-referrer" onerror="this.style.display='none';" alt="" class="tg-post-thumb" decoding="async">` : ""}
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
      ${post.image ? `<div class="tg-reader-media"><img src="${C.escapeHtml(post.image)}" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none';" alt=""></div>` : ""}
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
          const rangeText = mode === "week"
            ? (item.week_range || "Свежее обновление")
            : `1-${item.total_chapters} гл.`;
          return `
            <button type="button" class="media-feed-card" data-feed-id="${item.id}">
              <div class="media-feed-cover"><img src="${C.escapeHtml(img)}" referrerpolicy="no-referrer" data-fb="${C.escapeHtml(item.image)}" alt="${C.escapeHtml(item.title)}" loading="lazy" decoding="async"></div>
              <div class="media-feed-info">
                <div class="media-feed-date">${C.escapeHtml(item.updated || "")}</div>
                <div class="media-feed-title">${C.escapeHtml(item.title)}</div>
                <div class="media-feed-sub">${C.escapeHtml(rangeText)}</div>
              </div>
            </button>
          `;
        }).join("");

    grid.querySelectorAll("img").forEach((img) => {
      img.onerror = () => C.handleImgError(img, img.dataset.fb);
    });
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

  function openPromoModal(state, variantIdx) {
    const variants = C.PROMO_VARIANTS;
    const v = variants[variantIdx % variants.length];
    const tier2 = state.tiers.find((t) => t.tier === 2) || C.DEFAULT_TIERS[1];

    C.setText("promoBadge", v.badge);
    C.setText("promoTitle", v.title);
    C.setText("promoDesc", v.desc);

    const perksEl = document.getElementById("promoPerks");
    if (perksEl) {
      perksEl.innerHTML = v.perks.map((p) => `<div class="promo-perk-item"><span class="promo-perk-dot">✓</span><span>${C.escapeHtml(p)}</span></div>`).join("");
    }
    const ctaEl = document.getElementById("promoCtaLink");
    if (ctaEl) {
      ctaEl.textContent = v.cta;
      ctaEl.href = C.buildUtmUrl(tier2.url, "promo_popup_" + (variantIdx % variants.length));
    }
    C.trackEvent("promo_popup_shown", { variant: variantIdx % variants.length });
    openModal("promoModal");
  }

  /* ВЫДВИЖНОЙ ПОЛЗУНОК ТЕГОВ */
  function renderTasteTags(state, tagFilterQuery) {
    const grid = document.getElementById("tasteTagsGrid");
    if (!grid) return;

    const counts = {};
    state.catalog.forEach((it) => {
      [...it.tags, ...it.hidden_tags].forEach((tag) => {
        const t = String(tag || "").trim().toLowerCase();
        if (t) counts[t] = (counts[t] || 0) + 1;
      });
    });

    const q = String(tagFilterQuery || "").trim().toLowerCase();
    const sorted = Object.keys(counts)
      .filter((t) => !q || t.includes(q))
      .sort((a, b) => counts[b] - counts[a]);

    grid.innerHTML = sorted.length === 0
      ? `<p class="modal-text">Теги не найдены.</p>`
      : sorted.map((t) => {
          const selected = state.tasteTags.includes(t) ? "is-selected" : "";
          return `<button type="button" class="taste-chip ${selected}" data-taste-tag="${C.escapeHtml(t)}">${C.escapeHtml(t)} (${counts[t]})</button>`;
        }).join("");

    updateTasteApplyButton(state);
  }

  function updateTasteApplyButton(state) {
    const btn = document.getElementById("tasteApplyBtn");
    if (!btn) return;
    if (state.tasteTags.length === 0) {
      btn.textContent = "Показать все тайтлы";
      return;
    }
    const matching = state.catalog.filter((it) => {
      const all = [...it.tags, ...it.hidden_tags].map((x) => String(x).toLowerCase());
      return state.tasteTags.some((t) => all.includes(t));
    }).length;
    btn.textContent = `Показать (${matching})`;
  }

  function openTasteDrawer(state) {
    const searchInput = document.getElementById("tasteTagSearch");
    if (searchInput) searchInput.value = "";
    renderTasteTags(state, "");

    const drawer = document.getElementById("tasteDrawer");
    const backdrop = document.getElementById("tasteDrawerBackdrop");
    if (drawer) drawer.classList.add("is-open");
    if (backdrop) backdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeTasteDrawer() {
    const drawer = document.getElementById("tasteDrawer");
    const backdrop = document.getElementById("tasteDrawerBackdrop");
    if (drawer) drawer.classList.remove("is-open");
    if (backdrop) backdrop.classList.remove("is-open");
    const anyModal = Array.from(document.querySelectorAll(".modal-backdrop")).some((m) => m.style.display === "flex");
    if (!anyModal) document.body.style.overflow = "";
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
    openPromoModal,
    openTasteDrawer,
    closeTasteDrawer,
    renderTasteTags,
    updateTasteApplyButton
  };
})();
