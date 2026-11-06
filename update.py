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

def extract_chapters_from_text(text):
    if not text: return 0
    # Ищем числа, стоящие перед словом "Глава", "Главы" или внутри скобок []
    chapters = 0
    
    # 1. Формат "9-19 Главы" или "316 Глава"
    match_glava = re.search(r'(\d+)\s*(?:Глава|Главы)', text, re.IGNORECASE)
    if match_glava:
        chapters = int(match_glava.group(1))
    else:
        # 2. Формат [1-50] или просто [50]
        brackets = re.findall(r'\[(.*?)\]', text)
        if brackets:
            last_bracket = brackets[-1]
            numbers = re.findall(r'\d+', last_bracket)
            if numbers:
                chapters = int(numbers[-1])
    return chapters

def process_data(bundles_list):
    result = []
    
    for item in bundles_list:
        if not isinstance(item, dict): continue
            
        raw_title = item.get('title', 'Без названия')
        bundle_id = item.get('id', '')
        if not bundle_id: continue
            
        # Очистка названия бандла
        clean_title = re.sub(r'\[.*?\]', '', raw_title)
        clean_title = re.sub(r'(?i)главы\s*$', '', clean_title).strip()
        if not clean_title: clean_title = raw_title
            
        # Обложка
        cover = 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Нет+обложки'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            cover = thumb['url'] + '&croped=1&mh=326&mw=300'
            
        # Инициализация дефолтными значениями
        chapters = extract_chapters_from_text(raw_title) # Сначала пробуем из названия бандла
        last_update = datetime.datetime.now().strftime("%b %d %H:%M")
        tier = "Базовый уровень 1 ур. 250 ₽"
        
        # Запрашиваем последний пост
        latest_post = get_latest_post_info(bundle_id)
        time.sleep(0.2)
        
        if latest_post:
            # 1. Дата из поста в формате Boosty ("Nov 02 09:00")
            updated_ts = latest_post.get('publishTime') or latest_post.get('createdAt')
            if updated_ts:
                # Конвертируем timestamp в формат английской локали, похожий на Boosty
                dt = datetime.datetime.fromtimestamp(updated_ts)
                last_update = dt.strftime("%b %d %H:%M")
                
            # 2. Главы из названия поста (если они там есть, они точнее)
            post_title = latest_post.get('title', '')
            post_chapters = extract_chapters_from_text(post_title)
            if post_chapters > chapters:
                chapters = post_chapters
                
            # 3. Уровень подписки из поля subscriptionLevel (или price, если уровень не указан напрямую)
            # Boosty API возвращает данные о требуемом уровне в 'subscriptionLevel' или 'price'
            # Так как мы не авторизованы, мы можем судить по цене, если пост закрыт.
            price = latest_post.get('price', 0)
            
            # Проверяем, есть ли информация об уровне подписки внутри поста
            subscription_level = latest_post.get('subscriptionLevel')
            if subscription_level and isinstance(subscription_level, dict):
                 level_name = subscription_level.get('name', '').lower()
                 if "базовый" in level_name:
                     tier = "Базовый уровень 1 ур. 250 ₽"
                 elif "основной" in level_name:
                     tier = "Основной уровень 2 ур. 500 ₽"
                 elif "доп" in level_name:
                     tier = "Доп.поддержка 2 ур. 1000 ₽"
            else:
                 # Если названия уровня нет, пробуем по цене
                 if price > 500: tier = "Доп.поддержка 2 ур. 1000 ₽"
                 elif price > 250: tier = "Основной уровень 2 ур. 500 ₽"
                 elif price > 0: tier = "Базовый уровень 1 ур. 250 ₽"
            
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
