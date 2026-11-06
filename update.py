import urllib.request
import json
import re
import datetime
import time

BLOG_NAME = 'darktaka'
API_URL = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/?limit=300'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def get_bundles():
    req = urllib.request.Request(API_URL, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as response:
            raw = json.loads(response.read().decode('utf-8'))
            if isinstance(raw, dict):
                if 'data' in raw and isinstance(raw['data'], dict) and 'bundles' in raw['data']:
                    return raw['data']['bundles']
                elif 'bundles' in raw:
                    return raw['bundles']
            return []
    except Exception as e:
        print(f"Ошибка API: {e}")
        return []

def get_latest_post_info(bundle_id):
    # Заходим внутрь бандла, чтобы посмотреть последний пост
    post_url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=1'
    req = urllib.request.Request(post_url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as response:
            raw = json.loads(response.read().decode('utf-8'))
            posts = raw.get('data', [])
            if posts:
                return posts[0]
    except Exception:
        pass
    return None

def process_data(bundles_list):
    result = []
    
    for item in bundles_list:
        if not isinstance(item, dict): continue
            
        raw_title = item.get('title', 'Без названия')
        bundle_id = item.get('id', '')
        if not bundle_id: continue
            
        # 1. Умный поиск глав: ищем цифры в последних скобках
        chapters = 0
        brackets = re.findall(r'\[(.*?)\]', raw_title)
        if brackets:
            last_bracket = brackets[-1]
            numbers = re.findall(r'\d+', last_bracket)
            if numbers:
                chapters = int(numbers[-1])
                
        # 2. Очистка длинных названий от скобок
        clean_title = re.sub(r'\[.*?\]', '', raw_title)
        clean_title = re.sub(r'(?i)главы\s*$', '', clean_title).strip()
        if not clean_title: clean_title = raw_title
            
        # 3. Обложка
        cover = 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Нет+обложки'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            cover = thumb['url'] + '&croped=1&mh=326&mw=300'
            
        # 4. Данные из последнего поста (Дата и Уровень подписки)
        latest_post = get_latest_post_info(bundle_id)
        time.sleep(0.2) # Пауза, чтобы не получить бан от Бусти
        
        last_update = datetime.datetime.now().strftime("%Y-%m-%d")
        tier = "Базовый уровень 1 ур. 250 ₽"
        
        if latest_post:
            # Реальная дата последнего поста
            updated_ts = latest_post.get('publishTime') or latest_post.get('createdAt')
            if updated_ts:
                last_update = datetime.datetime.fromtimestamp(updated_ts).strftime("%Y-%m-%d")
            
            # Определяем уровень подписки по цене/доступу
            price = latest_post.get('price', 0)
            if price > 500: tier = "Доп.поддержка 2 ур. 1000 ₽"
            elif price > 250: tier = "Основной уровень 2 ур. 500 ₽"
            elif price > 0: tier = "Базовый уровень 1 ур. 250 ₽"
            else: tier = "Базовый уровень 1 ур. 250 ₽" # Дефолт, если пост доступен базовым
            
        result.append({
            "id": str(bundle_id),
            "title": clean_title,
            "image": cover,
            "chapters": chapters,
            "last_update": last_update,
            "tier": tier,
            "link": f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed"
        })
        
    return result

if __name__ == '__main__':
    bundles = get_bundles()
    if bundles:
        formatted_data = process_data(bundles)
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, ensure_ascii=False, indent=2)
        print(f"Успешно обработано {len(formatted_data)} бандлов.")
