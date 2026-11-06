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

function detectTrafficSource() {
    const ref = (document.referrer || '').toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const utmSource = (params.get('utm_source') || params.get('from') || '').toLowerCase();

    if (utmSource.includes('tg') || utmSource.includes('telegram') || ref.includes('t.me') || ref.includes('telegram')) {
        return 'Telegram';
    }
    if (utmSource.includes('yt') || utmSource.includes('youtube') || ref.includes('youtube.com') || ref.includes('youtu.be')) {
        return 'YouTube';
    }
    return 'Прямой переход';
}

function trackEvent(goalName, extraParams = {}) {
    try {
        if (typeof window.ym === 'function') {
            const source = detectTrafficSource();
            window.ym(YM_ID, 'reachGoal', goalName, {
                Источник: source,
                ...extraParams
            });
            window.ym(YM_ID, 'params', {
                [goalName]: extraParams.Тайтл || extraParams.Глава || 'Клик',
                Источник_трафика: source
            });
        }
    } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const resetInfoEl = document.getElementById('voteResetInfo');
    if (resetInfoEl) {
        resetInfoEl.textContent = `🍁 Голосование за проду на ${monthNames[now.getMonth()]} ${now.getFullYear()} (сброс 1-го числа)`;
    }

    // Модальное окно заказа
    setupModal('orderModal', 'openOrderModal', 'closeOrderModal', 'open_order_modal');
    // Модальное окно альтернативной оплаты (Украина / ЕС / Крипта)
    setupModal('cryptoModal', 'openCryptoModal', 'closeCryptoModal', 'open_crypto_modal');

    // Закрытие выпадающих списков глав при клике мимо
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.action-buttons-row')) {
            document.querySelectorAll('.chapters-dropdown.open').forEach(el => el.classList.remove('open'));
        }
    });

    // Переключение вкладок уровней подписки (1 ур / 2 ур)
    document.querySelectorAll('.tier-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tier-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTierTab = tab.dataset.tier;
            applyFilters();
        });
    });

    loadBoostyGoalStats();

    fetch('data.json?v=' + Date.now())
        .then(response => response.json())
        .then(data => {
            allItems = data.map((item, index) => {
                let feedLink = item.link || '';
                if (feedLink.includes('view=grid')) {
                    feedLink = feedLink.replace('view=grid', 'view=feed');
                } else if (!feedLink.includes('view=feed')) {
                    feedLink += (feedLink.includes('?') ? '&' : '?') + 'view=feed';
                }

                let levelNum = item.tier_level || 1;
                if (item.tier && item.tier.includes('Основной')) levelNum = 2;
                if (item.tier && item.tier.includes('Доп')) levelNum = 3;

                let subLink = item.sub_link || 'https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link';
                if (levelNum === 2) {
                    subLink = 'https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link';
                } else if (levelNum === 3) {
                    subLink = 'https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link';
                }

                // Если список конкретных глав еще не сформирован парсером, генерируем быстрые ссылки на части
                let postsList = Array.isArray(item.posts_list) && item.posts_list.length > 0 ? item.posts_list : [];
                if (postsList.length === 0) {
                    const ch = item.chapters || 0;
                    if (ch > 0) {
                        postsList = [
                            { label: `Главы 1–${ch} (Вся лента)`, date: item.last_update || '', url: feedLink }
                        ];
                    } else {
                        postsList = [
                            { label: `Открыть ленту глав`, date: item.last_update || '', url: feedLink }
                        ];
                    }
                }

                const cachedVotes = typeof votesCache[item.id] === 'number' ? votesCache[item.id] : 0;

                return {
                    ...item,
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
            applyFilters();
            syncVotesInBatches();
        })
        .catch(error => console.error('Ошибка загрузки каталога:', error));

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);
});

function setupModal(modalId, openBtnId, closeBtnId, eventName) {
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = document.getElementById(closeBtnId);
    if (openBtn && modal && closeBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            trackEvent(eventName);
        });
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
}

function updateTabCounters() {
    const cAll = document.getElementById('count-all');
    const c1 = document.getElementById('count-t1');
    const c2 = document.getElementById('count-t2');
    const c3 = document.getElementById('count-t3');

    if (cAll) cAll.textContent = allItems.length;
    if (c1) c1.textContent = allItems.filter(i => i.tier_level === 1).length;
    if (c2) c2.textContent = allItems.filter(i => i.tier_level === 2).length;
    if (c3) c3.textContent = allItems.filter(i => i.tier_level === 3).length;
}

function loadBoostyGoalStats() {
    fetch('stats.json?v=' + Date.now())
        .then(res => res.ok ? res.json() : null)
        .then(stats => {
            if (!stats) return;
            const subsEl = document.getElementById('statSubscribers');
            const postsEl = document.getElementById('statPosts');
            if (subsEl && stats.subscribers) subsEl.textContent = Number(stats.subscribers).toLocaleString('ru-RU');
            if (postsEl && stats.posts) postsEl.textContent = Number(stats.posts).toLocaleString('ru-RU');

            if (Array.isArray(stats.goals) && stats.goals.length > 0) {
                const g = stats.goals[0];
                const numEl = document.getElementById('goalNumbers');
                const barEl = document.getElementById('goalProgressBar');
                const descEl = document.getElementById('goalDesc');

                const current = g.current || 178;
                const target = g.target || 200;
                const percent = Math.min(100, Math.round((current / target) * 100));

                if (numEl) numEl.textContent = `${current} из ${target} платных подписчиков (${percent}%)`;
                if (barEl) barEl.style.width = `${percent}%`;
                if (descEl && g.description) descEl.textContent = g.description;
            }
        })
        .catch(() => {});
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

function handleVote(item, btnElement) {
    const id = item.id;
    if (hasUserVoted(id)) return;

    localStorage.setItem(`voted_${CURRENT_MONTH_KEY}_${id}`, 'true');
    btnElement.classList.add('voted');
    const labelEl = btnElement.querySelector('.vote-label');
    const countEl = document.getElementById('vote-count-' + id);
    if (labelEl) labelEl.textContent = '🔥 Жду проду!';

    const newCount = (item.votes || 0) + 1;
    item.votes = newCount;
    votesCache[id] = newCount;
    saveVotesCache();
    if (countEl) countEl.textContent = newCount;

    trackEvent('vote_proda', { Тайтл: item.title, Уровень: item.tier });

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
        } else if (sortValue === 'posts_desc') {
            return (b.posts_count || 0) - (a.posts_count || 0);
        } else if (sortValue === 'votes_desc') {
            return (b.votes || 0) - (a.votes || 0);
        } else {
            return a.originalIndex - b.originalIndex;
        }
    });

    const totalEl = document.getElementById('totalTitlesCount');
    if (totalEl) {
        totalEl.textContent = `🍁 Показано тайтлов: ${filtered.length} из ${allItems.length}`;
    }

    renderCatalog(filtered);
}

function renderCatalog(items) {
    const catalog = document.getElementById('catalog');
    catalog.innerHTML = '';
    
    if (items.length === 0) {
        catalog.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; color:var(--text-muted); padding: 40px 0;">В этой категории пока нет тайтлов</p>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        const frameClass = `tier-frame-${item.tier_level || 1}`;
        card.className = `card ${frameClass}`;

        const voted = hasUserVoted(item.id);
        const levelClass = item.tier_level === 2 ? 'level-2' : (item.tier_level === 3 ? 'level-3' : 'level-1');
        const subUrl = item.sub_link;

        // Строим список конкретных постов/глав для выпадающего меню
        const postsHtml = (item.posts_list || []).map(p => `
            <a href="${p.url}" target="_blank" class="chapter-post-item" data-chapter="${p.label}">
                <span>▶ ${p.label}</span>
                <span class="chapter-post-date">${p.date || ''}</span>
            </a>
        `).join('');

        card.innerHTML = `
            <a href="${item.link}" target="_blank" class="card-link">
                <img src="${item.image}" alt="${item.title}" loading="lazy" referrerpolicy="no-referrer">
                <span class="posts-floating-badge">Постов: ${item.posts_count}</span>
                <span class="chapters-floating-badge">Глав: ${item.chapters}</span>
            </a>
            <div class="card-info">
                <a href="${item.link}" target="_blank" class="card-title-link">
                    <h3>${item.title}</h3>
                </a>
                <div>
                    <span class="badge ${levelClass}">${item.tier}</span>
                    
                    <div class="action-buttons-row">
                        <a href="${subUrl}" target="_blank" class="buy-tier-link" title="Оформить подписку">Подписаться</a>
                        <button type="button" class="chapters-Select-btn" title="Перейти к определенным главам в ленте">
                            📑 Главы (${item.posts_count})
                        </button>
                        <div class="chapters-dropdown">
                            <div class="dropdown-head">
                                <span>Посты в ленте (${item.posts_count})</span>
                                <a href="${item.link}" target="_blank" style="color:var(--accent-orange);text-decoration:none;">Все ↗</a>
                            </div>
                            ${postsHtml}
                        </div>
                    </div>

                    <div class="details">
                        <span>Озвучено: <b>${item.chapters} гл.</b></span>
                        <span>Пост: <b>${item.last_update}</b></span>
                    </div>
                    <button type="button" class="vote-btn ${voted ? 'voted' : ''}" data-id="${item.id}">
                        <span class="vote-label">${voted ? '🔥 Жду проду!' : '🔥 Хочу проду'}</span>
                        <span class="vote-count" id="vote-count-${item.id}">${item.votes || 0}</span>
                    </button>
                </div>
            </div>
        `;

        // Открытие списка глав по кнопке "📑 Главы"
        const chBtn = card.querySelector('.chapters-Select-btn');
        const dropdown = card.querySelector('.chapters-dropdown');
        if (chBtn && dropdown) {
            chBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('open');
                document.querySelectorAll('.chapters-dropdown.open').forEach(el => el.classList.remove('open'));
                if (!isOpen) {
                    dropdown.classList.add('open');
                    trackEvent('open_chapters_menu', { Тайтл: item.title });
                }
            });
        }

        // Отслеживание перехода на конкретную главу/пост
        card.querySelectorAll('.chapter-post-item').forEach(chLink => {
            chLink.addEventListener('click', () => {
                trackEvent('select_specific_chapter', { Тайтл: item.title, Глава: chLink.dataset.chapter });
            });
        });

        // Отслеживание клика по карточке
        card.querySelectorAll('.card-link, .card-title-link').forEach(link => {
            link.addEventListener('click', () => {
                trackEvent('click_title_card', { Тайтл: item.title, Уровень: item.tier });
            });
        });

        const buyLink = card.querySelector('.buy-tier-link');
        if (buyLink) {
            buyLink.addEventListener('click', () => {
                trackEvent('buy_tier_from_card', { Тайтл: item.title, Уровень: item.tier });
            });
        }

        const voteBtn = card.querySelector('.vote-btn');
        voteBtn.addEventListener('click', () => handleVote(item, voteBtn));

        catalog.appendChild(card);
    });
}
