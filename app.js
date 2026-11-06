let allItems = [];

document.addEventListener("DOMContentLoaded", () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // Добавляем индекс для сортировки "По новизне" (как они лежали на Бусти)
            allItems = data.map((item, index) => ({ ...item, originalIndex: index }));
            renderCatalog(allItems);
        })
        .catch(error => console.error('Ошибка загрузки:', error));

    // Слушатели событий для фильтров
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('tierFilter').addEventListener('change', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);
});

function applyFilters() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const tierValue = document.getElementById('tierFilter').value;
    const sortValue = document.getElementById('sortSelect').value;

    // 1. Фильтрация
    let filtered = allItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchText);
        const matchesTier = tierValue === 'all' || item.tier.includes(tierValue);
        return matchesSearch && matchesTier;
    });

    // 2. Сортировка
    filtered.sort((a, b) => {
        if (sortValue === 'update_desc') {
            return new Date(b.last_update) - new Date(a.last_update);
        } else if (sortValue === 'chapters_desc') {
            return b.chapters - a.chapters;
        } else {
            // newest (сохраняем оригинальный порядок загрузки с Бусти)
            return a.originalIndex - b.originalIndex;
        }
    });

    renderCatalog(filtered);
}

function renderCatalog(items) {
    const catalog = document.getElementById('catalog');
    catalog.innerHTML = ''; // Очищаем старые карточки
    
    if (items.length === 0) {
        catalog.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; color:#aaa;">Ничего не найдено</p>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('a');
        card.href = item.link;
        card.className = 'card';
        card.target = '_blank';
        
        card.innerHTML = `
            <img src="${item.image}" alt="${item.title}" loading="lazy">
            <div class="card-info">
                <h3>${item.title}</h3>
                <div><span class="badge">${item.tier}</span></div>
                <div class="details">
                    <span>Глав: ${item.chapters}</span>
                    <span>Обнов: ${item.last_update}</span>
                </div>
            </div>
        `;
        catalog.appendChild(card);
    });
}
