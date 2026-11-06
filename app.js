document.addEventListener("DOMContentLoaded", () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => renderCatalog(data))
        .catch(error => console.error('Ошибка загрузки данных:', error));
});

function renderCatalog(items) {
    const catalog = document.getElementById('catalog');
    
    items.forEach(item => {
        const card = document.createElement('a');
        card.href = item.link;
        card.className = 'card';
        card.target = '_blank'; // Открывать в новой вкладке
        
        card.innerHTML = `
            <img src="${item.image}" alt="${item.title}">
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
