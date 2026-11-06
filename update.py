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
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode('utf-8'))

def fetch_html(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read().decode('utf-8', errors='ignore')

def load_extra_config():
    if os.path.exists('extra.json'):
        try:
            with open('extra.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Ошибка чтения extra.json: {e}")
    return {"custom_tags": [], "fundraisers": []}

def get_blog_stats_and_goals(extra_cfg):
    stats = {
        "avatar": "",
        "subscribers": 1428,
        "posts": 721,
        "goals": [
            {
                "current": 178,
                "target": 200,
                "type": "subscribers",
                "description": "Мотивация делать больше манхв. Смогу спокойно покупать главы и не париться о базовых нуждах."
            }
        ],
        "fundraisers": extra_cfg.get("fundraisers", [])
    }

    try:
        blog_data = fetch_json(f'https://api.boosty.to/v1/blog/{BLOG_NAME}')
        if isinstance(blog_data, dict):
            if blog_data.get('avatarUrl'):
                stats['avatar'] = blog_data['avatarUrl']
            count_obj = blog_data.get('count', {})
            if isinstance(count_obj, dict):
                if count_obj.get('subscribers'):
                    stats['subscribers'] = count_obj['subscribers']
                if count_obj.get('posts'):
                    stats['posts'] = count_obj['posts']
    except Exception:
        pass

    goals_found = []
    for endpoint in [f'https://api.boosty.to/v1/blog/{BLOG_NAME}/target/', f'https://api.boosty.to/v1/target/{BLOG_NAME}']:
        try:
            raw_targets = fetch_json(endpoint)
            target_list = []
            if isinstance(raw_targets, dict):
                data_part = raw_targets.get('data', raw_targets)
                if isinstance(data_part, list):
                    target_list = data_part
                elif isinstance(data_part, dict) and isinstance(data_part.get('targets'), list):
                    target_list = data_part['targets']
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
            cur_match = re.search(r'"currentSum"\s*:\s*(\d+(?:\.\d+)?)\s*,\s*"targetSum"\s*:\s*(\d+(?:\.\d+)?)', html)
            desc_match = re.search(r'"description"\s*:\s*"(Мотивация[^"]+)"', html)
            if cur_match:
                goals_found.append({
                    "current": int(float(cur_match.group(1))),
                    "target": int(float(cur_match.group(2))),
                    "type": "subscribers",
                    "description": desc_match.group(1) if desc_match else stats["goals"][0]["description"]
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
        print(f"Ошибка загрузки бандлов: {e}")
    return []

def get_posts_from_bundle_feed(bundle_id):
    api_endpoints = [
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=25&bundle_id={bundle_id}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=25&bundleId={bundle_id}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=25'
    ]
    for url in api_endpoints:
        try:
            raw = fetch_json(url)
            posts = []
            if isinstance(raw, dict):
                data_obj = raw.get('data', raw)
                if isinstance(data_obj, list):
                    posts = data_obj
                elif isinstance(data_obj, dict):
                    if isinstance(data_obj.get('posts'), list):
                        posts = data_obj['posts']
                    elif isinstance(data_obj.get('data'), list):
                        posts = data_obj['data']
            if posts:
                valid_posts = [p for p in posts if isinstance(p, dict) and ('publishTime' in p or 'createdAt' in p)]
                if valid_posts:
                    return valid_posts
        except Exception:
            continue
    return []

def get_posts_by_tag_id(tag_id):
    url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=25&postsTagsIds={tag_id}'
    try:
        raw = fetch_json(url)
        data = raw.get('data', [])
        if isinstance(data, list):
            return data
    except Exception:
        pass
    return []

def get_all_blog_posts():
    all_posts = []
    offset = ""
    for _ in range(12):
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
    return all_posts

def extract_chapters_number(text):
    if not text or not isinstance(text, str):
        return 0
    # Игнорируем годы вроде 2025/2026
    cleaned = re.sub(r'\b202\d\b', '', text)
    
    # 1. Явные указания "1-50 Главы", "9-19 Главы", "316 Глава"
    matches = re.findall(r'(?:\d+\s*[-—–]\s*)?(\d+)\s*(?:глав[аы]?|гл\.?|сери[ияй])', cleaned, re.IGNORECASE)
    if matches:
        valid = [int(m) for m in matches if int(m) < 3500]
        if valid:
            return max(valid)
            
    # 2. Диапазоны в скобках [1-50] или (1-316)
    range_matches = re.findall(r'[\[\(]\s*\d+\s*[-—–]\s*(\d+)[^\]\)]*[\]\)]', cleaned)
    if range_matches:
        valid = [int(m) for m in range_matches if int(m) < 3500]
        if valid:
            return max(valid)
            
    # 3. Просто диапазон через дефис перед концом строки
    dash_matches = re.findall(r'\b(\d+)\s*[-—–]\s*(\d+)\b', cleaned)
    if dash_matches:
        valid = [int(b) for a, b in dash_matches if int(b) > int(a) and int(b) < 3500]
        if valid:
            return max(valid)
            
    return 0

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

def detect_post_tier(post):
    """
    Строгое определение уровня подписки для поста.
    На 3-м уровне (1000 ₽) тайтлов нет — только 1-й уровень (250 ₽), 2-й уровень (500 ₽) или Бесплатно.
    """
    if not isinstance(post, dict):
        return {"name": "Базовый уровень 1 ур. 250 ₽", "short": "Базовый 1 ур.", "level": 1, "is_free": False}

    sub_obj = post.get('subscriptionLevel') or post.get('subscription_level') or {}
    price = post.get('price', 0)
    has_access = post.get('hasAccess', False)

    # Если пост открыт всем бесплатно без подписки
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
        m = re.search(r'(\d+\s*[-—–]\s*\d+\s*(?:глав[аы]?|гл\.?)|\d+\s*(?:глав[аы]?|гл\.?)|\[\d+\s*[-—–]\s*\d+.*?\])', s, re.IGNORECASE)
        if m:
            res = m.group(1).strip('[] ')
            if not re.search(r'глав', res, re.IGNORECASE):
                res += " главы"
            return res
    if post.get('title') and len(str(post['title']).strip()) > 2:
        t = str(post['title']).strip()
        return t[:32] + ('...' if len(t) > 32 else '')
    return f"Часть #{index_num}"

def clean_bundle_title(raw_title):
    cleaned = re.sub(r'\[.*?\]', '', raw_title)
    cleaned = re.sub(r'(?i)\s*глав[аы]?\s*$', '', cleaned).strip()
    return cleaned if cleaned else raw_title.strip()

def normalize_for_match(text):
    return re.sub(r'[^а-яa-z0-9]', '', text.lower())

def find_matching_posts_for_bundle(bundle, all_blog_posts, global_first_post_id):
    bundle_id = str(bundle.get('id', ''))
    raw_title = bundle.get('title', '')
    clean_title = clean_bundle_title(raw_title)
    thumb = bundle.get('thumbnail') or {}
    thumb_id = thumb.get('id', '')
    
    direct_posts = get_posts_from_bundle_feed(bundle_id)
    time.sleep(0.06)
    
    valid_direct = []
    if direct_posts:
        first_p = direct_posts[0]
        p_dump = json.dumps(first_p, ensure_ascii=False)
        if bundle_id in p_dump or (first_p.get('id') != global_first_post_id):
            valid_direct = direct_posts
            
    norm_title = normalize_for_match(clean_title)
    matched = list(valid_direct)
    seen_ids = {p.get('id') for p in matched if p.get('id')}
    
    for p in all_blog_posts:
        pid = p.get('id')
        if pid in seen_ids:
            continue
        p_str = json.dumps(p, ensure_ascii=False)
        if bundle_id in p_str or (thumb_id and thumb_id in p_str):
            matched.append(p)
            seen_ids.add(pid)
            continue
            
        p_texts = extract_all_strings_from_post(p)
        for t in p_texts:
            norm_t = normalize_for_match(t)
            if len(norm_title) >= 5 and norm_title[:12] in norm_t:
                matched.append(p)
                seen_ids.add(pid)
                break
                
    if matched:
        matched.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
        return matched
        
    return direct_posts if direct_posts else []

def build_posts_list_and_meta(matched_posts, default_ts, feed_link):
    posts_links = []
    has_free_chapters = False
    free_badge_text = ""
    max_chapters = 0
    detected_level = 1

    if matched_posts:
        # Определяем уровень тайтла по самому свежему платному посту
        for mp in matched_posts:
            t_info = detect_post_tier(mp)
            if not t_info["is_free"]:
                detected_level = t_info["level"]
                break

        for idx, mp in enumerate(matched_posts[:20], 1):
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
                ch_num = extract_chapters_number(text_line)
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
    global_first_post_id = all_blog_posts[0].get('id') if all_blog_posts else None
    
    # Карта сборов на конкретные тайтлы из extra.json
    fund_map = {}
    for f_item in extra_cfg.get("fundraisers", []):
        norm_f = normalize_for_match(f_item.get("title", ""))
        if norm_f:
            fund_map[norm_f] = f_item

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
            # Запрашиваем оптимизированный размер для быстрой загрузки на мобильных
            base_url = thumb['url'].split('&croped=')[0]
            cover = base_url + '&croped=1&mh=420&mw=320'
            
        chapters = extract_chapters_number(raw_title)
        if isinstance(thumb, dict) and thumb.get('title'):
            ch_thumb = extract_chapters_number(thumb['title'])
            if ch_thumb > chapters:
                chapters = ch_thumb
                
        posts_count = int(item.get('publishedPostsCounter') or 1)
        matched_posts = find_matching_posts_for_bundle(item, all_blog_posts, global_first_post_id)
        ts = item.get('publishedAt') or item.get('createdAt') or int(time.time())
        feed_link = f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed"

        posts_links, has_free, free_text, post_max_ch, detected_level = build_posts_list_and_meta(matched_posts, ts, feed_link)

        if matched_posts:
            latest_ts = matched_posts[0].get('publishTime') or matched_posts[0].get('createdAt')
            if latest_ts:
                ts = latest_ts
            if len(matched_posts) > posts_count:
                posts_count = len(matched_posts)

        if post_max_ch > chapters:
            chapters = post_max_ch

        tier_name = "Основной уровень 2 ур. 500 ₽" if detected_level == 2 else "Базовый уровень 1 ур. 250 ₽"
        sub_link = SUB_LINKS[2] if detected_level == 2 else SUB_LINKS[1]

        # Проверяем, есть ли активный сбор на этот тайтл
        norm_t = normalize_for_match(clean_title)
        fund_info = None
        for k, v in fund_map.items():
            if k[:10] in norm_t or norm_t[:10] in k:
                fund_info = {
                    "current": v.get("current", 0),
                    "target": v.get("target", 3000 if detected_level == 2 else 1500)
                }
                break

        dt = datetime.datetime.fromtimestamp(ts)
        formatted_date = dt.strftime("%d/%m/%Y")
        
        result.append({
            "id": bundle_id,
            "title": clean_title,
            "image": cover,
            "chapters": chapters,
            "posts_count": posts_count,
            "posts_list": posts_links,
            "has_free": has_free,
            "free_text": free_text,
            "last_update": formatted_date,
            "timestamp": ts,
            "tier": tier_name,
            "tier_level": detected_level,
            "sub_link": sub_link,
            "fund": fund_info,
            "link": feed_link
        })

    # Добавляем отдельные тайтлы по Тэгам из extra.json
    for custom in extra_cfg.get("custom_tags", []):
        tag_id = str(custom.get("tag_id", "")).strip()
        c_title = custom.get("title", "Без названия")
        c_link = custom.get("link") or f"https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id}"
        c_image = custom.get("image") or "https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка"
        
        tag_posts = get_posts_by_tag_id(tag_id) if tag_id else []
        ts = int(time.time())
        posts_links, has_free, free_text, post_max_ch, detected_level = build_posts_list_and_meta(tag_posts, ts, c_link)

        if tag_posts:
            ts = tag_posts[0].get('publishTime') or tag_posts[0].get('createdAt') or ts
            # Если обложка не задана вручную, пробуем вытянуть картинку из последнего поста тега
            if "placeholder" in c_image:
                dump_str = json.dumps(tag_posts[0])
                img_m = re.search(r'https://images\.boosty\.to/image/[a-f0-9\-]+', dump_str)
                if img_m:
                    c_image = img_m.group(0) + '?croped=1&mh=420&mw=320'

        lvl = custom.get("tier_level") or detected_level or 1
        ch = max(custom.get("chapters", 0), post_max_ch)
        tier_name = "Основной уровень 2 ур. 500 ₽" if lvl == 2 else "Базовый уровень 1 ур. 250 ₽"

        fund_obj = None
        if custom.get("fund_target"):
            fund_obj = {
                "current": custom.get("fund_current", 0),
                "target": custom.get("fund_target", 1500)
            }

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
            "fund": fund_obj,
            "link": c_link
        })

    return result

if __name__ == '__main__':
    extra_cfg = load_extra_config()
    stats_data = get_blog_stats_and_goals(extra_cfg)
    with open('stats.json', 'w', encoding='utf-8') as f:
        json.dump(stats_data, f, ensure_ascii=False, indent=2)

    data = process_data(extra_cfg)
    # FALLBACK ЗАЩИТА: перезаписываем data.json только если парсинг вернул валидный список тайтлов
    if data and len(data) > 5:
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Успешно обновлено {len(data)} тайтлов.")
    else:
        print("Внимание: Boosty вернул пустой ответ. Сохранен предыдущий кэш data.json (Fallback).")
