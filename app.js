let allItems = [];
let activeTierTab = 'all';
const YM_ID = 114099972;

const now = new Date();
const CURRENT_MONTH_KEY = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
const VOTE_NAMESPACE = `takayt_vitrina_${CURRENT_MONTH_KEY}`;
const LOCAL_CACHE_KEY = `taka_votes_cache_${CURRENT_MONTH_KEY}`;

let votesCache = {};
try {
    votesCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
} catch (e) {
    votesCache = {};
}

// Чистый ключ для API голосования (без дефисов и спецсимволов, чтобы CounterAPI не выдавал ошибку)
function getSafeVoteKey(id) {
    return 'v_' + String(id || 'unknown').replace(/[^a-zA-Z0-9]/g, '');
}

// Генерация уникального тега тайтла для Метрики
function makeClientMetricTag(title) {
    const map = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
        'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
        'х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
    };
    const slug = String(title || 'item')
        .toLowerCase()
        .split('')
        .map(c => map[c] !== undefined ? map[c] : (/[a-z0-9]/.test(c) ? c : '_'))
        .join('')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40);
    return `title_${slug || 'unknown'}`;
}

// Очистка URL обложки от старого ?croped=1&mh=550&mw=400, чтобы текст на картинках не сплющивался
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

function appendBoostyUtm(url, metricTag) {
    if (!url) return 'https://boosty.to/darktaka?from=site_catalog';
    try {
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}from=site_catalog&title=${encodeURIComponent(metricTag || 'catalog')}`;
    } catch (e) {
        return url;
    }
}

// Отправка целей и параметров в Яндекс.Метрику
function trackGoal(goalName, payload = {}) {
    try {
        if (typeof window.ym === 'function') {
            const cleanTitle = payload.title || payload.metric_tag || 'Неизвестный тайтл';
            const metricTag = payload.metric_tag || makeClientMetricTag(cleanTitle);
            const levelLabel = payload.level ? `${payload.level} уровень` : 'Общее';

            // 1. Общая цель действия (click_cover_image, click_title, click_want_proda и т.д.)
            window.ym(YM_ID, 'reachGoal', goalName, {
                title: cleanTitle,
                metric_tag: metricTag,
                level: payload.level || 1
            });

            // 2. Индивидуальная цель тайтла по его тегу
            if (payload.metric_tag) {
                window.ym(YM_ID, 'reachGoal', metricTag, {
                    title: cleanTitle,
                    action: goalName,
                    level: payload.level || 1
                });
            }

            // 3. Параметры визитов для удобного просмотра статистики по названиям тайтлов в Метрике
            const visitParams = {
                Нажатия_на_тайтлы: {
                    [cleanTitle]: {
                        Действие: goalName,
                        Тег: metricTag,
                        Уровень: levelLabel
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
                    [cleanTitle]: levelLabel
                };
            }

            if (goalName === 'click_want_proda') {
                visitParams['Голоса_Хочу_проду'] = {
                    [cleanTitle]: levelLabel
                };
            }

            window.ym(YM_ID, 'params', visitParams);
        }
    } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initViewSwitcher();

    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const resetInfoEl = document.getElementById('voteResetInfo');
    if (resetInfoEl) {
        resetInfoEl.textContent = `🐾 Голосование за проду на ${monthNames[now.getMonth()]} ${now.getFullYear()} (сброс 1-го числа)`;
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
        sortSelect.addEventListener('change', applyFilters);
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
