import urllib.request
import urllib.parse
import json
import re
import datetime
import time
import os

BLOG_NAME = 'darktaka'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
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


def clean_image_url(url):
    """
    Убирает принудительное сжатие ?croped=1&mh=550&mw=400,
    чтобы текст на обложках не сплющивался на телефонах.
    """
    if not url or not isinstance(url, str):
        return ""
    if 'images.boosty.to/image/' in url:
        return url.split('?')[0]
    return url


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
    for _ in range(25):
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
            time.sleep(0.08)
        except Exception as e:
            print(f"Ошибка пагинации постов: {e}")
            break
    print(f"Всего выгружено постов блога: {len(all_posts)}")
    return all_posts


def normalize_for_match(s):
    """Нормализация строки для точного сравнения названий тайтлов"""
    if not s:
        return ""
    s = s.lower().replace('ё', 'е')
    s = re.sub(r'\[.*?\]|\(.*?\)', ' ', s)
    s = re.sub(r'(?:глав[аы]?|гл\.?|часть|сезон|все\s*главы)\s*\d*[-—–]?\d*', ' ', s)
    s = re.sub(r'[^a-zа-я0-9\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def clean_bundle_title(raw_title):
    if not raw_title:
        return "Без названия"
    # Убираем скобки в конце или начале вида [1-50], [Все главы], обрывки "[Все"
    cleaned = re.sub(r'\[.*?\]', '', raw_title)
    cleaned = re.sub(r'\[[^\]]*$', '', cleaned)
    cleaned = re.sub(r'(?i)\b(?:глав[аы]?|гл\.?)\s*\d+\s*[-—–]\s*\d+\b', '', cleaned)
    cleaned = re.sub(r'(?i)\b\d+\s*[-—–]\s*\d+\s*(?:глав[аы]?|гл\.?)\b', '', cleaned)
    cleaned = re.sub(r'(?i)\s*глав[аы]?\s*$', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip(' -—–:|•')
    return cleaned if cleaned else raw_title.strip()


def parse_strict_chapter_info(text):
    """
    Точный парсинг глав из заголовка бандла или поста.
    Возвращает (display_range, start_ch, end_ch).
    Не путает '100 лет AFK', '999 этажей', '82-08' с номерами глав.
    """
    if not text or not isinstance(text, str):
        return ("", 0, 0)

    cleaned = re.sub(r'\b202\d\b', '', text)
    # Исключаем числа, за которыми сразу идут сюжетные слова
    cleaned = re.sub(
        r'\b\d+\s*(?:лет|год[ао]?в?|этаж(?:ей|а)?|уров(?:ень|ня|ней)|ранг[а]?|мир(?:ов|а)?|раз|тысяч|миллион(?:ов)?)\b',
        '',
        cleaned,
        flags=re.IGNORECASE
    )

    candidates = []

    # 1. Диапазон перед словом Глава/Главы/Ч: "9-19 Главы", "1 - 50 гл."
    for m in re.finditer(r'\b(\d+)\s*[-—–~]\s*(\d+)\s*(?:глав[аы]?|гл\.?|ч\.?|част[ьи])\b', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 < s <= e < 2500:
            candidates.append((f"{s}-{e} гл.", s, e))

    # 2. Слово Глава/Главы перед диапазоном: "Главы 1-50", "ГЛ. [12-30]"
    for m in re.finditer(r'(?:глав[аы]?|гл\.?)\s*[\[\(]?\s*(\d+)\s*[-—–~]\s*(\d+)', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 < s <= e < 2500:
            candidates.append((f"{s}-{e} гл.", s, e))

    # 3. Диапазон в квадратных или круглых скобках: "[1-50]", "(1-37 главы)", "[1-81 Все"
    for m in re.finditer(r'[\[\(]\s*(\d+)\s*[-—–~]\s*(\d+)\s*(?:глав[аы]?|гл\.?|все\s*главы|все)?\s*[\]\)]?', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 < s <= e < 2500 and not (s == 82 and e == 8):
            candidates.append((f"{s}-{e} гл.", s, e))

    # 4. Диапазон в самом конце строки после тире/двоеточия: "Название тайтла 1-45"
    for m in re.finditer(r'(?:[-—–:|]\s*|\s+)(\d+)\s*[-—–]\s*(\d+)\s*$', cleaned.strip()):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 < s <= e < 2500 and not (s == 82 and e == 8):
            candidates.append((f"{s}-{e} гл.", s, e))

    # 5. Одиночный номер со словом Глава: "316 Глава", "Глава 25", "1-я по 50-ю главу"
    for m in re.finditer(r'\b(?:до|по)\s*(\d+)\s*(?:-?ю|-?й)?\s*(?:глав[уы]?|гл\.?)\b', cleaned, re.IGNORECASE):
        e = int(m.group(1))
        if 0 < e < 2500:
            candidates.append((f"1-{e} гл.", 1, e))

    for m in re.finditer(r'\b(\d+)\s*(?:глав[аы]?|гл\.?|сери[яий])\b', cleaned, re.IGNORECASE):
        e = int(m.group(1))
        if 0 < e < 2500:
            candidates.append((f"{e} гл.", e, e))

    for m in re.finditer(r'\b(?:глав[аы]?|гл\.?)\s*(\d+)\b', cleaned, re.IGNORECASE):
        e = int(m.group(1))
        if 0 < e < 2500:
            candidates.append((f"{e} гл.", e, e))

    if not candidates:
        return ("", 0, 0)

    # Выбираем кандидата с максимальной конечной главой
    best = max(candidates, key=lambda x: (x[2], x[2] - x[1]))
    return best


def extract_post_titles_strict(post):
    """Извлекает заголовок поста и названия видео/тизеров внутри него"""
    res = []
    if not isinstance(post, dict):
        return res
    if post.get('title'):
        res.append(str(post['title']))
    for key in ['teaser', 'data']:
        blocks = post.get(key)
        if isinstance(blocks, list):
            for b in blocks:
                if isinstance(b, dict):
                    if b.get('title'):
                        res.append(str(b['title']))
                    if b.get('type') == 'text' and b.get('content'):
                        try:
                            c = json.loads(b['content'])
                            if isinstance(c, list) and len(c) > 0 and isinstance(c[0], str) and len(c[0]) < 140:
                                res.append(c[0])
                        except Exception:
                            pass
    return res


def extract_high_res_cover_from_post(post):
    """Извлекает оригинальную обложку из поста без сплющивания"""
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
                        return clean_image_url(val)
                rend = b.get('rendition')
                if isinstance(rend, dict) and isinstance(rend.get('url'), str) and 'images.boosty.to/image/' in rend['url']:
                    return clean_image_url(rend['url'])

    dump = json.dumps(post)
    matches = re.findall(r'https://images\.boosty\.to/image/[a-f0-9\-]+', dump)
    if matches:
        return clean_image_url(matches[0])
    return ""


def detect_post_tier_strict(post):
    """
    Точное определение платного/бесплатного статуса поста и его уровня (1 или 2).
    Открытый пост на Boosty не имеет subscriptionLevel и его price == 0.
    """
    if not isinstance(post, dict):
        return {"name": "Базовый уровень 1 ур. 250 ₽", "level": 1, "is_free": False}

    sub_obj = post.get('subscriptionLevel') or post.get('subscription_level')
    price = post.get('price') or 0
    is_Free_flag = post.get('isRecord') is False and not sub_obj and price == 0

    # Если нет привязки к уровню подписки и цена 0 — пост открыт бесплатно всем
    if (not sub_obj) and (not price or price == 0):
        return {
            "name": "Бесплатный доступ",
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
            "level": 2,
            "is_free": False
        }

    return {
        "name": "Базовый уровень 1 ур. 250 ₽",
        "level": 1,
        "is_free": False
    }


def match_posts_for_bundle(bundle, all_blog_posts, posts_by_id, global_first_post_id):
    """
    Собирает все посты конкретного бандла:
    1) Из API бандла (если отдаёт изолированный список)
    2) Из SSR-страницы бандла
    3) По точному совпадению названия тайтла в заголовках постов блога
    """
    bundle_id = str(bundle.get('id', '')).strip()
    expected_count = int(bundle.get('publishedPostsCounter') or 0)
    raw_title = bundle.get('title', '')
    clean_t = clean_bundle_title(raw_title)
    norm_title = normalize_for_match(clean_t)

    matched_map = {}

    # 1. Пробуем API бандла
    api_urls = [
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=100',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=100&bundle_id={bundle_id}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=100&bundleId={bundle_id}'
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
                is_wall_fallback = (
                    len(posts) > max(expected_count + 3, 12) and
                    posts[0].get('id') == global_first_post_id
                )
                if not is_wall_fallback:
                    for p in posts:
                        if isinstance(p, dict) and p.get('id'):
                            matched_map[p['id']] = p
                    break
        except Exception:
            continue

    # 2. Если API не вернуло посты — проверяем SSR-разметку страницы бандла
    if not matched_map:
        try:
            feed_html = fetch_html(f'https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed')
            post_ids = re.findall(r'/posts/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', feed_html)
            if not post_ids:
                post_ids = re.findall(r'"post"\s*:\s*\{\s*"id"\s*:\s*"([a-f0-9\-]{36})"', feed_html)
            for pid in post_ids:
                if pid in posts_by_id:
                    matched_map[pid] = posts_by_id[pid]
        except Exception:
            pass

    # 3. Дополняем постами из общей выгрузки блога по названию тайтла или bundleId внутри поста
    if len(norm_title) >= 5:
        for p in all_blog_posts:
            pid = p.get('id')
            if not pid or pid in matched_map:
                continue
            # Проверка явной ссылки на бандл внутри объекта поста
            p_bundle = p.get('bundle') or p.get('bundleId') or p.get('bundle_id')
            if (isinstance(p_bundle, dict) and str(p_bundle.get('id')) == bundle_id) or str(p_bundle) == bundle_id:
                matched_map[pid] = p
                continue

            # Проверка по названию тайтла в заголовке поста/видео
            for line in extract_post_titles_strict(p):
                norm_line = normalize_for_match(line)
                if norm_title and norm_title in norm_line:
                    matched_map[pid] = p
                    break

    result_posts = list(matched_map.values())
    result_posts.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    return result_posts


def fetch_isolated_tag_posts(tag_id, tag_title, all_blog_posts):
    """
    Надёжный сбор постов для скрытого тега (без бага с возвратом всей стены из 300 постов).
    """
    tag_id_str = str(tag_id).strip()
    norm_tag_title = normalize_for_match(tag_title)
    matched = {}

    # 1. Ищем по тегам и названию внутри уже загруженных постов блога
    for p in all_blog_posts:
        pid = p.get('id')
        if not pid:
            continue
        tags_list = p.get('tags') or p.get('postTags') or []
        has_tag = False
        if isinstance(tags_list, list):
            for t in tags_list:
                if isinstance(t, dict) and str(t.get('id')) == tag_id_str:
                    has_tag = True
                    break
                elif str(t) == tag_id_str:
                    has_tag = True
                    break
        if has_tag:
            matched[pid] = p
            continue

        # Дополнительная проверка по точному названию тайтла в заголовке поста/видео
        if len(norm_tag_title) >= 5:
            for line in extract_post_titles_strict(p):
                if norm_tag_title in normalize_for_match(line):
                    matched[pid] = p
                    break

    # 2. Дополнительно проверяем SSR-страницу тега на случай старых постов
    try:
        tag_html = fetch_html(f'https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id_str}')
        post_ids = re.findall(r'/posts/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', tag_html)
        posts_by_id = {p.get('id'): p for p in all_blog_posts if isinstance(p, dict) and p.get('id')}
        # Если на странице тега меньше 40 постов (не вся стена), добавляем их
        if 0 < len(set(post_ids)) < 40:
            for pid in post_ids:
                if pid in posts_by_id:
                    matched[pid] = posts_by_id[pid]
    except Exception:
        pass

    res = list(matched.values())
    res.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    return res


def analyze_posts_stats(posts_list, fallback_ts):
    """
    Анализирует посты тайтла и возвращает:
    - detected_level (1 или 2)
    - max_chapter_found (общее кол-во вышедших глав)
    - free_chapters_count (сколько глав доступно бесплатно)
    - free_range_text (текст бесплатного диапазона, например 'Бесплатно: 1-15 гл.')
    - latest_range_label (последний вышедший диапазон глав)
    - oldest_ts (дата создания)
    - has_1_to_n_start (начинается ли с 1 главы)
    """
    detected_level = 1
    max_chapter_found = 0
    free_chapters_set = set()
    max_free_end = 0
    min_free_start = 99999
    latest_range_label = ""
    has_1_to_n_start = False

    if not posts_list:
        return (detected_level, 0, 0, "", "", fallback_ts, False)

    # Определяем уровень подписки по платным постам
    for mp in posts_list:
        t_info = detect_post_tier_strict(mp)
        if not t_info["is_free"]:
            if t_info["level"] == 2:
                detected_level = 2
                break

    oldest_ts = posts_list[-1].get('publishTime') or posts_list[-1].get('createdAt') or fallback_ts

    for idx, mp in enumerate(posts_list, 1):
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

        if cur_end > max_chapter_found:
            max_chapter_found = cur_end
            if not latest_range_label:
                latest_range_label = cur_range

        # Учёт бесплатных глав
        if t_info["is_free"]:
            if cur_end > 0 and cur_start > 0 and (cur_end - cur_start) < 500:
                for ch_num in range(cur_start, cur_end + 1):
                    free_chapters_set.add(ch_num)
                if cur_start < min_free_start:
                    min_free_start = cur_start
                if cur_end > max_free_end:
                    max_free_end = cur_end
            elif cur_end > 0:
                free_chapters_set.add(cur_end)
                max_free_end = max(max_free_end, cur_end)

    free_chapters_count = len(free_chapters_set)
    free_range_text = ""
    if free_chapters_count > 0:
        if min_free_start == 1 and max_free_end > 0:
            free_range_text = f"🆓 Бесплатно: 1-{max_free_end} гл."
        else:
            free_range_text = f"🆓 Бесплатно: {free_chapters_count} гл."

    return (
        detected_level,
        max_chapter_found,
        free_chapters_count,
        free_range_text,
        latest_range_label,
        oldest_ts,
        has_1_to_n_start
    )


def make_metric_tag_slug(title_str):
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
            cover = clean_image_url(thumb['url'])

        # 1. Парсим главы из самого заголовка бандла, описания и обложки
        b_range, b_start, b_end = parse_strict_chapter_info(raw_title)
        for extra_field in [
            thumb.get('title') if isinstance(thumb, dict) else '',
            item.get('description', ''),
            item.get('subTitle', '')
        ]:
            if extra_field:
                t_range, t_start, t_end = parse_strict_chapter_info(str(extra_field))
                if t_end > b_end:
                    b_end = t_end
                    if not b_range:
                        b_range = t_range
                if t_start == 1:
                    b_start = 1

        posts_count = int(item.get('publishedPostsCounter') or 1)
        matched_posts = match_posts_for_bundle(item, all_blog_posts, posts_by_id, global_first_post_id)

        created_ts = item.get('createdAt') or item.get('publishedAt') or int(time.time())
        updated_ts = item.get('publishedAt') or item.get('updatedAt') or created_ts
        feed_link = f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed"

        (
            detected_level,
            post_max_ch,
            free_ch_count,
            free_text,
            latest_range_str,
            oldest_post_ts,
            started_from_ch1
        ) = analyze_posts_stats(matched_posts, created_ts)

        if matched_posts:
            latest_ts = matched_posts[0].get('publishTime') or matched_posts[0].get('createdAt')
            if latest_ts:
                updated_ts = latest_ts
            if oldest_post_ts < created_ts:
                created_ts = oldest_post_ts

        # Общее число глав — максимум из шапки бандла и его постов
        total_chapters = max(b_end, post_max_ch)
        free_chapters = min(free_ch_count, total_chapters) if total_chapters > 0 else free_ch_count
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0

        if not latest_range_str:
            latest_range_str = b_range if b_range else (f"1-{total_chapters} гл." if total_chapters > 0 else "Новые главы")

        tier_name = "Основной уровень 2 ур. 500 ₽" if detected_level == 2 else "Базовый уровень 1 ур. 250 ₽"
        sub_link = SUB_LINKS[2] if detected_level == 2 else SUB_LINKS[1]
        metric_tag = make_metric_tag_slug(clean_title)

        result.append({
            "id": bundle_id,
            "metric_tag": metric_tag,
            "title": clean_title,
            "image": cover,
            "chapters": total_chapters,
            "free_chapters": free_chapters,
            "paid_chapters": paid_chapters,
            "latest_range": latest_range_str,
            "posts_count": max(posts_count, len(matched_posts)),
            "has_free": has_free,
            "free_text": free_text,
            "last_update": datetime.datetime.fromtimestamp(updated_ts).strftime("%d/%m/%Y"),
            "timestamp": updated_ts,
            "created_ts": created_ts,
            "is_1_to_n": bool(b_start == 1 or started_from_ch1 or total_chapters > 0),
            "tier": tier_name,
            "tier_level": detected_level,
            "sub_link": sub_link,
            "link": feed_link
        })

    # 2. Точный парсинг тайтлов по ТЕГАМ (без подмешивания чужих постов со стены)
    for custom in extra_cfg.get("custom_tags", []):
        tag_id = str(custom.get("tag_id", "")).strip()
        c_title = clean_bundle_title(custom.get("title", "Без названия"))
        c_link = custom.get("link") or f"https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id}"
        c_image = clean_image_url(custom.get("image", "").strip())

        tag_posts = fetch_isolated_tag_posts(tag_id, c_title, all_blog_posts) if tag_id else []
        now_ts = int(time.time())

        (
            detected_level,
            post_max_ch,
            free_ch_count,
            free_text,
            latest_range_str,
            oldest_post_ts,
            started_from_ch1
        ) = analyze_posts_stats(tag_posts, now_ts)

        updated_ts = now_ts
        if tag_posts:
            updated_ts = tag_posts[0].get('publishTime') or tag_posts[0].get('createdAt') or now_ts

            # Ищем родную обложку именно этого тайтла (сначала с 1-N глав, затем самый свежий пост этого тега)
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
                for candidate_post in ([first_range_post] if first_range_post else []) + tag_posts:
                    img_candidate = extract_high_res_cover_from_post(candidate_post)
                    if img_candidate:
                        c_image = img_candidate
                        break

        if not c_image:
            c_image = "https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка"

        lvl = custom.get("tier_level") or detected_level or 1
        total_chapters = post_max_ch if post_max_ch > 0 else int(custom.get("chapters") or 0)
        free_chapters = min(free_ch_count, total_chapters) if total_chapters > 0 else free_ch_count
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0

        tier_name = "Основной уровень 2 ур. 500 ₽" if lvl == 2 else "Базовый уровень 1 ур. 250 ₽"
        metric_tag = make_metric_tag_slug(c_title)

        result.append({
            "id": custom.get("id", f"tag_{tag_id}"),
            "metric_tag": metric_tag,
            "title": c_title,
            "image": c_image,
            "chapters": total_chapters,
            "free_chapters": free_chapters,
            "paid_chapters": paid_chapters,
            "latest_range": latest_range_str or (f"1-{total_chapters} гл." if total_chapters > 0 else "Все главы"),
            "posts_count": len(tag_posts) if tag_posts else 1,
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
