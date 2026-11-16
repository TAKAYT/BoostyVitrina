import urllib.request
import urllib.parse
import json
import re
import datetime
import time
import os
import hashlib
import html as html_lib
import xml.etree.ElementTree as ET
from difflib import SequenceMatcher

BLOG_NAME = 'wynin'
BOOSTY_URL = f'https://boosty.to/{BLOG_NAME}'
BOOSTY_SHOWCASE_URL = f'https://boosty.to/{BLOG_NAME}/showcase'
TG_CHANNEL_USERNAME = 'LirlkzManga'
YT_HANDLE_URL = 'https://www.youtube.com/@LirlkzManga'
TIER_1_FALLBACK_URL = f'https://boosty.to/{BLOG_NAME}/purchase/3908979'

BOOSTY_API_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BOOSTY_SHOWCASE_URL,
    'Origin': 'https://boosty.to',
    'DNT': '1'
}

EXTERNAL_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
}

TYPE_OVERRIDES_FILE = 'type_overrides.json'
SPECIAL_TITLES_FILE = 'special_titles.json'
MEDIA_CACHE_DIR = 'media_cache'

CYR_TO_LAT = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
}

PRIMARY_VISIBLE_TAGS = {
    "некромантия", "система", "имба", "регрессия", "перерождение",
    "подземелья", "драконы", "призыв", "апокалипсис", "культивация",
    "фэнтези", "демоны", "месть", "артефакты", "романтика"
}

RU_EN_TAG_MAPPING = {
    "некромантия": "некромантия", "некромант": "некромантия", "нежить": "некромантия", "necromancy": "некромантия",
    "система": "система", "игровые элементы": "система", "литрпг": "система", "прокачка": "система", "рост уровня": "система", "system": "система",
    "скрытые способности": "имба", "имба": "имба", "гг имба": "имба", "сильный гг": "имба", "могущественный гг": "имба", "непобедимый гг": "имба", "overpowered": "имба",
    "регрессия": "регрессия", "возвращение в прошлое": "регрессия", "путешествие во времени": "регрессия", "петля времени": "регрессия", "regression": "регрессия",
    "реинкарнация": "перерождение", "перерождение": "перерождение", "исекай": "перерождение", "попаданец": "перерождение", "попадание в другой мир": "перерождение", "reincarnation": "перерождение", "isekai": "перерождение",
    "подземелья": "подземелья", "данжи": "подземелья", "башня": "подземелья", "охотники": "подземелья", "врата": "подземелья", "dungeon": "подземелья",
    "драконы": "драконы", "дракон": "драконы", "dragons": "драконы",
    "призыв": "призыв", "призыватель": "призыв", "питомцы": "призыв", "укрощение": "призыв", "монстры": "призыв", "звери": "призыв", "гоблины": "призыв", "summoning": "призыв",
    "апокалипсис": "апокалипсис", "постапокалипсис": "апокалипсис", "зомби": "апокалипсис", "выживание": "апокалипсис", "apocalypse": "апокалипсис", "survival": "апокалипсис",
    "культивация": "культивация", "боевые искусства": "культивация", "мурим": "культивация", "сянься": "культивация", "уся": "культивация", "дао": "культивация", "cultivation": "культивация", "martial arts": "культивация",
    "демоны": "демоны", "боги": "демоны", "владыка демонов": "демоны", "demons": "демоны", "gods": "демоны",
    "месть": "месть", "антигерой": "месть", "жестокий мир": "месть", "злодей": "месть", "revenge": "месть",
    "артефакты": "артефакты", "алхимия": "артефакты", "кузнечное дело": "артефакты", "оружие": "артефакты", "мечник": "артефакты",
    "фэнтези": "фэнтези", "магия": "фэнтези", "рыцари": "фэнтези", "эльфы": "фэнтези", "средневековье": "фэнтези", "аристократия": "фэнтези", "fantasy": "фэнтези", "magic": "фэнтези",
    "романтика": "романтика", "любовь": "романтика", "отношения": "романтика", "romance": "романтика",
    "гарем": "гарем", "комедия": "комедия", "экшен": "экшен", "приключения": "приключения", "драма": "драма", "школа": "школа", "академия": "академия", "повседневность": "повседневность", "триллер": "триллер", "хоррор": "хоррор", "мистика": "мистика"
}

STRICT_SINGLE_TAG_PATTERNS = [
    ("некромантия", re.compile(r'(?:^|[^а-яa-z0-9])(некромант[а-я]*|скелет[а-я]*|нежит[а-я]*|мертвец[а-я]*|мёртв[а-я]*|мертв[а-я]*|лич(?:а|ем|и|ей)?|кладбищ[а-я]*|кост(?:ей|и|яной))(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("система", re.compile(r'(?:^|[^а-яa-z0-9])(систем[а-я]*|уров(?:ень|ня|ней|нем)|лвл|lvl|sss|3s|s-ранг[а-я]*|f-ранг[а-я]*|ex-ранг[а-я]*|ранг(?:а|ов|у)?|ранкер[а-я]*|квест[а-я]*|прокачк[а-я]*|прокачива[а-я]*|игрок[а-я]*|навык[а-я]*|талант[а-я]*|очков|статус[а-я]*|логин|лутбокс[а-я]*|чит(?:ов|ы)?|нуб)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("имба", re.compile(r'(?:^|[^а-яa-z0-9])(имб[а-я]*|сильнейш[а-я]*|максимальн[а-я]*|непобедим[а-я]*|всемогущ[а-я]*|абсолютн[а-я]*|100\s*лет|999|катастроф[а-я]*|божественн[а-я]*|верховн[а-я]*|нет\s+предела|босс|безграничн[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("регрессия", re.compile(r'(?:^|[^а-яa-z0-9])(регресс[а-я]*|вернул[а-я]*\s+в\s+прошл[а-я]*|в\s+прошлое|заново|спустя\s+\d+|возвраща[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("перерождение", re.compile(r'(?:^|[^а-яa-z0-9])(перерожд[а-я]*|перерод[а-я]*|реинкарнац[а-я]*|перевопло[а-я]*|возрожд[а-я]*|исекай|в\s+другом\s+мире|в\s+новелле|в\s+игре)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("подземелья", re.compile(r'(?:^|[^а-яa-z0-9])(подземел[а-я]*|данж[а-я]*|башн[а-я]*|этаж[а-я]*|врат(?:а|ах)|охотник[а-я]*|рейд[а-я]*|гробниц[а-я]*|лабиринт[а-я]*|бездн[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("драконы", re.compile(r'(?:^|[^а-яa-z0-9])(дракон[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("призыв", re.compile(r'(?:^|[^а-яa-z0-9])(призыв[а-я]*|призван[а-я]*|укротител[а-я]*|питом[а-я]*|звер[а-я]*|гоблин[а-я]*|фамильяр[а-я]*|монстр[а-я]*|чудовищ[а-я]*|эволюци[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("апокалипсис", re.compile(r'(?:^|[^а-яa-z0-9])(апокалипсис[а-я]*|постапокалипсис[а-я]*|зомби|вирус[а-я]*|судный\s+день|выживан[а-я]*|конец\s+света|мутант[а-я]*|пустош[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("культивация", re.compile(r'(?:^|[^а-яa-z0-9])(культиват[а-я]*|культивац[а-я]*|дао|бессмерт[а-я]*|боевых\s+искусств|мурим[а-я]*|сект[а-я]*|император[а-я]*|небесн[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("демоны", re.compile(r'(?:^|[^а-яa-z0-9])(демон[а-я]*|дьявол[а-я]*|падш[а-я]*|бог[а-я]*|божеств[а-я]*|повелител[а-я]*\s+тьмы|адский)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("месть", re.compile(r'(?:^|[^а-яa-z0-9])(мест(?:ь|и|ью)|отомст[а-я]*|предател[а-я]*|расплат[а-я]*|злоде[а-я]*|убийц[а-я]*|уничтож[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("артефакты", re.compile(r'(?:^|[^а-яa-z0-9])(оруди[а-я]*|оружи[а-я]*|артефакт[а-я]*|кузнец[а-я]*|алхим[а-я]*|сокровищ[а-я]*|меч[а-я]*|клинок|клинка)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("романтика", re.compile(r'(?:^|[^а-яa-z0-9])(романтик[а-я]*|моя\s+жена|моя\s+девушка|гарем[а-я]*|красавиц[а-я]*|детей|воспитывать)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("фэнтези", re.compile(r'(?:^|[^а-яa-z0-9])(маги[а-я]*|архимаг[а-я]*|маг(?:а|у|ом|и)?|волшебн[а-я]*|академи[а-я]*|рыцар[а-я]*|эльф[а-я]*|королев[а-я]*|корол[а-я]*|геро[а-я]*|авантюрист[а-я]*|владык[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE))
]


def fetch_json(url, timeout=18, is_boosty=False):
    hdrs = dict(BOOSTY_API_HEADERS if is_boosty else EXTERNAL_HEADERS)
    req = urllib.request.Request(url, headers=hdrs)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode('utf-8', errors='ignore'))


def fetch_html_external(url, timeout=16):
    req = urllib.request.Request(url, headers=EXTERNAL_HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode('utf-8', errors='ignore')


def clean_image_url(url):
    if not url or not isinstance(url, str):
        return ""
    if 'images.boosty.to/image/' in url:
        return url.split('?')[0]
    return url


def download_image_to_cache(img_url, file_prefix):
    if not img_url or not isinstance(img_url, str) or not img_url.startswith('http'):
        return ""
    try:
        os.makedirs(MEDIA_CACHE_DIR, exist_ok=True)
        url_hash = hashlib.md5(img_url.encode('utf-8')).hexdigest()[:10]
        safe_prefix = re.sub(r'[^a-zA-Z0-9_-]', '', str(file_prefix))[:28]
        local_path = f"{MEDIA_CACHE_DIR}/{safe_prefix}_{url_hash}.jpg"
        if os.path.exists(local_path) and os.path.getsize(local_path) > 800:
            return local_path

        req = urllib.request.Request(
            img_url,
            headers={
                'User-Agent': EXTERNAL_HEADERS['User-Agent'],
                'Referer': 'https://boosty.to/'
            }
        )
        with urllib.request.urlopen(req, timeout=14) as resp:
            img_bytes = resp.read()
            if img_bytes and len(img_bytes) > 500:
                with open(local_path, 'wb') as f:
                    f.write(img_bytes)
                return local_path
    except Exception as e:
        print(f"[WARN] Не удалось кэшировать {file_prefix}: {e}")
    return img_url


def normalize_for_match(s):
    if not s:
        return ""
    s = str(s).lower().replace('ё', 'е')
    s = re.sub(r'\[\s*\d+\s*[-—–]\s*\d+[^\]]*\]', ' ', s)
    s = re.sub(r'\b(?:глав[аы]?|гл\.?|часть|сезон|все\s*главы)\b', ' ', s)
    s = re.sub(r'\b\d+\s*[-—–]\s*\d+\b', ' ', s)
    s = re.sub(r'[^a-zа-я0-9\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def make_clean_english_utm_tag(title_str, item_id=""):
    norm = normalize_for_match(title_str)
    out = []
    for ch in norm:
        if ch in CYR_TO_LAT:
            out.append(CYR_TO_LAT[ch])
        elif 'a' <= ch <= 'z' or '0' <= ch <= '9':
            out.append(ch)
        else:
            out.append('_')
    slug = re.sub(r'_+', '_', ''.join(out)).strip('_')[:48]
    if not slug:
        slug = f"manga_{re.sub(r'[^a-zA-Z0-9]', '', str(item_id)).lower()}"
    return slug


def make_ascii_vote_key(item_id):
    return "v_" + re.sub(r'[^a-zA-Z0-9]', '', str(item_id or 'unknown'))


def build_clean_utm_url(base_url, eng_metric_tag):
    if not base_url:
        base_url = BOOSTY_SHOWCASE_URL
    parsed = urllib.parse.urlsplit(base_url)
    query_params = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    for noisy_key in ['from', 'title', 'month', 'utm_source', 'utm_medium', 'utm_content', 'utm_term']:
        query_params.pop(noisy_key, None)
    query_params['utm_campaign'] = eng_metric_tag
    new_query = urllib.parse.urlencode(query_params)
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))


def find_nested_values(obj, target_keys):
    found = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in target_keys:
                found.append(v)
            found.extend(find_nested_values(v, target_keys))
    elif isinstance(obj, list):
        for item in obj:
            found.extend(find_nested_values(item, target_keys))
    return found


def extract_initial_state(page_url):
    try:
        raw_html = fetch_html_external(page_url, timeout=18)
        m = re.search(r'<script[^>]+id=["\']initial-state["\'][^>]*>(.*?)</script>', raw_html, re.DOTALL | re.IGNORECASE)
        if m:
            return json.loads(html_lib.unescape(m.group(1)))
    except Exception as e:
        print(f"[WARN] initial-state не получен для {page_url}: {e}")
    return {}


def load_type_overrides():
    overrides = {}
    if os.path.exists(TYPE_OVERRIDES_FILE):
        try:
            with open(TYPE_OVERRIDES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    overrides = data
        except Exception:
            pass
    return overrides


def save_type_overrides(overrides_dict):
    ordered = {
        "_comment": "Справочник приоритета типа тайтла (manhwa, manhua, manga)."
    }
    for k in sorted(overrides_dict.keys(), key=lambda x: x.lower()):
        if k == "_comment":
            continue
        ordered[k] = overrides_dict[k]
    with open(TYPE_OVERRIDES_FILE, 'w', encoding='utf-8') as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)


def resolve_type_from_overrides(clean_title, overrides_dict):
    if clean_title not in overrides_dict:
        overrides_dict[clean_title] = ""

    norm_target = normalize_for_match(clean_title)
    for raw_k, raw_v in overrides_dict.items():
        if raw_k == "_comment" or not raw_v:
            continue
        val = str(raw_v).strip().lower()
        if val in ("западный комикс", "western", "comic", "manhwa", "манхва", "корея"):
            mapped_val = "manhwa"
        elif val in ("manhua", "маньхуа", "китай"):
            mapped_val = "manhua"
        elif val in ("manga", "манга", "oel манга", "oel manga", "япония"):
            mapped_val = "manga"
        else:
            continue

        if raw_k.strip().lower() == clean_title.strip().lower() or normalize_for_match(raw_k) == norm_target:
            if not overrides_dict.get(clean_title):
                overrides_dict[clean_title] = mapped_val
            return mapped_val
    return None


def load_special_titles():
    spec = {"romance_sakura": [], "frozen_titles": [], "completed_titles": [], "hidden_tags_overrides": {}}
    if os.path.exists(SPECIAL_TITLES_FILE):
        try:
            with open(SPECIAL_TITLES_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    spec.update(loaded)
        except Exception:
            pass

    romance_norms = {normalize_for_match(x) for x in spec.get("romance_sakura", []) if x}
    frozen_norms = {normalize_for_match(x) for x in spec.get("frozen_titles", []) if x}
    completed_norms = {normalize_for_match(x) for x in spec.get("completed_titles", []) if x}
    frozen_norms -= completed_norms

    hidden_overrides_norm = {}
    for k, tags_list in (spec.get("hidden_tags_overrides") or {}).items():
        if isinstance(tags_list, list):
            hidden_overrides_norm[normalize_for_match(k)] = [str(t).lower().strip() for t in tags_list if t]

    return romance_norms, frozen_norms, completed_norms, hidden_overrides_norm


def map_raw_tags_to_all_tags(raw_tag_strings):
    mapped = []
    for raw in raw_tag_strings:
        if not raw:
            continue
        low = str(raw).lower().replace('ё', 'е').strip()
        if low in RU_EN_TAG_MAPPING:
            target = RU_EN_TAG_MAPPING[low]
            if target not in mapped:
                mapped.append(target)
            continue
        for k, target in RU_EN_TAG_MAPPING.items():
            if len(k) >= 4 and k in low and target not in mapped:
                mapped.append(target)
    return mapped


def detect_tags_and_type_fast(clean_title, post_tags, prev_item, overrides_dict, is_romance_special, custom_hidden_overrides):
    override_type = resolve_type_from_overrides(clean_title, overrides_dict)
    combined_title_text = f" {clean_title} {' '.join(post_tags or [])} ".lower().replace('ё', 'е')
    tag_votes = {}

    for tag_key, pattern in STRICT_SINGLE_TAG_PATTERNS:
        if pattern.search(combined_title_text):
            tag_votes[tag_key] = tag_votes.get(tag_key, 0) + 2

    for pt in map_raw_tags_to_all_tags(post_tags or []):
        tag_votes[pt] = tag_votes.get(pt, 0) + 2

    if is_romance_special:
        tag_votes["романтика"] = tag_votes.get("романтика", 0) + 5

    if isinstance(prev_item, dict):
        for pg in (prev_item.get("genres") or []):
            if pg in PRIMARY_VISIBLE_TAGS:
                tag_votes[pg] = tag_votes.get(pg, 0) + 1

    final_type = override_type or (prev_item.get("content_type") if isinstance(prev_item, dict) else None) or "manhwa"

    sorted_all_tags = [t for t, _ in sorted(tag_votes.items(), key=lambda kv: kv[1], reverse=True)]
    visible_genres = [t for t in sorted_all_tags if t in PRIMARY_VISIBLE_TAGS][:3] or ["фэнтези"]

    if is_romance_special and "романтика" not in visible_genres:
        visible_genres.insert(0, "романтика")
        visible_genres = visible_genres[:3]

    hidden_tags = []
    for ht in custom_hidden_overrides:
        if ht not in hidden_tags and ht not in visible_genres:
            hidden_tags.append(ht)
    for t in sorted_all_tags:
        if t not in visible_genres and t not in hidden_tags:
            hidden_tags.append(t)

    return visible_genres, hidden_tags[:10], final_type


def fetch_latest_telegram_channel_news(limit=2):
    news_items = []
    try:
        html_str = fetch_html_external(f"https://t.me/s/{TG_CHANNEL_USERNAME}", timeout=12)
        blocks = html_str.split('class="tgme_widget_message_wrap')
        parsed_blocks = []

        for block in blocks[1:]:
            post_link_m = re.search(rf'data-post="{TG_CHANNEL_USERNAME}/(\d+)"', block)
            if not post_link_m:
                continue
            post_id = post_link_m.group(1)
            post_url = f"https://t.me/{TG_CHANNEL_USERNAME}/{post_id}"

            photo_url = ""
            photo_m = re.search(r'tgme_widget_message_photo_wrap[^>]+style="[^"]*background-image:url\(\'([^\']+)\'\)', block)
            if photo_m:
                photo_url = photo_m.group(1)

            text_m = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', block, re.DOTALL)
            raw_html_text = text_m.group(1) if text_m else ""
            clean_text = re.sub(r'<br\s*/?>', '\n', raw_html_text)
            clean_text = re.sub(r'<[^>]+>', '', clean_text)
            clean_text = html_lib.unescape(clean_text).strip()

            if not clean_text and not photo_url:
                continue

            date_m = re.search(r'<time[^>]+datetime="([^"]+)"', block)
            iso_date = date_m.group(1) if date_m else ""
            display_date = iso_date[:10] if iso_date else ""
            if len(display_date) == 10 and '-' in display_date:
                parts = display_date.split('-')
                display_date = f"{parts[2]}.{parts[1]}.{parts[0]}"

            short_text = clean_text.replace('\n', ' ').strip()
            if len(short_text) > 125:
                short_text = short_text[:122].rstrip() + "..."

            parsed_blocks.append({
                "id": post_id,
                "date": display_date or "Свежий пост",
                "short_text": short_text or "Публикация в Telegram-канале Lirlkz",
                "full_text": clean_text or "Публикация в Telegram-канале Lirlkz",
                "raw_image": photo_url,
                "link": post_url
            })

        parsed_blocks.sort(key=lambda x: int(x["id"]) if str(x["id"]).isdigit() else 0, reverse=True)
        for item in parsed_blocks[:limit]:
            local_img = download_image_to_cache(item["raw_image"], f"tg_{item['id']}") if item["raw_image"] else ""
            news_items.append({
                "id": item["id"],
                "date": item["date"],
                "short_text": item["short_text"],
                "full_text": item["full_text"],
                "image": local_img,
                "remote_image": item["raw_image"],
                "link": item["link"]
            })
        return news_items
    except Exception as e:
        print(f"[WARN] Ошибка загрузки ТГ: {e}")
        return []


def resolve_yt_channel_id_and_videos(limit=6):
    channel_id = ""
    videos = []
    try:
        raw_html = fetch_html_external(YT_HANDLE_URL, timeout=14)
        cid_m = re.search(r'"externalId":"(UC[^"]+)"', raw_html) or re.search(r'"channelId":"(UC[^"]+)"', raw_html)
        if cid_m:
            channel_id = cid_m.group(1)

        if channel_id:
            rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
            xml_str = fetch_html_external(rss_url, timeout=12)
            root = ET.fromstring(xml_str)
            ns = {
                'atom': 'http://www.w3.org/2005/Atom',
                'yt': 'http://www.youtube.com/xml/schemas/2015',
                'media': 'http://search.yahoo.com/mrss/'
            }
            for entry in root.findall('atom:entry', ns)[:limit]:
                vid_el = entry.find('yt:videoId', ns)
                title_el = entry.find('atom:title', ns)
                pub_el = entry.find('atom:published', ns)
                if vid_el is None or not vid_el.text:
                    continue
                vid = vid_el.text.strip()
                title = title_el.text.strip() if (title_el is not None and title_el.text) else "Новое видео Lirlkz"
                raw_date = pub_el.text[:10] if (pub_el is not None and pub_el.text) else ""
                disp_date = raw_date
                if len(raw_date) == 10 and '-' in raw_date:
                    p = raw_date.split('-')
                    disp_date = f"{p[2]}.{p[1]}.{p[0]}"
                remote_thumb = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
                local_thumb = download_image_to_cache(remote_thumb, f"yt_{vid}")
                videos.append({
                    "video_id": vid,
                    "title": title,
                    "date": disp_date,
                    "thumbnail": local_thumb or remote_thumb,
                    "remote_thumbnail": remote_thumb,
                    "link": f"https://www.youtube.com/watch?v={vid}"
                })
    except Exception as e:
        print(f"[WARN] Ошибка YouTube: {e}")
    return channel_id, videos


def fetch_subscription_tiers(all_blog_posts):
    tiers = []
    seen_ids = set()

    try:
        raw = fetch_json(f'https://api.boosty.to/v1/blog/{BLOG_NAME}/subscription_level/?show_free_level=false', is_boosty=True)
        raw_list = []
        if isinstance(raw, dict):
            raw_list = raw.get('data') or raw.get('levels') or []
        elif isinstance(raw, list):
            raw_list = raw

        if not raw_list:
            state = extract_initial_state(BOOSTY_URL)
            for found in find_nested_values(state, {'subscriptionLevels', 'levels'}):
                if isinstance(found, list) and found:
                    raw_list.extend(found)

        for lvl in raw_list:
            if not isinstance(lvl, dict):
                continue
            lid = str(lvl.get('id') or '').strip()
            price = int(float(lvl.get('price') or 0))
            name = str(lvl.get('name') or '').strip()
            if not lid or price <= 0 or lid in seen_ids:
                continue
            seen_ids.add(lid)
            tiers.append({
                "id": lid,
                "name": name or "Подписка на озвучку",
                "price": price,
                "url": f"https://boosty.to/{BLOG_NAME}/purchase/{lid}",
                "description": "Доступ к озвученным главам на Boosty Lirlkz"
            })
    except Exception:
        pass

    if not tiers:
        for p in all_blog_posts:
            sl = p.get('subscriptionLevel')
            if isinstance(sl, dict):
                lid = str(sl.get('id') or '').strip()
                price = int(float(sl.get('price') or 0))
                if lid and price > 0 and lid not in seen_ids:
                    seen_ids.add(lid)
                    tiers.append({
                        "id": lid,
                        "name": str(sl.get('name') or 'Подписка на озвучку'),
                        "price": price,
                        "url": f"https://boosty.to/{BLOG_NAME}/purchase/{lid}",
                        "description": "Доступ к озвученным главам на Boosty Lirlkz"
                    })

    tiers.sort(key=lambda x: x['price'])
    if not tiers:
        tiers.append({
            "id": "3908979",
            "name": "Подписка на озвучку",
            "price": 0,
            "url": TIER_1_FALLBACK_URL,
            "description": "Доступ к озвученным главам и ранним релизам Lirlkz"
        })
    return tiers


def get_blog_stats_and_goals(catalog_items=None, all_blog_posts=None, yt_channel_id="", yt_videos=None, tiers=None):
    now_utc = datetime.datetime.utcnow()
    month_key = f"{now_utc.year}_{now_utc.month:02d}"

    stats = {
        "creator_name": "Lirlkz — Озвучка манги",
        "avatar": "",
        "subscribers": 0,
        "posts": len(all_blog_posts or []),
        "videos_count": len(all_blog_posts or []),
        "videos_url": f"https://boosty.to/{BLOG_NAME}/media/video",
        "total_free_chapters": 0,
        "total_paid_chapters": 0,
        "total_voiced_chapters": 0,
        "monthly_history": {},
        "monthly_new_paid_subs": 0,
        "subscription_tiers": tiers or [],
        "goals": [],
        "tg_news": [],
        "yt_channel_id": yt_channel_id or "",
        "yt_videos": yt_videos or []
    }

    try:
        blog_data = fetch_json(f'https://api.boosty.to/v1/blog/{BLOG_NAME}', is_boosty=True)
        if isinstance(blog_data, dict):
            if blog_data.get('title'):
                stats['creator_name'] = str(blog_data['title'])
            raw_av = blog_data.get('avatarUrl') or (blog_data.get('owner') or {}).get('avatarUrl') or ''
            if raw_av:
                stats['avatar'] = download_image_to_cache(raw_av, 'creator_avatar')
            count_obj = blog_data.get('count') or {}
            if isinstance(count_obj, dict):
                stats['subscribers'] = int(count_obj.get('subscribers') or 0)
                stats['posts'] = int(count_obj.get('posts') or stats['posts'])
    except Exception as e:
        print(f"[WARN] Ошибка профиля блога: {e}")

    if not stats['avatar']:
        state = extract_initial_state(BOOSTY_URL)
        for av in find_nested_values(state, {'avatarUrl'}):
            if isinstance(av, str) and av.startswith('http'):
                stats['avatar'] = download_image_to_cache(av, 'creator_avatar')
                break

    for endpoint in [
        f'https://api.boosty.to/v1/target/{BLOG_NAME}/',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/target/'
    ]:
        try:
            raw_targets = fetch_json(endpoint, is_boosty=True)
            t_list = []
            if isinstance(raw_targets, dict):
                d = raw_targets.get('data', raw_targets)
                t_list = d if isinstance(d, list) else (d.get('targets') or d.get('data') or [])
            elif isinstance(raw_targets, list):
                t_list = raw_targets
            for t in t_list:
                if isinstance(t, dict) and t.get('targetSum'):
                    stats['goals'].append({
                        "current": int(float(t.get('currentSum') or 0)),
                        "target": int(float(t.get('targetSum') or 100)),
                        "type": t.get('type', 'subscribers'),
                        "description": t.get('description', '')
                    })
            if stats['goals']:
                break
        except Exception:
            continue

    stats['tg_news'] = fetch_latest_telegram_channel_news(limit=2)

    if isinstance(catalog_items, list) and catalog_items:
        free_sum = sum(int(x.get("free_chapters") or 0) for x in catalog_items)
        paid_sum = sum(int(x.get("paid_chapters") or 0) for x in catalog_items)
        stats["total_free_chapters"] = free_sum
        stats["total_paid_chapters"] = paid_sum
        stats["total_voiced_chapters"] = free_sum + paid_sum

    return stats


def get_all_bundles():
    raw_bundles = []
    seen_ids = set()

    # 1. Пробуем основные JSON API эндпоинты бандлов/витрины
    for ep in [
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/?limit=300',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post_bundle/?limit=300',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/showcase/'
    ]:
        try:
            raw = fetch_json(ep, is_boosty=True)
            if not isinstance(raw, dict):
                continue
            candidates = []
            for key in ('bundles', 'postBundles', 'data', 'items'):
                val = raw.get(key)
                if isinstance(val, list):
                    candidates.extend(val)
                elif isinstance(val, dict):
                    for subk in ('bundles', 'postBundles', 'items', 'data'):
                        if isinstance(val.get(subk), list):
                            candidates.extend(val[subk])
            for b in candidates:
                if isinstance(b, dict) and (b.get('title') or b.get('name')):
                    bid = str(b.get('id') or '').strip()
                    if bid and bid not in seen_ids:
                        seen_ids.add(bid)
                        raw_bundles.append(b)
        except Exception as e:
            print(f"[WARN] Эндпоинт {ep}: {e}")

    # 2. Резервный парсинг initial-state прямо со страницы https://boosty.to/wynin/showcase
    if not raw_bundles:
        state = extract_initial_state(BOOSTY_SHOWCASE_URL)
        for found in find_nested_values(state, {'bundles', 'postBundles', 'showcase'}):
            if isinstance(found, list):
                for b in found:
                    if isinstance(b, dict) and (b.get('title') or b.get('name')):
                        bid = str(b.get('id') or '').strip()
                        if bid and bid not in seen_ids:
                            seen_ids.add(bid)
                            raw_bundles.append(b)

    # 3. Строгая дедупликация по нормализованному названию (чтобы ничего не двоилось)
    unique_bundles = []
    seen_titles = set()
    for b in raw_bundles:
        clean_t = clean_bundle_title(b.get('title') or b.get('name') or '')
        norm_t = normalize_for_match(clean_t)
        if not norm_t or norm_t in seen_titles:
            continue
        seen_titles.add(norm_t)
        unique_bundles.append(b)

    print(f"[INFO] Загружено уникальных бандлов: {len(unique_bundles)}")
    return unique_bundles


def get_all_blog_posts():
    all_posts = []
    seen_pids = set()
    offset = ""
    for _ in range(30):
        url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=100'
        if offset:
            url += f'&offset={urllib.parse.quote(str(offset))}'
        try:
            raw = fetch_json(url, is_boosty=True)
            data = raw.get('data', [])
            if not data or not isinstance(data, list):
                break
            for p in data:
                pid = str(p.get('id') or '').strip()
                if pid and pid not in seen_pids:
                    seen_pids.add(pid)
                    all_posts.append(p)
            extra = raw.get('extra', {})
            if extra.get('isLast') or not extra.get('offset'):
                break
            offset = extra.get('offset')
            time.sleep(0.05)
        except Exception as e:
            print(f"[WARN] Ошибка пагинации постов: {e}")
            break
    print(f"[INFO] Загружено уникальных постов блога: {len(all_posts)}")
    return all_posts


def clean_bundle_title(raw_title):
    if not raw_title:
        return "Без названия"
    cleaned = re.sub(r'\[.*?\]', '', str(raw_title))
    cleaned = re.sub(r'\[[^\]]*$', '', cleaned)
    cleaned = re.sub(r'(?i)\b(?:глав[аы]?|гл\.?)\s*\d+\s*[-—–]\s*\d+\b', '', cleaned)
    cleaned = re.sub(r'(?i)\b\d+\s*[-—–]\s*\d+\s*(?:глав[аы]?|гл\.?)\b', '', cleaned)
    cleaned = re.sub(r'(?i)\s*глав[аы]?\s*$', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip(' -—–:|•')
    return cleaned if cleaned else str(raw_title).strip()


def parse_strict_chapter_info(text):
    if not text or not isinstance(text, str):
        return ("", 0, 0)
    cleaned = re.sub(r'\b202\d\b', '', text)
    cleaned = re.sub(r'\b\d{2}\.\d{2}\.\d{4}\b', '', cleaned)
    candidates = []
    for m in re.finditer(r'\b(\d+)\s*[-—–~]\s*(\d+)\s*(?:глав[аы]?|гл\.?|ч\.?|част[ьи])?\b', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 <= s <= e < 2500 and (e - s) <= 300:
            candidates.append((f"{s}-{e} гл.", max(1, s), e))
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
    return max(candidates, key=lambda x: (x[2], x[2] - x[1]))


def extract_post_tag_names(post):
    names = []
    for t in (post.get('tags') or post.get('postTags') or []):
        if isinstance(t, dict) and t.get('title'):
            names.append(str(t['title']).strip())
        elif isinstance(t, str) and t.strip():
            names.append(t.strip())
    return names


def is_similar_tag_to_bundle(tag_text, bundle_title):
    t_norm = normalize_for_match(tag_text)
    b_norm = normalize_for_match(bundle_title)
    if not t_norm or not b_norm or len(t_norm) < 3:
        return False
    if t_norm == b_norm or t_norm in b_norm or b_norm in t_norm:
        return True
    return SequenceMatcher(None, t_norm, b_norm).ratio() >= 0.72


def extract_high_res_cover_from_post(post):
    if not isinstance(post, dict):
        return ""
    for key in ('data', 'teaser'):
        for b in (post.get(key) or []):
            if isinstance(b, dict):
                for field in ('preview', 'url', 'image'):
                    val = b.get(field)
                    if isinstance(val, str) and 'images.boosty.to/image/' in val:
                        return clean_image_url(val)
    return ""


def detect_post_tier_strict(post):
    if not isinstance(post, dict):
        return {"level": 1, "is_free": False}
    if post.get('hasAccess') is True:
        return {"level": 1, "is_free": True}
    sub_obj = post.get('subscriptionLevel') or post.get('subscription_level')
    post_price = float(post.get('price') or 0)
    if not sub_obj and post_price == 0:
        return {"level": 1, "is_free": True}
    sub_price = float(sub_obj.get('price') or 0) if isinstance(sub_obj, dict) else 0
    if sub_price == 0 and post_price == 0:
        return {"level": 1, "is_free": True}
    return {"level": 2 if sub_price >= 450 else 1, "is_free": False}


def fetch_posts_for_bundle(bundle, all_blog_posts, posts_by_id):
    bundle_id = str(bundle.get('id', '')).strip()
    clean_t = clean_bundle_title(bundle.get('title') or bundle.get('name') or '')
    norm_b = normalize_for_match(clean_t)
    matched_map = {}

    for key in ('lastPost', 'latestPost', 'firstPost'):
        lp = bundle.get(key)
        if isinstance(lp, dict) and lp.get('id'):
            pid = str(lp['id']).strip()
            matched_map[pid] = posts_by_id.get(pid, lp)

    for inline_p in (bundle.get('posts') or bundle.get('items') or []):
        if isinstance(inline_p, dict) and inline_p.get('id'):
            pid = str(inline_p['id']).strip()
            matched_map[pid] = posts_by_id.get(pid, inline_p)

    # API конкретного бандла
    for ep_tpl in (
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=100',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post_bundle/{bundle_id}/'
    ):
        try:
            raw = fetch_json(ep_tpl, is_boosty=True)
            posts = []
            if isinstance(raw, dict):
                d = raw.get('data', raw)
                if isinstance(d, list):
                    posts = d
                elif isinstance(d, dict):
                    posts = d.get('posts') or d.get('items') or d.get('data') or []
            for p in posts:
                if isinstance(p, dict) and p.get('id'):
                    pid = str(p['id']).strip()
                    matched_map[pid] = posts_by_id.get(pid, p)
            if posts:
                break
        except Exception:
            continue

    # Сопоставляем посты блога по bundleId, по тегам (мягкое совпадение) и по заголовку
    for p in all_blog_posts:
        pid = str(p.get('id') or '').strip()
        if not pid or pid in matched_map:
            continue
        headline = str(p.get('title') or '').strip()
        low_h = headline.lower()
        if low_h.startswith('график на ') or low_h.startswith('расписание на '):
            continue

        p_bundle = p.get('bundle') or p.get('bundleId') or p.get('bundle_id')
        p_bundle_ids = [str(x) for x in (p.get('bundleIds') or [])]
        if (isinstance(p_bundle, dict) and str(p_bundle.get('id')).strip() == bundle_id) or str(p_bundle).strip() == bundle_id or bundle_id in p_bundle_ids:
            matched_map[pid] = p
            continue

        if any(is_similar_tag_to_bundle(tag, clean_t) for tag in extract_post_tag_names(p)):
            matched_map[pid] = p
            continue

        if norm_b and norm_b in normalize_for_match(headline):
            matched_map[pid] = p

    filtered = list(matched_map.values())
    filtered.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    return filtered


def analyze_posts_stats(posts_list, fallback_ts, eng_metric_tag="", expected_title=""):
    detected_level = 1
    max_chapter_found = 0
    free_chapters_set = set()
    latest_range_label = ""
    best_latest_post_id = ""
    best_free_post_id = ""
    seen_ranges_map = {}

    if not posts_list:
        return (1, 0, 0, "", "", fallback_ts, "", "", [], [], 0)

    paid_posts_count = 0
    for mp in posts_list:
        t_info = detect_post_tier_strict(mp)
        if not t_info["is_free"]:
            paid_posts_count += 1
            if t_info["level"] == 2:
                detected_level = 2

    oldest_ts = posts_list[-1].get('publishTime') or posts_list[-1].get('createdAt') or fallback_ts
    best_latest_post_id = str(posts_list[0].get('id') or '').strip()

    seen_post_ids = set()
    for idx, mp in enumerate(posts_list, 1):
        mp_id = str(mp.get('id') or '').strip()
        if not mp_id or mp_id in seen_post_ids:
            continue
        raw_p_title = str(mp.get('title') or '').strip()
        if raw_p_title.lower().startswith(('график на ', 'расписание на ')):
            continue
        seen_post_ids.add(mp_id)

        t_info = detect_post_tier_strict(mp)
        mp_ts = mp.get('publishTime') or mp.get('createdAt') or fallback_ts
        cur_range, cur_start, cur_end = parse_strict_chapter_info(raw_p_title)

        if idx == 1 and cur_end > 0:
            latest_range_label = cur_range
        if cur_end > max_chapter_found:
            max_chapter_found = cur_end
            best_latest_post_id = mp_id
            if not latest_range_label:
                latest_range_label = cur_range

        range_label = cur_range or (raw_p_title[:52] if raw_p_title else f"Выпуск #{idx}")
        direct_url = build_clean_utm_url(f"https://boosty.to/{BLOG_NAME}/posts/{mp_id}", eng_metric_tag or "post")
        entry = {
            "post_id": mp_id,
            "title": raw_p_title or f"{expected_title} ({range_label})".strip(),
            "range": range_label,
            "start_ch": cur_start if cur_start > 0 else 9999,
            "end_ch": cur_end,
            "ts": mp_ts,
            "date": datetime.datetime.fromtimestamp(mp_ts).strftime("%d.%m.%Y"),
            "is_free": bool(t_info["is_free"]),
            "tier_level": 0 if t_info["is_free"] else t_info["level"],
            "link": direct_url
        }

        range_key = f"{cur_start}_{cur_end}" if cur_end > 0 else mp_id
        if range_key not in seen_ranges_map or mp_ts > seen_ranges_map[range_key]["ts"]:
            seen_ranges_map[range_key] = entry

        if t_info["is_free"]:
            if not best_free_post_id:
                best_free_post_id = mp_id
            if cur_end > 0 and cur_start > 0 and (cur_end - cur_start) <= 300:
                for ch_num in range(cur_start, cur_end + 1):
                    free_chapters_set.add(ch_num)
            elif cur_end > 0:
                free_chapters_set.add(cur_end)

    all_posts_raw = sorted(seen_ranges_map.values(), key=lambda x: (x["start_ch"], x["end_ch"], x["ts"]))
    free_posts_clean = [{k: v for k, v in p.items() if k not in ("start_ch", "end_ch", "ts", "tier_level")} for p in all_posts_raw if p["is_free"]]
    all_posts_clean = [{k: v for k, v in p.items() if k not in ("start_ch", "end_ch", "ts")} for p in all_posts_raw]

    free_chapters_count = len(free_chapters_set) or len(free_posts_clean)
    free_range_text = f"🆓 Бесплатно: {free_chapters_count} гл." if free_chapters_count > 0 else ""

    return (
        detected_level, max_chapter_found, free_chapters_count, free_range_text,
        latest_range_label, oldest_ts, best_latest_post_id, best_free_post_id,
        free_posts_clean, all_posts_clean, paid_posts_count
    )


def compute_top_ratings_and_genre_leaders(catalog_items):
    if not catalog_items:
        return
    max_ts = max((int(x.get("timestamp") or 0) for x in catalog_items), default=int(time.time()))
    for item in catalog_items:
        ch = int(item.get("chapters") or 0)
        posts_cnt = int(item.get("posts_count") or 1)
        searches = int(item.get("monthly_searches") or 0)
        ts = int(item.get("timestamp") or 0)
        recency_bonus = max(0, 60 - int((max_ts - ts) / 86400)) if ts > 0 else 0
        item["rating_score"] = int(ch * 3 + posts_cnt * 14 + searches * 8 + recency_bonus)
        item["top_genre_badges"] = []

    sorted_by_rating = sorted(catalog_items, key=lambda x: int(x.get("rating_score") or 0), reverse=True)
    for rank_idx, item in enumerate(sorted_by_rating, 1):
        item["rating_rank"] = rank_idx

    for tag_key in PRIMARY_VISIBLE_TAGS:
        candidates = [it for it in sorted_by_rating if tag_key in (it.get("genres") or []) and not it.get("is_frozen")]
        if candidates:
            candidates[0]["top_genre_badges"].append(tag_key)


def load_previous_catalog_and_searches():
    prev_items_map, searches_map, months_archive = {}, {}, {}
    if os.path.exists('data.json'):
        try:
            with open('data.json', 'r', encoding='utf-8') as f:
                for item in json.load(f):
                    if isinstance(item, dict) and item.get('id'):
                        prev_items_map[str(item['id'])] = item
        except Exception:
            pass
    if os.path.exists('votes.json'):
        try:
            with open('votes.json', 'r', encoding='utf-8') as f:
                v_doc = json.load(f)
                months_archive = v_doc.get('months_archive') or {}
                for iid, v_info in (v_doc.get('items') or {}).items():
                    if isinstance(v_info, dict):
                        searches_map[str(iid)] = int(v_info.get('monthly_searches') or 0)
        except Exception:
            pass
    return prev_items_map, searches_map, months_archive


def save_ratings_json_file(catalog_items, months_archive):
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    items_payload = {}
    total_searches_sum = 0
    sorted_items = sorted(catalog_items, key=lambda x: int(x.get('rating_score') or 0), reverse=True)
    for rank, item in enumerate(sorted_items, 1):
        iid = str(item.get('id', ''))
        s_count = int(item.get('monthly_searches') or 0)
        total_searches_sum += s_count
        items_payload[iid] = {
            "title": item.get("title", ""),
            "metric_tag": item.get("metric_tag", ""),
            "month": month_key,
            "rating_score": int(item.get('rating_score') or 0),
            "monthly_searches": s_count,
            "rank": rank,
            "top_genre_badges": item.get("top_genre_badges", []),
            "tier_level": item.get("tier_level", 1),
            "updated_at": item.get("last_update", "")
        }
    months_archive[month_key] = {
        "updated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_monthly_searches": total_searches_sum,
        "items": items_payload
    }
    with open('votes.json', 'w', encoding='utf-8') as f:
        json.dump({
            "month": month_key,
            "updated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "namespace": f"lirlkz_vitrina_{month_key}",
            "total_monthly_searches": total_searches_sum,
            "items": items_payload,
            "months_archive": months_archive
        }, f, ensure_ascii=False, indent=2)


def process_data():
    type_overrides = load_type_overrides()
    romance_norms, frozen_norms, completed_norms, hidden_overrides_norm = load_special_titles()
    bundles_list = get_all_bundles()
    prev_items_map, previous_searches, months_archive = load_previous_catalog_and_searches()
    all_blog_posts = get_all_blog_posts()
    posts_by_id = {str(p.get('id')).strip(): p for p in all_blog_posts if isinstance(p, dict) and p.get('id')}

    result = []
    for item in bundles_list:
        bundle_id = str(item.get('id', '')).strip()
        if not bundle_id:
            continue

        raw_prev = prev_items_map.get(bundle_id, {})
        raw_title = item.get('title') or item.get('name') or 'Без названия'
        clean_title = clean_bundle_title(raw_title)
        eng_metric_tag = make_clean_english_utm_tag(clean_title, bundle_id)

        raw_cover = ""
        for k in ('thumbnail', 'cover', 'image'):
            val = item.get(k)
            if isinstance(val, dict) and val.get('url'):
                raw_cover = clean_image_url(val['url'])
                break
            elif isinstance(val, str) and val.startswith('http'):
                raw_cover = clean_image_url(val)
                break

        matched_posts = fetch_posts_for_bundle(item, all_blog_posts, posts_by_id)
        if not raw_cover and matched_posts:
            for mp in matched_posts:
                raw_cover = extract_high_res_cover_from_post(mp)
                if raw_cover:
                    break

        cover = download_image_to_cache(raw_cover, f"cover_{bundle_id}") if raw_cover else (raw_prev.get('image') or '')

        b_range, b_start, b_end = parse_strict_chapter_info(raw_title)
        created_ts = item.get('createdAt') or item.get('publishedAt') or int(time.time())
        updated_ts = item.get('publishedAt') or item.get('updatedAt') or created_ts
        feed_link = f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed"

        (
            detected_level, post_max_ch, free_ch_count, free_text,
            latest_range_str, oldest_post_ts, best_ch_post_id, best_free_post_id,
            free_posts_list, all_posts_list, paid_posts_count
        ) = analyze_posts_stats(matched_posts, created_ts, eng_metric_tag, expected_title=clean_title)

        latest_post_id = (matched_posts[0].get('id') if matched_posts else '') or best_ch_post_id
        if matched_posts:
            updated_ts = matched_posts[0].get('publishTime') or matched_posts[0].get('createdAt') or updated_ts

        total_chapters = max(b_end, post_max_ch)
        if total_chapters == 0:
            total_chapters = int(item.get('publishedPostsCounter') or len(all_posts_list) or 0)

        free_chapters = min(free_ch_count, total_chapters) if total_chapters > 0 else free_ch_count
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0 and len(free_posts_list) > 0

        if not latest_range_str:
            latest_range_str = b_range or (f"1-{total_chapters} гл." if total_chapters > 0 else "Новые главы")

        all_post_tags = []
        for mp in matched_posts[:10]:
            all_post_tags.extend([t.lower() for t in extract_post_tag_names(mp)])

        norm_t = normalize_for_match(clean_title)
        is_romance = norm_t in romance_norms
        is_completed = norm_t in completed_norms
        is_frozen = False if is_completed else (norm_t in frozen_norms)
        custom_h_tags = hidden_overrides_norm.get(norm_t) or []

        genres, hidden_tags, content_type = detect_tags_and_type_fast(
            clean_title, all_post_tags, raw_prev, type_overrides, is_romance, custom_h_tags
        )

        raw_latest_post_url = f"https://boosty.to/{BLOG_NAME}/posts/{latest_post_id}" if latest_post_id else feed_link
        raw_free_post_url = f"https://boosty.to/{BLOG_NAME}/posts/{best_free_post_id}" if (best_free_post_id and has_free) else feed_link

        result.append({
            "id": bundle_id,
            "metric_tag": eng_metric_tag,
            "utm_campaign": eng_metric_tag,
            "vote_key": make_ascii_vote_key(bundle_id),
            "title": clean_title,
            "image": cover,
            "content_type": content_type,
            "chapters": total_chapters,
            "free_chapters": free_chapters,
            "paid_chapters": paid_chapters,
            "latest_range": latest_range_str,
            "posts_count": max(len(all_posts_list), 1),
            "has_free": has_free,
            "free_text": free_text if has_free else "",
            "free_posts": free_posts_list if has_free else [],
            "all_posts": all_posts_list,
            "genres": genres,
            "hidden_tags": hidden_tags,
            "is_romance": is_romance,
            "is_frozen": is_frozen,
            "is_completed": is_completed,
            "last_update": datetime.datetime.fromtimestamp(updated_ts).strftime("%d/%m/%Y"),
            "timestamp": updated_ts,
            "created_ts": oldest_post_ts,
            "tier_level": detected_level,
            "latest_post_id": latest_post_id,
            "latest_post_link": build_clean_utm_url(raw_latest_post_url, eng_metric_tag),
            "free_post_id": best_free_post_id if has_free else "",
            "free_post_link": build_clean_utm_url(raw_free_post_url, eng_metric_tag),
            "link": build_clean_utm_url(feed_link, eng_metric_tag),
            "monthly_searches": previous_searches.get(bundle_id, 0)
        })

    save_type_overrides(type_overrides)
    compute_top_ratings_and_genre_leaders(result)
    return result, months_archive, all_blog_posts


if __name__ == '__main__':
    data, months_archive, all_blog_posts = process_data()
    tiers = fetch_subscription_tiers(all_blog_posts)
    yt_cid, yt_vids = resolve_yt_channel_id_and_videos(limit=6)

    if data:
        stats_data = get_blog_stats_and_goals(data, all_blog_posts, yt_cid, yt_vids, tiers)
        with open('stats.json', 'w', encoding='utf-8') as f:
            json.dump(stats_data, f, ensure_ascii=False, indent=2)
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        save_ratings_json_file(data, months_archive)
        print(f"[DONE] Обновлено {len(data)} бандлов Lirlkz ({BLOG_NAME}).")
    else:
        stats_data = get_blog_stats_and_goals([], all_blog_posts, yt_cid, yt_vids, tiers)
        with open('stats.json', 'w', encoding='utf-8') as f:
            json.dump(stats_data, f, ensure_ascii=False, indent=2)
        print("[WARN] Бандлы не найдены, обновлён только stats.json.")
