let allItems = [];
let activeTierTab = 'all';
let selectedGenres = new Set();
let activeContentTypeFilter = 'all';
let activeLetterFilter = 'all';
let selectedStatsMonth = 'current';
let renderedCardsCount = 0;
let lastFilteredItems = [];
let infiniteScrollObserver = null;
let missingSearchTimer = null;
let monthsArchiveData = {};
let isForYouStripOpen = false;
let activeHlMode = 'week';
let cachedStatsData = { tg_news: [], yt_videos: [] };
let liveGoalStats = { current: 173, target: 200, left: 27, percent: 87 };

const BATCH_LOAD_SIZE = 20;
const YM_ID = 114099972;

const now = new Date();
const MONTH_NAMES_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
const CURRENT_MONTH_NAME = MONTH_NAMES_RU[now.getUTCMonth()];
const CURRENT_YEAR = now.getUTCFullYear();
const CURRENT_MONTH_KEY = `${CURRENT_YEAR}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
const CURRENT_MONTH_HUMAN = `${CURRENT_MONTH_NAME} ${CURRENT_YEAR}`;

const VOTE_NAMESPACE = `takayt_vitrina_${CURRENT_MONTH_KEY}`;
const SEARCH_NAMESPACE = `takayt_search_${CURRENT_MONTH_KEY}`;
const MISSING_NAMESPACE = `takayt_missing_${CURRENT_MONTH_KEY}`;

const LOCAL_CACHE_KEY = `taka_votes_cache_${CURRENT_MONTH_KEY}`;
const LOCAL_SEARCH_COUNT_KEY = `taka_monthly_searches_${CURRENT_MONTH_KEY}`;
const LOCAL_MISSING_LOG_KEY = `taka_missing_queries_${CURRENT_MONTH_KEY}`;
const USER_VOTED_MAP_KEY = `taka_user_voted_map_${CURRENT_MONTH_KEY}`;
const USER_TAG_PREFS_KEY = 'taka_user_favorite_tags_v3';
const ANON_USER_UID_KEY = 'taka_anon_user_uid_v1';
const TOUR_DONE_KEY = 'taka_tour_done_v1';

const READER_TAGS_DICTIONARY = {
    "некромантия": "Некромантия",
    "система": "Система",
    "имба": "Имба ГГ",
    "регрессия": "Регрессия",
    "перерождение": "Перерождение",
    "подземелья": "Подземелья",
    "драконы": "Драконы",
    "призыв": "Призыв",
    "апокалипсис": "Апокалипсис",
    "культивация": "Культивация",
    "фэнтези": "Фэнтези",
    "демоны": "Демоны",
    "месть": "Месть",
    "артефакты": "Артефакты"
};

const CONTENT_TYPE_LABELS = {
    "manhwa": "манхва",
    "manhua": "маньхуа",
    "manga": "манга"
};

const TIER_SUB_LINKS = {
    1: 'https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link',
    2: 'https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link',
    3: 'https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link'
};

const RUSSIAN_ALPHABET = [
    'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Л', 'М',
    'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Э', 'Ю', 'Я'
];

const CYR_TO_LAT_MAP = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

let votesFileMap = {};
let votesCache = {};
let monthlySearchMap = {};
let missingQueriesMap = {};
let userVotedMap = {};
let userFavoriteTags = {};

try { votesCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}'); } catch (e) {}
try { monthlySearchMap = JSON.parse(localStorage.getItem(LOCAL_SEARCH_COUNT_KEY) || '{}'); } catch (e) {}
try { missingQueriesMap = JSON.parse(localStorage.getItem(LOCAL_MISSING_LOG_KEY) || '{}'); } catch (e) {}
try { userVotedMap = JSON.parse(localStorage.getItem(USER_VOTED_MAP_KEY) || '{}'); } catch (e) {}
try { userFavoriteTags = JSON.parse(localStorage.getItem(USER_TAG_PREFS_KEY) || '{}'); } catch (e) {}

function getOrCreateUserUid() {
    let uid = null;
    try { uid = localStorage.getItem(ANON_USER_UID_KEY); } catch (e) {}
    if (!uid || uid.length < 6) {
        uid = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        try { localStorage.setItem(ANON_USER_UID_KEY, uid); } catch (e) {}
    }
    return uid;
}
const CURRENT_USER_UID = getOrCreateUserUid();

function normalizeTitleForMatch(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function makeCleanEnglishTag(rawTitle) {
    const lower = String(rawTitle || '').toLowerCase().replace(/ё/g, 'e').trim();
    let out = '';
    for (let i = 0; i < lower.length; i++) {
        const ch = lower[i];
        if (CYR_TO_LAT_MAP[ch] !== undefined) out += CYR_TO_LAT_MAP[ch];
        else if (/[a-z0-9]/.test(ch)) out += ch;
        else out += '_';
    }
    return out.replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'manga_title';
}

function appendBoostyUtm(url, cleanNameOrSlug) {
    const cleanEngTag = makeCleanEnglishTag(cleanNameOrSlug);
    const baseUrl = url || 'https://boosty.to/darktaka';
    try {
        const parsed = new URL(baseUrl, window.location.origin);
        ['from', 'title', 'month', 'utm_source', 'utm_medium', 'utm_content', 'utm_term'].forEach(k => parsed.searchParams.delete(k));
        parsed.searchParams.set('utm_campaign', cleanEngTag);
        return parsed.toString();
    } catch (e) {
        const stripped = baseUrl.split('&utm_')[0].split('?utm_')[0];
        return `${stripped}${stripped.includes('?') ? '&' : '?'}utm_campaign=${encodeURIComponent(cleanEngTag)}`;
    }
}

function normalizeCoverUrl(url) {
    if (!url || typeof url !== 'string') return 'https://via.placeholder.com/400x550/181B22/ff6b00?text=TAKA';
    return url.includes('images.boosty.to/image/') ? url.split('?')[0] : url;
}

function cleanDisplayTitle(rawTitle) {
    return String(rawTitle || 'Без названия').replace(/\[[^\]]*$/g, '').replace(/\s+/g, ' ').trim();
}

function getSafeVoteKey(id) {
    return 'v_' + String(id || 'unknown').replace(/[^a-zA-Z0-9]/g, '');
}

function trackGoal(goalName, payload = {}) {
    try {
        const cleanTitle = cleanDisplayTitle(payload.title || payload.metric_tag || 'Action');
        const engTag = makeCleanEnglishTag(payload.metric_tag || cleanTitle);
        if (payload.item) {
            recordUserTagInterest(payload.item, goalName === 'click_want_proda' ? 2 : 1);
            incrementMonthlyTitlePopularity(payload.item, 1);
            updateCatWidgetContext(payload.item, false);
        }
        if (typeof window.ym === 'function') {
            window.ym(YM_ID, 'setUserID', CURRENT_USER_UID);
            window.ym(YM_ID, 'reachGoal', goalName, {
                title: cleanTitle,
                utm_campaign: engTag,
                month: CURRENT_MONTH_KEY,
                level: Number(payload.level) || 1
            });
        }
    } catch (e) {}
}

function trackSubConversion(payload = {}) {
    try {
        const cleanTitle = cleanDisplayTitle(payload.title || 'Sub');
        const engTag = makeCleanEnglishTag(payload.metric_tag || cleanTitle);
        const levelNum = Number(payload.level) || 1;
        trackGoal('click_subscribe', { title: cleanTitle, metric_tag: engTag, level: levelNum });
        if (typeof window.ym === 'function') {
            window.ym(YM_ID, 'reachGoal', 'sub_conversion', {
                title: cleanTitle,
                utm_campaign: engTag,
                month: CURRENT_MONTH_KEY,
                price: levelNum === 3 ? 1000 : (levelNum === 2 ? 500 : 250)
            });
        }
    } catch (e) {}
}

function openPaymentGuideModal(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const modal = document.getElementById('guideModal');
    if (modal) modal.classList.add('active');
}
window.openPaymentGuideModal = openPaymentGuideModal;

// --- АТМОСФЕРА (Мягкая, без перегруза) ---
function applyAtmosphereState(ambient) {
    const season = (ambient && ambient.season) || 'autumn';
    const isNight = ambient ? Boolean(ambient.is_night) : true;
    document.documentElement.setAttribute('data-season', season);
    document.documentElement.setAttribute('data-time', isNight ? 'night' : 'day');

    const labels = { autumn: 'Осень', winter: 'Зима', spring: 'Весна', summer: 'Лето' };
    const badge = document.getElementById('liveAtmosphereBadge');
    if (badge) badge.textContent = labels[season] || 'Осень';

    const ambientBg = document.getElementById('seasonAmbientBg');
    if (!ambientBg) return;
    const count = window.innerWidth <= 768 ? 5 : 9;
    const pieces = [];
    for (let i = 0; i < count; i++) {
        const left = Math.round((i / count) * 92 + Math.random() * 6);
        const dur = (14 + Math.random() * 8).toFixed(1);
        const delay = (Math.random() * 10).toFixed(1);
        if (season === 'winter') {
            pieces.push(`<span class="ambient-particle snow-flake" style="left:${left}%;font-size:12px;animation-duration:${dur}s;animation-delay:-${delay}s;">❄️</span>`);
        } else if (season === 'spring') {
            pieces.push(`<span class="ambient-particle sakura-petal" style="left:${left}%;font-size:12px;animation-duration:${dur}s;animation-delay:-${delay}s;">🌸</span>`);
        } else if (season === 'summer') {
            const top = Math.round(15 + Math.random() * 70);
            pieces.push(`<span class="ambient-particle night-firefly" style="left:${left}%;top:${top}%;animation-duration:5s;animation-delay:-${delay}s;"></span>`);
        } else {
            pieces.push(`<span class="ambient-particle autumn-leaf" style="left:${left}%;font-size:12px;animation-duration:${dur}s;animation-delay:-${delay}s;">🍁</span>`);
        }
    }
    ambientBg.innerHTML = pieces.join('');
}

// --- ОКНО ВЫБОРА ГЛАВ ВНУТРИ ТАЙТЛА (БЕСПЛАТНЫЕ ПОМЕЧЕНЫ ЗЕЛЁНЫМ) ---
function openChaptersModal(item) {
    if (!item) return;
    const modal = document.getElementById('chaptersModal');
    const titleEl = document.getElementById('chaptersModalTitle');
    const subEl = document.getElementById('chaptersModalSub');
    const statsEl = document.getElementById('chaptersModalStats');
    const listEl = document.getElementById('chaptersListContainer');
    const subBoxEl = document.getElementById('chaptersModalSubBox');
    if (!modal || !listEl) return;

    trackGoal('open_chapters_modal', {
        title: item.title,
        metric_tag: item.metric_tag,
        level: item.tier_level,
        item: item
    });

    const typeText = CONTENT_TYPE_LABELS[item.content_type] || 'манхва';
    if (titleEl) titleEl.textContent = item.title;
    if (subEl) subEl.textContent = `Тип: ${typeText}. Выберите нужный выпуск — вы перейдёте сразу на пост Boosty.`;

    const voicedCh = Number(item.chapters) || 0;
    const freeCh = Number(item.free_chapters) || 0;
    const paidCh = Math.max(0, voicedCh - freeCh);

    if (statsEl) {
        statsEl.innerHTML = `
            <span class="chapters-stat-tag">Озвучено: <b>${voicedCh > 0 ? voicedCh + ' гл.' : 'В ленте'}</b></span>
            <span class="chapters-stat-tag ${freeCh > 0 ? 'free' : ''}">Бесплатно: <b>${freeCh} гл.</b></span>
            <span class="chapters-stat-tag">Платные: <b>${paidCh} гл.</b></span>
        `;
    }

    let posts = Array.isArray(item.all_posts) && item.all_posts.length > 0 ? item.all_posts : [];
    if (posts.length === 0 && Array.isArray(item.free_posts) && item.free_posts.length > 0) {
        posts = item.free_posts.map(fp => ({ ...fp, is_free: true, tier_level: 1 }));
    }
    if (posts.length === 0) {
        posts = [{
            post_id: item.latest_post_id || item.id,
            range: item.latest_range || (voicedCh > 0 ? `1-${voicedCh} гл.` : 'Смотреть на Boosty'),
            is_free: Boolean(item.has_free && paidCh === 0),
            tier_level: item.tier_level || 1,
            date: item.last_update || '',
            link: item.latest_post_link || item.link
        }];
    }

    listEl.innerHTML = posts.map(p => {
        const isFree = Boolean(p.is_free);
        const postHref = appendBoostyUtm(p.link || `https://boosty.to/darktaka/posts/${p.post_id}`, item.title);
        const badgeText = isFree ? 'Бесплатно' : `${p.tier_level || item.tier_level || 1} ур. подписки`;
        return `
            <a href="${postHref}" target="_blank" rel="noopener noreferrer" class="chapter-post-btn ${isFree ? 'is-free' : ''}">
                <span class="chapter-post-range">${p.range || p.title || 'Выпуск'}</span>
                <span class="chapter-post-meta">${badgeText}${p.date ? ' • ' + p.date : ''}</span>
            </a>
        `;
    }).join('');

    if (subBoxEl) {
        const price = item.tier_level === 2 ? '500 ₽' : '250 ₽';
        const subUrl = appendBoostyUtm(item.sub_link, item.title);
        subBoxEl.innerHTML = `
            <div>
                <div style="font-size:13px;font-weight:700;">Открыть все ${voicedCh > 0 ? voicedCh + ' глав' : 'серии'} без ограничений</div>
                <div style="font-size:11.5px;color:var(--text-muted);">Подписка ${item.tier_level || 1} уровня (${price}/мес) откроет закрытые посты сразу</div>
            </div>
            <a href="${subUrl}" target="_blank" rel="noopener noreferrer" class="pricing-cta-btn pricing-cta-primary" onclick="trackSubConversion({ title: '${item.title.replace(/['"]/g, '')}', metric_tag: '${item.metric_tag}', level: ${item.tier_level || 1} })">
                Подписаться • ${price}
            </a>
        `;
    }

    modal.classList.add('active');
    maybeTriggerConversion(true);
}

// --- ЛЕНТА YOUTUBE И TELEGRAM В КНОПКАХ ---
function openMediaFeedModal(mode) {
    const modal = document.getElementById('mediaFeedModal');
    const titleEl = document.getElementById('mediaFeedModalTitle');
    const subEl = document.getElementById('mediaFeedModalSub');
    const listEl = document.getElementById('mediaFeedList');
    if (!modal || !listEl) return;

    const isYt = mode === 'youtube';
    const items = isYt ? (cachedStatsData.yt_videos || []) : (cachedStatsData.tg_news || []);

    if (titleEl) titleEl.textContent = isYt ? 'Последние ролики YouTube' : 'Последние посты Telegram';
    if (subEl) subEl.textContent = isYt ? 'Свежие видео с канала ТАКА' : 'Актуальные новости и анонсы из ТГ-канала';

    if (!items.length) {
        listEl.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">Публикации обновляются — загляните напрямую в <a href="${isYt ? 'https://youtube.com/channel/UCVIQOnICNIBcLshYisdechQ/' : 'https://t.me/PoteranSusheter'}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-orange);">канал</a>.</p>`;
    } else {
        listEl.innerHTML = items.map(post => {
            const imgHtml = post.image
                ? `<img src="${post.image}" alt="" class="media-feed-img" loading="lazy" onerror="this.style.display='none'">`
                : '';
            const titleBlock = post.title ? `<div class="media-feed-title">${post.title}</div>` : '';
            return `
                <a href="${post.link}" target="_blank" rel="noopener noreferrer" class="media-feed-card">
                    ${imgHtml}
                    <div class="media-feed-body">
                        <span class="media-feed-date">${post.date || ''}</span>
                        ${titleBlock}
                        <div class="media-feed-text">${post.full_text || post.short_text || ''}</div>
                    </div>
                </a>
            `;
        }).join('');
    }
    modal.classList.add('active');
}

// --- ЕДИНАЯ ПОЛКА НОВИНОК (ЗА НЕДЕЛЮ / ЗА МЕСЯЦ) ---
function getWeekAndMonthLists() {
    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0), Math.floor(Date.now() / 1000));
    const sevenDaysSec = 7 * 86400;
    const thirtyDaysSec = 30 * 86400;

    const weekItems = [...allItems]
        .filter(i => i.timestamp && (maxTs - i.timestamp) <= sevenDaysSec)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const monthItems = [...allItems]
        .filter(i => {
            const created = i.created_ts || i.timestamp || 0;
            return created > 0 && (maxTs - created) <= thirtyDaysSec;
        })
        .sort((a, b) => (b.created_ts || b.timestamp || 0) - (a.created_ts || a.timestamp || 0));

    return { weekItems, monthItems };
}

function renderHighlightsBar() {
    const section = document.getElementById('highlightsSection');
    const stripList = document.getElementById('highlightsStripList');
    const wCount = document.getElementById('hlWeekCount');
    const mCount = document.getElementById('hlMonthCount');
    if (!section || !stripList) return;

    const { weekItems, monthItems } = getWeekAndMonthLists();
    if (wCount) wCount.textContent = weekItems.length;
    if (mCount) mCount.textContent = monthItems.length;

    if (weekItems.length === 0 && monthItems.length === 0) {
        section.style.display = 'none';
        return;
    }

    if (activeHlMode === 'week' && weekItems.length === 0) activeHlMode = 'month';
    const items = activeHlMode === 'week' ? weekItems : monthItems;

    document.getElementById('hlTabWeek')?.classList.toggle('active', activeHlMode === 'week');
    document.getElementById('hlTabMonth')?.classList.toggle('active', activeHlMode === 'month');

    stripList.innerHTML = items.slice(0, 12).map(item => {
        const subText = activeHlMode === 'week'
            ? `Новое: ${item.week_range || item.latest_range || 'выпуск'}`
            : `Новинка • ${item.chapters > 0 ? item.chapters + ' гл.' : 'В ленте'}`;
        return `
            <button type="button" class="hl-chip" data-hl-id="${item.id}">
                <img src="${item.image}" alt="${item.title}" loading="lazy" referrerpolicy="no-referrer">
                <div>
                    <div class="hl-chip-title">${item.title}</div>
                    <span class="hl-chip-sub">${subText}</span>
                </div>
            </button>
        `;
    }).join('');

    stripList.querySelectorAll('.hl-chip').forEach(btn => {
        btn.addEventListener('click', () => openHighlightsModal(activeHlMode));
    });

    section.style.display = 'block';
}

function openHighlightsModal(mode = activeHlMode) {
    const modal = document.getElementById('highlightsModal');
    const grid = document.getElementById('highlightsModalGrid');
    if (!modal || !grid) return;

    const { weekItems, monthItems } = getWeekAndMonthLists();
    const isWeek = mode === 'week';
    document.getElementById('hlModalTabWeek')?.classList.toggle('active', isWeek);
    document.getElementById('hlModalTabMonth')?.classList.toggle('active', !isWeek);

    const items = isWeek ? weekItems : monthItems;
    grid.innerHTML = items.map(item => {
        const imgSrc = isWeek ? (item.week_post_image || item.image) : item.image;
        const href = appendBoostyUtm(isWeek ? (item.week_post_link || item.latest_post_link || item.link) : item.link, item.title);
        const desc = isWeek
            ? `Вышло за неделю: ${item.week_range || item.latest_range}`
            : `Новый тайтл • ${item.chapters > 0 ? item.chapters + ' гл.' : 'В ленте'}`;
        return `
            <a href="${href}" target="_blank" rel="noopener noreferrer" class="media-feed-card">
                <img src="${imgSrc}" alt="${item.title}" class="media-feed-img" loading="lazy" referrerpolicy="no-referrer">
                <div class="media-feed-body">
                    <span class="media-feed-date">${item.last_update || ''}</span>
                    <div class="media-feed-title">${item.title}</div>
                    <div class="media-feed-text">${desc}</div>
                </div>
            </a>
        `;
    }).join('');

    modal.classList.add('active');
}

// --- КАРТОЧКА КАТАЛОГА ---
function createCatalogCardElement(item, isPriorityImage = false) {
    const card = document.createElement('div');
    const hasFree = item.has_free || item.free_chapters > 0;

    let specialClass = '';
    let statusBadgeHtml = '';
    if (item.is_frozen) {
        specialClass = 'card-frozen';
        statusBadgeHtml = `<span class="badge-status-tl badge-frozen">Заморожен</span>`;
    } else if (item.is_romance) {
        specialClass = 'card-romance';
        statusBadgeHtml = `<span class="badge-status-tl badge-romance">Романтика</span>`;
    } else if (item.is_completed) {
        specialClass = 'card-completed';
        statusBadgeHtml = `<span class="badge-status-tl badge-completed">Завершён</span>`;
    } else if (item.tier_level === 2) {
        statusBadgeHtml = `<span class="badge-status-tl">2 ур. Лицензия</span>`;
    }

    card.className = `card ${specialClass}`;
    card.setAttribute('data-utm-campaign', item.metric_tag);

    const sakuraHtml = item.is_romance
        ? `<span class="sakura-corner-leaf sakura-leaf-tr" aria-hidden="true">🌸</span><span class="sakura-corner-leaf sakura-leaf-bl" aria-hidden="true">🌸</span>`
        : '';

    const voicedCh = Number(item.chapters) || 0;
    const freeChCount = Number(item.free_chapters) || 0;
    const chaptersCornerText = voicedCh > 0 ? `${voicedCh} гл.` : 'В ленте';

    let chaptersSummaryHtml = '';
    if (voicedCh > 0 && hasFree) {
        chaptersSummaryHtml = `${voicedCh} глав • <span class="free-highlight">${item.free_text || `1–${freeChCount} бесплатно`}</span>`;
    } else if (voicedCh > 0) {
        chaptersSummaryHtml = `${voicedCh} глав • По подписке`;
    } else if (hasFree) {
        chaptersSummaryHtml = `<span class="free-highlight">Есть бесплатные серии</span>`;
    } else {
        chaptersSummaryHtml = `Все серии по подписке`;
    }

    const typeLabel = CONTENT_TYPE_LABELS[item.content_type] || 'манхва';
    const firstGenre = (item.genres && item.genres[0]) ? (READER_TAGS_DICTIONARY[item.genres[0]] || item.genres[0]) : '';
    const subPrice = item.tier_level === 2 ? '500 ₽' : '250 ₽';
    const cleanSubUrl = appendBoostyUtm(item.sub_link, item.title);
    const voted = hasUserVoted(item.id);
    const imgLoadAttrs = isPriorityImage ? `fetchpriority="high" decoding="async"` : `loading="lazy" decoding="async"`;

    card.innerHTML = `
        ${sakuraHtml}
        <div class="card-cover-wrap" role="button" tabindex="0">
            <img src="${item.image}" alt="${item.title}" ${imgLoadAttrs} referrerpolicy="no-referrer"
                 onload="this.classList.add('img-loaded')"
                 onerror="this.src='https://via.placeholder.com/400x550/181B22/ff6b00?text=TAKA'; this.classList.add('img-loaded')">
            ${statusBadgeHtml}
            <span class="chapters-corner-badge">${chaptersCornerText}</span>
        </div>
        <div class="card-info">
            <div>
                <button type="button" class="card-title-btn"><h3>${item.title}</h3></button>
                <div class="card-meta-line">
                    <span class="card-type-chip" data-type="${item.content_type || 'manhwa'}">${typeLabel}</span>
                    ${firstGenre ? `<span>• ${firstGenre}</span>` : ''}
                </div>
            </div>

            <div class="card-actions-col">
                <div class="card-chapters-summary">${chaptersSummaryHtml}</div>

                <button type="button" class="watch-chapters-btn ${hasFree ? 'has-free-btn' : ''}">
                    ${hasFree ? `Смотреть (${freeChCount > 0 ? 'есть бесплатные' : 'бесплатно'})` : 'Смотреть главы'}
                </button>

                <div class="buy-sub-group">
                    <a href="${cleanSubUrl}" target="_blank" rel="noopener noreferrer" class="buy-tier-link">
                        Открыть ${voicedCh > 0 ? `все ${voicedCh} гл.` : 'доступ'} • ${subPrice}
                    </a>
                </div>

                <div class="card-footer-row">
                    <span>Обновлено: ${item.last_update}</span>
                    <button type="button" class="share-title-btn" title="Скопировать ссылку">Поделиться</button>
                </div>

                <button type="button" class="vote-btn ${voted ? 'voted' : ''}" data-id="${item.id}">
                    <span class="vote-label">${voted ? 'Жду проду' : 'Хочу проду'}</span>
                    <span class="vote-count" id="vote-count-${item.id}">${item.votes || 0}</span>
                </button>
            </div>
        </div>
    `;

    card.querySelector('.card-cover-wrap')?.addEventListener('click', () => openChaptersModal(item));
    card.querySelector('.card-title-btn')?.addEventListener('click', () => openChaptersModal(item));
    card.querySelector('.watch-chapters-btn')?.addEventListener('click', () => openChaptersModal(item));

    card.querySelector('.card-type-chip')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const cType = e.currentTarget.dataset.type || 'all';
        const sel = document.getElementById('typeFilterSelect');
        if (sel) {
            sel.value = sel.value === cType ? 'all' : cType;
            activeContentTypeFilter = sel.value;
            updateResetFiltersBtnVisibility();
            applyFilters();
        }
    });

    card.querySelector('.buy-tier-link')?.addEventListener('click', () => {
        trackSubConversion({ title: item.title, metric_tag: item.metric_tag, level: item.tier_level });
    });

    const shareBtn = card.querySelector('.share-title-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareUrl = `${window.location.origin}${window.location.pathname}?manga=${encodeURIComponent(item.metric_tag)}`;
            navigator.clipboard?.writeText(shareUrl).then(() => {
                shareBtn.textContent = 'Скопировано';
                setTimeout(() => { shareBtn.textContent = 'Поделиться'; }, 1400);
            }).catch(() => {});
        });
    }

    const voteBtn = card.querySelector('.vote-btn');
    if (voteBtn) voteBtn.addEventListener('click', () => handleVote(item, voteBtn));

    return card;
}

// --- ЗАГРУЗКА И ИНИЦИАЛИЗАЦИЯ ДАННЫХ ---
function loadBoostyGoalStats() {
    fetch('stats.json?v=' + Date.now())
        .then(res => res.ok ? res.json() : null)
        .then(stats => {
            if (!stats) return;
            cachedStatsData = stats;
            if (stats.avatar) {
                const av = document.getElementById('channelAvatar');
                if (av) av.src = stats.avatar;
            }
            if (stats.ambient_state) applyAtmosphereState(stats.ambient_state);

            const ytBadge = document.getElementById('ytCountBadge');
            const tgBadge = document.getElementById('tgCountBadge');
            if (ytBadge) ytBadge.textContent = Array.isArray(stats.yt_videos) ? stats.yt_videos.length : 0;
            if (tgBadge) tgBadge.textContent = Array.isArray(stats.tg_news) ? stats.tg_news.length : 0;

            if (Array.isArray(stats.goals) && stats.goals.length > 0) {
                const g = stats.goals[0];
                const current = typeof g.current === 'number' ? g.current : 173;
                const target = g.target || 200;
                const left = Math.max(1, target - current);
                const percent = Math.min(100, Math.round((current / target) * 100));
                liveGoalStats = { current, target, left, percent };

                const numEl = document.getElementById('goalNumbers');
                const barEl = document.getElementById('goalProgressBar');
                const descEl = document.getElementById('goalDesc');
                const cwLauncher = document.getElementById('catLauncherLabel');

                if (numEl) numEl.textContent = `${current} из ${target} подписчиков (${percent}%)`;
                if (barEl) barEl.style.width = `${percent}%`;
                if (descEl && g.description) descEl.textContent = g.description;
                if (cwLauncher) cwLauncher.textContent = `Цель: ${current}/${target}`;
            }
        })
        .catch(() => {});
}

async function loadVotesAndCatalogData() {
    const ts = Date.now();
    try {
        const vRes = await fetch('votes.json?v=' + ts);
        if (vRes.ok) {
            const vDoc = await vRes.json();
            if (vDoc && typeof vDoc === 'object') {
                monthsArchiveData = vDoc.months_archive || {};
                if (vDoc.month === CURRENT_MONTH_KEY && vDoc.items) votesFileMap = vDoc.items;
                else if (monthsArchiveData[CURRENT_MONTH_KEY]?.items) votesFileMap = monthsArchiveData[CURRENT_MONTH_KEY].items;
            }
        }
    } catch (e) {}

    populateMonthStatsSelect();

    try {
        const res = await fetch('data.json?v=' + ts);
        const data = await res.json();
        try { localStorage.setItem('taka_catalog_backup_cache', JSON.stringify(data)); } catch (e) {}
        initializeCatalogItems(data);
    } catch (e) {
        const backup = localStorage.getItem('taka_catalog_backup_cache');
        if (backup) initializeCatalogItems(JSON.parse(backup));
    }
}

function initializeCatalogItems(data) {
    allItems = (Array.isArray(data) ? data : []).map((item, index) => {
        const cleanTitle = cleanDisplayTitle(item.title);
        const engMetricTag = makeCleanEnglishTag(cleanTitle);
        const levelNum = item.tier_level === 2 ? 2 : 1;
        const totalChapters = Number(item.chapters) || 0;
        const freeChapters = Math.min(totalChapters || 9999, Number(item.free_chapters) || 0);
        const paidChapters = Math.max(0, totalChapters - freeChapters);
        const hasFree = Boolean(item.has_free || freeChapters > 0 || (Array.isArray(item.free_posts) && item.free_posts.length > 0));

        const fileVoteEntry = votesFileMap[item.id];
        const fileVotes = fileVoteEntry ? (typeof fileVoteEntry === 'number' ? fileVoteEntry : Number(fileVoteEntry.votes) || 0) : 0;
        const initialVotes = Math.max(fileVotes, Number(votesCache[item.id]) || 0, userVotedMap[item.id] ? 1 : 0);
        votesCache[item.id] = initialVotes;

        const fileSearches = fileVoteEntry && typeof fileVoteEntry === 'object' ? (Number(fileVoteEntry.monthly_searches) || 0) : 0;
        const initialSearches = Math.max(fileSearches, Number(monthlySearchMap[item.id]) || 0, initialVotes * 2);

        return {
            ...item,
            title: cleanTitle,
            image: normalizeCoverUrl(item.image),
            content_type: CONTENT_TYPE_LABELS[item.content_type] ? item.content_type : 'manhwa',
            chapters: totalChapters,
            free_chapters: freeChapters,
            paid_chapters: paidChapters,
            has_free: hasFree,
            metric_tag: engMetricTag,
            tier_level: levelNum,
            sub_link: levelNum === 2 ? TIER_SUB_LINKS[2] : TIER_SUB_LINKS[1],
            originalIndex: index,
            votes: initialVotes,
            monthly_searches: initialSearches
        };
    });

    const heroTotalEl = document.getElementById('heroTitlesTotal');
    if (heroTotalEl) heroTotalEl.textContent = String(allItems.length);

    updateTabCounters();
    renderHighlightsBar();
    checkUrlAnchorParam();
    applyFilters();
    initCatRecommendationWidget();
    initFirstVisitTour();
    initConversionEngine();
}

function updateTabCounters() {
    const cAll = document.getElementById('count-all');
    const cFree = document.getElementById('count-free');
    const c1 = document.getElementById('count-t1');
    const c2 = document.getElementById('count-t2');

    if (cAll) cAll.textContent = allItems.length;
    if (cFree) cFree.textContent = allItems.filter(i => i.has_free).length;
    if (c1) c1.textContent = allItems.filter(i => i.tier_level === 1).length;
    if (c2) c2.textContent = allItems.filter(i => i.tier_level === 2).length;

    const manhwaCnt = allItems.filter(x => x.content_type === 'manhwa').length;
    const manhuaCnt = allItems.filter(x => x.content_type === 'manhua').length;
    const mangaCnt = allItems.filter(x => x.content_type === 'manga').length;

    const optAll = document.getElementById('typeOptAll');
    const optManhwa = document.getElementById('typeOptManhwa');
    const optManhua = document.getElementById('typeOptManhua');
    const optManga = document.getElementById('typeOptManga');

    if (optAll) optAll.textContent = `Все типы (${allItems.length})`;
    if (optManhwa) optManhwa.textContent = `манхва (${manhwaCnt})`;
    if (optManhua) optManhua.textContent = `маньхуа (${manhuaCnt})`;
    if (optManga) optManga.textContent = `манга (${mangaCnt})`;
}

// --- ФИЛЬТРАЦИЯ И РЕНДЕР КАТАЛОГА ---
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const rawSearch = searchInput ? searchInput.value.trim() : '';
    const searchText = rawSearch.toLowerCase();
    const sortValue = document.getElementById('sortSelect')?.value || 'update_desc';
    const selectedGenreArray = Array.from(selectedGenres);

    if (missingSearchTimer) clearTimeout(missingSearchTimer);

    let filtered = allItems.filter(item => {
        const tagText = (item.genres || []).map(g => READER_TAGS_DICTIONARY[g] || g).join(' ').toLowerCase();
        const hiddenText = (item.hidden_tags || []).join(' ').toLowerCase();
        const typeText = (CONTENT_TYPE_LABELS[item.content_type] || '').toLowerCase();
        const statusText = [
            item.is_frozen ? 'заморожен' : '',
            item.is_romance ? 'романтика' : '',
            item.is_completed ? 'завершен завершён' : ''
        ].join(' ');

        const matchesSearch = !searchText ||
            item.title.toLowerCase().includes(searchText) ||
            (item.metric_tag && item.metric_tag.toLowerCase().includes(searchText)) ||
            tagText.includes(searchText) ||
            hiddenText.includes(searchText) ||
            typeText.includes(searchText) ||
            statusText.includes(searchText);

        let matchesTier = true;
        if (activeTierTab === 'free') matchesTier = Boolean(item.has_free);
        else if (activeTierTab !== 'all') matchesTier = String(item.tier_level) === String(activeTierTab);

        const matchesType = activeContentTypeFilter === 'all' || item.content_type === activeContentTypeFilter;

        let matchesGenre = true;
        if (selectedGenreArray.length > 0) {
            const itemGenres = item.genres || [];
            matchesGenre = selectedGenreArray.length <= 2
                ? selectedGenreArray.every(g => itemGenres.includes(g))
                : selectedGenreArray.some(g => itemGenres.includes(g));
        }

        let matchesLetter = true;
        if (activeLetterFilter !== 'all') {
            const firstChar = String(item.title || '').trim().charAt(0).toUpperCase().replace('Ё', 'Е');
            matchesLetter = firstChar === activeLetterFilter;
        }

        return matchesSearch && matchesTier && matchesType && matchesGenre && matchesLetter;
    });

    if (rawSearch.length >= 3 && filtered.length === 0 && activeTierTab === 'all' && selectedGenreArray.length === 0) {
        missingSearchTimer = setTimeout(() => recordMissingSearchQuery(rawSearch), 900);
    }

    filtered.sort((a, b) => {
        if (a._isSpotlight && !b._isSpotlight) return -1;
        if (!a._isSpotlight && b._isSpotlight) return 1;
        const stA = getItemMonthStats(a, selectedStatsMonth);
        const stB = getItemMonthStats(b, selectedStatsMonth);

        if (sortValue === 'update_desc') return (b.timestamp || 0) - (a.timestamp || 0);
        if (sortValue === 'votes_desc') return (stB.votes - stA.votes) || ((b.chapters || 0) - (a.chapters || 0));
        if (sortValue === 'monthly_popular_desc') return (stB.searches + stB.votes * 3) - (stA.searches + stA.votes * 3);
        if (sortValue === 'alpha_asc') return a.title.localeCompare(b.title, 'ru');
        if (sortValue === 'alpha_desc') return b.title.localeCompare(a.title, 'ru');
        if (sortValue === 'free_desc') return ((b.free_chapters || 0) - (a.free_chapters || 0)) || ((b.chapters || 0) - (a.chapters || 0));
        if (sortValue === 'chapters_desc') return (b.chapters || 0) - (a.chapters || 0);
        return a.originalIndex - b.originalIndex;
    });

    lastFilteredItems = filtered;
    const totalEl = document.getElementById('totalTitlesCount');
    if (totalEl) {
        const manhwaCnt = filtered.filter(x => x.content_type === 'manhwa').length;
        const manhuaCnt = filtered.filter(x => x.content_type === 'manhua').length;
        const mangaCnt = filtered.filter(x => x.content_type === 'manga').length;
        totalEl.textContent = `Найдено: ${filtered.length} из ${allItems.length} (манхва: ${manhwaCnt} • маньхуа: ${manhuaCnt} • манга: ${mangaCnt})`;
    }
    resetAndRenderCatalog(filtered, rawSearch);
}

function resetAndRenderCatalog(items, rawSearchQuery = '') {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;
    catalog.innerHTML = '';
    renderedCardsCount = 0;

    if (items.length === 0) {
        if (rawSearchQuery.length >= 2) {
            const safeQ = rawSearchQuery.replace(/[<>"']/g, '');
            const tgHref = `https://t.me/TAKA_YT?text=${encodeURIComponent(`Привет! Искал(а) в каталоге тайтл «${safeQ}», хотелось бы увидеть озвучку.`)}`;
            catalog.innerHTML = `
                <div class="empty-catalog-box">
                    <p>Тайтл <b>«${safeQ}»</b> пока не найден</p>
                    <a href="${tgHref}" target="_blank" rel="noopener noreferrer" class="missing-request-btn">Предложить автору в Telegram</a>
                </div>`;
        } else {
            catalog.innerHTML = `<div class="empty-catalog-box"><p>По выбранным фильтрам ничего не найдено.</p></div>`;
        }
        return;
    }
    appendNextCatalogBatch();
}

function appendNextCatalogBatch() {
    const catalog = document.getElementById('catalog');
    if (!catalog || renderedCardsCount >= lastFilteredItems.length) return;

    const nextBatch = lastFilteredItems.slice(renderedCardsCount, renderedCardsCount + BATCH_LOAD_SIZE);
    const frag = document.createDocumentFragment();
    nextBatch.forEach((item, idx) => {
        frag.appendChild(createCatalogCardElement(item, (renderedCardsCount + idx) < 4));
    });
    catalog.appendChild(frag);
    renderedCardsCount += nextBatch.length;
}

// --- ГОЛОСОВАНИЕ И СТАТИСТИКА ---
function hasUserVoted(id) {
    return Boolean(userVotedMap[String(id)]);
}

function handleVote(item, btnElement) {
    const id = String(item.id);
    const alreadyVoted = hasUserVoted(id);

    trackGoal('click_want_proda', { title: item.title, metric_tag: item.metric_tag, level: item.tier_level, item });

    if (!alreadyVoted) {
        const newCount = (Number(item.votes) || 0) + 1;
        item.votes = newCount;
        votesCache[id] = newCount;
        userVotedMap[id] = newCount;
        try {
            localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(votesCache));
            localStorage.setItem(USER_VOTED_MAP_KEY, JSON.stringify(userVotedMap));
        } catch (e) {}

        if (btnElement) {
            btnElement.classList.add('voted');
            const labelEl = btnElement.querySelector('.vote-label');
            if (labelEl) labelEl.textContent = 'Жду проду';
        }
        document.querySelectorAll(`[id="vote-count-${id}"]`).forEach(el => { el.textContent = newCount; });

        fetch(`https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/${item.vote_key || getSafeVoteKey(id)}/up`, { cache: 'no-store' }).catch(() => {});
    }

    openProdaPopup(item, alreadyVoted);
}

function openProdaPopup(item, alreadyVoted = false) {
    const modal = document.getElementById('prodaModal');
    if (!modal) return;
    const currentVotes = Number(item.votes) || 1;
    const sorted = [...allItems].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const rank = sorted.findIndex(x => String(x.id) === String(item.id)) + 1;

    document.getElementById('prodaModalTitle').textContent = alreadyVoted ? `Голос за «${item.title}» уже учтён (${currentVotes})` : `Голос за «${item.title}» учтён`;
    document.getElementById('prodaRankLabel').textContent = `Место в рейтинге: #${rank}`;
    document.getElementById('prodaVotesGoalText').textContent = `${currentVotes} гол.`;
    document.getElementById('prodaPriorityFill').style.width = `${Math.min(100, Math.max(15, currentVotes * 8))}%`;
    document.getElementById('prodaPriorityHint').textContent = rank <= 3 ? 'Тайтл в Топ-3 приоритета этого месяца.' : 'Чем больше голосов, тем быстрее выйдут новые главы.';

    const boostyBtn = document.getElementById('prodaBoostyBtn');
    const price = item.tier_level === 2 ? '500 ₽' : '250 ₽';
    boostyBtn.href = appendBoostyUtm(item.sub_link, item.title);
    document.getElementById('prodaBoostyBtnTitle').textContent = `Открыть «${item.title}» по подписке (${price})`;
    boostyBtn.onclick = () => trackSubConversion({ title: item.title, metric_tag: item.metric_tag, level: item.tier_level });

    const tgBtn = document.getElementById('prodaTgBtn');
    const orderPrice = item.tier_level === 2 ? '3000 ₽' : '1500 ₽';
    tgBtn.href = `https://t.me/TAKA_YT?text=${encodeURIComponent(`Привет! Хочу заказать 10 глав тайтла «${item.title}» (${orderPrice}).`)}`;

    modal.classList.add('active');
}

function incrementMonthlyTitlePopularity(item, weight = 1) {
    if (!item?.id) return;
    const id = String(item.id);
    monthlySearchMap[id] = (Number(monthlySearchMap[id]) || Number(item.monthly_searches) || 0) + weight;
    item.monthly_searches = monthlySearchMap[id];
    try { localStorage.setItem(LOCAL_SEARCH_COUNT_KEY, JSON.stringify(monthlySearchMap)); } catch (e) {}
    fetch(`https://api.counterapi.dev/v1/${SEARCH_NAMESPACE}/${item.vote_key || getSafeVoteKey(id)}/up`, { cache: 'no-store' }).catch(() => {});
}

function recordMissingSearchQuery(rawQuery) {
    const cleanQ = String(rawQuery || '').trim().replace(/\s+/g, ' ');
    if (cleanQ.length < 3) return;
    const engSlug = makeCleanEnglishTag(cleanQ);
    fetch(`https://api.counterapi.dev/v1/${MISSING_NAMESPACE}/q_${engSlug}/up`, { cache: 'no-store' }).catch(() => {});
}

function recordUserTagInterest(item, weight = 1) {
    if (!item || !Array.isArray(item.genres)) return;
    item.genres.forEach(g => {
        if (READER_TAGS_DICTIONARY[g]) userFavoriteTags[g] = (Number(userFavoriteTags[g]) || 0) + weight;
    });
    try { localStorage.setItem(USER_TAG_PREFS_KEY, JSON.stringify(userFavoriteTags)); } catch (e) {}
    if (isForYouStripOpen) renderTopForYouStrip();
}

function populateMonthStatsSelect() {
    const sel = document.getElementById('monthStatsSelect');
    if (!sel) return;
    const available = Array.from(new Set([CURRENT_MONTH_KEY, ...Object.keys(monthsArchiveData || {})])).sort().reverse();
    sel.innerHTML = available.map(m => `<option value="${m}">${m === CURRENT_MONTH_KEY ? 'Текущий месяц' : m}</option>`).join('');
    sel.value = CURRENT_MONTH_KEY;
    sel.addEventListener('change', () => {
        selectedStatsMonth = sel.value || CURRENT_MONTH_KEY;
        applyFilters();
    });
}

function getItemMonthStats(item, monthKey = selectedStatsMonth) {
    if (!monthKey || monthKey === 'current' || monthKey === CURRENT_MONTH_KEY) {
        return { votes: Number(item.votes) || 0, searches: Number(item.monthly_searches) || 0 };
    }
    const entry = monthsArchiveData[monthKey]?.items?.[item.id];
    return entry ? { votes: Number(entry.votes) || 0, searches: Number(entry.monthly_searches) || 0 } : { votes: 0, searches: 0 };
}

// --- ВИДЖЕТ КОТИКА И ЖЁСТКАЯ КОНВЕРСИОННАЯ ЛОГИКА ---
let catWidgetSelectedTier = 2;
let catWidgetCurrentItem = null;

function initCatRecommendationWidget() {
    const widget = document.getElementById('catPromoWidget');
    if (!widget) return;

    const closeBtn = document.getElementById('catWidgetCloseBtn');
    const launcherBtn = document.getElementById('catWidgetLauncher');
    const tier1Btn = document.getElementById('catTierBtn1');
    const tier2Btn = document.getElementById('catTierBtn2');

    tier1Btn?.addEventListener('click', () => {
        catWidgetSelectedTier = 1;
        tier1Btn.classList.add('active');
        tier2Btn?.classList.remove('active');
        syncCatWidgetButtons();
    });
    tier2Btn?.addEventListener('click', () => {
        catWidgetSelectedTier = 2;
        tier2Btn.classList.add('active');
        tier1Btn?.classList.remove('active');
        syncCatWidgetButtons();
    });
    closeBtn?.addEventListener('click', () => {
        widget.classList.remove('open');
        widget.classList.add('minimized');
        try { sessionStorage.setItem('taka_cat_minimized', '1'); } catch (e) {}
    });
    launcherBtn?.addEventListener('click', () => {
        const isMin = widget.classList.contains('minimized');
        widget.classList.toggle('minimized', !isMin);
        widget.classList.toggle('open', isMin);
    });
    syncCatWidgetButtons();
}

function updateCatWidgetContext(item, autoOpen = false) {
    if (!item) return;
    catWidgetCurrentItem = item;
    catWidgetSelectedTier = item.tier_level === 2 ? 2 : 1;
    document.getElementById('catTierBtn1')?.classList.toggle('active', catWidgetSelectedTier === 1);
    document.getElementById('catTierBtn2')?.classList.toggle('active', catWidgetSelectedTier === 2);

    const msgEl = document.getElementById('catWidgetMessage');
    if (msgEl) {
        const left = liveGoalStats.left || 27;
        const chText = item.chapters > 0 ? `все ${item.chapters} гл.` : 'все серии';
        msgEl.textContent = `Понравился «${item.title}»? Оформи ${catWidgetSelectedTier} уровень — откроешь ${chText} и поможешь добить цель (осталось ${left} подп.).`;
    }
    syncCatWidgetButtons();

    if (autoOpen && sessionStorage.getItem('taka_cat_minimized') !== '1') {
        const widget = document.getElementById('catPromoWidget');
        if (widget) {
            widget.classList.remove('minimized');
            widget.classList.add('open');
        }
    }
}

function syncCatWidgetButtons() {
    const subBtn = document.getElementById('catWidgetSubBtn');
    const perkEl = document.getElementById('catWidgetPerkText');
    if (!subBtn) return;

    const cleanTarget = catWidgetCurrentItem ? catWidgetCurrentItem.title : `cat_tier_${catWidgetSelectedTier}`;
    subBtn.href = appendBoostyUtm(TIER_SUB_LINKS[catWidgetSelectedTier], cleanTarget);
    if (catWidgetSelectedTier === 2) {
        subBtn.textContent = 'Открыть всё • 500 ₽/мес';
        if (perkEl) perkEl.textContent = 'Все тайтлы 1 и 2 уровня + закрытый ТГ-чат';
    } else {
        subBtn.textContent = 'Открыть базу • 250 ₽/мес';
        if (perkEl) perkEl.textContent = 'Доступ ко всей базовой библиотеке озвучки';
    }
}

let chaptersViewedCount = 0;
function maybeTriggerConversion(fromModal = false) {
    if (fromModal) chaptersViewedCount += 1;
    try {
        if (sessionStorage.getItem('taka_conv_shown')) return;
        if (!fromModal && chaptersViewedCount === 0 && window.scrollY < 450) return;

        sessionStorage.setItem('taka_conv_shown', '1');
        // Чередуем пуш-уведомление и виджет котика
        if (Math.random() < 0.6) {
            showConversionPushToast();
        } else if (catWidgetCurrentItem) {
            updateCatWidgetContext(catWidgetCurrentItem, true);
        }
    } catch (e) {}
}

function showConversionPushToast() {
    const toast = document.getElementById('conversionPushToast');
    if (!toast) return;
    const titleEl = document.getElementById('convToastTitle');
    const textEl = document.getElementById('convToastText');
    const ctaEl = document.getElementById('convToastCta');

    if (catWidgetCurrentItem) {
        const price = catWidgetCurrentItem.tier_level === 2 ? '500 ₽' : '250 ₽';
        if (titleEl) titleEl.textContent = `Смотреть «${catWidgetCurrentItem.title}» целиком?`;
        if (textEl) textEl.textContent = `Открой все ${catWidgetCurrentItem.chapters || ''} главы сразу и поддержи выход новых серий.`;
        if (ctaEl) {
            ctaEl.href = appendBoostyUtm(catWidgetCurrentItem.sub_link, catWidgetCurrentItem.title);
            ctaEl.textContent = `Открыть доступ • ${price}`;
        }
    }
    toast.style.display = 'block';
}

function initConversionEngine() {
    document.getElementById('closeConvToastBtn')?.addEventListener('click', () => {
        const toast = document.getElementById('conversionPushToast');
        if (toast) toast.style.display = 'none';
    });

    setTimeout(() => {
        try {
            if (!sessionStorage.getItem('taka_conv_shown')) {
                sessionStorage.setItem('taka_conv_shown', '1');
                showConversionPushToast();
            }
        } catch (e) {}
    }, 28000);
}

// --- ОБУЧЕНИЕ КОТИКА-ПРОВОДНИКА (4 ЭЛЕМЕНТА, ПК + ТЕЛЕФОН) ---
const TOUR_STEPS = [
    {
        selector: '#tourPricingSection',
        title: '1. Тарифы подписки',
        text: 'Выберите уровень доступа. 2 уровень (500 ₽) открывает всю библиотеку, включая закрытые Лицензии.'
    },
    {
        selector: '#tourMediaButtons',
        title: '2. YouTube и Telegram',
        text: 'Нажмите на кнопки YouTube или Telegram, чтобы читать последние посты и смотреть свежие ролики прямо здесь.'
    },
    {
        selector: '#tourFiltersSection',
        title: '3. Поиск и типы манги',
        text: 'Фильтруйте каталог по типам (манга, манхва, маньхуа), жанрам и бесплатным главам.'
    },
    {
        selector: '#catalog .card',
        title: '4. Выбор глав в тайтле',
        text: 'Нажмите на любую карточку или кнопку «Смотреть», чтобы выбрать нужный выпуск — бесплатные отмечены зелёным.'
    }
];

let currentTourStep = 0;

function initFirstVisitTour() {
    document.getElementById('startTourBtn')?.addEventListener('click', () => startTour(0));
    document.getElementById('tourSkipBtn')?.addEventListener('click', endTour);
    document.getElementById('tourNextBtn')?.addEventListener('click', () => {
        if (currentTourStep + 1 >= TOUR_STEPS.length) endTour();
        else startTour(currentTourStep + 1);
    });

    window.addEventListener('resize', () => {
        const ov = document.getElementById('catTourOverlay');
        if (ov && ov.style.display === 'block') positionTourStep(currentTourStep);
    });

    try {
        if (!localStorage.getItem(TOUR_DONE_KEY)) {
            setTimeout(() => startTour(0), 700);
        }
    } catch (e) {}
}

function startTour(stepIdx) {
    currentTourStep = stepIdx;
    const overlay = document.getElementById('catTourOverlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    overlay.setAttribute('aria-hidden', 'false');
    positionTourStep(stepIdx);
}

function positionTourStep(stepIdx) {
    const step = TOUR_STEPS[stepIdx];
    const target = step ? document.querySelector(step.selector) : null;
    if (!target) {
        endTour();
        return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const spotlight = document.getElementById('catTourSpotlight');
        const tooltip = document.getElementById('catTourTooltip');
        if (!spotlight || !tooltip) return;

        const pad = 6;
        spotlight.style.top = `${Math.max(4, rect.top - pad)}px`;
        spotlight.style.left = `${Math.max(4, rect.left - pad)}px`;
        spotlight.style.width = `${Math.min(window.innerWidth - 8, rect.width + pad * 2)}px`;
        spotlight.style.height = `${Math.min(window.innerHeight - 8, rect.height + pad * 2)}px`;

        document.getElementById('tourStepBadge').textContent = `Шаг ${stepIdx + 1} из ${TOUR_STEPS.length}`;
        document.getElementById('tourTitle').textContent = step.title;
        document.getElementById('tourText').textContent = step.text;
        document.getElementById('tourNextBtn').textContent = stepIdx === TOUR_STEPS.length - 1 ? 'Готово' : 'Дальше';

        const tooltipH = tooltip.offsetHeight || 160;
        const spaceBelow = window.innerHeight - rect.bottom;
        const topPos = spaceBelow > tooltipH + 20
            ? rect.bottom + 12
            : Math.max(12, rect.top - tooltipH - 12);
        const leftPos = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - tooltip.offsetWidth - 12));

        tooltip.style.top = `${topPos}px`;
        tooltip.style.left = `${leftPos}px`;
    }, 280);
}

function endTour() {
    const overlay = document.getElementById('catTourOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }
    try { localStorage.setItem(TOUR_DONE_KEY, '1'); } catch (e) {}
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ФИЛЬТРОВ И МОДАЛОК ---
function renderTopForYouStrip() {
    const strip = document.getElementById('forYouTopStrip');
    const grid = document.getElementById('forYouRowGrid');
    const tagsList = document.getElementById('userPrefsTagsList');
    const btn = document.getElementById('toggleForYouStripBtn');
    if (!strip || !grid) return;

    strip.style.display = isForYouStripOpen ? 'block' : 'none';
    btn?.classList.toggle('active', isForYouStripOpen);
    if (!isForYouStripOpen) return;

    const prefTags = Object.keys(userFavoriteTags).filter(k => READER_TAGS_DICTIONARY[k] && userFavoriteTags[k] > 0);
    if (tagsList) {
        tagsList.innerHTML = Object.entries(READER_TAGS_DICTIONARY).map(([k, label]) =>
            `<button type="button" class="pref-tag-chip ${prefTags.includes(k) ? 'selected' : ''}" data-tag="${k}">${label}</button>`
        ).join('');
        tagsList.querySelectorAll('.pref-tag-chip').forEach(ch => {
            ch.addEventListener('click', () => {
                const t = ch.dataset.tag;
                if (userFavoriteTags[t]) delete userFavoriteTags[t];
                else userFavoriteTags[t] = 3;
                try { localStorage.setItem(USER_TAG_PREFS_KEY, JSON.stringify(userFavoriteTags)); } catch (e) {}
                renderTopForYouStrip();
            });
        });
    }

    const rec = [...allItems]
        .filter(i => prefTags.length === 0 || (i.genres || []).some(g => prefTags.includes(g)))
        .slice(0, 4);
    grid.innerHTML = '';
    rec.forEach((it, idx) => grid.appendChild(createCatalogCardElement(it, idx < 2)));
}

function openLuckySingleRow() {
    const sec = document.getElementById('luckyRowSection');
    const grid = document.getElementById('luckyRowGrid');
    if (!sec || !grid || !allItems.length) return;
    const pool = [...allItems].sort(() => Math.random() - 0.5).slice(0, 4);
    grid.innerHTML = '';
    pool.forEach(it => grid.appendChild(createCatalogCardElement(it, true)));
    sec.style.display = 'block';
}

function syncGenrePillsUI() {
    document.querySelectorAll('#genrePillsRow .genre-pill').forEach(p => p.classList.toggle('active', selectedGenres.has(p.dataset.genre)));
    const badge = document.getElementById('activeGenreLabelBadge');
    const clearBtn = document.getElementById('clearSelectedTagsBtn');
    if (badge) {
        badge.style.display = selectedGenres.size > 0 ? 'inline-block' : 'none';
        badge.textContent = String(selectedGenres.size);
    }
    if (clearBtn) clearBtn.style.display = selectedGenres.size > 0 ? 'inline-block' : 'none';
    updateResetFiltersBtnVisibility();
}

function updateResetFiltersBtnVisibility() {
    const btn = document.getElementById('resetAllFiltersBtn');
    const hasSearch = Boolean(document.getElementById('searchInput')?.value.trim());
    if (btn) {
        btn.style.display = (activeTierTab !== 'all' || selectedGenres.size > 0 || activeContentTypeFilter !== 'all' || activeLetterFilter !== 'all' || hasSearch)
            ? 'inline-flex' : 'none';
    }
}

function checkUrlAnchorParam() {
    try {
        const params = new URLSearchParams(window.location.search);
        const q = (params.get('manga') || params.get('title') || '').trim().toLowerCase();
        if (!q) return;
        const matched = allItems.find(i => i.metric_tag === q || i.title.toLowerCase().includes(q));
        if (matched) {
            const inp = document.getElementById('searchInput');
            if (inp) inp.value = matched.title;
            matched._isSpotlight = true;
        }
    } catch (e) {}
}

function setupModal(modalId, openBtnId, closeBtnId) {
    const modal = document.getElementById(modalId);
    const openBtn = openBtnId ? document.getElementById(openBtnId) : null;
    const closeBtn = document.getElementById(closeBtnId);
    if (openBtn && modal) openBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
}

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('taka_site_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.textContent = savedTheme === 'light' ? 'Светлая' : 'Тёмная';
        themeBtn.addEventListener('click', () => {
            const next = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('taka_site_theme', next);
            themeBtn.textContent = next === 'light' ? 'Светлая' : 'Тёмная';
        });
    }

    const resetInfo = document.getElementById('voteResetInfo');
    if (resetInfo) resetInfo.textContent = CURRENT_MONTH_HUMAN;

    setupModal('orderModal', 'openOrderModal', 'closeOrderModal');
    setupModal('guideModal', null, 'closeGuideModal');
    setupModal('prodaModal', null, 'closeProdaModal');
    setupModal('chaptersModal', null, 'closeChaptersModal');
    setupModal('mediaFeedModal', null, 'closeMediaFeedModal');
    setupModal('highlightsModal', null, 'closeHighlightsModal');

    document.getElementById('openYoutubeFeedBtn')?.addEventListener('click', () => openMediaFeedModal('youtube'));
    document.getElementById('openTelegramFeedBtn')?.addEventListener('click', () => openMediaFeedModal('telegram'));

    document.getElementById('hlTabWeek')?.addEventListener('click', () => { activeHlMode = 'week'; renderHighlightsBar(); });
    document.getElementById('hlTabMonth')?.addEventListener('click', () => { activeHlMode = 'month'; renderHighlightsBar(); });
    document.getElementById('openHighlightsModalBtn')?.addEventListener('click', () => openHighlightsModal(activeHlMode));
    document.getElementById('hlModalTabWeek')?.addEventListener('click', () => openHighlightsModal('week'));
    document.getElementById('hlModalTabMonth')?.addEventListener('click', () => openHighlightsModal('month'));

    document.querySelectorAll('.tier-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeTierTab = btn.dataset.tier || 'all';
            document.querySelectorAll('.tier-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
            updateResetFiltersBtnVisibility();
            applyFilters();
        });
    });

    const alphaRow = document.getElementById('alphaPillsRow');
    if (alphaRow) {
        alphaRow.innerHTML = `<button type="button" class="alpha-pill active" data-letter="all">Все</button>` +
            RUSSIAN_ALPHABET.map(l => `<button type="button" class="alpha-pill" data-letter="${l}">${l}</button>`).join('');
        alphaRow.querySelectorAll('.alpha-pill').forEach(b => {
            b.addEventListener('click', () => {
                activeLetterFilter = (activeLetterFilter === b.dataset.letter && b.dataset.letter !== 'all') ? 'all' : b.dataset.letter;
                alphaRow.querySelectorAll('.alpha-pill').forEach(x => x.classList.toggle('active', x.dataset.letter === activeLetterFilter));
                updateResetFiltersBtnVisibility();
                applyFilters();
            });
        });
    }

    document.getElementById('toggleGenresBtn')?.addEventListener('click', () => {
        document.getElementById('genrePillsDrawer')?.classList.toggle('open');
    });

    document.querySelectorAll('#genrePillsRow .genre-pill').forEach(p => {
        p.addEventListener('click', () => {
            const g = p.dataset.genre;
            if (selectedGenres.has(g)) selectedGenres.delete(g);
            else selectedGenres.add(g);
            syncGenrePillsUI();
            applyFilters();
        });
    });

    document.getElementById('resetAllGenrePill')?.addEventListener('click', () => { selectedGenres.clear(); syncGenrePillsUI(); applyFilters(); });
    document.getElementById('clearSelectedTagsBtn')?.addEventListener('click', () => { selectedGenres.clear(); syncGenrePillsUI(); applyFilters(); });
    document.getElementById('resetAllFiltersBtn')?.addEventListener('click', () => {
        activeTierTab = 'all';
        selectedGenres.clear();
        activeContentTypeFilter = 'all';
        activeLetterFilter = 'all';
        const si = document.getElementById('searchInput');
        if (si) si.value = '';
        const ts = document.getElementById('typeFilterSelect');
        if (ts) ts.value = 'all';
        document.querySelectorAll('.tier-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tier === 'all'));
        syncGenrePillsUI();
        applyFilters();
    });

    document.getElementById('typeFilterSelect')?.addEventListener('change', (e) => {
        activeContentTypeFilter = e.target.value || 'all';
        updateResetFiltersBtnVisibility();
        applyFilters();
    });

    document.getElementById('sortSelect')?.addEventListener('change', applyFilters);

    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    searchInput?.addEventListener('input', () => {
        if (clearBtn) clearBtn.style.display = searchInput.value.trim() ? 'flex' : 'none';
        updateResetFiltersBtnVisibility();
        applyFilters();
    });
    clearBtn?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        clearBtn.style.display = 'none';
        updateResetFiltersBtnVisibility();
        applyFilters();
    });

    document.getElementById('toggleForYouStripBtn')?.addEventListener('click', () => {
        isForYouStripOpen = !isForYouStripOpen;
        renderTopForYouStrip();
    });
    document.getElementById('togglePrefsCustomizeBtn')?.addEventListener('click', () => {
        const b = document.getElementById('userPrefsBanner');
        if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('hideForYouStripBtn')?.addEventListener('click', () => {
        isForYouStripOpen = false;
        renderTopForYouStrip();
    });
    document.getElementById('resetPrefsBtn')?.addEventListener('click', () => {
        userFavoriteTags = {};
        try { localStorage.removeItem(USER_TAG_PREFS_KEY); } catch (e) {}
        renderTopForYouStrip();
    });

    document.getElementById('randomTitleBtn')?.addEventListener('click', openLuckySingleRow);
    document.getElementById('rerollLuckyBtn')?.addEventListener('click', openLuckySingleRow);
    document.getElementById('closeLuckyRowBtn')?.addEventListener('click', () => {
        const sec = document.getElementById('luckyRowSection');
        if (sec) sec.style.display = 'none';
    });

    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');
    const catalog = document.getElementById('catalog');
    gridBtn?.addEventListener('click', () => { catalog?.classList.remove('list-view'); gridBtn.classList.add('active'); listBtn?.classList.remove('active'); });
    listBtn?.addEventListener('click', () => { catalog?.classList.add('list-view'); listBtn.classList.add('active'); gridBtn?.classList.remove('active'); });

    const sentinel = document.getElementById('infiniteScrollSentinel');
    if (sentinel && typeof IntersectionObserver !== 'undefined') {
        infiniteScrollObserver = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting) && renderedCardsCount < lastFilteredItems.length) {
                appendNextCatalogBatch();
            }
        }, { rootMargin: '420px 0px' });
        infiniteScrollObserver.observe(sentinel);
    }

    loadBoostyGoalStats();
    loadVotesAndCatalogData();
});
