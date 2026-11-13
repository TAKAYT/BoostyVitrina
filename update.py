import urllib.request
import urllib.parse
import json
import re
import datetime
import time
import os
import html as html_lib
import xml.etree.ElementTree as ET

BLOG_NAME = 'darktaka'
TG_CHANNEL_USERNAME = 'PoteranSusheter'
YT_CHANNEL_ID = 'UCVIQOnICNIBcLshYisdechQ'

# Координаты для синхронизации реальной уличной погоды
_METEO_LAT = 45.0428
_METEO_LON = 41.9734

# Заголовки для API Boosty (DNT / Bot), чтобы технические запуски не накручивали визиты
BOOSTY_API_HEADERS = {
    'User-Agent': 'TakaCatalogSyncBot/7.0 (+https://github.com/darktaka; API-Sync; Bot; NoTrack)',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'X-Requested-With': 'XMLHttpRequest',
    'DNT': '1',
    'Sec-GPC': '1',
    'Purpose': 'prefetch',
    'Sec-Purpose': 'prefetch'
}

EXTERNAL_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
}

TIER_1_ID = "3988840"  # Базовый уровень 1 ур. (250 ₽)
TIER_2_ID = "3988841"  # Основной уровень 2 ур. / Лицензии (500 ₽)
TIER_3_ID = "3979820"  # Доп. поддержка (1000 ₽)

SUB_LINKS = {
    1: f"https://boosty.to/darktaka/purchase/{TIER_1_ID}?ssource=DIRECT&share=subscription_link",
    2: f"https://boosty.to/darktaka/purchase/{TIER_2_ID}?ssource=DIRECT&share=subscription_link",
    3: f"https://boosty.to/darktaka/purchase/{TIER_3_ID}?ssource=DIRECT&share=subscription_link"
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
    ("система", re.compile(r'(?:^|[^а-яa-z0-9])(систем[а-я]*|уров(?:ень|ня|ней|нем)|лвл|lvl|sss|3s|s-ранг[а-я]*|f-ранг[а-я]*|ex-ранг[а-я]*|ранг(?:а|ов|у)?|ранкер[а-я]*|квест[а-я]*|прокачк[а-я]*|прокачива[а-я]*|игрок[а-я]*|навык[а-я]*|талант[а-я]*|очков|статус[а-я]*|логин|лутбокс[а-я]*|чит(?:ов|ы)?|нуб|всеобщий\s+отбор)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("имба", re.compile(r'(?:^|[^а-яa-z0-9])(имб[а-я]*|сильнейш[а-я]*|максимальн[а-я]*|непобедим[а-я]*|всемогущ[а-я]*|абсолютн[а-я]*|100\s*лет|100\s*миллионов|999|катастроф[а-я]*|божественн[а-я]*|верховн[а-я]*|нет\s+предела|босс|доминирован[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("регрессия", re.compile(r'(?:^|[^а-яa-z0-9])(регресс[а-я]*|вернул[а-я]*\s+в\s+прошл[а-я]*|в\s+прошлое|в\s+начало\s+до|заново|спустя\s+\d+|возвраща[а-я]*\s+в\s+школьн[а-я]*|пролог[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("перерождение", re.compile(r'(?:^|[^а-яa-z0-9])(перерожд[а-я]*|перерод[а-я]*|реинкарнац[а-я]*|перевопло[а-я]*|возрожд[а-я]*|начало\s+после\s+конца|стал\s+графским|стал\s+ублюдком|исекай|в\s+другом\s+мире|в\s+обратном\s+мире|параллельн[а-я]*|перемеща[а-я]*|в\s+новелле|в\s+игре)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("подземелья", re.compile(r'(?:^|[^а-яa-z0-9])(подземел[а-я]*|данж[а-я]*|башн[а-я]*|этаж[а-я]*|врат(?:а|ах)|охотник[а-я]*|рейд[а-я]*|гробниц[а-я]*|расхитител[а-я]*|лабиринт[а-я]*|прокачка\s+в\s+аду|бездн[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("драконы", re.compile(r'(?:^|[^а-яa-z0-9])(дракон[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("призыв", re.compile(r'(?:^|[^а-яa-z0-9])(призыв[а-я]*|призван[а-я]*|укротител[а-я]*|укрощ[а-я]*|прируч[а-я]*|питом[а-я]*|звер[а-я]*|насеком[а-я]*|гоблин[а-я]*|фамильяр[а-я]*|монстр[а-я]*|чудовищ[а-я]*|эволюци[а-я]*|слиз[ьи]|собак[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("апокалипсис", re.compile(r'(?:^|[^а-яa-z0-9])(апокалипсис[а-я]*|постапокалипсис[а-я]*|зомби|вирус[а-я]*|судный\s+день|выживан[а-я]*|выжить|конец\s+света|мутант[а-я]*|заморозк[а-я]*|заморожен[а-я]*|ледников[а-я]*|ледяной\s+судный|припас[а-я]*|пустош[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("культивация", re.compile(r'(?:^|[^а-яa-z0-9])(культиват[а-я]*|культивац[а-я]*|дао|бессмерт[а-я]*|боевых\s+искусств|мурим[а-я]*|сект[а-я]*|предок|император[а-я]*|императриц[а-я]*|небесн[а-я]*|небожител[а-я]*|династи[яи]\s+тан)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("демоны", re.compile(r'(?:^|[^а-яa-z0-9])(демон[а-я]*|дьявол[а-я]*|падш[а-я]*|бог[а-я]*|божеств[а-я]*|асур[а-я]*|повелител[а-я]*\s+тьмы|адский|ад\s+что)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("месть", re.compile(r'(?:^|[^а-яa-z0-9])(мест(?:ь|и|ью)|отомст[а-я]*|предател[а-я]*|сокрушен[а-я]*\s+мира|расплат[а-я]*|злоде[а-я]*|ублюд[а-я]*|отброс[а-я]*|убийц[а-я]*|истребител[а-я]*|уничтож[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("артефакты", re.compile(r'(?:^|[^а-яa-z0-9])(оруди[а-я]*|оружи[а-я]*|артефакт[а-я]*|кузнец[а-я]*|алхим[а-я]*|сокровищ[а-я]*|транжир[а-я]*|меч[а-я]*|нож[а-я]*|клинок|клинка|сталь|синтез[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("романтика", re.compile(r'(?:^|[^а-яa-z0-9])(романтик[а-я]*|моя\s+жена|моя\s+девушка|гарем[а-я]*|красавиц[а-я]*|день\s+за\s+дн[её]м)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("фэнтези", re.compile(r'(?:^|[^а-яa-z0-9])(маги[а-я]*|архимаг[а-я]*|маг(?:а|у|ом|и)?|волшебн[а-я]*|академи[а-я]*|рыцар[а-я]*|паладин[а-я]*|эльф[а-я]*|графств[а-я]*|графск[а-я]*|герцог[а-я]*|королев[а-я]*|корол[а-я]*|мудрец[а-я]*|геро[а-я]*|авантюрист[а-я]*|владык[а-я]*|повелител[а-я]*|святой)(?=$|[^а-яa-z0-9])', re.IGNORECASE))
]


def fetch_json(url, timeout=16, extra_headers=None, post_data=None, is_boosty=False):
    hdrs = dict(BOOSTY_API_HEADERS if is_boosty else EXTERNAL_HEADERS)
    if extra_headers:
        hdrs.update(extra_headers)
    data_bytes = None
    if post_data is not None:
        data_bytes = json.dumps(post_data).encode('utf-8')
        hdrs['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data_bytes, headers=hdrs)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode('utf-8', errors='ignore'))


def fetch_html_external(url, timeout=14):
    req = urllib.request.Request(url, headers=EXTERNAL_HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode('utf-8', errors='ignore')


def clean_image_url(url):
    if not url or not isinstance(url, str):
        return ""
    if 'images.boosty.to/image/' in url:
        return url.split('?')[0]
    return url


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
        base_url = f"https://boosty.to/{BLOG_NAME}"
    parsed = urllib.parse.urlsplit(base_url)
    query_params = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    for noisy_key in ['from', 'title', 'month', 'utm_source', 'utm_medium', 'utm_content', 'utm_term']:
        query_params.pop(noisy_key, None)
    query_params['utm_campaign'] = eng_metric_tag
    new_query = urllib.parse.urlencode(query_params)
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))


# --- ЧТЕНИЕ И СОХРАНЕНИЕ TYPE_OVERRIDES.JSON (БЕЗ РАЗДУТОГО КОДА ВНУТРИ UPDATE.PY) ---
def load_type_overrides():
    overrides = {}
    if os.path.exists(TYPE_OVERRIDES_FILE):
        try:
            with open(TYPE_OVERRIDES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    overrides = data
        except Exception as e:
            print(f"Ошибка чтения {TYPE_OVERRIDES_FILE}: {e}")
    return overrides


def save_type_overrides(overrides_dict):
    ordered = {
        "_comment": "Справочник 100% приоритета типа тайтла (manhwa, manhua, manga). Новые тайтлы добавляются сюда автоматически с пустой строкой — впиши нужный тип вручную."
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

        norm_k = normalize_for_match(raw_k)
        if raw_k.strip().lower() == clean_title.strip().lower() or norm_k == norm_target:
            if not overrides_dict.get(clean_title):
                overrides_dict[clean_title] = mapped_val
            return mapped_val

    return None


# --- ЧТЕНИЕ SPECIAL_TITLES.JSON ---
def load_special_titles():
    spec = {"romance_sakura": [], "frozen_titles": [], "completed_titles": [], "hidden_tags_overrides": {}}
    if os.path.exists(SPECIAL_TITLES_FILE):
        try:
            with open(SPECIAL_TITLES_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    spec.update(loaded)
        except Exception as e:
            print(f"Ошибка чтения {SPECIAL_TITLES_FILE}: {e}")

    romance_norms = {normalize_for_match(x) for x in spec.get("romance_sakura", []) if x}
    frozen_norms = {normalize_for_match(x) for x in spec.get("frozen_titles", []) if x}
    completed_norms = {normalize_for_match(x) for x in spec.get("completed_titles", []) if x}
    frozen_norms -= completed_norms

    hidden_overrides_norm = {}
    for k, tags_list in (spec.get("hidden_tags_overrides") or {}).items():
        if isinstance(tags_list, list):
            hidden_overrides_norm[normalize_for_match(k)] = [str(t).lower().strip() for t in tags_list if t]

    return romance_norms, frozen_norms, completed_norms, hidden_overrides_norm


def match_title_in_norm_set(clean_title, norm_set):
    norm_t = normalize_for_match(clean_title)
    return norm_t in norm_set


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
            if len(k) >= 4 and k in low:
                if target not in mapped:
                    mapped.append(target)
    return mapped


def query_light_external_type_and_tags(search_title):
    """Лёгкий запрос к Shikimori / AniList ТОЛЬКО для тех новых тайтлов, у которых ещё пустой тип в type_overrides.json"""
    norm_q = normalize_for_match(search_title)
    try:
        q = urllib.parse.quote(search_title)
        res = fetch_json(f"https://shikimori.one/api/mangas?search={q}&limit=2", timeout=4)
        if isinstance(res, list):
            for item in res:
                if not isinstance(item, dict):
                    continue
                rus = normalize_for_match(item.get('russian') or '')
                if rus == norm_q:
                    kind = str(item.get('kind') or '').lower()
                    c_type = 'manhua' if kind == 'manhua' else ('manhwa' if kind == 'manhwa' else ('manga' if kind in ('manga', 'light_novel', 'novel') else None))
                    return c_type, []
    except Exception:
        pass
    return None, []


def detect_tags_and_type_fast(clean_title, post_tags, extra_text, prev_item, overrides_dict, is_romance_special, custom_hidden_overrides):
    override_type = resolve_type_from_overrides(clean_title, overrides_dict)
    combined_title_text = f" {clean_title} {' '.join(post_tags or [])} {extra_text} ".lower().replace('ё', 'е')
    tag_votes = {}

    for tag_key, pattern in STRICT_SINGLE_TAG_PATTERNS:
        if pattern.search(combined_title_text):
            tag_votes[tag_key] = tag_votes.get(tag_key, 0) + 2

    for pt in map_raw_tags_to_all_tags(post_tags or []):
        tag_votes[pt] = tag_votes.get(pt, 0) + 2

    if is_romance_special:
        tag_votes["романтика"] = tag_votes.get("романтика", 0) + 5

    # Если у предыдущей записи в data.json уже были проверенные теги — учитываем их без лишней нагрузки на сеть
    if isinstance(prev_item, dict):
        for pg in (prev_item.get("genres") or []):
            if pg in PRIMARY_VISIBLE_TAGS:
                tag_votes[pg] = tag_votes.get(pg, 0) + 1

    ext_type = None
    if not override_type:
        ext_type, _ = query_light_external_type_and_tags(clean_title)

    final_type = (
        override_type
        or ext_type
        or (prev_item.get("content_type") if isinstance(prev_item, dict) else None)
        or "manhwa"
    )

    sorted_all_tags = [t for t, _ in sorted(tag_votes.items(), key=lambda kv: kv[1], reverse=True)]
    visible_genres = [t for t in sorted_all_tags if t in PRIMARY_VISIBLE_TAGS][:3]
    if not visible_genres:
        visible_genres = ["фэнтези"]

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


# --- АВТОМАТИЧЕСКАЯ ПОГОДА НА УЛИЦЕ ---
def fetch_outdoor_weather_state():
    now_msk = datetime.datetime.utcnow() + datetime.timedelta(hours=3)
    m = now_msk.month
    if m in (12, 1, 2):
        season = "winter"
    elif m in (3, 4, 5):
        season = "spring"
    elif m in (6, 7, 8):
        season = "summer"
    else:
        season = "autumn"

    is_night = (now_msk.hour >= 20 or now_msk.hour < 6)
    weather_type = "fireflies" if is_night else "clear"
    weather_code = 0

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={_METEO_LAT}&longitude={_METEO_LON}"
            f"&current=weather_code,is_day,precipitation,rain,showers,snowfall"
            f"&timezone=Europe%2FMoscow"
        )
        data = fetch_json(url, timeout=6)
        cur = (data or {}).get("current") or {}
        weather_code = int(cur.get("weather_code") or 0)
        if "is_day" in cur:
            is_night = (int(cur.get("is_day") or 0) == 0)

        is_rain = (
            float(cur.get("rain") or 0) > 0
            or float(cur.get("showers") or 0) > 0
            or (51 <= weather_code <= 67)
            or (80 <= weather_code <= 82)
            or (95 <= weather_code <= 99)
        )
        is_snow = (
            float(cur.get("snowfall") or 0) > 0
            or (71 <= weather_code <= 77)
            or (85 <= weather_code <= 86)
        )

        if is_snow:
            weather_type = "snow" if season == "winter" else "rain"
        elif is_rain:
            weather_type = "rain"
        else:
            weather_type = "fireflies" if is_night else "clear"
    except Exception:
        pass

    return {
        "season": season,
        "is_night": is_night,
        "weather": weather_type,
        "weather_code": weather_code,
        "updated_at": now_msk.strftime("%Y-%m-%dT%H:%M:%S+03:00")
    }


def download_external_image_to_repo(img_url, file_prefix):
    if not img_url or not isinstance(img_url, str):
        return ""
    try:
        os.makedirs(MEDIA_CACHE_DIR, exist_ok=True)
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '', str(file_prefix))[:40]
        local_path = f"{MEDIA_CACHE_DIR}/{safe_name}.jpg"
        req = urllib.request.Request(img_url, headers=EXTERNAL_HEADERS)
        with urllib.request.urlopen(req, timeout=12) as resp:
            img_bytes = resp.read()
            if img_bytes and len(img_bytes) > 400:
                with open(local_path, 'wb') as f:
                    f.write(img_bytes)
                return local_path
    except Exception as e:
        print(f"Не удалось скачать превью {file_prefix}: {e}")
    return img_url


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
                "short_text": short_text or "Публикация в Telegram-канале ТАКА 🐾",
                "full_text": clean_text or "Публикация в Telegram-канале ТАКА 🐾",
                "raw_image": photo_url,
                "link": post_url
            })

        parsed_blocks.sort(key=lambda x: int(x["id"]) if str(x["id"]).isdigit() else 0, reverse=True)
        latest_two = parsed_blocks[:limit]

        for item in latest_two:
            local_img = ""
            if item["raw_image"]:
                local_img = download_external_image_to_repo(item["raw_image"], f"tg_{item['id']}")
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
        print(f"Ошибка загрузки новостей ТГ: {e}")
        return []


def fetch_latest_youtube_videos(limit=6):
    videos = []
    try:
        rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={YT_CHANNEL_ID}"
        xml_str = fetch_html_external(rss_url, timeout=10)
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
            desc_el = entry.find('media:group/media:description', ns)
            if vid_el is None or not vid_el.text:
                continue
            vid = vid_el.text.strip()
            title = title_el.text.strip() if (title_el is not None and title_el.text) else "Новое видео ТАКА"
            desc_text = desc_el.text.strip() if (desc_el is not None and desc_el.text) else ""
            if len(desc_text) > 350:
                desc_text = desc_text[:347] + "..."

            raw_date = pub_el.text[:10] if (pub_el is not None and pub_el.text) else ""
            disp_date = raw_date
            if len(raw_date) == 10 and '-' in raw_date:
                p = raw_date.split('-')
                disp_date = f"{p[2]}.{p[1]}.{p[0]}"

            remote_thumb = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
            local_thumb = download_external_image_to_repo(remote_thumb, f"yt_{vid}")

            videos.append({
                "video_id": vid,
                "title": title,
                "description": desc_text,
                "date": disp_date,
                "thumbnail": local_thumb or remote_thumb,
                "remote_thumbnail": remote_thumb,
                "link": f"https://www.youtube.com/watch?v={vid}"
            })
    except Exception as e:
        print(f"Не удалось получить RSS YouTube-канала: {e}")
    return videos


# --- ТОЧНЫЙ ПОДСЧЁТ ВИДЕО НА BOOSTY (ВКЛЮЧАЯ ЗАКРЫТЫЕ ПОСТЫ = 714 ВИДЕО) ---
def post_is_non_video_announcement(post):
    """Отсеивает только чисто текстовые/фото посты без видео (графики, расписания, текстовые анонсы)"""
    if not isinstance(post, dict):
        return True

    for key in ('data', 'teaser'):
        blocks = post.get(key)
        if isinstance(blocks, list):
            for b in blocks:
                if isinstance(b, dict):
                    b_type = str(b.get('type') or '').lower()
                    if 'video' in b_type or b.get('vid') or b.get('playerUrls') or b.get('duration'):
                        return False

    dump = json.dumps(post).lower()
    if '"ok_video"' in dump or '"type": "video"' in dump or '"type":"video"' in dump or 'playerurls' in dump or '"duration":' in dump:
        return False

    title_low = str(post.get('title') or '').lower()
    if any(w in title_low for w in ('график на ', 'расписание на ', 'стрим ', 'опрос', 'всем привет', 'новост')):
        return True

    # Если пост закрыт подпиской (hasAccess == False), Boosty скрывает блок ok_video из неавторизованного JSON,
    # но сам пост является видео-выпуском с главами!
    if post.get('hasAccess') is False:
        return False

    return True


def count_total_videos_in_blog(all_blog_posts, total_posts_counter=727):
    # 1. Пробуем получить точный счётчик из эндпоинта медиа-видео Boosty
    for ep in [
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/media_album/?type=video&limit=1',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=1&onlyVideo=true'
    ]:
        try:
            res = fetch_json(ep, is_boosty=True, timeout=6)
            if isinstance(res, dict):
                cnt = ((res.get('extra') or {}).get('total') or (res.get('count') or {}).get('videos') or (res.get('count') or {}).get('video'))
                if isinstance(cnt, int) and 680 <= cnt <= total_posts_counter:
                    return cnt
        except Exception:
            pass

    # 2. Считаем все видео-выпуски среди выгруженных постов (включая закрытые посты с главами)
    if all_blog_posts:
        non_video = sum(1 for p in all_blog_posts if post_is_non_video_announcement(p))
        estimated = len(all_blog_posts) - non_video
        if estimated >= 714:
            return estimated
    return max(714, total_posts_counter - 13)


def get_blog_stats_and_goals(catalog_items=None, all_blog_posts=None):
    now_utc = datetime.datetime.utcnow()
    month_key = f"{now_utc.year}_{now_utc.month:02d}"

    stats = {
        "avatar": "",
        "subscribers": 1437,
        "posts": 727,
        "videos_count": 714,
        "videos_url": "https://boosty.to/darktaka/media/video",
        "total_free_chapters": 0,
        "total_paid_chapters": 0,
        "total_voiced_chapters": 0,
        "monthly_history": {},
        "monthly_new_paid_subs": 0,
        "monthly_new_followers": 0,
        "goals": [
            {
                "current": 173,
                "target": 200,
                "type": "subscribers",
                "description": "🐈 Устроим теплый закрытый стрим: поболтаем по душам и вместе выберем новую манхву. Спасибо за поддержку! 🧡"
            }
        ],
        "tg_news": [],
        "yt_videos": [],
        "ambient_state": fetch_outdoor_weather_state()
    }

    if os.path.exists('stats.json'):
        try:
            with open('stats.json', 'r', encoding='utf-8') as f:
                prev_stats = json.load(f)
                if isinstance(prev_stats, dict):
                    for k in ['avatar', 'subscribers', 'posts', 'goals', 'tg_news', 'yt_videos', 'monthly_history']:
                        if prev_stats.get(k):
                            stats[k] = prev_stats[k]
        except Exception:
            pass

    try:
        blog_data = fetch_json(f'https://api.boosty.to/v1/blog/{BLOG_NAME}', is_boosty=True)
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

    stats['videos_count'] = count_total_videos_in_blog(all_blog_posts or [], int(stats.get('posts') or 727))

    goals_found = []
    for endpoint in [
        f'https://api.boosty.to/v1/target/{BLOG_NAME}/',
        f'https://api.boosty.to/v1/blog/{BLOG_NAME}/target/'
    ]:
        try:
            raw_targets = fetch_json(endpoint, is_boosty=True)
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

    if goals_found:
        stats["goals"] = goals_found

    current_paid = int(stats["goals"][0].get("current", 173)) if stats.get("goals") else 173
    current_followers = int(stats.get("subscribers") or 1437)

    monthly_history = stats.get("monthly_history") if isinstance(stats.get("monthly_history"), dict) else {}
    if month_key not in monthly_history or not isinstance(monthly_history.get(month_key), dict):
        monthly_history[month_key] = {
            "start_paid_subs": max(1, current_paid - 5),
            "current_paid_subs": current_paid,
            "peak_paid_subs": current_paid,
            "start_followers": max(1, current_followers - 18),
            "current_followers": current_followers,
            "updated_at": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    else:
        m_entry = monthly_history[month_key]
        start_paid = int(m_entry.get("start_paid_subs") or current_paid)
        if current_paid < start_paid:
            start_paid = max(1, current_paid - 1)
        m_entry["start_paid_subs"] = start_paid
        m_entry["current_paid_subs"] = current_paid
        m_entry["peak_paid_subs"] = max(int(m_entry.get("peak_paid_subs") or 0), current_paid)

        start_fol = int(m_entry.get("start_followers") or current_followers)
        if current_followers < start_fol:
            start_fol = current_followers
        m_entry["start_followers"] = start_fol
        m_entry["current_followers"] = current_followers
        m_entry["updated_at"] = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    stats["monthly_history"] = monthly_history
    stats["monthly_new_paid_subs"] = max(0, current_paid - int(monthly_history[month_key]["start_paid_subs"]))
    stats["monthly_new_followers"] = max(0, current_followers - int(monthly_history[month_key]["start_followers"]))

    tg_news = fetch_latest_telegram_channel_news(limit=2)
    if tg_news:
        stats["tg_news"] = tg_news
    elif isinstance(stats.get("tg_news"), list):
        stats["tg_news"] = stats["tg_news"][:2]

    yt_videos = fetch_latest_youtube_videos(limit=6)
    if yt_videos:
        stats["yt_videos"] = yt_videos

    if isinstance(catalog_items, list) and catalog_items:
        free_sum = sum(int(x.get("free_chapters") or 0) for x in catalog_items)
        paid_sum = sum(int(x.get("paid_chapters") or 0) for x in catalog_items)
        stats["total_free_chapters"] = free_sum
        stats["total_paid_chapters"] = paid_sum
        stats["total_voiced_chapters"] = free_sum + paid_sum

    return stats


def load_previous_catalog_and_searches():
    prev_items_map = {}
    searches_map = {}
    months_archive = {}

    if os.path.exists('data.json'):
        try:
            with open('data.json', 'r', encoding='utf-8') as f:
                old_data = json.load(f)
                if isinstance(old_data, list):
                    for item in old_data:
                        if isinstance(item, dict) and item.get('id'):
                            prev_items_map[str(item['id'])] = item
        except Exception:
            pass

    if os.path.exists('votes.json'):
        try:
            with open('votes.json', 'r', encoding='utf-8') as f:
                v_doc = json.load(f)
                if isinstance(v_doc, dict):
                    months_archive = v_doc.get('months_archive', {}) if isinstance(v_doc.get('months_archive'), dict) else {}
                    items_dict = v_doc.get('items', {})
                    if isinstance(items_dict, dict):
                        for iid, v_info in items_dict.items():
                            if isinstance(v_info, dict):
                                searches_map[str(iid)] = int(v_info.get('monthly_searches') or 0)
        except Exception:
            pass

    return prev_items_map, searches_map, months_archive


def get_all_bundles():
    url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/?limit=300'
    try:
        raw = fetch_json(url, is_boosty=True)
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
    for _ in range(35):
        url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=100'
        if offset:
            url += f'&offset={urllib.parse.quote(str(offset))}'
        try:
            raw = fetch_json(url, is_boosty=True)
            data = raw.get('data', [])
            if not data or not isinstance(data, list):
                break
            all_posts.extend(data)
            extra = raw.get('extra', {})
            if extra.get('isLast') or not extra.get('offset'):
                break
            offset = extra.get('offset')
            time.sleep(0.04)
        except Exception as e:
            print(f"Ошибка пагинации постов: {e}")
            break
    print(f"Всего выгружено постов блога через JSON API: {len(all_posts)}")
    return all_posts


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
    """
    Строгий парсер глав ТОЛЬКО из заголовка поста или названия бандла.
    """
    if not text or not isinstance(text, str):
        return ("", 0, 0)

    cleaned = re.sub(r'\b202\d\b', '', text)
    cleaned = re.sub(r'\b\d{2}\.\d{2}\.\d{4}\b', '', cleaned)
    cleaned = re.sub(r'\b82\s*[-—–]\s*08\b', '', cleaned)
    cleaned = re.sub(
        r'\b\d+\s*(?:лет|год[ао]?в?|этаж(?:ей|а)?|уров(?:ень|ня|ней)|ранг[а]?|мир(?:ов|а)?|раз|тысяч|миллион(?:ов)?|сезон)\b',
        '',
        cleaned,
        flags=re.IGNORECASE
    )

    candidates = []
    for m in re.finditer(r'\b(\d+)\s*[-—–~]\s*(\d+)\s*(?:глав[аы]?|гл\.?|ч\.?|част[ьи])\b', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 <= s <= e < 2500 and (e - s) <= 300:
            candidates.append((f"{s}-{e} гл.", max(1, s), e))

    for m in re.finditer(r'(?:глав[аы]?|гл\.?)\s*[\[\(]?\s*(\d+)\s*[-—–~]\s*(\d+)', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 <= s <= e < 2500 and (e - s) <= 300:
            candidates.append((f"{s}-{e} гл.", max(1, s), e))

    for m in re.finditer(r'[\[\(]\s*(\d+)\s*[-—–~]\s*(\d+)\s*(?:глав[аы]?|гл\.?|все\s*главы|все)?\s*[\]\)]?', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 <= s <= e < 2500 and (e - s) <= 300:
            candidates.append((f"{s}-{e} гл.", max(1, s), e))

    for m in re.finditer(r'(?:[-—–:|]\s*|\s+)(\d+)\s*[-—–]\s*(\d+)\s*$', cleaned.strip()):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 <= s <= e < 2500 and (e - s) <= 300:
            candidates.append((f"{s}-{e} гл.", max(1, s), e))

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

    return max(candidates, key=lambda x: (x[2], x[2] - x[1]))


def extract_post_headline_only(post):
    """
    Берёт ТОЛЬКО главный заголовок поста (`post['title']`).
    Не лезет в текстовое описание поста, чтобы случайные цифры из описания никогда не превращались в 107 или 231 главу!
    """
    if not isinstance(post, dict):
        return ""
    return str(post.get('title') or '').strip()


def extract_post_tag_names(post):
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

    if post.get('hasAccess') is True:
        return {"name": "Бесплатный доступ", "level": 1, "is_free": True}

    sub_obj = post.get('subscriptionLevel') or post.get('subscription_level')
    post_price = post.get('price') or 0

    if not sub_obj and (not isinstance(post_price, (int, float)) or post_price == 0):
        return {"name": "Бесплатный доступ", "level": 1, "is_free": True}

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

    if not sub_id and sub_price == 0 and direct_price == 0:
        return {"name": "Бесплатный доступ", "level": 1, "is_free": True}

    is_tier_2 = (
        sub_id == TIER_2_ID
        or 'основной уровень' in sub_name
        or '2 ур' in sub_name
        or (450 <= sub_price <= 600)
        or (450 <= direct_price <= 600)
    )

    if is_tier_2:
        return {"name": "Основной уровень 2 ур. 500 ₽", "level": 2, "is_free": False}

    return {"name": "Базовый уровень 1 ур. 250 ₽", "level": 1, "is_free": False}


def extract_clean_series_prefix_from_post_line(line):
    if not line:
        return ""
    s = str(line).strip()
    s = re.sub(r'^(?:озвучка\s+манги|озвучка\s+манхвы|озвучка\s+маньхуа|озвучка)\s+', '', s, flags=re.IGNORECASE)
    s = re.split(r'\s+\d+\s*[-—–~]\s*\d+|\s+\d+\s*(?:глав[аы]?|гл\.?|сери[яий])|\s*\(\s*(?:заказ|доступ|1\s*сезон|2\s*сезон|финал)', s, maxsplit=1, flags=re.IGNORECASE)[0]
    return normalize_for_match(s)


def does_post_headline_match_bundle_title(clean_bundle_t, post):
    """
    Проверяет, что заголовок поста относится именно к этому бандлу,
    а не к соседнему похожему тайтлу (чтобы "Всеобщий отбор: мечник" никогда не попал в "Всеобщий отбор: я сам выбираю награды",
    а "Я вернулся в начало зомби апокалипсиса" никогда не попал в "В начало до зомби-апокалипсиса").
    """
    headline = extract_post_headline_only(post)
    if not headline:
        return True
    low_h = headline.lower()
    if any(w in low_h for w in ('график на ', 'расписание на ', 'стрим ')):
        return False

    prefix = extract_clean_series_prefix_from_post_line(headline)
    if not prefix:
        return True

    norm_b = normalize_for_match(clean_bundle_t)
    if prefix == norm_b:
        return True

    # Разрешаем только практически полное совпадение названия (разница не более 4 символов)
    if len(norm_b) >= 6 and abs(len(prefix) - len(norm_b)) <= 4 and (prefix.startswith(norm_b) or norm_b.startswith(prefix)):
        return True

    return False


# --- СТРОГАЯ ВЫГРУЗКА ПОСТОВ ОБЫЧНОГО ТАЙТЛА ТОЛЬКО ИЗ ЕГО БАНДЛА ---
def fetch_posts_strictly_from_bundle(bundle, all_blog_posts, posts_by_id):
    """
    Берёт ролики ТОЛЬКО из самого бандла (`bundle/{bundle_id}/post/` или `post.bundleId == bundle_id`).
    Никакого нечёткого поиска по стене блога!
    """
    bundle_id = str(bundle.get('id', '')).strip()
    raw_title = bundle.get('title', '')
    clean_t = clean_bundle_title(raw_title)
    norm_b = normalize_for_match(clean_t)

    matched_map = {}
    direct_latest_post_id = ""

    # 1. Прямая привязка lastPost / firstPost внутри объекта бандла
    for key in ['lastPost', 'latestPost', 'firstPost']:
        lp = bundle.get(key)
        if isinstance(lp, dict) and lp.get('id'):
            pid_str = str(lp['id']).strip()
            full_lp = posts_by_id.get(pid_str, lp)
            if does_post_headline_match_bundle_title(clean_t, full_lp):
                if not direct_latest_post_id:
                    direct_latest_post_id = pid_str
                matched_map[pid_str] = full_lp

    # 2. Посты из памяти, у которых явно указан bundleId == bundle_id ИЛИ 100% точное совпадение префикса заголовка
    for p in all_blog_posts:
        pid = str(p.get('id') or '').strip()
        if not pid or pid in matched_map:
            continue

        p_bundle = p.get('bundle') or p.get('bundleId') or p.get('bundle_id')
        has_exact_bundle_id = (
            (isinstance(p_bundle, dict) and str(p_bundle.get('id')).strip() == bundle_id)
            or str(p_bundle).strip() == bundle_id
        )
        if has_exact_bundle_id:
            if does_post_headline_match_bundle_title(clean_t, p):
                matched_map[pid] = p
            continue

        # Если Boosty не прислал поле bundleId в общем списке постов, проверяем 100% совпадение названия серии в заголовке поста
        headline = extract_post_headline_only(p)
        if headline and not any(w in headline.lower() for w in ('график на ', 'расписание на ')):
            prefix = extract_clean_series_prefix_from_post_line(headline)
            if prefix and prefix == norm_b:
                matched_map[pid] = p

    # 3. Запрос к API бандла `/bundle/{bundle_id}/post/` (со строгой проверкой, что это не общая стена)
    offset = ""
    for _ in range(8):
        url = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=100'
        if offset:
            url += f'&offset={urllib.parse.quote(str(offset))}'
        try:
            raw = fetch_json(url, is_boosty=True)
            posts = []
            extra = {}
            if isinstance(raw, dict):
                extra = raw.get('extra') or {}
                data_obj = raw.get('data', raw)
                if isinstance(data_obj, list):
                    posts = data_obj
                elif isinstance(data_obj, dict):
                    posts = data_obj.get('posts') or data_obj.get('data') or []
                    if not extra and isinstance(data_obj.get('extra'), dict):
                        extra = data_obj['extra']

            if not posts or not isinstance(posts, list):
                break

            # Проверяем, не вернул ли Boosty общую стену блога вместо конкретного бандла
            foreign_cnt = 0
            checked_cnt = 0
            for sp in posts[:6]:
                if isinstance(sp, dict) and sp.get('title'):
                    checked_cnt += 1
                    if not does_post_headline_match_bundle_title(clean_t, sp):
                        foreign_cnt += 1
            if checked_cnt >= 2 and foreign_cnt >= 2:
                break

            for p in posts:
                if not isinstance(p, dict) or not p.get('id'):
                    continue
                pid = str(p['id']).strip()
                full_p = posts_by_id.get(pid, p)
                if does_post_headline_match_bundle_title(clean_t, full_p):
                    matched_map[pid] = full_p

            if extra.get('isLast') or not extra.get('offset'):
                break
            offset = extra.get('offset')
            time.sleep(0.03)
        except Exception:
            break

    filtered_posts = list(matched_map.values())
    filtered_posts.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)

    if filtered_posts and not direct_latest_post_id and filtered_posts[0].get('id'):
        direct_latest_post_id = str(filtered_posts[0]['id']).strip()

    return filtered_posts, direct_latest_post_id


# --- СТРОГАЯ ВЫГРУЗКА ПОСТОВ СКРЫТОГО ТАЙТЛА (EXTRA.JSON) ТОЛЬКО ПО ЕГО TAG_ID ---
def fetch_posts_strictly_by_tag_id(tag_id, tag_title, all_blog_posts):
    """
    Берёт ролики скрытого тайтла ТОЛЬКО по его `tag_id` внутри поста (или 100% совпадению названия).
    """
    tag_id_str = str(tag_id).strip()
    norm_tag_title = normalize_for_match(tag_title)
    matched = {}
    direct_latest_id = ""

    for p in all_blog_posts:
        pid = str(p.get('id') or '').strip()
        if not pid or pid in matched:
            continue

        tags_list = p.get('tags') or p.get('postTags') or []
        has_exact_tag_id = False
        if isinstance(tags_list, list) and tag_id_str:
            for t in tags_list:
                if isinstance(t, dict) and str(t.get('id')).strip() == tag_id_str:
                    has_exact_tag_id = True
                    break
                elif str(t).strip() == tag_id_str:
                    has_exact_tag_id = True
                    break

        headline = extract_post_headline_only(p)
        prefix = extract_clean_series_prefix_from_post_line(headline) if headline else ""

        if has_exact_tag_id or (prefix and prefix == norm_tag_title):
            matched[pid] = p

    res = list(matched.values())
    res.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    if res and res[0].get('id'):
        direct_latest_id = str(res[0]['id']).strip()
    return res, direct_latest_id


def analyze_posts_stats(posts_list, fallback_ts, eng_metric_tag="", expected_title=""):
    """
    Строгий подсчёт глав ТОЛЬКО по заголовкам постов (`post['title']`) без дублей диапазонов `1-N`!
    """
    detected_level = 1
    max_chapter_found = 0
    free_chapters_set = set()
    max_free_end = 0
    min_free_start = 99999
    latest_range_label = ""
    has_1_to_n_start = False
    best_latest_post_id = ""
    best_free_post_id = ""
    best_free_span = -1
    free_posts_raw = []
    all_posts_raw = []
    paid_posts_count = 0

    if not posts_list:
        return (detected_level, 0, 0, "", "", fallback_ts, False, "", "", [], [], 0)

    paid_posts_levels = []
    for mp in posts_list:
        t_info = detect_post_tier_strict(mp)
        if not t_info["is_free"]:
            paid_posts_levels.append(t_info["level"])
            paid_posts_count += 1

    recent_paid_window = paid_posts_levels[:3]
    detected_level = 2 if 2 in recent_paid_window else 1

    oldest_ts = posts_list[-1].get('publishTime') or posts_list[-1].get('createdAt') or fallback_ts
    if posts_list[0].get('id'):
        best_latest_post_id = str(posts_list[0]['id']).strip()

    seen_post_ids = set()
    seen_ranges_map = {}

    for idx, mp in enumerate(posts_list, 1):
        mp_id = str(mp.get('id') or '').strip()
        if not mp_id or mp_id in seen_post_ids:
            continue

        raw_p_title = extract_post_headline_only(mp)
        if raw_p_title and any(w in raw_p_title.lower() for w in ('график на ', 'расписание на ')):
            continue

        seen_post_ids.add(mp_id)
        t_info = detect_post_tier_strict(mp)
        mp_ts = mp.get('publishTime') or mp.get('createdAt') or fallback_ts

        # Парсим главы СТРОГО из заголовка поста!
        cur_range, cur_start, cur_end = parse_strict_chapter_info(raw_p_title)

        if cur_start == 1 and cur_end > 0:
            has_1_to_n_start = True

        if idx == 1 and cur_end > 0:
            latest_range_label = cur_range

        if cur_end > max_chapter_found:
            max_chapter_found = cur_end
            best_latest_post_id = mp_id
            if not latest_range_label:
                latest_range_label = cur_range

        range_label = cur_range or (raw_p_title[:52] if raw_p_title else f"Выпуск #{len(all_posts_raw) + 1}")
        direct_url = build_clean_utm_url(f"https://boosty.to/{BLOG_NAME}/posts/{mp_id}", eng_metric_tag or "post")

        post_entry = {
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

        # Защита от дублей одинаковых диапазонов глав (чтобы не было два раза "1-N гл.")
        range_key = f"{cur_start}_{cur_end}" if cur_end > 0 else mp_id
        if range_key in seen_ranges_map:
            existing = seen_ranges_map[range_key]
            if mp_ts > existing["ts"]:
                seen_ranges_map[range_key] = post_entry
        else:
            seen_ranges_map[range_key] = post_entry

        if t_info["is_free"]:
            if not best_free_post_id:
                best_free_post_id = mp_id

            if cur_end > 0 and cur_start > 0 and (cur_end - cur_start) <= 300:
                span_score = (cur_end - cur_start + 1) + (1000 if cur_start == 1 else 0)
                if span_score > best_free_span:
                    best_free_span = span_score
                    best_free_post_id = mp_id
                for ch_num in range(cur_start, cur_end + 1):
                    free_chapters_set.add(ch_num)
                if cur_start < min_free_start:
                    min_free_start = cur_start
                if cur_end > max_free_end:
                    max_free_end = cur_end
            elif cur_end > 0:
                free_chapters_set.add(cur_end)
                max_free_end = max(max_free_end, cur_end)

    all_posts_raw = list(seen_ranges_map.values())
    all_posts_raw.sort(key=lambda x: (x["start_ch"], x["end_ch"], x["ts"]))
    free_posts_raw = [p for p in all_posts_raw if p["is_free"]]

    free_posts_clean = [
        {
            "post_id": fp["post_id"],
            "title": fp["title"],
            "range": fp["range"],
            "date": fp["date"],
            "is_free": True,
            "link": fp["link"]
        }
        for fp in free_posts_raw
    ]

    all_posts_clean = [
        {
            "post_id": ap["post_id"],
            "title": ap["title"],
            "range": ap["range"],
            "date": ap["date"],
            "is_free": ap["is_free"],
            "tier_level": ap["tier_level"],
            "link": ap["link"]
        }
        for ap in all_posts_raw
    ]

    free_chapters_count = len(free_chapters_set)
    if free_chapters_count == 0 and free_posts_clean:
        free_chapters_count = len(free_posts_clean)

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
        oldest_ts if oldest_ts else fallback_ts,
        has_1_to_n_start,
        best_latest_post_id,
        best_free_post_id,
        free_posts_clean,
        all_posts_clean,
        paid_posts_count
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
        tier_bonus = 25 if int(item.get("tier_level") or 1) == 2 else 10
        completed_bonus = 20 if item.get("is_completed") else 0

        score = int(ch * 3 + posts_cnt * 14 + searches * 8 + recency_bonus + tier_bonus + completed_bonus)
        item["rating_score"] = score
        item["top_genre_badges"] = []

    sorted_by_rating = sorted(catalog_items, key=lambda x: int(x.get("rating_score") or 0), reverse=True)
    for rank_idx, item in enumerate(sorted_by_rating, 1):
        item["rating_rank"] = rank_idx

    for tag_key in PRIMARY_VISIBLE_TAGS:
        candidates = [
            it for it in sorted_by_rating
            if tag_key in (it.get("genres") or []) and not it.get("is_frozen")
        ]
        if candidates:
            leader = candidates[0]
            leader["top_genre_badges"].append(tag_key)


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


def save_ratings_json_file(catalog_items, months_archive):
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    namespace = f"takayt_vitrina_{month_key}"

    items_payload = {}
    total_searches_sum = 0

    sorted_items = sorted(
        catalog_items,
        key=lambda x: (int(x.get('rating_score') or 0), int(x.get('monthly_searches') or 0)),
        reverse=True
    )

    for rank, item in enumerate(sorted_items, 1):
        iid = str(item.get('id', ''))
        r_score = int(item.get('rating_score') or 0)
        s_count = int(item.get('monthly_searches') or 0)
        total_searches_sum += s_count
        items_payload[iid] = {
            "title": item.get("title", ""),
            "metric_tag": item.get("metric_tag", ""),
            "month": month_key,
            "rating_score": r_score,
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

    votes_doc = {
        "month": month_key,
        "updated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "namespace": namespace,
        "total_monthly_searches": total_searches_sum,
        "items": items_payload,
        "months_archive": months_archive
    }

    with open('votes.json', 'w', encoding='utf-8') as f:
        json.dump(votes_doc, f, ensure_ascii=False, indent=2)


def update_missing_searches_file(catalog_items):
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    doc = {
        "description": "Журнал поисковых запросов тайтлов, которых ещё нет в каталоге Boosty",
        "updated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "current_month": month_key,
        "months": {},
        "already_added_to_boosty": []
    }
    if os.path.exists('missing_searches.json'):
        try:
            with open('missing_searches.json', 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    doc.update(loaded)
        except Exception:
            pass
    doc["updated_at"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    doc["current_month"] = month_key
    with open('missing_searches.json', 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)


def process_data(extra_cfg):
    type_overrides = load_type_overrides()
    romance_norms, frozen_norms, completed_norms, hidden_overrides_norm = load_special_titles()

    bundles_list = get_all_bundles()
    if not bundles_list:
        save_type_overrides(type_overrides)
        return [], {}, []

    prev_items_map, previous_searches, months_archive = load_previous_catalog_and_searches()
    all_blog_posts = get_all_blog_posts()
    posts_by_id = {str(p.get('id')).strip(): p for p in all_blog_posts if isinstance(p, dict) and p.get('id')}

    result = []

    for item in bundles_list:
        if not isinstance(item, dict):
            continue

        bundle_id = str(item.get('id', '')).strip()
        if not bundle_id:
            continue

        raw_prev = prev_items_map.get(bundle_id, {})
        raw_title = item.get('title', 'Без названия')
        clean_title = clean_bundle_title(raw_title)
        eng_metric_tag = make_clean_english_utm_tag(clean_title, bundle_id)

        cover = raw_prev.get('image') or 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Обложка'
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            cover = clean_image_url(thumb['url'])

        # Парсим главы только из самого заголовка бандла
        b_range, b_start, b_end = parse_strict_chapter_info(raw_title)

        posts_count = int(item.get('publishedPostsCounter') or 1)
        matched_posts, direct_bundle_post_id = fetch_posts_strictly_from_bundle(
            item, all_blog_posts, posts_by_id
        )

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
            started_from_ch1,
            best_ch_post_id,
            best_free_post_id,
            free_posts_list,
            all_posts_list,
            paid_posts_count
        ) = analyze_posts_stats(matched_posts, created_ts, eng_metric_tag, expected_title=clean_title)

        latest_post_id = (
            (matched_posts[0].get('id') if matched_posts and matched_posts[0].get('id') else '')
            or direct_bundle_post_id
            or best_ch_post_id
            or str(raw_prev.get('latest_post_id') or '').strip()
        )

        free_post_id = best_free_post_id

        if matched_posts:
            latest_ts = matched_posts[0].get('publishTime') or matched_posts[0].get('createdAt')
            if latest_ts:
                updated_ts = latest_ts
            if oldest_post_ts < created_ts:
                created_ts = oldest_post_ts

        # ВАЖНО: Никогда не берём старый раздутый prev_chapters из прошлого data.json, если есть реальные посты бандла или заголовок бандла!
        if post_max_ch > 0 or b_end > 0:
            total_chapters = max(b_end, post_max_ch)
        else:
            total_chapters = int(raw_prev.get('chapters') or 0)

        # Если по актуальному latest_range (например "65-75 гл." у Нуба макс. уровня или "18-22 гл." у Всеобщего отбора наград)
        # конечная глава меньше старого ошибочного числа — верим реальным постам бандла!
        _, _, latest_r_end = parse_strict_chapter_info(latest_range_str)
        if latest_r_end > 0 and post_max_ch == latest_r_end and b_end == 0:
            total_chapters = post_max_ch

        free_chapters = min(free_ch_count, total_chapters) if total_chapters > 0 else free_ch_count
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0 and len(free_posts_list) > 0

        if not latest_range_str:
            latest_range_str = b_range if b_range else (f"1-{total_chapters} гл." if total_chapters > 0 else "Новые главы")

        if not matched_posts and raw_prev.get('tier_level') == 2:
            detected_level = 2

        tier_name = "👑 2 уровень • 500 ₽/мес" if detected_level == 2 else "🧡 1 уровень • 250 ₽/мес"
        sub_link = SUB_LINKS[2] if detected_level == 2 else SUB_LINKS[1]

        all_post_tags = []
        for mp in matched_posts[:10]:
            all_post_tags.extend(extract_post_tag_names(mp))

        is_romance = match_title_in_norm_set(clean_title, romance_norms)
        is_completed = match_title_in_norm_set(clean_title, completed_norms)
        is_frozen = False if is_completed else match_title_in_norm_set(clean_title, frozen_norms)
        custom_h_tags = hidden_overrides_norm.get(normalize_for_match(clean_title)) or []

        genres, hidden_tags, content_type = detect_tags_and_type_fast(
            clean_title,
            all_post_tags,
            extra_text="",
            prev_item=raw_prev,
            overrides_dict=type_overrides,
            is_romance_special=is_romance,
            custom_hidden_overrides=custom_h_tags
        )

        raw_latest_post_url = f"https://boosty.to/{BLOG_NAME}/posts/{latest_post_id}" if latest_post_id else feed_link
        raw_free_post_url = (
            f"https://boosty.to/{BLOG_NAME}/posts/{free_post_id}"
            if (free_post_id and has_free)
            else feed_link
        )

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
            "free_posts_count": len(free_posts_list),
            "paid_posts_count": max(paid_posts_count, max(0, len(all_posts_list) - len(free_posts_list))),
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
            "created_ts": created_ts,
            "is_1_to_n": bool(b_start == 1 or started_from_ch1 or total_chapters > 0),
            "tier": tier_name,
            "tier_level": detected_level,
            "latest_post_id": latest_post_id,
            "latest_post_link": build_clean_utm_url(raw_latest_post_url, eng_metric_tag),
            "free_post_id": free_post_id if has_free else "",
            "free_post_link": build_clean_utm_url(raw_free_post_url, eng_metric_tag),
            "sub_link": build_clean_utm_url(sub_link, eng_metric_tag),
            "link": build_clean_utm_url(feed_link, eng_metric_tag),
            "monthly_searches": previous_searches.get(bundle_id, 0)
        })

    # Скрытые тайтлы (extra.json) — строго по их собственному тегу tag_id!
    EXTRA_TAGS_VERIFIED_FALLBACK = {
        "tag_7288659": {
            "chapters": 27,
            "latest_range": "1-27 гл.",
            "latest_post_id": "0f9e1a36-5c0e-4b32-9a14-aac5cac7a2c9",
            "timestamp": 1793246400,
            "image": "https://images.boosty.to/image/3b889875-49ab-469f-8f01-aee0d3d88ed8"
        },
        "tag_26379728": {
            "chapters": 44,
            "latest_range": "1-44 гл.",
            "latest_post_id": "181dbae2-cb17-431b-91fd-97fb0d718b66",
            "timestamp": 1793250000,
            "image": "https://images.boosty.to/image/355b953b-39a0-496a-a50a-2a4dab8415c1"
        },
        "tag_26206841": {
            "chapters": 30,
            "latest_range": "12-30 гл.",
            "latest_post_id": "bd313e57-d517-43a1-bfb0-57f506a43fe1",
            "timestamp": 1793426400,
            "image": "https://images.boosty.to/image/a1fc4bfa-14e0-4fd3-9afc-2ef7b8b90ef9"
        }
    }

    for custom in extra_cfg.get("custom_tags", []):
        tag_id = str(custom.get("tag_id", "")).strip()
        custom_id = str(custom.get("id", f"tag_{tag_id}"))
        raw_prev = prev_items_map.get(custom_id, {})
        fb_info = EXTRA_TAGS_VERIFIED_FALLBACK.get(custom_id, {})

        c_title = clean_bundle_title(custom.get("title", "Без названия"))
        c_link = custom.get("link") or f"https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id}"
        c_image = clean_image_url(custom.get("image", "").strip()) or clean_image_url(raw_prev.get("image", "")) or fb_info.get("image", "")
        eng_metric_tag = make_clean_english_utm_tag(c_title, custom_id)

        tag_posts, direct_tag_post_id = fetch_posts_strictly_by_tag_id(
            tag_id, c_title, all_blog_posts
        ) if tag_id else ([], "")
        now_ts = int(time.time())

        (
            _,
            post_max_ch,
            free_ch_count,
            free_text,
            latest_range_str,
            oldest_post_ts,
            _,
            best_ch_post_id,
            best_free_post_id,
            free_posts_list,
            all_posts_list,
            paid_posts_count
        ) = analyze_posts_stats(tag_posts, now_ts, eng_metric_tag, expected_title=c_title)

        updated_ts = fb_info.get("timestamp") or now_ts
        latest_post_id = (
            (tag_posts[0].get('id') if tag_posts and tag_posts[0].get('id') else '')
            or direct_tag_post_id
            or best_ch_post_id
            or fb_info.get("latest_post_id", "")
        )

        if tag_posts:
            updated_ts = tag_posts[0].get('publishTime') or tag_posts[0].get('createdAt') or updated_ts
            if not c_image or 'placeholder.com' in c_image:
                for candidate_post in tag_posts:
                    img_candidate = extract_high_res_cover_from_post(candidate_post)
                    if img_candidate:
                        c_image = img_candidate
                        break

        if not c_image:
            c_image = "https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка"

        lvl = 2
        total_chapters = post_max_ch if (0 < post_max_ch < 300) else (int(custom.get("chapters") or 0) or int(fb_info.get("chapters") or 0))
        free_chapters = min(free_ch_count, total_chapters) if (total_chapters > 0 and free_posts_list) else 0
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0 and len(free_posts_list) > 0

        final_range = latest_range_str or fb_info.get("latest_range") or (f"1-{total_chapters} гл." if total_chapters > 0 else "Все главы")

        if not all_posts_list and latest_post_id:
            all_posts_list = [{
                "post_id": latest_post_id,
                "title": f"{c_title} ({final_range})",
                "range": final_range,
                "date": datetime.datetime.fromtimestamp(updated_ts).strftime("%d.%m.%Y"),
                "is_free": False,
                "tier_level": 2,
                "link": build_clean_utm_url(f"https://boosty.to/{BLOG_NAME}/posts/{latest_post_id}", eng_metric_tag)
            }]

        is_romance = match_title_in_norm_set(c_title, romance_norms)
        is_completed = match_title_in_norm_set(c_title, completed_norms)
        is_frozen = False if is_completed else match_title_in_norm_set(c_title, frozen_norms)
        custom_h_tags = hidden_overrides_norm.get(normalize_for_match(c_title)) or []

        genres, hidden_tags, content_type = detect_tags_and_type_fast(
            c_title,
            post_tags=[],
            extra_text="",
            prev_item=raw_prev,
            overrides_dict=type_overrides,
            is_romance_special=is_romance,
            custom_hidden_overrides=custom_h_tags
        )

        raw_latest_post_url = f"https://boosty.to/{BLOG_NAME}/posts/{latest_post_id}" if latest_post_id else c_link

        result.append({
            "id": custom_id,
            "metric_tag": eng_metric_tag,
            "utm_campaign": eng_metric_tag,
            "vote_key": make_ascii_vote_key(custom_id),
            "title": c_title,
            "image": c_image,
            "content_type": content_type,
            "chapters": total_chapters,
            "free_chapters": free_chapters,
            "paid_chapters": paid_chapters,
            "free_posts_count": len(free_posts_list),
            "paid_posts_count": max(paid_posts_count, len(all_posts_list), 1),
            "latest_range": final_range,
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
            "is_1_to_n": True,
            "tier": "👑 2 уровень • 500 ₽/мес",
            "tier_level": lvl,
            "latest_post_id": latest_post_id,
            "latest_post_link": build_clean_utm_url(raw_latest_post_url, eng_metric_tag),
            "free_post_id": best_free_post_id if has_free else "",
            "free_post_link": build_clean_utm_url(c_link, eng_metric_tag),
            "sub_link": build_clean_utm_url(SUB_LINKS[2], eng_metric_tag),
            "link": build_clean_utm_url(c_link, eng_metric_tag),
            "monthly_searches": previous_searches.get(custom_id, 0)
        })

    save_type_overrides(type_overrides)
    compute_top_ratings_and_genre_leaders(result)
    return result, months_archive, all_blog_posts


if __name__ == '__main__':
    extra_cfg = load_extra_config()
    data, months_archive, all_blog_posts = process_data(extra_cfg)

    if data and len(data) > 5:
        stats_data = get_blog_stats_and_goals(data, all_blog_posts)
        with open('stats.json', 'w', encoding='utf-8') as f:
            json.dump(stats_data, f, ensure_ascii=False, indent=2)

        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        save_ratings_json_file(data, months_archive)
        update_missing_searches_file(data)

        manhua_count = sum(1 for x in data if x.get('content_type') == 'manhua')
        manhwa_count = sum(1 for x in data if x.get('content_type') == 'manhwa')
        manga_count = sum(1 for x in data if x.get('content_type') == 'manga')
        print(
            f"Успешно обновлено {len(data)} тайтлов строго из бандлов и тегов "
            f"(Манхва: {manhwa_count}, Маньхуа: {manhua_count}, Манга: {manga_count})."
        )
    else:
        cached_catalog = []
        if os.path.exists('data.json'):
            try:
                with open('data.json', 'r', encoding='utf-8') as f:
                    cached_catalog = json.load(f)
            except Exception:
                cached_catalog = []
        compute_top_ratings_and_genre_leaders(cached_catalog)
        stats_data = get_blog_stats_and_goals(cached_catalog, [])
        with open('stats.json', 'w', encoding='utf-8') as f:
            json.dump(stats_data, f, ensure_ascii=False, indent=2)
        update_missing_searches_file(cached_catalog)
        print("Сохранен предыдущий кэш data.json, обновлен stats.json и missing_searches.json (Fallback).")
