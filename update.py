import urllib.request
import urllib.parse
import json
import re
import datetime
import time

BLOG_NAME = 'darktaka'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
}

# Прямые ссылки на покупку подписок
SUB_LINKS = {
    1: "https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link",
    2: "https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link",
    3: "https://boosty.to/darktaka"
}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode('utf-8'))

def fetch_html(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read().decode('utf-8', errors='ignore')

def get_all_bundles():
    url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/?limit=300'
    try:
        raw = fetch_json(url)
        if isinstance(raw, dict):
            if 'data' in raw and isinstance(raw['data'], dict) and 'bundles' in raw['data']:
                return raw['data']['bundles']
            elif 'bundles' in raw:
                return raw['bundles']
    except Exception as e:
        print(f"Ошибка загрузки бандлов: {e}")
    return []

def get_latest_post_from_bundle_feed(bundle_id):
    """
    Пробует получить самый последний пост из ленты конкретного бандла
    через все возможные эндпоинты API Boosty и SSR-данные страницы &view=feed
    """
    api_endpoints = [
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=5&bundle_id={bundle_id}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=5&bundleId={bundle_id}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=5',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/'
    ]
    
    for url in api_endpoints:
        try:
            raw = fetch_json(url)
            posts = []
            if isinstance(raw, dict):
                # Проверяем разные варианты вложенности
                data_obj = raw.get('data', raw)
                if isinstance(data_obj, list):
                    posts = data_obj
                elif isinstance(data_obj, dict):
                    if isinstance(data_obj.get('posts'), list):
                        posts = data_obj['posts']
                    elif isinstance(data_obj.get('data'), list):
                        posts = data_obj['data']
                        
            if posts:
                # Убеждаемся, что если API вернуло общую ленту, мы проверяем совпадение или берем свежий
                valid_posts = [p for p in posts if isinstance(p, dict) and ('publishTime' in p or 'createdAt' in p)]
                if valid_posts:
                    # Если API не фильтрует по bundle_id, проверим, не одинаковый ли это пост для всех
                    return valid_posts
        except Exception:
            continue
            
    return []

def get_all_blog_posts():
    """
    Скачивает все посты блога пачками по 100 штук, чтобы иметь полную базу
    на случай, если эндпоинт бандла закрыт или не фильтрует.
    """
    all_posts = []
    offset = ""
    for _ in range(12): # До 1200 постов
        url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=100'
        if offset:
            url += f'&offset={urllib.parse.quote(str(offset))}'
        try:
            raw = fetch_json(url)
            data = raw.get('data', [])
            if not data or not isinstance(data, list):
                break
            all_posts.extend(data)
            extra = raw.get('extra', {})
            if extra.get('isLast') or not extra.get('offset'):
                break
            offset = extra.get('offset')
            time.sleep(0.1)
        except Exception as e:
            print(f"Ошибка пагинации постов: {e}")
            break
    print(f"Загружено всего постов из блога: {len(all_posts)}")
    return all_posts

def extract_chapters_number(text):
    if not text or not isinstance(text, str):
        return 0
    
    # 1. Ищем конструкции "9-19 Главы", "316 Глава", "1-316 Главы"
    matches = re.findall(r'(?:\d+\s*[-—–]\s*)?(\d+)\s*(?:глав[аы]?|гл\.?)', text, re.IGNORECASE)
    if matches:
        return max(int(m) for m in matches)
        
    # 2. Ищем диапазоны в скобках: [1-50], (9-19), [1-216]
    range_matches = re.findall(r'[\[\(]\s*\d+\s*[-—–]\s*(\d+)[^\]\)]*[\]\)]', text)
    if range_matches:
        return max(int(m) for m in range_matches)
        
    # 3. Ищем конструкции вида "9-19" в конце строки
    dash_matches = re.findall(r'\b\d+\s*[-—–]\s*(\d+)\b', text)
    if dash_matches:
        return max(int(m) for m in dash_matches)
        
    return 0

def extract_all_strings_from_post(post):
    """Достает весь видимый текст из поста (заголовок, тизер на обложке, теги)"""
    strings = []
    if not isinstance(post, dict):
        return strings
        
    if post.get('title'):
        strings.append(str(post['title']))
        
    # В закрытых постах надпись на картинке ("НЯМ (Некромант) 316 Глава") лежит в teaser или data
    for key in ['teaser', 'data']:
        blocks = post.get(key)
        if isinstance(blocks, list):
            for b in blocks:
                if isinstance(b, dict):
                    for subkey in ['title', 'content', 'text', 'description']:
                        if b.get(subkey):
                            strings.append(str(b[subkey]))
                            
    # Проверяем теги поста
    tags = post.get('tags')
    if isinstance(tags, list):
        for t in tags:
            if isinstance(t, dict) and t.get('title'):
                strings.append(str(t['title']))
                
    return strings

def detect_subscription_tier(post):
    """
    Определяет уровень подписки прямо из плашки 'Level required' (subscriptionLevel) закрытого поста
    """
    default_tier = {
        "name": "Базовый уровень 1 ур. 250 ₽",
        "level": 1,
        "sub_link": SUB_LINKS[1]
    }
    if not isinstance(post, dict):
        return default_tier
        
    # Превращаем весь объект уровня подписки и поста в строку для надежного поиска
    sub_obj = post.get('subscriptionLevel') or post.get('subscription_level') or {}
    sub_dump = json.dumps(sub_obj, ensure_ascii=False).lower()
    post_dump = json.dumps({
        'sub': sub_obj,
        'price': post.get('price'),
        'tier': post.get('tier')
    }, ensure_ascii=False).lower()
    
    # Проверяем по названию уровня или ID твоих уровней (3988840, 3988841)
    if 'доп.поддержка' in post_dump or 'доп. поддержка' in post_dump or '1000' in sub_dump:
        return {
            "name": "Доп.поддержка 2 ур. 1000 ₽",
            "level": 3,
            "sub_link": SUB_LINKS[3]
        }
    elif 'основной уровень' in post_dump or '3988841' in post_dump or '500' in sub_dump:
        return {
            "name": "Основной уровень 2 ур. 500 ₽",
            "level": 2,
            "sub_link": SUB_LINKS[2]
        }
    elif 'базовый уровень' in post_dump or '3988840' in post_dump or '250' in sub_dump:
        return {
            "name": "Базовый уровень 1 ур. 250 ₽",
            "level": 1,
            "sub_link": SUB_LINKS[1]
        }
        
    return default_tier

def clean_bundle_title(raw_title):
    cleaned = re.sub(r'\[.*?\]', '', raw_title)
    cleaned = re.sub(r'(?i)\s*глав[аы]?\s*$', '', cleaned).strip()
    return cleaned if cleaned else raw_title.strip()

def normalize_for_match(text):
    return re.sub(r'[^а-яa-z0-9]', '', text.lower())

def find_matching_post_for_bundle(bundle, all_blog_posts, global_first_post_id):
    bundle_id = str(bundle.get('id', ''))
    raw_title = bundle.get('title', '')
    clean_title = clean_bundle_title(raw_title)
    thumb = bundle.get('thumbnail') or {}
    thumb_id = thumb.get('id', '')
    thumb_title = thumb.get('title', '')
    
    # 1. Сначала пробуем прямой запрос к ленте бандла
    direct_posts = get_latest_post_from_bundle_feed(bundle_id)
    time.sleep(0.1)
    
    # Проверяем, действительно ли API отфильтровало посты под этот бандл,
    # а не вернуло самый первый пост всего блога
    if direct_posts:
        first_p = direct_posts[0]
        p_dump = json.dumps(first_p, ensure_ascii=False)
        if bundle_id in p_dump or (first_p.get('id') != global_first_post_id):
            return first_p
            
    # 2. Ищем среди всех скачанных постов блога
    norm_title = normalize_for_match(clean_title)
    matched = []
    
    for p in all_blog_posts:
        p_str = json.dumps(p, ensure_ascii=False)
        # Если в посте напрямую упомянут ID бандла или ID картинки-обложки
        if bundle_id in p_str or (thumb_id and thumb_id in p_str):
            matched.append(p)
            continue
            
        # Или если совпадает название тайтла в заголовке/тизере/тегах
        p_texts = extract_all_strings_from_post(p)
        for t in p_texts:
            norm_t = normalize_for_match(t)
            if len(norm_title) >= 5 and norm_title[:12] in norm_t:
                matched.append(p)
                break
                
    if matched:
        matched.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
        return matched[0]
        
    return direct_posts[0] if direct_posts else None

def process_data():
    bundles_list = get_all_bundles()
    if not bundles_list:
        print("Бандлы не найдены!")
        return []
        
    all_blog_posts = get_all_blog_posts()
    global_first_post_id = all_blog_posts[0].get('id') if all_blog_posts else None
    
    result = []
    
    for item in bundles_list:
        if not isinstance(item, dict):
            continue
            
        bundle_id = str(item.get('id', '')).strip()
        if not bundle_id:
            continue
            
        raw_title = item.get('title', 'Без названия')
        clean_title = clean_bundle_title(raw_title)
        
        # Обложка
        cover = 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Нет+обложки'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            cover = thumb['url'] + '&croped=1&mh=326&mw=300'
            
        # Считаем главы из названия бандла и из названия картинки обложки
        chapters = extract_chapters_number(raw_title)
        if isinstance(thumb, dict) and thumb.get('title'):
            ch_thumb = extract_chapters_number(thumb['title'])
            if ch_thumb > chapters:
                chapters = ch_thumb
                
        # Ищем последний пост в ленте этого бандла
        latest_post = find_matching_post_for_bundle(item, all_blog_posts, global_first_post_id)
        
        # Время публикации: приоритет у последнего поста из ленты, затем publishedAt самого бандла
        ts = item.get('publishedAt') or item.get('createdAt') or int(time.time())
        tier_info = {
            "name": "Базовый уровень 1 ур. 250 ₽",
            "level": 1,
            "sub_link": SUB_LINKS[1]
        }
        
        if latest_post:
            post_ts = latest_post.get('publishTime') or latest_post.get('createdAt')
            if post_ts:
                ts = post_ts
                
            # Проверяем главы внутри последнего поста (включая надпись на закрытом превью)
            for text_line in extract_all_strings_from_post(latest_post):
                ch_post = extract_chapters_number(text_line)
                if ch_post > chapters:
                    chapters = ch_post
                    
            # Определяем уровень подписки из поста
            tier_info = detect_subscription_tier(latest_post)
            
        # Формат даты строго: число/мес./год (ДД/ММ/ГГГГ)
        dt = datetime.datetime.fromtimestamp(ts)
        formatted_date = dt.strftime("%d/%m/%Y")
        
        # Ссылка строго с &view=feed
        feed_link = f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed"
        
        result.append({
            "id": bundle_id,
            "title": clean_title,
            "image": cover,
            "chapters": chapters,
            "last_update": formatted_date,
            "timestamp": ts,
            "tier": tier_info["name"],
            "tier_level": tier_info["level"],
            "sub_link": tier_info["sub_link"],
            "link": feed_link
        })
        
    return result

if __name__ == '__main__':
    data = process_data()
    if data:
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Успешно обновлено {len(data)} тайтлов.")
