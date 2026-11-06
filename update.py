import urllib.request
import json
import re
import datetime

BLOG_NAME = 'darktaka'
API_URL = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/?limit=200'

def get_bundles():
    req = urllib.request.Request(API_URL, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    try:
        with urllib.request.urlopen(req) as response:
            raw = json.loads(response.read().decode('utf-8'))
            if isinstance(raw, dict) and 'data' in raw:
                return raw['data']
            return raw
    except Exception as e:
        return {"error": str(e)}

def process_data(api_data):
    result = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    
    # Защита от любого формата данных
    items = []
    if isinstance(api_data, dict):
        items = list(api_data.values())
    elif isinstance(api_data, list):
        items = api_data
    else:
        items = [api_data]
        
    for item in items:
        if not isinstance(item, dict):
            continue
            
        title = item.get('title')
        bundle_id = item.get('id')
        
        if not bundle_id or not title:
            continue
            
        chapters = 0
        chapters_match = re.search(r'\[.*?(\d+)\]', title)
        if chapters_match:
            chapters = int(chapters_match.group(1))
            
        cover = item.get('cover_url') or item.get('image_url') or 'https://via.placeholder.com/400x550'
        price = item.get('price', 0)
        tier = f"Цена: {price} ₽" if price > 0 else "Бесплатно"
        
        result.append({
            "id": str(bundle_id),
            "title": str(title),
            "image": str(cover),
            "chapters": chapters,
            "last_update": today,
            "tier": tier,
            "link": f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=grid"
        })
        
    return result

if __name__ == '__main__':
    data = get_bundles()
    formatted_data = process_data(data)
    
    if formatted_data:
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, ensure_ascii=False, indent=2)
        print(f"Успешно обработано {len(formatted_data)} бандлов.")
    else:
        # ПРЕДОХРАНИТЕЛЬ: Сохраняем то, что прислал Бусти, для анализа
        print("Бандлы не распарсились. Сохраняем сырые данные для анализа...")
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
