let allItems = [];
let activeTierTab = 'all';
const YM_ID = 114099972;

// Использование единого UTC-месяца, чтобы клиент и сервер (update.py) всегда смотрели в один и тот же пул голосов
const now = new Date();
const CURRENT_MONTH_KEY = `${now.getUTCFullYear()}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
const VOTE_NAMESPACE = `takayt_vitrina_${CURRENT_MONTH_KEY}`;
const LOCAL_CACHE_KEY = `taka_votes_cache_${CURRENT_MONTH_KEY}`;
const USER_VOTED_MAP_KEY = `taka_user_voted_map_${CURRENT_MONTH_KEY}`;
const PENDING_VOTES_KEY = `taka_pending_votes_${CURRENT_MONTH_KEY}`;
const ANON_USER_UID_KEY = 'taka_anon_user_uid_v1';

// Таблица синонимов для стопроцентно одинаковых тегов и UTM-меток (синхронизирована с update.py)
const CLIENT_SYNONYM_GROUPS = [
    ["некромант я катастрофа", "ням", "ням (некромант)", "ням некромант"],
    ["паладин sss ранга", "паладин sss ранга главы", "пsss", "psss"],
    ["всеобщий отбор укротитель драконов в самом деле самый слабый класс", "воудр (дракончик)", "воудр дракончик", "воудр", "дракончик"],
    ["некромант максимального уровня", "некромант макс lvl", "некромант макс лвл"],
    ["мастер древних божественных орудий", "мастер божественных орудий древней эпохи"],
    ["я перевоплотился в могущественного дракона для сокрушения мира", "я стал драконом в прошлом"],
    ["я проснулся имбой после 100 лет afk", "я проснулся имбой после 100 лет афк"],
    ["начало после конца", "кнчн"],
    ["от гоблина к богу гоблинов", "к богу гоблинов"],
    ["реинкарнация в начало апокалипсиса", "в начало до зомби апокалипсиса", "в начало до зомби-апокалипсиса"],
    ["я стал графским ублюдком", "я стал ублюдком сильнейшего графства"],
    ["прокачка в аду", "прокачка в аду в одиночку"],
    ["повелитель насекомых", "король насекомых"],
    ["цивилизация мудрецов", "деревня под наблюдением бога"],
    ["некромант катастрофа решил уйти на пенсию", "некромант-катастрофа решил уйти на пенсию"],
    ["перерождение демонического культиватора", "перерождение демонического культиватора в мире зомби"],
    ["призыватель sss ранга", "призыватель 3s ранга"]
];

const TIER_SUB_LINKS = {
    1: 'https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link',
    2: 'https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link',
    3: 'https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link'
};

// --- РАБОТА С COOKIE И АНОНИМНЫМ ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ БЕЗ РЕГИСТРАЦИИ ---
function setCookie(name, value, days = 365) {
    try {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    } catch (e) {}
}

function getCookie(name) {
    try {
        const match = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent(name).replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
        return null;
    }
}

// Генерация стабильного отпечатка браузера + UUID для привязки голосов без регистрации
function computeBrowserFingerprint() {
    try {
        const nav = window.navigator || {};
        const scr = window.screen || {};
        const tz = (Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
        const raw = [
            nav.language || '',
            nav.platform || '',
            nav.hardwareConcurrency || '',
            nav.deviceMemory || '',
            scr.width || 0,
            scr.height || 0,
            scr.colorDepth || 0,
            tz
        ].join('|');
        let hash = 2166136261;
        for (let i = 0; i < raw.length; i++) {
            hash ^= raw.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return 'fp' + (hash >>> 0).toString(36);
    } catch (e) {
        return 'fp0';
    }
}

function getOrCreateUserUid() {
    let uid = null;
    try {
        uid = localStorage.getItem(ANON_USER_UID_KEY) || getCookie(ANON_USER_UID_KEY);
    } catch (e) {}

    if (!uid || typeof uid !== 'string' || uid.length < 6) {
        const fp = computeBrowserFingerprint();
        const rand = Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
        uid = `u_${fp}_${rand}`;
    }

    try { localStorage.setItem(ANON_USER_UID_KEY, uid); } catch (e) {}
    setCookie(ANON_USER_UID_KEY, uid, 365);
    return uid;
}

const CURRENT_USER_UID = getOrCreateUserUid();

// Инициализация локального кэша голосов и очереди неотправленных голосов
let votesCache = {};
let userVotedMap = {};
let pendingVotesQueue = [];

try {
    votesCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
} catch (e) {
    votesCache = {};
}

try {
    const fromLs = JSON.parse(localStorage.getItem(USER_VOTED_MAP_KEY) || '{}');
    const fromCookie = JSON.parse(getCookie(USER_VOTED_MAP_KEY) || '{}');
    userVotedMap = { ...fromCookie, ...fromLs };
} catch (e) {
    userVotedMap = {};
}

try {
    pendingVotesQueue = JSON.parse(localStorage.getItem(PENDING_VOTES_KEY) || '[]');
    if (!Array.isArray(pendingVotesQueue)) pendingVotesQueue = [];
} catch (e) {
    pendingVotesQueue = [];
}

// Чистый ключ для API голосования (без дефисов и спецсимволов)
function getSafeVoteKey(id) {
    return 'v_' + String(id || 'unknown').replace(/[^a-zA-Z0-9]/g, '');
}

function normalizeTitleForMatch(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\[\s*\d+\s*[-—–]\s*\d+[^\]]*\]/g, ' ')
        .replace(/\b(?:глав[аы]?|гл\.?|часть|сезон|все\s*главы)\b/g, ' ')
        .replace(/\b\d+\s*[-—–]\s*\d+\b/g, ' ')
        .replace(/[^a-zа-я0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveCanonicalTitleClient(title) {
    const norm = normalizeTitleForMatch(title);
    if (!norm) return String(title || 'item');
    for (const group of CLIENT_SYNONYM_GROUPS) {
        const normGroup = group.map(x => normalizeTitleForMatch(x));
        if (normGroup.includes(norm)) {
            return group[0];
        }
        for (const syn of normGroup) {
            if (syn.length > 5 && (norm.startsWith(syn) || syn.startsWith(norm))) {
                return group[0];
            }
        }
    }
    return norm;
}

// Генерация уникального неизменного тега тайтла для Метрики и UTM (с канонизацией синонимов)
function makeClientMetricTag(title) {
    const canonical = resolveCanonicalTitleClient(title);
    const map = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
        'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
        'х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
    };
    const slug = String(canonical || 'item')
        .toLowerCase()
        .split('')
        .map(c => map[c] !== undefined ? map[c] : (/[a-z0-9]/.test(c) ? c : '_'))
        .join('')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40);
    return `title_${slug || 'unknown'}`;
}

// Очистка URL обложки от старого ?croped=1&mh=550&mw=400
function normalizeCoverUrl(url) {
    if (!url || typeof url !== 'string') {
        return 'https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка';
    }
    if (url.includes('images.boosty.to/image/')) {
        return url.split('?')[0];
    }
    return url;
}

// Очистка заголовка от оборванных скобок вида "[Все"
function cleanDisplayTitle(rawTitle) {
    if (!rawTitle) return 'Без названия';
    return String(rawTitle)
        .replace(/\[[^\]]*$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Формирование полной ссылки с фиксированными UTM-метками для отслеживания каждого тайтла и источника клика
function appendBoostyUtm(url, metricTag, medium = 'card', content = 'catalog') {
    const cleanTag = metricTag || 'title_catalog';
    const baseUrl = url || 'https://boosty.to/darktaka';
    try {
        const parsed = new URL(baseUrl, window.location.origin);
        parsed.searchParams.set('from', 'site_catalog');
        parsed.searchParams.set('title', cleanTag);
        parsed.searchParams.set('utm_source', 'taka_catalog');
        parsed.searchParams.set('utm_medium', medium);
        parsed.searchParams.set('utm_campaign', cleanTag);
        parsed.searchParams.set('utm_content', content);
        return parsed.toString();
    } catch (e) {
        const sep = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${sep}from=site_catalog&title=${encodeURIComponent(cleanTag)}&utm_source=taka_catalog&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(cleanTag)}&utm_content=${encodeURIComponent(content)}`;
    }
}

// Отправка целей, параметров визита и Ecommerce-данных в Яндекс.Метрику
function trackGoal(goalName, payload = {}) {
    try {
        const cleanTitle = cleanDisplayTitle(payload.title || payload.metric_tag || 'Общее действие');
        const metricTag = payload.metric_tag || makeClientMetricTag(cleanTitle);
        const levelNum = Number(payload.level) || 1;
        const levelLabel = payload.level ? `${levelNum} уровень` : 'Общее';
        const placement = payload.placement || 'catalog';

        // Обновляем контекст виджета котика при взаимодействии с конкретным тайтлом
        if (payload.item && typeof updateCatWidgetContext === 'function') {
            updateCatWidgetContext(payload.item);
        }

        // Push в Ecommerce dataLayer (автоматически собирает популярность тайтлов в Метрике без ручного создания сотен целей)
        window.dataLayer = window.dataLayer || [];
        if (goalName === 'click_title' || goalName === 'click_cover_image' || goalName === 'click_week_new' || goalName === 'click_month_new_title') {
            window.dataLayer.push({
                ecommerce: {
                    currencyCode: "RUB",
                    detail: {
                        products: [{
                            id: metricTag,
                            name: cleanTitle,
                            category: levelLabel,
                            price: levelNum === 2 ? 500 : 250,
                            variant: placement
                        }]
                    }
                }
            });
        } else if (goalName === 'click_want_proda') {
            window.dataLayer.push({
                ecommerce: {
                    currencyCode: "RUB",
                    add: {
                        products: [{
                            id: metricTag,
                            name: cleanTitle,
                            category: "Голос Хочу проду",
                            price: levelNum === 2 ? 500 : 250,
                            quantity: 1
                        }]
                    }
                }
            });
        }

        if (typeof window.ym === 'function') {
            // Привязка анонимного ID пользователя к Метрике
            window.ym(YM_ID, 'setUserID', CURRENT_USER_UID);

            // 1. Основная цель действия с передачей параметров
            window.ym(YM_ID, 'reachGoal', goalName, {
                title: cleanTitle,
                metric_tag: metricTag,
                utm_campaign: metricTag,
                level: levelNum,
                placement: placement,
                user_uid: CURRENT_USER_UID
            });

            // 2. Индивидуальная цель по уникальному тегу тайтла
            if (metricTag && metricTag.startsWith('title_')) {
                window.ym(YM_ID, 'reachGoal', metricTag, {
                    title: cleanTitle,
                    action: goalName,
                    level: levelNum
                });
            }

            // 3. Древовидные параметры визитов (для удобных отчётов в Яндекс.Метрике -> Параметры визитов)
            const visitParams = {
                Уникальные_Теги_UTM: {
                    [metricTag]: {
                        Название: cleanTitle,
                        Действие: goalName,
                        Уровень: levelLabel
                    }
                },
                Нажатия_на_тайтлы: {
                    [cleanTitle]: {
                        Действие: goalName,
                        Тег: metricTag,
                        Уровень: levelLabel,
                        Место: placement
                    }
                }
            };

            if (goalName === 'click_cover_image') {
                visitParams['Клики_по_картинкам_тайтлов'] = {
                    [cleanTitle]: levelLabel
                };
            }

            if (goalName === 'click_title' || goalName === 'click_cover_image' || goalName === 'click_week_new' || goalName === 'click_month_new_title') {
                visitParams['Переходы_в_тайтлы'] = {
                    [cleanTitle]: {
                        Тег: metricTag,
                        Уровень: levelLabel
                    }
                };
            }

            if (goalName === 'click_want_proda') {
                visitParams['Голоса_Хочу_проду'] = {
                    [cleanTitle]: {
                        Тег: metricTag,
                        Уровень: levelLabel,
                        Пользователь: CURRENT_USER_UID
                    }
                };
            }

            window.ym(YM_ID, 'params', visitParams);
        }
    } catch (e) {}
}

// Специальная функция отслеживания конверсии в покупку подписки
function trackSubConversion(payload = {}) {
    try {
        const cleanTitle = cleanDisplayTitle(payload.title || 'Подписка на канал');
        const metricTag = payload.metric_tag || makeClientMetricTag(cleanTitle);
        const levelNum = Number(payload.level) || 1;
        const priceRub = levelNum === 3 ? 1000 : (levelNum === 2 ? 500 : 250);
        const placement = payload.placement || 'card_sub_btn';

        // Отправляем стандартную цель click_subscribe и целевую конверсию sub_conversion
        trackGoal('click_subscribe', {
            title: cleanTitle,
            metric_tag: metricTag,
            level: levelNum,
            placement: placement
        });

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            ecommerce: {
                currencyCode: "RUB",
                purchase: {
                    actionField: {
                        id: `sub_${CURRENT_USER_UID}_${Date.now()}`,
                        affiliation: placement,
                        revenue: priceRub
                    },
                    products: [{
                        id: metricTag,
                        name: cleanTitle,
                        category: `Подписка ${levelNum} ур.`,
                        price: priceRub,
                        quantity: 1,
                        variant: placement
                    }]
                }
            }
        });

        if (typeof window.ym === 'function') {
            window.ym(YM_ID, 'reachGoal', 'sub_conversion', {
                title: cleanTitle,
                metric_tag: metricTag,
                level: levelNum,
                price: priceRub,
                placement: placement,
                user_uid: CURRENT_USER_UID
            });

            window.ym(YM_ID, 'params', {
                Конверсия_Подписки: {
                    [placement]: {
                        Тайтл: cleanTitle,
                        Тег: metricTag,
                        Уровень: `${levelNum} ур. (${priceRub} ₽)`,
                        Цена: priceRub
                    }
                }
            });
        }
    } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initViewSwitcher();

    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const resetInfoEl = document.getElementById('voteResetInfo');
    if (resetInfoEl) {
        resetInfoEl.textContent = `🐾 Голосование за проду на ${monthNames[now.getUTCMonth()]} ${now.getUTCFullYear()} (сброс 1-го числа)`;
    }

    setupModal('orderModal', 'openOrderModal', 'closeOrderModal', 'open_order_modal');
    setupModal('guideModal', 'openGuideModal', 'closeGuideModal', 'open_payment_guide');
    setupModal('prodaModal', null, 'closeProdaModal', null);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-wrap')) {
            const sug = document.getElementById('searchSuggestions');
            if (sug) sug.classList.remove('open');
        }
    });

    document.querySelectorAll('.tier-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tier-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTierTab = tab.dataset.tier;
            applyFilters();
        });
    });

    loadBoostyGoalStats();
    loadCatalogData();

    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const val = searchInput.value.trim();
            if (clearBtn) clearBtn.style.display = val.length > 0 ? 'flex' : 'none';
            const sug = document.getElementById('searchSuggestions');
            if (val.length > 0 && sug) {
                sug.classList.remove('open');
            }
            applyFilters();
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length === 0) {
                renderSearchSuggestions();
                const sug = document.getElementById('searchSuggestions');
                if (sug) sug.classList.add('open');
            }
        });
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            applyFilters();
            searchInput.focus();
        });
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            applyFilters();
            if (sortSelect.value === 'votes_desc') {
                syncTopVotesThrottled(12);
            }
        });
    }
});

function initThemeToggle() {
    const savedTheme = localStorage.getItem('taka_site_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = savedTheme === 'light' ? '☀️ Светлая' : '🌙 Тёмная';
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('taka_site_theme', next);
            btn.textContent = next === 'light' ? '☀️ Светлая' : '🌙 Тёмная';
        });
    }
}

function initViewSwitcher() {
    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');
    const catalog = document.getElementById('catalog');
    if (gridBtn && listBtn && catalog) {
        gridBtn.addEventListener('click', () => {
            catalog.classList.remove('list-view');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        });
        listBtn.addEventListener('click', () => {
            catalog.classList.add('list-view');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        });
    }
}

function setupModal(modalId, openBtnId, closeBtnId, eventName) {
    const modal = document.getElementById(modalId);
    const openBtn = openBtnId ? document.getElementById(openBtnId) : null;
    const closeBtn = document.getElementById(closeBtnId);
    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            if (eventName) trackGoal(eventName);
        });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
}

function loadBoostyGoalStats() {
    fetch('stats.json?v=' + Date.now())
        .then(res => res.ok ? res.json() : null)
        .then(stats => {
            if (!stats) return;
            if (stats.avatar) {
                const avEl = document.getElementById('channelAvatar');
                if (avEl) avEl.src = stats.avatar;
            }
            const subsEl = document.getElementById('statSubscribers');
            const postsEl = document.getElementById('statPosts');
            if (subsEl && stats.subscribers) subsEl.textContent = Number(stats.subscribers).toLocaleString('ru-RU');
            if (postsEl && stats.posts) postsEl.textContent = Number(stats.posts).toLocaleString('ru-RU');

            if (Array.isArray(stats.goals) && stats.goals.length > 0) {
                const g = stats.goals[0];
                const numEl = document.getElementById('goalNumbers');
                const barEl = document.getElementById('goalProgressBar');
                const descEl = document.getElementById('goalDesc');

                const current = typeof g.current === 'number' ? g.current : 175;
                const target = g.target || 200;
                const percent = Math.min(100, Math.round((current / target) * 100));

                if (numEl) numEl.textContent = `${current} из ${target} платных подписчиков (${percent}%)`;
                if (barEl) barEl.style.width = `${percent}%`;
                if (descEl && g.description) descEl.textContent = g.description;
            }
        })
        .catch(() => {});
}

function loadCatalogData() {
    fetch('data.json?v=' + Date.now())
        .then(response => response.json())
        .then(data => {
            try { localStorage.setItem('taka_catalog_backup_cache', JSON.stringify(data)); } catch (e) {}
            initializeCatalogItems(data);
        })
        .catch(() => {
            const backup = localStorage.getItem('taka_catalog_backup_cache');
            if (backup) {
                initializeCatalogItems(JSON.parse(backup));
            }
        });
}

function initializeCatalogItems(data) {
    allItems = data.map((item, index) => {
        const cleanTitle = cleanDisplayTitle(item.title);
        let feedLink = item.link || '';
        if (feedLink.includes('view=grid')) {
            feedLink = feedLink.replace('view=grid', 'view=feed');
        } else if (!feedLink.includes('view=feed') && !feedLink.includes('postsTagsIds')) {
            feedLink += (feedLink.includes('?') ? '&' : '?') + 'view=feed';
        }

        let levelNum = item.tier_level === 2 ? 2 : 1;
        if (item.tier && item.tier.includes('Основной')) levelNum = 2;

        const tierText = levelNum === 2 ? "👑 Основной уровень 2 ур. • 500 ₽" : "🧡 Базовый уровень 1 ур. • 250 ₽";
        const subLink = levelNum === 2 ? TIER_SUB_LINKS[2] : TIER_SUB_LINKS[1];

        let totalChapters = Number(item.chapters) || 0;
        if (String(item.id).startsWith('tag_') && Number(item.posts_count) >= 250 && totalChapters === 316) {
            totalChapters = 0;
        }

        let freeChapters = Number(item.free_chapters) || 0;
        if (!freeChapters && item.has_free && item.free_text) {
            const m = String(item.free_text).match(/(\d+)\s*[-—–]\s*(\d+)/);
            if (m) {
                freeChapters = Math.max(0, parseInt(m[2], 10) - parseInt(m[1], 10) + 1);
            } else {
                const mSingle = String(item.free_text).match(/(\d+)/);
                if (mSingle) freeChapters = parseInt(mSingle[1], 10);
            }
        }
        if (totalChapters > 0 && freeChapters > totalChapters) {
            freeChapters = totalChapters;
        }

        const paidChapters = Math.max(0, totalChapters - freeChapters);
        const hasFree = Boolean(item.has_free || freeChapters > 0);
        const freeText = hasFree
            ? (item.free_text || `🆓 Бесплатно: ${freeChapters} гл.`)
            : '';

        // Всегда используем канонический генератор тега, чтобы старые и новые тайтлы имели неизменный UTM-тег
        const canonicalTag = makeClientMetricTag(cleanTitle);
        const metricTag = (item.metric_tag && item.metric_tag !== 'title_item' && item.metric_tag !== 'title_unknown')
            ? canonicalTag
            : canonicalTag;

        const latestRange = totalChapters > 0
            ? (item.latest_range && !String(item.id).startsWith('tag_') ? item.latest_range : `1-${totalChapters} гл.`)
            : 'Все главы в ленте';

        const serverVotes = Number(item.votes) || 0;
        const cachedVotes = typeof votesCache[item.id] === 'number' ? votesCache[item.id] : 0;
        const userVoted = hasUserVoted(item.id);
        const recordedVoteVal = typeof userVotedMap[item.id] === 'number' ? userVotedMap[item.id] : (userVoted ? serverVotes + 1 : 0);
        const initialVotes = Math.max(serverVotes, cachedVotes, recordedVoteVal, userVoted ? 1 : 0);
        votesCache[item.id] = initialVotes;

        return {
            ...item,
            title: cleanTitle,
            image: normalizeCoverUrl(item.image),
            chapters: totalChapters,
            free_chapters: freeChapters,
            paid_chapters: paidChapters,
            has_free: hasFree,
            free_text: freeText,
            metric_tag: metricTag,
            latest_range: latestRange,
            tier: tierText,
            tier_level: levelNum,
            link: feedLink,
            sub_link: subLink,
            originalIndex: index,
            votes: initialVotes
        };
    });

    saveVotesCache();
    updateTabCounters();
    renderHighlightsBlocks();
    applyFilters();
    initCatRecommendationWidget();
    flushPendingVotesQueue();
    syncTopVotesThrottled(8);
}

function updateTabCounters() {
    const cAll = document.getElementById('count-all');
    const cFree = document.getElementById('count-free');
    const c1 = document.getElementById('count-t1');
    const c2 = document.getElementById('count-t2');

    if (cAll) cAll.textContent = allItems.length;
    if (cFree) cFree.textContent = allItems.filter(i => i.has_free || i.free_chapters > 0).length;
    if (c1) c1.textContent = allItems.filter(i => i.tier_level === 1).length;
    if (c2) c2.textContent = allItems.filter(i => i.tier_level === 2).length;
}

function renderHighlightsBlocks() {
    const section = document.getElementById('highlightsSection');
    const weekBlock = document.getElementById('weekNewBlock');
    const weekList = document.getElementById('weekNewList');
    const monthBlock = document.getElementById('monthHitsBlock');
    const monthList = document.getElementById('monthHitsList');
    if (!section || !weekBlock || !monthBlock) return;

    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0), Math.floor(Date.now() / 1000));
    const sevenDaysSec = 7 * 86400;
    const thirtyDaysSec = 30 * 86400;

    const recentWeekReleases = [...allItems]
        .filter(i => i.timestamp && (maxTs - i.timestamp) <= sevenDaysSec)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const newMonthTitles = [...allItems]
        .filter(i => {
            const created = i.created_ts || i.timestamp || 0;
            const isCreatedRecently = created > 0 && (maxTs - created) <= thirtyDaysSec;
            return isCreatedRecently;
        })
        .sort((a, b) => (b.created_ts || b.timestamp || 0) - (a.created_ts || a.timestamp || 0));

    let hasAny = false;

    const weekTitleEl = weekBlock.querySelector(".highlight-title");
    if (weekTitleEl) {
        weekTitleEl.textContent = `🔥 Новые главы за неделю (${recentWeekReleases.length})`;
    }
    const monthTitleEl = monthBlock.querySelector(".highlight-title");
    if (monthTitleEl) {
        monthTitleEl.textContent = `👑 Новинки месяца (${newMonthTitles.length})`;
    }

    if (recentWeekReleases.length > 0) {
        hasAny = true;
        weekBlock.style.display = 'block';
        weekList.innerHTML = recentWeekReleases.map(i => {
            const safeTitle = i.title.replace(/['"]/g, '');
            const rangeBadge = i.latest_range || (i.chapters > 0 ? `${i.chapters} гл.` : "Свежие серии");
            const href = appendBoostyUtm(i.link, i.metric_tag, 'highlight_week', 'chip');
            return `
                <a href="${href}" target="_blank" class="hl-chip ${i.tier_level === 2 ? 'hl-gold' : ''}"
                   data-id="${i.id}" data-metric-tag="${i.metric_tag}">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" referrerpolicy="no-referrer"
                         data-metric-tag="${i.metric_tag}">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span style="font-size:11px;color:var(--accent-amber);font-weight:700;">🔥 Вышли: ${rangeBadge}</span>
                    </div>
                </a>
            `;
        }).join('');

        weekList.querySelectorAll('.hl-chip').forEach(chip => {
            const itemObj = allItems.find(x => String(x.id) === String(chip.dataset.id));
            if (itemObj) {
                chip.addEventListener('click', () => {
                    trackGoal('click_week_new', {
                        title: itemObj.title,
                        metric_tag: itemObj.metric_tag,
                        level: itemObj.tier_level,
                        placement: 'highlight_week',
                        item: itemObj
                    });
                });
            }
        });
    } else {
        weekBlock.style.display = 'none';
    }

    if (newMonthTitles.length > 0) {
        hasAny = true;
        monthBlock.style.display = 'block';
        monthList.innerHTML = newMonthTitles.map(i => {
            const safeTitle = i.title.replace(/['"]/g, '');
            const href = appendBoostyUtm(i.link, i.metric_tag, 'highlight_month', 'chip');
            return `
                <a href="${href}" target="_blank" class="hl-chip ${i.tier_level === 2 ? 'hl-gold' : ''}"
                   data-id="${i.id}" data-metric-tag="${i.metric_tag}">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" referrerpolicy="no-referrer"
                         data-metric-tag="${i.metric_tag}">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span style="font-size:11px;color:#ffd166;font-weight:700;">👑 Новый тайтл • ${i.chapters > 0 ? `1-${i.chapters} гл.` : "В ленте"}</span>
                    </div>
                </a>
            `;
        }).join('');

        monthList.querySelectorAll('.hl-chip').forEach(chip => {
            const itemObj = allItems.find(x => String(x.id) === String(chip.dataset.id));
            if (itemObj) {
                chip.addEventListener('click', () => {
                    trackGoal('click_month_new_title', {
                        title: itemObj.title,
                        metric_tag: itemObj.metric_tag,
                        level: itemObj.tier_level,
                        placement: 'highlight_month',
                        item: itemObj
                    });
                });
            }
        });
    } else {
        monthBlock.style.display = 'none';
    }

    [weekList, monthList].forEach(listContainer => {
        if (listContainer && !listContainer.dataset.wheelBound) {
            listContainer.dataset.wheelBound = "1";
            listContainer.addEventListener("wheel", (e) => {
                if (e.deltaY !== 0 && listContainer.scrollWidth > listContainer.clientWidth) {
                    e.preventDefault();
                    listContainer.scrollLeft += e.deltaY;
                }
            }, { passive: false });
        }
    });

    section.style.display = hasAny ? 'block' : 'none';
}

function renderSearchSuggestions() {
    const listEl = document.getElementById('suggestionsList');
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (!listEl || allItems.length === 0) return;

    const topFour = [...allItems]
        .sort((a, b) => ((b.votes || 0) * 15 + (b.chapters || 0)) - ((a.votes || 0) * 15 + (a.chapters || 0)))
        .slice(0, 4);

    listEl.innerHTML = topFour.map(item => `
        <div class="suggestion-item" data-title="${item.title}" data-id="${item.id}">
            <span>🐾 ${item.title}</span>
            <span style="color:var(--text-muted);font-size:11.5px;">${item.chapters > 0 ? item.chapters + ' гл.' : 'В ленте'}</span>
        </div>
    `).join('');

    listEl.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = el.dataset.title;
                if (clearBtn) clearBtn.style.display = 'flex';
                document.getElementById('searchSuggestions').classList.remove('open');
                const found = allItems.find(x => String(x.id) === String(el.dataset.id));
                if (found) updateCatWidgetContext(found);
                applyFilters();
            }
        });
    });
}

// --- СИСТЕМА ГОЛОСОВАНИЯ («🔥 ХОЧУ ПРОДУ») С ПРИВЯЗКОЙ К АНОНИМНОМУ ПОЛЬЗОВАТЕЛЮ ---
function hasUserVoted(id) {
    if (!id) return false;
    const strId = String(id);
    if (userVotedMap && userVotedMap[strId]) return true;
    try {
        if (localStorage.getItem(`voted_${CURRENT_MONTH_KEY}_${strId}`) === 'true') return true;
    } catch (e) {}
    return false;
}

function markUserVoted(id, countVal) {
    const strId = String(id);
    userVotedMap[strId] = Number(countVal) || 1;
    try {
        localStorage.setItem(`voted_${CURRENT_MONTH_KEY}_${strId}`, 'true');
        localStorage.setItem(USER_VOTED_MAP_KEY, JSON.stringify(userVotedMap));
    } catch (e) {}
    setCookie(USER_VOTED_MAP_KEY, JSON.stringify(userVotedMap), 45);
}

function saveVotesCache() {
    try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(votesCache));
    } catch (e) {}
}

function savePendingVotesQueue() {
    try {
        localStorage.setItem(PENDING_VOTES_KEY, JSON.stringify(pendingVotesQueue));
    } catch (e) {}
}

// Бережная синхронизация счётчика одного тайтла без вызова 429 Too Many Requests
async function fetchItemVoteCount(item) {
    if (!item || !item.id) return;
    const safeKey = getSafeVoteKey(item.id);
    const url = `https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/${safeKey}`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const val = typeof data.count === 'number' ? data.count : (typeof data.value === 'number' ? data.value : 0);
            const currentLocal = Number(item.votes) || 0;
            if (val > currentLocal) {
                item.votes = val;
                votesCache[item.id] = val;
                saveVotesCache();
                document.querySelectorAll(`[id="vote-count-${item.id}"]`).forEach(el => {
                    el.textContent = val;
                });
            }
        }
    } catch (e) {}
}

// Фоновая синхронизация только топ-N тайтлов, чтобы не перегружать API сотнями запросов
async function syncTopVotesThrottled(limit = 8) {
    const topCandidates = [...allItems]
        .sort((a, b) => (b.votes || 0) - (a.votes || 0))
        .slice(0, limit);

    for (const item of topCandidates) {
        await fetchItemVoteCount(item);
        await new Promise(r => setTimeout(r, 180));
    }
}

// Отправка +1 голоса на сервер с очередью повтора на случай блокировки или офлайна
async function incrementRemoteVote(item, optimisticCount) {
    const safeKey = getSafeVoteKey(item.id);
    const safeTagKey = getSafeVoteKey(item.metric_tag);

    if (!pendingVotesQueue.includes(item.id)) {
        pendingVotesQueue.push(item.id);
        savePendingVotesQueue();
    }

    const endpoints = [
        `https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/${safeKey}/up`
    ];
    if (safeTagKey && safeTagKey !== safeKey) {
        endpoints.push(`https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/${safeTagKey}/up`);
    }

    let syncedSuccess = false;
    let bestRemoteCount = optimisticCount;

    for (const ep of endpoints) {
        try {
            const res = await fetch(ep, {
                method: 'GET',
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                const apiCount = typeof data.count === 'number' ? data.count : (typeof data.value === 'number' ? data.value : 0);
                if (apiCount > bestRemoteCount) {
                    bestRemoteCount = apiCount;
                }
                syncedSuccess = true;
            }
        } catch (e) {}
    }

    if (syncedSuccess) {
        pendingVotesQueue = pendingVotesQueue.filter(x => String(x) !== String(item.id));
        savePendingVotesQueue();
    }

    item.votes = Math.max(Number(item.votes) || 0, bestRemoteCount);
    votesCache[item.id] = item.votes;
    markUserVoted(item.id, item.votes);
    saveVotesCache();

    document.querySelectorAll(`[id="vote-count-${item.id}"]`).forEach(el => {
        el.textContent = item.votes;
    });
}

// Доотправка голосов из очереди, если прошлый клик пришелся на плохой интернет
async function flushPendingVotesQueue() {
    if (!pendingVotesQueue || pendingVotesQueue.length === 0) return;
    const queueCopy = [...pendingVotesQueue];
    for (const id of queueCopy) {
        const item = allItems.find(x => String(x.id) === String(id));
        if (item) {
            await incrementRemoteVote(item, item.votes || 1);
            await new Promise(r => setTimeout(r, 250));
        }
    }
}

function openProdaPopup(item, alreadyVoted = false) {
    const modal = document.getElementById('prodaModal');
    const titleEl = modal ? modal.querySelector('.modal-header h2') : null;
    const textEl = document.getElementById('prodaModalText');
    const boostyBtn = document.getElementById('prodaBoostyBtn');
    const tgBtn = document.getElementById('prodaTgBtn');
    if (!modal) return;

    if (titleEl) {
        titleEl.textContent = alreadyVoted
            ? `Твой голос за этот месяц уже учтён! (${item.votes || 1} 🔥)`
            : `Твой голос учтён! Всего голосов: ${item.votes || 1} 🔥`;
    }
    if (textEl) {
        textEl.textContent = `Хотите ускорить выход следующих глав «${item.title}»? Оформите подписку на Boosty или закажите озвучку напрямую без очереди! 🐾`;
    }
    if (boostyBtn) {
        boostyBtn.href = appendBoostyUtm(item.sub_link, item.metric_tag, 'proda_modal', 'subscribe_btn');
        boostyBtn.onclick = () => trackSubConversion({
            title: item.title,
            metric_tag: item.metric_tag,
            level: item.tier_level,
            placement: 'proda_modal_subscribe'
        });
    }
    if (tgBtn) {
        const msg = encodeURIComponent(`Привет! Хочу заказать/ускорить выход проды тайтла «${item.title}» (${item.metric_tag})`);
        tgBtn.href = `https://t.me/TAKA_YT?text=${msg}`;
        tgBtn.onclick = () => trackGoal('click_telegram', {
            title: item.title,
            metric_tag: item.metric_tag,
            level: item.tier_level,
            placement: 'proda_modal_tg'
        });
    }
    modal.classList.add('active');
}

function handleVote(item, btnElement) {
    const id = item.id;
    const alreadyVoted = hasUserVoted(id);

    trackGoal('click_want_proda', {
        title: item.title,
        metric_tag: item.metric_tag,
        level: item.tier_level,
        placement: 'card_vote_btn',
        item: item
    });

    if (!alreadyVoted) {
        const newCount = (Number(item.votes) || 0) + 1;
        item.votes = newCount;
        votesCache[id] = newCount;
        markUserVoted(id, newCount);
        saveVotesCache();

        if (btnElement) {
            btnElement.classList.add('voted', 'vote-pulse');
            const labelEl = btnElement.querySelector('.vote-label');
            if (labelEl) labelEl.textContent = '🐾 Жду проду!';
            setTimeout(() => btnElement.classList.remove('vote-pulse'), 600);
        }

        document.querySelectorAll(`[id="vote-count-${id}"]`).forEach(el => {
            el.textContent = newCount;
        });

        incrementRemoteVote(item, newCount);
    }

    openProdaPopup(item, alreadyVoted);
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const sortSelect = document.getElementById('sortSelect');
    const sortValue = sortSelect ? sortSelect.value : 'update_desc';

    let filtered = allItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchText) ||
                              (item.metric_tag && item.metric_tag.toLowerCase().includes(searchText));
        let matchesTier = true;
        if (activeTierTab === 'free') {
            matchesTier = Boolean(item.has_free || item.free_chapters > 0);
        } else if (activeTierTab !== 'all') {
            matchesTier = String(item.tier_level) === String(activeTierTab);
        }
        return matchesSearch && matchesTier;
    });

    filtered.sort((a, b) => {
        if (sortValue === 'update_desc') {
            return (b.timestamp || 0) - (a.timestamp || 0);
        } else if (sortValue === 'free_desc') {
            const freeDiff = (b.free_chapters || (b.has_free ? 1 : 0)) - (a.free_chapters || (a.has_free ? 1 : 0));
            if (freeDiff !== 0) return freeDiff;
            return (b.chapters || 0) - (a.chapters || 0);
        } else if (sortValue === 'chapters_desc') {
            return (b.chapters || 0) - (a.chapters || 0);
        } else if (sortValue === 'votes_desc') {
            const vDiff = (b.votes || 0) - (a.votes || 0);
            if (vDiff !== 0) return vDiff;
            return (b.chapters || 0) - (a.chapters || 0);
        } else {
            return a.originalIndex - b.originalIndex;
        }
    });

    const totalEl = document.getElementById('totalTitlesCount');
    if (totalEl) {
        totalEl.textContent = `🐾 Показано тайтлов: ${filtered.length} из ${allItems.length}`;
    }

    renderCatalog(filtered);
}

function renderCatalog(items) {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;
    catalog.innerHTML = '';

    if (items.length === 0) {
        const emptyMsg = activeTierTab === 'free'
            ? 'Бесплатные главы обновляются — запустите скрипт обновления или переключитесь на «Все тайтлы» 🐾'
            : 'По вашему запросу ничего не найдено 🐾';
        catalog.innerHTML = `<div class="empty-catalog-box"><p>${emptyMsg}</p></div>`;
        return;
    }

    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0), Math.floor(Date.now() / 1000));

    items.forEach(item => {
        const card = document.createElement('div');
        const isLicense = item.tier_level === 2;
        const hasFree = item.has_free || item.free_chapters > 0;
        const frameClass = `tier-frame-${item.tier_level || 1}`;
        card.className = `card ${frameClass} ${hasFree ? 'has-free-card' : ''}`;

        card.setAttribute('data-metric-tag', item.metric_tag);
        card.setAttribute('data-utm-campaign', item.metric_tag);
        card.setAttribute('data-title-id', item.title);
        card.setAttribute('data-level', item.tier_level);

        const voted = hasUserVoted(item.id);
        const utmCoverLink = appendBoostyUtm(item.link, item.metric_tag, 'card', 'cover_image');
        const utmTitleLink = appendBoostyUtm(item.link, item.metric_tag, 'card', 'title_link');
        const utmWatchLink = appendBoostyUtm(item.link, item.metric_tag, 'card', 'watch_btn');
        const utmSubLink = appendBoostyUtm(item.sub_link, item.metric_tag, 'card_subscribe', `tier_${item.tier_level}`);
        const isNewRelease = item.timestamp && (maxTs - item.timestamp) <= (5 * 86400);

        const totalChText = item.chapters > 0 ? `${item.chapters} гл.` : 'В ленте';
        const freeChCount = item.free_chapters || 0;
        const paidChCount = item.chapters > 0 ? Math.max(0, item.chapters - freeChCount) : 0;

        const freePillHtml = hasFree
            ? `<span class="stat-pill stat-free" title="Доступно бесплатно без подписки">🆓 Бесплатно: <b>${freeChCount > 0 ? freeChCount + ' гл.' : 'Есть'}</b></span>`
            : `<span class="stat-pill stat-no-free" title="Доступно по подписке Boosty">🆓 Бесплатно: <b>0 гл.</b></span>`;

        const paidPillHtml = item.chapters > 0
            ? `<span class="stat-pill stat-paid" title="Главы по подписке">🔒 Платно: <b>${paidChCount} гл.</b></span>`
            : `<span class="stat-pill stat-paid">🔒 По подписке</span>`;

        card.innerHTML = `
            <a href="${utmCoverLink}" target="_blank" class="card-link" data-metric-tag="${item.metric_tag}">
                <img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
                     class="card-cover-img"
                     data-metric-tag="${item.metric_tag}"
                     data-title="${item.title}"
                     onerror="this.src='https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка'">
                <span class="badge-top-left ${isLicense ? 'license-gold-badge' : ''}">
                    ${isLicense ? '👑 Лицензия Boosty' : '🔒 Эксклюзив Boosty'}
                </span>
                <span class="chapters-floating-badge">Всего: ${totalChText}</span>
                ${hasFree ? `<span class="badge-free-access">${item.free_text || `🎁 Бесплатно: ${freeChCount} гл.`}</span>` : ''}
                ${isNewRelease ? `<span class="badge-hot-new">🔥 ${item.latest_range || 'НОВИНКА'}</span>` : ''}
            </a>
            <div class="card-info">
                <a href="${utmTitleLink}" target="_blank" class="card-title-link" data-metric-tag="${item.metric_tag}">
                    <h3>${item.title}</h3>
                </a>

                <div class="card-bottom-wrap">
                    <div class="chapters-breakdown">
                        ${freePillHtml}
                        ${paidPillHtml}
                    </div>

                    <span class="tier-neutral-pill ${isLicense ? 'tier-pill-license' : ''}">${item.tier}</span>

                    <div class="action-buttons-row">
                        <a href="${utmWatchLink}" target="_blank" class="watch-feed-link" data-metric-tag="${item.metric_tag}">
                            ▶ Смотреть
                        </a>
                        <a href="${utmSubLink}" target="_blank" class="buy-tier-link ${isLicense ? 'buy-license-gold' : ''}" data-metric-tag="${item.metric_tag}">
                            Подписаться
                        </a>
                    </div>

                    <div class="details">
                        <span>Озвучено: <b>${totalChText}</b></span>
                        <span>Обновлено: <b>${item.last_update}</b></span>
                        <button type="button" class="report-broken-btn" title="Сообщить о неработающей ссылке">⚠️</button>
                    </div>

                    <button type="button" class="vote-btn ${voted ? 'voted' : ''}" data-id="${item.id}" data-metric-tag="${item.metric_tag}">
                        <span class="vote-label">${voted ? '🐾 Жду проду!' : '🔥 Хочу проду'}</span>
                        <span class="vote-count" id="vote-count-${item.id}">${item.votes || 0}</span>
                    </button>
                </div>
            </div>
        `;

        // Отправка Яндекс.Метрики при клике на картинку тайтла (левая и средняя кнопки мыши / тап)
        const coverLink = card.querySelector('.card-link');
        if (coverLink) {
            const sendImageMetric = () => {
                trackGoal('click_cover_image', {
                    title: item.title,
                    metric_tag: item.metric_tag,
                    level: item.tier_level,
                    placement: 'card_cover',
                    item: item
                });
                trackGoal('click_title', {
                    title: item.title,
                    metric_tag: item.metric_tag,
                    level: item.tier_level,
                    placement: 'card_cover',
                    item: item
                });
            };
            coverLink.addEventListener('click', sendImageMetric);
            coverLink.addEventListener('auxclick', (e) => {
                if (e.button === 1) sendImageMetric();
            });
        }

        // Отправка Яндекс.Метрики при клике на название и кнопку «Смотреть»
        card.querySelectorAll('.card-title-link, .watch-feed-link').forEach(link => {
            const isWatchBtn = link.classList.contains('watch-feed-link');
            const sendTitleMetric = () => {
                trackGoal('click_title', {
                    title: item.title,
                    metric_tag: item.metric_tag,
                    level: item.tier_level,
                    placement: isWatchBtn ? 'card_watch_btn' : 'card_title',
                    item: item
                });
            };
            link.addEventListener('click', sendTitleMetric);
            link.addEventListener('auxclick', (e) => {
                if (e.button === 1) sendTitleMetric();
            });
        });

        // Отслеживание конверсии на кнопку «Подписаться» в карточке
        const buyLink = card.querySelector('.buy-tier-link');
        if (buyLink) {
            const sendSubMetric = () => {
                trackSubConversion({
                    title: item.title,
                    metric_tag: item.metric_tag,
                    level: item.tier_level,
                    placement: 'card_subscribe_btn'
                });
            };
            buyLink.addEventListener('click', sendSubMetric);
            buyLink.addEventListener('auxclick', (e) => {
                if (e.button === 1) sendSubMetric();
            });
        }

        const reportBtn = card.querySelector('.report-broken-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                trackGoal('report_broken_link', {
                    title: item.title,
                    metric_tag: item.metric_tag,
                    level: item.tier_level,
                    placement: 'card_report'
                });
                const text = encodeURIComponent(`⚠️ Привет! На витрине не работает ссылка у тайтла «${item.title}» (${item.link})`);
                window.open(`https://t.me/TAKA_YT?text=${text}`, '_blank');
            });
        }

        const voteBtn = card.querySelector('.vote-btn');
        if (voteBtn) {
            voteBtn.addEventListener('click', () => handleVote(item, voteBtn));
        }

        catalog.appendChild(card);
    });
}

// --- РЕКОМЕНДАТЕЛЬНЫЙ ВИДЖЕТ С ГОЛОВОЙ КОТИКА ДЛЯ ПОВЫШЕНИЯ КОНВЕРСИИ В ПОДПИСКУ ---
let catWidgetSelectedTier = 1;
let catWidgetCurrentItem = null;
let catWidgetShownOnce = false;

function initCatRecommendationWidget() {
    const widget = document.getElementById('catPromoWidget');
    if (!widget) return;

    const closeBtn = document.getElementById('catWidgetCloseBtn');
    const launcherBtn = document.getElementById('catWidgetLauncher');
    const subBtn = document.getElementById('catWidgetSubBtn');
    const tier1Btn = document.getElementById('catTierBtn1');
    const tier2Btn = document.getElementById('catTierBtn2');

    // Выбираем топовый тайтл недели для стартовой рекомендации котика
    const topItem = [...allItems]
        .sort((a, b) => ((b.votes || 0) * 10 + (b.timestamp || 0)) - ((a.votes || 0) * 10 + (a.timestamp || 0)))[0] || null;

    if (topItem) {
        updateCatWidgetContext(topItem, false);
    } else {
        syncCatWidgetButtons();
    }

    if (tier1Btn && tier2Btn) {
        tier1Btn.addEventListener('click', () => {
            catWidgetSelectedTier = 1;
            tier1Btn.classList.add('active');
            tier2Btn.classList.remove('active');
            syncCatWidgetButtons();
        });
        tier2Btn.addEventListener('click', () => {
            catWidgetSelectedTier = 2;
            tier2Btn.classList.add('active');
            tier1Btn.classList.remove('active');
            syncCatWidgetButtons();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            widget.classList.remove('open');
            widget.classList.add('minimized');
            try { sessionStorage.setItem('taka_cat_widget_minimized', '1'); } catch (err) {}
            trackGoal('cat_widget_minimize', {
                title: catWidgetCurrentItem ? catWidgetCurrentItem.title : 'Cat_Widget',
                metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : 'cat_widget',
                level: catWidgetSelectedTier,
                placement: 'cat_widget'
            });
        });
    }

    if (launcherBtn) {
        launcherBtn.addEventListener('click', () => {
            const isOpen = widget.classList.contains('open');
            if (isOpen) {
                widget.classList.remove('open');
                widget.classList.add('minimized');
            } else {
                widget.classList.remove('minimized');
                widget.classList.add('open');
                trackGoal('cat_widget_open', {
                    title: catWidgetCurrentItem ? catWidgetCurrentItem.title : 'Cat_Widget',
                    metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : 'cat_widget',
                    level: catWidgetSelectedTier,
                    placement: 'cat_widget'
                });
            }
        });
    }

    if (subBtn) {
        subBtn.addEventListener('click', () => {
            trackSubConversion({
                title: catWidgetCurrentItem ? catWidgetCurrentItem.title : `Cat_Widget_Tier_${catWidgetSelectedTier}`,
                metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : `cat_widget_tier_${catWidgetSelectedTier}`,
                level: catWidgetSelectedTier,
                placement: 'cat_widget_subscribe'
            });
        });
    }

    // Автоматическое появление котика через 9 секунд или при прокрутке каталога
    const wasMinimized = sessionStorage.getItem('taka_cat_widget_minimized') === '1';
    if (wasMinimized) {
        widget.classList.add('minimized');
    } else {
        const triggerOpen = () => {
            if (catWidgetShownOnce) return;
            catWidgetShownOnce = true;
            widget.classList.remove('minimized');
            widget.classList.add('open');
            trackGoal('cat_widget_impression', {
                title: catWidgetCurrentItem ? catWidgetCurrentItem.title : 'Cat_Widget_Default',
                metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : 'cat_widget',
                level: catWidgetSelectedTier,
                placement: 'cat_widget_auto'
            });
        };

        setTimeout(triggerOpen, 9000);
        window.addEventListener('scroll', () => {
            if (window.scrollY > 380) triggerOpen();
        }, { passive: true });
    }
}

function updateCatWidgetContext(item, autoHighlight = true) {
    if (!item) return;
    catWidgetCurrentItem = item;
    catWidgetSelectedTier = item.tier_level === 2 ? 2 : 1;

    const tier1Btn = document.getElementById('catTierBtn1');
    const tier2Btn = document.getElementById('catTierBtn2');
    const msgEl = document.getElementById('catWidgetMessage');

    if (tier1Btn && tier2Btn) {
        tier1Btn.classList.toggle('active', catWidgetSelectedTier === 1);
        tier2Btn.classList.toggle('active', catWidgetSelectedTier === 2);
    }

    if (msgEl) {
        const chInfo = item.chapters > 0 ? `все ${item.chapters} гл.` : 'все закрытые серии';
        if (item.tier_level === 2) {
            msgEl.innerHTML = `Мяу! 🐾 Смотришь <b>«${item.title}»</b>? Оформи <b>2 уровень (Лицензии)</b> и открой ${chInfo} + закрытый чат!`;
        } else {
            msgEl.innerHTML = `Мяу! 🐾 Понравился тайтл <b>«${item.title}»</b>? Подпишись на Boosty и смотри ${chInfo} без ожидания!`;
        }
    }

    syncCatWidgetButtons();

    if (autoHighlight) {
        const widget = document.getElementById('catPromoWidget');
        if (widget && !widget.classList.contains('open') && sessionStorage.getItem('taka_cat_widget_minimized') !== '1') {
            catWidgetShownOnce = true;
            widget.classList.remove('minimized');
            widget.classList.add('open');
        }
    }
}

function syncCatWidgetButtons() {
    const subBtn = document.getElementById('catWidgetSubBtn');
    const perkEl = document.getElementById('catWidgetPerkText');
    if (!subBtn) return;

    const metricTag = catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : `cat_widget_tier_${catWidgetSelectedTier}`;
    const baseSubUrl = catWidgetSelectedTier === 2 ? TIER_SUB_LINKS[2] : TIER_SUB_LINKS[1];
    subBtn.href = appendBoostyUtm(baseSubUrl, metricTag, 'cat_widget', `tier_${catWidgetSelectedTier}`);

    if (catWidgetSelectedTier === 2) {
        subBtn.textContent = '👑 Оформить 2 ур. за 500 ₽/мес';
        subBtn.classList.add('cat-sub-gold');
        if (perkEl) perkEl.textContent = '✨ Включает ВСЕ тайтлы 1 ур. + Эксклюзивные Лицензии + ТГ-чат';
    } else {
        subBtn.textContent = '🐾 Оформить 1 ур. за 250 ₽/мес';
        subBtn.classList.remove('cat-sub-gold');
        if (perkEl) perkEl.textContent = '🧡 Доступ ко всей базовой библиотеке озвучки (700+ постов)';
    }
}
