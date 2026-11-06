let allItems = [];

// Ключ текущего месяца (например, "2026_11") — автоматически сбрасывает голоса 1-го числа каждого месяца
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

// Отправка целей в Яндекс.Метрику с защитой от ошибок и блокировщиков рекламы
function trackEvent(goalName, params = {}) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const fromVideo = urlParams.get('utm_campaign') || urlParams.get('from') || 'direct';
        const payload = { ...params, source_video: fromVideo };

        if (typeof window.ym === 'function' && window.YM_COUNTER_ID > 0) {
            window.ym(window.YM_COUNTER_ID, 'reachGoal', goalName, payload);
        }
    } catch (e) {
        // Игнорируем, если у пользователя стоит AdBlock
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Показываем текущий месяц голосования
    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const resetInfoEl = document.getElementById('voteResetInfo');
    if (resetInfoEl) {
        resetInfoEl.textContent = `🔥 Рейтинг ожидания прод на ${monthNames[now.getMonth()]} ${now.getFullYear()} (сброс 1-го числа)`;
    }

    // Логика модального окна заказа тайтлов
    const modal = document.getElementById('orderModal');
    const openBtn = document.getElementById('openOrderModal');
    const closeBtn = document.getElementById('closeOrderModal');

    if (openBtn && modal && closeBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            trackEvent('open_order_modal');
        });
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    // Загрузка базы тайтлов
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

                // Исправляем ссылку 3-го уровня, если в старом JSON осталась общая
                let subLink = item.sub_link || 'https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link';
                if (item.tier_level === 3 || (item.tier && item.tier.includes('1000'))) {
                    subLink = 'https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link';
                }

                const cachedVotes = typeof votesCache[item.id] === 'number' ? votesCache[item.id] : 0;

                return {
                    ...item,
                    link: feedLink,
                    sub_link: subLink,
                    originalIndex: index,
                    votes: cachedVotes
                };
            });

            applyFilters();
            syncVotesInBatches();
        })
        .catch(error => console.error('Ошибка загрузки данных:', error));

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('tierFilter').addEventListener('change', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);
});

function hasUserVoted(id) {
    return localStorage.getItem(`voted_${CURRENT_MONTH_KEY}_${id}`) === 'true';
}

function saveVotesCache() {
    try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(votesCache));
    } catch (e) {}
}

// Плавная фоновая синхронизация голосов без блокировки API
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
        } catch (e) {
            // Если нет ответа, оставляем сохраненное в кэше значение
        }
        // Небольшая пауза каждые 5 запросов, чтобы сервер счетчика не отклонял соединения
        if (i % 5 === 0) {
            await new Promise(r => setTimeout(r, 120));
        }
    }
    saveVotesCache();
}

function handleVote(item, btnElement) {
    const id = item.id;
    if (hasUserVoted(id)) {
        return;
    }

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

    // Отправляем событие в Метрику: за какой именно тайтл проголосовали
    trackEvent('vote_proda', { title: item.title, bundle_id: id });

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
    const tierValue = document.getElementById('tierFilter').value;
    const sortValue = document.getElementById('sortSelect').value;

    let filtered = allItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchText);
        const matchesTier = tierValue === 'all' || (item.tier && item.tier.includes(tierValue));
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
        totalEl.textContent = `Найдено тайтлов в библиотеке: ${filtered.length} из ${allItems.length}`;
    }

    renderCatalog(filtered);
}

function renderCatalog(items) {
    const catalog = document.getElementById('catalog');
    catalog.innerHTML = '';
    
    if (items.length === 0) {
        catalog.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; color:var(--text-muted); padding: 40px 0;">По вашему запросу ничего не найдено</p>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';

        const voted = hasUserVoted(item.id);
        const levelClass = item.tier_level === 2 ? 'level-2' : (item.tier_level === 3 ? 'level-3' : 'level-1');
        const subUrl = item.sub_link;

        card.innerHTML = `
            <a href="${item.link}" target="_blank" class="card-link">
                <img src="${item.image}" alt="${item.title}" loading="lazy">
                <span class="chapters-floating-badge">Глав: ${item.chapters}</span>
            </a>
            <div class="card-info">
                <a href="${item.link}" target="_blank" class="card-title-link">
                    <h3>${item.title}</h3>
                </a>
                <div>
                    <div class="tier-row">
                        <span class="badge ${levelClass}">${item.tier}</span>
                        <a href="${subUrl}" target="_blank" class="buy-tier-link" title="Оформить этот уровень подписки">Подписаться</a>
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

        // Отслеживание кликов по обложке и названию тайтла в Метрику
        const titleLinks = card.querySelectorAll('.card-link, .card-title-link');
        titleLinks.forEach(link => {
            link.addEventListener('click', () => {
                trackEvent('open_title', { title: item.title, tier: item.tier });
            });
        });

        // Отслеживание клика по кнопке подписки внутри карточки
        const buyLink = card.querySelector('.buy-tier-link');
        if (buyLink) {
            buyLink.addEventListener('click', () => {
                trackEvent('buy_tier_from_card', { title: item.title, tier: item.tier });
            });
        }

        const voteBtn = card.querySelector('.vote-btn');
        voteBtn.addEventListener('click', () => handleVote(item, voteBtn));

        catalog.appendChild(card);
    });
}
