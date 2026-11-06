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

// Отправка целей в Яндекс.Метрику
function trackGoal(goalName, payload = {}) {
    try {
        if (typeof window.ym === 'function') {
            window.ym(YM_ID, 'reachGoal', goalName, payload);

            if (payload && payload.metric_tag) {
                window.ym(YM_ID, 'reachGoal', payload.metric_tag, {
                    title: payload.title,
                    action: goalName,
                    level: payload.level
                });
                window.ym(YM_ID, 'params', {
                    Нажатия_на_тайтлы: {
                        [payload.metric_tag]: {
                            Название: payload.title || payload.metric_tag,
                            Действие: goalName,
                            Уровень: payload.level || 1
                        }
                    }
                });
            }
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
            localStorage.setItem('taka_catalog_backup_cache', JSON.stringify(data));
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
        const subLink = levelNum === 2
            ? 'https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link'
            : 'https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link';

        // Защита от старого бага, когда 3 тегам приписывалось 300 чужих постов и 316 глав
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

        const paidChapters = typeof item.paid_chapters === 'number'
            ? Math.max(0, totalChapters - freeChapters)
            : Math.max(0, totalChapters - freeChapters);

        const hasFree = Boolean(item.has_free || freeChapters > 0);
        const freeText = hasFree
            ? (item.free_text || `🆓 Бесплатно: ${freeChapters} гл.`)
            : '';

        const metricTag = item.metric_tag || makeClientMetricTag(cleanTitle);
        const latestRange = totalChapters > 0
            ? (item.latest_range && !String(item.id).startsWith('tag_') ? item.latest_range : `1-${totalChapters} гл.`)
            : 'Все главы в ленте';

        const cachedVotes = typeof votesCache[item.id] === 'number' ? votesCache[item.id] : 0;

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
            votes: cachedVotes
        };
    });

    updateTabCounters();
    renderHighlightsBlocks();
    applyFilters();
    syncVotesInBatches();
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
        .filter(i => i.timestamp && (maxTs - i.timestamp) <= sevenDaysSec && i.chapters > 0)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 6);

    const newMonthTitles = [...allItems]
        .filter(i => {
            const created = i.created_ts || i.timestamp || 0;
            const isCreatedRecently = created > 0 && (maxTs - created) <= thirtyDaysSec;
            return isCreatedRecently && i.chapters > 0;
        })
        .sort((a, b) => (b.created_ts || b.timestamp || 0) - (a.created_ts || a.timestamp || 0))
        .slice(0, 6);

    let hasAny = false;

    if (recentWeekReleases.length > 0) {
        hasAny = true;
        weekBlock.style.display = 'block';
        weekList.innerHTML = recentWeekReleases.map(i => {
            const safeTitle = i.title.replace(/'/g, '');
            const rangeBadge = i.latest_range || `${i.chapters} гл.`;
            return `
                <a href="${appendBoostyUtm(i.link, i.metric_tag)}" target="_blank" class="hl-chip ${i.tier_level === 2 ? 'hl-gold' : ''}"
                   onclick="trackGoal('click_week_new', { title: '${safeTitle}', metric_tag: '${i.metric_tag}', level: ${i.tier_level} })">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" referrerpolicy="no-referrer">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span style="font-size:11px;color:var(--accent-amber);font-weight:700;">🔥 Вышли: ${rangeBadge}</span>
                    </div>
                </a>
            `;
        }).join('');
    } else {
        weekBlock.style.display = 'none';
    }

    if (newMonthTitles.length > 0) {
        hasAny = true;
        monthBlock.style.display = 'block';
        monthList.innerHTML = newMonthTitles.map(i => {
            const safeTitle = i.title.replace(/'/g, '');
            return `
                <a href="${appendBoostyUtm(i.link, i.metric_tag)}" target="_blank" class="hl-chip ${i.tier_level === 2 ? 'hl-gold' : ''}"
                   onclick="trackGoal('click_month_new_title', { title: '${safeTitle}', metric_tag: '${i.metric_tag}', level: ${i.tier_level} })">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" referrerpolicy="no-referrer">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span style="font-size:11px;color:#ffd166;font-weight:700;">👑 Новый тайтл • 1-${i.chapters} гл.</span>
                    </div>
                </a>
            `;
        }).join('');
    } else {
        monthBlock.style.display = 'none';
    }

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
        <div class="suggestion-item" data-title="${item.title}">
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
                applyFilters();
            }
        });
    });
}

function hasUserVoted(id) {
    return localStorage.getItem(`voted_${CURRENT_MONTH_KEY}_${id}`) === 'true';
}

function saveVotesCache() {
    try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(votesCache));
    } catch (e) {}
}

async function syncVotesInBatches() {
    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        try {
            const res = await fetch(`https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/title_${item.id}/`);
            if (res.ok) {
                const data = await res.json();
                if (typeof data.count === 'number') {
                    item.votes = Math.max(item.votes, data.count);
                    votesCache[item.id] = item.votes;
                    const countEl = document.getElementById('vote-count-' + item.id);
                    if (countEl) countEl.textContent = item.votes;
                }
            }
        } catch (e) {}
        if (i % 5 === 0) {
            await new Promise(r => setTimeout(r, 120));
        }
    }
    saveVotesCache();
}

function openProdaPopup(item) {
    const modal = document.getElementById('prodaModal');
    const textEl = document.getElementById('prodaModalText');
    const boostyBtn = document.getElementById('prodaBoostyBtn');
    const tgBtn = document.getElementById('prodaTgBtn');
    if (!modal) return;

    if (textEl) {
        textEl.textContent = `Хотите ускорить выход следующих глав «${item.title}»? Поддержите проект на Boosty или закажите озвучку напрямую! 🐾`;
    }
    if (boostyBtn) {
        boostyBtn.href = appendBoostyUtm(item.sub_link, item.metric_tag);
        boostyBtn.onclick = () => trackGoal('click_subscribe', { title: item.title, metric_tag: item.metric_tag, level: item.tier_level });
    }
    if (tgBtn) {
        const msg = encodeURIComponent(`Привет! Хочу заказать/ускорить выход проды тайтла «${item.title}»`);
        tgBtn.href = `https://t.me/TAKA_YT?text=${msg}`;
        tgBtn.onclick = () => trackGoal('click_telegram', { title: item.title, metric_tag: item.metric_tag, level: item.tier_level });
    }
    modal.classList.add('active');
}

function handleVote(item, btnElement) {
    const id = item.id;
    trackGoal('click_want_proda', { title: item.title, metric_tag: item.metric_tag, level: item.tier_level });

    if (!hasUserVoted(id)) {
        localStorage.setItem(`voted_${CURRENT_MONTH_KEY}_${id}`, 'true');
        btnElement.classList.add('voted');
        const labelEl = btnElement.querySelector('.vote-label');
        const countEl = document.getElementById('vote-count-' + id);
        if (labelEl) labelEl.textContent = '🐾 Жду проду!';

        const newCount = (item.votes || 0) + 1;
        item.votes = newCount;
        votesCache[id] = newCount;
        saveVotesCache();
        if (countEl) countEl.textContent = newCount;

        fetch(`https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/title_${id}/up`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && typeof data.count === 'number') {
                    item.votes = Math.max(newCount, data.count);
                    votesCache[id] = item.votes;
                    saveVotesCache();
                    if (countEl) countEl.textContent = item.votes;
                }
            })
            .catch(() => {});
    }

    openProdaPopup(item);
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const sortValue = document.getElementById('sortSelect').value;

    let filtered = allItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchText);
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
            return (b.votes || 0) - (a.votes || 0);
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
        card.setAttribute('data-title-id', item.title);
        card.setAttribute('data-level', item.tier_level);

        const voted = hasUserVoted(item.id);
        const utmCardLink = appendBoostyUtm(item.link, item.metric_tag);
        const utmSubLink = appendBoostyUtm(item.sub_link, item.metric_tag);
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
            <a href="${utmCardLink}" target="_blank" class="card-link">
                <img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
                     onerror="this.src='https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка'">
                <span class="badge-top-left ${isLicense ? 'license-gold-badge' : ''}">
                    ${isLicense ? '👑 Лицензия Boosty' : '🔒 Эксклюзив Boosty'}
                </span>
                <span class="chapters-floating-badge">Всего: ${totalChText}</span>
                ${hasFree ? `<span class="badge-free-access">${item.free_text || `🎁 Бесплатно: ${freeChCount} гл.`}</span>` : ''}
                ${isNewRelease ? `<span class="badge-hot-new">🔥 ${item.latest_range || 'НОВИНКА'}</span>` : ''}
            </a>
            <div class="card-info">
                <a href="${utmCardLink}" target="_blank" class="card-title-link">
                    <h3>${item.title}</h3>
                </a>

                <div class="card-bottom-wrap">
                    <!-- Наглядная плашка сколько бесплатных и платных глав -->
                    <div class="chapters-breakdown">
                        ${freePillHtml}
                        ${paidPillHtml}
                    </div>

                    <span class="tier-neutral-pill ${isLicense ? 'tier-pill-license' : ''}">${item.tier}</span>

                    <div class="action-buttons-row">
                        <a href="${utmCardLink}" target="_blank" class="watch-feed-link">
                            ▶ Смотреть
                        </a>
                        <a href="${utmSubLink}" target="_blank" class="buy-tier-link ${isLicense ? 'buy-license-gold' : ''}">
                            Подписаться
                        </a>
                    </div>

                    <div class="details">
                        <span>Озвучено: <b>${totalChText}</b></span>
                        <span>Обновлено: <b>${item.last_update}</b></span>
                        <button type="button" class="report-broken-btn" title="Сообщить о неработающей ссылке">⚠️</button>
                    </div>

                    <button type="button" class="vote-btn ${voted ? 'voted' : ''}" data-id="${item.id}">
                        <span class="vote-label">${voted ? '🐾 Жду проду!' : '🔥 Хочу проду'}</span>
                        <span class="vote-count" id="vote-count-${item.id}">${item.votes || 0}</span>
                    </button>
                </div>
            </div>
        `;

        card.querySelectorAll('.card-link, .card-title-link, .watch-feed-link').forEach(link => {
            link.addEventListener('click', () => {
                trackGoal('click_title', {
                    title: item.title,
                    metric_tag: item.metric_tag,
                    level: item.tier_level
                });
            });
        });

        const buyLink = card.querySelector('.buy-tier-link');
        if (buyLink) {
            buyLink.addEventListener('click', () => {
                trackGoal('click_subscribe', {
                    title: item.title,
                    metric_tag: item.metric_tag,
                    level: item.tier_level
                });
            });
        }

        const reportBtn = card.querySelector('.report-broken-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                trackGoal('report_broken_link', {
                    title: item.title,
                    metric_tag: item.metric_tag,
                    level: item.tier_level
                });
                const text = encodeURIComponent(`⚠️ Привет! На витрине не работает ссылка у тайтла «${item.title}» (${item.link})`);
                window.open(`https://t.me/TAKA_YT?text=${text}`, '_blank');
            });
        }

        const voteBtn = card.querySelector('.vote-btn');
        voteBtn.addEventListener('click', () => handleVote(item, voteBtn));

        catalog.appendChild(card);
    });
}
