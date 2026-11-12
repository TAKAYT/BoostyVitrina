import urllib.request
import urllib.parse
import json
import re
import datetime
import time
import os

BLOG_NAME = 'darktaka'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
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

# Группы синонимов и альтернативных названий тайтлов
TITLE_SYNONYM_GROUPS = [
    ["некромант я катастрофа", "ням", "ням (некромант)", "ням некромант", "катастрофический некромант"],
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
    ["от гоблина к богу гоблинов", "к богу гоблинов", "от гоблина до бога гоблинов"],
    ["реинкарнация в начало апокалипсиса", "в начало до зомби апокалипсиса", "в начало до зомби-апокалипсиса"],
    ["я стал графским ублюдком", "я стал ублюдком сильнейшего графства", "отброс графской семьи"],
    ["прокачка в аду", "прокачка в аду в одиночку"],
    ["повелитель насекомых", "король насекомых"],
    ["цивилизация мудрецов", "деревня под наблюдением бога"],
    ["некромант катастрофа решил уйти на пенсию", "некромант-катастрофа решил уйти на пенсию"],
    ["перерождение демонического культиватора", "перерождение демонического культиватора в мире зомби"],
    ["призыватель sss ранга", "призыватель 3s ранга"]
]

# Таблица транслитерации в чистый английский (ASCII) без префиксов и без источников
CYR_TO_LAT = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
}

# Жёстко выверенная база по оригинальным платформам (Naver/Kakao/Webtoon -> manhwa, Kuaikan/Bilibili/Qidian -> manhua, JP -> manga)
# Издатели НЕ выводятся в интерфейс, используются только для 100% точного определения типа (manhwa / manhua / manga) и тегов.
CURATED_ORIGIN_AND_TAGS = {
    "некромант я катастрофа": {"type": "manhua", "tags": ["некромантия", "система", "имба"]},
    "паладин sss ранга": {"type": "manhwa", "tags": ["система", "фэнтези", "имба"]},
    "всеобщий отбор укротитель драконов в самом деле самый слабый класс": {"type": "manhua", "tags": ["драконы", "призыв", "система"]},
    "некромант максимального уровня": {"type": "manhwa", "tags": ["некромантия", "система", "имба"]},
    "мастер древних божественных орудий": {"type": "manhua", "tags": ["артефакты", "культивация", "перерождение"]},
    "я перевоплотился в могущественного дракона для сокрушения мира": {"type": "manhua", "tags": ["драконы", "перерождение", "месть"]},
    "я проснулся имбой после 100 лет afk": {"type": "manhua", "tags": ["имба", "система", "культивация"]},
    "начало после конца": {"type": "manhwa", "tags": ["перерождение", "фэнтези", "имба"]},
    "от гоблина к богу гоблинов": {"type": "manhua", "tags": ["перерождение", "призыв", "система"]},
    "реинкарнация в начало апокалипсиса": {"type": "manhua", "tags": ["апокалипсис", "регрессия", "система"]},
    "я стал графским ублюдком": {"type": "manhwa", "tags": ["перерождение", "фэнтези"]},
    "прокачка в аду": {"type": "manhwa", "tags": ["система", "подземелья", "имба"]},
    "повелитель насекомых": {"type": "manhua", "tags": ["призыв", "перерождение", "апокалипсис"]},
    "цивилизация мудрецов": {"type": "manhwa", "tags": ["фэнтези", "демоны"]},
    "некромант катастрофа решил уйти на пенсию": {"type": "manhwa", "tags": ["некромантия", "имба", "фэнтези"]},
    "перерождение демонического культиватора": {"type": "manhua", "tags": ["культивация", "апокалипсис", "перерождение"]},
    "призыватель sss ранга": {"type": "manhua", "tags": ["призыв", "система", "имба"]},
    "я прокачиваюсь во сне убивая монстров": {"type": "manhua", "tags": ["система", "призыв", "имба"]},
    "судный день я король вирусов": {"type": "manhua", "tags": ["апокалипсис", "имба", "система"]},
    "великий расхититель гробниц": {"type": "manhwa", "tags": ["подземелья", "артефакты", "регрессия"]},
    "эволюция дерева": {"type": "manhua", "tags": ["перерождение", "призыв", "система"]},
    "я стал деревом": {"type": "manhua", "tags": ["перерождение", "призыв"]},
    "глобальная заморозка": {"type": "manhua", "tags": ["апокалипсис", "регрессия", "месть"]},
    "ледниковый период": {"type": "manhua", "tags": ["апокалипсис", "регрессия"]},
    "я коплю припасы в судный день": {"type": "manhua", "tags": ["апокалипсис", "система"]},
    "таинственный злодей": {"type": "manhua", "tags": ["система", "культивация", "имба"]},
    "я злой бог": {"type": "manhua", "tags": ["система", "культивация", "демоны"]},
    "демонический император": {"type": "manhua", "tags": ["культивация", "перерождение", "месть"]}
}

# Сигнатуры оригинальных платформ (внутренний фильтр для жёсткого определения страны происхождения, в UI НЕ выводится)
ORIGINAL_PLATFORM_SIGNATURES = {
    "manhwa": [
        "kakao", "kakaopage", "page.kakao", "naver", "comic.naver", "series.naver",
        "webtoon", "line webtoon", "ridibooks", "ridi", "lezhin", "bomtoon", "mrblue", "toomics", "корея", "южная корея", "manhwa", "манхва"
    ],
    "manhua": [
        "kuaikan", "kuaikanmanhua", "bilibili", "manga.bilibili", "ac.qq", "tencent",
        "qidian", "iqiyi", "manhuatai", "kanman", "dongman", "weibo", "китай", "manhua", "маньхуа"
    ],
    "manga": [
        "shonen jump", "jump+", "syosetu", "comicwalker", "kadokawa", "kodansha",
        "shogakukan", "square enix", "alphapolis", "bookwalker", "magazine pocket", "япония", "manga", "манга"
    ]
}

# Маппинг русских и английских жанров/тегов в 14 чистых тегов нашего каталога
RU_SITE_TAG_MAPPING = {
    "некромантия": "некромантия",
    "некромант": "некромантия",
    "нежить": "некромантия",
    "necromancer": "некромантия",
    "система": "система",
    "игровые элементы": "система",
    "литрпг": "система",
    "прокачка": "система",
    "рост уровня": "система",
    "system": "система",
    "leveling": "система",
    "скрытые способности": "имба",
    "имба": "имба",
    "сильный гг": "имба",
    "могущественный гг": "имба",
    "непобедимый гг": "имба",
    "герой-одиночка": "имба",
    "умный гг": "имба",
    "overpowered": "имба",
    "регрессия": "регрессия",
    "возвращение в прошлое": "регрессия",
    "путешествие во времени": "регрессия",
    "петля времени": "регрессия",
    "regression": "регрессия",
    "time travel": "регрессия",
    "реинкарнация": "перерождение",
    "перерождение": "перерождение",
    "исекай": "перерождение",
    "попаданец": "перерождение",
    "попадание в другой мир": "перерождение",
    "перемещение в другой мир": "перерождение",
    "reincarnation": "перерождение",
    "isekai": "перерождение",
    "подземелья": "подземелья",
    "данжи": "подземелья",
    "башня": "подземелья",
    "охотники": "подземелья",
    "врата": "подземелья",
    "dungeon": "подземелья",
    "драконы": "драконы",
    "дракон": "драконы",
    "dragons": "драконы",
    "призыв": "призыв",
    "призыватель": "призыв",
    "питомцы": "призыв",
    "укрощение": "призыв",
    "монстры": "призыв",
    "звери": "призыв",
    "гоблины": "призыв",
    "summoning": "призыв",
    "monsters": "призыв",
    "апокалипсис": "апокалипсис",
    "постапокалипсис": "апокалипсис",
    "зомби": "апокалипсис",
    "выживание": "апокалипсис",
    "apocalypse": "апокалипсис",
    "post-apocalyptic": "апокалипсис",
    "zombies": "апокалипсис",
    "survival": "апокалипсис",
    "культивация": "культивация",
    "боевые искусства": "культивация",
    "мурим": "культивация",
    "сянься": "культивация",
    "уся": "культивация",
    "дао": "культивация",
    "cultivation": "культивация",
    "martial arts": "культивация",
    "wuxia": "культивация",
    "xianxia": "культивация",
    "демоны": "демоны",
    "боги": "демоны",
    "ангелы и демоны": "демоны",
    "demons": "демоны",
    "gods": "демоны",
    "месть": "месть",
    "антигерой": "месть",
    "жестокий мир": "месть",
    "revenge": "месть",
    "anti-hero": "месть",
    "артефакты": "артефакты",
    "алхимия": "артефакты",
    "кузнечное дело": "артефакты",
    "фэнтези": "фэнтези",
    "магия": "фэнтези",
    "рыцари": "фэнтези",
    "эльфы": "фэнтези",
    "средневековье": "фэнтези",
    "аристократия": "фэнтези",
    "fantasy": "фэнтези",
    "magic": "фэнтези"
}

# Строгие регулярные выражения для 14 одиночных жанровых тегов по границам слов
STRICT_SINGLE_TAG_PATTERNS = [
    ("некромантия", re.compile(r'(?:^|[^а-яa-z0-9])(некромант[а-я]*|скелет[а-я]*|нежит[а-я]*|мертвец[а-я]*|лич(?:а|ем|и|ей)?|кладбищ[а-я]*|кост(?:ей|и|яной))(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("система", re.compile(r'(?:^|[^а-яa-z0-9])(систем[а-я]*|уров(?:ень|ня|ней|нем)|лвл|lvl|sss|3s|s-ранг[а-я]*|f-ранг[а-я]*|ранг(?:а|ов|у)?|квест[а-я]*|прокачк[а-я]*|прокачива[а-я]*|игрок[а-я]*|навык[а-я]*|талант[а-я]*|очков|статус[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("имба", re.compile(r'(?:^|[^а-яa-z0-9])(имб[а-я]*|сильнейш[а-я]*|максимальн[а-я]*|непобедим[а-я]*|всемогущ[а-я]*|абсолютн[а-я]*|100\s*лет|катастроф[а-я]*|божественн[а-я]*|верховн[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("регрессия", re.compile(r'(?:^|[^а-яa-z0-9])(регресс[а-я]*|вернул[а-я]*\s+в\s+прошл[а-я]*|в\s+начало\s+до|заново|спустя\s+\d+\s+лет|в\s+прошлое)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("перерождение", re.compile(r'(?:^|[^а-яa-z0-9])(перерожд[а-я]*|реинкарнац[а-я]*|перевопло[а-я]*|начало\s+после\s+конца|стал\s+графским|стал\s+ублюдком|исекай|в\s+другом\s+мире|стал\s+злодеем|стал\s+деревом|переселен[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("подземелья", re.compile(r'(?:^|[^а-яa-z0-9])(подземел[а-я]*|данж[а-я]*|башн[а-я]*|врат(?:а|ах)|охотник[а-я]*|рейд[а-я]*|гробниц[а-я]*|расхитител[а-я]*|лабиринт[а-я]*|прокачка\s+в\s+аду|бездн[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("драконы", re.compile(r'(?:^|[^а-яa-z0-9])(дракон[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("призыв", re.compile(r'(?:^|[^а-яa-z0-9])(призыв[а-я]*|укротител[а-я]*|питом[а-я]*|звер[а-я]*|насеком[а-я]*|гоблин[а-я]*|фамильяр[а-я]*|монстр[а-я]*|рой|роя|эволюци[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("апокалипсис", re.compile(r'(?:^|[^а-яa-z0-9])(апокалипсис[а-я]*|зомби|вирус[а-я]*|судный\s+день|выживан[а-я]*|конец\s+света|мутант[а-я]*|заморозк[а-я]*|ледников[а-я]*|убежищ[а-я]*|припас[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("культивация", re.compile(r'(?:^|[^а-яa-z0-9])(культиват[а-я]*|дао|бессмертн[а-я]*|боевых\s+искусств|мурим[а-я]*|сект[а-я]*|предок|император[а-я]*|небесн[а-я]*|континент[а-я]*|пик\s+боевых)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("демоны", re.compile(r'(?:^|[^а-яa-z0-9])(демон[а-я]*|дьявол[а-я]*|падш[а-я]*|бог[а-я]*\s+гоблин[а-я]*|под\s+наблюдением\s+бога|злой\s+бог|божеств[а-я]*|асур[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("месть", re.compile(r'(?:^|[^а-яa-z0-9])(мест(?:ь|и|ью)|предател[а-я]*|сокрушен[а-я]*\s+мира|расплат[а-я]*|злоде[а-я]*|ублюд[а-я]*|отброс[а-я]*|убийц[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("артефакты", re.compile(r'(?:^|[^а-яa-z0-9])(оруди[а-я]*|артефакт[а-я]*|кузнец[а-я]*|алхим[а-я]*|сокровищ[а-я]*|транжир[а-я]*|меч[а-я]*|клинок|клинка)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("фэнтези", re.compile(r'(?:^|[^а-яa-z0-9])(маги[а-я]*|архимаг[а-я]*|маг(?:а|у|ом|и)?|академи[а-я]*|рыцар[а-я]*|паладин[а-я]*|эльф[а-я]*|графств[а-я]*|графск[а-я]*|герцог[а-я]*|принц[а-я]*|королев[а-я]*|мудрец[а-я]*|геро[а-я]*)(?=$|[^а-яa-z0-9])', re.IGNORECASE))
]

# Жёсткие морфологические маркеры китайской Маньхуа (Bilibili/Kuaikan/Qidian) и японской Манги (Syosetu/Jump)
STRICT_MANHUA_REGEX = re.compile(
    r'(?:^|[^а-яa-z0-9])(культиват[а-я]*|дао|бессмертн[а-я]*|боевых\s+искусств|сект[а-я]*|божественн[а-я]*\s+оруди[а-я]*|100\s*лет\s*(?:афк|afk)|в\s+мире\s+зомби|король\s+вирусов|судный\s+день|повелитель\s+насекомых|к\s+богу\s+гоблинов|от\s+гоблина|укротитель\s+драконов|всеобщий\s+отбор|сокрушен[а-я]*\s+мира|в\s+начало\s+до\s+зомби|реинкарнация\s+в\s+начало\s+апокалипсиса|во\s+сне\s+убивая\s+монстров|призыватель\s+sss|призыватель\s+3s|некромант\s+я\s+катастрофа|ням|заморозк[а-я]*|припас[а-я]*|эволюци[а-я]*\s+дерев[а-я]*|злой\s+бог|сто\s+тысяч\s+лет|предок|тянь|сяо|линь|чэнь|фэн|шэнь)(?=$|[^а-яa-z0-9])',
    re.IGNORECASE
)

STRICT_MANGA_REGEX = re.compile(
    r'(?:^|[^а-яa-z0-9])(в\s+другом\s+мире\s+со\s+смартфоном|о\s+моем\s+перерождении\s+в\s+слизь|восхождение\s+в\s+тени|повелитель\s+оверлорд|реинкарнация\s+безработного|убийца\s+гоблинов|берсерк|ванпанчмен|магическая\s+битва|человек\s+бензопила|черный\s+клевер|авантюрист[а-я]*\s+s-ранга|изгнанн[а-я]*\s+из\s+отряда\s+героя|герой\s+щита)(?=$|[^а-яa-z0-9])',
    re.IGNORECASE
)

CANDIDATE_MISSING_TITLES = [
    "Поднятие уровня в одиночку",
    "Башня Бога",
    "Всеведущий читатель",
    "Точка зрения всеведущего читателя",
    "Ошибка Эхо",
    "Легенда о Северном Клинке",
    "Наномашины",
    "Возвращение героя класса катастрофы",
    "Прирожденный наемник",
    "Лукизм",
    "Милый дом",
    "Ублюдок FFF-ранга",
    "Игрок который вернулся спустя 10000 лет",
    "Меч императора",
    "Звездный предок",
    "Пик боевых искусств",
    "Сказания о демонах и богах",
    "Боевой континент",
    "Расколотая битвой синева небес",
    "Восставший против неба",
    "Аватар короля",
    "Маг на полную ставку",
    "Вершина боевых искусств",
    "Квест превосходства",
    "Борьба в прямом эфире",
    "Как драться",
    "Менеджер Ким",
    "Скелет который не смог защитить подземелье",
    "Пожиратель талантов",
    "Охотник S-класса",
    "Мои S-классы которые я воспитал",
    "Убийца гоблинов",
    "Ванпанчмен",
    "Магическая битва",
    "Человек-бензопила",
    "Берсерк",
    "Король шаманов",
    "Черный клевер"
]


def fetch_json(url, timeout=20, extra_headers=None, post_data=None):
    hdrs = dict(HEADERS)
    if extra_headers:
        hdrs.update(extra_headers)
    data_bytes = None
    if post_data is not None:
        data_bytes = json.dumps(post_data).encode('utf-8')
        hdrs['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data_bytes, headers=hdrs)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode('utf-8', errors='ignore'))


def fetch_html(url, timeout=18):
    req = urllib.request.Request(url, headers=HEADERS)
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
    s = s.lower().replace('ё', 'е')
    s = re.sub(r'\[\s*\d+\s*[-—–]\s*\d+[^\]]*\]', ' ', s)
    s = re.sub(r'\b(?:глав[аы]?|гл\.?|часть|сезон|все\s*главы)\b', ' ', s)
    s = re.sub(r'\b\d+\s*[-—–]\s*\d+\b', ' ', s)
    s = re.sub(r'[^a-zа-я0-9\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def resolve_canonical_title(title_str):
    norm_t = normalize_for_match(title_str)
    if not norm_t:
        return str(title_str or 'title').lower().strip()
    for group in TITLE_SYNONYM_GROUPS:
        norm_group = [normalize_for_match(x) for x in group if x]
        if norm_t in norm_group:
            return group[0]
        for syn in norm_group:
            if len(syn) > 5 and (norm_t.startswith(syn) or syn.startswith(norm_t)):
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


def classify_origin_from_platform_text(raw_text):
    """
    Определяет строгий тип (manhwa / manhua / manga) по упоминанию оригинальных платформ
    (Kakao, Naver, Webtoon -> manhwa; Kuaikan, Bilibili, Tencent, Qidian -> manhua; Jump, Syosetu -> manga).
    """
    if not raw_text:
        return None
    low = str(raw_text).lower()
    for c_type in ("manhua", "manhwa", "manga"):
        for sig in ORIGINAL_PLATFORM_SIGNATURES[c_type]:
            if sig in low:
                return c_type
    return None


def map_raw_ru_tags_to_catalog_tags(raw_tag_strings):
    mapped = []
    for raw in raw_tag_strings:
        if not raw:
            continue
        low = str(raw).lower().replace('ё', 'е').strip()
        if low in RU_SITE_TAG_MAPPING:
            target = RU_SITE_TAG_MAPPING[low]
            if target not in mapped:
                mapped.append(target)
            continue
        for k, target in RU_SITE_TAG_MAPPING.items():
            if len(k) >= 4 and k in low:
                if target not in mapped:
                    mapped.append(target)
    return mapped


def query_remanga_strict(search_title):
    """
    Строгий поиск тайтла на ReManga с проверкой оригинального издателя (Naver/Kakao/Webtoon/Bilibili/Kuaikan)
    и точного совпадения названия.
    """
    try:
        q = urllib.parse.quote(search_title)
        url = f"https://api.remanga.org/api/search/?query={q}&count=5"
        res = fetch_json(url, timeout=6, extra_headers={'Referer': 'https://remanga.org/'})
        content_list = res.get('content') if isinstance(res, dict) else []
        if not isinstance(content_list, list) or not content_list:
            return None, [], ""

        norm_q = normalize_for_match(search_title)
        q_words = [w for w in norm_q.split() if len(w) >= 3]
        best_item = None

        for cand in content_list:
            if not isinstance(cand, dict):
                continue
            rus_n = normalize_for_match(cand.get('rus_name') or '')
            main_n = normalize_for_match(cand.get('main_name') or '')
            en_n = normalize_for_match(cand.get('en_name') or '')
            if rus_n == norm_q or main_n == norm_q:
                best_item = cand
                break
            if q_words and all(w in f"{rus_n} {main_n} {en_n}" for w in q_words):
                best_item = cand
                break

        if not best_item:
            return None, [], ""

        en_name = str(best_item.get('en_name') or best_item.get('main_name') or '').strip()
        type_obj = best_item.get('type')
        raw_type_str = str(type_obj.get('name') or type_obj.get('rus_name') if isinstance(type_obj, dict) else type_obj or '').lower()

        detected_type = classify_origin_from_platform_text(raw_type_str)

        raw_tags = []
        for field in ['genres', 'categories', 'tags']:
            arr = best_item.get(field)
            if isinstance(arr, list):
                for el in arr:
                    if isinstance(el, dict):
                        raw_tags.append(el.get('name') or el.get('rus_name') or '')
                    elif isinstance(el, str):
                        raw_tags.append(el)

        dir_slug = best_item.get('dir')
        if dir_slug:
            try:
                detail = fetch_json(f"https://api.remanga.org/api/titles/{dir_slug}/", timeout=5, extra_headers={'Referer': 'https://remanga.org/'})
                d_content = detail.get('content', detail) if isinstance(detail, dict) else {}
                if isinstance(d_content, dict):
                    if not en_name:
                        en_name = str(d_content.get('en_name') or d_content.get('main_name') or '').strip()

                    # Проверяем оригинальные платформы и издателей (Kakao, Naver, Webtoon, Bilibili, Kuaikan)
                    publishers_blob = json.dumps(d_content.get('publishers') or d_content.get('branches') or '', ensure_ascii=False)
                    desc_blob = str(d_content.get('description') or '')
                    plat_type = classify_origin_from_platform_text(f"{raw_type_str} {publishers_blob} {desc_blob}")
                    if plat_type:
                        detected_type = plat_type

                    for field in ['genres', 'categories', 'tags']:
                        arr = d_content.get(field)
                        if isinstance(arr, list):
                            for el in arr:
                                if isinstance(el, dict):
                                    raw_tags.append(el.get('name') or el.get('rus_name') or '')
            except Exception:
                pass

        return detected_type, map_raw_ru_tags_to_catalog_tags(raw_tags), en_name
    except Exception:
        return None, [], ""


def query_anilist_origin_strict(search_query):
    """
    Проверяет точную страну оригинала (KR -> manhwa, CN -> manhua, JP -> manga) и официальные ссылки
    (KakaoPage, Naver Webtoon, Bilibili, Kuaikan) через AniList GraphQL.
    """
    if not search_query or len(search_query) < 2:
        return None, []
    try:
        gql = {
            "query": """
            query ($search: String) {
              Media(search: $search, type: MANGA) {
                countryOfOrigin
                genres
                tags { name }
                externalLinks { site url }
              }
            }
            """,
            "variables": {"search": search_query}
        }
        res = fetch_json("https://graphql.anilist.co", timeout=6, post_data=gql)
        media = ((res or {}).get('data') or {}).get('Media')
        if not isinstance(media, dict):
            return None, []

        links_blob = " ".join(
            f"{lnk.get('site', '')} {lnk.get('url', '')}"
            for lnk in (media.get('externalLinks') or []) if isinstance(lnk, dict)
        )
        detected_type = classify_origin_from_platform_text(links_blob)

        if not detected_type:
            country = str(media.get('countryOfOrigin') or '').upper()
            if country == 'KR':
                detected_type = 'manhwa'
            elif country in ('CN', 'TW'):
                detected_type = 'manhua'
            elif country == 'JP':
                detected_type = 'manga'

        raw_tags = list(media.get('genres') or [])
        for t in (media.get('tags') or []):
            if isinstance(t, dict) and t.get('name'):
                raw_tags.append(str(t['name']))

        return detected_type, map_raw_ru_tags_to_catalog_tags(raw_tags)
    except Exception:
        return None, []


def query_senkuro_strict(search_title):
    try:
        gql_query = {
            "query": """
            query SearchManga($query: String!) {
              mangas(search: $query, first: 3) {
                edges {
                  node {
                    originalName { content }
                    titles { content }
                    type
                    genres { titles { content } }
                    tags { titles { content } }
                  }
                }
              }
            }
            """,
            "variables": {"query": search_title}
        }
        res = fetch_json("https://api.senkuro.com/graphql", timeout=6, extra_headers={'Origin': 'https://senkuro.com'}, post_data=gql_query)
        edges = (((res or {}).get('data') or {}).get('mangas') or {}).get('edges') or []
        if not edges:
            return None, []

        norm_q = normalize_for_match(search_title)
        best_node = None
        for edge in edges:
            node = edge.get('node') if isinstance(edge, dict) else None
            if not isinstance(node, dict):
                continue
            titles_list = [normalize_for_match(t.get('content', '')) for t in (node.get('titles') or []) if isinstance(t, dict)]
            if any(t == norm_q or (len(norm_q) > 5 and (norm_q in t or t in norm_q)) for t in titles_list if t):
                best_node = node
                break

        if not best_node:
            return None, []

        m_type = str(best_node.get('type') or '').upper()
        detected_type = None
        if 'MANHUA' in m_type:
            detected_type = 'manhua'
        elif 'MANHWA' in m_type:
            detected_type = 'manhwa'
        elif 'MANGA' in m_type:
            detected_type = 'manga'

        raw_tags = []
        for field in ['genres', 'tags']:
            for g in (best_node.get(field) or []):
                if isinstance(g, dict):
                    for t_obj in (g.get('titles') or []):
                        if isinstance(t_obj, dict) and t_obj.get('content'):
                            raw_tags.append(str(t_obj['content']))

        return detected_type, map_raw_ru_tags_to_catalog_tags(raw_tags)
    except Exception:
        return None, []


def query_shikimori_strict(search_title):
    try:
        q = urllib.parse.quote(search_title)
        res = fetch_json(f"https://shikimori.one/api/mangas?search={q}&limit=3", timeout=6)
        if not isinstance(res, list) or not res:
            return None, []
        norm_q = normalize_for_match(search_title)
        chosen = None
        for item in res:
            if not isinstance(item, dict):
                continue
            rus = normalize_for_match(item.get('russian') or '')
            name = normalize_for_match(item.get('name') or '')
            if rus == norm_q or name == norm_q or (len(norm_q) > 5 and (norm_q in rus or rus in norm_q)):
                chosen = item
                break
        if not chosen:
            return None, []

        kind = str(chosen.get('kind') or '').lower()
        detected_type = None
        if kind == 'manhua':
            detected_type = 'manhua'
        elif kind == 'manhwa':
            detected_type = 'manhwa'
        elif kind in ('manga', 'light_novel', 'novel'):
            detected_type = 'manga'

        raw_tags = []
        if chosen.get('id'):
            detail = fetch_json(f"https://shikimori.one/api/mangas/{chosen['id']}", timeout=5)
            if isinstance(detail, dict) and isinstance(detail.get('genres'), list):
                for g in detail['genres']:
                    if isinstance(g, dict) and g.get('russian'):
                        raw_tags.append(str(g['russian']))
        return detected_type, map_raw_ru_tags_to_catalog_tags(raw_tags)
    except Exception:
        return None, []


def detect_genres_and_type_for_title(clean_title, post_tags=None, extra_text="", prev_item=None):
    """
    Жёсткое определение типа (manhwa / manhua / manga) и тегов:
    1) Эталонная таблица CURATED_ORIGIN_AND_TAGS (по данным Naver/Kakao/Webtoon/Bilibili/Kuaikan)
    2) Проверка платформ и API (ReManga + AniList CountryOfOrigin/ExternalLinks + Senkuro + Shikimori)
    3) Строгие регулярные выражения по границам слов
    Издатели нигде не записываются в отображаемые поля.
    """
    canonical = resolve_canonical_title(clean_title)
    if canonical in CURATED_ORIGIN_AND_TAGS:
        meta = CURATED_ORIGIN_AND_TAGS[canonical]
        return list(meta.get("tags", ["фэнтези"]))[:3], meta.get("type", "manhwa")

    if isinstance(prev_item, dict) and prev_item.get("strict_origin_verified"):
        cached_genres = [g for g in (prev_item.get("genres") or []) if g in RU_SITE_TAG_MAPPING.values()]
        cached_type = prev_item.get("content_type")
        if cached_genres and cached_type in ("manhwa", "manhua", "manga"):
            return cached_genres[:3], cached_type

    search_queries = [clean_title]
    if canonical and canonical != clean_title.lower():
        search_queries.append(canonical)

    external_type = classify_origin_from_platform_text(f"{clean_title} {' '.join(post_tags or [])} {extra_text}")
    external_tags = []

    for sq in search_queries[:2]:
        rm_type, rm_tags, en_title = query_remanga_strict(sq)
        if rm_type and not external_type:
            external_type = rm_type
        for t in rm_tags:
            if t not in external_tags:
                external_tags.append(t)

        if en_title:
            al_type, al_tags = query_anilist_origin_strict(en_title)
            if al_type:
                external_type = al_type
            for t in al_tags:
                if t not in external_tags:
                    external_tags.append(t)

        if not external_type or len(external_tags) < 2:
            sk_type, sk_tags = query_senkuro_strict(sq)
            if sk_type and not external_type:
                external_type = sk_type
            for t in sk_tags:
                if t not in external_tags:
                    external_tags.append(t)

        if not external_type or len(external_tags) < 2:
            sh_type, sh_tags = query_shikimori_strict(sq)
            if sh_type and not external_type:
                external_type = sh_type
            for t in sh_tags:
                if t not in external_tags:
                    external_tags.append(t)

        if external_type and len(external_tags) >= 2:
            break

    combined = f" {canonical} {clean_title} {' '.join(post_tags or [])} {extra_text} ".lower().replace('ё', 'е')
    matched_tags = list(external_tags)

    for tag_key, pattern in STRICT_SINGLE_TAG_PATTERNS:
        if pattern.search(combined) and tag_key not in matched_tags:
            matched_tags.append(tag_key)

    if not matched_tags:
        matched_tags = ["фэнтези"]

    if not external_type:
        if STRICT_MANGA_REGEX.search(combined):
            external_type = "manga"
        elif STRICT_MANHUA_REGEX.search(combined) or "культивация" in matched_tags:
            external_type = "manhua"
        else:
            external_type = "manhwa"

    return matched_tags[:3], external_type


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
                            iid = str(item['id'])
                            prev_items_map[iid] = item
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

    manual_vote_id = os.environ.get('MANUAL_VOTE_ITEM_ID', '').strip()
    if manual_vote_id and str(manual_vote_id) == str(item_id):
        try:
            up_data = fetch_json(f"https://api.counterapi.dev/v1/{vote_ns}/{safe_key}/up", timeout=6)
            if isinstance(up_data, dict):
                c = int(up_data.get('count') or up_data.get('value') or 0)
                max_votes = max(max_votes + 1, c)
        except Exception:
            max_votes += 1

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
        "description": "Журнал поисковых запросов тайтлов, которых ещё нет в каталоге Boosty (с автоматической проверкой в update.py и разбивкой по месяцам)",
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
        doc["months"][month_key] = {
            "total_missing_queries": 0,
            "queries": {}
        }

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
        prev_count = 0
        if isinstance(month_queries.get(candidate), dict):
            prev_count = int(month_queries[candidate].get("count") or 0)

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

    sorted_queries = dict(
        sorted(
            month_queries.items(),
            key=lambda kv: int(kv[1].get("count") or 0) if isinstance(kv[1], dict) else 0,
            reverse=True
        )
    )
    doc["months"][month_key]["queries"] = sorted_queries
    doc["months"][month_key]["total_missing_queries"] = sum(
        int(v.get("count") or 0) for v in sorted_queries.values() if isinstance(v, dict)
    )
    doc["updated_at"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    doc["current_month"] = month_key

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
                "current": 174,
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
    for _ in range(30):
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
            time.sleep(0.06)
        except Exception as e:
            print(f"Ошибка пагинации постов: {e}")
            break
    print(f"Всего выгружено постов блога: {len(all_posts)}")
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


def parse_strict_chapter_info(text):
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

    sig_words = [w for w in norm_bundle_title.split() if len(w) >= 4 and not w.isdigit()]

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

        if len(sig_words) >= 2 and all(w in norm_line.split()[:len(sig_words) + 3] for w in sig_words[:3]):
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
    direct_latest_post_id = ""

    for key in ['lastPost', 'latestPost', 'firstPost']:
        lp = bundle.get(key)
        if isinstance(lp, dict) and lp.get('id'):
            direct_latest_post_id = str(lp['id']).strip()
            matched_map[direct_latest_post_id] = lp

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
                            pid = str(p['id']).strip()
                            matched_map[pid] = p
                            if not direct_latest_post_id:
                                direct_latest_post_id = pid
                    break
        except Exception:
            continue

    if not matched_map or not direct_latest_post_id:
        try:
            feed_html = fetch_html(f'https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=feed')
            post_ids = re.findall(r'/posts/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', feed_html)
            if not post_ids:
                post_ids = re.findall(r'"post"\s*:\s*\{\s*"id"\s*:\s*"([a-f0-9\-]{36})"', feed_html)
            if not post_ids:
                post_ids = re.findall(r'"id"\s*:\s*"([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})"\s*,\s*"title"', feed_html)

            if post_ids:
                if not direct_latest_post_id:
                    direct_latest_post_id = str(post_ids[0]).strip()
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

    _, _, b_max_ch = parse_strict_chapter_info(raw_title)
    if result_posts:
        if b_max_ch > 0:
            for rp in result_posts:
                for line in extract_post_titles_strict(rp):
                    _, _, p_end = parse_strict_chapter_info(line)
                    if p_end == b_max_ch and rp.get('id'):
                        direct_latest_post_id = str(rp['id']).strip()
                        break
                if direct_latest_post_id == str(rp.get('id', '')).strip():
                    break
        if not direct_latest_post_id and result_posts[0].get('id'):
            direct_latest_post_id = str(result_posts[0]['id']).strip()

    return result_posts, direct_latest_post_id


def fetch_isolated_tag_posts(tag_id, tag_title, all_blog_posts):
    tag_id_str = str(tag_id).strip()
    norm_tag_title = normalize_for_match(tag_title)
    aliases = get_aliases_for_title(tag_title)
    matched = {}
    direct_latest_id = ""

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
        if post_ids:
            direct_latest_id = str(post_ids[0]).strip()
            for pid in post_ids:
                if pid in posts_by_id:
                    matched[pid] = posts_by_id[pid]
    except Exception:
        pass

    res = list(matched.values())
    res.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    if res and res[0].get('id'):
        direct_latest_id = str(res[0]['id']).strip()
    return res, direct_latest_id


def analyze_posts_stats(posts_list, fallback_ts):
    """
    Анализирует посты бандла/тега, находит:
    - best_latest_post_id (пост с самыми свежими главами)
    - best_free_post_id (пост с бесплатными главами, чтобы при фильтре «Халява» ссылка вела СРАЗУ на пост с бесплатными главами)
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

    if not posts_list:
        return (detected_level, 0, 0, "", "", fallback_ts, False, "", "")

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
    if posts_list[0].get('id'):
        best_latest_post_id = str(posts_list[0]['id']).strip()

    for idx, mp in enumerate(posts_list, 1):
        t_info = detect_post_tier_strict(mp)
        cur_range = ""
        cur_start = 0
        cur_end = 0
        mp_id = str(mp.get('id') or '').strip()

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
            if mp_id:
                best_latest_post_id = mp_id
            if not latest_range_label:
                latest_range_label = cur_range

        if t_info["is_free"]:
            if mp_id and not best_free_post_id:
                best_free_post_id = mp_id

            if cur_end > 0 and cur_start > 0 and (cur_end - cur_start) < 500:
                span_score = (cur_end - cur_start + 1) + (1000 if cur_start == 1 else 0)
                if mp_id and span_score > best_free_span:
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
        has_1_to_n_start,
        best_latest_post_id,
        best_free_post_id
    )


def process_data(extra_cfg):
    bundles_list = get_all_bundles()
    if not bundles_list:
        return [], {}

    prev_items_map, previous_votes, previous_searches, months_archive = load_previous_catalog_and_votes()
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
        matched_posts, direct_bundle_post_id = match_posts_for_bundle(item, all_blog_posts, posts_by_id, global_first_post_id)

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
            best_free_post_id
        ) = analyze_posts_stats(matched_posts, created_ts)

        latest_post_id = (
            (matched_posts[0].get('id') if matched_posts and matched_posts[0].get('id') else '')
            or direct_bundle_post_id
            or best_ch_post_id
            or str(prev_item.get('latest_post_id') or '').strip()
        )

        free_post_id = best_free_post_id or str(prev_item.get('free_post_id') or '').strip()

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
        eng_metric_tag = make_clean_english_utm_tag(clean_title, bundle_id)
        votes_count, monthly_searches_count = fetch_current_votes_and_searches_for_id(
            bundle_id,
            previous_votes.get(bundle_id, 0),
            previous_searches.get(bundle_id, 0)
        )

        all_post_tags = []
        for mp in matched_posts[:6]:
            all_post_tags.extend(extract_post_tag_names(mp))

        genres, content_type = detect_genres_and_type_for_title(
            clean_title,
            all_post_tags,
            extra_text=str(item.get('description', '')),
            prev_item=prev_item
        )

        raw_latest_post_url = f"https://boosty.to/{BLOG_NAME}/posts/{latest_post_id}" if latest_post_id else feed_link
        raw_free_post_url = (
            f"https://boosty.to/{BLOG_NAME}/posts/{free_post_id}"
            if free_post_id
            else (f"{feed_link}&onlyAllowed=true" if has_free else feed_link)
        )

        result.append({
            "id": bundle_id,
            "metric_tag": eng_metric_tag,
            "utm_campaign": eng_metric_tag,
            "vote_key": make_ascii_vote_key(bundle_id),
            "title": clean_title,
            "image": cover,
            "content_type": content_type,
            "strict_origin_verified": True,
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
            "latest_post_id": latest_post_id,
            "latest_post_link": build_clean_utm_url(raw_latest_post_url, eng_metric_tag),
            "free_post_id": free_post_id,
            "free_post_link": build_clean_utm_url(raw_free_post_url, eng_metric_tag),
            "sub_link": build_clean_utm_url(sub_link, eng_metric_tag),
            "link": build_clean_utm_url(feed_link, eng_metric_tag),
            "votes": votes_count,
            "monthly_searches": monthly_searches_count
        })

    # Скрытые теги из extra.json — ВСЕГДА Лицензии (2 ур. / 500 ₽)
    for custom in extra_cfg.get("custom_tags", []):
        tag_id = str(custom.get("tag_id", "")).strip()
        custom_id = str(custom.get("id", f"tag_{tag_id}"))
        prev_item = prev_items_map.get(custom_id, {})
        c_title = clean_bundle_title(custom.get("title", "Без названия"))
        c_link = custom.get("link") or f"https://boosty.to/{BLOG_NAME}?postsTagsIds={tag_id}"
        c_image = clean_image_url(custom.get("image", "").strip()) or prev_item.get("image", "")

        tag_posts, direct_tag_post_id = fetch_isolated_tag_posts(tag_id, c_title, all_blog_posts) if tag_id else ([], "")
        now_ts = int(time.time())

        (
            _,
            post_max_ch,
            free_ch_count,
            free_text,
            latest_range_str,
            oldest_post_ts,
            started_from_ch1,
            best_ch_post_id,
            best_free_post_id
        ) = analyze_posts_stats(tag_posts, now_ts)

        updated_ts = prev_item.get('timestamp') or now_ts
        latest_post_id = (
            (tag_posts[0].get('id') if tag_posts and tag_posts[0].get('id') else '')
            or direct_tag_post_id
            or best_ch_post_id
            or str(prev_item.get('latest_post_id') or '').strip()
        )
        free_post_id = best_free_post_id or str(prev_item.get('free_post_id') or '').strip()

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
        eng_metric_tag = make_clean_english_utm_tag(c_title, custom_id)
        votes_count, monthly_searches_count = fetch_current_votes_and_searches_for_id(
            custom_id,
            previous_votes.get(custom_id, 0),
            previous_searches.get(custom_id, 0)
        )

        genres, content_type = detect_genres_and_type_for_title(c_title, prev_item=prev_item)
        raw_latest_post_url = f"https://boosty.to/{BLOG_NAME}/posts/{latest_post_id}" if latest_post_id else c_link
        raw_free_post_url = (
            f"https://boosty.to/{BLOG_NAME}/posts/{free_post_id}"
            if free_post_id
            else (f"{c_link}&onlyAllowed=true" if has_free else c_link)
        )

        result.append({
            "id": custom_id,
            "metric_tag": eng_metric_tag,
            "utm_campaign": eng_metric_tag,
            "vote_key": make_ascii_vote_key(custom_id),
            "title": c_title,
            "image": c_image,
            "content_type": content_type,
            "strict_origin_verified": True,
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
    stats_data = get_blog_stats_and_goals()
    with open('stats.json', 'w', encoding='utf-8') as f:
        json.dump(stats_data, f, ensure_ascii=False, indent=2)

    data, months_archive = process_data(extra_cfg)
    if data and len(data) > 5:
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        save_votes_json_file(data, months_archive)
        update_missing_searches_file(data)
        t2_count = sum(1 for x in data if x.get('tier_level') == 2)
        manhua_count = sum(1 for x in data if x.get('content_type') == 'manhua')
        manhwa_count = sum(1 for x in data if x.get('content_type') == 'manhwa')
        manga_count = sum(1 for x in data if x.get('content_type') == 'manga')
        print(f"Успешно обновлено {len(data)} тайтлов (Манхва: {manhwa_count}, Маньхуа: {manhua_count}, Манга: {manga_count}, Лицензий 2 ур.: {t2_count}).")
    else:
        cached_catalog = []
        if os.path.exists('data.json'):
            try:
                with open('data.json', 'r', encoding='utf-8') as f:
                    cached_catalog = json.load(f)
            except Exception:
                cached_catalog = []
        update_missing_searches_file(cached_catalog)
        print("Сохранен предыдущий кэш data.json и votes.json, обновлен missing_searches.json (Fallback).")
