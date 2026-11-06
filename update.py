import urllib.request
import json
import re
import datetime

BLOG_NAME = 'darktaka'
# Обращаемся напрямую к внутреннему API Boosty, которое отдает список бандлов
API_URL = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/?limit=200'

def get_bundles():
    req = urllib.request.Request(API_URL, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('data', [])
    except Exception as e:
        print(f"Ошибка API: {e}")
        return []

def process_data(api_data):
    result = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    
    for item in api_data:
        title = item.get('title', 'Без названия')
        bundle_id = item.get('id', '')
        
        # Вытаскиваем финальное количество глав из названий вида "ГЛАВЫ [1-50]"
        chapters = 0
        chapters_match = re.search(r'\[.*?(\d+)\]', title)
        if chapters_match:
            chapters = int(chapters_match.group(1))
            
        # Достаем ссылку на обложку
        cover = ''
        if item.get('cover_url'):
            cover = item['cover_url']
        elif item.get('image_url'):
            cover = item['image_url']
            
        price = item.get('price', 0)
        tier = f"Цена: {price} ₽" if price > 0 else "Бесплатно"
        
        result.append({
            "id": bundle_id,
            "title": title,
            "image": cover,
            "chapters": chapters,
            "last_update": today,
            "tier": tier,
            "link": f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=grid"
        })
        
    return result

if __name__ == '__main__':
    data = get_bundles()
    if data:
        formatted_data = process_data(data)
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, ensure_ascii=False, indent=2)
        print(f"Обновлено {len(formatted_data)} бандлов.")
    else:
        print("Данные не найдены.")
