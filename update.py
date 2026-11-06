import urllib.request
import urllib.parse
import json
import re
import datetime
import time
import os

BLOG_NAME = 'darktaka'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
}

SUB_LINKS = {
    1: "https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link",
    2: "https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link",
    3: "https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link"
}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.loads(response.read().decode('utf-8'))

def fetch_html(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as response:
        return response.read().decode('utf-8', errors='ignore')

def load_extra_config():
    if os.path.exists('extra.json'):
        try:
            with open('extra.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Ошибка чтения extra.json: {e}")
    return {"custom_tags": []}

def get_blog_stats_and_goals():
    """Строгий парсинг платных подписчиков (цели), общих подписчиков и аватарки"""
    stats = {
        "avatar": "",
        "subscribers": 1428,
        "posts": 721,
        "goals": [
            {
                "current": 175,
                "target": 200,
                "type": "subscribers",
                "description": "Мотивация делать больше манхв. Смогу спокойно покупать главы и не париться о базовых нуждах."
            }
        ]
    }

    # 1. API блога
    try:
        blog_data = fetch_json(f'https://api.boosty.to/v1/blog/{BLOG_NAME}')
        if isinstance(blog_data, dict):
            if blog_data.get('avatarUrl'):
                stats['avatar'] = blog_data['avatarUrl']
            count_obj = blog_data.get('count', {})
            if isinstance(count_obj, dict):
                if count_obj.get('subscribers'):
                    stats['subscribers'] = int(count_obj['subscribers'])
                if count_obj.get('posts'):
                    stats['posts'] = int(count_obj['posts'])
    except Exception:
        pass

    # 2. Строгий опрос всех эндпоинтов целей Boosty
    goals_found = []
    target_urls = [
        f'https://api.boosty.to/v1/target/{BLOG_NAME}/',
        f'https://api.boosty.to/v1/target/{BLOG_NAME}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/target/',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/target'
    ]
    for endpoint in target_urls:
        try:
            raw_targets = fetch_json(endpoint)
            target_list = []
            if isinstance(raw_targets, dict):
                data_part = raw_targets.get('data', raw_targets)
                if isinstance(data_part, list):
                    target_list = data_part
                elif isinstance(data_part, dict):
                    for k in ['targets', 'data', 'goals']:
                        if isinstance(data_part.get(k), list):
                            target_list = data_part[k]
                            break
            elif isinstance(raw_targets, list):
                target_list = raw_targets

            for t in target_list:
                if isinstance(t, dict) and t.get('targetSum'):
                    goals_found.append({
                        "current": int(float(t.get('currentSum', 0))),
                        "target": int(float(t.get('targetSum', 200))),
                        "type": t.get('type', 'subscribers'),
                        "description": t.get('description', '')
                    })
            if goals_found:
                break
        except Exception:
            continue

    # 3. Дополнительная проверка через HTML главной страницы блога
    try:
        html = fetch_html(f'https://boosty.to/{BLOG_NAME}')
        if not stats['avatar']:
            av_match = re.search(r'"avatarUrl"\s*:\s*"(https://images\.boosty\.to/[^"]+)"', html)
            if av_match:
                stats['avatar'] = av_match.group(1)

        if not goals_found:
            # Ищем блок цели по подписчикам в SSR-состоянии страницы
            m1 = re.search(r'"currentSum"\s*:\s*(\d+(?:\.\d+)?)\s*,\s*"targetSum"\s*:\s*(\d+(?:\.\d+)?)', html)
            m2 = re.search(r'"targetSum"\s*:\s*(\d+(?:\.\d+)?)\s*,\s*"currentSum"\s*:\s*(\d+(?:\.\d+)?)', html)
            if m1:
                goals_found.append({
                    "current": int(float(m1.group(1))),
                    "target": int(float(m1.group(2))),
                    "type": "subscribers",
                    "description": stats["goals"][0]["description"]
                })
            elif m2:
                goals_found.append({
                    "current": int(float(m2.group(2))),
                    "target": int(float(m2.group(1))),
                    "type": "subscribers",
                    "description": stats["goals"][0]["description"]
                })
    except Exception:
        pass

    if goals_found:
        stats["goals"] = goals_found

    return stats

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
        print(f"Ошибка загрузки списка бандлов: {e}")
    return []

def get_all_blog_posts():
    """Полная выгрузка всех постов блога для точного сопоставления"""
    all_posts = []
    offset = ""
    for _ in range(15):
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
            time.sleep(0.12)
        except Exception as e:
            print(f"Ошибка пагинации постов: {e}")
            break
    print(f"Всего выгружено постов блога: {len(all_posts)}")
    return all_posts

def extract_strict_chapters(text):
    """
    СТРОГИЙ парсер количества глав.
    Берет число ТОЛЬКО если рядом явно написано 'Глава/Главы/Гл.' или это диапазон в квадратных скобках [1-11].
    Игнорирует числа в названиях вроде '100 лет AFK' или '99 уровень'.
    """
    if not text or not isinstance(text, str):
        return 0

    # Убираем годы
    cleaned = re.sub(r'\b202\d\b', '', text)
    candidates = []

    # 1. Формат в квадратных скобках: [1-11], [1-50 Главы], [11-25]
    bracket_ranges = re.findall(r'\[\s*(\d+)\s*[-—–]\s*(\d+)\s*(?:глав[аы]?|гл\.?|сери[ияй]|все\s*главы)?\s*\]', cleaned, re.IGNORECASE)
    for start_num, end_num in bracket_ranges:
        val = int(end_num)
        if 0 < val < 2500:
            candidates.append(val)

    # 2. Формат со словом ГЛАВА / ГЛАВЫ: "9-19 Главы", "1-11 главы", "316 Глава", "Главы 1-11"
    glava_after = re.findall(r'(?:\b\d+\s*[-—–]\s*)?(\d+)\s*(?:глав[аы]?|гл\.?)\b', cleaned, re.IGNORECASE)
    for num in glava_after:
        val = int(num)
        if 0 < val < 2500:
            candidates.append(val)

    glava_before = re.findall(r'\b(?:глав[аы]?|гл\.?)\s*(?:\[\s*)?(?:\d+\s*[-—–]\s*)?(\d+)', cleaned, re.IGNORECASE)
    for num in glava_before:
        val = int(num)
        if 0 < val < 2500:
            candidates.append(val)

    return max(candidates) if candidates else 0

def extract_all_strings_from_post(post):
    strings = []
    if not isinstance(post, dict):
        return strings
    if post.get('title'):
        strings.append(str(post['title']))
    for key in ['teaser', 'data']:
        blocks = post.get(key)
        if isinstance(blocks, list):
            for b in blocks:
                if isinstance(b, dict):
                    for subkey in ['title', 'content', 'text', 'description']:
                        if b.get(subkey):
                            strings.append(str(b[subkey]))
    tags = post.get('tags')
    if isinstance(tags, list):
        for t in tags:
            if isinstance(t, dict) and t.get('title'):
                strings.append(str(t['title']))
    return strings

def extract_image_from_post(post):
    """Достает URL картинки из поста (для обложек тегов из 1-й главы)"""
    if not isinstance(post, dict):
        return ""
    for key in ['teaser', 'data']:
        blocks = post.get(key)
        if isinstance(blocks, list):
            for b in blocks:
                if isinstance(b, dict):
                    if b.get('url') and 'images.boosty.to' in str(b.get('url')):
                        return str(b['url']).split('?')[0] + '?croped=1&mh=420&mw=320'
                    rend = b.get('rendition')
                    if isinstance(rend, dict) and rend.get('url') and 'images.boosty.to' in str(rend.get('url')):
                        return str(rend['url']).split('?')[0] + '?croped=1&mh=420&mw=320'
    dump = json.dumps(post)
    m = re.search(r'https://images\.boosty\.to/image/[a-f0-9\-]+', dump)
    if m:
        return m.group(0) + '?croped=1&mh=420&mw=320'
    return ""

def detect_post_tier(post):
    if not isinstance(post, dict):
        return {"name": "Базовый уровень 1 ур. 250 ₽", "short": "Базовый 1 ур.", "level": 1, "is_free": False}

    sub_obj = post.get('subscriptionLevel') or post.get('subscription_level') or {}
    price = post.get('price', 0)
    has_access = post.get('hasAccess', False)

    if has_access and not sub_obj and price == 0:
        return {"name": "Бесплатный доступ", "short": "Бесплатно", "level": 1, "is_free": True}

    sub_dump = json.dumps(sub_obj, ensure_ascii=False).lower()
    post_dump = json.dumps({
        'sub': sub_obj,
        'price': price,
        'tier': post.get('tier')
    }, ensure_ascii=False).lower()

    if 'основной уровень' in post_dump or '3988841' in post_dump or '500' in sub_dump or (isinstance(price, (int, float)) and price >= 450):
        return {
            "name": "Основной уровень 2 ур. 500 ₽",
            "short": "Основной 2 ур.",
            "level": 2,
            "is_free": False
        }

    return {
        "name": "Базовый уровень 1 ур. 250 ₽",
        "short": "Базовый 1 ур.",
        "level": 1,
        "is_free": False
    }

def extract_readable_post_range(post, index_num):
    strings = extract_all_strings_from_post(post)
    for s in strings:
        m = re.search(r'(\d+\s*[-—–]\s*\d+\s*(?:глав[аы]?|гл\.?)|\d+\s*(?:глав[аы]?|гл\.?)|\[\s*\d+\s*[-—–]\s*\d+.*?\])', s, re.IGNORECASE)
        if m:
            res = m.group(1).strip('[] ')
            if not re.search(r'глав', res, re.IGNORECASE):
                res += " главы"
            return res
    if post.get('title') and len(str(post['title']).strip()) > 2:
        t = str(post['title']).strip()
        return t[:34] + ('...' if len(t) > 34 else '')
    return f"Выпуск #{index_num}"

def clean_bundle_title(raw_title):
    cleaned = re.sub(r'\[.*?\]', '', raw_title)
    cleaned = re.sub(r'(?i)\s*глав[аы]?\s*$', '', cleaned).strip()
    return cleaned if cleaned else raw_title.strip()

def normalize_full_title(text):
    """Полная нормализация названия без обрезки до 12 символов, чтобы не путать похожие манхвы"""
    t = re.sub(r'\[.*?\]|\(.*?\)', '', text.lower())
    t = re.sub(r'(?i)\b(?:глав[аы]?|гл|все|манхва|маньхуа|манга|озвучка)\b', '', t)
    return re.sub(r'[^а-яa-z0-9]', '', t)

def fetch_strict_bundle_posts(bundle, all_blog_posts, posts_by_id, global_first_post_id):
    """
    Тщательный и строгий сбор ТОЛЬКО тех постов, которые реально принадлежат этому бандлу.
    """
    bundle_id = str(bundle.get('id', '')).strip()
    raw_title = bundle.get('title', '')
    clean_title = clean_bundle_title(raw_title)
    expected_count = int(bundle.get('publishedPostsCounter') or 0)
    thumb = bundle.get('thumbnail') or {}
    thumb_id = thumb.get('id', '')

    # Шаг 1. Пробуем официальные API ленты бандла
    api_urls = [
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=50',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=50&bundle_id={bundle_id}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=50&bundleId={bundle_id}'
    ]
    for url in api_urls:
        try:
            raw = fetch_json(url)
            posts = []
            if isinstance(raw, dict):
                data_obj = raw.get('data', raw)
                if isinstance(data_obj, list):
                    posts = data_obj
                elif isinstance(data_obj, dict):
                    posts = data_obj.get('posts') or data_obj.get('data') or []
            if posts and isinstance(posts, list):
                # Проверяем, что API не вернуло просто общую стену блога (сверяем количество или несовпадение 1-го поста)
                is_unfiltered_wall = (
                    len(posts) > 15 and expected_count < 10 and
                    posts[0].get('id') == global_first_post_id
                )
                if not is_unfiltered_wall:
                    posts.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
                    time.sleep(0.12)
                    return posts
        except Exception:
            continue

    time.sleep(0.12)

    # Шаг 2. Парсим SSR-страницу самой ленты бандла (&view=feed) и вытаскиваем ID постов
    try:
        feed_html = fetch_html(f'https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed')
        post_ids_in_html = re.findall(r'/posts/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', feed_html)
        if not post_ids_in_html:
            post_ids_in_html = re.findall(r'"postId"\s*:\s*"([a-f0-9\-]{36})"', feed_html)
        found_from_html = []
        seen_html = set()
        for pid in post_ids_in_html:
            if pid not in seen_html and pid in posts_by_id:
                found_from_html.append(posts_by_id[pid])
                seen_html.add(pid)
        if found_from_html:
            found_from_html.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
            return found_from_html
    except Exception:
        pass

    # Шаг 3. Строгое сопоставление по полному названию тайтла и ID обложки (без обрезки до 12 букв!)
    norm_bundle = normalize_full_title(clean_title)
    strict_matched = []
    for p in all_blog_posts:
        p_dump = json.dumps(p, ensure_ascii=False)
        if bundle_id in p_dump or (thumb_id and thumb_id in p_dump):
            strict_matched.append(p)
            continue

        if len(norm_bundle) >= 6:
            for t_str in extract_all_strings_from_post(p):
                norm_post_str = normalize_full_title(t_str)
                # Проверяем полное вхождение нормализованного названия манхвы
                if norm_bundle in norm_post_str:
                    strict_matched.append(p)
                    break

    strict_matched.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    return strict_matched

def get_posts_by_tag_id(tag_id):
    url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=50&postsTagsIds={tag_id}'
    try:
        raw = fetch_json(url)
        data = raw.get('data', [])
        if isinstance(data, list):
            data.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
            return data
    except Exception:
        pass
    return []

def build_posts_list_and_meta(matched_posts, default_ts):
    posts_links = []
    has_free_chapters = False
    free_badge_text = ""
    max_chapters = 0
    detected_level = 1

    if matched_posts:
        for mp in matched_posts:
            t_info = detect_post_tier(mp)
            if not t_info["is_free"]:
                detected_level = t_info["level"]
                break

        # Проверяем главы строго по самым свежим постам этого бандла
        for idx, mp in enumerate(matched_posts[:25], 1):
            mp_id = mp.get('id')
            mp_ts = mp.get('publishTime') or mp.get('createdAt') or default_ts
            mp_date = datetime.datetime.fromtimestamp(mp_ts).strftime("%d/%m/%Y")
            label = extract_readable_post_range(mp, len(matched_posts) - idx + 1)
            t_info = detect_post_tier(mp)

            if t_info["is_free"]:
                has_free_chapters = True
                if not free_badge_text:
                    free_badge_text = f"🔥 {label} бесплатно"

            for text_line in extract_all_strings_from_post(mp):
                ch_num = extract_strict_chapters(text_line)
                if ch_num > max_chapters:
                    max_chapters = ch_num

            if mp_id:
                posts_links.append({
                    "label": f"{label} ({t_info['short']})",
                    "raw_range": label,
                    "tier_short": t_info["short"],
                    "is_free": t_info["is_free"],
                    "date": mp_date,
                    "url": f"https://boosty.to/{BLOG_NAME}/posts/{mp_id}"
                })

    return posts_links, has_free_chapters, free_badge_text, max_chapters, detected_level

def process_data(extra_cfg):
    bundles_list = get_all_bundles()
    if not bundles_list:
        return []
        
    all_blog_posts = get_all_blog_posts()
    posts_by_id = {p.get('id'): p for p in all_blog_posts if isinstance(p, dict) and p.get('id')}
    global_first_post_id = all_blog_posts[0].get('id') if all_blog_posts else None

    result = []
    total_b = len(bundles_list)
    print(f"Начинаем глубокий парсинг {total_b} бандлов...")

    for idx, item in enumerate(bundles_list, 1):
        if not isinstance(item, dict):
            continue
            
        bundle_id = str(item.get('id', '')).strip()
        if not bundle_id:
            continue
            
        raw_title = item.get('title', 'Без названия')
        clean_title = clean_bundle_title(raw_title)
        
        cover = 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Обложка'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            base_url = thumb['url'].split('&croped=')[0]
            cover = base_url + '&croped=1&mh=420&mw=320'
            
        # Строгое извлечение глав из названия самого бандла и обложки
        bundle_chapters = extract_strict_chapters(raw_title)
        if isinstance(thumb, dict) and thumb.get('title'):
            ch_thumb = extract_strict_chapters(thumb['title'])
            if ch_thumb > bundle_chapters:
                bundle_chapters = ch_thumb
                
        posts_count = int(item.get('publishedPostsCounter') or 1)
        matched_posts = fetch_strict_bundle_posts(item, all_blog_posts, posts_by_id, global_first_post_id)
        ts = item.get('publishedAt') or item.get('createdAt') or int(time.time())
        feed_link = f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed"

        posts_links, has_free, free_text, post_max_ch, detected_level = build_posts_list_and_meta(matched_posts, ts)

        if matched_posts:
            latest_ts = matched_posts[0].get('publishTime') or matched_posts[0].get('createdAt')
            if latest_ts:
                ts = latest_ts

        # Если в самом последнем посте ленты бандла найдены главы — берем максимум между названием бандла и его реальными постами
        chapters = max(bundle_chapters, post_max_ch)

        tier_name = "Основной уровень 2 ур. 500 ₽" if detected_level == 2 else "Базовый уровень 1 ур. 250 ₽"
        sub_link = SUB_LINKS[2] if detected_level == 2 else SUB_LINKS[1]

        dt = datetime.datetime.fromtimestamp(ts)
        formatted_date = dt.strftime("%d/%m/%Y")
        
        result.append({
            "id": bundle_id,
            "title": clean_title,
            "image": cover,
            "chapters": chapters,
            "posts_count": len(posts_links) if posts_links else posts_count,
            "posts_list": posts_links,
            "has_free": has_free,
            "free_text": free_text,
            "last_update": formatted_date,
            "timestamp": ts,
            "tier": tier_name,
            "tier_level": detected_level,
            "sub_link": sub_link,
            "link": feed_link
        })

    # Обрабатываем 3 отдельных тайтла по Тэгам (обложку берем с их ПЕРВЫХ постов / 1-х глав)
    for custom in extra_cfg.get("custom_tags", []):
        tag_id = str(custom.get("tag_id", "")).strip()
        c_title = custom.get("title", "Без названия")
        c_link = custom.get("link") or f"https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id}"
        c_image = custom.get("image", "").strip()
        
        tag_posts = get_posts_by_tag_id(tag_id) if tag_id else []
        ts = int(time.time())
        posts_links, has_free, free_text, post_max_ch, detected_level = build_posts_list_and_meta(tag_posts, ts)

        if tag_posts:
            ts = tag_posts[0].get('publishTime') or tag_posts[0].get('createdAt') or ts
            # Берем фото из самого ПЕРВОГО поста этого тега (tag_posts[-1] — это 1-я глава)
            if not c_image:
                first_chapter_post = tag_posts[-1]
                c_image = extract_image_from_post(first_chapter_post) or extract_image_from_post(tag_posts[0])

        if not c_image:
            c_image = "https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка"

        lvl = custom.get("tier_level") or detected_level or 1
        ch = max(custom.get("chapters", 0), post_max_ch)
        tier_name = "Основной уровень 2 ур. 500 ₽" if lvl == 2 else "Базовый уровень 1 ур. 250 ₽"

        result.append({
            "id": custom.get("id", f"tag_{tag_id}"),
            "title": c_title,
            "image": c_image,
            "chapters": ch,
            "posts_count": len(tag_posts) if tag_posts else 1,
            "posts_list": posts_links,
            "has_free": has_free,
            "free_text": free_text,
            "last_update": datetime.datetime.fromtimestamp(ts).strftime("%d/%m/%Y"),
            "timestamp": ts,
            "tier": tier_name,
            "tier_level": lvl,
            "sub_link": SUB_LINKS[2] if lvl == 2 else SUB_LINKS[1],
            "link": c_link
        })

    return result

if __name__ == '__main__':
    extra_cfg = load_extra_config()
    stats_data = get_blog_stats_and_goals()
    with open('stats.json', 'w', encoding='utf-8') as f:
        json.dump(stats_data, f, ensure_ascii=False, indent=2)
    print(f"Статистика сохранена: платных подписчиков в цели = {stats_data['goals'][0]['current']}")

    data = process_data(extra_cfg)
    if data and len(data) > 5:
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Успешно обновлено {len(data)} тайтлов.")
    else:
        print("Внимание: сохранен предыдущий кэш data.json (Fallback).")
