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

# Фиксированные ID уровней подписок Boosty
TIER_1_ID = "3988840"  # Базовый уровень 1 ур. (250 ₽)
TIER_2_ID = "3988841"  # Основной уровень 2 ур. / Лицензии (500 ₽)
TIER_3_ID = "3979820"  # Доп. поддержка (1000 ₽)

SUB_LINKS = {
    1: f"https://boosty.to/darktaka/purchase/{TIER_1_ID}?ssource=DIRECT&share=subscription_link",
    2: f"https://boosty.to/darktaka/purchase/{TIER_2_ID}?ssource=DIRECT&share=subscription_link",
    3: f"https://boosty.to/darktaka/purchase/{TIER_3_ID}?ssource=DIRECT&share=subscription_link"
}

# Группы синонимов, сокращений и тегов (работают в обе стороны: бандл <-> пост/тег)
# Первое название в каждой группе — эталонное русское название для формирования неизменного русского UTM-тега
TITLE_SYNONYM_GROUPS = [
    ["некромант я катастрофа", "ням", "ням (некромант)", "ням некромант"],
    ["паладин sss ранга", "паладин sss ранга главы", "пsss", "psss"],
    [
        "всеобщий отбор укротитель драконов в самом деле самый слабый класс",
        "воудр (дракончик)",
        "воудр дракончик",
        "воудр",
        "дракончик"
    ],
    ["некромант максимального уровня", "некромант макс lvl", "некромант макс лвл"],
    ["мастер древних божественных орудий", "мастер божественных орудий древней эпохи"],
    ["я перевоплотился в могущественного дракона для сокрушения мира", "я стал драконом в прошлом"],
    ["я проснулся имбой после 100 лет afk", "я проснулся имбой после 100 лет афк"],
    ["начало после конца", "кнчн"],
    ["от гоблина к богу гоблинов", "к богу гоблинов"],
    ["реинкарнация в начало апокалипсиса", "в начало до зомби апокалипсиса", "в начало до зомби-апокалипсиса"],
    ["я стал графским ублюдком", "я стал ублюдком сильнейшего графства"],
    ["прокачка в аду", "прокачка в аду в одиночку"],
    ["повелитель насекомых", "король насекомых"],
    ["цивилизация мудрецов", "деревня под наблюдением бога"],
    ["некромант катастрофа решил уйти на пенсию", "некромант-катастрофа решил уйти на пенсию"],
    ["перерождение демонического культиватора", "перерождение демонического культиватора в мире зомби"],
    ["призыватель sss ранга", "призыватель 3s ранга"]
]

# Расширенная система тегов и жанров как на популярных читалках (Remanga / MangaLib)
READER_TAXONOMY_RULES = [
    ("некромантия", ["некромант", "скелет", "мертв", "нежить", "лич", "жнец", "кладбищ", "кост"]),
    ("система", ["система", "уров", "лвл", "lvl", "ранг", "sss", "квест", "статус", "окно", "игрок", "навык", "класс"]),
    ("имба_гг", ["имб", "сильнейш", "максимальн", "бог", "абсолют", "непобедим", "владыка", "повелитель", "король", "катастроф", "100 лет", "афк", "afk"]),
    ("перерождение", ["перерожд", "реинкарнац", "вернул", "возвращ", "прошл", "заново", "жизнь", "регресс", "перевоплот", "начало"]),
    ("подземелья", ["подземел", "данж", "башн", "врата", "охотник", "рейд", "гробниц", "расхититель", "лабиринт", "ад"]),
    ("драконы_и_призыв", ["дракон", "призыв", "укротитель", "питом", "монстр", "звер", "насеком", "рой", "гоблин", "фамильяр"]),
    ("апокалипсис", ["апокалипсис", "зомби", "вирус", "судный день", "выживан", "конец света", "мутант", "инфекц", "разлом"]),
    ("культивация", ["культиват", "дао", "бессмерт", "боевых искусств", "мурим", "секта", "духовн", "ци", "древн", "стихи"]),
    ("магия_и_фэнтези", ["маг", "мастер", "академ", "рыцар", "паладин", "эльф", "меч", "копь", "граф", "ублюдок", "дворян", "импери"]),
    ("демоны_и_боги", ["демон", "божеств", "дьявол", "ангел", "падш", "небесн", "святой", "проклят", "тьма", "тень"]),
    ("месть", ["мест", "предател", "убийц", "уничтож", "сокруш", "расплат", "карал", "враг"]),
    ("артефакты", ["оруди", "оружи", "артефакт", "кузнец", "алхим", "сокровищ", "транжир", "деньг", "богат"])
]

# Соответствие русских жанров из внешних баз (Shikimori / открытые каталоги) внутренним тегам читалки
EXTERNAL_GENRE_MAP = {
    "фэнтези": "магия_и_фэнтези",
    "экшен": "имба_гг",
    "боевик": "имба_гг",
    "боевые искусства": "культивация",
    "сверхъестественное": "демоны_и_боги",
    "демоны": "демоны_и_боги",
    "магия": "магия_и_фэнтези",
    "игры": "система",
    "исэкай": "перерождение",
    "приключения": "подземелья",
    "ужасы": "апокалипсис",
    "триллер": "месть",
    "фантастика": "система"
}


def fetch_json(url, timeout=25):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode('utf-8'))


def fetch_html(url, timeout=20):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode('utf-8', errors='ignore')


def clean_image_url(url):
    """Убирает принудительное сжатие ?croped=1&mh=550&mw=400"""
    if not url or not isinstance(url, str):
        return ""
    if 'images.boosty.to/image/' in url:
        return url.split('?')[0]
    return url


def normalize_for_match(s):
    """Нормализация строки для строгого сравнения названий, тегов и аббревиатур"""
    if not s:
        return ""
    s = s.lower().replace('ё', 'е')
    s = re.sub(r'\[\s*\d+\s*[-—–]\s*\d+[^\]]*\]', ' ', s)
    s = re.sub(r'\b(?:глав[аы]?|гл\.?|часть|сезон|все\s*главы)\b', ' ', s)
    s = re.sub(r'\b\d+\s*[-—–]\s*\d+\b', ' ', s)
    s = re.sub(r'[^a-zа-я0-9\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def resolve_canonical_title(title_str):
    """Приводит название к эталонному (каноническому) виду по таблице синонимов"""
    norm_t = normalize_for_match(title_str)
    if not norm_t:
        return str(title_str or 'тайтл').lower().strip()
    for group in TITLE_SYNONYM_GROUPS:
        norm_group = [normalize_for_match(x) for x in group if x]
        if norm_t in norm_group:
            return group[0]
        for syn in norm_group:
            if len(syn) > 5 and (norm_t.startswith(syn) or syn.startswith(norm_t)):
                return group[0]
    return norm_t


def make_russian_utm_tag(title_str, item_id="", existing_tags=None):
    """
    Генерирует читаемый русский уникальный тег для UTM-разметки и Яндекс.Метрики
    (например: 'некромант_я_катастрофа', 'паладин_sss_ранга').
    """
    if existing_tags and item_id and str(item_id) in existing_tags:
        saved = existing_tags[str(item_id)]
        if re.search(r'[а-яА-ЯёЁ]', saved):
            return saved

    canonical = resolve_canonical_title(title_str)
    cleaned = str(canonical or '').lower().replace('ё', 'е')
    cleaned = re.sub(r'[^a-zа-я0-9]+', '_', cleaned)
    slug = re.sub(r'_+', '_', cleaned).strip('_')[:48]
    if not slug:
        slug = f"тайтл_{re.sub(r'[^a-zA-Z0-9]', '', str(item_id)).lower()}"
    return slug


def make_ascii_vote_key(item_id):
    """Безопасный ASCII-ключ для внешнего API счётчика голосов"""
    return "v_" + re.sub(r'[^a-zA-Z0-9]', '', str(item_id or 'unknown'))


def build_utm_url(base_url, ru_metric_tag, medium="карточка", content="каталог"):
    """Формирует ссылку Boosty с русскими UTM-метками"""
    if not base_url:
        base_url = f"https://boosty.to/{BLOG_NAME}"
    parsed = urllib.parse.urlsplit(base_url)
    query_params = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    query_params['from'] = 'site_catalog'
    query_params['title'] = ru_metric_tag
    query_params['utm_source'] = 'каталог_така'
    query_params['utm_medium'] = medium
    query_params['utm_campaign'] = ru_metric_tag
    query_params['utm_content'] = content
    new_query = urllib.parse.urlencode(query_params)
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))


def fetch_web_genres_for_title(clean_title):
    """
    Парсит открытые базы манги/манхвы в интернете (Shikimori API + поисковый сниппет)
    для автоматического обогащения тайтла жанрами и ключевыми словами.
    """
    found_keywords = []
    search_q = urllib.parse.quote(clean_title[:50])

    # 1. Запрос к открытому API Shikimori (манга/манхва/маньхуа)
    try:
        shiki_url = f"https://shikimori.one/api/mangas?search={search_q}&limit=2"
        items = fetch_json(shiki_url, timeout=4)
        if isinstance(items, list) and len(items) > 0:
            first_id = items[0].get('id')
            if first_id:
                detail = fetch_json(f"https://shikimori.one/api/mangas/{first_id}", timeout=4)
                if isinstance(detail, dict):
                    if detail.get('description'):
                        found_keywords.append(str(detail['description']))
                    for g in detail.get('genres', []):
                        if isinstance(g, dict) and g.get('russian'):
                            found_keywords.append(str(g['russian']).lower())
    except Exception:
        pass

    # 2. Лёгкий поиск жанровых маркеров через открытый HTML-поиск DuckDuckGo Lite (если API не дал описания)
    if not found_keywords:
        try:
            ddg_q = urllib.parse.quote(f"{clean_title} манхва жанры описание")
            html = fetch_html(f"https://html.duckduckgo.com/html/?q={ddg_q}", timeout=4)
            snippets = re.findall(r'class="result__snippet[^>]*>(.*?)</a>', html, flags=re.IGNORECASE | re.DOTALL)
            if snippets:
                clean_snip = re.sub(r'<[^>]+>', ' ', ' '.join(snippets[:2]))
                found_keywords.append(clean_snip.lower())
        except Exception:
            pass

    time.sleep(0.05)
    return ' '.join(found_keywords)


def detect_genres_for_title(clean_title, post_tags=None, extra_text="", prev_genres=None):
    """
    Автоматически присваивает тайтлу 2–4 точных тега как на популярных читалках,
    объединяя название, теги постов Boosty и спарсенное описание из интернета.
    """
    combined = f"{resolve_canonical_title(clean_title)} {clean_title} {' '.join(post_tags or [])} {extra_text}".lower().replace('ё', 'е')
    matched_tags = []

    for tag_key, keywords in READER_TAXONOMY_RULES:
        for kw in keywords:
            if kw in combined:
                if tag_key not in matched_tags:
                    matched_tags.append(tag_key)
                break

    for ext_ru, mapped_key in EXTERNAL_GENRE_MAP.items():
        if ext_ru in combined and mapped_key not in matched_tags:
            matched_tags.append(mapped_key)

    if prev_genres and isinstance(prev_genres, list):
        for pg in prev_genres:
            if pg in dict(READER_TAXONOMY_RULES) and pg not in matched_tags:
                matched_tags.append(pg)

    if not matched_tags:
        matched_tags = ["магия_и_фэнтези", "система"]
    elif len(matched_tags) == 1:
        second_default = "имба_гг" if matched_tags[0] != "имба_гг" else "система"
        matched_tags.append(second_default)

    return matched_tags[:4]


def load_previous_catalog_and_votes():
    """Читает старые данные из data.json и votes.json для сохранения голосов, глав, жанров и UTM-меток"""
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    is_monthly_reset_window = (now.day == 1 and now.hour < 4)

    prev_items_map = {}
    votes_map = {}
    tags_map = {}

    if os.path.exists('data.json'):
        try:
            with open('data.json', 'r', encoding='utf-8') as f:
                old_data = json.load(f)
                if isinstance(old_data, list):
                    for item in old_data:
                        if isinstance(item, dict) and item.get('id'):
                            iid = str(item['id'])
                            prev_items_map[iid] = item
                            if not is_monthly_reset_window:
                                votes_map[iid] = max(votes_map.get(iid, 0), int(item.get('votes') or 0))
                            saved_tag = str(item.get('metric_tag') or '').strip()
                            if saved_tag and re.search(r'[а-яА-ЯёЁ]', saved_tag):
                                tags_map[iid] = saved_tag
        except Exception:
            pass

    if os.path.exists('votes.json'):
        try:
            with open('votes.json', 'r', encoding='utf-8') as f:
                v_doc = json.load(f)
                if isinstance(v_doc, dict):
                    saved_month = str(v_doc.get('month') or '')
                    items_dict = v_doc.get('items', {})
                    if saved_month == month_key and isinstance(items_dict, dict) and not is_monthly_reset_window:
                        for iid, v_info in items_dict.items():
                            if isinstance(v_info, dict):
                                v_val = int(v_info.get('votes') or 0)
                                votes_map[str(iid)] = max(votes_map.get(str(iid), 0), v_val)
                            elif isinstance(v_info, (int, float)):
                                votes_map[str(iid)] = max(votes_map.get(str(iid), 0), int(v_info))
        except Exception:
            pass

    return prev_items_map, votes_map, tags_map


def fetch_current_votes_for_id(item_id, fallback_votes=0):
    """Синхронизирует голоса из CounterAPI и объединяет с votes.json"""
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    namespace = f"takayt_vitrina_{month_key}"
    safe_key = make_ascii_vote_key(item_id)

    max_votes = 0 if (now.day == 1 and now.hour < 4) else int(fallback_votes or 0)
    manual_vote_id = os.environ.get('MANUAL_VOTE_ITEM_ID', '').strip()

    if manual_vote_id and str(manual_vote_id) == str(item_id):
        try:
            up_data = fetch_json(f"https://api.counterapi.dev/v1/{namespace}/{safe_key}/up", timeout=6)
            if isinstance(up_data, dict):
                c = int(up_data.get('count') or up_data.get('value') or 0)
                max_votes = max(max_votes + 1, c)
        except Exception:
            max_votes += 1

    for url in [
        f"https://api.counterapi.dev/v1/{namespace}/{safe_key}",
        f"https://api.counterapi.dev/v1/{namespace}/title_{item_id}"
    ]:
        try:
            data = fetch_json(url, timeout=5)
            if isinstance(data, dict):
                c = int(data.get('count') or data.get('value') or 0)
                if c > max_votes:
                    max_votes = c
        except Exception:
            pass

    time.sleep(0.04)
    return max_votes


def save_votes_json_file(catalog_items):
    """Сохраняет все голоса в отдельный файл votes.json"""
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    namespace = f"takayt_vitrina_{month_key}"

    items_payload = {}
    total_sum = 0
    sorted_items = sorted(catalog_items, key=lambda x: int(x.get('votes') or 0), reverse=True)

    for rank, item in enumerate(sorted_items, 1):
        iid = str(item.get('id', ''))
        v_count = int(item.get('votes') or 0)
        total_sum += v_count
        items_payload[iid] = {
            "title": item.get("title", ""),
            "metric_tag": item.get("metric_tag", ""),
            "votes": v_count,
            "rank": rank if v_count > 0 else 0,
            "tier_level": item.get("tier_level", 1),
            "updated_at": item.get("last_update", "")
        }

    votes_doc = {
        "month": month_key,
        "updated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "namespace": namespace,
        "total_votes_cast": total_sum,
        "items": items_payload
    }

    with open('votes.json', 'w', encoding='utf-8') as f:
        json.dump(votes_doc, f, ensure_ascii=False, indent=2)


def load_extra_config():
    if os.path.exists('extra.json'):
        try:
            with open('extra.json', 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                for item in cfg.get("custom_tags", []):
                    item["tier_level"] = 2
                return cfg
        except Exception as e:
            print(f"Ошибка чтения extra.json: {e}")
    return {
        "custom_tags": [
            {
                "id": "tag_7288659",
                "tag_id": "7288659",
                "title": "Я прокачиваюсь во сне убивая монстров",
                "image": "",
                "tier_level": 2,
                "chapters": 0,
                "link": "https://boosty.to/darktaka?postsTagsIds=7288659"
            },
            {
                "id": "tag_26379728",
                "tag_id": "26379728",
                "title": "Судный день я король вирусов",
                "image": "",
                "tier_level": 2,
                "chapters": 0,
                "link": "https://boosty.to/darktaka?postsTagsIds=26379728"
            },
            {
                "id": "tag_26206841",
                "tag_id": "26206841",
                "title": "Великий расхититель гробниц",
                "image": "",
                "tier_level": 2,
                "chapters": 0,
                "link": "https://boosty.to/darktaka?postsTagsIds=26206841"
            }
        ]
    }


def get_blog_stats_and_goals():
    stats = {
        "avatar": "",
        "subscribers": 1435,
        "posts": 725,
        "goals": [
            {
                "current": 175,
                "target": 200,
                "type": "subscribers",
                "description": "Мотивация делать больше манхв. Смогу спокойно покупать главы и не париться о базовых нуждах."
            }
        ]
    }

    if os.path.exists('stats.json'):
        try:
            with open('stats.json', 'r', encoding='utf-8') as f:
                prev_stats = json.load(f)
                if isinstance(prev_stats, dict):
                    stats.update({k: v for k, v in prev_stats.items() if v})
        except Exception:
            pass

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


def get_aliases_for_title(clean_title):
    """Возвращает все возможные варианты названий, сокращений и тегов для данного тайтла"""
    norm_t = normalize_for_match(clean_title)
    aliases = {norm_t}
    for group in TITLE_SYNONYM_GROUPS:
        norm_group = [normalize_for_match(x) for x in group if x]
        if norm_t in norm_group:
            for item in norm_group:
                aliases.add(item)
            for raw_item in group:
                aliases.add(raw_item.lower().strip().rstrip('.'))
    return [a for a in aliases if a]


def clean_bundle_title(raw_title):
    if not raw_title:
        return "Без названия"
    cleaned = re.sub(r'\[.*?\]', '', raw_title)
    cleaned = re.sub(r'\[[^\]]*$', '', cleaned)
    cleaned = re.sub(r'(?i)\b(?:глав[аы]?|гл\.?)\s*\d+\s*[-—–]\s*\d+\b', '', cleaned)
    cleaned = re.sub(r'(?i)\b\d+\s*[-—–]\s*\d+\s*(?:глав[аы]?|гл\.?)\b', '', cleaned)
    cleaned = re.sub(r'(?i)\s*глав[аы]?\s*$', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip(' -—–:|•')
    return cleaned if cleaned else raw_title.strip()


def parse_strict_chapter_info(text):
    """Точный парсинг глав из заголовка бандла или поста"""
    if not text or not isinstance(text, str):
        return ("", 0, 0)

    cleaned = re.sub(r'\b202\d\b', '', text)
    cleaned = re.sub(
        r'\b\d+\s*(?:лет|год[ао]?в?|этаж(?:ей|а)?|уров(?:ень|ня|ней)|ранг[а]?|мир(?:ов|а)?|раз|тысяч|миллион(?:ов)?)\b',
        '',
        cleaned,
        flags=re.IGNORECASE
    )

    candidates = []

    for m in re.finditer(r'\b(\d+)\s*[-—–~]\s*(\d+)\s*(?:глав[аы]?|гл\.?|ч\.?|част[ьи])\b', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 < s <= e < 2500:
            candidates.append((f"{s}-{e} гл.", s, e))

    for m in re.finditer(r'(?:глав[аы]?|гл\.?)\s*[\[\(]?\s*(\d+)\s*[-—–~]\s*(\d+)', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 < s <= e < 2500:
            candidates.append((f"{s}-{e} гл.", s, e))

    for m in re.finditer(r'[\[\(]\s*(\d+)\s*[-—–~]\s*(\d+)\s*(?:глав[аы]?|гл\.?|все\s*главы|все)?\s*[\]\)]?', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 < s <= e < 2500 and not (s == 82 and e == 8):
            candidates.append((f"{s}-{e} гл.", s, e))

    for m in re.finditer(r'(?:[-—–:|]\s*|\s+)(\d+)\s*[-—–]\s*(\d+)\s*$', cleaned.strip()):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 < s <= e < 2500 and not (s == 82 and e == 8):
            candidates.append((f"{s}-{e} гл.", s, e))

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


def extract_post_tag_names(post):
    """Извлекает текстовые названия тегов поста"""
    names = []
    if not isinstance(post, dict):
        return names
    tags_list = post.get('tags') or post.get('postTags') or []
    if isinstance(tags_list, list):
        for t in tags_list:
            if isinstance(t, dict) and t.get('title'):
                raw_tag = str(t['title']).lower().strip().rstrip('.')
                names.append(raw_tag)
                norm_tag = normalize_for_match(raw_tag)
                if norm_tag and norm_tag not in names:
                    names.append(norm_tag)
    return names


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
    if not isinstance(post, dict):
        return {"name": "Базовый уровень 1 ур. 250 ₽", "level": 1, "is_free": False}

    sub_obj = post.get('subscriptionLevel') or post.get('subscription_level')
    post_price = post.get('price') or 0

    if not sub_obj and (not isinstance(post_price, (int, float)) or post_price == 0):
        return {
            "name": "Бесплатный доступ",
            "level": 1,
            "is_free": True
        }

    sub_id = ""
    sub_name = ""
    sub_price = 0

    if isinstance(sub_obj, dict):
        sub_id = str(sub_obj.get('id') or '').strip()
        sub_name = str(sub_obj.get('name') or sub_obj.get('title') or '').lower().strip()
        try:
            sub_price = float(sub_obj.get('price') or 0)
        except Exception:
            sub_price = 0

    try:
        direct_price = float(post_price or 0)
    except Exception:
        direct_price = 0

    is_tier_2 = (
        sub_id == TIER_2_ID
        or 'основной уровень' in sub_name
        or '2 ур' in sub_name
        or (450 <= sub_price <= 600)
        or (450 <= direct_price <= 600)
    )

    if is_tier_2:
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


def is_exact_title_match(norm_bundle_title, aliases, post):
    post_tags = extract_post_tag_names(post)
    for al in aliases:
        al_clean = al.lower().strip().rstrip('.')
        al_norm = normalize_for_match(al_clean)
        if al_clean in post_tags or (al_norm and al_norm in post_tags):
            return True

    for line in extract_post_titles_strict(post):
        norm_line = normalize_for_match(line)
        if not norm_line:
            continue

        for al in aliases:
            norm_al = normalize_for_match(al)
            if not norm_al:
                continue

            if len(norm_al) <= 6:
                if re.search(rf'(?:^|\s){re.escape(norm_al)}(?:\s|$)', norm_line):
                    return True
            else:
                pattern = rf'(?:^|\s){re.escape(norm_al)}(?:\s|$)'
                if re.search(pattern, norm_line):
                    if ' ' not in norm_al and not norm_line.startswith(norm_al):
                        continue
                    return True

    return False


def match_posts_for_bundle(bundle, all_blog_posts, posts_by_id, global_first_post_id):
    bundle_id = str(bundle.get('id', '')).strip()
    expected_count = int(bundle.get('publishedPostsCounter') or 0)
    raw_title = bundle.get('title', '')
    clean_t = clean_bundle_title(raw_title)
    norm_title = normalize_for_match(clean_t)
    aliases = get_aliases_for_title(clean_t)

    matched_map = {}

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
                    len(posts) > max(expected_count + 2, 10) and
                    posts[0].get('id') == global_first_post_id
                )
                if not is_wall_fallback:
                    for p in posts:
                        if isinstance(p, dict) and p.get('id'):
                            matched_map[p['id']] = p
                    break
        except Exception:
            continue

    if not matched_map:
        try:
            feed_html = fetch_html(f'https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed')
            post_ids = re.findall(r'/posts/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', feed_html)
            if not post_ids:
                post_ids = re.findall(r'"post"\s*:\s*\{\s*"id"\s*:\s*"([a-f0-9\-]{36})"', feed_html)
            if 0 < len(set(post_ids)) <= max(expected_count + 5, 35):
                for pid in post_ids:
                    if pid in posts_by_id:
                        matched_map[pid] = posts_by_id[pid]
        except Exception:
            pass

    for p in all_blog_posts:
        pid = p.get('id')
        if not pid or pid in matched_map:
            continue

        p_bundle = p.get('bundle') or p.get('bundleId') or p.get('bundle_id')
        if (isinstance(p_bundle, dict) and str(p_bundle.get('id')) == bundle_id) or str(p_bundle) == bundle_id:
            matched_map[pid] = p
            continue

        if is_exact_title_match(norm_title, aliases, p):
            matched_map[pid] = p

    result_posts = list(matched_map.values())
    result_posts.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    return result_posts


def fetch_isolated_tag_posts(tag_id, tag_title, all_blog_posts):
    tag_id_str = str(tag_id).strip()
    norm_tag_title = normalize_for_match(tag_title)
    aliases = get_aliases_for_title(tag_title)
    matched = {}

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

        if is_exact_title_match(norm_tag_title, aliases, p):
            matched[pid] = p

    try:
        tag_html = fetch_html(f'https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id_str}')
        post_ids = re.findall(r'/posts/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', tag_html)
        posts_by_id = {p.get('id'): p for p in all_blog_posts if isinstance(p, dict) and p.get('id')}
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
    detected_level = 1
    max_chapter_found = 0
    free_chapters_set = set()
    max_free_end = 0
    min_free_start = 99999
    latest_range_label = ""
    has_1_to_n_start = False

    if not posts_list:
        return (detected_level, 0, 0, "", "", fallback_ts, False)

    paid_posts_levels = []
    for mp in posts_list:
        t_info = detect_post_tier_strict(mp)
        if not t_info["is_free"]:
            paid_posts_levels.append(t_info["level"])

    recent_paid_window = paid_posts_levels[:3]
    if 2 in recent_paid_window:
        detected_level = 2
    else:
        detected_level = 1

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
        oldest_post_ts if (oldest_post_ts := oldest_ts) else fallback_ts,
        has_1_to_n_start
    )


def process_data(extra_cfg):
    bundles_list = get_all_bundles()
    if not bundles_list:
        return []

    prev_items_map, previous_votes, previous_tags = load_previous_catalog_and_votes()
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

        prev_item = prev_items_map.get(bundle_id, {})
        raw_title = item.get('title', 'Без названия')
        clean_title = clean_bundle_title(raw_title)

        cover = prev_item.get('image') or 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Обложка'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            cover = clean_image_url(thumb['url'])

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

        prev_chapters = int(prev_item.get('chapters') or 0)
        prev_free = int(prev_item.get('free_chapters') or 0)
        total_chapters = max(b_end, post_max_ch, prev_chapters)
        free_chapters = max(free_ch_count, prev_free)
        if total_chapters > 0:
            free_chapters = min(free_chapters, total_chapters)
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0

        if has_free and not free_text:
            free_text = prev_item.get('free_text') or f"🆓 Бесплатно: {free_chapters} гл."

        if not latest_range_str:
            latest_range_str = b_range if b_range else (prev_item.get('latest_range') or (f"1-{total_chapters} гл." if total_chapters > 0 else "Новые главы"))

        if not matched_posts and prev_item.get('tier_level') == 2:
            detected_level = 2

        tier_name = "Основной уровень 2 ур. 500 ₽" if detected_level == 2 else "Базовый уровень 1 ур. 250 ₽"
        sub_link = SUB_LINKS[2] if detected_level == 2 else SUB_LINKS[1]
        ru_metric_tag = make_russian_utm_tag(clean_title, bundle_id, previous_tags)
        votes_count = fetch_current_votes_for_id(bundle_id, previous_votes.get(bundle_id, 0))

        all_post_tags = []
        for mp in matched_posts[:6]:
            all_post_tags.extend(extract_post_tag_names(mp))

        # Интернет-обогащение жанрами (если у тайтла ещё нет расширенных жанров или это новый релиз)
        prev_genres = prev_item.get('genres', [])
        web_extra = ""
        if not prev_genres or len(prev_genres) < 2:
            web_extra = fetch_web_genres_for_title(clean_title)

        genres = detect_genres_for_title(
            clean_title,
            all_post_tags,
            extra_text=f"{item.get('description', '')} {web_extra}",
            prev_genres=prev_genres
        )

        result.append({
            "id": bundle_id,
            "metric_tag": ru_metric_tag,
            "utm_campaign": ru_metric_tag,
            "vote_key": make_ascii_vote_key(bundle_id),
            "title": clean_title,
            "image": cover,
            "chapters": total_chapters,
            "free_chapters": free_chapters,
            "paid_chapters": paid_chapters,
            "latest_range": latest_range_str,
            "posts_count": max(posts_count, len(matched_posts)),
            "has_free": has_free,
            "free_text": free_text,
            "genres": genres,
            "last_update": datetime.datetime.fromtimestamp(updated_ts).strftime("%d/%m/%Y"),
            "timestamp": updated_ts,
            "created_ts": created_ts,
            "is_1_to_n": bool(b_start == 1 or started_from_ch1 or total_chapters > 0),
            "tier": tier_name,
            "tier_level": detected_level,
            "sub_link": build_utm_url(sub_link, ru_metric_tag, medium="кнопка_подписки", content=f"уровень_{detected_level}"),
            "link": build_utm_url(feed_link, ru_metric_tag, medium="карточка", content="лента_глав"),
            "votes": votes_count
        })

    # Скрытые теги из extra.json — ВСЕГДА Лицензии (2 ур. / 500 ₽)
    for custom in extra_cfg.get("custom_tags", []):
        tag_id = str(custom.get("tag_id", "")).strip()
        custom_id = str(custom.get("id", f"tag_{tag_id}"))
        prev_item = prev_items_map.get(custom_id, {})
        c_title = clean_bundle_title(custom.get("title", "Без названия"))
        c_link = custom.get("link") or f"https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id}"
        c_image = clean_image_url(custom.get("image", "").strip()) or prev_item.get("image", "")

        tag_posts = fetch_isolated_tag_posts(tag_id, c_title, all_blog_posts) if tag_id else []
        now_ts = int(time.time())

        (
            _,
            post_max_ch,
            free_ch_count,
            free_text,
            latest_range_str,
            oldest_post_ts,
            started_from_ch1
        ) = analyze_posts_stats(tag_posts, now_ts)

        updated_ts = prev_item.get('timestamp') or now_ts
        if tag_posts:
            updated_ts = tag_posts[0].get('publishTime') or tag_posts[0].get('createdAt') or now_ts

            if not c_image or 'placeholder.com' in c_image:
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

        lvl = 2
        prev_chapters = int(prev_item.get('chapters') or 0)
        total_chapters = max(post_max_ch, int(custom.get("chapters") or 0), prev_chapters)
        free_chapters = min(free_ch_count, total_chapters) if total_chapters > 0 else free_ch_count
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0

        tier_name = "Основной уровень 2 ур. 500 ₽"
        ru_metric_tag = make_russian_utm_tag(c_title, custom_id, previous_tags)
        votes_count = fetch_current_votes_for_id(custom_id, previous_votes.get(custom_id, 0))

        prev_genres = prev_item.get('genres', [])
        web_extra = fetch_web_genres_for_title(c_title) if not prev_genres else ""
        genres = detect_genres_for_title(c_title, extra_text=web_extra, prev_genres=prev_genres)

        result.append({
            "id": custom_id,
            "metric_tag": ru_metric_tag,
            "utm_campaign": ru_metric_tag,
            "vote_key": make_ascii_vote_key(custom_id),
            "title": c_title,
            "image": c_image,
            "chapters": total_chapters,
            "free_chapters": free_chapters,
            "paid_chapters": paid_chapters,
            "latest_range": latest_range_str or (f"1-{total_chapters} гл." if total_chapters > 0 else "Все главы"),
            "posts_count": len(tag_posts) if tag_posts else 1,
            "has_free": has_free,
            "free_text": free_text,
            "genres": genres,
            "last_update": datetime.datetime.fromtimestamp(updated_ts).strftime("%d/%m/%Y"),
            "timestamp": updated_ts,
            "created_ts": oldest_post_ts,
            "is_1_to_n": True,
            "tier": tier_name,
            "tier_level": lvl,
            "sub_link": build_utm_url(SUB_LINKS[2], ru_metric_tag, medium="кнопка_подписки", content="лицензия_2ур"),
            "link": build_utm_url(c_link, ru_metric_tag, medium="карточка", content="тег_лицензии"),
            "votes": votes_count
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
        save_votes_json_file(data)
        t2_count = sum(1 for x in data if x.get('tier_level') == 2)
        print(f"Успешно обновлено {len(data)} тайтлов (Лицензий 2 ур.: {t2_count}), спарсены жанры и сохранён votes.json.")
    else:
        print("Сохранен предыдущий кэш data.json и votes.json (Fallback).")
