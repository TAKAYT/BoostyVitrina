/* Единое обучение для ПК и мобильных: плавный автоскролл, подсветка и закрытие по крестику */
(function () {
  "use strict";

  const C = window.TakaConfig;

  const DESKTOP_STEPS = [
    {
      selector: "#filtersPanel",
      title: "Умный поиск и ползунок тегов",
      text: "Ищите по названию, жанру или статусу. Кнопка «Теги» открывает выдвижную панель выбора как на Senkuro."
    },
    {
      selector: "#releasesSection",
      title: "Лента свежих релизов",
      text: "Все новинки за неделю и месяц. Нажмите на любой тайтл, чтобы открыть свежие главы."
    },
    {
      selector: ".catalog-grid",
      title: "Бесплатные серии и голосование",
      text: "Зелёная кнопка ведёт к бесплатным главам, а «Хочу проду» поднимает тайтл в рейтинге озвучки."
    },
    {
      selector: "#tiersSection",
      title: "Тарифы подписки Boosty",
      text: "2-й уровень (500 ₽/мес) открывает всю библиотеку, закрытые Лицензии и доступ в Telegram-чат."
    },
    {
      selector: ".pc-sidebar",
      title: "Быстрая навигация",
      text: "Переключайтесь между режимами (например, только каталог), открывайте теги, YouTube и новости Telegram."
    }
  ];

  const MOBILE_STEPS = [
    {
      selector: "#mobileFilterBar",
      title: "Быстрый поиск и фильтры",
      text: "Находите манхву по названию или открывайте шторку фильтров по жанрам и уровням подписки."
    },
    {
      selector: "#mobileQuickChips",
      title: "Теги и случайная подборка",
      text: "Нажмите «Теги», чтобы открыть выдвижной ползунок с жанрами, или «Случайные 4» для быстрого выбора."
    },
    {
      selector: "#releasesSection",
      title: "Свежие выпуски за неделю",
      text: "Листайте карусель новинок свайпом. Нажмите на обложку, чтобы перейти к новым главам."
    },
    {
      selector: ".catalog-grid",
      title: "Бесплатные главы и «Хочу проду»",
      text: "Зелёная кнопка сразу открывает бесплатные выпуски, а кнопка «Хочу проду» помогает выбирать приоритеты."
    },
    {
      selector: "#tiersSection",
      title: "Оптимальный 2-й уровень",
      text: "2-й уровень (500 ₽/мес) открывает все тайтлы, Лицензии и закрытые стримы."
    }
  ];

  let activeSteps = DESKTOP_STEPS;
  let stepIdx = 0;
  let rafId = null;

  function isMobileViewport() {
    return window.innerWidth <= 768;
  }

  function startTour(closeMobileSheetFn, resetSectionsFn) {
    if (typeof closeMobileSheetFn === "function") closeMobileSheetFn();
    if (typeof resetSectionsFn === "function") resetSectionsFn();

    activeSteps = isMobileViewport() ? MOBILE_STEPS : DESKTOP_STEPS;
    stepIdx = 0;
    renderStep();
  }

  function updateSpotlightPosition() {
    const overlay = document.getElementById("tourOverlay");
    const spotlight = document.getElementById("tourSpotlight");
    const tooltip = document.getElementById("tourTooltip");
    if (!overlay || overlay.style.display === "none" || !spotlight || !tooltip) return;

    const step = activeSteps[stepIdx];
    if (!step) return;
    const target = document.querySelector(step.selector);
    if (!target) return;

    const r = target.getBoundingClientRect();
    const pad = isMobileViewport() ? 4 : 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const top = Math.max(8, r.top - pad);
    const left = Math.max(8, r.left - pad);
    const width = Math.min(vw - 16, Math.max(40, r.width + pad * 2));
    const height = Math.min(vh - 16, Math.max(40, r.height + pad * 2));

    spotlight.style.top = `${top}px`;
    spotlight.style.left = `${left}px`;
    spotlight.style.width = `${width}px`;
    spotlight.style.height = `${height}px`;

    const ttHeight = tooltip.offsetHeight || 175;
    if (isMobileViewport()) {
      const spaceBelow = vh - (top + height);
      let ttTop = spaceBelow >= ttHeight + 20 ? (top + height + 12) : Math.max(12, top - ttHeight - 12);
      if (ttTop + ttHeight > vh - 12) ttTop = vh - ttHeight - 12;
      tooltip.style.top = `${Math.max(12, ttTop)}px`;
    } else {
      const ttWidth = 320;
      let ttTop = top + height + 14;
      if (ttTop + ttHeight > vh - 16) {
        ttTop = Math.max(16, top - ttHeight - 14);
      }
      let ttLeft = left;
      if (r.width < 120) ttLeft = left + width + 16;
      ttLeft = Math.min(vw - ttWidth - 16, Math.max(16, ttLeft));
      tooltip.style.top = `${ttTop}px`;
      tooltip.style.left = `${ttLeft}px`;
    }
  }

  function trackSmoothScroll() {
    cancelAnimationFrame(rafId);
    const start = performance.now();
    function frame(now) {
      updateSpotlightPosition();
      if (now - start < 720) {
        rafId = requestAnimationFrame(frame);
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  function renderStep() {
    const overlay = document.getElementById("tourOverlay");
    if (!overlay) return;
    if (stepIdx >= activeSteps.length) {
      endTour();
      return;
    }

    const step = activeSteps[stepIdx];
    const target = document.querySelector(step.selector);
    if (!target || target.offsetParent === null) {
      stepIdx++;
      renderStep();
      return;
    }

    overlay.style.display = "block";
    C.setText("tourStepBadge", `Шаг ${stepIdx + 1} из ${activeSteps.length}`);
    C.setText("tourTitle", step.title);
    C.setText("tourText", step.text);
    C.setText("tourNextBtn", stepIdx === activeSteps.length - 1 ? "Готово" : "Далее");

    const prevBtn = document.getElementById("tourPrevBtn");
    if (prevBtn) prevBtn.style.display = stepIdx > 0 ? "inline-flex" : "none";

    const rect = target.getBoundingClientRect();
    const targetCenter = window.scrollY + rect.top - Math.max(60, (window.innerHeight - rect.height) / 2);
    window.scrollTo({
      top: Math.max(0, targetCenter),
      behavior: "smooth"
    });

    updateSpotlightPosition();
    trackSmoothScroll();
  }

  function endTour() {
    cancelAnimationFrame(rafId);
    const overlay = document.getElementById("tourOverlay");
    if (overlay) overlay.style.display = "none";
    try { localStorage.setItem(C.TOUR_DONE_KEY, "1"); } catch (_) {}
  }

  function bindTourEvents() {
    document.getElementById("tourSkipBtn")?.addEventListener("click", endTour);
    document.getElementById("tourCloseXBtn")?.addEventListener("click", endTour);
    document.getElementById("tourPrevBtn")?.addEventListener("click", () => {
      if (stepIdx > 0) { stepIdx--; renderStep(); }
    });
    document.getElementById("tourNextBtn")?.addEventListener("click", () => {
      stepIdx++;
      renderStep();
    });

    window.addEventListener("resize", () => {
      const overlay = document.getElementById("tourOverlay");
      if (overlay && overlay.style.display !== "none") {
        activeSteps = isMobileViewport() ? MOBILE_STEPS : DESKTOP_STEPS;
        if (stepIdx >= activeSteps.length) stepIdx = 0;
        updateSpotlightPosition();
      }
    });

    window.addEventListener("scroll", () => {
      const overlay = document.getElementById("tourOverlay");
      if (overlay && overlay.style.display !== "none") {
        updateSpotlightPosition();
      }
    }, { passive: true });
  }

  window.TakaTour = {
    startTour,
    endTour,
    bindTourEvents
  };
})();
