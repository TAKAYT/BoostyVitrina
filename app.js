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

function appendBoostyUtm(url, titleName) {
    if (!url) return 'https://boosty.to/darktaka?from=site_catalog';
    try {
        const slug = String(titleName || 'catalog')
            .toLowerCase()
            .replace(/[^a-zа-я0-9]+/gi, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 32);
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}from=site_catalog&title=${encodeURIComponent(slug)}`;
    } catch (e) {
        return url;
    }
}

function trackGoal(goalName, payload = {}) {
    try {
        if (typeof window.ym === 'function') {
            window.ym(YM_ID, 'reachGoal', goalName, payload);
        }
    } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initViewSwitcher();

    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const resetInfoEl = document.getElementById('voteResetInfo');
    if (resetInfoEl) {
        resetInfoEl.textContent = `🐱‍❄️ Голосование за проду на ${monthNames[now.getMonth()]} ${now.getFullYear()} (сброс 1-го числа)`;
    }

    setupModal('orderModal', 'openOrderModal', 'closeOrderModal', 'open_order_modal');
    setupModal('guideModal', 'openGuideModal', 'closeGuideModal', 'open_payment_guide');
    setupModal('prodaModal', null, 'closeProdaModal', null);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.action-buttons-row')) {
            document.querySelectorAll('.chapters-dropdown.open').forEach(el => el.classList.remove('open'));
        }
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
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const sug = document.getElementById('searchSuggestions');
            if (searchInput.value.trim().length > 0 && sug) {
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

    document.getElementById('sortSelect').addEventListener('change', applyFilters);
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
        let feedLink = item.link || '';
        if (feedLink.includes('view=grid')) {
            feedLink = feedLink.replace('view=grid', 'view=feed');
        } else if (!feedLink.includes('view=feed') && !feedLink.includes('postsTagsIds')) {
            feedLink += (feedLink.includes('?') ? '&' : '?') + 'view=feed';
        }

        let levelNum = item.tier_level === 2 ? 2 : 1;
        if (item.tier && item.tier.includes('Основной')) levelNum = 2;

        const tierText = levelNum === 2 ? "Основной уровень 2 ур. 500 ₽" : "Базовый уровень 1 ур. 250 ₽";
        const subLink = levelNum === 2
            ? 'https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link'
            : 'https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link';

        const ch = item.chapters || 0;
        let postsList = Array.isArray(item.posts_list) && item.posts_list.length > 0 ? item.posts_list : [];
        if (postsList.length === 0) {
            const shortLvl = levelNum === 2 ? 'Основной 2 ур.' : 'Базовый 1 ур.';
            if (ch > 0) {
                postsList = [
                    { label: `1–${ch} главы (${shortLvl})`, date: item.last_update || '', url: feedLink }
                ];
            } else {
                postsList = [
                    { label: `Открыть ленту глав (${shortLvl})`, date: item.last_update || '', url: feedLink }
                ];
            }
        }

        const cachedVotes = typeof votesCache[item.id] === 'number' ? votesCache[item.id] : 0;

        return {
            ...item,
            tier: tierText,
            tier_level: levelNum,
            link: feedLink,
            sub_link: subLink,
            posts_count: item.posts_count || postsList.length || 1,
            posts_list: postsList,
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
    const c1 = document.getElementById('count-t1');
    const c2 = document.getElementById('count-t2');

    if (cAll) cAll.textContent = allItems.length;
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

    const nowSec = Math.floor(Date.now() / 1000);
    const fiveDaysSec = 5 * 86400;
    const thirtyDaysSec = 30 * 86400;

    const recentNew = allItems
        .filter(i => i.timestamp && (nowSec - i.timestamp) <= fiveDaysSec)
        .slice(0, 4);

    const monthHits = [...allItems]
        .filter(i => !i.timestamp || (nowSec - i.timestamp) <= thirtyDaysSec)
        .sort((a, b) => ((b.votes || 0) * 10 + (b.chapters || 0)) - ((a.votes || 0) * 10 + (a.chapters || 0)))
        .slice(0, 4);

    let hasAny = false;

    if (recentNew.length > 0) {
        hasAny = true;
        weekBlock.style.display = 'block';
        weekList.innerHTML = recentNew.map(i => `
            <a href="${appendBoostyUtm(i.link, i.title)}" target="_blank" class="hl-chip" onclick="trackGoal('click_chapters', { title: '${i.title.replace(/'/g, '')}', level: ${i.tier_level} })">
                <img src="${i.image}" alt="${i.title}" loading="lazy" referrerpolicy="no-referrer">
                <div>
                    <div class="hl-chip-title">${i.title}</div>
                    <span style="font-size:10.5px;color:var(--accent-amber);">🔥 Новинка • ${i.chapters} гл.</span>
                </div>
            </a>
        `).join('');
    } else {
        weekBlock.style.display = 'none';
    }

    if (monthHits.length > 0) {
        hasAny = true;
        monthBlock.style.display = 'block';
        monthList.innerHTML = monthHits.map(i => `
            <a href="${appendBoostyUtm(i.link, i.title)}" target="_blank" class="hl-chip" onclick="trackGoal('click_chapters', { title: '${i.title.replace(/'/g, '')}', level: ${i.tier_level} })">
                <img src="${i.image}" alt="${i.title}" loading="lazy" referrerpolicy="no-referrer">
                <div>
                    <div class="hl-chip-title">${i.title}</div>
                    <span style="font-size:10.5px;color:var(--accent-amber);">🐱‍❄️ Хит • ${i.chapters} гл.</span>
                </div>
            </a>
        `).join('');
    } else {
        monthBlock.style.display = 'none';
    }

    section.style.display = hasAny ? 'block' : 'none';
}

function renderSearchSuggestions() {
    const listEl = document.getElementById('suggestionsList');
    const searchInput = document.getElementById('searchInput');
    if (!listEl || allItems.length === 0) return;

    const topThree = [...allItems]
        .sort((a, b) => ((b.votes || 0) * 15 + (b.chapters || 0)) - ((a.votes || 0) * 15 + (a.chapters || 0)))
        .slice(0, 3);

    listEl.innerHTML = topThree.map(item => `
        <div class="suggestion-item" data-title="${item.title}">
            <span>🐱‍❄️ ${item.title}</span>
            <span style="color:var(--text-muted);font-size:11.5px;">${item.chapters} гл.</span>
        </div>
    `).join('');

    listEl.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = el.dataset.title;
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
        textEl.textContent = `Хотите ускорить выход следующих глав «${item.title}»? Поддержите проект на Boosty или закажите озвучку напрямую! 🐱‍❄️`;
    }
    if (boostyBtn) {
        boostyBtn.href = appendBoostyUtm(item.sub_link, item.title);
        boostyBtn.onclick = () => trackGoal('click_subscribe', { title: item.title, level: item.tier_level });
    }
    if (tgBtn) {
        const msg = encodeURIComponent(`Привет! Хочу заказать/ускорить выход проды тайтла «${item.title}»`);
        tgBtn.href = `https://t.me/TAKA_YT?text=${msg}`;
        tgBtn.onclick = () => trackGoal('click_telegram', { title: item.title, level: item.tier_level });
    }
    modal.classList.add('active');
}

function handleVote(item, btnElement) {
    const id = item.id;
    trackGoal('click_want_proda', { title: item.title, level: item.tier_level });

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
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const sortValue = document.getElementById('sortSelect').value;

    let filtered = allItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchText);
        const matchesTier = activeTierTab === 'all' || String(item.tier_level) === String(activeTierTab);
        return matchesSearch && matchesTier;
    });

    filtered.sort((a, b) => {
        if (sortValue === 'update_desc') {
            return (b.timestamp || 0) - (a.timestamp || 0);
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
        totalEl.textContent = `🐱‍❄️ Показано тайтлов: ${filtered.length} из ${allItems.length}`;
    }

    renderCatalog(filtered);
}

function renderCatalog(items) {
    const catalog = document.getElementById('catalog');
    catalog.innerHTML = '';
    
    if (items.length === 0) {
        catalog.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; color:var(--text-muted); padding: 40px 0;">По вашему запросу ничего не найдено 🐾</p>';
        return;
    }

    const nowSec = Math.floor(Date.now() / 1000);

    items.forEach(item => {
        const card = document.createElement('div');
        const frameClass = `tier-frame-${item.tier_level || 1}`;
        card.className = `card ${frameClass}`;
        card.setAttribute('data-title-id', item.title);
        card.setAttribute('data-level', item.tier_level);

        const voted = hasUserVoted(item.id);
        const utmCardLink = appendBoostyUtm(item.link, item.title);
        const utmSubLink = appendBoostyUtm(item.sub_link, item.title);
        const isNewRelease = item.timestamp && (nowSec - item.timestamp) <= (5 * 86400);

        const postsHtml = (item.posts_list || []).map(p => `
            <a href="${appendBoostyUtm(p.url, item.title)}" target="_blank" class="chapter-post-item" data-chapter="${p.label}">
                <span>▶ ${p.label}</span>
                <span style="font-size:10px;color:var(--text-muted);">${p.date || ''}</span>
            </a>
        `).join('');

        card.innerHTML = `
            <a href="${utmCardLink}" target="_blank" class="card-link">
                <img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
                <span class="badge-top-left">${item.tier_level === 2 ? '💎 Лицензия Boosty' : '🔒 Эксклюзив Boosty'}</span>
                <span class="chapters-floating-badge">Глав: ${item.chapters}</span>
                ${item.has_free ? `<span class="badge-free-access">${item.free_text || '🔥 1-10 главы бесплатно'}</span>` : ''}
                ${isNewRelease ? `<span class="badge-hot-new">🔥 НОВИНКА</span>` : ''}
            </a>
            <div class="card-info">
                <a href="${utmCardLink}" target="_blank" class="card-title-link">
                    <h3>${item.title}</h3>
                </a>
                <div>
                    <span class="tier-neutral-pill">${item.tier}</span>
                    
                    <div class="action-buttons-row">
                        <a href="${utmSubLink}" target="_blank" class="buy-tier-link">Подписаться</a>
                        <button type="button" class="chapters-Select-btn">
                            Главы (${item.posts_count}) ▾
                        </button>
                        <div class="chapters-dropdown">
                            <div class="dropdown-head">
                                <span>Посты в ленте (${item.posts_count})</span>
                                <a href="${utmCardLink}" target="_blank" style="color:var(--accent-orange);text-decoration:none;">Вся лента ↗</a>
                            </div>
                            ${postsHtml}
                        </div>
                    </div>

                    <div class="details">
                        <span>Озвучено: <b>${item.chapters} гл.</b></span>
                        <span>Пост: <b>${item.last_update}</b></span>
                        <button type="button" class="report-broken-btn" title="Сообщить о неработающей ссылке">⚠️</button>
                    </div>
                    <button type="button" class="vote-btn ${voted ? 'voted' : ''}" data-id="${item.id}">
                        <span class="vote-label">${voted ? '🐾 Жду проду!' : '🔥 Хочу проду'}</span>
                        <span class="vote-count" id="vote-count-${item.id}">${item.votes || 0}</span>
                    </button>
                </div>
            </div>
        `;

        const chBtn = card.querySelector('.chapters-Select-btn');
        const dropdown = card.querySelector('.chapters-dropdown');
        if (chBtn && dropdown) {
            chBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('open');
                document.querySelectorAll('.chapters-dropdown.open').forEach(el => el.classList.remove('open'));
                if (!isOpen) {
                    dropdown.classList.add('open');
                    trackGoal('click_chapters', { title: item.title, level: item.tier_level });
                }
            });
        }

        card.querySelectorAll('.chapter-post-item').forEach(chLink => {
            chLink.addEventListener('click', () => {
                trackGoal('click_chapters', { title: item.title, level: item.tier_level, range: chLink.dataset.chapter });
            });
        });

        card.querySelectorAll('.card-link, .card-title-link').forEach(link => {
            link.addEventListener('click', () => {
                trackGoal('click_chapters', { title: item.title, level: item.tier_level });
            });
        });

        const buyLink = card.querySelector('.buy-tier-link');
        if (buyLink) {
            buyLink.addEventListener('click', () => {
                trackGoal('click_subscribe', { title: item.title, level: item.tier_level });
            });
        }

        const reportBtn = card.querySelector('.report-broken-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                trackGoal('report_broken_link', { title: item.title, level: item.tier_level });
                const text = encodeURIComponent(`⚠️ Привет! На витрине не работает ссылка у тайтла «${item.title}» (${item.link})`);
                window.open(`https://t.me/TAKA_YT?text=${text}`, '_blank');
            });
        }

        const voteBtn = card.querySelector('.vote-btn');
        voteBtn.addEventListener('click', () => handleVote(item, voteBtn));

        catalog.appendChild(card);
    });
}
