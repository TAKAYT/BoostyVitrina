import urllib.request
import json
import re
import datetime

BLOG_NAME = 'darktaka'
API_URL = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/?limit=300'

def get_bundles():
    req = urllib.request.Request(API_URL, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    try:
        with urllib.request.urlopen(req) as response:
            raw = json.loads(response.read().decode('utf-8'))
            # Достаем список напрямую из ключа "bundles"
            if isinstance(raw, dict):
                if 'data' in raw and isinstance(raw['data'], dict) and 'bundles' in raw['data']:
                    return raw['data']['bundles']
                elif 'bundles' in raw:
                    return raw['bundles']
            return []
    except Exception as e:
        print(f"Ошибка API: {e}")
        return []

def process_data(bundles_list):
    result = []
    
    for item in bundles_list:
        if not isinstance(item, dict):
            continue
            
        raw_title = item.get('title', 'Без названия')
        bundle_id = item.get('id', '')
        
        if not bundle_id:
            continue
            
        # 1. Вытаскиваем число глав из скобок (например, из [1-50] или [1-37 Главы] берем 50 и 37)
        chapters = 0
        chapters_match = re.search(r'\[\d+\s*-\s*(\d+)', raw_title)
        if not chapters_match:
            chapters_match = re.search(r'\[.*?(\d+).*?\]', raw_title)
        if chapters_match:
            chapters = int(chapters_match.group(1))
            
        # 2. Очищаем название от приписок "ГЛАВЫ [1-50]" и лишних скобок
        clean_title = re.sub(r'(?i)\s*главы\s*\[.*?\]', '', raw_title)
        clean_title = re.sub(r'\s*\[.*?\]', '', clean_title).strip()
        if not clean_title:
            clean_title = raw_title
            
        # 3. Достаем обложку из thumbnail -> url и добавляем параметры размера
        cover = 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Нет+обложки'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            cover = thumb['url'] + '&croped=1&mh=326&mw=300'
            
        # 4. Переводим системное время updatedAt в дату (ГГГГ-ММ-ДД)
        updated_ts = item.get('updatedAt') or item.get('publishedAt')
        if updated_ts:
            last_update = datetime.datetime.fromtimestamp(updated_ts).strftime("%Y-%m-%d")
        else:
            last_update = datetime.datetime.now().strftime("%Y-%m-%d")
            
        # 5. Определяем доступ
        price = item.get('price', 0)
        if price > 0:
            tier = f"Цена: {price} ₽"
        else:
            tier = "Базовый уровень 1 ур."
            
        result.append({
            "id": str(bundle_id),
            "title": clean_title,
            "image": cover,
            "chapters": chapters,
            "last_update": last_update,
            "tier": tier,
            "link": f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=grid"
        })
        
    return result

if __name__ == '__main__':
    bundles = get_bundles()
    if bundles:
        formatted_data = process_data(bundles)
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, ensure_ascii=False, indent=2)
        print(f"Успешно обработано {len(formatted_data)} бандлов.")
    else:
        print("Список бандлов пуст.")
