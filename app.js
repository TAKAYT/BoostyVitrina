let allItems = [];
const VOTE_NAMESPACE = 'takayt_boosty_vitrina_votes';

document.addEventListener("DOMContentLoaded", () => {
    fetch('data.json?v=' + Date.now())
        .then(response => response.json())
        .then(data => {
            allItems = data.map((item, index) => {
                // Гарантируем, что каждая ссылка ведет в Ленту (&view=feed)
                let feedLink = item.link || '';
                if (feedLink.includes('view=grid')) {
                    feedLink = feedLink.replace('view=grid', 'view=feed');
                } else if (!feedLink.includes('view=feed')) {
                    feedLink += (feedLink.includes('?') ? '&' : '?') + 'view=feed';
                }

                return {
                    ...item,
                    link: feedLink,
                    originalIndex: index,
                    votes: 0
                };
            });

            applyFilters();
            loadAllVotes();
        })
        .catch(error => console.error('Ошибка загрузки данных:', error));

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('tierFilter').addEventListener('change', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);
});

function hasUserVoted(id) {
    return localStorage.getItem('voted_' + id) === 'true';
}

function loadAllVotes() {
    allItems.forEach(item => {
        const countEl = document.getElementById('vote-count-' + item.id);
        fetch(`https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/title_${item.id}/`)
            .then(res => res.ok ? res.json() : { count: 0 })
            .then(data => {
                const count = data.count || 0;
                item.votes = count;
                if (countEl) countEl.textContent = count;
            })
            .catch(() => {
                const localFallback = parseInt(localStorage.getItem('count_' + item.id) || '0', 10);
                item.votes = localFallback;
                if (countEl) countEl.textContent = localFallback;
            });
    });
}

function handleVote(id, btnElement) {
    if (hasUserVoted(id)) {
        return; // Уже голосовал с этого устройства
    }

    localStorage.setItem('voted_' + id, 'true');
    btnElement.classList.add('voted');
    const labelEl = btnElement.querySelector('.vote-label');
    const countEl = document.getElementById('vote-count-' + id);
    if (labelEl) labelEl.textContent = '🔥 Жду проду!';

    const currentItem = allItems.find(i => i.id === id);
    const optimisticCount = (currentItem ? currentItem.votes : 0) + 1;
    if (currentItem) currentItem.votes = optimisticCount;
    if (countEl) countEl.textContent = optimisticCount;
    localStorage.setItem('count_' + id, optimisticCount);

    fetch(`https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/title_${id}/up`)
        .then(res => res.json())
        .then(data => {
            if (data && typeof data.count === 'number') {
                if (currentItem) currentItem.votes = data.count;
                if (countEl) countEl.textContent = data.count;
                localStorage.setItem('count_' + id, data.count);
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

    renderCatalog(filtered);
}

function renderCatalog(items) {
    const catalog = document.getElementById('catalog');
    catalog.innerHTML = '';
    
    if (items.length === 0) {
        catalog.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; color:#aaa;">Ничего не найдено</p>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';

        const voted = hasUserVoted(item.id);
        const levelClass = item.tier_level === 2 ? 'level-2' : (item.tier_level === 3 ? 'level-3' : 'level-1');
        const subUrl = item.sub_link || 'https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link';

        card.innerHTML = `
            <a href="${item.link}" target="_blank" class="card-link">
                <img src="${item.image}" alt="${item.title}" loading="lazy">
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
                    <div class="details" style="margin-top: 8px;">
                        <span>Глав: <b>${item.chapters}</b></span>
                        <span>Пост: <b>${item.last_update}</b></span>
                    </div>
                    <button type="button" class="vote-btn ${voted ? 'voted' : ''}" data-id="${item.id}">
                        <span class="vote-label">${voted ? '🔥 Жду проду!' : '🔥 Хочу проду'}</span>
                        <span class="vote-count" id="vote-count-${item.id}">${item.votes || 0}</span>
                    </button>
                </div>
            </div>
        `;

        const voteBtn = card.querySelector('.vote-btn');
        voteBtn.addEventListener('click', () => handleVote(item.id, voteBtn));

        catalog.appendChild(card);
    });
}
