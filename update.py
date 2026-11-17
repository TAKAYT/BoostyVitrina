import urllib.request
import urllib.parse
import json
import re
import datetime
import time
import os
import io
import html as html_lib
import xml.etree.ElementTree as ET

try:
    from PIL import Image
except ImportError:
    Image = None

BLOG_NAME = 'darktaka'
TG_CHANNEL_USERNAME = 'PoteranSusheter'
YT_CHANNEL_ID = 'UCVIQOnICNIBcLshYisdechQ'
MEDIA_CACHE_DIR = 'media_cache'

_METEO_LAT = 45.0428
_METEO_LON = 41.9734

BOOSTY_API_HEADERS = {
    'User-Agent': 'TakaCatalogSyncBot/5.0 (+https://github.com/darktaka; API-Sync; Bot; NoTrack)',
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
    'Accept': 'application/json, text/html, application/xml, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
}

TIER_1_ID = "3988840"
TIER_2_ID = "3988841"
TIER_3_ID = "3979820"

SUB_LINKS = {
    1: f"https://boosty.to/darktaka/purchase/{TIER_1_ID}?ssource=DIRECT&share=subscription_link",
    2: f"https://boosty.to/darktaka/purchase/{TIER_2_ID}?ssource=DIRECT&share=subscription_link",
    3: f"https://boosty.to/darktaka/purchase/{TIER_3_ID}?ssource=DIRECT&share=subscription_link"
}

TITLE_SYNONYM_GROUPS = [
    ["некромант я катастрофа", "ням", "ням (некромант)", "ням некромант", "катастрофический некромант", "некромант - я катастрофа"],
    ["паладин sss ранга", "паладин sss ранга главы", "пsss", "psss", "паладин превосходящий здравый смысл"],
    [
        "всеобщий отбор укротитель драконов в самом деле самый слабый класс",
        "воудр (дракончик)",
        "воудр дракончик",
        "воудр",
        "дракончик",
        "укротитель драконов в самом деле самый слабый класс"
    ],
    ["некромант максимального уровня", "некромант макс lvl", "некромант макс лвл"],
    ["мастер древних божественных орудий", "мастер божественных орудий древней эпохи"],
    ["я перевоплотился в могущественного дракона для сокрушения мира", "я стал драконом в прошлом"],
    ["я проснулся имбой после 100 лет afk", "я проснулся имбой после 100 лет афк"],
    ["начало после конца", "кнчн"],
    ["от гоблина к богу гоблинов", "к богу гоблинов", "от гоблина до бога гоблинов"],
    ["реинкарнация в начало апокалипсиса", "в начало до зомби апокалипсиса", "в начало до зомби-апокалипсиса"],
    ["я стал графским ублюдком", "я стал ублюдком сильнейшего графства", "отброс графской семьи"],
    ["прокачка в аду", "прокачка в аду в одиночку"],
    ["повелитель насекомых", "король насекомых"],
    ["цивилизация мудрецов", "деревня под наблюдением бога"],
    ["некромант катастрофа решил уйти на пенсию", "некромант-катастрофа решил уйти на пенсию"],
    ["перерождение демонического культиватора", "перерождение демонического культиватора в мире зомби", "возрождение демонического культиватора в мире зомби апокалипсиса"],
    ["призыватель sss ранга", "призыватель 3s ранга"],
    ["возрождение династии тан", "династия тан", "династии тан"],
    ["тени", "тень", "мир теней", "система теней", "божественный убийца я тень", "ночь теней"],
    ["дитя дурных кровей", "дитя дурной крови"]
]

CYR_TO_LAT = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
}

RU_EN_TAG_MAPPING = {
    "некромантия": "некромантия", "некромант": "некромантия", "нежить": "некромантия",
    "necromancy": "некромантия", "necromancer": "некромантия",
    "система": "система", "игровые элементы": "система", "литрпг": "система",
    "прокачка": "система", "рост уровня": "система", "system": "система", "leveling": "система",
    "скрытые способности": "имба", "имба": "имба", "гг имба": "имба", "сильный гг": "имба",
    "могущественный гг": "имба", "непобедимый гг": "имба", "overpowered": "имба",
    "регрессия": "регрессия", "возвращение в прошлое": "регрессия", "путешествие во времени": "регрессия",
    "regression": "регрессия", "time travel": "регрессия",
    "реинкарнация": "перерождение", "перерождение": "перерождение", "исекай": "перерождение",
    "попаданец": "перерождение", "reincarnation": "перерождение", "isekai": "перерождение",
    "подземелья": "подземелья", "данжи": "подземелья", "башня": "подземелья",
    "охотники": "подземелья", "врата": "подземелья", "dungeon": "подземелья", "dungeons": "подземелья",
    "драконы": "драконы", "дракон": "драконы", "dragons": "драконы",
    "призыв": "призыв", "призыватель": "призыв", "питомцы": "призыв", "укрощение": "призыв",
    "монстры": "призыв", "звери": "призыв", "гоблины": "призыв", "summoning": "призыв", "tamer": "призыв",
    "апокалипсис": "апокалипсис", "постапокалипсис": "апокалипсис", "зомби": "апокалипсис",
    "выживание": "апокалипсис", "apocalypse": "апокалипсис", "zombies": "апокалипсис", "survival": "апокалипсис",
    "культивация": "культивация", "боевые искусства": "культивация", "мурим": "культивация",
    "сянься": "культивация", "уся": "культивация", "дао": "культивация", "cultivation": "культивация", "martial arts": "культивация",
    "демоны": "демоны", "боги": "демоны", "demons": "демоны", "gods": "демоны",
    "месть": "месть", "антигерой": "месть", "жестокий мир": "месть", "revenge": "месть",
    "артефакты": "артефакты", "алхимия": "артефакты", "кузнечное дело": "артефакты", "alchemy": "артефакты",
    "фэнтези": "фэнтези", "магия": "фэнтези", "рыцари": "фэнтези", "эльфы": "фэнтези",
    "средневековье": "фэнтези", "аристократия": "фэнтези", "fantasy": "фэнтези", "magic": "фэнтези"
}

STRICT_SINGLE_TAG_PATTERNS = [
    ("некромантия", re.compile(r'(?:^|[^а-яa-z0-9])(некромант[а-я]*|скелет[а-я]*|нежит[а-я]*|мертвец[а-я]*|лич(?:а|ем|и|ей)?|кладбищ[а-я]*|кост(?:ей|и|яной))(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("система", re.compile(r'(?:^|[^а-яa-z0-9])(систем[а-я]*|уров(?:ень|ня|ней|нем)|лвл|lvl|sss|3s|s-ранг[а-я]*|f-ранг[а-я]*|ранг(?:а|ов|у)?|квест[а-я]*|прокачк[а-я]*|прокачива[а-я]*|игрок[а-я]*|навык[а-я]*|талант[а-я]*|очков|статус[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("имба", re.compile(r'(?:^|[^а-яa-z0-9])(имб[а-я]*|сильнейш[а-я]*|максимальн[а-я]*|непобедим[а-я]*|всемогущ[а-я]*|абсолютн[а-я]*|100\s*лет|катастроф[а-я]*|божественн[а-я]*|верховн[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("регрессия", re.compile(r'(?:^|[^а-яa-z0-9])(регресс[а-я]*|вернул[а-я]*\s+в\s+прошл[а-я]*|в\s+начало\s+до|заново|спустя\s+\d+\s+лет|в\s+прошлое)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("перерождение", re.compile(r'(?:^|[^а-яa-z0-9])(перерожд[а-я]*|реинкарнац[а-я]*|перевопло[а-я]*|возрожд[а-я]*|начало\s+после\s+конца|стал\s+графским|стал\s+ублюдком|исекай|в\s+другом\s+мире|стал\s+злодеем|стал\s+деревом|переселен[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("подземелья", re.compile(r'(?:^|[^а-яa-z0-9])(подземел[а-я]*|данж[а-я]*|башн[а-я]*|врат(?:а|ах)|охотник[а-я]*|рейд[а-я]*|гробниц[а-я]*|расхитител[а-я]*|лабиринт[а-я]*|прокачка\s+в\s+аду|бездн[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("драконы", re.compile(r'(?:^|[^а-яa-z0-9])(дракон[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("призыв", re.compile(r'(?:^|[^а-яa-z0-9])(призыв[а-я]*|укротител[а-я]*|питом[а-я]*|звер[а-я]*|насеком[а-я]*|гоблин[а-я]*|фамильяр[а-я]*|монстр[а-я]*|рой|роя|эволюци[а-я]*|слиз[ьи])(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("апокалипсис", re.compile(r'(?:^|[^а-яa-z0-9])(апокалипсис[а-я]*|зомби|вирус[а-я]*|судный\s+день|выживан[а-я]*|конец\s+света|мутант[а-я]*|заморозк[а-я]*|ледников[а-я]*|убежищ[а-я]*|припас[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("культивация", re.compile(r'(?:^|[^а-яa-z0-9])(культиват[а-я]*|дао|бессмертн[а-я]*|боевых\s+искусств|мурим[а-я]*|сект[а-я]*|предок|император[а-я]*|небесн[а-я]*|континент[а-я]*|пик\s+боевых|династи[яи]\s+тан)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("демоны", re.compile(r'(?:^|[^а-яa-z0-9])(демон[а-я]*|дьявол[а-я]*|падш[а-я]*|бог[а-я]*\s+гоблин[а-я]*|под\s+наблюдением\s+бога|злой\s+бог|божеств[а-я]*|асур[а-я]*|владык[а-я]*\s+тьмы)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("месть", re.compile(r'(?:^|[^а-яa-z0-9])(мест(?:ь|и|ью)|предател[а-я]*|сокрушен[а-я]*\s+мира|расплат[а-я]*|злоде[а-я]*|ублюд[а-я]*|отброс[а-я]*|убийц[а-я]*|изгнан[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("артефакты", re.compile(r'(?:^|[^а-яa-z0-9])(оруди[а-я]*|артефакт[а-я]*|кузнец[а-я]*|алхим[а-я]*|сокровищ[а-я]*|транжир[а-я]*|меч[а-я]*|клинок|клинка|экипировк[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("фэнтези", re.compile(r'(?:^|[^а-яa-z0-9])(маги[а-я]*|архимаг[а-я]*|маг(?:а|у|ом|и)?|академи[а-я]*|рыцар[а-я]*|паладин[а-я]*|эльф[а-я]*|графств[а-я]*|графск[а-я]*|герцог[а-я]*|принц[а-я]*|королев[а-я]*|мудрец[а-я]*|геро[а-я]*|авантюрист[а-я]*|гильди[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE))
]

CANDIDATE_MISSING_TITLES = [
    "Поднятие уровня в одиночку", "Башня Бога", "Всеведущий читатель",
    "Ошибка Эхо", "Легенда о Северном Клинке", "Наномашины",
    "Возвращение героя класса катастрофы", "Прирожденный наемник",
    "Лукизм", "Милый дом", "Ублюдок FFF-ранга",
    "Игрок который вернулся спустя 10000 лет", "Меч императора",
    "Звездный предок", "Пик боевых искусств", "Сказания о демонах и богах",
    "Боевой континент", "Расколотая битвой синева небес", "Восставший против неба",
    "Аватар короля", "Маг на полную ставку", "Квест превосходства",
    "Борьба в прямом эфире", "Менеджер Ким", "Пожиратель талантов",
    "Охотник S-класса", "Убийца гоблинов", "Ванпанчмен",
    "Магическая битва", "Человек-бензопила", "Берсерк", "Черный клевер"
]


def fetch_json(url, timeout=18, extra_headers=None, post_data=None, is_boosty=False):
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


def fetch_text_external(url, timeout=16):
    req = urllib.request.Request(url, headers=EXTERNAL_HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode('utf-8', errors='ignore')


def download_media_to_cache(url, filename, max_width=0):
    if not url or not filename:
        return ""
    os.makedirs(MEDIA_CACHE_DIR, exist_ok=True)
    local_path = os.path.join(MEDIA_CACHE_DIR, filename).replace('\\', '/')
    if os.path.exists(local_path) and os.path.getsize(local_path) > 1024:
        return local_path
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': EXTERNAL_HEADERS['User-Agent'],
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        })
        with urllib.request.urlopen(req, timeout=12) as resp:
            content = resp.read()
            if content and len(content) > 512:
                if max_width > 0 and Image is not None:
                    try:
                        im = Image.open(io.BytesIO(content)).convert('RGB')
                        if im.width > max_width:
                            ratio = max_width / float(im.width)
                            im = im.resize((max_width, int(im.height * ratio)), Image.LANCZOS)
                        im.save(local_path, format='JPEG', quality=80, optimize=True)
                        return local_path
                    except Exception:
                        pass
                with open(local_path, 'wb') as f:
                    f.write(content)
                return local_path
    except Exception:
        pass
    return ""


def cache_cover_image(url, key_id):
    if not url or not isinstance(url, str) or 'via.placeholder.com' in url:
        return ""
    if url.startswith(MEDIA_CACHE_DIR + '/'):
        return url
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '', str(key_id or 'cover'))[:48]
    cached = download_media_to_cache(url, f"cover_{safe_id}.jpg", max_width=380)
    return cached or url


def clean_image_url(url):
    if not url or not isinstance(url, str):
        return ""
    if 'images.boosty.to/image/' in url:
        return url.split('?')[0]
    return url


def normalize_for_match(s):
    if not s:
        return ""
    s = s.lower().replace('ё', 'е')
    s = re.sub(r'\[\s*\d+\s*[-—–]\s*\d+[^\]]*\]', ' ', s)
    s = re.sub(r'\b(?:глав[аы]?|гл\.?|часть|сезон|все\s*главы)\b', ' ', s)
    s = re.sub(r'\b\d+\s*[-—–]\s*\d+\b', ' ', s)
    s = re.sub(r'[^a-zа-я0-9\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def stem_russian_word(word):
    w = str(word or '').lower().replace('ё', 'е').strip()
    if len(w) <= 3:
        return w
    if w in ('тени', 'тень', 'теней', 'тенью'):
        return 'тен'
    s = re.sub(r'(?:ами|ями|ого|его|ому|ему|иях|иям|ией|ии|ия|ий|ый|ой|ая|яя|ое|ее|ые|ие|ов|ев|ей|ам|ям|ах|ях|ом|ем|ую|юю|ью|а|я|ы|и|е|у|ю|ь)$', '', w)
    return s if len(s) >= 3 else w[:3]


def resolve_canonical_title(title_str):
    norm_t = normalize_for_match(title_str)
    if not norm_t:
        return str(title_str or 'title').lower().strip()
    for group in TITLE_SYNONYM_GROUPS:
        norm_group = [normalize_for_match(x) for x in group if x]
        if norm_t in norm_group:
            return group[0]
        for syn in norm_group:
            if len(syn) > 4 and (norm_t == syn or norm_t.startswith(syn + " ") or syn.startswith(norm_t + " ")):
                return group[0]
    return norm_t


def make_clean_english_utm_tag(title_str, item_id=""):
    canonical = resolve_canonical_title(title_str)
    lower = str(canonical or '').lower().replace('ё', 'е')
    out = []
    for ch in lower:
        if ch in CYR_TO_LAT:
            out.append(CYR_TO_LAT[ch])
        elif 'a' <= ch <= 'z' or '0' <= ch <= '9':
            out.append(ch)
        else:
            out.append('_')
    slug = re.sub(r'_+', '_', ''.join(out)).strip('_')[:48]
    if slug.startswith('title_'):
        slug = slug[6:]
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


def load_type_overrides():
    if os.path.exists('type_overrides.json'):
        try:
            with open('type_overrides.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            print(f"Ошибка чтения type_overrides.json: {e}")
    return {
        "_comment": "Справочник 100% приоритета типа тайтла (manhwa, manhua, manga). Новые тайтлы добавляются сюда автоматически с пустой строкой — при желании можно вписать нужный тип вручную."
    }


def save_type_overrides(overrides_dict):
    comment = overrides_dict.get(
        "_comment",
        "Справочник 100% приоритета типа тайтла (manhwa, manhua, manga). Новые тайтлы добавляются сюда автоматически с пустой строкой — при желании можно вписать нужный тип вручную."
    )
    items_only = {k: v for k, v in overrides_dict.items() if k != "_comment"}
    sorted_items = dict(sorted(items_only.items(), key=lambda kv: kv[0].lower()))
    out = {"_comment": comment}
    out.update(sorted_items)
    with open('type_overrides.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)


def lookup_type_override(clean_title, overrides_dict):
    if clean_title in overrides_dict and overrides_dict[clean_title] in ("manhwa", "manhua", "manga"):
        return overrides_dict[clean_title]
    norm_target = normalize_for_match(clean_title)
    for k, v in overrides_dict.items():
        if k == "_comment" or v not in ("manhwa", "manhua", "manga"):
            continue
        if normalize_for_match(k) == norm_target:
            return v
    return None


def load_special_titles():
    default_cfg = {
        "romance_sakura": [],
        "frozen_titles": [],
        "completed_titles": [],
        "hidden_tags_overrides": {}
    }
    if os.path.exists('special_titles.json'):
        try:
            with open('special_titles.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    for k in default_cfg:
                        if k in data:
                            default_cfg[k] = data[k]
        except Exception as e:
            print(f"Ошибка чтения special_titles.json: {e}")
    return default_cfg


def resolve_special_flags(clean_title, special_cfg):
    norm_t = normalize_for_match(clean_title)
    canon_t = resolve_canonical_title(clean_title)

    def _in_list(lst):
        for entry in (lst or []):
            if entry == clean_title:
                return True
            n_e = normalize_for_match(entry)
            if n_e and (n_e == norm_t or resolve_canonical_title(entry) == canon_t):
                return True
        return False

    hidden_tags = []
    overrides = special_cfg.get("hidden_tags_overrides") or {}
    if isinstance(overrides, dict):
        for k, tags_val in overrides.items():
            if k == clean_title or normalize_for_match(k) == norm_t:
                if isinstance(tags_val, list):
                    hidden_tags = [str(x).strip().lower() for x in tags_val if x]
                break

    return {
        "is_romance": _in_list(special_cfg.get("romance_sakura")),
        "is_frozen": _in_list(special_cfg.get("frozen_titles")),
        "is_completed": _in_list(special_cfg.get("completed_titles")),
        "hidden_tags": hidden_tags
    }


def parse_remanga_type_strict(type_field):
    if type_field is None:
        return None
    if isinstance(type_field, dict):
        t_id = type_field.get('id')
        t_str = f"{type_field.get('rus_name') or ''} {type_field.get('name') or ''} {type_field.get('label') or ''}".lower()
        if 'маньхуа' in t_str or 'manhua' in t_str or t_id == 2:
            return 'manhua'
        if 'манхва' in t_str or 'manhwa' in t_str or t_id == 1:
            return 'manhwa'
        if 'манга' in t_str or 'manga' in t_str or t_id == 0:
            return 'manga'
    elif isinstance(type_field, int):
        return {0: 'manga', 1: 'manhwa', 2: 'manhua'}.get(type_field)
    else:
        t_str = str(type_field).lower()
        if 'маньхуа' in t_str or 'manhua' in t_str:
            return 'manhua'
        if 'манхва' in t_str or 'manhwa' in t_str:
            return 'manhwa'
        if 'манга' in t_str or 'manga' in t_str:
            return 'manga'
    return None


def map_raw_tags_to_catalog_tags(raw_tag_strings):
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


def query_remanga_source(search_title):
    try:
        q = urllib.parse.quote(search_title)
        res = fetch_json(
            f"https://api.remanga.org/api/search/?query={q}&count=5",
            timeout=6,
            extra_headers={'Referer': 'https://remanga.org/'}
        )
        content_list = res.get('content') if isinstance(res, dict) else []
        if not isinstance(content_list, list) or not content_list:
            return None, [], 0

        norm_q = normalize_for_match(search_title)
        q_stems = [stem_russian_word(w) for w in norm_q.split() if len(w) >= 3]
        best_item = None
        best_score = -1

        for idx, cand in enumerate(content_list):
            if not isinstance(cand, dict):
                continue
            rus_n = normalize_for_match(cand.get('rus_name') or '')
            main_n = normalize_for_match(cand.get('main_name') or '')
            if rus_n == norm_q or main_n == norm_q:
                best_item = cand
                break
            combined = f"{rus_n} {main_n}".strip()
            cand_stems = [stem_russian_word(w) for w in combined.split() if len(w) >= 3]
            matched_stems = sum(1 for st in q_stems if any(st in cs or cs in st for cs in cand_stems))
            score = matched_stems * 10 - idx
            if q_stems and matched_stems >= max(1, len(q_stems) - 1) and score > best_score:
                best_score = score
                best_item = cand

        if not best_item and len(content_list) == 1:
            best_item = content_list[0]
        if not best_item:
            return None, [], 0

        detected_type = parse_remanga_type_strict(best_item.get('type'))
        remanga_chapters = int(best_item.get('count_chapters') or best_item.get('total_chapters') or 0)
        raw_tags = []
        for field in ['genres', 'categories', 'tags']:
            for el in (best_item.get(field) or []):
                raw_tags.append(el.get('name') or el.get('rus_name') or '' if isinstance(el, dict) else str(el))
        return detected_type, map_raw_tags_to_catalog_tags(raw_tags), remanga_chapters
    except Exception:
        return None, [], 0


def detect_genres_type_and_internet_chapters(clean_title, overrides_dict, post_tags=None, extra_text="", prev_item=None, voiced_chapters=0):
    override_type = lookup_type_override(clean_title, overrides_dict)

    combined_title_text = f" {resolve_canonical_title(clean_title)} {clean_title} {' '.join(post_tags or [])} {extra_text} ".lower().replace('ё', 'е')
    tag_votes_counter = {}
    for tag_key, pattern in STRICT_SINGLE_TAG_PATTERNS:
        if pattern.search(combined_title_text):
            tag_votes_counter[tag_key] = tag_votes_counter.get(tag_key, 0) + 2

    rm_type, rm_tags, rm_chapters = query_remanga_source(clean_title)
    for t in rm_tags:
        tag_votes_counter[t] = tag_votes_counter.get(t, 0) + 2

    if override_type:
        final_type = override_type
    elif rm_type:
        final_type = rm_type
    elif isinstance(prev_item, dict) and prev_item.get("content_type") in ("manhwa", "manhua", "manga"):
        final_type = prev_item["content_type"]
    else:
        final_type = "manhwa"

    if clean_title not in overrides_dict:
        overrides_dict[clean_title] = ""

    max_internet_chapters = max(
        int(rm_chapters or 0),
        int((prev_item or {}).get("internet_chapters") or 0),
        int(voiced_chapters or 0)
    )

    verified_tags = [
        t for t, _ in sorted(tag_votes_counter.items(), key=lambda kv: kv[1], reverse=True)
    ] or ["фэнтези"]

    return verified_tags[:3], final_type, max_internet_chapters


def fetch_outdoor_weather_state():
    now_msk = datetime.datetime.utcnow() + datetime.timedelta(hours=3)
    m = now_msk.month
    season = "winter" if m in (12, 1, 2) else ("spring" if m in (3, 4, 5) else ("summer" if m in (6, 7, 8) else "autumn"))
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


def fetch_boosty_subscription_levels():
    tiers = []
    try:
        raw = fetch_json(f'https://api.boosty.to/v1/blog/{BLOG_NAME}/subscription_level/', is_boosty=True)
        levels = raw.get('data', []) if isinstance(raw, dict) else []
        for lv in levels:
            if not isinstance(lv, dict):
                continue
            lid = str(lv.get('id') or '').strip()
            price = int(lv.get('price') or 0)
            old_price = int(lv.get('oldPrice') or 0)
            if lid == TIER_2_ID or (450 <= price <= 600):
                t_num = 2
            elif lid == TIER_3_ID or price >= 900:
                t_num = 3
            else:
                t_num = 1
            tiers.append({
                "id": lid,
                "tier": t_num,
                "name": lv.get('name') or f"{t_num} уровень",
                "price": price,
                "old_price": old_price,
                "url": f"https://boosty.to/{BLOG_NAME}/purchase/{lid}?ssource=DIRECT&share=subscription_link"
            })
        tiers.sort(key=lambda x: x['tier'])
    except Exception:
        pass
    return tiers


def fetch_latest_telegram_channel_news(limit=8, max_days=7):
    news_items = []
    now_utc = datetime.datetime.utcnow().date()
    try:
        html_str = fetch_text_external(f"https://t.me/s/{TG_CHANNEL_USERNAME}", timeout=12)
        blocks = html_str.split('class="tgme_widget_message_wrap')
        for block in blocks[1:]:
            post_link_m = re.search(rf'data-post="{TG_CHANNEL_USERNAME}/(\d+)"', block)
            if not post_link_m:
                continue
            post_id = post_link_m.group(1)
            post_url = f"https://t.me/{TG_CHANNEL_USERNAME}/{post_id}"

            date_m = re.search(r'<time[^>]+datetime="([^"]+)"', block)
            iso_date = date_m.group(1) if date_m else ""
            raw_ymd = iso_date[:10] if iso_date else ""
            if len(raw_ymd) == 10 and '-' in raw_ymd:
                try:
                    post_date = datetime.date.fromisoformat(raw_ymd)
                    if (now_utc - post_date).days > max_days:
                        continue
                except Exception:
                    pass

            photo_url = ""
            photo_m = re.search(r'tgme_widget_message_photo_wrap[^>]+style="[^"]*background-image:url\(\'([^\']+)\'\)', block)
            if photo_m:
                photo_url = photo_m.group(1)

            local_img = download_media_to_cache(photo_url, f"tg_{post_id}.jpg", max_width=640) if photo_url else ""

            text_m = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', block, re.DOTALL)
            raw_html_text = text_m.group(1) if text_m else ""
            clean_text = re.sub(r'<br\s*/?>', '\n', raw_html_text)
            clean_text = re.sub(r'<[^>]+>', '', clean_text)
            clean_text = html_lib.unescape(clean_text).strip()

            if not clean_text and not local_img:
                continue

            display_date = raw_ymd
            if len(display_date) == 10 and '-' in display_date:
                parts = display_date.split('-')
                display_date = f"{parts[2]}.{parts[1]}.{parts[0]}"

            short_text = clean_text.replace('\n', ' ').strip()
            if len(short_text) > 130:
                short_text = short_text[:127].rstrip() + "..."

            news_items.append({
                "id": post_id,
                "date": display_date or "Свежий пост",
                "short_text": short_text or "Фото-публикация в Telegram-канале ТАКА",
                "full_text": clean_text or "Фото-публикация в Telegram-канале ТАКА",
                "image": local_img or photo_url,
                "link": post_url
            })

        news_items.reverse()
        return news_items[:limit]
    except Exception as e:
        print(f"Не удалось загрузить ленту ТГ-канала: {e}")
        return []


def fetch_latest_youtube_videos(limit=4):
    videos = []
    try:
        rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={YT_CHANNEL_ID}"
        xml_str = fetch_text_external(rss_url, timeout=12)
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
            link_el = entry.find('atom:link', ns)
            desc_el = entry.find('media:group/media:description', ns)

            video_id = vid_el.text.strip() if vid_el is not None and vid_el.text else ""
            if not video_id:
                continue

            title = title_el.text.strip() if title_el is not None and title_el.text else "Новый ролик ТАКА"
            link = link_el.attrib.get('href', f"https://www.youtube.com/watch?v={video_id}") if link_el is not None else f"https://www.youtube.com/watch?v={video_id}"
            pub_raw = pub_el.text[:10] if pub_el is not None and pub_el.text else ""
            display_date = pub_raw
            if len(pub_raw) == 10 and '-' in pub_raw:
                p = pub_raw.split('-')
                display_date = f"{p[2]}.{p[1]}.{p[0]}"

            desc_text = desc_el.text.strip() if desc_el is not None and desc_el.text else ""
            short_desc = desc_text.replace('\n', ' ').strip()
            if len(short_desc) > 130:
                short_desc = short_desc[:127].rstrip() + "..."

            thumb_remote = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
            local_thumb = download_media_to_cache(thumb_remote, f"yt_{video_id}.jpg", max_width=480)

            videos.append({
                "id": video_id,
                "title": title,
                "date": display_date or "Свежий ролик",
                "short_text": short_desc or title,
                "full_text": desc_text or title,
                "image": local_thumb or thumb_remote,
                "link": link
            })
        return videos
    except Exception as e:
        print(f"Не удалось загрузить RSS YouTube: {e}")
        return []


def cleanup_old_media_cache(stats_data, catalog_items=None):
    if not os.path.isdir(MEDIA_CACHE_DIR):
        return
    active_files = set()
    for item in (stats_data.get('tg_news') or []) + (stats_data.get('yt_videos') or []):
        img = str(item.get('image') or '')
        if img.startswith(MEDIA_CACHE_DIR + '/'):
            active_files.add(os.path.basename(img))
    for c_item in (catalog_items or []):
        for k in ('image', 'week_post_image'):
            img = str(c_item.get(k) or '')
            if img.startswith(MEDIA_CACHE_DIR + '/'):
                active_files.add(os.path.basename(img))
    for fname in os.listdir(MEDIA_CACHE_DIR):
        if (fname.startswith('tg_') or fname.startswith('yt_') or fname.startswith('cover_')) and fname not in active_files:
            try:
                os.remove(os.path.join(MEDIA_CACHE_DIR, fname))
            except Exception:
                pass


def load_previous_catalog_and_votes():
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    is_monthly_reset_window = (now.day == 1 and now.hour < 4)

    prev_items_map = {}
    votes_map = {}
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
                    saved_month = str(v_doc.get('month') or '')
                    months_archive = v_doc.get('months_archive', {})
                    if not isinstance(months_archive, dict):
                        months_archive = {}
                    items_dict = v_doc.get('items', {})
                    if saved_month and isinstance(items_dict, dict):
                        months_archive[saved_month] = {
                            "updated_at": v_doc.get("updated_at", ""),
                            "total_votes_cast": v_doc.get("total_votes_cast", 0),
                            "total_monthly_searches": v_doc.get("total_monthly_searches", 0),
                            "items": items_dict
                        }
                    if saved_month == month_key and isinstance(items_dict, dict) and not is_monthly_reset_window:
                        for iid, v_info in items_dict.items():
                            if isinstance(v_info, dict):
                                votes_map[str(iid)] = max(votes_map.get(str(iid), 0), int(v_info.get('votes') or 0))
                                searches_map[str(iid)] = max(searches_map.get(str(iid), 0), int(v_info.get('monthly_searches') or 0))
                            elif isinstance(v_info, (int, float)):
                                votes_map[str(iid)] = max(votes_map.get(str(iid), 0), int(v_info))
        except Exception:
            pass

    return prev_items_map, votes_map, searches_map, months_archive


def fetch_current_votes_and_searches_for_id(item_id, fallback_votes=0, fallback_searches=0):
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    vote_ns = f"takayt_vitrina_{month_key}"
    search_ns = f"takayt_search_{month_key}"
    safe_key = make_ascii_vote_key(item_id)

    is_reset = (now.day == 1 and now.hour < 4)
    max_votes = 0 if is_reset else int(fallback_votes or 0)
    max_searches = 0 if is_reset else int(fallback_searches or 0)

    try:
        v_data = fetch_json(f"https://api.counterapi.dev/v1/{vote_ns}/{safe_key}", timeout=4)
        if isinstance(v_data, dict):
            c = int(v_data.get('count') or v_data.get('value') or 0)
            if c > max_votes:
                max_votes = c
    except Exception:
        pass

    try:
        s_data = fetch_json(f"https://api.counterapi.dev/v1/{search_ns}/{safe_key}", timeout=4)
        if isinstance(s_data, dict):
            sc = int(s_data.get('count') or s_data.get('value') or 0)
            if sc > max_searches:
                max_searches = sc
    except Exception:
        pass

    time.sleep(0.02)
    return max_votes, max_searches


def save_votes_json_file(catalog_items, months_archive):
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    namespace = f"takayt_vitrina_{month_key}"

    items_payload = {}
    total_votes_sum = 0
    total_searches_sum = 0

    sorted_items = sorted(
        catalog_items,
        key=lambda x: (int(x.get('votes') or 0), int(x.get('monthly_searches') or 0)),
        reverse=True
    )

    for rank, item in enumerate(sorted_items, 1):
        iid = str(item.get('id', ''))
        v_count = int(item.get('votes') or 0)
        s_count = int(item.get('monthly_searches') or 0)
        total_votes_sum += v_count
        total_searches_sum += s_count
        items_payload[iid] = {
            "title": item.get("title", ""),
            "metric_tag": item.get("metric_tag", ""),
            "month": month_key,
            "votes": v_count,
            "monthly_searches": s_count,
            "rank": rank if v_count > 0 else 0,
            "tier_level": item.get("tier_level", 1),
            "updated_at": item.get("last_update", "")
        }

    months_archive[month_key] = {
        "updated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_votes_cast": total_votes_sum,
        "total_monthly_searches": total_searches_sum,
        "items": items_payload
    }

    votes_doc = {
        "month": month_key,
        "updated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "namespace": namespace,
        "total_votes_cast": total_votes_sum,
        "total_monthly_searches": total_searches_sum,
        "items": items_payload,
        "months_archive": months_archive
    }

    with open('votes.json', 'w', encoding='utf-8') as f:
        json.dump(votes_doc, f, ensure_ascii=False, indent=2)


def update_missing_searches_file(catalog_items):
    now = datetime.datetime.utcnow()
    month_key = f"{now.year}_{now.month:02d}"
    missing_ns = f"takayt_missing_{month_key}"

    existing_norm_titles = set()
    for item in catalog_items:
        norm_t = normalize_for_match(item.get("title", ""))
        if norm_t:
            existing_norm_titles.add(norm_t)
        for al in get_aliases_for_title(item.get("title", "")):
            existing_norm_titles.add(normalize_for_match(al))

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
                    if isinstance(loaded.get("months"), dict):
                        doc["months"] = loaded["months"]
                    if isinstance(loaded.get("already_added_to_boosty"), list):
                        doc["already_added_to_boosty"] = loaded["already_added_to_boosty"]
        except Exception:
            pass

    if month_key not in doc["months"] or not isinstance(doc["months"].get(month_key), dict):
        doc["months"][month_key] = {"total_missing_queries": 0, "queries": {}}

    month_queries = doc["months"][month_key].get("queries", {})
    if not isinstance(month_queries, dict):
        month_queries = {}

    manual_missing = os.environ.get('MANUAL_MISSING_QUERY', '').strip()
    candidates_to_check = list(CANDIDATE_MISSING_TITLES)
    if manual_missing and manual_missing not in candidates_to_check:
        candidates_to_check.append(manual_missing)
    for q_title in list(month_queries.keys()):
        if q_title not in candidates_to_check:
            candidates_to_check.append(q_title)

    for candidate in candidates_to_check:
        norm_cand = normalize_for_match(candidate)
        if not norm_cand:
            continue
        is_on_boosty = any(
            norm_cand == ex or (len(norm_cand) > 5 and (norm_cand in ex or ex in norm_cand))
            for ex in existing_norm_titles if ex
        )
        if is_on_boosty:
            if candidate in month_queries:
                del month_queries[candidate]
            if candidate not in doc["already_added_to_boosty"]:
                doc["already_added_to_boosty"].append(candidate)
            continue

        slug_key = "q_" + make_clean_english_utm_tag(candidate)
        prev_count = int(month_queries[candidate].get("count") or 0) if isinstance(month_queries.get(candidate), dict) else 0
        api_count = 0
        try:
            res = fetch_json(f"https://api.counterapi.dev/v1/{missing_ns}/{slug_key}", timeout=3)
            if isinstance(res, dict):
                api_count = int(res.get("count") or res.get("value") or 0)
        except Exception:
            pass

        if manual_missing and normalize_for_match(manual_missing) == norm_cand:
            api_count = max(api_count, prev_count + 1)

        final_count = max(prev_count, api_count)
        if final_count > 0:
            month_queries[candidate] = {
                "title": candidate,
                "slug": slug_key,
                "count": final_count,
                "month": month_key,
                "status": "отсутствует_на_бусти",
                "checked_at": now.strftime("%d/%m/%Y %H:%M UTC")
            }

    sorted_queries = dict(sorted(month_queries.items(), key=lambda kv: int(kv[1].get("count") or 0) if isinstance(kv[1], dict) else 0, reverse=True))
    doc["months"][month_key]["queries"] = sorted_queries
    doc["months"][month_key]["total_missing_queries"] = sum(int(v.get("count") or 0) for v in sorted_queries.values() if isinstance(v, dict))
    with open('missing_searches.json', 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)


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
    return {"custom_tags": []}


def get_blog_stats_and_goals(catalog_items=None):
    stats = {
        "avatar": "",
        "subscribers": 1437,
        "posts": 727,
        "total_free_chapters": 0,
        "total_paid_chapters": 0,
        "total_voiced_chapters": 0,
        "total_internet_chapters": 0,
        "tiers": [],
        "goals": [
            {
                "current": 173,
                "target": 200,
                "type": "subscribers",
                "description": "Устроим теплый закрытый стрим и сможем чаще выкупать главы!"
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
                    for k in ['avatar', 'subscribers', 'posts', 'goals', 'tiers']:
                        if prev_stats.get(k):
                            stats[k] = prev_stats[k]
        except Exception:
            pass

    try:
        blog_data = fetch_json(f'https://api.boosty.to/v1/blog/{BLOG_NAME}', is_boosty=True)
        if isinstance(blog_data, dict):
            if blog_data.get('avatarUrl'):
                stats['avatar'] = blog_data['avatarUrl']
                download_media_to_cache(blog_data['avatarUrl'], 'avatar.png', max_width=200)
            count_obj = blog_data.get('count', {})
            if isinstance(count_obj, dict):
                if count_obj.get('subscribers'):
                    stats['subscribers'] = int(count_obj['subscribers'])
                if count_obj.get('posts'):
                    stats['posts'] = int(count_obj['posts'])
    except Exception:
        pass

    tiers = fetch_boosty_subscription_levels()
    if tiers:
        stats["tiers"] = tiers

    goals_found = []
    for endpoint in [f'https://api.boosty.to/v1/target/{BLOG_NAME}/', f'https://api.boosty.to/v1/blog/{BLOG_NAME}/target/']:
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

    tg_news = fetch_latest_telegram_channel_news(limit=8, max_days=7)
    stats["tg_news"] = tg_news

    yt_videos = fetch_latest_youtube_videos(limit=4)
    if yt_videos:
        stats["yt_videos"] = yt_videos[:4]

    if isinstance(catalog_items, list) and catalog_items:
        stats["total_free_chapters"] = sum(int(x.get("free_chapters") or 0) for x in catalog_items)
        stats["total_paid_chapters"] = sum(int(x.get("paid_chapters") or 0) for x in catalog_items)
        stats["total_voiced_chapters"] = sum(int(x.get("chapters") or 0) for x in catalog_items)
        stats["total_internet_chapters"] = sum(
            max(int(x.get("internet_chapters") or 0), int(x.get("chapters") or 0))
            for x in catalog_items
        )

    cleanup_old_media_cache(stats, catalog_items)
    return stats


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
    for _ in range(30):
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
            time.sleep(0.05)
        except Exception as e:
            print(f"Ошибка пагинации постов: {e}")
            break
    print(f"Всего выгружено постов блога через JSON API: {len(all_posts)}")
    return all_posts


def get_aliases_for_title(clean_title):
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


def extract_all_chapter_ranges(text):
    if not text or not isinstance(text, str):
        return []

    cleaned = re.sub(r'\b202\d\b', '', text)
    cleaned = re.sub(
        r'\b\d+\s*(?:лет|год[ао]?в?|этаж(?:ей|а)?|уров(?:ень|ня|ней)|ранг[а]?|мир(?:ов|а)?|раз|тысяч|миллион(?:ов)?)\b',
        '', cleaned, flags=re.IGNORECASE
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

    return candidates


def parse_strict_chapter_info(text):
    candidates = extract_all_chapter_ranges(text)
    if not candidates:
        return ("", 0, 0)
    return max(candidates, key=lambda x: (x[2], x[2] - x[1]))


def extract_post_titles_strict(post):
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
                            if isinstance(c, list):
                                for line in c:
                                    if isinstance(line, str) and len(line) < 160:
                                        res.append(line)
                        except Exception:
                            pass
    return res


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
    return clean_image_url(matches[0]) if matches else ""


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
            if norm_line == norm_al:
                return True
            if len(norm_al) > 6 and (norm_line.startswith(norm_al + " ") or re.search(rf'(?:^|\s){re.escape(norm_al)}(?:\s|$)', norm_line)):
                return True
    return False


def match_posts_for_bundle(bundle, all_blog_posts, posts_by_id, global_first_post_id, claimed_post_ids=None):
    bundle_id = str(bundle.get('id', '')).strip()
    expected_count = int(bundle.get('publishedPostsCounter') or 0)
    raw_title = bundle.get('title', '')
    clean_t = clean_bundle_title(raw_title)
    norm_title = normalize_for_match(clean_t)
    aliases = get_aliases_for_title(clean_t)

    matched_map = {}
    direct_latest_post_id = ""

    for key in ['lastPost', 'latestPost', 'firstPost']:
        lp = bundle.get(key)
        if isinstance(lp, dict) and lp.get('id'):
            pid_str = str(lp['id']).strip()
            if not direct_latest_post_id:
                direct_latest_post_id = pid_str
            matched_map[pid_str] = posts_by_id.get(pid_str, lp)

    for p in all_blog_posts:
        pid = str(p.get('id') or '').strip()
        if not pid or pid in matched_map:
            continue
        p_bundle = p.get('bundle') or p.get('bundleId') or p.get('bundle_id')
        if (isinstance(p_bundle, dict) and str(p_bundle.get('id')) == bundle_id) or str(p_bundle) == bundle_id:
            matched_map[pid] = p
            continue
        if claimed_post_ids is not None and pid in claimed_post_ids:
            continue
        if is_exact_title_match(norm_title, aliases, p):
            matched_map[pid] = p

    if len(matched_map) < max(expected_count, 2):
        try:
            raw = fetch_json(
                f'https://api.boosty.to/v1/blog/{BLOG_NAME}/bundle/{bundle_id}/post/?limit=100',
                is_boosty=True
            )
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
                            pid = str(p['id']).strip()
                            matched_map[pid] = posts_by_id.get(pid, p)
        except Exception:
            pass

    if claimed_post_ids is not None:
        for pid in matched_map:
            claimed_post_ids.add(pid)

    result_posts = list(matched_map.values())
    result_posts.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)

    if result_posts and not direct_latest_post_id and result_posts[0].get('id'):
        direct_latest_post_id = str(result_posts[0]['id']).strip()

    return result_posts, direct_latest_post_id


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
                if (isinstance(t, dict) and str(t.get('id')) == tag_id_str) or str(t) == tag_id_str:
                    has_tag = True
                    break
        if has_tag or is_exact_title_match(norm_tag_title, aliases, p):
            matched[str(pid)] = p

    res = list(matched.values())
    res.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    direct_latest_id = str(res[0]['id']).strip() if res and res[0].get('id') else ""
    return res, direct_latest_id


def analyze_posts_stats(posts_list, fallback_ts, eng_metric_tag=""):
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

    all_posts_clean = []
    free_posts_clean = []
    paid_posts_count = 0

    if not posts_list:
        return {
            "level": detected_level, "max_ch": 0, "free_ch": 0, "free_text": "",
            "latest_range": "", "oldest_ts": fallback_ts, "started_1": False,
            "best_latest_id": "", "best_free_id": "", "free_posts": [], "all_posts": [],
            "paid_posts_count": 0, "free_posts_count": 0,
            "week_range": "", "week_posts_count": 0, "week_post_image": "", "week_post_link": ""
        }

    paid_levels = []
    for mp in posts_list:
        ti = detect_post_tier_strict(mp)
        if not ti["is_free"]:
            paid_levels.append(ti["level"])
            paid_posts_count += 1
    detected_level = 2 if 2 in paid_levels else 1

    oldest_ts = posts_list[-1].get('publishTime') or posts_list[-1].get('createdAt') or fallback_ts
    if posts_list[0].get('id'):
        best_latest_post_id = str(posts_list[0]['id']).strip()

    seen_ids = set()
    now_ts = int(time.time())
    seven_days_ago = now_ts - 7 * 86400
    week_starts = []
    week_ends = []
    week_posts_count = 0
    week_post_image = ""
    week_post_link = ""

    for idx, mp in enumerate(posts_list, 1):
        mp_id = str(mp.get('id') or '').strip()
        if not mp_id or mp_id in seen_ids:
            continue
        seen_ids.add(mp_id)

        t_info = detect_post_tier_strict(mp)
        mp_ts = int(mp.get('publishTime') or mp.get('createdAt') or fallback_ts)

        # Собираем все диапазоны глав из всех видео/блоков внутри одного поста
        all_ranges_in_post = []
        for line in extract_post_titles_strict(mp):
            all_ranges_in_post.extend(extract_all_chapter_ranges(line))

        cur_range = ""
        cur_start = 0
        cur_end = 0
        if all_ranges_in_post:
            starts = [r[1] for r in all_ranges_in_post if r[1] > 0]
            ends = [r[2] for r in all_ranges_in_post if r[2] > 0]
            if starts and ends:
                s_min, e_max = min(starts), max(ends)
                if e_max - s_min < 400:
                    cur_start, cur_end = s_min, e_max
                    cur_range = f"{s_min}-{e_max} гл." if s_min != e_max else f"{e_max} гл."
                else:
                    best = max(all_ranges_in_post, key=lambda x: (x[2], x[2] - x[1]))
                    cur_range, cur_start, cur_end = best

        if cur_start == 1 and cur_end > 0:
            has_1_to_n_start = True
        if idx == 1 and cur_end > 0:
            latest_range_label = cur_range
        if cur_end > max_chapter_found:
            max_chapter_found = cur_end
            best_latest_post_id = mp_id
            if not latest_range_label:
                latest_range_label = cur_range

        post_raw_title = str(mp.get('title') or '').strip()
        range_label = cur_range or (post_raw_title[:48] if post_raw_title else f"Выпуск #{idx}")
        direct_url = build_clean_utm_url(f"https://boosty.to/{BLOG_NAME}/posts/{mp_id}", eng_metric_tag or "post")
        post_img = extract_high_res_cover_from_post(mp)
        date_str = datetime.datetime.fromtimestamp(mp_ts).strftime("%d.%m.%Y")

        if mp_ts >= seven_days_ago:
            week_posts_count += 1
            if cur_start > 0:
                week_starts.append(cur_start)
            if cur_end > 0:
                week_ends.append(cur_end)
            if not week_post_image and post_img:
                week_post_image = post_img
            if not week_post_link:
                week_post_link = direct_url

        post_entry = {
            "post_id": mp_id,
            "title": post_raw_title or range_label,
            "range": range_label,
            "start_ch": cur_start if cur_start > 0 else 99999,
            "end_ch": cur_end,
            "is_free": t_info["is_free"],
            "tier_level": t_info["level"],
            "ts": mp_ts,
            "date": date_str,
            "image": post_img,
            "link": direct_url
        }
        all_posts_clean.append(post_entry)

        if t_info["is_free"]:
            if not best_free_post_id:
                best_free_post_id = mp_id
            free_posts_clean.append({
                "post_id": mp_id,
                "title": post_entry["title"],
                "range": range_label,
                "start_ch": post_entry["start_ch"],
                "end_ch": cur_end,
                "date": date_str,
                "link": direct_url
            })
            if cur_end > 0 and cur_start > 0 and (cur_end - cur_start) < 500:
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

    all_posts_clean.sort(key=lambda x: (x["start_ch"], x["end_ch"], x["ts"]))
    for fp in all_posts_clean:
        if fp["start_ch"] == 99999:
            fp["start_ch"] = 0

    free_posts_clean.sort(key=lambda x: (x["start_ch"], x["end_ch"]))
    free_posts_out = [
        {"post_id": fp["post_id"], "title": fp["title"], "range": fp["range"], "date": fp["date"], "link": fp["link"]}
        for fp in free_posts_clean
    ]

    free_chapters_count = len(free_chapters_set)
    if free_chapters_count == 0 and free_posts_out:
        free_chapters_count = len(free_posts_out)

    free_range_text = ""
    if free_chapters_count > 0:
        if min_free_start == 1 and max_free_end > 0:
            free_range_text = f"1-{max_free_end} гл. бесплатно"
        else:
            free_range_text = f"{free_chapters_count} гл. бесплатно"

    week_range = ""
    if week_starts and week_ends:
        w_min, w_max = min(week_starts), max(week_ends)
        week_range = f"{w_min}-{w_max} гл." if w_min != w_max else f"{w_max} гл."
    elif week_posts_count > 0:
        week_range = latest_range_label or "Свежий выпуск"

    return {
        "level": detected_level,
        "max_ch": max_chapter_found,
        "free_ch": free_chapters_count,
        "free_text": free_range_text,
        "latest_range": latest_range_label,
        "oldest_ts": oldest_ts or fallback_ts,
        "started_1": has_1_to_n_start,
        "best_latest_id": best_latest_post_id,
        "best_free_id": best_free_post_id,
        "free_posts": free_posts_out,
        "all_posts": all_posts_clean,
        "paid_posts_count": paid_posts_count,
        "free_posts_count": len(free_posts_out),
        "week_range": week_range,
        "week_posts_count": week_posts_count,
        "week_post_image": week_post_image,
        "week_post_link": week_post_link
    }


def process_data(extra_cfg, overrides_dict, special_cfg):
    bundles_list = get_all_bundles()
    if not bundles_list:
        return [], {}

    prev_items_map, previous_votes, previous_searches, months_archive = load_previous_catalog_and_votes()
    all_blog_posts = get_all_blog_posts()
    posts_by_id = {str(p.get('id')).strip(): p for p in all_blog_posts if isinstance(p, dict) and p.get('id')}
    global_first_post_id = all_blog_posts[0].get('id') if all_blog_posts else None

    bundles_sorted = sorted(
        [b for b in bundles_list if isinstance(b, dict)],
        key=lambda b: len(clean_bundle_title(b.get('title', ''))),
        reverse=True
    )
    claimed_post_ids = set()

    result = []

    for item in bundles_sorted:
        bundle_id = str(item.get('id', '')).strip()
        if not bundle_id:
            continue

        prev_item = prev_items_map.get(bundle_id, {})
        raw_title = item.get('title', 'Без названия')
        clean_title = clean_bundle_title(raw_title)
        eng_metric_tag = make_clean_english_utm_tag(clean_title, bundle_id)

        prev_img = prev_item.get('remote_image') or prev_item.get('image') or ''
        if 'via.placeholder.com' in prev_img:
            prev_img = ''
        remote_cover = prev_img
        thumb = item.get('thumbnail')
        if isinstance(thumb, dict) and thumb.get('url'):
            remote_cover = clean_image_url(thumb['url'])
        cover = cache_cover_image(remote_cover, bundle_id)

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

        matched_posts, direct_bundle_post_id = match_posts_for_bundle(
            item, all_blog_posts, posts_by_id, global_first_post_id, claimed_post_ids
        )
        created_ts = item.get('createdAt') or item.get('publishedAt') or int(time.time())
        updated_ts = item.get('publishedAt') or item.get('updatedAt') or created_ts
        feed_link = f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed"

        stats_a = analyze_posts_stats(matched_posts, created_ts, eng_metric_tag)
        detected_level = stats_a["level"]
        if not matched_posts and prev_item.get('tier_level') == 2:
            detected_level = 2

        latest_post_id = (
            (matched_posts[0].get('id') if matched_posts and matched_posts[0].get('id') else '')
            or direct_bundle_post_id
            or stats_a["best_latest_id"]
            or str(prev_item.get('latest_post_id') or '').strip()
        )
        free_post_id = stats_a["best_free_id"] or str(prev_item.get('free_post_id') or '').strip()
        free_posts_list = stats_a["free_posts"] or (prev_item.get('free_posts') if isinstance(prev_item.get('free_posts'), list) else [])
        all_posts_list = stats_a["all_posts"] or (prev_item.get('all_posts') if isinstance(prev_item.get('all_posts'), list) else [])

        if matched_posts:
            latest_ts = matched_posts[0].get('publishTime') or matched_posts[0].get('createdAt')
            if latest_ts:
                updated_ts = latest_ts
            if stats_a["oldest_ts"] < created_ts:
                created_ts = stats_a["oldest_ts"]

        total_chapters = max(b_end, stats_a["max_ch"], int(prev_item.get('chapters') or 0))
        free_chapters = stats_a["free_ch"] if stats_a["all_posts"] else int(prev_item.get('free_chapters') or 0)
        if total_chapters > 0:
            free_chapters = min(free_chapters, total_chapters)
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0 or len(free_posts_list) > 0

        free_text = stats_a["free_text"]
        if has_free and not free_text:
            free_text = f"1-{free_chapters} гл. бесплатно" if free_chapters > 0 else "Есть бесплатные главы"

        latest_range_str = stats_a["latest_range"] or b_range or prev_item.get('latest_range') or (f"1-{total_chapters} гл." if total_chapters > 0 else "Новые главы")

        real_posts_count = len(all_posts_list) if all_posts_list else int(item.get('publishedPostsCounter') or 1)
        real_free_posts_count = stats_a["free_posts_count"] if all_posts_list else len(free_posts_list)
        real_paid_posts_count = max(0, real_posts_count - real_free_posts_count)

        tier_name = "Основной уровень 2 ур. 500 ₽" if detected_level == 2 else "Базовый уровень 1 ур. 250 ₽"
        sub_link = SUB_LINKS[2] if detected_level == 2 else SUB_LINKS[1]
        votes_count, monthly_searches_count = fetch_current_votes_and_searches_for_id(
            bundle_id, previous_votes.get(bundle_id, 0), previous_searches.get(bundle_id, 0)
        )

        all_post_tags = []
        for mp in matched_posts[:6]:
            all_post_tags.extend(extract_post_tag_names(mp))

        genres, content_type, internet_chapters = detect_genres_type_and_internet_chapters(
            clean_title, overrides_dict, all_post_tags,
            extra_text=str(item.get('description', '')),
            prev_item=prev_item, voiced_chapters=total_chapters
        )
        special_flags = resolve_special_flags(clean_title, special_cfg)

        raw_latest_post_url = f"https://boosty.to/{BLOG_NAME}/posts/{latest_post_id}" if latest_post_id else feed_link
        raw_free_post_url = (
            f"https://boosty.to/{BLOG_NAME}/posts/{free_post_id}"
            if free_post_id else (f"{feed_link}&onlyAllowed=true" if has_free else feed_link)
        )
        week_img = cache_cover_image(stats_a["week_post_image"], f"{bundle_id}_wk") if stats_a["week_post_image"] else cover

        result.append({
            "id": bundle_id,
            "metric_tag": eng_metric_tag,
            "utm_campaign": eng_metric_tag,
            "vote_key": make_ascii_vote_key(bundle_id),
            "title": clean_title,
            "image": cover,
            "remote_image": remote_cover,
            "content_type": content_type,
            "is_frozen": special_flags["is_frozen"],
            "is_romance": special_flags["is_romance"],
            "is_completed": special_flags["is_completed"],
            "hidden_tags": special_flags["hidden_tags"],
            "chapters": total_chapters,
            "internet_chapters": max(internet_chapters, total_chapters),
            "free_chapters": free_chapters,
            "paid_chapters": paid_chapters,
            "posts_count": real_posts_count,
            "free_posts_count": real_free_posts_count,
            "paid_posts_count": real_paid_posts_count,
            "latest_range": latest_range_str,
            "week_range": stats_a["week_range"] or latest_range_str,
            "week_posts_count": stats_a["week_posts_count"],
            "week_post_image": week_img or cover,
            "week_post_link": stats_a["week_post_link"] or build_clean_utm_url(raw_latest_post_url, eng_metric_tag),
            "has_free": has_free,
            "free_text": free_text,
            "free_posts": free_posts_list,
            "all_posts": all_posts_list,
            "genres": genres,
            "last_update": datetime.datetime.fromtimestamp(updated_ts).strftime("%d/%m/%Y"),
            "timestamp": updated_ts,
            "created_ts": created_ts,
            "is_1_to_n": bool(b_start == 1 or stats_a["started_1"]),
            "tier": tier_name,
            "tier_level": detected_level,
            "latest_post_id": latest_post_id,
            "latest_post_link": build_clean_utm_url(raw_latest_post_url, eng_metric_tag),
            "free_post_id": free_post_id,
            "free_post_link": build_clean_utm_url(raw_free_post_url, eng_metric_tag),
            "sub_link": build_clean_utm_url(sub_link, eng_metric_tag),
            "link": build_clean_utm_url(feed_link, eng_metric_tag),
            "votes": votes_count,
            "monthly_searches": monthly_searches_count
        })

    for custom in extra_cfg.get("custom_tags", []):
        tag_id = str(custom.get("tag_id", "")).strip()
        custom_id = str(custom.get("id", f"tag_{tag_id}"))
        prev_item = prev_items_map.get(custom_id, {})
        c_title = clean_bundle_title(custom.get("title", "Без названия"))
        c_link = custom.get("link") or f"https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id}"
        prev_img = prev_item.get("remote_image") or prev_item.get("image", "")
        if 'via.placeholder.com' in prev_img:
            prev_img = ""
        remote_cover = clean_image_url(custom.get("image", "").strip()) or prev_img
        eng_metric_tag = make_clean_english_utm_tag(c_title, custom_id)

        tag_posts, direct_tag_post_id = fetch_isolated_tag_posts(tag_id, c_title, all_blog_posts) if tag_id else ([], "")
        now_ts = int(time.time())
        stats_a = analyze_posts_stats(tag_posts, now_ts, eng_metric_tag)

        updated_ts = prev_item.get('timestamp') or now_ts
        latest_post_id = (
            (tag_posts[0].get('id') if tag_posts and tag_posts[0].get('id') else '')
            or direct_tag_post_id
            or stats_a["best_latest_id"]
            or str(prev_item.get('latest_post_id') or '').strip()
        )
        free_post_id = stats_a["best_free_id"] or str(prev_item.get('free_post_id') or '').strip()
        free_posts_list = stats_a["free_posts"] or (prev_item.get('free_posts') if isinstance(prev_item.get('free_posts'), list) else [])
        all_posts_list = stats_a["all_posts"] or (prev_item.get('all_posts') if isinstance(prev_item.get('all_posts'), list) else [])

        if tag_posts:
            updated_ts = tag_posts[0].get('publishTime') or tag_posts[0].get('createdAt') or now_ts
            if not remote_cover:
                for cp in tag_posts:
                    img_c = extract_high_res_cover_from_post(cp)
                    if img_c:
                        remote_cover = img_c
                        break
        c_image = cache_cover_image(remote_cover, custom_id)

        total_chapters = max(stats_a["max_ch"], int(custom.get("chapters") or 0), int(prev_item.get('chapters') or 0))
        free_chapters = min(stats_a["free_ch"], total_chapters) if total_chapters > 0 else stats_a["free_ch"]
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0 or len(free_posts_list) > 0

        real_posts_count = len(all_posts_list) if all_posts_list else 1
        real_free_posts_count = stats_a["free_posts_count"] if all_posts_list else len(free_posts_list)
        real_paid_posts_count = max(0, real_posts_count - real_free_posts_count)

        votes_count, monthly_searches_count = fetch_current_votes_and_searches_for_id(
            custom_id, previous_votes.get(custom_id, 0), previous_searches.get(custom_id, 0)
        )
        genres, content_type, internet_chapters = detect_genres_type_and_internet_chapters(
            c_title, overrides_dict, prev_item=prev_item, voiced_chapters=total_chapters
        )
        special_flags = resolve_special_flags(c_title, special_cfg)

        raw_latest_post_url = f"https://boosty.to/{BLOG_NAME}/posts/{latest_post_id}" if latest_post_id else c_link
        raw_free_post_url = (
            f"https://boosty.to/{BLOG_NAME}/posts/{free_post_id}"
            if free_post_id else (f"{c_link}&onlyAllowed=true" if has_free else c_link)
        )
        week_img = cache_cover_image(stats_a["week_post_image"], f"{custom_id}_wk") if stats_a["week_post_image"] else c_image

        result.append({
            "id": custom_id,
            "metric_tag": eng_metric_tag,
            "utm_campaign": eng_metric_tag,
            "vote_key": make_ascii_vote_key(custom_id),
            "title": c_title,
            "image": c_image,
            "remote_image": remote_cover,
            "content_type": content_type,
            "is_frozen": special_flags["is_frozen"],
            "is_romance": special_flags["is_romance"],
            "is_completed": special_flags["is_completed"],
            "hidden_tags": special_flags["hidden_tags"],
            "chapters": total_chapters,
            "internet_chapters": max(internet_chapters, total_chapters),
            "free_chapters": free_chapters,
            "paid_chapters": paid_chapters,
            "posts_count": real_posts_count,
            "free_posts_count": real_free_posts_count,
            "paid_posts_count": real_paid_posts_count,
            "latest_range": stats_a["latest_range"] or (f"1-{total_chapters} гл." if total_chapters > 0 else "Все главы"),
            "week_range": stats_a["week_range"] or stats_a["latest_range"] or "Свежий выпуск",
            "week_posts_count": stats_a["week_posts_count"],
            "week_post_image": week_img or c_image,
            "week_post_link": stats_a["week_post_link"] or build_clean_utm_url(raw_latest_post_url, eng_metric_tag),
            "has_free": has_free,
            "free_text": stats_a["free_text"],
            "free_posts": free_posts_list,
            "all_posts": all_posts_list,
            "genres": genres,
            "last_update": datetime.datetime.fromtimestamp(updated_ts).strftime("%d/%m/%Y"),
            "timestamp": updated_ts,
            "created_ts": stats_a["oldest_ts"],
            "is_1_to_n": bool(stats_a["started_1"]),
            "tier": "Основной уровень 2 ур. 500 ₽",
            "tier_level": 2,
            "latest_post_id": latest_post_id,
            "latest_post_link": build_clean_utm_url(raw_latest_post_url, eng_metric_tag),
            "free_post_id": free_post_id,
            "free_post_link": build_clean_utm_url(raw_free_post_url, eng_metric_tag),
            "sub_link": build_clean_utm_url(SUB_LINKS[2], eng_metric_tag),
            "link": build_clean_utm_url(c_link, eng_metric_tag),
            "votes": votes_count,
            "monthly_searches": monthly_searches_count
        })

    return result, months_archive


if __name__ == '__main__':
    extra_cfg = load_extra_config()
    overrides_dict = load_type_overrides()
    special_cfg = load_special_titles()

    data, months_archive = process_data(extra_cfg, overrides_dict, special_cfg)
    save_type_overrides(overrides_dict)

    if data and len(data) > 5:
        stats_data = get_blog_stats_and_goals(data)
        with open('stats.json', 'w', encoding='utf-8') as f:
            json.dump(stats_data, f, ensure_ascii=False, indent=2)
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        save_votes_json_file(data, months_archive)
        update_missing_searches_file(data)
        print(f"Успешно обновлено {len(data)} тайтлов. ТГ-постов: {len(stats_data.get('tg_news', []))}, YouTube: {len(stats_data.get('yt_videos', []))}.")
    else:
        cached_catalog = []
        if os.path.exists('data.json'):
            try:
                with open('data.json', 'r', encoding='utf-8') as f:
                    cached_catalog = json.load(f)
            except Exception:
                cached_catalog = []
        stats_data = get_blog_stats_and_goals(cached_catalog)
        with open('stats.json', 'w', encoding='utf-8') as f:
            json.dump(stats_data, f, ensure_ascii=False, indent=2)
        update_missing_searches_file(cached_catalog)
        print("Использован кэш data.json и votes.json; обновлены stats.json и missing_searches.json (Fallback).")
