import urllib.request
import json
import re
import datetime
import time

BLOG_NAME = 'darktaka'
BUNDLES_API_URL = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/?limit=300'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json'
}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode('utf-8'))

def get_bundles():
    try:
        raw = fetch_json(BUNDLES_API_URL)
        if isinstance(raw, dict):
            if 'data' in raw and isinstance(raw['data'], dict) and 'bundles' in raw['data']:
                return raw['data']['bundles']
            elif 'bundles' in raw:
                return raw['bundles']
        return []
    except Exception as e:
        print(f"Ошибка загрузки списка бандлов: {e}")
        return []

def get_latest_post_for_bundle(bundle_id):
    # Пробуем два варианта API Boosty для получения ленты конкретного бандла
    urls = [
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=5&bundle_id={bundle_id}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=5'
    ]
    for url in urls:
        try:
            raw = fetch_json(url)
            posts = []
            if isinstance(raw, dict):
                if 'data' in raw and isinstance(raw['data'], list):
                    posts = raw['data']
                elif 'data' in raw and isinstance(raw['data'], dict) and 'posts' in raw['data']:
                    posts = raw['data']['posts']
                elif 'posts' in raw and isinstance(raw['posts'], list):
                    posts = raw['posts']
            if posts:
                # Сортируем по дате публикации, чтобы гарантированно взять самый свежий пост
                posts.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
                return posts[0]
        except Exception:
            continue
    return None

def extract_chapters_from_text(text):
    if not text or not isinstance(text, str):
        return 0
    
    # 1. Ищем конструкции вида "9-19 Главы", "316 Глава", "[1-50 Главы]"
    matches = re.findall(r'(?:\d+\s*[-—–]\s*)?(\d+)\s*(?:глав[аы]?|гл\.?)', text, re.IGNORECASE)
    if matches:
        return max(int(m) for m in matches)
        
    # 2. Ищем диапазоны в квадратных или круглых скобках: [1-50], (1-316)
    range_matches = re.findall(r'[\[\(]\s*\d+\s*[-—–]\s*(\d+)[^\]\)]*[\]\)]', text)
    if range_matches:
        return max(int(m) for m in range_matches)
        
    # 3. Ищем любые числа внутри квадратных скобок в конце строки
    brackets = re.findall(r'\[(.*?)\]', text)
    if brackets:
        nums = re.findall(r'\d+', brackets[-1])
        if nums:
            return int(nums[-1])
            
    return 0

def extract_post_chapters(post):
    if not isinstance(post, dict):
        return 0
        
    texts_to_check = []
    # Заголовок самого поста
    if post.get('title'):
        texts_to_check.append(post['title'])
        
    # Тизер (именно тут лежит "Некромант-транжира 9-19 Главы" на закрытых постах)
    for field in ['teaser', 'data']:
        blocks = post.get(field)
        if isinstance(blocks, list):
            for block in blocks:
                if isinstance(block, dict):
                    for key in ['title', 'content', 'text']:
                        if block.get(key) and isinstance(block[key], str):
                            texts_to_check.append(block[key])
                            
    max_ch = 0
    for t in texts_to_check:
        ch = extract_chapters_from_text(t)
        if ch > max_ch:
            max_ch = ch
    return max_ch

def extract_tier(post):
    default_tier = "Базовый уровень 1 ур. 250 ₽"
    if not isinstance(post, dict):
        return default_tier
        
    sub = post.get('subscriptionLevel') or post.get('subscription_level')
    level_name = ""
    price = post.get('price', 0)
    
    if isinstance(sub, dict):
        level_name = str(sub.get('name', '')).lower()
        if not price:
            price = sub.get('price', 0)
            
    if "доп" in level_name or price >= 1000:
        return "Доп.поддержка 2 ур. 1000 ₽"
    elif "основной" in level_name or price >= 500:
        return "Основной уровень 2 ур. 500 ₽"
    elif "базовый" in level_name or price >= 250:
        return "Базовый уровень 1 ур. 250 ₽"
        
    return default_tier

def clean_bundle_title(raw_title):
    # Убираем скобки [1-50] и слово "ГЛАВЫ" в конце
    cleaned = re.sub(r'\[.*?\]', '', raw_title)
    cleaned = re.sub(r'(?i)\s*глав[аы]?\s*$', '', cleaned).strip()
    return cleaned if cleaned else raw_title.strip()

def process_data(bundles_list):
    result = []
    
    for index, item in enumerate(bundles_list):
        if not isinstance(item, dict):
            continue
            
        raw_title = item.get('title', 'Без названия')
        bundle_id = item.get('id', '')
        if not bundle_id:
            continue
            
        clean_title = clean_bundle_title(raw_title)
        
        # Обложка бандла
        cover = 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Нет+обложки'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            cover = thumb['url'] + '&croped=1&mh=326&mw=300'
            
        # Главы из названия самого бандла + из названия картинки-обложки
        chapters = extract_chapters_from_text(raw_title)
        if isinstance(thumb, dict) and thumb.get('title'):
            thumb_ch = extract_chapters_from_text(thumb['title'])
            if thumb_ch > chapters:
                chapters = thumb_ch
                
        # Дефолтная дата из самого бандла
        ts = item.get('updatedAt') or item.get('publishedAt') or int(time.time())
        tier = "Базовый уровень 1 ур. 250 ₽"
        
        # Заходим внутрь ленты бандла за последним постом
        latest_post = get_latest_post_for_bundle(bundle_id)
        time.sleep(0.15) # Мягкая пауза
        
        if latest_post:
            # 1. Берем точную дату последнего поста в бандле
            post_ts = latest_post.get('publishTime') or latest_post.get('createdAt')
            if post_ts:
                ts = post_ts
                
            # 2. Берем главы из последнего поста (если там число больше или в бандле было 0)
            post_ch = extract_post_chapters(latest_post)
            if post_ch > chapters:
                chapters = post_ch
                
            # 3. Определяем уровень подписки из плашки "Level required"
            tier = extract_tier(latest_post)
            
        # Форматируем дату строго как на скриншоте без времени: "Nov 02", "Oct 27"
        dt = datetime.datetime.fromtimestamp(ts)
        last_update_str = dt.strftime("%b %d")
        
        result.append({
            "id": str(bundle_id),
            "title": clean_title,
            "image": cover,
            "chapters": chapters,
            "last_update": last_update_str,
            "timestamp": ts, # Нужно для точной сортировки по дате на сайте
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
    else:
        print("Список бандлов пуст.")
