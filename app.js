let allItems = [];
let activeTierTab = 'all';
let selectedGenres = new Set();
let activeContentTypeFilter = 'all';
let activeSpecialStatusFilter = 'all';
let activeLetterFilter = 'all';
let selectedStatsMonth = 'current';
let renderedCardsCount = 0;
let lastFilteredItems = [];
let infiniteScrollObserver = null;
let missingSearchTimer = null;
let monthsArchiveData = {};
let isForYouStripOpen = false;
let tgNewsCachedList = [];
let ytVideosCachedList = [];
let ytChannelIdCached = '';
let statsDataCache = {};
const BATCH_LOAD_SIZE = 20;

const BOOSTY_BLOG_URL = 'https://boosty.to/wynin';
const BOOSTY_SHOWCASE_URL = 'https://boosty.to/wynin/showcase';
const DEFAULT_TIER_1_URL = 'https://boosty.to/wynin/purchase/3908979';
const TG_CHANNEL_URL = 'https://t.me/LirlkzManga';
const YT_HANDLE_URL = 'https://www.youtube.com/@LirlkzManga';

const now = new Date();
const MONTH_NAMES_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
const CURRENT_MONTH_NAME = MONTH_NAMES_RU[now.getUTCMonth()];
const CURRENT_YEAR = now.getUTCFullYear();
const CURRENT_MONTH_KEY = `${CURRENT_YEAR}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
const CURRENT_MONTH_HUMAN = `${CURRENT_MONTH_NAME} ${CURRENT_YEAR}`;
const CURRENT_DAY_KEY = `${CURRENT_MONTH_KEY}_d${String(now.getUTCDate()).padStart(2, '0')}`;

const LOCAL_SEARCH_COUNT_KEY = `lirlkz_monthly_searches_${CURRENT_MONTH_KEY}`;
const LOCAL_MISSING_LOG_KEY = `lirlkz_missing_queries_${CURRENT_MONTH_KEY}`;
const DAILY_QUESTS_STATE_KEY = `lirlkz_daily_quests_v1_${CURRENT_DAY_KEY}`;
const USER_TAG_PREFS_KEY = 'lirlkz_user_favorite_tags_v4';
const TUTORIAL_DONE_STORAGE_KEY = 'lirlkz_tutorial_completed_v1';

const READER_TAGS_DICTIONARY = {
    "некромантия": "💀 Некромантия",
    "система": "⚡ Система",
    "имба": "👑 Имба ГГ",
    "регрессия": "🔄 Регрессия",
    "перерождение": "✨ Перерождение",
    "подземелья": "🏰 Подземелья",
    "драконы": "🐉 Драконы",
    "призыв": "🐾 Призыв",
    "апокалипсис": "☣️ Апокалипсис",
    "культивация": "🏯 Культивация",
    "фэнтези": "🔮 Фэнтези",
    "демоны": "😈 Демоны",
    "месть": "🗡️ Месть",
    "артефакты": "💎 Артефакты",
    "романтика": "🌸 Романтика"
};

const CONTENT_TYPE_LABELS = {
    "manhwa": "Манхва",
    "manhua": "Маньхуа",
    "manga": "Манга"
};

const RUSSIAN_ALPHABET = [
    'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Л', 'М',
    'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Э', 'Ю', 'Я'
];

const DAILY_QUESTS_LIST = [
    { id: "dq_chapters", title: "🎬 Смотреть главы любого тайтла", desc: "Нажми на карточку и выбери выпуск", action: "open_any_chapters" },
    { id: "dq_top_rating", title: "🏆 Посмотреть Топ рейтинга", desc: "Отсортируй каталог по рейтингу", action: "sort:rating_desc" },
    { id: "dq_completed", title: "🔥 Завершённые тайтлы", desc: "Посмотри тайтлы, где озвучены все главы", action: "status:completed" }
];

let clientTypeOverrides = {};
let clientSpecialLists = { romance: [], frozen: [], completed: [], hidden_tags: {} };
let votesFileMap = {};
let monthlySearchMap = {};
let missingQueriesMap = {};
let dailyQuestsState = { dq_chapters: false, dq_top_rating: false, dq_completed: false };
let userFavoriteTags = {};

try { monthlySearchMap = JSON.parse(localStorage.getItem(LOCAL_SEARCH_COUNT_KEY) || '{}'); } catch {}
try { missingQueriesMap = JSON.parse(localStorage.getItem(LOCAL_MISSING_LOG_KEY) || '{}'); } catch {}
try { dailyQuestsState = { ...dailyQuestsState, ...JSON.parse(localStorage.getItem(DAILY_QUESTS_STATE_KEY) || '{}') }; } catch {}
try { userFavoriteTags = JSON.parse(localStorage.getItem(USER_TAG_PREFS_KEY) || '{}'); } catch {}

function normalizeTitleForMatch(str) {
    return String(str || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function makeCleanEnglishTag(str) {
    return normalizeTitleForMatch(str).replace(/\s+/g, '_').slice(0, 48) || 'lirlkz_item';
}

function appendBoostyUtm(url, tag) {
    const base = url || BOOSTY_SHOWCASE_URL;
    try {
        const u = new URL(base, BOOSTY_BLOG_URL);
        u.searchParams.set('utm_campaign', makeCleanEnglishTag(tag));
        return u.toString();
    } catch {
        return `${base}${base.includes('?') ? '&' : '?'}utm_campaign=${encodeURIComponent(makeCleanEnglishTag(tag))}`;
    }
}

function getVpnFreeImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    if (rawUrl.startsWith('media_cache/') || rawUrl.startsWith('./media_cache/')) return rawUrl;
    return rawUrl;
}

function trackGoal(goalName, payload = {}) {
    try {
        if (payload.item) {
            recordUserTagInterest(payload.item, 1);
            incrementMonthlyTitlePopularity(payload.item, 1);
        }
    } catch {}
}

function trackSubConversion(payload = {}) {
    trackGoal('click_subscribe', payload);
}

window.trackGoal = trackGoal;
window.trackSubConversion = trackSubConversion;

function openPaymentGuideModal(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const modal = document.getElementById('guideModal');
    if (modal) modal.classList.add('active');
}
window.openPaymentGuideModal = openPaymentGuideModal;

// --- Зимняя атмосфера (гирлянда + падающий снег) ---
function initWinterAtmosphere() {
    const topDecor = document.getElementById('seasonTopDecor');
    const ambientBg = document.getElementById('seasonAmbientBg');

    if (topDecor) {
        const colors = ['bulb-white', 'bulb-orange', 'bulb-silver'];
        const count = window.innerWidth <= 768 ? 14 : 24;
        const bulbs = [];
        for (let i = 0; i < count; i++) {
            bulbs.push(`<span class="garland-bulb ${colors[i % colors.length]}" style="animation-delay:${(i * 0.22).toFixed(2)}s"></span>`);
        }
        topDecor.innerHTML = bulbs.join('');
    }

    if (ambientBg) {
        const count = window.innerWidth <= 768 ? 12 : 22;
        const flakes = [];
        for (let i = 0; i < count; i++) {
            const left = Math.round((i / count) * 96 + Math.random() * 4);
            const delay = (Math.random() * 12).toFixed(1);
            const dur = (11 + Math.random() * 9).toFixed(1);
            const sym = i % 3 === 0 ? '❄️' : (i % 2 === 0 ? '❅' : '•');
            const size = sym === '•' ? (9 + (i % 4)) : (11 + (i % 6));
            flakes.push(`<span class="ambient-particle snow-flake" style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;">${sym}</span>`);
        }
        ambientBg.innerHTML = flakes.join('');
    }
}

function recordUserTagInterest(item, weight = 1) {
    if (item && Array.isArray(item.genres)) {
        item.genres.forEach(g => {
            if (READER_TAGS_DICTIONARY[g]) {
                userFavoriteTags[g] = (Number(userFavoriteTags[g]) || 0) + weight;
            }
        });
        try { localStorage.setItem(USER_TAG_PREFS_KEY, JSON.stringify(userFavoriteTags)); } catch {}
        if (isForYouStripOpen) renderTopForYouStrip();
    }
}

function getActivePreferredTags() {
    return Object.keys(userFavoriteTags)
        .filter(k => READER_TAGS_DICTIONARY[k] && Number(userFavoriteTags[k]) > 0)
        .sort((a, b) => Number(userFavoriteTags[b]) - Number(userFavoriteTags[a]));
}

function incrementMonthlyTitlePopularity(item, weight = 1) {
    if (!item || !item.id) return;
    monthlySearchMap[item.id] = (Number(monthlySearchMap[item.id]) || Number(item.monthly_searches) || 0) + weight;
    item.monthly_searches = monthlySearchMap[item.id];
    try { localStorage.setItem(LOCAL_SEARCH_COUNT_KEY, JSON.stringify(monthlySearchMap)); } catch {}
}

function isPostBelongingToThisItem(postObj) {
    if (!postObj) return false;
    const raw = String(postObj.title || '').toLowerCase();
    return !(raw.includes('график на ') || raw.includes('расписание на '));
}

function buildAllEpisodesForItem(item) {
    const rawPool = [
        ...(Array.isArray(item.all_posts) ? item.all_posts : []),
        ...(Array.isArray(item.free_posts) ? item.free_posts.map(fp => ({ ...fp, is_free: true })) : [])
    ];
    const seen = new Set();
    const out = [];
    rawPool.forEach((ep, idx) => {
        if (!ep || !isPostBelongingToThisItem(ep)) return;
        const pid = ep.post_id || ep.id || `${item.id}_${idx}`;
        if (seen.has(pid)) return;
        seen.add(pid);
        out.push({
            post_id: pid,
            title: ep.title || `${item.title} (${ep.range || 'Выпуск'})`,
            range: ep.range || `Выпуск #${idx + 1}`,
            date: ep.date || item.last_update || 'На Boosty',
            is_free: Boolean(ep.is_free),
            link: ep.link || item.link
        });
    });
    return out;
}

function openChaptersSelectModal(item, event) {
    if (!item) return;
    if (event) { event.preventDefault(); event.stopPropagation(); }
    completeDailyQuest('dq_chapters');
    trackGoal('open_chapters_modal', { title: item.title, metric_tag: item.metric_tag, item });

    const modal = document.getElementById('chaptersSelectModal');
    const coverEl = document.getElementById('chModalCover');
    const badgesRow = document.getElementById('chModalBadgesRow');
    const titleEl = document.getElementById('chModalTitle');
    const subEl = document.getElementById('chModalSubtitle');
    const latestBtn = document.getElementById('chModalLatestPostBtn');
    const latestRangeEl = document.getElementById('chModalLatestRange');
    const bundleBtn = document.getElementById('chModalBundleFeedBtn');
    const postsListEl = document.getElementById('chModalPostsList');
    if (!modal || !postsListEl) return;

    if (coverEl) coverEl.src = item.image;
    if (titleEl) titleEl.textContent = item.title;
    if (badgesRow) {
        badgesRow.innerHTML = [
            `<span class="ch-meta-badge">${CONTENT_TYPE_LABELS[item.content_type] || 'Манхва'}</span>`,
            `<span class="ch-meta-badge">🎙️ Озвучено глав: ${item.chapters || 0}</span>`
        ].join('');
    }
    if (subEl) {
        subEl.textContent = `Бесплатно: ${item.free_chapters || 0} гл. • По подписке: ${item.paid_chapters || 0} гл.`;
    }
    if (latestBtn) latestBtn.href = appendBoostyUtm(item.latest_post_link || item.link, item.metric_tag);
    if (latestRangeEl) latestRangeEl.textContent = item.latest_range || 'Смотреть';
    if (bundleBtn) bundleBtn.href = appendBoostyUtm(item.link, item.metric_tag);

    const episodes = buildAllEpisodesForItem(item);
    postsListEl.innerHTML = episodes.length > 0
        ? episodes.map(ep => `
            <a href="${appendBoostyUtm(ep.link, item.metric_tag)}" target="_blank" rel="noopener" class="ch-post-item">
                <div class="ch-post-left">
                    <span class="ch-post-title">🎬 ${ep.range} — ${ep.title}</span>
                    <span class="ch-post-sub">📅 ${ep.date}</span>
                </div>
                <span class="ch-post-badge ${ep.is_free ? 'free' : 'paid'}">${ep.is_free ? '🆓 Бесплатно ↗' : '🔒 По подписке ↗'}</span>
            </a>
        `).join('')
        : `<a href="${appendBoostyUtm(item.link, item.metric_tag)}" target="_blank" rel="noopener" class="ch-post-item"><div class="ch-post-left"><span class="ch-post-title">Открыть подборку «${item.title}» на Boosty</span></div><span class="ch-post-badge paid">Открыть ↗</span></a>`;

    modal.classList.add('active');
}

function renderYouTubeVideosInsideModal() {
    const listEl = document.getElementById('ytModalVideosList');
    if (!listEl) return;
    if (!ytVideosCachedList.length) {
        listEl.innerHTML = `<a href="${YT_HANDLE_URL}" target="_blank" rel="noopener" class="modal-option highlight-orange-btn"><div class="option-title">▶️ Перейти на YouTube-канал Lirlkz ↗</div><div class="option-desc">Смотреть все ролики на YouTube</div></a>`;
        return;
    }
    listEl.innerHTML = ytVideosCachedList.slice(0, 6).map(v => `
        <a href="${v.link}" target="_blank" rel="noopener" class="yt-video-card">
            <div class="yt-video-thumb-wrap"><img src="${getVpnFreeImageUrl(v.thumbnail || v.remote_thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>
            <div class="yt-video-title">${v.title || 'Видео Lirlkz'}</div>
            <span class="yt-video-date">📅 ${v.date || 'На канале'}</span>
        </a>
    `).join('');
}

function populateTelegramChannelModal(tgNewsList) {
    if (Array.isArray(tgNewsList) && tgNewsList.length > 0) tgNewsCachedList = tgNewsList.slice(0, 2);
    const listEl = document.getElementById('tgModalNewsList');
    if (!listEl) return;
    if (!tgNewsCachedList.length) {
        listEl.innerHTML = `<a href="${TG_CHANNEL_URL}" target="_blank" rel="noopener" class="modal-option highlight-orange-btn"><div class="option-title">✈️ Открыть @LirlkzManga в Telegram ↗</div><div class="option-desc">Новости и анонсы новых глав</div></a>`;
        return;
    }
    listEl.innerHTML = tgNewsCachedList.map((post, idx) => `
        <button type="button" class="tg-news-card" data-idx="${idx}">
            ${post.image ? `<img src="${getVpnFreeImageUrl(post.image)}" class="tg-news-thumb" loading="lazy" referrerpolicy="no-referrer">` : ''}
            <span class="tg-news-date-badge">📅 ${post.date || 'Новость'}</span>
            <div class="tg-news-snippet">${post.short_text || ''}</div>
        </button>
    `).join('');
    listEl.querySelectorAll('.tg-news-card').forEach(btn => {
        btn.addEventListener('click', () => {
            const post = tgNewsCachedList[Number(btn.dataset.idx)];
            if (post) openTgNewsLightbox(post);
        });
    });
}

function openTgNewsLightbox(post) {
    const modal = document.getElementById('tgNewsLightboxModal');
    const imgWrap = document.getElementById('tgLightboxImageWrap');
    const imgEl = document.getElementById('tgLightboxImg');
    const dateEl = document.getElementById('tgLightboxDate');
    const linkEl = document.getElementById('tgLightboxOriginalLink');
    const textEl = document.getElementById('tgLightboxText');
    if (!modal) return;
    const imgSrc = getVpnFreeImageUrl(post.image || post.remote_image || '');
    if (imgSrc && imgWrap && imgEl) {
        imgEl.src = imgSrc;
        imgWrap.style.display = 'block';
    } else if (imgWrap) {
        imgWrap.style.display = 'none';
    }
    if (dateEl) dateEl.textContent = `📅 ${post.date || 'Новость'}`;
    if (linkEl) linkEl.href = post.link || TG_CHANNEL_URL;
    if (textEl) textEl.textContent = post.full_text || post.short_text || '';
    modal.classList.add('active');
}

function completeDailyQuest(dqId) {
    if (!dailyQuestsState[dqId]) {
        dailyQuestsState[dqId] = true;
        try { localStorage.setItem(DAILY_QUESTS_STATE_KEY, JSON.stringify(dailyQuestsState)); } catch {}
        renderQuestsUI();
    }
}

function renderQuestsUI() {
    const dailyListEl = document.getElementById('dailyQuestsModalList');
    const dailyBadgeEl = document.getElementById('dailyQuestsCounterBadge');
    const headerBadge = document.getElementById('headerQuestProgressBadge');
    const doneCount = Object.values(dailyQuestsState).filter(Boolean).length;
    if (headerBadge) headerBadge.textContent = `${doneCount}/${DAILY_QUESTS_LIST.length}`;
    if (dailyBadgeEl) dailyBadgeEl.textContent = `${doneCount} / ${DAILY_QUESTS_LIST.length}`;
    if (!dailyListEl) return;

    dailyListEl.innerHTML = DAILY_QUESTS_LIST.map(dq => {
        const isDone = Boolean(dailyQuestsState[dq.id]);
        return `
            <button type="button" class="wq-step" data-dq-id="${dq.id}" data-dq-action="${dq.action}">
                <span>${isDone ? '✅' : '☀️'}</span>
                <div class="wq-step-info"><b>${dq.title}</b><span>${dq.desc}</span></div>
            </button>
        `;
    }).join('');

    dailyListEl.querySelectorAll('.wq-step').forEach(btn => {
        btn.addEventListener('click', () => {
            completeDailyQuest(btn.dataset.dqId);
            const qModal = document.getElementById('questsModal');
            if (qModal) qModal.classList.remove('active');
            const act = btn.dataset.dqAction;
            if (act === 'open_any_chapters' && (lastFilteredItems[0] || allItems[0])) {
                openChaptersSelectModal(lastFilteredItems[0] || allItems[0]);
            } else if (act === 'sort:rating_desc') {
                const s = document.getElementById('sortSelect');
                if (s) { s.value = 'rating_desc'; applyFilters(); }
            } else if (act === 'status:completed') {
                selectSpecialStatusFilter('completed');
            }
        });
    });
}

function renderDynamicSubscriptionBanners(tiers) {
    const track = document.getElementById('subBannersTrack');
    if (!track) return;
    const list = Array.isArray(tiers) && tiers.length > 0 ? tiers : [{
        id: '3908979',
        name: 'Подписка на озвучку Lirlkz',
        price: 0,
        url: DEFAULT_TIER_1_URL,
        description: 'Доступ к закрытым главам и ранним релизам озвучки'
    }];

    track.innerHTML = list.map((t, idx) => {
        const priceTxt = t.price > 0 ? `${Number(t.price).toLocaleString('ru-RU')} ₽/мес` : 'На Boosty';
        const href = appendBoostyUtm(t.url || DEFAULT_TIER_1_URL, `sub_tier_${idx + 1}`);
        return `
            <div class="sub-btn-card tier-1">
                <div class="sub-head">
                    <span class="sub-tag">🔥 ПОДПИСКА LIRLKZ</span>
                    <div class="sub-head-right">
                        <span class="sub-price">${priceTxt}</span>
                        <button type="button" class="sub-help-q-btn" onclick="openPaymentGuideModal(event)" title="Как оформить подписку">?</button>
                    </div>
                </div>
                <a href="${href}" target="_blank" rel="noopener" class="sub-btn-main-link" onclick="trackSubConversion({ title: '${(t.name || 'Подписка').replace(/['"]/g, '')}', metric_tag: 'sub_tier_${idx + 1}', level: ${idx + 1} })">
                    <span class="sub-title">🧡 ${t.name || 'Подписка на озвучку'}</span>
                    <span class="sub-desc">${t.description || 'Полный доступ к озвученным главам на Boosty'}</span>
                </a>
            </div>
        `;
    }).join('');
}

function loadBoostyGoalStats() {
    fetch('stats.json?v=' + Date.now())
        .then(r => r.ok ? r.json() : null)
        .then(stats => {
            if (!stats) return;
            statsDataCache = stats;
            if (stats.avatar) {
                const av = document.getElementById('channelAvatar');
                if (av) av.src = stats.avatar;
            }
            if (stats.creator_name) {
                const h1 = document.getElementById('creatorNameHeading');
                if (h1) h1.textContent = stats.creator_name;
            }
            const subsEl = document.getElementById('statSubscribers');
            if (subsEl) subsEl.textContent = stats.subscribers ? Number(stats.subscribers).toLocaleString('ru-RU') : '—';

            if (stats.yt_channel_id) ytChannelIdCached = stats.yt_channel_id;
            if (Array.isArray(stats.tg_news)) populateTelegramChannelModal(stats.tg_news);
            if (Array.isArray(stats.yt_videos)) {
                ytVideosCachedList = stats.yt_videos;
                renderYouTubeVideosInsideModal();
            }
            if (Array.isArray(stats.subscription_tiers)) {
                renderDynamicSubscriptionBanners(stats.subscription_tiers);
            }

            const numEl = document.getElementById('goalNumbers');
            const barEl = document.getElementById('goalProgressBar');
            const descEl = document.getElementById('goalDesc');
            if (Array.isArray(stats.goals) && stats.goals.length > 0) {
                const g = stats.goals[0];
                const pct = Math.min(100, Math.round(((g.current || 0) / (g.target || 1)) * 100));
                if (numEl) numEl.textContent = `${g.current} из ${g.target} (${pct}%)`;
                if (barEl) barEl.style.width = `${pct}%`;
                if (descEl && g.description) descEl.textContent = g.description;
            } else {
                if (numEl) numEl.textContent = `Каталог синхронизирован с Boosty`;
                if (barEl) barEl.style.width = `100%`;
            }
        })
        .catch(() => {});
}

async function loadOverridesAndCatalogData() {
    const ts = Date.now();
    try {
        const [toRes, spRes, vRes, dRes] = await Promise.all([
            fetch('type_overrides.json?v=' + ts),
            fetch('special_titles.json?v=' + ts),
            fetch('votes.json?v=' + ts),
            fetch('data.json?v=' + ts)
        ]);
        if (toRes.ok) {
            const toData = await toRes.json();
            Object.entries(toData || {}).forEach(([k, v]) => {
                if (k !== '_comment' && v) clientTypeOverrides[normalizeTitleForMatch(k)] = String(v).toLowerCase();
            });
        }
        if (spRes.ok) {
            const spData = await spRes.json();
            clientSpecialLists.romance = (spData.romance_sakura || []).map(normalizeTitleForMatch);
            clientSpecialLists.completed = (spData.completed_titles || []).map(normalizeTitleForMatch);
            clientSpecialLists.frozen = (spData.frozen_titles || []).map(normalizeTitleForMatch);
        }
        if (vRes.ok) {
            const vDoc = await vRes.json();
            monthsArchiveData = vDoc.months_archive || {};
            votesFileMap = vDoc.items || {};
        }
        if (dRes.ok) {
            const data = await dRes.json();
            initializeCatalogItems(Array.isArray(data) ? data : []);
        }
    } catch {
        initializeCatalogItems([]);
    }
}

function initializeCatalogItems(data) {
    allItems = data.map((item, idx) => {
        const norm = normalizeTitleForMatch(item.title);
        const cType = clientTypeOverrides[norm] || item.content_type || 'manhwa';
        const ch = Number(item.chapters) || 0;
        const freeCh = Number(item.free_chapters) || 0;
        const paidCh = Math.max(0, ch - freeCh);
        return {
            ...item,
            originalIndex: idx,
            content_type: cType,
            chapters: ch,
            free_chapters: freeCh,
            paid_chapters: paidCh,
            image: item.image || 'https://via.placeholder.com/400x550/131318/f97316?text=Lirlkz',
            metric_tag: item.metric_tag || makeCleanEnglishTag(item.title)
        };
    });

    const bundleCntEl = document.getElementById('statBundlesCount');
    const freeEl = document.getElementById('statFreeChaptersTotal');
    const paidEl = document.getElementById('statPaidChaptersTotal');
    const voicedEl = document.getElementById('statVoicedTotal');
    const cAll = document.getElementById('count-all');
    const cAllMenu = document.getElementById('count-all-menu');
    const cFree = document.getElementById('count-free');
    const cT1 = document.getElementById('count-t1');

    const totalFree = allItems.reduce((a, b) => a + b.free_chapters, 0);
    const totalPaid = allItems.reduce((a, b) => a + b.paid_chapters, 0);
    if (bundleCntEl) bundleCntEl.textContent = allItems.length;
    if (freeEl) freeEl.textContent = `${totalFree.toLocaleString('ru-RU')} гл.`;
    if (paidEl) paidEl.textContent = `${totalPaid.toLocaleString('ru-RU')} гл.`;
    if (voicedEl) voicedEl.textContent = `${(totalFree + totalPaid).toLocaleString('ru-RU')} гл.`;
    if (cAll) cAll.textContent = allItems.length;
    if (cAllMenu) cAllMenu.textContent = allItems.length;
    if (cFree) cFree.textContent = allItems.filter(i => i.has_free || i.free_chapters > 0).length;
    if (cT1) cT1.textContent = allItems.length;

    const cntComp = document.getElementById('count-status-completed');
    const cntRom = document.getElementById('count-status-romance');
    const cntFroz = document.getElementById('count-status-frozen');
    if (cntComp) cntComp.textContent = allItems.filter(i => i.is_completed).length;
    if (cntRom) cntRom.textContent = allItems.filter(i => i.is_romance).length;
    if (cntFroz) cntFroz.textContent = allItems.filter(i => i.is_frozen).length;

    applyFilters();
    renderHighlightsBlocks();
}

function renderHighlightsBlocks() {
    const sec = document.getElementById('highlightsSection');
    const weekBlock = document.getElementById('weekNewBlock');
    const weekList = document.getElementById('weekNewList');
    if (!sec || !weekBlock || !weekList || allItems.length === 0) return;

    const latest = [...allItems].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 8);
    if (latest.length === 0) { sec.style.display = 'none'; return; }

    sec.style.display = 'block';
    weekBlock.style.display = 'block';
    weekList.innerHTML = latest.map(i => `
        <a href="${appendBoostyUtm(i.latest_post_link || i.link, i.metric_tag)}" target="_blank" rel="noopener" class="hl-chip">
            <img src="${i.image}" alt="" loading="lazy" referrerpolicy="no-referrer">
            <div>
                <div class="hl-chip-title">${i.title}</div>
                <span class="hl-chip-sub">🎬 ${i.latest_range || `${i.chapters} гл.`} ↗</span>
            </div>
        </a>
    `).join('');
}

function selectTierLevelOption(val) {
    activeTierTab = val || 'all';
    const allBtn = document.getElementById('allTitlesMainBtn');
    const dropBtn = document.getElementById('tierDropdownBtn');
    const dropMenu = document.getElementById('tierDropdownMenu');
    const label = document.getElementById('tierDropdownBtnLabel');

    if (dropMenu) dropMenu.classList.remove('open');
    if (allBtn) allBtn.classList.toggle('active', activeTierTab === 'all');
    if (dropBtn) {
        dropBtn.classList.remove('active', 'active-free');
        if (activeTierTab === 'free') {
            dropBtn.classList.add('active-free');
            if (label) label.textContent = '🎁 Бесплатные главы';
        } else if (activeTierTab === '1') {
            dropBtn.classList.add('active');
            if (label) label.textContent = '🧡 По подписке';
        } else if (label) {
            label.textContent = '👑 Фильтр по доступу';
        }
    }
    updateResetFiltersBtnVisibility();
    applyFilters();
}

function selectSpecialStatusFilter(val) {
    activeSpecialStatusFilter = val || 'all';
    document.querySelectorAll('#specialStatusFilterRow .status-filter-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.status === activeSpecialStatusFilter);
    });
    updateResetFiltersBtnVisibility();
    applyFilters();
}

function syncGenrePillsUI() {
    const badge = document.getElementById('activeGenreLabelBadge');
    const clearBtn = document.getElementById('clearSelectedTagsBtn');
    document.querySelectorAll('#genrePillsRow .genre-pill').forEach(p => {
        p.classList.toggle('active', selectedGenres.has(p.dataset.genre));
    });
    if (badge) {
        badge.style.display = selectedGenres.size > 0 ? 'inline-block' : 'none';
        badge.textContent = selectedGenres.size === 1 ? Array.from(selectedGenres)[0] : `${selectedGenres.size} тега`;
    }
    if (clearBtn) clearBtn.style.display = selectedGenres.size > 0 ? 'inline-block' : 'none';
    updateResetFiltersBtnVisibility();
}

function updateResetFiltersBtnVisibility() {
    const btn = document.getElementById('resetAllFiltersBtn');
    const q = (document.getElementById('searchInput')?.value || '').trim();
    const has = activeTierTab !== 'all' || selectedGenres.size > 0 || activeContentTypeFilter !== 'all' || activeSpecialStatusFilter !== 'all' || activeLetterFilter !== 'all' || q.length > 0;
    if (btn) btn.style.display = has ? 'inline-flex' : 'none';
}

function applyFilters() {
    const rawSearch = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const sortVal = document.getElementById('sortSelect')?.value || 'update_desc';
    const selGenres = Array.from(selectedGenres);

    let filtered = allItems.filter(item => {
        if (rawSearch) {
            const hay = `${item.title} ${(item.genres || []).join(' ')} ${(item.hidden_tags || []).join(' ')}`.toLowerCase();
            if (!hay.includes(rawSearch)) return false;
        }
        if (activeTierTab === 'free' && !(item.has_free || item.free_chapters > 0)) return false;
        if (activeTierTab === '1' && item.has_free && item.paid_chapters === 0) return false;
        if (activeContentTypeFilter !== 'all' && item.content_type !== activeContentTypeFilter) return false;
        if (activeSpecialStatusFilter === 'completed' && !item.is_completed) return false;
        if (activeSpecialStatusFilter === 'romance' && !item.is_romance) return false;
        if (activeSpecialStatusFilter === 'frozen' && !item.is_frozen) return false;
        if (selGenres.length > 0) {
            const itemTags = [...(item.genres || []), ...(item.hidden_tags || [])];
            if (!selGenres.every(g => itemTags.includes(g))) return false;
        }
        if (activeLetterFilter !== 'all') {
            const ch = String(item.title || '').trim().charAt(0).toUpperCase().replace('Ё', 'Е');
            if (ch !== activeLetterFilter) return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        if (sortVal === 'rating_desc') return (b.rating_score || 0) - (a.rating_score || 0);
        if (sortVal === 'chapters_desc') return (b.chapters || 0) - (a.chapters || 0);
        if (sortVal === 'alpha_asc') return a.title.localeCompare(b.title, 'ru');
        if (sortVal === 'alpha_desc') return b.title.localeCompare(a.title, 'ru');
        return (b.timestamp || 0) - (a.timestamp || 0);
    });

    lastFilteredItems = filtered;
    const totalEl = document.getElementById('totalTitlesCount');
    if (totalEl) totalEl.textContent = `Найдено: ${filtered.length} из ${allItems.length} тайтлов`;

    const catalog = document.getElementById('catalog');
    if (!catalog) return;
    catalog.innerHTML = '';
    renderedCardsCount = 0;

    if (filtered.length === 0) {
        catalog.innerHTML = `<div class="empty-catalog-box"><p>Ничего не найдено по выбранным фильтрам.</p></div>`;
        return;
    }
    appendNextCatalogBatch();
}

function appendNextCatalogBatch() {
    const catalog = document.getElementById('catalog');
    if (!catalog || renderedCardsCount >= lastFilteredItems.length) return;
    const batch = lastFilteredItems.slice(renderedCardsCount, renderedCardsCount + BATCH_LOAD_SIZE);
    const frag = document.createDocumentFragment();
    batch.forEach(item => frag.appendChild(createCatalogCardElement(item)));
    catalog.appendChild(frag);
    renderedCardsCount += batch.length;
}

function createCatalogCardElement(item) {
    const card = document.createElement('div');
    card.className = 'card';
    const voicedCh = Number(item.chapters) || 0;
    const freeCh = Number(item.free_chapters) || 0;
    const paidCh = Number(item.paid_chapters) || 0;
    const miniTags = (item.genres || []).slice(0, 3).map(g => `<span class="card-mini-tag" data-genre="${g}">${READER_TAGS_DICTIONARY[g] || g}</span>`).join('');

    card.innerHTML = `
        <a href="#chapters" class="card-link open-chapters-trigger">
            <img src="${item.image}" alt="${item.title}" loading="lazy" referrerpolicy="no-referrer"
                 onerror="this.src='https://via.placeholder.com/400x550/131318/f97316?text=Lirlkz'">
            <span class="badge-top-left">${CONTENT_TYPE_LABELS[item.content_type] || 'Манхва'}</span>
            <span class="chapters-floating-badge">🎙️ ${voicedCh} гл.</span>
            ${freeCh > 0 ? `<span class="badge-free-access">🆓 Бесплатно: ${freeCh}</span>` : ''}
        </a>
        <div class="card-info">
            <div>
                <a href="#chapters" class="card-title-link open-chapters-trigger"><h3>${item.title}</h3></a>
                <div class="card-tags-row">${miniTags}</div>
            </div>
            <div class="card-bottom-wrap">
                <div class="chapters-breakdown">
                    <span class="stat-pill ${freeCh > 0 ? 'stat-free' : 'stat-no-free'}">🆓 Беспл: <b>${freeCh}</b></span>
                    <span class="stat-pill stat-paid">🔒 Подп: <b>${paidCh}</b></span>
                </div>
                <div class="voiced-total-strip">
                    <span>🎙️ Озвучено: <b>${voicedCh} гл.</b></span>
                    <span class="rating-mini-pill">#${item.rating_rank || 1}</span>
                </div>
                <button type="button" class="watch-feed-link open-chapters-trigger">🎬 Смотреть главы</button>
                <div class="details">
                    <span>Обновлено: <b>${item.last_update || '—'}</b></span>
                    <button type="button" class="share-title-btn" title="Ссылка на тайтл">🔗</button>
                </div>
            </div>
        </div>
    `;

    card.querySelectorAll('.open-chapters-trigger').forEach(el => {
        el.addEventListener('click', e => openChaptersSelectModal(item, e));
    });
    card.querySelectorAll('.card-mini-tag').forEach(el => {
        el.addEventListener('click', e => {
            e.stopPropagation();
            const g = el.dataset.genre;
            if (selectedGenres.has(g)) selectedGenres.delete(g); else selectedGenres.add(g);
            syncGenrePillsUI();
            applyFilters();
        });
    });
    const shareBtn = card.querySelector('.share-title-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', e => {
            e.stopPropagation();
            const url = `${window.location.origin}${window.location.pathname}?manga=${encodeURIComponent(item.metric_tag)}`;
            navigator.clipboard?.writeText(url).then(() => {
                shareBtn.textContent = '✅';
                setTimeout(() => { shareBtn.textContent = '🔗'; }, 1500);
            }).catch(() => {});
        });
    }
    return card;
}

function renderTopForYouStrip() {
    const strip = document.getElementById('forYouTopStrip');
    const grid = document.getElementById('forYouRowGrid');
    const btn = document.getElementById('toggleForYouStripBtn');
    if (!strip || !grid) return;
    if (!isForYouStripOpen) { strip.style.display = 'none'; btn?.classList.remove('active'); return; }
    btn?.classList.add('active');
    const fav = getActivePreferredTags();
    const rec = [...allItems].filter(i => fav.length === 0 || (i.genres || []).some(g => fav.includes(g))).slice(0, 4);
    grid.innerHTML = '';
    rec.forEach(item => grid.appendChild(createCatalogCardElement(item)));
    strip.style.display = 'block';
}

function openLuckySingleRow() {
    const sec = document.getElementById('luckyRowSection');
    const grid = document.getElementById('luckyRowGrid');
    if (!sec || !grid || allItems.length === 0) return;
    const pool = [...allItems].sort(() => Math.random() - 0.5).slice(0, 4);
    grid.innerHTML = '';
    pool.forEach(item => grid.appendChild(createCatalogCardElement(item)));
    sec.style.display = 'block';
}

function setupModal(modalId, openBtnId, closeBtnId) {
    const modal = document.getElementById(modalId);
    const openBtn = openBtnId ? document.getElementById(openBtnId) : null;
    const closeBtn = document.getElementById(closeBtnId);
    if (openBtn && modal) openBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
}

document.addEventListener('DOMContentLoaded', () => {
    initWinterAtmosphere();
    renderQuestsUI();
    loadBoostyGoalStats();
    loadOverridesAndCatalogData();

    // Тема
    const themeBtn = document.getElementById('themeToggleBtn');
    const savedTheme = localStorage.getItem('lirlkz_site_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeBtn) {
        themeBtn.textContent = savedTheme === 'light' ? '☀️ Светлая' : '🌙 Тёмная';
        themeBtn.addEventListener('click', () => {
            const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('lirlkz_site_theme', next);
            themeBtn.textContent = next === 'light' ? '☀️ Светлая' : '🌙 Тёмная';
        });
    }

    // Модалки
    setupModal('guideModal', null, 'closeGuideModal');
    setupModal('questsModal', 'openQuestsModalBtn', 'closeQuestsModal');
    setupModal('chaptersSelectModal', null, 'closeChaptersSelectModal');
    setupModal('tgChannelModal', 'openTgChannelModalBtn', 'closeTgChannelModal');
    setupModal('tgNewsLightboxModal', null, 'closeTgNewsLightbox');
    setupModal('ytChannelModal', 'openYtChannelModalBtn', 'closeYtChannelModal');

    // Дропдаун и табы
    document.getElementById('allTitlesMainBtn')?.addEventListener('click', () => selectTierLevelOption('all'));
    const dropBtn = document.getElementById('tierDropdownBtn');
    const dropMenu = document.getElementById('tierDropdownMenu');
    if (dropBtn && dropMenu) {
        dropBtn.addEventListener('click', e => { e.stopPropagation(); dropMenu.classList.toggle('open'); });
        dropMenu.querySelectorAll('.tier-menu-option').forEach(opt => {
            opt.addEventListener('click', () => selectTierLevelOption(opt.dataset.tier));
        });
        document.addEventListener('click', () => dropMenu.classList.remove('open'));
    }

    // Выдвижная панель тегов и алфавит
    const toggleGenresBtn = document.getElementById('toggleGenresBtn');
    const genresDrawer = document.getElementById('genrePillsDrawer');
    if (toggleGenresBtn && genresDrawer) {
        toggleGenresBtn.addEventListener('click', () => genresDrawer.classList.toggle('open'));
    }

    const alphaRow = document.getElementById('alphaPillsRow');
    if (alphaRow) {
        alphaRow.innerHTML = [`<button type="button" class="alpha-pill active" data-letter="all">Все</button>`,
            ...RUSSIAN_ALPHABET.map(l => `<button type="button" class="alpha-pill" data-letter="${l}">${l}</button>`)].join('');
        alphaRow.querySelectorAll('.alpha-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                activeLetterFilter = btn.dataset.letter;
                alphaRow.querySelectorAll('.alpha-pill').forEach(b => b.classList.toggle('active', b === btn));
                updateResetFiltersBtnVisibility();
                applyFilters();
            });
        });
    }

    document.querySelectorAll('#genrePillsRow .genre-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const g = pill.dataset.genre;
            if (selectedGenres.has(g)) selectedGenres.delete(g); else selectedGenres.add(g);
            syncGenrePillsUI();
            applyFilters();
        });
    });

    document.getElementById('resetAllGenrePill')?.addEventListener('click', () => { selectedGenres.clear(); syncGenrePillsUI(); applyFilters(); });
    document.getElementById('clearSelectedTagsBtn')?.addEventListener('click', () => { selectedGenres.clear(); syncGenrePillsUI(); applyFilters(); });

    document.querySelectorAll('#specialStatusFilterRow .status-filter-pill').forEach(btn => {
        btn.addEventListener('click', () => selectSpecialStatusFilter(btn.dataset.status));
    });

    document.getElementById('resetAllFiltersBtn')?.addEventListener('click', () => {
        selectedGenres.clear();
        activeContentTypeFilter = 'all';
        activeSpecialStatusFilter = 'all';
        activeLetterFilter = 'all';
        const si = document.getElementById('searchInput');
        if (si) si.value = '';
        const cs = document.getElementById('clearSearchBtn');
        if (cs) cs.style.display = 'none';
        const ts = document.getElementById('typeFilterSelect');
        if (ts) ts.value = 'all';
        syncGenrePillsUI();
        selectTierLevelOption('all');
    });

    // Поиск и селекты
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (clearBtn) clearBtn.style.display = searchInput.value ? 'flex' : 'none';
            updateResetFiltersBtnVisibility();
            applyFilters();
        });
    }
    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            updateResetFiltersBtnVisibility();
            applyFilters();
        });
    }

    document.getElementById('typeFilterSelect')?.addEventListener('change', e => {
        activeContentTypeFilter = e.target.value || 'all';
        updateResetFiltersBtnVisibility();
        applyFilters();
    });
    document.getElementById('sortSelect')?.addEventListener('change', applyFilters);

    // Виджеты рекомендаций и случайной подборки
    document.getElementById('toggleForYouStripBtn')?.addEventListener('click', () => { isForYouStripOpen = !isForYouStripOpen; renderTopForYouStrip(); });
    document.getElementById('hideForYouStripBtn')?.addEventListener('click', () => { isForYouStripOpen = false; renderTopForYouStrip(); });
    document.getElementById('randomTitleBtn')?.addEventListener('click', openLuckySingleRow);
    document.getElementById('rerollLuckyBtn')?.addEventListener('click', openLuckySingleRow);
    document.getElementById('closeLuckyRowBtn')?.addEventListener('click', () => {
        const s = document.getElementById('luckyRowSection');
        if (s) s.style.display = 'none';
    });

    // Переключатель плитки/список
    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');
    const cat = document.getElementById('catalog');
    if (gridBtn && listBtn && cat) {
        gridBtn.addEventListener('click', () => { cat.classList.remove('list-view'); gridBtn.classList.add('active'); listBtn.classList.remove('active'); });
        listBtn.addEventListener('click', () => { cat.classList.add('list-view'); listBtn.classList.add('active'); gridBtn.classList.remove('active'); });
    }

    // Бесконечная прокрутка
    const sentinel = document.getElementById('infiniteScrollSentinel');
    if (sentinel && typeof IntersectionObserver !== 'undefined') {
        infiniteScrollObserver = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting) && renderedCardsCount < lastFilteredItems.length) {
                appendNextCatalogBatch();
            }
        }, { rootMargin: '400px 0px' });
        infiniteScrollObserver.observe(sentinel);
    }

    // Туториал
    const tutOverlay = document.getElementById('catTutorialOverlay');
    const tutSteps = [
        { title: '1/3 • Ссылки на каналы и витрину', desc: 'В шапке собраны ссылки на Boosty, витрину бандлов, YouTube @LirlkzManga и Telegram @LirlkzManga.' },
        { title: '2/3 • Подписка и доступ', desc: 'Оформите подписку на Boosty, чтобы открывать закрытые главы и поддерживать озвучку.' },
        { title: '3/3 • Поиск и просмотр глав', desc: 'Нажмите «🎬 Смотреть главы» на любой карточке, чтобы увидеть список выпусков и перейти к нужному.' }
    ];
    let tutIdx = 0;
    const renderTut = () => {
        const s = tutSteps[tutIdx];
        document.getElementById('catTutStepBadge').textContent = `Шаг ${tutIdx + 1} из ${tutSteps.length}`;
        document.getElementById('catTutTitle').textContent = s.title;
        document.getElementById('catTutDesc').textContent = s.desc;
        document.getElementById('catTutDots').innerHTML = tutSteps.map((_, i) => `<span class="tut-dot ${i === tutIdx ? 'active' : ''}"></span>`).join('');
        document.getElementById('catTutPrevBtn').style.display = tutIdx > 0 ? 'inline-block' : 'none';
        document.getElementById('catTutNextBtn').textContent = tutIdx === tutSteps.length - 1 ? 'Готово' : 'Дальше →';
    };
    const closeTut = () => {
        if (tutOverlay) tutOverlay.style.display = 'none';
        try { localStorage.setItem(TUTORIAL_DONE_STORAGE_KEY, '1'); } catch {}
    };
    document.getElementById('startCatTutorialBtn')?.addEventListener('click', () => { tutIdx = 0; renderTut(); if (tutOverlay) tutOverlay.style.display = 'block'; });
    document.getElementById('catTutSkipBtn')?.addEventListener('click', closeTut);
    document.getElementById('catTutorialBackdrop')?.addEventListener('click', closeTut);
    document.getElementById('catTutPrevBtn')?.addEventListener('click', () => { if (tutIdx > 0) { tutIdx--; renderTut(); } });
    document.getElementById('catTutNextBtn')?.addEventListener('click', () => { if (tutIdx < tutSteps.length - 1) { tutIdx++; renderTut(); } else closeTut(); });
});
