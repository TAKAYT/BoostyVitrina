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

def get_blog_stats_and_goals():
    stats = {
        "subscribers": 1428,
        "posts": 721,
        "goals": [
            {
                "current": 178,
                "target": 200,
                "type": "subscribers",
                "description": "Мотивация делать больше манхв. Смогу спокойно покупать главы и не париться о базовых нуждах."
            }
        ]
    }

    try:
        blog_data = fetch_json(f'https://api.boosty.to/v1/blog/{BLOG_NAME}')
        if isinstance(blog_data, dict):
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
                        "current": int(t.get('currentSum', 0)),
                        "target": int(t.get('targetSum', 200)),
                        "type": t.get('type', 'subscribers'),
                        "description": t.get('description', '')
                    })
            if goals_found:
                break
        except Exception:
            continue

    if not goals_found:
        try:
            html = fetch_html(f'https://boosty.to/{BLOG_NAME}')
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
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=20&bundle_id={bundle_id}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=20&bundleId={bundle_id}',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=20'
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
            time.sleep(0.1)
        except Exception as e:
            print(f"Ошибка пагинации постов: {e}")
            break
    return all_posts

def extract_chapters_number(text):
    if not text or not isinstance(text, str):
        return 0
    
    matches = re.findall(r'(?:\d+\s*[-—–]\s*)?(\d+)\s*(?:глав[аы]?|гл\.?)', text, re.IGNORECASE)
    if matches:
        return max(int(m) for m in matches)
        
    range_matches = re.findall(r'[\[\(]\s*\d+\s*[-—–]\s*(\d+)[^\]\)]*[\]\)]', text)
    if range_matches:
        return max(int(m) for m in range_matches)
        
    dash_matches = re.findall(r'\b\d+\s*[-—–]\s*(\d+)\b', text)
    if dash_matches:
        return max(int(m) for m in dash_matches)
        
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

def extract_readable_post_label(post, index_num):
    """Формирует красивое название поста/глав для выпадающего списка"""
    strings = extract_all_strings_from_post(post)
    for s in strings:
        # Ищем упоминание глав вида "9-19 Главы", "1-50 Главы", "316 Глава"
        m = re.search(r'(\d+\s*[-—–]\s*\d+\s*(?:глав[аы]?|гл\.?)|\d+\s*(?:глав[аы]?|гл\.?)|\[\d+\s*[-—–]\s*\d+.*?\])', s, re.IGNORECASE)
        if m:
            return m.group(1).strip('[] ')
    if post.get('title') and len(str(post['title']).strip()) > 2:
        t = str(post['title']).strip()
        return t[:38] + ('...' if len(t) > 38 else '')
    return f"Выпуск #{index_num}"

def detect_subscription_tier(post):
    default_tier = {
        "name": "Базовый уровень 1 ур. 250 ₽",
        "level": 1,
        "sub_link": SUB_LINKS[1]
    }
    if not isinstance(post, dict):
        return default_tier
        
    sub_obj = post.get('subscriptionLevel') or post.get('subscription_level') or {}
    sub_dump = json.dumps(sub_obj, ensure_ascii=False).lower()
    post_dump = json.dumps({
        'sub': sub_obj,
        'price': post.get('price'),
        'tier': post.get('tier')
    }, ensure_ascii=False).lower()
    
    if 'доп.поддержка' in post_dump or 'доп. поддержка' in post_dump or '3979820' in post_dump or '1000' in sub_dump:
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

def find_matching_posts_for_bundle(bundle, all_blog_posts, global_first_post_id):
    bundle_id = str(bundle.get('id', ''))
    raw_title = bundle.get('title', '')
    clean_title = clean_bundle_title(raw_title)
    thumb = bundle.get('thumbnail') or {}
    thumb_id = thumb.get('id', '')
    
    direct_posts = get_posts_from_bundle_feed(bundle_id)
    time.sleep(0.08)
    
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

def process_data():
    bundles_list = get_all_bundles()
    if not bundles_list:
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
        
        cover = 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Нет+обложки'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            cover = thumb['url'] + '&croped=1&mh=326&mw=300'
            
        chapters = extract_chapters_number(raw_title)
        if isinstance(thumb, dict) and thumb.get('title'):
            ch_thumb = extract_chapters_number(thumb['title'])
            if ch_thumb > chapters:
                chapters = ch_thumb
                
        posts_count = int(item.get('publishedPostsCounter') or 1)
        matched_posts = find_matching_posts_for_bundle(item, all_blog_posts, global_first_post_id)
        latest_post = matched_posts[0] if matched_posts else None
        
        ts = item.get('publishedAt') or item.get('createdAt') or int(time.time())
        tier_info = {
            "name": "Базовый уровень 1 ур. 250 ₽",
            "level": 1,
            "sub_link": SUB_LINKS[1]
        }
        
        posts_Links_list = []
        if matched_posts:
            if len(matched_posts) > posts_count:
                posts_count = len(matched_posts)
            for idx, mp in enumerate(matched_posts[:15], 1):
                mp_id = mp.get('id')
                mp_ts = mp.get('publishTime') or mp.get('createdAt') or ts
                mp_date = datetime.datetime.fromtimestamp(mp_ts).strftime("%d/%m/%Y")
                label = extract_readable_post_label(mp, len(matched_posts) - idx + 1)
                if mp_id:
                    posts_Links_list.append({
                        "label": label,
                        "date": mp_date,
                        "url": f"https://boosty.to/{BLOG_NAME}/posts/{mp_id}"
                    })

        if latest_post:
            post_ts = latest_post.get('publishTime') or latest_post.get('createdAt')
            if post_ts:
                ts = post_ts
                
            for text_line in extract_all_strings_from_post(latest_post):
                ch_post = extract_chapters_number(text_line)
                if ch_post > chapters:
                    chapters = ch_post
                    
            tier_info = detect_subscription_tier(latest_post)
            
        dt = datetime.datetime.fromtimestamp(ts)
        formatted_date = dt.strftime("%d/%m/%Y")
        feed_link = f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed"
        
        result.append({
            "id": bundle_id,
            "title": clean_title,
            "image": cover,
            "chapters": chapters,
            "posts_count": posts_count,
            "posts_list": posts_Links_list,
            "last_update": formatted_date,
            "timestamp": ts,
            "tier": tier_info["name"],
            "tier_level": tier_info["level"],
            "sub_link": tier_info["sub_link"],
            "link": feed_link
        })
        
    return result

if __name__ == '__main__':
    stats_data = get_blog_stats_and_goals()
    with open('stats.json', 'w', encoding='utf-8') as f:
        json.dump(stats_data, f, ensure_ascii=False, indent=2)

    data = process_data()
    if data:
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Успешно обновлено {len(data)} тайтлов.")
