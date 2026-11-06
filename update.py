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
    return {
        "custom_tags": [
            {
                "id": "tag_7288659",
                "tag_id": "7288659",
                "title": "Я прокачиваюсь во сне убивая монстров",
                "image": "",
                "tier_level": 1,
                "chapters": 0,
                "link": "https://boosty.to/darktaka?postsTagsIds=7288659"
            },
            {
                "id": "tag_26379728",
                "tag_id": "26379728",
                "title": "Судный день я король вирусов",
                "image": "",
                "tier_level": 1,
                "chapters": 0,
                "link": "https://boosty.to/darktaka?postsTagsIds=26379728"
            },
            {
                "id": "tag_26206841",
                "tag_id": "26206841",
                "title": "Великий расхититель гробниц",
                "image": "",
                "tier_level": 1,
                "chapters": 0,
                "link": "https://boosty.to/darktaka?postsTagsIds=26206841"
            }
        ]
    }

def get_blog_stats_and_goals():
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

    goals_found = []
    target_urls = [
        f'https://api.boosty.to/v1/target/{BLOG_NAME}/',
        f'https://api.boosty.to/v1/target/{BLOG_NAME}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/target/'
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

    try:
        html = fetch_html(f'https://boosty.to/{BLOG_NAME}')
        if not stats['avatar']:
            av_match = re.search(r'"avatarUrl"\s*:\s*"(https://images\.boosty\.to/[^"]+)"', html)
            if av_match:
                stats['avatar'] = av_match.group(1)

        if not goals_found:
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
    all_posts = []
    offset = ""
    for _ in range(16):
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
    print(f"Всего выгружено постов блога: {len(all_posts)}")
    return all_posts

def parse_strict_chapter_info(text):
    """
    СТРОГИЙ парсинг глав из строки.
    Возвращает (display_range, start_ch, end_ch).
    Распознает только явные конструкции:
    - '9-19 Главы', '1-50 главы', 'Главы 1-11'
    - '[1-50]', '[1-37 Главы]'
    - '316 Глава'
    Никакие '100 лет AFK' или '99 уровень' сюда не проходят.
    """
    if not text or not isinstance(text, str):
        return ("", 0, 0)

    cleaned = re.sub(r'\b202\d\b', '', text)

    # 1. Диапазон перед словом Глава/Главы: "9-19 Главы", "1-11 главы"
    m1 = re.search(r'\b(\d+)\s*[-—–]\s*(\d+)\s*(?:глав[аы]?|гл\.?)\b', cleaned, re.IGNORECASE)
    if m1:
        s, e = int(m1.group(1)), int(m1.group(2))
        if 0 < s <= e < 2500:
            return (f"{s}-{e} гл.", s, e)

    # 2. Слово Глава/Главы перед диапазоном: "ГЛАВЫ [1-50]", "Главы 1-19"
    m2 = re.search(r'(?:глав[аы]?|гл\.?)\s*[\[\(]?\s*(\d+)\s*[-—–]\s*(\d+)', cleaned, re.IGNORECASE)
    if m2:
        s, e = int(m2.group(1)), int(m2.group(2))
        if 0 < s <= e < 2500:
            return (f"{s}-{e} гл.", s, e)

    # 3. Диапазон в квадратных скобках: "[1-50]", "[1-216]"
    m3 = re.search(r'\[\s*(\d+)\s*[-—–]\s*(\d+)\s*(?:глав[аы]?|гл\.?|все\s*главы)?\s*\]', cleaned, re.IGNORECASE)
    if m3:
        s, e = int(m3.group(1)), int(m3.group(2))
        if 0 < s <= e < 2500:
            return (f"{s}-{e} гл.", s, e)

    # 4. Одиночный номер главы со словом Глава: "316 Глава"
    m4 = re.search(r'\b(\d+)\s*(?:глав[аы]?|гл\.?)\b', cleaned, re.IGNORECASE)
    if m4:
        e = int(m4.group(1))
        if 0 < e < 2500:
            return (f"{e} гл.", e, e)

    return ("", 0, 0)

def extract_post_titles_strict(post):
    """Извлекает только официальный заголовок поста и заголовок обложки видео/тизера"""
    res = []
    if not isinstance(post, dict):
        return res
    if post.get('title'):
        res.append(str(post['title']))
    for key in ['teaser', 'data']:
        blocks = post.get(key)
        if isinstance(blocks, list):
            for b in blocks:
                if isinstance(b, dict) and b.get('title'):
                    res.append(str(b['title']))
    return res

def extract_high_res_cover_from_post(post):
    """
    Извлекает обложку из видеоролика (ok_video) или изображения поста
    в точном формате витрины (400x550).
    """
    if not isinstance(post, dict):
        return ""
    for key in ['data', 'teaser']:
        blocks = post.get(key)
        if isinstance(blocks, list):
            for b in blocks:
                if not isinstance(b, dict):
                    continue
                for field in ['preview', 'url', 'image']:
                    val = b.get(field)
                    if isinstance(val, str) and 'images.boosty.to/image/' in val:
                        base = val.split('?')[0]
                        return f"{base}?croped=1&mh=550&mw=400"
                rend = b.get('rendition')
                if isinstance(rend, dict) and isinstance(rend.get('url'), str) and 'images.boosty.to/image/' in rend['url']:
                    base = rend['url'].split('?')[0]
                    return f"{base}?croped=1&mh=550&mw=400"

    dump = json.dumps(post)
    matches = re.findall(r'https://images\.boosty\.to/image/[a-f0-9\-]+', dump)
    if matches:
        return f"{matches[0]}?croped=1&mh=550&mw=400"
    return ""

def detect_post_tier_strict(post):
    """
    Строгое определение уровня подписки поста.
    Бесплатным считается ТОЛЬКО полностью открытый пост без subscriptionLevel и с price == 0.
    """
    if not isinstance(post, dict):
        return {"name": "Базовый уровень 1 ур. 250 ₽", "short": "Базовый 1 ур.", "level": 1, "is_free": False}

    sub_obj = post.get('subscriptionLevel') or post.get('subscription_level')
    price = post.get('price') or 0
    has_access = bool(post.get('hasAccess'))

    # Если у поста есть уровень подписки, цена > 0 или нет открытого доступа — он НЕ бесплатный
    is_locked = bool(sub_obj) or (isinstance(price, (int, float)) and price > 0) or (not has_access)

    if not is_locked and has_access:
        return {
            "name": "Бесплатный доступ",
            "short": "Бесплатно",
            "level": 1,
            "is_free": True
        }

    sub_dump = json.dumps(sub_obj or {}, ensure_ascii=False).lower()
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

def fetch_isolated_bundle_posts(bundle, posts_by_id, global_first_post_id):
    """
    Строго изолированное получение постов конкретного бандла ТОЛЬКО по его ID.
    Никакого нечеткого поиска по словам!
    """
    bundle_id = str(bundle.get('id', '')).strip()
    expected_count = int(bundle.get('publishedPostsCounter') or 0)

    # 1. Прямой запрос к ленте бандла
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
                # Защита: проверяем, не вернул ли сервер общую стену блога вместо конкретного бандла
                is_wall_fallback = (
                    len(posts) > max(expected_count + 2, 10) and
                    posts[0].get('id') == global_first_post_id
                )
                if not is_wall_fallback:
                    posts.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
                    time.sleep(0.08)
                    return posts
        except Exception:
            continue

    time.sleep(0.08)

    # 2. Парсинг SSR-разметки самой страницы ленты бандла (&view=feed)
    try:
        feed_html = fetch_html(f'https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed')
        post_ids = re.findall(r'/posts/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', feed_html)
        if not post_ids:
            post_ids = re.findall(r'"post"\s*:\s*\{\s*"id"\s*:\s*"([a-f0-9\-]{36})"', feed_html)
        matched = []
        seen = set()
        for pid in post_ids:
            if pid not in seen and pid in posts_by_id:
                matched.append(posts_by_id[pid])
                seen.add(pid)
        if matched:
            matched.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
            return matched
    except Exception:
        pass

    return []

def fetch_all_tag_posts(tag_id):
    """Полный парсинг всех постов скрытого тега по ссылке postsTagsIds"""
    all_tag_posts = []
    offset = ""
    for _ in range(6):
        url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=50&postsTagsIds={tag_id}'
        if offset:
            url += f'&offset={urllib.parse.quote(str(offset))}'
        try:
            raw = fetch_json(url)
            data = raw.get('data', [])
            if not isinstance(data, list) or not data:
                break
            all_tag_posts.extend(data)
            extra = raw.get('extra', {})
            if extra.get('isLast') or not extra.get('offset'):
                break
            offset = extra.get('offset')
            time.sleep(0.1)
        except Exception:
            break
    all_tag_posts.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    return all_tag_posts

def analyze_isolated_posts(posts_list, fallback_ts):
    posts_links = []
    has_free_chapters = False
    free_badge_text = ""
    detected_level = 1
    max_chapter_found = 0
    latest_range_label = ""
    has_1_to_n_start = False

    if not posts_list:
        return (
            posts_links,
            has_free_chapters,
            free_badge_text,
            detected_level,
            max_chapter_found,
            latest_range_label,
            fallback_ts,
            has_1_to_n_start
        )

    for mp in posts_list:
        t_info = detect_post_tier_strict(mp)
        if not t_info["is_free"]:
            detected_level = t_info["level"]
            break

    oldest_ts = posts_list[-1].get('publishTime') or posts_list[-1].get('createdAt') or fallback_ts

    for idx, mp in enumerate(posts_list[:35], 1):
        mp_id = mp.get('id')
        mp_ts = mp.get('publishTime') or mp.get('createdAt') or fallback_ts
        mp_date = datetime.datetime.fromtimestamp(mp_ts).strftime("%d/%m/%Y")
        t_info = detect_post_tier_strict(mp)

        cur_range = ""
        cur_start = 0
        cur_end = 0

        for line in extract_post_titles_strict(mp):
            r_str, s_ch, e_ch = parse_strict_chapter_info(line)
            if e_ch > cur_end:
                cur_range = r_str
                cur_start = s_ch
                cur_end = e_ch

        if cur_start == 1 and cur_end > 0:
            has_1_to_n_start = True

        if idx == 1 and cur_end > 0:
            latest_range_label = cur_range
            max_chapter_found = cur_end
        elif cur_end > max_chapter_found:
            max_chapter_found = cur_end
            if not latest_range_label:
                latest_range_label = cur_range

        if not cur_range:
            raw_t = str(mp.get('title') or '').strip()
            cur_range = raw_t[:28] if len(raw_t) > 2 else f"Часть #{len(posts_list) - idx + 1}"

        # Плашка бесплатных глав ставится ТОЛЬКО если пост реально открыт и начинается с 1-й главы
        if t_info["is_free"] and cur_start == 1 and cur_end > 0:
            has_free_chapters = True
            free_badge_text = f"🔥 1-{cur_end} главы бесплатно"

        if mp_id:
            posts_links.append({
                "label": f"{cur_range} ({t_info['short']})",
                "raw_range": cur_range,
                "tier_short": t_info["short"],
                "is_free": t_info["is_free"],
                "date": mp_date,
                "url": f"https://boosty.to/{BLOG_NAME}/posts/{mp_id}"
            })

    return (
        posts_links,
        has_free_chapters,
        free_badge_text,
        detected_level,
        max_chapter_found,
        latest_range_label,
        oldest_ts,
        has_1_to_n_start
    )

def clean_bundle_title(raw_title):
    cleaned = re.sub(r'\[.*?\]', '', raw_title)
    cleaned = re.sub(r'(?i)\s*глав[аы]?\s*$', '', cleaned).strip()
    return cleaned if cleaned else raw_title.strip()

def make_metric_tag_slug(title_str):
    """Создает уникальный кастомный тег для Яндекс.Метрики"""
    translit_map = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
        'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
        'х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
    }
    res = []
    for ch in title_str.lower():
        if ch in translit_map:
            res.append(translit_map[ch])
        elif ch.isalnum():
            res.append(ch)
        else:
            res.append('_')
    slug = re.sub(r'_+', '_', ''.join(res)).strip('_')
    return f"title_{slug[:40]}" if slug else "title_item"

def process_data(extra_cfg):
    bundles_list = get_all_bundles()
    if not bundles_list:
        return []
        
    all_blog_posts = get_all_blog_posts()
    posts_by_id = {p.get('id'): p for p in all_blog_posts if isinstance(p, dict) and p.get('id')}
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
        
        cover = 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Обложка'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            base_url = thumb['url'].split('?')[0]
            cover = f"{base_url}?croped=1&mh=550&mw=400"
            
        # Главы из самого названия бандла и его обложки
        b_range, b_start, b_end = parse_strict_chapter_info(raw_title)
        if isinstance(thumb, dict) and thumb.get('title'):
            t_range, t_start, t_end = parse_strict_chapter_info(thumb['title'])
            if t_end > b_end:
                b_end = t_end
                if not b_range:
                    b_range = t_range
            if t_start == 1:
                b_start = 1

        posts_count = int(item.get('publishedPostsCounter') or 1)
        matched_posts = fetch_isolated_bundle_posts(item, posts_by_id, global_first_post_id)

        created_ts = item.get('createdAt') or item.get('publishedAt') or int(time.time())
        updated_ts = item.get('publishedAt') or item.get('updatedAt') or created_ts
        feed_link = f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed"

        (
            posts_links,
            has_free,
            free_text,
            detected_level,
            post_max_ch,
            latest_range_str,
            oldest_post_ts,
            started_from_ch1
        ) = analyze_isolated_posts(matched_posts, created_ts)

        if matched_posts:
            latest_ts = matched_posts[0].get('publishTime') or matched_posts[0].get('createdAt')
            if latest_ts:
                updated_ts = latest_ts
            if oldest_post_ts < created_ts:
                created_ts = oldest_post_ts

        # Точное число глав (из шапки бандла или его последнего поста в ленте)
        chapters = max(b_end, post_max_ch)
        if not latest_range_str:
            latest_range_str = b_range if b_range else (f"1-{chapters} гл." if chapters > 0 else "Новые главы")

        tier_name = "Основной уровень 2 ур. 500 ₽" if detected_level == 2 else "Базовый уровень 1 ур. 250 ₽"
        sub_link = SUB_LINKS[2] if detected_level == 2 else SUB_LINKS[1]
        metric_tag = make_metric_tag_slug(clean_title)

        result.append({
            "id": bundle_id,
            "metric_tag": metric_tag,
            "title": clean_title,
            "image": cover,
            "chapters": chapters,
            "latest_range": latest_range_str,
            "posts_count": len(posts_links) if posts_links else posts_count,
            "posts_list": posts_links,
            "has_free": has_free,
            "free_text": free_text,
            "last_update": datetime.datetime.fromtimestamp(updated_ts).strftime("%d/%m/%Y"),
            "timestamp": updated_ts,
            "created_ts": created_ts,
            "is_1_to_n": bool(b_start == 1 or started_from_ch1),
            "tier": tier_name,
            "tier_level": detected_level,
            "sub_link": sub_link,
            "link": feed_link
        })

    # Парсинг скрытых постов по ТЭГАМ (postsTagsIds) с вытягиванием обложки из ролика "1-N глав"
    for custom in extra_cfg.get("custom_tags", []):
        tag_id = str(custom.get("tag_id", "")).strip()
        c_title = custom.get("title", "Без названия")
        c_link = custom.get("link") or f"https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id}"
        c_image = custom.get("image", "").strip()
        
        tag_posts = fetch_all_tag_posts(tag_id) if tag_id else []
        now_ts = int(time.time())

        (
            posts_links,
            has_free,
            free_text,
            detected_level,
            post_max_ch,
            latest_range_str,
            oldest_post_ts,
            started_from_ch1
        ) = analyze_isolated_posts(tag_posts, now_ts)

        updated_ts = now_ts
        if tag_posts:
            updated_ts = tag_posts[0].get('publishTime') or tag_posts[0].get('createdAt') or now_ts

            # Ищем пост, где есть "1-N глав", чтобы взять его обложку в нужном формате
            if not c_image:
                first_range_post = None
                for tp in reversed(tag_posts):
                    for line in extract_post_titles_strict(tp):
                        _, s_ch, e_ch = parse_strict_chapter_info(line)
                        if s_ch == 1 and e_ch > 0:
                            first_range_post = tp
                            break
                    if first_range_post:
                        break
                chosen_post = first_range_post or tag_posts[-1] or tag_posts[0]
                c_image = extract_high_res_cover_from_post(chosen_post) or extract_high_res_cover_from_post(tag_posts[0])

        if not c_image:
            c_image = "https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка"

        lvl = custom.get("tier_level") or detected_level or 1
        ch = post_max_ch if post_max_ch > 0 else custom.get("chapters", 0)
        tier_name = "Основной уровень 2 ур. 500 ₽" if lvl == 2 else "Базовый уровень 1 ур. 250 ₽"
        metric_tag = make_metric_tag_slug(c_title)

        result.append({
            "id": custom.get("id", f"tag_{tag_id}"),
            "metric_tag": metric_tag,
            "title": c_title,
            "image": c_image,
            "chapters": ch,
            "latest_range": latest_range_str or (f"1-{ch} гл." if ch > 0 else "Все главы"),
            "posts_count": len(tag_posts) if tag_posts else 1,
            "posts_list": posts_links,
            "has_free": has_free,
            "free_text": free_text,
            "last_update": datetime.datetime.fromtimestamp(updated_ts).strftime("%d/%m/%Y"),
            "timestamp": updated_ts,
            "created_ts": oldest_post_ts,
            "is_1_to_n": True,
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

    data = process_data(extra_cfg)
    if data and len(data) > 5:
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Успешно обновлено {len(data)} тайтлов.")
    else:
        print("Сохранен предыдущий кэш data.json (Fallback).")
