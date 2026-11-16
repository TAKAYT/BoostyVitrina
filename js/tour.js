/* Раздельное обучение: ПК-гид с маскотом и точной подсветкой + упрощённый мобильный онбординг */
(function () {
  "use strict";

  const C = window.TakaConfig;

  const DESKTOP_STEPS = [
    {
      selector: "#filtersPanel",
      title: "Умный поиск и подбор по вкусам",
      text: "Ищите по названию, жанру или скрытым тегам, подбирайте «По вкусам» или жмите «Случайные 4»."
    },
    {
      selector: "#releasesSection",
      title: "Лента свежих релизов",
      text: "Все новинки за неделю и месяц. Если вышло больше 10 глав, откроется окно выбора конкретного выпуска."
    },
    {
      selector: ".catalog-grid",
      title: "Бесплатные серии и голосование",
      text: "Нажмите на карточку, чтобы открыть список постов, или нажмите «Жду проду», чтобы поднять тайтл в рейтинге."
    },
    {
      selector: "#tiersSection",
      title: "Тарифы подписки Boosty",
      text: "2-й уровень (500 ₽) открывает всю библиотеку, закрытые Лицензии и доступ в Telegram-чат."
    },
    {
      selector: ".pc-sidebar",
      title: "Быстрая навигация",
      text: "Боковая панель всегда под рукой: переходите к новинкам, YouTube, Telegram или меняйте тему в один клик."
    }
  ];

  const MOBILE_STEPS = [
    {
      title: "Быстрый поиск и фильтры",
      text: "Ищите манхву сверху или нажмите «Фильтры» для выбора жанра, статуса и уровня подписки. Кнопка «По вкусам» подберёт тайтлы по вашим любимым тегам."
    },
    {
      title: "Свежие выпуски за неделю",
      text: "Листайте карусель новинок свайпом. Если вышло сразу много глав, откроется удобный список всех постов Boosty."
    },
    {
      title: "Бесплатные главы и «Жду проду»",
      text: "Нажмите на любую карточку — зелёным отмечены бесплатные серии. Кнопка «Жду проду» внизу карточки помогает автору выбирать приоритеты озвучки."
    },
    {
      title: "Оптимальный 2-й уровень",
      text: "2-й уровень подписки (500 ₽/мес) открывает все тайтлы, закрытые Лицензии и стримы."
    }
  ];

  let desktopIdx = 0;
  let mobileIdx = 0;
  let repositionTimer = null;

  function isMobileViewport() {
    return window.innerWidth <= 768;
  }

  function startTour(closeMobileSheetFn) {
    if (typeof closeMobileSheetFn === "function") closeMobileSheetFn();
    if (isMobileViewport()) {
      mobileIdx = 0;
      renderMobileStep();
    } else {
      desktopIdx = 0;
      renderDesktopStep();
    }
  }

  function updateSpotlightPosition() {
    const overlay = document.getElementById("tourOverlay");
    const spotlight = document.getElementById("tourSpotlight");
    const tooltip = document.getElementById("tourTooltip");
    if (!overlay || overlay.style.display === "none" || !spotlight || !tooltip) return;

    const step = DESKTOP_STEPS[desktopIdx];
    if (!step) return;
    const target = document.querySelector(step.selector);
    if (!target) return;

    const r = target.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(8, r.top - pad);
    const left = Math.max(8, r.left - pad);
    const width = Math.min(window.innerWidth - 16, r.width + pad * 2);
    const height = Math.min(window.innerHeight - 16, r.height + pad * 2);

    spotlight.style.top = `${top}px`;
    spotlight.style.left = `${left}px`;
    spotlight.style.width = `${width}px`;
    spotlight.style.height = `${height}px`;

    const ttWidth = 320;
    const ttHeight = tooltip.offsetHeight || 175;
    let ttTop = r.bottom + 14;
    if (ttTop + ttHeight > window.innerHeight - 16) {
      ttTop = Math.max(16, r.top - ttHeight - 14);
    }
    let ttLeft = r.left;
    if (r.width < 120) ttLeft = r.right + 16;
    ttLeft = Math.min(window.innerWidth - ttWidth - 16, Math.max(16, ttLeft));

    tooltip.style.top = `${ttTop}px`;
    tooltip.style.left = `${ttLeft}px`;
  }

  function renderDesktopStep() {
    const overlay = document.getElementById("tourOverlay");
    if (!overlay) return;
    if (desktopIdx >= DESKTOP_STEPS.length) {
      endTour();
      return;
    }

    const step = DESKTOP_STEPS[desktopIdx];
    const target = document.querySelector(step.selector);
    if (!target) {
      desktopIdx++;
      renderDesktopStep();
      return;
    }

    overlay.style.display = "block";
    C.setText("tourStepBadge", `Шаг ${desktopIdx + 1} из ${DESKTOP_STEPS.length}`);
    C.setText("tourTitle", step.title);
    C.setText("tourText", step.text);
    C.setText("tourNextBtn", desktopIdx === DESKTOP_STEPS.length - 1 ? "Готово" : "Далее");

    const prevBtn = document.getElementById("tourPrevBtn");
    if (prevBtn) prevBtn.style.display = desktopIdx > 0 ? "inline-flex" : "none";

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    clearTimeout(repositionTimer);
    repositionTimer = setTimeout(updateSpotlightPosition, 340);
  }

  function renderMobileStep() {
    const sheet = document.getElementById("mobileTourSheet");
    if (!sheet) return;
    if (mobileIdx >= MOBILE_STEPS.length) {
      endTour();
      return;
    }

    const step = MOBILE_STEPS[mobileIdx];
    sheet.style.display = "flex";
    C.setText("mobileTourStepBadge", `Шаг ${mobileIdx + 1} из ${MOBILE_STEPS.length}`);
    C.setText("mobileTourTitle", step.title);
    C.setText("mobileTourText", step.text);
    C.setText("mobileTourNextBtn", mobileIdx === MOBILE_STEPS.length - 1 ? "Готово" : "Далее");

    const prevBtn = document.getElementById("mobileTourPrevBtn");
    if (prevBtn) prevBtn.style.visibility = mobileIdx > 0 ? "visible" : "hidden";

    const dots = document.getElementById("mobileTourDots");
    if (dots) {
      dots.innerHTML = MOBILE_STEPS.map((_, i) =>
        `<span class="mobile-tour-dot ${i === mobileIdx ? "active" : ""}"></span>`
      ).join("");
    }
  }

  function endTour() {
    const overlay = document.getElementById("tourOverlay");
    const mobileSheet = document.getElementById("mobileTourSheet");
    if (overlay) overlay.style.display = "none";
    if (mobileSheet) mobileSheet.style.display = "none";
    try { localStorage.setItem(C.TOUR_DONE_KEY, "1"); } catch (_) {}
  }

  function initMascotGuide(closeMobileSheetFn) {
    if (window.innerWidth < 1200) return;
    if (localStorage.getItem(C.MASCOT_HIDDEN_KEY) === "1") return;
    if (document.getElementById("mascotWidget")) return;

    const wrap = document.createElement("div");
    wrap.className = "mascot-widget";
    wrap.id = "mascotWidget";
    wrap.innerHTML = `
      <div class="mascot-bubble" id="mascotBubble">
        <button type="button" class="mascot-bubble-close" id="mascotCloseBtn" aria-label="Скрыть гида">✕</button>
        <div id="mascotText">Привет! Нажми на любую карточку, чтобы выбрать бесплатные или платные главы.</div>
        <button type="button" class="mascot-bubble-cta" id="mascotTourBtn">Обучение →</button>
      </div>
      <div class="mascot-sprite-wrap" id="mascotSpriteWrap" title="Запустить обучение">
        <img src="media_cache/mascot.png" onerror="this.onerror=null;this.src='media_cache/mascot.jpg';" alt="Гид ТАКА" class="mascot-sprite" loading="lazy" decoding="async">
      </div>
    `;
    document.body.appendChild(wrap);

    document.getElementById("mascotCloseBtn")?.addEventListener("click", () => {
      wrap.remove();
      try { localStorage.setItem(C.MASCOT_HIDDEN_KEY, "1"); } catch (_) {}
    });

    document.getElementById("mascotSpriteWrap")?.addEventListener("click", () => startTour(closeMobileSheetFn));
    document.getElementById("mascotTourBtn")?.addEventListener("click", () => startTour(closeMobileSheetFn));

    document.querySelectorAll("[data-tier-card='2']").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        C.setText("mascotText", "Оптимальный выбор: открывает всю базу, Лицензии и закрытый Telegram-чат!");
      });
    });
  }

  function bindTourEvents(closeMobileSheetFn) {
    document.getElementById("tourSkipBtn")?.addEventListener("click", endTour);
    document.getElementById("tourPrevBtn")?.addEventListener("click", () => {
      if (desktopIdx > 0) { desktopIdx--; renderDesktopStep(); }
    });
    document.getElementById("tourNextBtn")?.addEventListener("click", () => {
      desktopIdx++;
      renderDesktopStep();
    });

    document.getElementById("mobileTourCloseBtn")?.addEventListener("click", endTour);
    document.getElementById("mobileTourPrevBtn")?.addEventListener("click", () => {
      if (mobileIdx > 0) { mobileIdx--; renderMobileStep(); }
    });
    document.getElementById("mobileTourNextBtn")?.addEventListener("click", () => {
      mobileIdx++;
      renderMobileStep();
    });

    window.addEventListener("resize", () => {
      const overlay = document.getElementById("tourOverlay");
      if (overlay && overlay.style.display !== "none") {
        if (isMobileViewport()) {
          overlay.style.display = "none";
          mobileIdx = 0;
          renderMobileStep();
        } else {
          updateSpotlightPosition();
        }
      }
    });

    window.addEventListener("scroll", () => {
      const overlay = document.getElementById("tourOverlay");
      if (overlay && overlay.style.display !== "none" && !isMobileViewport()) {
        updateSpotlightPosition();
      }
    }, { passive: true });
  }

  window.TakaTour = {
    startTour,
    endTour,
    initMascotGuide,
    bindTourEvents
  };
})();
