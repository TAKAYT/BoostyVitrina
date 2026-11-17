/* Конфигурация, константы и утилиты ТАКА */
(function () {
  "use strict";

  const BLOG_URL = "https://boosty.to/darktaka";
  const YT_CHANNEL_ID = "UCVIQOnICNIBcLshYisdechQ";
  const STORAGE_KEY = "taka_vitrina_filters_v6";
  const THEME_KEY = "taka_theme_v5";
  const CUSTOM_COLOR_KEY = "taka_custom_color_v5";
  const TOUR_DONE_KEY = "taka_tour_done_v5";
  const VISIT_COUNT_KEY = "taka_visit_count_v5";
  const PROMO_LAST_KEY = "taka_promo_last_v5";
  const RECENT_KEY = "taka_recent_viewed_v5";

  const PLACEHOLDER_SVG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">' +
        '<rect width="400" height="600" fill="#181322"/>' +
        '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9D6BFF" font-family="sans-serif" font-size="28" font-weight="800">ТАКА</text>' +
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
      kicker: "2 УРОВЕНЬ • ОПТИМАЛЬНЫЙ ВЫБОР",
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
      desc: "Все бонусы 1 и 2 ур. + максимальная поддержка выхода новых глав.",
      price: 1000,
      old_price: 0,
      discount: "",
      url: "https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link",
      ymEvent: "click_tariff_1000",
      featured: false
    }
  ];

  const PROMO_VARIANTS = [
    {
      badge: "Для постоянных читателей",
      title: "Снова заглянули на витрину?",
      desc: "Откройте доступ сразу ко всем закрытым главам, Лицензиям и новым сериям раньше всех — без ожидания на YouTube.",
      perks: ["Все тайтлы 1 и 2 уровня сразу", "Закрытый Telegram-чат и стримы", "Ежедневные обновления озвучки"],
      cta: "Открыть всё за 500 ₽/мес ↗"
    },
    {
      badge: "Выгода 2 уровня",
      title: "Не ждите выхода серий на YouTube",
      desc: "Большинство новых глав выходят на Boosty на недели раньше. 2-й уровень снимает все ограничения по каталогу.",
      perks: ["Доступ к 3 400+ платным главам", "Все Лицензии и эксклюзивные тайтлы", "Всего ~16 ₽ в день за всю базу"],
      cta: "Оформить 2 уровень • 500 ₽ ↗"
    },
    {
      badge: "Оптимальный выбор",
      title: "Хватит искать бесплатные куски",
      desc: "Вы уже знаете, что озвучка заходит — заберите полный доступ ко всем завершённым и онгоинг проектам ТАКА.",
      perks: ["160+ тайтлов в одном месте", "Удобный переход к нужной главе", "Поддержка выхода новых серий"],
      cta: "Забрать полный доступ ↗"
    },
    {
      badge: "Секретный бонус",
      title: "Присоединяйтесь к закрытому комьюнити",
      desc: "Подписчики 2 уровня участвуют в закрытых стримах, выбирают новые манхвы и общаются в отдельном чате.",
      perks: ["Голосования за новые тайтлы на стримах", "Все главы без рекламы и пауз", "Быстрый доступ ко всей библиотеке"],
      cta: "Вступить на Boosty • 500 ₽ ↗"
    }
  ];

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

  function normalizeTypeKey(rawType) {
    const s = String(rawType || "").trim().toLowerCase();
    if (s === "manhua" || s === "маньхуа") return "manhua";
    if (s === "manga" || s === "манга") return "manga";
    return "manhwa";
  }

  function parseTierSafe(raw) {
    if (raw.tier_level !== undefined && raw.tier_level !== null) {
      const tl = parseInt(String(raw.tier_level).replace(/\D/g, ""), 10);
      if (tl >= 1 && tl <= 3) return tl;
    }
    const subId = String(raw.tier_id || raw.subscription_level_id || raw.level_id || "");
    if (subId === "3988841") return 2;
    if (subId === "3979820") return 3;
    if (subId === "3988840") return 1;

    const priceNum = Number(raw.price || 0);
    if (priceNum >= 900) return 3;
    if (priceNum >= 450) return 2;

    if (String(raw.tier || "").includes("500") || String(raw.tier || "").includes("2 ур")) return 2;

    if (Array.isArray(raw.all_posts)) {
      const hasTier2 = raw.all_posts.some((p) => Number(p.tier_level || p.tier || 1) === 2 && !p.is_free);
      if (hasTier2) return 2;
    }

    const parsed = parseInt(String(raw.tier ?? 1).replace(/\D/g, ""), 10) || 1;
    return parsed >= 1 && parsed <= 3 ? parsed : 1;
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

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getMonthYearKey() {
    const d = new Date();
    return `${d.getUTCFullYear()}_${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  function handleImgError(imgEl, fallbackUrl) {
    if (!imgEl) return;
    if (fallbackUrl && !imgEl.dataset.triedFb) {
      imgEl.dataset.triedFb = "1";
      imgEl.src = fallbackUrl;
      return;
    }
    if (!imgEl.dataset.retried) {
      imgEl.dataset.retried = "1";
      const orig = imgEl.src;
      if (orig && !orig.startsWith("data:")) {
        setTimeout(() => {
          const sep = orig.includes("?") ? "&" : "?";
          imgEl.src = orig + sep + "r=1";
        }, 500);
        return;
      }
    }
    imgEl.onerror = null;
    imgEl.src = PLACEHOLDER_SVG;
  }

  window.TakaConfig = {
    BLOG_URL,
    YT_CHANNEL_ID,
    STORAGE_KEY,
    THEME_KEY,
    CUSTOM_COLOR_KEY,
    TOUR_DONE_KEY,
    VISIT_COUNT_KEY,
    PROMO_LAST_KEY,
    RECENT_KEY,
    PLACEHOLDER_SVG,
    TYPE_LABELS,
    DEFAULT_TIERS,
    PROMO_VARIANTS,
    trackEvent,
    escapeHtml,
    strictNormalize,
    normalizeTypeKey,
    parseTierSafe,
    translitSlug,
    buildUtmUrl,
    parseDateValue,
    extractChapterSpan,
    extractChaptersFromTitle,
    setText,
    getMonthYearKey,
    handleImgError
  };
})();
