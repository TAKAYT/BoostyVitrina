let allItems = [];
let activeTierTab = 'all';
let selectedGenres = new Set();
let activeContentTypeFilter = 'all';
let activeLetterFilter = 'all';
let selectedStatsMonth = 'current';
let renderedCardsCount = 0;
let lastFilteredItems = [];
let infiniteScrollObserver = null;
let missingSearchTimer = null;
let monthsArchiveData = {};
let isForYouStripOpen = false;
let detectedGeoWeather = { isNight: false, weather: 'clear', season: 'autumn' };
const BATCH_LOAD_SIZE = 20;
const YM_ID = 114099972;

// Эталонные координаты для синхронизации реальной погоды на улице (без упоминания города)
const _METEO_SYNC_LAT = 45.0428;
const _METEO_SYNC_LON = 41.9734;

// Единый UTC-месяц и номер недели для помесячного разделения счётчиков голосов, поисков и паков заданий
const now = new Date();
const MONTH_NAMES_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
const CURRENT_MONTH_NAME = MONTH_NAMES_RU[now.getUTCMonth()];
const CURRENT_YEAR = now.getUTCFullYear();
const CURRENT_MONTH_KEY = `${CURRENT_YEAR}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
const CURRENT_MONTH_HUMAN = `${CURRENT_MONTH_NAME} ${CURRENT_YEAR}`;
const CURRENT_WEEK_INDEX = Math.min(3, Math.floor((now.getUTCDate() - 1) / 7)); // 0..3
const CURRENT_WEEK_KEY = `${CURRENT_MONTH_KEY}_w${CURRENT_WEEK_INDEX + 1}`;

const VOTE_NAMESPACE = `takayt_vitrina_${CURRENT_MONTH_KEY}`;
const SEARCH_NAMESPACE = `takayt_search_${CURRENT_MONTH_KEY}`;
const MISSING_NAMESPACE = `takayt_missing_${CURRENT_MONTH_KEY}`;

const LOCAL_CACHE_KEY = `taka_votes_cache_${CURRENT_MONTH_KEY}`;
const LOCAL_SEARCH_COUNT_KEY = `taka_monthly_searches_${CURRENT_MONTH_KEY}`;
const LOCAL_MISSING_LOG_KEY = `taka_missing_queries_${CURRENT_MONTH_KEY}`;
const USER_VOTED_MAP_KEY = `taka_user_voted_map_${CURRENT_MONTH_KEY}`;
const PENDING_VOTES_KEY = `taka_pending_votes_${CURRENT_MONTH_KEY}`;
const QUESTS_STATE_KEY = `taka_weekly_quests_${CURRENT_WEEK_KEY}`;
const USER_TAG_PREFS_KEY = 'taka_user_favorite_tags_v3';
const USER_INTERACTION_COUNT_KEY = 'taka_user_interactions_count_v1';
const REMANGA_PRIORITY_CACHE_KEY = 'taka_remanga_priority_cache_v8';
const ANON_USER_UID_KEY = 'taka_anon_user_uid_v1';

// Справочник 14 одиночных тегов читалки
const READER_TAGS_DICTIONARY = {
    "некромантия": "💀 Некромантия",
    "система": "⚡ Система",
    "имба": "👑 Имба ГГ",
    "регрессия": "🔄 Регрессия",
    "перерождение": "✨ Перерождение",
    "подземелья": "🏰 Подземелья",
    "драконы": "🐉 Драконы",
    "призыв": "🐾 Призыв",
    "апокалипсис": "☣️ Апокалипсис",
    "культивация": "🏯 Культивация",
    "фэнтези": "🔮 Фэнтези",
    "демоны": "😈 Демоны",
    "месть": "🗡️ Месть",
    "артефакты": "💎 Артефакты"
};

const CONTENT_TYPE_LABELS = {
    "manhwa": "🇰🇷 Манхва",
    "manhua": "🇨🇳 Маньхуа",
    "manga": "🇯🇵 Манга"
};

const LEGACY_TAG_MIGRATION = {
    "имба_гг": "имба",
    "драконы_и_призыв": "драконы",
    "магия_и_фэнтези": "фэнтези",
    "демоны_и_боги": "демоны"
};

const RU_EN_TAG_MAPPING = {
    "некромантия": "некромантия",
    "некромант": "некромантия",
    "нежить": "некромантия",
    "necromancy": "некромантия",
    "necromancer": "некромантия",
    "система": "система",
    "игровые элементы": "система",
    "литрпг": "система",
    "прокачка": "система",
    "рост уровня": "система",
    "system": "система",
    "leveling": "система",
    "video games": "система",
    "скрытые способности": "имба",
    "имба": "имба",
    "гг имба": "имба",
    "сильный гг": "имба",
    "могущественный гг": "имба",
    "непобедимый гг": "имба",
    "overpowered": "имба",
    "регрессия": "регрессия",
    "возвращение в прошлое": "регрессия",
    "путешествие во времени": "регрессия",
    "петля времени": "регрессия",
    "regression": "регрессия",
    "time travel": "регрессия",
    "time manipulation": "регрессия",
    "реинкарнация": "перерождение",
    "перерождение": "перерождение",
    "исекай": "перерождение",
    "попаданец": "перерождение",
    "попадание в другой мир": "перерождение",
    "reincarnation": "перерождение",
    "isekai": "перерождение",
    "подземелья": "подземелья",
    "данжи": "подземелья",
    "башня": "подземелья",
    "охотники": "подземелья",
    "врата": "подземелья",
    "dungeon": "подземелья",
    "dungeons": "подземелья",
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
    "tamer": "призыв",
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
    "alchemy": "артефакты",
    "фэнтези": "фэнтези",
    "магия": "фэнтези",
    "рыцари": "фэнтези",
    "эльфы": "фэнтези",
    "средневековье": "фэнтези",
    "аристократия": "фэнтези",
    "fantasy": "фэнтези",
    "magic": "фэнтези"
};

const CLIENT_TAG_REGEX_RULES = [
    ["некромантия", /(?:^|[^а-яa-z0-9])(некромант[а-я]*|скелет[а-я]*|нежит[а-я]*|мертвец[а-я]*|лич(?:а|ем|и|ей)?|кладбищ[а-я]*|кост(?:ей|и|яной))(?=$|[^а-яa-z0-9])/i],
    ["система", /(?:^|[^а-яa-z0-9])(систем[а-я]*|уров(?:ень|ня|ней|нем)|лвл|lvl|sss|3s|s-ранг[а-я]*|f-ранг[а-я]*|ранг(?:а|ов|у)?|квест[а-я]*|прокачк[а-я]*|прокачива[а-я]*|игрок[а-я]*|навык[а-я]*|талант[а-я]*|очков|статус[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["имба", /(?:^|[^а-яa-z0-9])(имб[а-я]*|сильнейш[а-я]*|максимальн[а-я]*|непобедим[а-я]*|всемогущ[а-я]*|абсолютн[а-я]*|100\s*лет|катастроф[а-я]*|божественн[а-я]*|верховн[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["регрессия", /(?:^|[^а-яa-z0-9])(регресс[а-я]*|вернул[а-я]*\s+в\s+прошл[а-я]*|в\s+начало\s+до|заново|спустя\s+\d+\s+лет|в\s+прошлое)(?=$|[^а-яa-z0-9])/i],
    ["перерождение", /(?:^|[^а-яa-z0-9])(перерожд[а-я]*|реинкарнац[а-я]*|перевопло[а-я]*|возрожд[а-я]*|начало\s+после\s+конца|стал\s+графским|стал\s+ублюдком|исекай|в\s+другом\s+мире|стал\s+злодеем|стал\s+деревом|переселен[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["подземелья", /(?:^|[^а-яa-z0-9])(подземел[а-я]*|данж[а-я]*|башн[а-я]*|врат(?:а|ах)|охотник[а-я]*|рейд[а-я]*|гробниц[а-я]*|расхитител[а-я]*|лабиринт[а-я]*|прокачка\s+в\s+аду|бездн[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["драконы", /(?:^|[^а-яa-z0-9])(дракон[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["призыв", /(?:^|[^а-яa-z0-9])(призыв[а-я]*|укротител[а-я]*|питом[а-я]*|звер[а-я]*|насеком[а-я]*|гоблин[а-я]*|фамильяр[а-я]*|монстр[а-я]*|рой|роя|эволюци[а-я]*|слиз[ьи])(?=$|[^а-яa-z0-9])/i],
    ["апокалипсис", /(?:^|[^а-яa-z0-9])(апокалипсис[а-я]*|зомби|вирус[а-я]*|судный\s+день|выживан[а-я]*|конец\s+света|мутант[а-я]*|заморозк[а-я]*|ледников[а-я]*|убежищ[а-я]*|припас[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["культивация", /(?:^|[^а-яa-z0-9])(культиват[а-я]*|дао|бессмертн[а-я]*|боевых\s+искусств|мурим[а-я]*|сект[а-я]*|предок|император[а-я]*|небесн[а-я]*|континент[а-я]*|пик\s+боевых|династи[яи]\s+тан)(?=$|[^а-яa-z0-9])/i],
    ["демоны", /(?:^|[^а-яa-z0-9])(демон[а-я]*|дьявол[а-я]*|падш[а-я]*|бог[а-я]*\s+гоблин[а-я]*|под\s+наблюдением\s+бога|злой\s+бог|божеств[а-я]*|асур[а-я]*|владык[а-я]*\s+тьмы)(?=$|[^а-яa-z0-9])/i],
    ["месть", /(?:^|[^а-яa-z0-9])(мест(?:ь|и|ью)|предател[а-я]*|сокрушен[а-я]*\s+мира|расплат[а-я]*|злоде[а-я]*|ублюд[а-я]*|отброс[а-я]*|убийц[а-я]*|изгнан[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["артефакты", /(?:^|[^а-яa-z0-9])(оруди[а-я]*|артефакт[а-я]*|кузнец[а-я]*|алхим[а-я]*|сокровищ[а-я]*|транжир[а-я]*|меч[а-я]*|клинок|клинка|экипировк[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["фэнтези", /(?:^|[^а-яa-z0-9])(маги[а-я]*|архимаг[а-я]*|маг(?:а|у|ом|и)?|академи[а-я]*|рыцар[а-я]*|паладин[а-я]*|эльф[а-я]*|графств[а-я]*|графск[а-я]*|герцог[а-я]*|принц[а-я]*|королев[а-я]*|мудрец[а-я]*|геро[а-я]*|авантюрист[а-я]*|гильди[а-я]*)(?=$|[^а-яa-z0-9])/i]
];

// Проверенная база типов и количества глав строго по сайту ReManga (remanga.org)
const REMANGA_VERIFIED_DB = {
    "некромант я катастрофа": { type: "manhua", internet_chapters: 165, tags: ["некромантия", "система", "имба"], remanga_query: "Некромант - я катастрофа" },
    "паладин sss ранга": { type: "manhua", internet_chapters: 185, tags: ["система", "фэнтези", "имба"], remanga_query: "Паладин превосходящий здравый смысл" },
    "всеобщий отбор укротитель драконов в самом деле самый слабый класс": { type: "manhua", internet_chapters: 281, tags: ["драконы", "призыв", "система"], remanga_query: "Всеобщий отбор: укротитель драконов в самом деле самый слабый класс?" },
    "некромант максимального уровня": { type: "manhua", internet_chapters: 140, tags: ["некромантия", "система", "имба"], remanga_query: "Некромант максимального уровня" },
    "мастер древних божественных орудий": { type: "manhua", internet_chapters: 65, tags: ["артефакты", "культивация", "перерождение"], remanga_query: "Мастер древних божественных орудий" },
    "я перевоплотился в могущественного дракона для сокрушения мира": { type: "manhua", internet_chapters: 101, tags: ["драконы", "перерождение", "месть"], remanga_query: "Я Перевоплотился в Могущественного Дракона для Сокрушения Мира!" },
    "я проснулся имбой после 100 лет afk": { type: "manhua", internet_chapters: 120, tags: ["имба", "система", "культивация"], remanga_query: "Я проснулся имбой после 100 лет AFK" },
    "начало после конца": { type: "manhwa", internet_chapters: 225, tags: ["перерождение", "фэнтези", "имба"], remanga_query: "Начало после конца" },
    "от гоблина к богу гоблинов": { type: "manhua", internet_chapters: 103, tags: ["перерождение", "призыв", "система"], remanga_query: "От гоблина к богу гоблинов" },
    "реинкарнация в начало апокалипсиса": { type: "manhua", internet_chapters: 115, tags: ["апокалипсис", "регрессия", "система"], remanga_query: "Реинкарнация в начало апокалипсиса" },
    "я стал графским ублюдком": { type: "manhwa", internet_chapters: 138, tags: ["перерождение", "фэнтези"], remanga_query: "Отброс графской семьи" },
    "прокачка в аду": { type: "manhwa", internet_chapters: 62, tags: ["система", "подземелья", "имба"], remanga_query: "Прокачка в Аду" },
    "повелитель насекомых": { type: "manhua", internet_chapters: 90, tags: ["призыв", "перерождение", "апокалипсис"], remanga_query: "Повелитель насекомых" },
    "цивилизация мудрецов": { type: "manhwa", internet_chapters: 75, tags: ["перерождение", "фэнтези", "система"], remanga_query: "Цивилизация мудрецов" },
    "деревня под наблюдением бога": { type: "manhwa", internet_chapters: 75, tags: ["перерождение", "фэнтези", "система"], remanga_query: "Цивилизация мудрецов" },
    "некромант катастрофа решил уйти на пенсию": { type: "manhwa", internet_chapters: 50, tags: ["некромантия", "имба", "фэнтези"], remanga_query: "Некромант-катастрофа решил уйти на пенсию" },
    "перерождение демонического культиватора": { type: "manhua", internet_chapters: 95, tags: ["культивация", "апокалипсис", "перерождение"], remanga_query: "Возрождение демонического культиватора в мире зомби-апокалипсиса" },
    "призыватель sss ранга": { type: "manhua", internet_chapters: 160, tags: ["призыв", "система", "имба"], remanga_query: "Призыватель SSS Ранга" },
    "я прокачиваюсь во сне убивая монстров": { type: "manhua", internet_chapters: 348, tags: ["система", "культивация", "имба"], remanga_query: "Я прокачиваюсь во сне, убивая монстров" },
    "судный день я король вирусов": { type: "manhua", internet_chapters: 110, tags: ["апокалипсис", "имба", "система"], remanga_query: "Судный День: Я, Король вирусов" },
    "великий расхититель гробниц": { type: "manhwa", internet_chapters: 412, tags: ["подземелья", "артефакты", "регрессия"], remanga_query: "Великий расхититель гробниц" },
    "возрождение династии тан": { type: "manhua", internet_chapters: 83, tags: ["перерождение", "культивация", "артефакты"], remanga_query: "Возрождение династии Тан" },
    "династия тан": { type: "manhua", internet_chapters: 83, tags: ["перерождение", "культивация", "артефакты"], remanga_query: "Возрождение династии Тан" },
    "восхождение в тени": { type: "manga", internet_chapters: 72, tags: ["перерождение", "имба", "фэнтези"], remanga_query: "Восхождение в тени" },
    "божественный убийца я тень": { type: "manhua", internet_chapters: 120, tags: ["система", "имба", "месть"], remanga_query: "Божественный убийца, Я - Тень" },
    "система теней": { type: "manhua", internet_chapters: 95, tags: ["система", "имба"], remanga_query: "Система теней" },
    "дитя дурных кровей": { type: "manhwa", internet_chapters: 60, tags: ["имба", "система", "месть"], remanga_query: "Дитя дурных кровей" },
    "эволюция дерева": { type: "manhua", internet_chapters: 180, tags: ["перерождение", "призыв", "система"], remanga_query: "Эволюция дерева" },
    "глобальная заморозка": { type: "manhua", internet_chapters: 390, tags: ["апокалипсис", "регрессия", "месть"], remanga_query: "Глобальная заморозка" },
    "я злой бог": { type: "manhua", internet_chapters: 510, tags: ["система", "культивация", "демоны"], remanga_query: "Я злой бог" },
    "демонический император": { type: "manhua", internet_chapters: 615, tags: ["культивация", "перерождение", "месть"], remanga_query: "Как демон-император стал дворецким" },
    "некромант одиночка": { type: "manhwa", internet_chapters: 180, tags: ["некромантия", "система", "подземелья"], remanga_query: "Некромант-одиночка" }
};

const CLIENT_SYNONYM_GROUPS = [
    ["некромант я катастрофа", "ням", "ням (некромант)", "ням некромант", "катастрофический некромант", "некромант - я катастрофа"],
    ["паладин sss ранга", "паладин sss ранга главы", "пsss", "psss", "паладин превосходящий здравый смысл"],
    ["всеобщий отбор укротитель драконов в самом деле самый слабый класс", "воудр (дракончик)", "воудр дракончик", "воудр", "дракончик", "укротитель драконов в самом деле самый слабый класс"],
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
    ["дитя дурных кровей", "дитя дурной крови"]
];

const CYR_TO_LAT_MAP = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

const TIER_SUB_LINKS = {
    1: 'https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link',
    2: 'https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link',
    3: 'https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link'
};

const RUSSIAN_ALPHABET = [
    'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Л', 'М',
    'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Э', 'Ю', 'Я'
];

const WEEKLY_QUEST_PACKS = {
    11: [
        {
            packTitle: "🍁 НОЯБРЬ • ПАК 1: ОСЕННИЙ МАРАФОН МАНХВЫ",
            step2: { title: "2. Открыть бесплатные серии", desc: "Нажми — включу подборку Халявы", action: "free" },
            step3: { title: "3. Проголосовать за выход проды", desc: "Нажми — отдадим голос в 1 клик", action: "vote" },
            step4: { title: "4. Помочь добить цель 200 подп.", desc: "Все 725+ серий от ~8 ₽ в день", action: "reward" }
        },
        {
            packTitle: "💀 НОЯБРЬ • ПАК 2: НЕДЕЛЯ НЕКРОМАНТОВ И СИСТЕМЫ",
            step2: { title: "2. Посмотреть хиты Некромантии", desc: "Нажми — отфильтрую топ тёмного фэнтези", action: "genre:некромантия" },
            step3: { title: "3. Крутануть рулетку «Мне повезёт»", desc: "Нажми — соберу линию из 4 тайтлов", action: "lucky" },
            step4: { title: "4. Открыть закрытые Лицензии 2 ур.", desc: "Полный доступ без ожидания", action: "reward" }
        },
        {
            packTitle: "🔥 НОЯБРЬ • ПАК 3: БИТВА ЗА ТОП-3 ПРОДЫ",
            step2: { title: "2. Проверить лидеров голосования", desc: "Нажми — покажу Топ голосов месяца", action: "sort:votes_desc" },
            step3: { title: "3. Ускорить любимый тайтл голосом", desc: "Нажми — проголосуем за фаворита", action: "vote" },
            step4: { title: "4. Активировать пропуск ко всем главам", desc: "Выгода подписки меньше 8 ₽ в день", action: "reward" }
        },
        {
            packTitle: "🐾 НОЯБРЬ • ПАК 4: ПРЕДЗИМНИЙ ЗАПАС СЕРИЙ",
            step2: { title: "2. Показать персональную полоску", desc: "Нажми — соберу подборку по вкусам", action: "for_you" },
            step3: { title: "3. Отдать голос в копилку месяца", desc: "Нажми — поддержим выход новых глав", action: "vote" },
            step4: { title: "4. Забрать полный доступ на зиму", desc: "Смотри все серии раньше остальных", action: "reward" }
        }
    ],
    12: [
        {
            packTitle: "🔥❄️ ДЕКАБРЬ • ПАК 1: УЮТНЫЙ ВЕЧЕР У КАМИНА",
            step2: { title: "2. Согреться бесплатными главами", desc: "Нажми — открою бесплатные выпуски", action: "free" },
            step3: { title: "3. Подбросить дров в проду (Голос)", desc: "Нажми — проголосуем за тайтл в 1 клик", action: "vote" },
            step4: { title: "4. Открыть зимний VIP-доступ у камина", desc: "Все 725+ серий без ограничений", action: "reward" }
        }
    ]
};

// --- 100% АВТОМАТИЧЕСКАЯ СЕЗОННАЯ И ПОГОДНАЯ АТМОСФЕРА (БЕЗ КНОПОК ПЕРЕКЛЮЧЕНИЯ) ---
const SEASONS_CONFIG = {
    autumn: {
        label: "🍁 Осень",
        brandText: "🍁 Тёплая бархатная осень и ежедневные серии ТАКА!",
        particles: ["🍁", "🐾", "🍂", "🐾", "🍁", "🍂"]
    },
    winter: {
        label: "🔥❄️ Зима",
        brandText: "🔥❄️ Тёплый зимний вечер у камина с озвучкой ТАКА!",
        particles: ["❄️", "🔥", "✨", "🐾", "❄️", "🔥"]
    },
    spring: {
        label: "🌸 Весна",
        brandText: "🌸 Весеннее тепло и свежие главы в семье ТАКА!",
        particles: ["🌸", "🐾", "🌺", "✨", "🌸", "🐾"]
    },
    summer: {
        label: "☀️ Лето",
        brandText: "☀️ Жаркие летние релизы и марафон озвучки ТАКА!",
        particles: ["☀️", "🔥", "🐾", "✨", "☀️", "🔥"]
    }
};

function getReferenceLocalTime() {
    // Вычисляем время по часовому поясу UTC+3
    const utcMs = Date.now();
    return new Date(utcMs + 3 * 3600 * 1000);
}

function detectSeasonByDate() {
    const refDate = getReferenceLocalTime();
    const m = refDate.getUTCMonth() + 1;
    if (m === 12 || m === 1 || m === 2) return 'winter';
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    return 'autumn';
}

function renderSeasonDecorations(seasonKey) {
    const ambientBg = document.getElementById('seasonAmbientBg');
    const topDecor = document.getElementById('seasonTopDecor');

    if (topDecor) {
        if (seasonKey === 'winter') {
            topDecor.className = 'season-top-decor winter-garland-active';
            const colors = ['bulb-gold', 'bulb-orange', 'bulb-warm'];
            const bulbs = [];
            for (let i = 0; i < 16; i++) {
                bulbs.push(`<span class="garland-bulb ${colors[i % colors.length]}" style="animation-delay:${(i * 0.25).toFixed(2)}s"></span>`);
            }
            topDecor.innerHTML = bulbs.join('');
        } else {
            topDecor.className = 'season-top-decor';
            topDecor.innerHTML = '';
        }
    }

    if (ambientBg) {
        const count = window.innerWidth <= 768 ? 8 : 14;
        const pieces = [];
        for (let i = 0; i < count; i++) {
            const left = Math.round((i / count) * 94 + (Math.random() * 5));
            const delay = (Math.random() * 12).toFixed(1);
            const dur = (13 + Math.random() * 8).toFixed(1);

            if (seasonKey === 'winter') {
                const sym = i % 3 === 0 ? '❄️' : (i % 2 === 0 ? '❅' : '•');
                const size = sym === '•' ? (10 + (i % 5)) : (12 + (i % 6));
                pieces.push(`<span class="ambient-particle snow-flake" style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;">${sym}</span>`);
            } else if (seasonKey === 'spring') {
                const sym = i % 2 === 0 ? '🌸' : '💮';
                const size = 11 + (i % 5);
                pieces.push(`<span class="ambient-particle sakura-petal" style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;">${sym}</span>`);
            } else if (seasonKey === 'summer') {
                const top = Math.round(15 + Math.random() * 75);
                const fDur = (4 + Math.random() * 4).toFixed(1);
                pieces.push(`<span class="ambient-particle night-firefly" style="left:${left}%;top:${top}%;animation-duration:${fDur}s;animation-delay:-${delay}s;"></span>`);
            } else {
                // Осень — строго осенние кленовые и дубовые листья (никакого снега!)
                const sym = i % 2 === 0 ? '🍁' : '🍂';
                const size = 12 + (i % 6);
                pieces.push(`<span class="ambient-particle autumn-leaf" style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;">${sym}</span>`);
            }
        }
        ambientBg.innerHTML = pieces.join('');
    }
}

function harmonizeWeatherWithSeason(rawWeatherType, seasonKey, isNight) {
    // СТРОГОЕ ПРАВИЛО: осенью, весной и летом НЕ может быть снега!
    if (rawWeatherType === 'snow' && seasonKey !== 'winter') {
        return 'rain';
    }
    if (rawWeatherType === 'rain') {
        return 'rain';
    }
    if (rawWeatherType === 'snow' && seasonKey === 'winter') {
        return 'snow';
    }
    return isNight ? 'fireflies' : 'clear';
}

function applyAutomatedAtmosphereState() {
    const seasonKey = detectSeasonByDate();
    detectedGeoWeather.season = seasonKey;

    const isNight = Boolean(detectedGeoWeather.isNight);
    const weatherType = harmonizeWeatherWithSeason(detectedGeoWeather.weather, seasonKey, isNight);
    detectedGeoWeather.weather = weatherType;

    document.documentElement.setAttribute('data-season', seasonKey);
    document.documentElement.setAttribute('data-time', isNight ? 'night' : 'day');
    document.documentElement.setAttribute('data-weather', weatherType);

    const cfg = SEASONS_CONFIG[seasonKey] || SEASONS_CONFIG.autumn;
    const brandEl = document.getElementById('heroBrandBadge');
    if (brandEl) brandEl.textContent = cfg.brandText;

    const particlesEl = document.getElementById('seasonParticles');
    if (particlesEl) {
        particlesEl.innerHTML = cfg.particles.map(p => `<span>${p}</span>`).join('');
    }

    renderSeasonDecorations(seasonKey);

    const badgeEl = document.getElementById('liveAtmosphereBadge');
    if (badgeEl) {
        let weatherLabel = '';
        if (weatherType === 'rain') {
            weatherLabel = isNight ? '🌙🌧️ Ночной дождь' : '🌧️ Дождь';
        } else if (weatherType === 'snow') {
            weatherLabel = isNight ? '🌙❄️ Снежная ночь' : '❄️ Снег';
        } else if (isNight) {
            weatherLabel = '🌙✨ Ночь • Светлячки';
        } else {
            weatherLabel = '☀️ День • Ясно';
        }
        badgeEl.textContent = `${cfg.label} • ${weatherLabel}`;
    }

    const weatherBg = document.getElementById('weatherAmbientBg');
    if (!weatherBg) return;

    if (weatherType === 'rain') {
        const dropCount = window.innerWidth <= 768 ? 26 : 48;
        const drops = [];
        for (let i = 0; i < dropCount; i++) {
            const left = Math.round(Math.random() * 104);
            const dur = (0.72 + Math.random() * 0.5).toFixed(2);
            const delay = (Math.random() * 2).toFixed(2);
            drops.push(`<span class="rain-streak" style="left:${left}%;animation-duration:${dur}s;animation-delay:-${delay}s;"></span>`);
        }
        weatherBg.innerHTML = drops.join('');
    } else if (weatherType === 'fireflies') {
        const flyCount = window.innerWidth <= 768 ? 12 : 22;
        const flies = [];
        for (let i = 0; i < flyCount; i++) {
            const left = Math.round(4 + Math.random() * 92);
            const top = Math.round(10 + Math.random() * 82);
            const dur = (3.6 + Math.random() * 3.8).toFixed(1);
            const delay = (Math.random() * 5).toFixed(1);
            flies.push(`<span class="ambient-particle night-firefly" style="left:${left}%;top:${top}%;animation-duration:${dur}s;animation-delay:-${delay}s;"></span>`);
        }
        weatherBg.innerHTML = flies.join('');
    } else if (weatherType === 'snow' && seasonKey === 'winter') {
        const snowCount = window.innerWidth <= 768 ? 14 : 24;
        const flakes = [];
        for (let i = 0; i < snowCount; i++) {
            const left = Math.round(Math.random() * 98);
            const dur = (9 + Math.random() * 7).toFixed(1);
            const delay = (Math.random() * 9).toFixed(1);
            flakes.push(`<span class="ambient-particle snow-flake" style="left:${left}%;font-size:13px;animation-duration:${dur}s;animation-delay:-${delay}s;">❄️</span>`);
        }
        weatherBg.innerHTML = flakes.join('');
    } else {
        // Дневные солнечные лучи
        weatherBg.innerHTML = `
            <div class="day-sunbeam" style="left:12%;"></div>
            <div class="day-sunbeam" style="left:58%;animation-delay:-2.5s;"></div>
        `;
    }
}

async function syncAutomatedOutdoorWeather() {
    const refTime = getReferenceLocalTime();
    const refHour = refTime.getUTCHours();
    const seasonKey = detectSeasonByDate();

    detectedGeoWeather.season = seasonKey;
    detectedGeoWeather.isNight = (refHour >= 20 || refHour < 6);
    detectedGeoWeather.weather = detectedGeoWeather.isNight ? 'fireflies' : 'clear';
    applyAutomatedAtmosphereState();

    try {
        const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${_METEO_SYNC_LAT}&longitude=${_METEO_SYNC_LON}&current=weather_code,is_day,precipitation,rain,showers,snowfall&timezone=Europe%2FMoscow`;
        const wRes = await fetch(wUrl, { cache: 'no-store' });
        if (wRes.ok) {
            const wData = await wRes.json();
            const cur = (wData && wData.current) || {};
            const code = Number(cur.weather_code) || 0;
            if (typeof cur.is_day === 'number') {
                detectedGeoWeather.isNight = (cur.is_day === 0);
            }
            const isRaining = (
                Number(cur.rain) > 0 ||
                Number(cur.showers) > 0 ||
                (code >= 51 && code <= 67) ||
                (code >= 80 && code <= 82) ||
                (code >= 95 && code <= 99)
            );
            const isSnowing = (
                Number(cur.snowfall) > 0 ||
                (code >= 71 && code <= 77) ||
                (code >= 85 && code <= 86)
            );

            let rawWeather = detectedGeoWeather.isNight ? 'fireflies' : 'clear';
            if (isSnowing) {
                rawWeather = (seasonKey === 'winter') ? 'snow' : 'rain';
            } else if (isRaining) {
                rawWeather = 'rain';
            }
            detectedGeoWeather.weather = harmonizeWeatherWithSeason(rawWeather, seasonKey, detectedGeoWeather.isNight);
            applyAutomatedAtmosphereState();
        }
    } catch (e) {}
}

function initAutomatedAtmosphereEngine() {
    // Полный запрет ручного выбора сезона или погоды: всё работает строго автоматически
    try {
        localStorage.removeItem('taka_selected_season');
        localStorage.removeItem('taka_weather_vibe_mode');
    } catch (e) {}

    syncAutomatedOutdoorWeather();
    setInterval(syncAutomatedOutdoorWeather, 10 * 60 * 1000);
}

function openPaymentGuideModal(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const modal = document.getElementById('guideModal');
    if (modal) {
        modal.classList.add('active');
        trackGoal('open_payment_guide');
    }
}
window.openPaymentGuideModal = openPaymentGuideModal;

// --- COOKIE И АНОНИМНЫЙ ПРОФИЛЬ ---
function setCookie(name, value, days = 365) {
    try {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    } catch (e) {}
}

function getCookie(name) {
    try {
        const match = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent(name).replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
        return null;
    }
}

function computeBrowserFingerprint() {
    try {
        const nav = window.navigator || {};
        const scr = window.screen || {};
        const tz = (Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
        const raw = [
            nav.language || '', nav.platform || '', nav.hardwareConcurrency || '',
            nav.deviceMemory || '', scr.width || 0, scr.height || 0, scr.colorDepth || 0, tz
        ].join('|');
        let hash = 2166136261;
        for (let i = 0; i < raw.length; i++) {
            hash ^= raw.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return 'fp' + (hash >>> 0).toString(36);
    } catch (e) {
        return 'fp0';
    }
}

function getOrCreateUserUid() {
    let uid = null;
    try { uid = localStorage.getItem(ANON_USER_UID_KEY) || getCookie(ANON_USER_UID_KEY); } catch (e) {}
    if (!uid || typeof uid !== 'string' || uid.length < 6) {
        const fp = computeBrowserFingerprint();
        const rand = Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
        uid = `u_${fp}_${rand}`;
    }
    try { localStorage.setItem(ANON_USER_UID_KEY, uid); } catch (e) {}
    setCookie(ANON_USER_UID_KEY, uid, 365);
    return uid;
}

const CURRENT_USER_UID = getOrCreateUserUid();

let votesFileMap = {};
let votesCache = {};
let monthlySearchMap = {};
let missingQueriesMap = {};
let userVotedMap = {};
let pendingVotesQueue = [];
let questsState = { step1: true, step2: false, step3: false, step4: false };
let userFavoriteTags = {};
let userInteractionCount = 0;
let remangaPriorityCache = {};
let liveGoalStats = { current: 174, target: 200, left: 26, percent: 87 };

try { votesCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}'); } catch (e) { votesCache = {}; }
try { monthlySearchMap = JSON.parse(localStorage.getItem(LOCAL_SEARCH_COUNT_KEY) || '{}'); } catch (e) { monthlySearchMap = {}; }
try { missingQueriesMap = JSON.parse(localStorage.getItem(LOCAL_MISSING_LOG_KEY) || '{}'); } catch (e) { missingQueriesMap = {}; }
try { remangaPriorityCache = JSON.parse(localStorage.getItem(REMANGA_PRIORITY_CACHE_KEY) || '{}'); } catch (e) { remangaPriorityCache = {}; }
try { userInteractionCount = Number(localStorage.getItem(USER_INTERACTION_COUNT_KEY)) || 0; } catch (e) { userInteractionCount = 0; }

try {
    const fromLs = JSON.parse(localStorage.getItem(USER_VOTED_MAP_KEY) || '{}');
    const fromCookie = JSON.parse(getCookie(USER_VOTED_MAP_KEY) || '{}');
    userVotedMap = { ...fromCookie, ...fromLs };
} catch (e) {
    userVotedMap = {};
}

try {
    pendingVotesQueue = JSON.parse(localStorage.getItem(PENDING_VOTES_KEY) || '[]');
    if (!Array.isArray(pendingVotesQueue)) pendingVotesQueue = [];
} catch (e) {
    pendingVotesQueue = [];
}

try {
    const savedQuests = JSON.parse(localStorage.getItem(QUESTS_STATE_KEY) || '{}');
    questsState = { step1: true, step2: Boolean(savedQuests.step2), step3: Boolean(savedQuests.step3), step4: Boolean(savedQuests.step4) };
} catch (e) {}

try {
    const rawTags = JSON.parse(localStorage.getItem(USER_TAG_PREFS_KEY) || '{}');
    userFavoriteTags = {};
    if (rawTags && typeof rawTags === 'object') {
        Object.entries(rawTags).forEach(([k, v]) => {
            const migrated = LEGACY_TAG_MIGRATION[k] || k;
            if (READER_TAGS_DICTIONARY[migrated]) {
                userFavoriteTags[migrated] = Number(v) || 1;
            }
        });
    }
} catch (e) {
    userFavoriteTags = {};
}

function saveUserTagPrefs() {
    try {
        localStorage.setItem(USER_TAG_PREFS_KEY, JSON.stringify(userFavoriteTags));
        localStorage.setItem(USER_INTERACTION_COUNT_KEY, String(userInteractionCount));
    } catch (e) {}
    if (isForYouStripOpen) {
        renderTopForYouStrip();
    }
}

function recordUserTagInterest(item, weight = 1) {
    userInteractionCount += 1;
    if (item && Array.isArray(item.genres)) {
        item.genres.forEach(g => {
            if (READER_TAGS_DICTIONARY[g]) {
                userFavoriteTags[g] = (Number(userFavoriteTags[g]) || 0) + weight;
            }
        });
    }
    saveUserTagPrefs();
}

function getActivePreferredTags() {
    return Object.keys(userFavoriteTags)
        .filter(k => READER_TAGS_DICTIONARY[k] && Number(userFavoriteTags[k]) > 0)
        .sort((a, b) => Number(userFavoriteTags[b]) - Number(userFavoriteTags[a]));
}

function getSafeVoteKey(id) {
    return 'v_' + String(id || 'unknown').replace(/[^a-zA-Z0-9]/g, '');
}

function normalizeTitleForMatch(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\[\s*\d+\s*[-—–]\s*\d+[^\]]*\]/g, ' ')
        .replace(/\b(?:глав[аы]?|гл\.?|часть|сезон|все\s*главы)\b/g, ' ')
        .replace(/\b\d+\s*[-—–]\s*\d+\b/g, ' ')
        .replace(/[^a-zа-я0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function stemRussianWordClient(word) {
    const w = String(word || '').toLowerCase().replace(/ё/g, 'е').trim();
    if (w.length <= 3) return w;
    if (w === 'тени' || w === 'тень' || w === 'теней' || w === 'тенью') return 'тен';
    const s = w.replace(/(?:ами|ями|ого|его|ому|ему|иях|иям|ией|ии|ия|ий|ый|ой|ая|яя|ое|ее|ые|ие|ов|ев|ей|ам|ям|ах|ях|ом|ем|ую|юю|ью|а|я|ы|и|е|у|ю|ь)$/i, '');
    return s.length >= 3 ? s : w.slice(0, 3);
}

function resolveCanonicalTitleClient(title) {
    const norm = normalizeTitleForMatch(title);
    if (!norm) return String(title || 'title');
    for (const group of CLIENT_SYNONYM_GROUPS) {
        const normGroup = group.map(x => normalizeTitleForMatch(x));
        if (normGroup.includes(norm)) {
            return group[0];
        }
        for (const syn of normGroup) {
            if (syn.length > 4 && (norm.startsWith(syn) || syn.startsWith(norm) || norm.includes(syn))) {
                return group[0];
            }
        }
    }
    return norm;
}

function makeCleanEnglishTag(rawTitleOrTag) {
    if (!rawTitleOrTag) return 'catalog_item';
    let str = String(rawTitleOrTag).trim();
    if (str.includes(';')) {
        const parts = str.split(';').map(p => p.trim()).filter(Boolean);
        str = parts.find(p => p.startsWith('title_')) || parts[2] || parts[0] || str;
    }
    str = str.replace(/^title_/, '');

    const canonical = resolveCanonicalTitleClient(str);
    const lower = String(canonical || str).toLowerCase().replace(/ё/g, 'е');

    let out = '';
    for (let i = 0; i < lower.length; i++) {
        const ch = lower[i];
        if (CYR_TO_LAT_MAP[ch] !== undefined) {
            out += CYR_TO_LAT_MAP[ch];
        } else if (/[a-z0-9]/.test(ch)) {
            out += ch;
        } else {
            out += '_';
        }
    }

    return out.replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'manga_title';
}

function parseRemangaTypeField(typeField) {
    if (typeField === null || typeField === undefined) return null;
    if (typeof typeField === 'object') {
        const tId = typeField.id;
        const tStr = `${typeField.rus_name || ''} ${typeField.name || ''} ${typeField.label || ''}`.toLowerCase();
        if (tStr.includes('маньхуа') || tStr.includes('manhua') || tId === 2) return 'manhua';
        if (tStr.includes('манхва') || tStr.includes('manhwa') || tId === 1) return 'manhwa';
        if (tStr.includes('манга') || tStr.includes('manga') || tId === 0) return 'manga';
    } else if (typeof typeField === 'number') {
        if (typeField === 0) return 'manga';
        if (typeField === 1) return 'manhwa';
        if (typeField === 2) return 'manhua';
    } else {
        const tStr = String(typeField).toLowerCase();
        if (tStr.includes('маньхуа') || tStr.includes('manhua')) return 'manhua';
        if (tStr.includes('манхва') || tStr.includes('manhwa')) return 'manhwa';
        if (tStr.includes('манга') || tStr.includes('manga')) return 'manga';
    }
    return null;
}

// Определение типа манги (Приоритет №1 — база ReManga) и общего числа глав на просторах интернета
function detectClientTagsTypeAndInternetChapters(title, itemObj = {}) {
    const canonical = resolveCanonicalTitleClient(title);
    const voicedCh = Number(itemObj.chapters) || 0;

    if (REMANGA_VERIFIED_DB[canonical]) {
        const db = REMANGA_VERIFIED_DB[canonical];
        const cached = remangaPriorityCache[canonical] || {};
        return {
            tags: [...db.tags],
            contentType: cached.type || db.type,
            internetChapters: Math.max(voicedCh, Number(cached.internet_chapters) || 0, Number(itemObj.internet_chapters) || 0, Number(db.internet_chapters) || 0)
        };
    }

    if (remangaPriorityCache[canonical] && CONTENT_TYPE_LABELS[remangaPriorityCache[canonical].type]) {
        const cached = remangaPriorityCache[canonical];
        const validTags = Array.isArray(cached.tags) && cached.tags.length > 0 ? cached.tags : ['фэнтези'];
        return {
            tags: validTags.slice(0, 3),
            contentType: cached.type,
            internetChapters: Math.max(voicedCh, Number(cached.internet_chapters) || 0, Number(itemObj.internet_chapters) || 0)
        };
    }

    if (itemObj.remanga_verified_v3 && CONTENT_TYPE_LABELS[itemObj.content_type]) {
        const validTags = (itemObj.genres || [])
            .map(g => LEGACY_TAG_MIGRATION[g] || g)
            .filter(g => READER_TAGS_DICTIONARY[g]);
        return {
            tags: validTags.length > 0 ? validTags.slice(0, 3) : ['фэнтези'],
            contentType: itemObj.content_type,
            internetChapters: Math.max(voicedCh, Number(itemObj.internet_chapters) || 0)
        };
    }

    const t = ` ${canonical} ${String(title || '').toLowerCase().replace(/ё/g, 'е')} `;
    const tags = [];

    for (const [tagKey, regex] of CLIENT_TAG_REGEX_RULES) {
        if (regex.test(t) && !tags.includes(tagKey)) {
            tags.push(tagKey);
        }
    }

    if (tags.length === 0 && Array.isArray(itemObj.genres)) {
        itemObj.genres.forEach(rawG => {
            const g = LEGACY_TAG_MIGRATION[rawG] || rawG;
            if (READER_TAGS_DICTIONARY[g] && !tags.includes(g)) {
                tags.push(g);
            }
        });
    }

    if (tags.length === 0) {
        tags.push('фэнтези');
    }

    const contentType = CONTENT_TYPE_LABELS[itemObj.content_type] ? itemObj.content_type : 'manhwa';
    const internetChapters = Math.max(voicedCh, Number(itemObj.internet_chapters) || 0);

    return {
        tags: tags.slice(0, 3),
        contentType,
        internetChapters
    };
}

// Динамическая сверка ВСЕХ тайтлов с сайтом ReManga (Приоритет №1 для типа манги и общего числа глав в интернете)
async function enrichCatalogWithRemangaPriority() {
    if (!Array.isArray(allItems) || allItems.length === 0) return;

    let anyChanged = false;

    for (const item of allItems) {
        const canonical = resolveCanonicalTitleClient(item.title);
        const dbEntry = REMANGA_VERIFIED_DB[canonical];
        const cached = remangaPriorityCache[canonical];

        // Если уже сверено с ReManga в этой сессии и есть актуальное число глав > 0 — пропускаем сетевой запрос
        if (cached && cached.remanga_checked && CONTENT_TYPE_LABELS[cached.type] && Number(cached.internet_chapters) >= Number(item.chapters || 0)) {
            continue;
        }

        const searchQuery = (dbEntry && dbEntry.remanga_query) ? dbEntry.remanga_query : item.title;
        const normQ = normalizeTitleForMatch(searchQuery);
        const qStems = normQ.split(' ').filter(w => w.length >= 3).map(stemRussianWordClient);

        try {
            const rRes = await fetch(`https://api.remanga.org/api/search/?query=${encodeURIComponent(searchQuery)}&count=6`);
            if (rRes.ok) {
                const rData = await rRes.json();
                const list = (rData && Array.isArray(rData.content)) ? rData.content : [];

                let bestHit = null;
                let bestScore = -1;

                list.forEach((cand, idx) => {
                    if (!cand || typeof cand !== 'object') return;
                    const rName = normalizeTitleForMatch(cand.rus_name || '');
                    const mName = normalizeTitleForMatch(cand.main_name || '');
                    const eName = normalizeTitleForMatch(cand.en_name || '');
                    const aName = normalizeTitleForMatch(cand.another_name || '');
                    const combined = `${rName} ${mName} ${eName} ${aName}`.trim();
                    const candStems = combined.split(' ').filter(w => w.length >= 3).map(stemRussianWordClient);

                    if (rName === normQ || mName === normQ) {
                        bestHit = cand;
                        bestScore = 100;
                        return;
                    }

                    const matchedCount = qStems.filter(st => candStems.some(cs => cs.includes(st) || st.includes(cs))).length;
                    const score = matchedCount * 10 - idx;
                    if (qStems.length > 0 && matchedCount >= Math.max(1, qStems.length - 1) && score > bestScore) {
                        bestScore = score;
                        bestHit = cand;
                    }
                });

                if (!bestHit && list.length === 1) {
                    bestHit = list[0];
                }

                if (bestHit) {
                    const rmType = parseRemangaTypeField(bestHit.type) || (dbEntry && dbEntry.type) || item.content_type;
                    const rmChapters = Number(bestHit.count_chapters || bestHit.total_chapters || 0);
                    const finalInternetCh = Math.max(
                        Number(item.chapters) || 0,
                        Number(item.internet_chapters) || 0,
                        rmChapters
                    );

                    const mappedTags = [...(item.genres || [])];
                    ['genres', 'categories', 'tags'].forEach(f => {
                        if (Array.isArray(bestHit[f])) {
                            bestHit[f].forEach(el => {
                                const name = typeof el === 'object' ? (el.name || el.rus_name || '') : String(el || '');
                                const low = name.toLowerCase().replace(/ё/g, 'е').trim();
                                const mapped = RU_EN_TAG_MAPPING[low];
                                if (mapped && !mappedTags.includes(mapped)) {
                                    mappedTags.push(mapped);
                                }
                            });
                        }
                    });

                    const typeChanged = rmType && rmType !== item.content_type;
                    const chChanged = finalInternetCh !== item.internet_chapters;

                    if (rmType) item.content_type = rmType;
                    item.internet_chapters = finalInternetCh;
                    if (mappedTags.length > 0) item.genres = mappedTags.slice(0, 3);

                    remangaPriorityCache[canonical] = {
                        type: item.content_type,
                        internet_chapters: item.internet_chapters,
                        tags: item.genres,
                        remanga_checked: true
                    };

                    if (typeChanged || chChanged) {
                        anyChanged = true;
                        updateCardLiveStatsInDom(item);
                    }
                }
            }
        } catch (e) {}

        await new Promise(r => setTimeout(r, 150));
    }

    try { localStorage.setItem(REMANGA_PRIORITY_CACHE_KEY, JSON.stringify(remangaPriorityCache)); } catch (e) {}

    if (anyChanged) {
        updateTabCountersAndBanners();
        if (activeContentTypeFilter !== 'all') {
            applyFilters();
        } else {
            updateFilterSummaryBar();
        }
    }
}

function updateCardLiveStatsInDom(item) {
    if (!item || !item.id) return;
    const voicedCh = Number(item.chapters) || 0;
    const internetCh = Math.max(voicedCh, Number(item.internet_chapters) || voicedCh);
    const ratioText = voicedCh > 0 ? `${voicedCh} / ${internetCh} гл.` : 'В ленте';
    const pct = (internetCh > 0 && voicedCh > 0) ? Math.min(100, Math.max(8, Math.round((voicedCh / internetCh) * 100))) : 100;

    document.querySelectorAll(`[data-ratio-id="${item.id}"]`).forEach(el => {
        el.textContent = ratioText;
    });
    document.querySelectorAll(`[data-vp-fill-id="${item.id}"]`).forEach(el => {
        el.style.width = `${pct}%`;
    });
    document.querySelectorAll(`[data-floating-ch-id="${item.id}"]`).forEach(el => {
        el.textContent = voicedCh > 0 ? `Озвучено: ${voicedCh}/${internetCh} гл.` : 'В ленте';
    });
    document.querySelectorAll(`[data-type-badge-id="${item.id}"]`).forEach(el => {
        el.dataset.type = item.content_type;
        el.textContent = CONTENT_TYPE_LABELS[item.content_type] || '🇰🇷 Манхва';
    });
}

function normalizeCoverUrl(url) {
    if (!url || typeof url !== 'string') {
        return 'https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка';
    }
    if (url.includes('images.boosty.to/image/')) {
        return url.split('?')[0];
    }
    return url;
}

function cleanDisplayTitle(rawTitle) {
    if (!rawTitle) return 'Без названия';
    return String(rawTitle)
        .replace(/\[[^\]]*$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function appendBoostyUtm(url, titleOrTag) {
    const cleanEngTag = makeCleanEnglishTag(titleOrTag);
    const baseUrl = url || 'https://boosty.to/darktaka';
    try {
        const parsed = new URL(baseUrl, window.location.origin);
        ['from', 'title', 'month', 'utm_source', 'utm_medium', 'utm_content', 'utm_term'].forEach(k => {
            parsed.searchParams.delete(k);
        });
        parsed.searchParams.set('utm_campaign', cleanEngTag);
        return parsed.toString();
    } catch (e) {
        const stripped = baseUrl.split('&utm_')[0].split('?utm_')[0];
        const sep = stripped.includes('?') ? '&' : '?';
        return `${stripped}${sep}utm_campaign=${encodeURIComponent(cleanEngTag)}`;
    }
}

// --- ВЫБОР КОНКРЕТНЫХ БЕСПЛАТНЫХ ГЛАВ (ДЛЯ ТАЙТЛОВ ТИПА «ТЕНИ», «ДИНАСТИЯ ТАН» И ДР., ГДЕ НЕСКОЛЬКО БЕСПЛАТНЫХ ПОСТОВ) ---
function buildFreePostsListForItem(item) {
    if (!item) return [];
    if (Array.isArray(item.free_posts) && item.free_posts.length > 0) {
        return item.free_posts;
    }

    // Если в старом data.json массив free_posts ещё не был сгенерирован скриптом update.py,
    // проверяем, сколько бесплатных глав/выпусков у тайтла
    const freeCh = Number(item.free_chapters) || 0;
    const normTitle = normalizeTitleForMatch(item.title);
    const isKnownMultiFreeSeries = (
        normTitle.includes('тен') ||
        normTitle.includes('династ') ||
        normTitle.includes('тан') ||
        Number(item.free_posts_count) > 1
    );

    const feedFreeBase = item.link
        ? (item.link + (item.link.includes('?') ? '&' : '?') + 'onlyAllowed=true')
        : 'https://boosty.to/darktaka';

    if (isKnownMultiFreeSeries && freeCh > 1) {
        // Разбиваем бесплатные главы на выпуски для удобного выбора конкретного поста в модальном окне
        const step = freeCh <= 4 ? 1 : (freeCh <= 12 ? Math.ceil(freeCh / 3) : Math.ceil(freeCh / 4));
        const generated = [];
        let idx = 1;
        for (let start = 1; start <= freeCh; start += step) {
            const end = Math.min(freeCh, start + step - 1);
            const rangeStr = start === end ? `${start} глава` : `${start}-${end} главы`;
            const targetLink = (idx === 1 && item.free_post_link && item.free_post_link.includes('/posts/'))
                ? item.free_post_link
                : feedFreeBase;
            generated.push({
                post_id: `${item.id}_free_${idx}`,
                title: `${item.title} [${rangeStr}]`,
                range: `${rangeStr} (Бесплатный выпуск #${idx})`,
                date: item.last_update || 'На Boosty',
                link: targetLink
            });
            idx += 1;
        }
        if (generated.length > 1) return generated;
    }

    if (item.has_free || freeCh > 0) {
        return [{
            post_id: item.free_post_id || `${item.id}_free_1`,
            title: item.title,
            range: item.free_text || `1-${freeCh || 1} гл.`,
            date: item.last_update || 'На Boosty',
            link: item.free_post_link || feedFreeBase
        }];
    }

    return [];
}

function openFreeChaptersAction(item, event) {
    if (!item) return;
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    completeQuestStep(2);
    trackGoal('click_title', {
        title: item.title,
        metric_tag: item.metric_tag,
        level: item.tier_level,
        item: item
    });

    const freePosts = buildFreePostsListForItem(item);

    // ВАЖНО: Если у тайтла больше одного бесплатного поста (например, «Тени», «Династия Тан» и др.) —
    // открываем модальное окно выбора конкретных бесплатных глав!
    if (freePosts.length > 1) {
        const modal = document.getElementById('freePostsModal');
        const titleEl = document.getElementById('freePostsModalTitle');
        const subEl = document.getElementById('freePostsModalSub');
        const listEl = document.getElementById('freePostsListContainer');

        if (modal && listEl) {
            if (titleEl) titleEl.textContent = `🎁 Выбор бесплатных глав: «${item.title}»`;
            if (subEl) subEl.textContent = `У тайтла «${item.title}» доступно несколько бесплатных выпусков (${freePosts.length} шт.) — выбери, какие именно бесплатные главы открыть:`;

            listEl.innerHTML = freePosts.map((fp, idx) => {
                const postHref = appendBoostyUtm(fp.link || `https://boosty.to/darktaka/posts/${fp.post_id}`, item.metric_tag);
                return `
                    <a href="${postHref}" target="_blank" rel="noopener" class="modal-option highlight-orange-btn" onclick="document.getElementById('freePostsModal').classList.remove('active')">
                        <div class="option-title">🎬 На ролик с конкретными главами: ${fp.range || `Выпуск #${idx + 1}`} ↗</div>
                        <div class="option-desc">Опубликовано: ${fp.date || 'На Boosty'} • Прямой переход к выбранным бесплатным главам</div>
                    </a>
                `;
            }).join('');

            modal.classList.add('active');
            return;
        }
    }

    // Если бесплатный пост только ОДИН — никакого модального окна не вылезает, сразу открываем этот конкретный пост!
    const singleFreeUrl = (freePosts.length === 1 && freePosts[0].link)
        ? freePosts[0].link
        : (item.free_post_link || item.link);

    window.open(appendBoostyUtm(singleFreeUrl, item.metric_tag), '_blank', 'noopener');
}

// --- БЛОК ПОСЛЕДНИХ НОВОСТЕЙ ИЗ ТЕЛЕГРАМ-КАНАЛА С РАСКРЫТИЕМ ФОТО И ТЕКСТА НА ЭКРАН ---
function renderTelegramNewsSection(tgNewsList) {
    const section = document.getElementById('tgNewsSection');
    const listEl = document.getElementById('tgNewsList');
    if (!section || !listEl) return;

    if (!Array.isArray(tgNewsList) || tgNewsList.length === 0) {
        section.style.display = 'none';
        return;
    }

    listEl.innerHTML = tgNewsList.slice(0, 4).map((post, idx) => {
        const thumbHtml = post.image
            ? `<img src="${post.image}" alt="Фото поста" class="tg-news-thumb" loading="lazy" referrerpolicy="no-referrer">`
            : `<div class="tg-news-thumb" style="display:flex;align-items:center;justify-content:center;font-size:20px;">📢</div>`;
        return `
            <button type="button" class="tg-news-card" data-idx="${idx}">
                ${thumbHtml}
                <div class="tg-news-info">
                    <span class="tg-news-date-badge">📅 ${post.date || 'Новость канала'} • Нажми чтобы раскрыть</span>
                    <div class="tg-news-snippet">${post.short_text || ''}</div>
                </div>
            </button>
        `;
    }).join('');

    listEl.querySelectorAll('.tg-news-card').forEach(btn => {
        btn.addEventListener('click', () => {
            const post = tgNewsList[Number(btn.dataset.idx)];
            if (post) openTgNewsLightbox(post);
        });
    });

    section.style.display = 'block';
}

function openTgNewsLightbox(post) {
    const modal = document.getElementById('tgNewsLightboxModal');
    const imgWrap = document.getElementById('tgLightboxImageWrap');
    const imgEl = document.getElementById('tgLightboxImg');
    const dateEl = document.getElementById('tgLightboxDate');
    const linkEl = document.getElementById('tgLightboxOriginalLink');
    const textEl = document.getElementById('tgLightboxText');
    if (!modal) return;

    if (post.image && imgWrap && imgEl) {
        imgEl.src = post.image;
        imgWrap.style.display = 'flex';
    } else if (imgWrap) {
        imgWrap.style.display = 'none';
    }

    if (dateEl) dateEl.textContent = `📅 Опубликовано в ТГ-канале: ${post.date || 'Свежий пост'}`;
    if (linkEl) linkEl.href = post.link || 'https://t.me/PoteranSusheter';
    if (textEl) textEl.textContent = post.full_text || post.short_text || '';

    modal.classList.add('active');
}

function incrementMonthlyTitlePopularity(item, weight = 1) {
    if (!item || !item.id) return;
    const strId = String(item.id);
    const nextVal = (Number(monthlySearchMap[strId]) || Number(item.monthly_searches) || 0) + weight;
    monthlySearchMap[strId] = nextVal;
    item.monthly_searches = nextVal;

    try { localStorage.setItem(LOCAL_SEARCH_COUNT_KEY, JSON.stringify(monthlySearchMap)); } catch (e) {}

    const safeKey = item.vote_key || getSafeVoteKey(item.id);
    fetch(`https://api.counterapi.dev/v1/${SEARCH_NAMESPACE}/${safeKey}/up`, {
        method: 'GET',
        cache: 'no-store'
    }).then(r => r.ok ? r.json() : null).then(d => {
        if (d) {
            const apiVal = typeof d.count === 'number' ? d.count : (typeof d.value === 'number' ? d.value : 0);
            if (apiVal > (monthlySearchMap[strId] || 0)) {
                monthlySearchMap[strId] = apiVal;
                item.monthly_searches = apiVal;
                try { localStorage.setItem(LOCAL_SEARCH_COUNT_KEY, JSON.stringify(monthlySearchMap)); } catch (e) {}
            }
        }
    }).catch(() => {});
}

function recordMissingSearchQuery(rawQuery) {
    const cleanQ = String(rawQuery || '').trim().replace(/\s+/g, ' ');
    if (cleanQ.length < 3) return;

    const normQ = normalizeTitleForMatch(cleanQ);
    if (!normQ || normQ.length < 3) return;

    const existsInCatalog = allItems.some(it =>
        normalizeTitleForMatch(it.title).includes(normQ) ||
        normQ.includes(normalizeTitleForMatch(it.title))
    );
    if (existsInCatalog) return;

    const engSlug = makeCleanEnglishTag(cleanQ);
    const entry = missingQueriesMap[normQ] || {
        query: cleanQ,
        slug: engSlug,
        count: 0,
        month: CURRENT_MONTH_KEY,
        last_searched: new Date().toISOString()
    };
    entry.count += 1;
    entry.last_searched = new Date().toISOString();
    missingQueriesMap[normQ] = entry;

    try { localStorage.setItem(LOCAL_MISSING_LOG_KEY, JSON.stringify(missingQueriesMap)); } catch (e) {}

    fetch(`https://api.counterapi.dev/v1/${MISSING_NAMESPACE}/q_${engSlug}/up`, {
        method: 'GET',
        cache: 'no-store'
    }).catch(() => {});

    if (typeof window.ym === 'function') {
        window.ym(YM_ID, 'reachGoal', 'missing_title_search', {
            title: cleanQ,
            tag: engSlug,
            month: CURRENT_MONTH_KEY
        });
    }
}

function trackGoal(goalName, payload = {}) {
    try {
        const cleanTitle = cleanDisplayTitle(payload.title || payload.metric_tag || 'Action');
        const engTag = makeCleanEnglishTag(payload.metric_tag || cleanTitle);
        const levelNum = Number(payload.level) || 1;

        if (payload.item) {
            recordUserTagInterest(payload.item, goalName === 'click_want_proda' ? 2 : 1);
            incrementMonthlyTitlePopularity(payload.item, 1);
            if (typeof updateCatWidgetContext === 'function') {
                updateCatWidgetContext(payload.item);
            }
        }

        if (typeof window.ym === 'function') {
            window.ym(YM_ID, 'setUserID', CURRENT_USER_UID);
            window.ym(YM_ID, 'reachGoal', goalName, {
                title: cleanTitle,
                utm_campaign: engTag,
                month: CURRENT_MONTH_KEY,
                level: levelNum
            });
        }
    } catch (e) {}
}

function trackSubConversion(payload = {}) {
    try {
        completeQuestStep(4);
        const cleanTitle = cleanDisplayTitle(payload.title || 'Sub');
        const engTag = makeCleanEnglishTag(payload.metric_tag || cleanTitle);
        const levelNum = Number(payload.level) || 1;
        const priceRub = levelNum === 3 ? 1000 : (levelNum === 2 ? 500 : 250);

        trackGoal('click_subscribe', {
            title: cleanTitle,
            metric_tag: engTag,
            level: levelNum
        });

        if (typeof window.ym === 'function') {
            window.ym(YM_ID, 'reachGoal', 'sub_conversion', {
                title: cleanTitle,
                utm_campaign: engTag,
                month: CURRENT_MONTH_KEY,
                price: priceRub
            });
        }
    } catch (e) {}
}

// --- ЕЖЕНЕДЕЛЬНЫЕ ПАКИ ЗАДАНИЙ ---
function getCurrentWeeklyQuestPack() {
    const month = now.getUTCMonth() + 1;
    const monthPacks = WEEKLY_QUEST_PACKS[month] || WEEKLY_QUEST_PACKS[11];
    return monthPacks[CURRENT_WEEK_INDEX] || monthPacks[0];
}

function saveQuestsState() {
    try { localStorage.setItem(QUESTS_STATE_KEY, JSON.stringify(questsState)); } catch (e) {}
}

function completeQuestStep(stepNum) {
    const key = `step${stepNum}`;
    if (!questsState[key]) {
        questsState[key] = true;
        saveQuestsState();
        renderQuestsUI();
    }
}

function renderQuestsUI() {
    const activePack = getCurrentWeeklyQuestPack();
    const packBadgeEl = document.getElementById('wqPackTitleBadge');
    if (packBadgeEl && activePack.packTitle) {
        packBadgeEl.textContent = activePack.packTitle;
    }

    [2, 3, 4].forEach(num => {
        const cfg = activePack[`step${num}`];
        const tEl = document.getElementById(`questTitle${num}`);
        const dEl = document.getElementById(`questDesc${num}`);
        if (cfg && tEl && dEl) {
            tEl.textContent = cfg.title;
            dEl.textContent = cfg.desc;
        }
    });

    const doneCount = [questsState.step1, questsState.step2, questsState.step3, questsState.step4].filter(Boolean).length;
    const percent = Math.round((doneCount / 4) * 100);

    const badgeEl = document.getElementById('headerQuestProgressBadge');
    const statusEl = document.getElementById('wqStatusText');
    const barEl = document.getElementById('wqProgressBar');

    if (badgeEl) badgeEl.textContent = `${doneCount}/4`;
    if (barEl) barEl.style.width = `${percent}%`;
    if (statusEl) {
        statusEl.textContent = doneCount >= 4
            ? '🎉 Все 4 задания этой недели выполнены! Спасибо за поддержку семьи ТАКА!'
            : `Выполнено ${doneCount} из 4 • Нажми на любую задачу — выполнится в 1 клик!`;
    }

    [2, 3, 4].forEach(num => {
        const stepEl = document.getElementById(`questStep${num}`);
        const iconEl = document.getElementById(`questIcon${num}`);
        if (stepEl && questsState[`step${num}`]) {
            stepEl.classList.add('done');
            if (iconEl) iconEl.textContent = '✅';
        }
    });
}

// --- СИНХРОНИЗАЦИЯ ВЫБОРА УРОВНЯ ПОДПИСКИ (КНОПКИ ПК + ПОЛЗУНОК НА ТЕЛЕФОНЕ) ---
const TIER_SLIDER_STEPS = ['all', 'free', '1', '2'];

function selectTierLevelOption(tierValue) {
    activeTierTab = tierValue || 'all';
    const allBtn = document.getElementById('allTitlesMainBtn');
    const dropBtn = document.getElementById('tierDropdownBtn');
    const dropLabel = document.getElementById('tierDropdownBtnLabel');
    const dropMenu = document.getElementById('tierDropdownMenu');
    const tierRangeSlider = document.getElementById('tierFilterRangeSlider');

    if (dropMenu) {
        dropMenu.classList.remove('open');
        dropMenu.setAttribute('aria-hidden', 'true');
        dropMenu.querySelectorAll('.tier-menu-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.tier === activeTierTab);
        });
    }
    if (dropBtn) {
        dropBtn.classList.remove('open', 'active', 'active-free', 'active-gold');
        dropBtn.setAttribute('aria-expanded', 'false');
    }

    if (activeTierTab === 'all') {
        if (allBtn) allBtn.classList.add('active');
        if (dropLabel) dropLabel.textContent = '👑 Выбрать уровень подписки';
    } else {
        if (allBtn) allBtn.classList.remove('active');
        if (dropBtn) {
            if (activeTierTab === 'free') {
                dropBtn.classList.add('active-free');
                if (dropLabel) dropLabel.textContent = '🎁 Бесплатные главы';
                completeQuestStep(2);
            } else if (activeTierTab === '1') {
                dropBtn.classList.add('active');
                if (dropLabel) dropLabel.textContent = '🧡 1 ур. • 250 ₽';
            } else if (activeTierTab === '2') {
                dropBtn.classList.add('active-gold');
                if (dropLabel) dropLabel.textContent = '👑 2 ур. • 500 ₽';
            }
        }
    }

    // Синхронизируем мобильный ползунок и кнопки уровней подписки
    const stepIndex = Math.max(0, TIER_SLIDER_STEPS.indexOf(String(activeTierTab)));
    if (tierRangeSlider) {
        tierRangeSlider.value = String(stepIndex);
    }
    document.querySelectorAll('#mobileTierPillsTrack .mtfs-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.tier === String(activeTierTab));
    });

    updateResetFiltersBtnVisibility();
    applyFilters();
}

function initMobileSubscriptionSliders() {
    // 1. Ползунок карточек подписок в шапке на телефоне
    const track = document.getElementById('subBannersTrack');
    const subRange = document.getElementById('subBannersRangeSlider');
    const stepLabels = document.querySelectorAll('#mobileSubBannersSliderBox .mss-step-label');

    function updateSubHeaderActiveStep(idx) {
        stepLabels.forEach((btn, i) => {
            btn.classList.toggle('active', i === idx);
        });
    }

    if (track && subRange) {
        subRange.addEventListener('input', () => {
            const maxScroll = Math.max(1, track.scrollWidth - track.clientWidth);
            const pct = Number(subRange.value) / 100;
            track.scrollLeft = maxScroll * pct;
            const cardIdx = Math.min(2, Math.round(pct * 2));
            updateSubHeaderActiveStep(cardIdx);
        });

        track.addEventListener('scroll', () => {
            const maxScroll = Math.max(1, track.scrollWidth - track.clientWidth);
            const pct = Math.min(100, Math.max(0, Math.round((track.scrollLeft / maxScroll) * 100)));
            subRange.value = String(pct);
            const cardIdx = Math.min(2, Math.round((pct / 100) * 2));
            updateSubHeaderActiveStep(cardIdx);
        }, { passive: true });

        stepLabels.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.targetCard) || 0;
                const cards = track.querySelectorAll('.sub-btn-card');
                if (cards[idx]) {
                    const targetLeft = cards[idx].offsetLeft - track.offsetLeft;
                    track.scrollTo({ left: targetLeft, behavior: 'smooth' });
                }
                subRange.value = String(idx * 50);
                updateSubHeaderActiveStep(idx);
            });
        });
    }

    // 2. Ползунок выбора уровня подписки в фильтрах на телефоне
    const tierFilterRange = document.getElementById('tierFilterRangeSlider');
    if (tierFilterRange) {
        tierFilterRange.addEventListener('input', () => {
            const step = Number(tierFilterRange.value) || 0;
            const targetTier = TIER_SLIDER_STEPS[step] || 'all';
            selectTierLevelOption(targetTier);
        });
    }

    document.querySelectorAll('#mobileTierPillsTrack .mtfs-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            selectTierLevelOption(pill.dataset.tier || 'all');
        });
    });
}

function runLazyQuestAction(stepNumber) {
    const activePack = getCurrentWeeklyQuestPack();
    const stepCfg = activePack[`step${stepNumber}`] || {};
    const action = stepCfg.action || (stepNumber === 2 ? 'free' : (stepNumber === 3 ? 'vote' : 'reward'));

    completeQuestStep(stepNumber);

    if (action === 'free') {
        selectTierLevelOption('free');
    } else if (action === 'for_you') {
        isForYouStripOpen = true;
        const forYouBtn = document.getElementById('toggleForYouStripBtn');
        if (forYouBtn) forYouBtn.classList.add('active');
        if (getActivePreferredTags().length === 0) {
            userFavoriteTags['система'] = 2;
            userFavoriteTags['имба'] = 2;
        }
        saveUserTagPrefs();
        renderTopForYouStrip();
    } else if (action.startsWith('sort:')) {
        const sortKey = action.split(':')[1];
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.value = sortKey;
            applyFilters();
        }
    } else if (action.startsWith('genre:')) {
        const genreKey = action.split(':')[1];
        selectedGenres.clear();
        selectedGenres.add(genreKey);
        syncGenrePillsUI();
        applyFilters();
    } else if (action === 'lucky') {
        openLuckySingleRow();
    } else if (action === 'vote') {
        const unvotedTop = [...allItems]
            .sort((a, b) => (b.votes || 0) - (a.votes || 0))
            .find(i => !hasUserVoted(i.id)) || allItems[0];
        if (unvotedTop) {
            const btn = document.querySelector(`.vote-btn[data-id="${unvotedTop.id}"]`);
            handleVote(unvotedTop, btn);
        }
    } else {
        const qModal = document.getElementById('questsModal');
        if (qModal) qModal.classList.add('active');
    }
}

// --- ЛИНИЯ СЛУЧАЙНЫХ ТАЙТЛОВ («🎲 МНЕ ПОВЕЗЁТ!») — ОТКРЫВАЕТСЯ НА МЕСТЕ БЕЗ СКАЧКА ЭКРАНА ---
function openLuckySingleRow() {
    if (allItems.length === 0) return;
    const section = document.getElementById('luckyRowSection');
    const grid = document.getElementById('luckyRowGrid');
    if (!section || !grid) return;

    completeQuestStep(2);

    const pool = [...allItems];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosenFour = pool.slice(0, 4);

    grid.innerHTML = '';
    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0));
    const topMap = getTopThreeVoteMap();

    chosenFour.forEach((item, idx) => {
        const cardEl = createCatalogCardElement(item, maxTs, topMap, idx < 4);
        grid.appendChild(cardEl);
    });

    section.style.display = 'block';

    if (chosenFour[0]) {
        updateCatWidgetContext(chosenFour[0], false);
    }

    trackGoal('click_random_line', {
        title: 'Подборка Мне повезёт',
        metric_tag: 'lucky_row',
        level: 1
    });
}

// --- ПОЛОСКА «💖 ПО ВАШИМ ПРЕДПОЧТЕНИЯМ» (ОТКРЫВАЕТСЯ ТОЛЬКО ПО НАЖАТИЮ КНОПКИ, НЕ ВЫЛЕЗАЕТ ПРИ ЗАХОДЕ) ---
function renderTopForYouStrip() {
    const stripEl = document.getElementById('forYouTopStrip');
    const gridEl = document.getElementById('forYouRowGrid');
    const matchedTextEl = document.getElementById('forYouMatchedTagsText');
    const tagsListEl = document.getElementById('userPrefsTagsList');
    const triggerBtn = document.getElementById('toggleForYouStripBtn');
    if (!stripEl || !gridEl || allItems.length === 0) return;

    if (!isForYouStripOpen) {
        stripEl.style.display = 'none';
        if (triggerBtn) {
            triggerBtn.classList.remove('active');
            triggerBtn.setAttribute('aria-expanded', 'false');
        }
        return;
    }

    if (triggerBtn) {
        triggerBtn.classList.add('active');
        triggerBtn.setAttribute('aria-expanded', 'true');
    }

    const prefTags = getActivePreferredTags();
    const topPrefTags = prefTags.slice(0, 3);

    if (matchedTextEl) {
        if (topPrefTags.length > 0) {
            const labels = topPrefTags.map(t => READER_TAGS_DICTIONARY[t] || t).join(', ');
            matchedTextEl.textContent = `На основе ваших интересов: ${labels}`;
        } else {
            matchedTextEl.textContent = `Отметьте любимые жанры или нажимайте на тайтлы — подборка подстроится под вас`;
        }
    }

    if (tagsListEl) {
        tagsListEl.innerHTML = Object.entries(READER_TAGS_DICTIONARY).map(([tagKey, label]) => {
            const isSelected = prefTags.includes(tagKey);
            return `<button type="button" class="pref-tag-chip ${isSelected ? 'selected' : ''}" data-tag="${tagKey}">${label}</button>`;
        }).join('');

        tagsListEl.querySelectorAll('.pref-tag-chip').forEach(btn => {
            const tag = btn.dataset.tag;
            btn.addEventListener('click', () => {
                if (userFavoriteTags[tag] && Number(userFavoriteTags[tag]) > 0) {
                    delete userFavoriteTags[tag];
                } else {
                    userFavoriteTags[tag] = 3;
                    userInteractionCount = Math.max(userInteractionCount, 1);
                }
                saveUserTagPrefs();
            });
            btn.addEventListener('dblclick', (e) => {
                e.preventDefault();
                delete userFavoriteTags[tag];
                saveUserTagPrefs();
            });
        });
    }

    const recommended = [...allItems]
        .filter(item => prefTags.length === 0 || (Array.isArray(item.genres) && item.genres.some(g => prefTags.includes(g))))
        .sort((a, b) => {
            const scoreA = (a.genres || []).reduce((acc, g) => acc + (Number(userFavoriteTags[g]) || 0), 0) * 10 + (a.votes || 0);
            const scoreB = (b.genres || []).reduce((acc, g) => acc + (Number(userFavoriteTags[g]) || 0), 0) * 10 + (b.votes || 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
            return (b.timestamp || 0) - (a.timestamp || 0);
        })
        .slice(0, 4);

    gridEl.innerHTML = '';
    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0));
    const topMap = getTopThreeVoteMap();

    recommended.forEach((item, idx) => {
        const cardEl = createCatalogCardElement(item, maxTs, topMap, idx < 2);
        gridEl.appendChild(cardEl);
    });

    stripEl.style.display = 'block';
}

// --- МУЛЬТИВЫБОР ТЕГОВ И АЛФАВИТ В СГРУППИРОВАННОЙ ПАНЕЛИ ---
function syncGenrePillsUI() {
    const activeGenreBadge = document.getElementById('activeGenreLabelBadge');
    const clearSelectedBtn = document.getElementById('clearSelectedTagsBtn');

    document.querySelectorAll('#genrePillsRow .genre-pill').forEach(pill => {
        const g = pill.dataset.genre;
        pill.classList.toggle('active', selectedGenres.has(g));
    });

    if (activeGenreBadge) {
        if (selectedGenres.size === 1) {
            const onlyKey = Array.from(selectedGenres)[0];
            activeGenreBadge.style.display = 'inline-block';
            activeGenreBadge.textContent = READER_TAGS_DICTIONARY[onlyKey] || onlyKey;
        } else if (selectedGenres.size > 1) {
            activeGenreBadge.style.display = 'inline-block';
            activeGenreBadge.textContent = `${selectedGenres.size} тега`;
        } else {
            activeGenreBadge.style.display = 'none';
        }
    }

    if (clearSelectedBtn) {
        clearSelectedBtn.style.display = selectedGenres.size > 0 ? 'inline-block' : 'none';
    }

    updateResetFiltersBtnVisibility();
}

function updateResetFiltersBtnVisibility() {
    const resetBtn = document.getElementById('resetAllFiltersBtn');
    const searchInput = document.getElementById('searchInput');
    const hasSearch = Boolean(searchInput && searchInput.value.trim().length > 0);
    const hasAnyFilter = (
        activeTierTab !== 'all' ||
        selectedGenres.size > 0 ||
        activeContentTypeFilter !== 'all' ||
        activeLetterFilter !== 'all' ||
        hasSearch
    );
    if (resetBtn) {
        resetBtn.style.display = hasAnyFilter ? 'inline-flex' : 'none';
    }
}

function initTwoMainButtonsAndFilters() {
    const allBtn = document.getElementById('allTitlesMainBtn');
    const dropWrap = document.getElementById('tierDropdownWrap');
    const dropBtn = document.getElementById('tierDropdownBtn');
    const dropMenu = document.getElementById('tierDropdownMenu');

    if (allBtn) {
        allBtn.addEventListener('click', () => {
            selectTierLevelOption('all');
        });
    }

    if (dropBtn && dropMenu) {
        dropBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropMenu.classList.toggle('open');
            dropBtn.classList.toggle('open', isOpen);
            dropBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            dropMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        });

        dropMenu.querySelectorAll('.tier-menu-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                selectTierLevelOption(opt.dataset.tier || 'all');
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (dropWrap && !dropWrap.contains(e.target) && dropMenu) {
            dropMenu.classList.remove('open');
            if (dropBtn) dropBtn.classList.remove('open');
        }
    });

    const toggleGenresBtn = document.getElementById('toggleGenresBtn');
    const genresDrawer = document.getElementById('genrePillsDrawer');
    const alphaRow = document.getElementById('alphaPillsRow');
    const activeLetterBadge = document.getElementById('activeLetterBadge');

    if (alphaRow) {
        const buttonsHtml = [
            `<button type="button" class="alpha-pill active" data-letter="all">Все</button>`,
            ...RUSSIAN_ALPHABET.map(letter => `<button type="button" class="alpha-pill" data-letter="${letter}">${letter}</button>`)
        ].join('');
        alphaRow.innerHTML = buttonsHtml;

        alphaRow.querySelectorAll('.alpha-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const clickedLetter = btn.dataset.letter || 'all';
                if (activeLetterFilter === clickedLetter && clickedLetter !== 'all') {
                    activeLetterFilter = 'all';
                } else {
                    activeLetterFilter = clickedLetter;
                }
                alphaRow.querySelectorAll('.alpha-pill').forEach(b => b.classList.toggle('active', b.dataset.letter === activeLetterFilter));

                if (activeLetterBadge) {
                    if (activeLetterFilter !== 'all') {
                        activeLetterBadge.style.display = 'inline-block';
                        activeLetterBadge.textContent = `Буква: ${activeLetterFilter}`;
                    } else {
                        activeLetterBadge.style.display = 'none';
                    }
                }
                updateResetFiltersBtnVisibility();
                applyFilters();
            });
        });
    }

    if (toggleGenresBtn && genresDrawer) {
        toggleGenresBtn.addEventListener('click', () => {
            const isOpen = genresDrawer.classList.toggle('open');
            toggleGenresBtn.classList.toggle('open', isOpen);
            toggleGenresBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            genresDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        });
    }

    const resetAllGenrePill = document.getElementById('resetAllGenrePill');
    if (resetAllGenrePill) {
        resetAllGenrePill.addEventListener('click', () => {
            selectedGenres.clear();
            syncGenrePillsUI();
            applyFilters();
        });
    }

    const clearSelectedTagsBtn = document.getElementById('clearSelectedTagsBtn');
    if (clearSelectedTagsBtn) {
        clearSelectedTagsBtn.addEventListener('click', () => {
            selectedGenres.clear();
            syncGenrePillsUI();
            applyFilters();
        });
    }

    document.querySelectorAll('#genrePillsRow .genre-pill').forEach(pill => {
        const gKey = pill.dataset.genre;
        if (!gKey) return;

        let clickTimer = null;

        pill.addEventListener('click', (e) => {
            e.preventDefault();
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
                selectedGenres.delete(gKey);
                syncGenrePillsUI();
                applyFilters();
                return;
            }

            clickTimer = setTimeout(() => {
                clickTimer = null;
                if (selectedGenres.has(gKey)) {
                    selectedGenres.delete(gKey);
                } else {
                    selectedGenres.add(gKey);
                    if (READER_TAGS_DICTIONARY[gKey]) {
                        userInteractionCount += 1;
                        userFavoriteTags[gKey] = (Number(userFavoriteTags[gKey]) || 0) + 1;
                        saveUserTagPrefs();
                    }
                }
                syncGenrePillsUI();
                applyFilters();
            }, 170);
        });

        pill.addEventListener('dblclick', (e) => {
            e.preventDefault();
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }
            selectedGenres.delete(gKey);
            syncGenrePillsUI();
            applyFilters();
        });
    });

    const resetAllFiltersBtn = document.getElementById('resetAllFiltersBtn');
    if (resetAllFiltersBtn) {
        resetAllFiltersBtn.addEventListener('click', () => {
            selectedGenres.clear();
            activeContentTypeFilter = 'all';
            activeLetterFilter = 'all';
            const typeSel = document.getElementById('typeFilterSelect');
            if (typeSel) typeSel.value = 'all';
            const searchInput = document.getElementById('searchInput');
            const clearBtn = document.getElementById('clearSearchBtn');
            if (searchInput) searchInput.value = '';
            if (clearBtn) clearBtn.style.display = 'none';
            if (alphaRow) {
                alphaRow.querySelectorAll('.alpha-pill').forEach(b => b.classList.toggle('active', b.dataset.letter === 'all'));
            }
            if (activeLetterBadge) activeLetterBadge.style.display = 'none';
            syncGenrePillsUI();
            selectTierLevelOption('all');
        });
    }
}

function formatMonthKeyLabel(mKey) {
    const parts = String(mKey || '').split('_');
    if (parts.length === 2) {
        const y = parts[0];
        const mIdx = parseInt(parts[1], 10) - 1;
        if (MONTH_NAMES_RU[mIdx]) {
            return `${MONTH_NAMES_RU[mIdx]} ${y}`;
        }
    }
    return mKey;
}

function populateMonthStatsSelect() {
    const sel = document.getElementById('monthStatsSelect');
    if (!sel) return;

    const availableMonths = new Set([CURRENT_MONTH_KEY]);
    Object.keys(monthsArchiveData || {}).forEach(k => availableMonths.add(k));

    const sortedMonths = Array.from(availableMonths).sort().reverse();
    sel.innerHTML = sortedMonths.map(mKey => {
        const isCur = mKey === CURRENT_MONTH_KEY;
        return `<option value="${mKey}">📅 ${formatMonthKeyLabel(mKey)}${isCur ? ' (сейчас)' : ''}</option>`;
    }).join('');

    sel.value = CURRENT_MONTH_KEY;
    selectedStatsMonth = CURRENT_MONTH_KEY;

    sel.addEventListener('change', () => {
        selectedStatsMonth = sel.value || CURRENT_MONTH_KEY;
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect && sortSelect.value !== 'monthly_popular_desc' && sortSelect.value !== 'votes_desc') {
            sortSelect.value = 'monthly_popular_desc';
        }
        applyFilters();
    });
}

function getItemMonthStats(item, monthKey = selectedStatsMonth) {
    const targetMonth = (!monthKey || monthKey === 'current') ? CURRENT_MONTH_KEY : monthKey;
    if (targetMonth === CURRENT_MONTH_KEY) {
        return {
            votes: Number(item.votes) || 0,
            searches: Number(item.monthly_searches) || 0
        };
    }
    const arch = monthsArchiveData[targetMonth];
    if (arch && arch.items && arch.items[item.id]) {
        const entry = arch.items[item.id];
        return {
            votes: Number(entry.votes) || 0,
            searches: Number(entry.monthly_searches) || 0
        };
    }
    return { votes: 0, searches: 0 };
}

document.addEventListener("DOMContentLoaded", () => {
    initAutomatedAtmosphereEngine();
    initThemeToggle();
    initViewSwitcher();
    initTwoMainButtonsAndFilters();
    initMobileSubscriptionSliders();
    renderQuestsUI();
    initInfiniteScrollObserver();

    const resetInfoEl = document.getElementById('voteResetInfo');
    if (resetInfoEl) {
        resetInfoEl.textContent = `🐾 Счётчик месяца: ${CURRENT_MONTH_HUMAN}`;
    }

    const monthlySortOpt = document.getElementById('monthlySortOption');
    if (monthlySortOpt) {
        monthlySortOpt.textContent = `📅 Топ месяца (${CURRENT_MONTH_NAME})`;
    }

    const sugHead = document.getElementById('suggestionsHeadTitle');
    if (sugHead) {
        sugHead.textContent = `🔥 Самое искомое за ${CURRENT_MONTH_HUMAN.toLowerCase()}:`;
    }

    setupModal('orderModal', 'openOrderModal', 'closeOrderModal', 'open_order_modal');
    setupModal('guideModal', null, 'closeGuideModal', 'open_payment_guide');
    setupModal('questsModal', 'openQuestsModalBtn', 'closeQuestsModal', 'open_quests_modal');
    setupModal('prodaModal', null, 'closeProdaModal', null);
    setupModal('freePostsModal', null, 'closeFreePostsModal', null);
    setupModal('tgNewsLightboxModal', null, 'closeTgNewsLightbox', null);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-wrap')) {
            const sug = document.getElementById('searchSuggestions');
            if (sug) sug.classList.remove('open');
        }
    });

    const typeFilterSelect = document.getElementById('typeFilterSelect');
    if (typeFilterSelect) {
        typeFilterSelect.addEventListener('change', () => {
            activeContentTypeFilter = typeFilterSelect.value || 'all';
            updateResetFiltersBtnVisibility();
            applyFilters();
        });
    }

    // Полоска «💖 По вашим предпочтениям» открывается ТОЛЬКО по нажатию кнопки
    const toggleForYouStripBtn = document.getElementById('toggleForYouStripBtn');
    if (toggleForYouStripBtn) {
        toggleForYouStripBtn.addEventListener('click', () => {
            isForYouStripOpen = !isForYouStripOpen;
            renderTopForYouStrip();
        });
    }

    const togglePrefsBtn = document.getElementById('togglePrefsCustomizeBtn');
    const prefsBanner = document.getElementById('userPrefsBanner');
    if (togglePrefsBtn && prefsBanner) {
        togglePrefsBtn.addEventListener('click', () => {
            const isHidden = prefsBanner.style.display === 'none';
            prefsBanner.style.display = isHidden ? 'block' : 'none';
        });
    }

    const hideForYouBtn = document.getElementById('hideForYouStripBtn');
    if (hideForYouBtn) {
        hideForYouBtn.addEventListener('click', () => {
            isForYouStripOpen = false;
            renderTopForYouStrip();
        });
    }

    const resetPrefsBtn = document.getElementById('resetPrefsBtn');
    if (resetPrefsBtn) {
        resetPrefsBtn.addEventListener('click', () => {
            userFavoriteTags = {};
            userInteractionCount = 0;
            saveUserTagPrefs();
            applyFilters();
        });
    }

    const randomBtn = document.getElementById('randomTitleBtn');
    const rerollBtn = document.getElementById('rerollLuckyBtn');
    const closeLuckyBtn = document.getElementById('closeLuckyRowBtn');
    if (randomBtn) randomBtn.addEventListener('click', openLuckySingleRow);
    if (rerollBtn) rerollBtn.addEventListener('click', openLuckySingleRow);
    if (closeLuckyBtn) {
        closeLuckyBtn.addEventListener('click', () => {
            const sec = document.getElementById('luckyRowSection');
            if (sec) sec.style.display = 'none';
        });
    }

    loadBoostyGoalStats();
    loadVotesAndCatalogData();

    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const val = searchInput.value.trim();
            if (clearBtn) clearBtn.style.display = val.length > 0 ? 'flex' : 'none';
            const sug = document.getElementById('searchSuggestions');
            if (val.length > 0 && sug) {
                sug.classList.remove('open');
            }
            updateResetFiltersBtnVisibility();
            applyFilters();
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length === 0) {
                renderSearchSuggestions();
                const sug = document.getElementById('searchSuggestions');
                if (sug) sug.classList.add('open');
            }
        });
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            updateResetFiltersBtnVisibility();
            applyFilters();
            searchInput.focus();
        });
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            applyFilters();
            if (sortSelect.value === 'votes_desc' || sortSelect.value === 'monthly_popular_desc') {
                syncTopVotesThrottled(12);
            }
        });
    }
});

function initInfiniteScrollObserver() {
    const sentinel = document.getElementById('infiniteScrollSentinel');
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    infiniteScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && renderedCardsCount < lastFilteredItems.length) {
                appendNextCatalogBatch();
            }
        });
    }, {
        root: null,
        rootMargin: '480px 0px',
        threshold: 0.01
    });

    infiniteScrollObserver.observe(sentinel);
}

function initThemeToggle() {
    const savedTheme = localStorage.getItem('taka_site_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = savedTheme === 'light' ? '☀️ Светлая' : '🌙 Тёмная';
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('taka_site_theme', next);
            btn.textContent = next === 'light' ? '☀️ Светлая' : '🌙 Тёмная';
        });
    }
}

function initViewSwitcher() {
    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');
    const catalog = document.getElementById('catalog');
    if (gridBtn && listBtn && catalog) {
        gridBtn.addEventListener('click', () => {
            catalog.classList.remove('list-view');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        });
        listBtn.addEventListener('click', () => {
            catalog.classList.add('list-view');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        });
    }
}

function setupModal(modalId, openBtnId, closeBtnId, eventName) {
    const modal = document.getElementById(modalId);
    const openBtn = openBtnId ? document.getElementById(openBtnId) : null;
    const closeBtn = document.getElementById(closeBtnId);
    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            if (eventName) trackGoal(eventName);
        });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
}

function loadBoostyGoalStats() {
    fetch('stats.json?v=' + Date.now())
        .then(res => res.ok ? res.json() : null)
        .then(stats => {
            if (!stats) return;
            if (stats.avatar) {
                const avEl = document.getElementById('channelAvatar');
                if (avEl) avEl.src = stats.avatar;
            }
            const subsEl = document.getElementById('statSubscribers');
            const postsEl = document.getElementById('statPosts');
            if (subsEl && stats.subscribers) subsEl.textContent = Number(stats.subscribers).toLocaleString('ru-RU');
            if (postsEl && stats.posts) postsEl.textContent = Number(stats.posts).toLocaleString('ru-RU');

            if (Array.isArray(stats.tg_news) && stats.tg_news.length > 0) {
                renderTelegramNewsSection(stats.tg_news);
            }

            if (Array.isArray(stats.goals) && stats.goals.length > 0) {
                const g = stats.goals[0];
                const current = typeof g.current === 'number' ? g.current : 174;
                const target = g.target || 200;
                const left = Math.max(1, target - current);
                const percent = Math.min(100, Math.round((current / target) * 100));

                liveGoalStats = { current, target, left, percent };

                const numEl = document.getElementById('goalNumbers');
                const barEl = document.getElementById('goalProgressBar');
                const descEl = document.getElementById('goalDesc');

                if (numEl) numEl.textContent = `${current} из ${target} платных подписчиков (${percent}%) — осталось всего ${left}!`;
                if (barEl) barEl.style.width = `${percent}%`;
                if (descEl && g.description) descEl.textContent = g.description;

                const cwGoalText = document.getElementById('catWidgetGoalText');
                const cwGoalLeft = document.getElementById('catWidgetGoalLeft');
                const cwGoalFill = document.getElementById('catWidgetGoalFill');
                const cwLauncher = document.getElementById('catLauncherLabel');
                const mGoalCur = document.getElementById('modalGoalCurrentNum');
                const mGoalBadge = document.getElementById('modalGoalCounterBadge');

                if (cwGoalText) cwGoalText.textContent = `🎯 Цель: ${current} из ${target} подп. (${percent}%)`;
                if (cwGoalLeft) cwGoalLeft.textContent = `Осталось ${left} чел.!`;
                if (cwGoalFill) cwGoalFill.style.width = `${percent}%`;
                if (cwLauncher) cwLauncher.textContent = `Цель: ${current}/${target} 🥺🐾`;
                if (mGoalCur) mGoalCur.textContent = String(current);
                if (mGoalBadge) mGoalBadge.textContent = `До цели ${left} подп.!`;
            }
        })
        .catch(() => {});
}

async function loadVotesAndCatalogData() {
    const ts = Date.now();
    try {
        const vRes = await fetch('votes.json?v=' + ts);
        if (vRes.ok) {
            const vDoc = await vRes.json();
            if (vDoc && typeof vDoc === 'object') {
                if (vDoc.months_archive && typeof vDoc.months_archive === 'object') {
                    monthsArchiveData = vDoc.months_archive;
                }
                if (vDoc.month === CURRENT_MONTH_KEY && vDoc.items) {
                    votesFileMap = vDoc.items;
                } else if (monthsArchiveData[CURRENT_MONTH_KEY] && monthsArchiveData[CURRENT_MONTH_KEY].items) {
                    votesFileMap = monthsArchiveData[CURRENT_MONTH_KEY].items;
                }
            }
        }
    } catch (e) {}

    populateMonthStatsSelect();

    try {
        const res = await fetch('data.json?v=' + ts);
        const data = await res.json();
        try { localStorage.setItem('taka_catalog_backup_cache', JSON.stringify(data)); } catch (e) {}
        initializeCatalogItems(data);
    } catch (e) {
        const backup = localStorage.getItem('taka_catalog_backup_cache');
        if (backup) {
            initializeCatalogItems(JSON.parse(backup));
        }
    }
}

function initializeCatalogItems(data) {
    allItems = data.map((item, index) => {
        const cleanTitle = cleanDisplayTitle(item.title);
        let feedLink = item.link || '';
        if (feedLink.includes('view=grid')) {
            feedLink = feedLink.replace('view=grid', 'view=feed');
        } else if (!feedLink.includes('view=feed') && !feedLink.includes('postsTagsIds')) {
            feedLink += (feedLink.includes('?') ? '&' : '?') + 'view=feed';
        }

        let latestPostLink = '';
        if (item.latest_post_id) {
            latestPostLink = `https://boosty.to/darktaka/posts/${item.latest_post_id}`;
        } else if (item.latest_post_link && item.latest_post_link.includes('/posts/')) {
            latestPostLink = item.latest_post_link;
        } else {
            latestPostLink = item.latest_post_link || feedLink;
        }

        let levelNum = item.tier_level === 2 ? 2 : 1;
        if (item.tier && item.tier.includes('Основной')) levelNum = 2;

        const tierText = levelNum === 2 ? "👑 Основной уровень 2 ур. • 500 ₽" : "🧡 Базовый уровень 1 ур. • 250 ₽";
        const subLink = levelNum === 2 ? TIER_SUB_LINKS[2] : TIER_SUB_LINKS[1];

        let totalChapters = Number(item.chapters) || 0;
        if (String(item.id).startsWith('tag_') && Number(item.posts_count) >= 250 && totalChapters === 316) {
            totalChapters = 0;
        }

        let freeChapters = Number(item.free_chapters) || 0;
        if (!freeChapters && item.has_free && item.free_text) {
            const m = String(item.free_text).match(/(\d+)\s*[-—–]\s*(\d+)/);
            if (m) {
                freeChapters = Math.max(0, parseInt(m[2], 10) - parseInt(m[1], 10) + 1);
            } else {
                const mSingle = String(item.free_text).match(/(\d+)/);
                if (mSingle) freeChapters = parseInt(mSingle[1], 10);
            }
        }
        if (totalChapters > 0 && freeChapters > totalChapters) {
            freeChapters = totalChapters;
        }

        const freePosts = Array.isArray(item.free_posts) ? item.free_posts : [];
        const paidChapters = Math.max(0, totalChapters - freeChapters);
        const hasFree = Boolean(item.has_free || freeChapters > 0 || freePosts.length > 0);
        const freeText = hasFree
            ? (item.free_text || `🆓 Бесплатно: ${freeChapters} гл.`)
            : '';

        let freePostLink = '';
        if (freePosts.length > 0 && freePosts[0].link) {
            freePostLink = freePosts[0].link;
        } else if (item.free_post_id) {
            freePostLink = `https://boosty.to/darktaka/posts/${item.free_post_id}`;
        } else if (item.free_post_link && item.free_post_link.includes('/posts/')) {
            freePostLink = item.free_post_link;
        } else if (hasFree) {
            freePostLink = item.free_post_link || (feedLink + (feedLink.includes('?') ? '&' : '?') + 'onlyAllowed=true');
        } else {
            freePostLink = feedLink;
        }

        const engMetricTag = makeCleanEnglishTag(cleanTitle);
        const { tags: genres, contentType, internetChapters } = detectClientTagsTypeAndInternetChapters(cleanTitle, {
            ...item,
            chapters: totalChapters
        });

        const latestRange = totalChapters > 0
            ? (item.latest_range && !String(item.id).startsWith('tag_') ? item.latest_range : `1-${totalChapters} гл.`)
            : 'Все главы в ленте';

        const fileVoteEntry = votesFileMap[item.id];
        const fileVotes = fileVoteEntry
            ? (typeof fileVoteEntry === 'number' ? fileVoteEntry : Number(fileVoteEntry.votes) || 0)
            : 0;
        const fileMonthlySearches = fileVoteEntry && typeof fileVoteEntry === 'object'
            ? (Number(fileVoteEntry.monthly_searches) || 0)
            : 0;

        const cachedVotes = typeof votesCache[item.id] === 'number' ? votesCache[item.id] : 0;
        const userVoted = hasUserVoted(item.id);
        const recordedVoteVal = typeof userVotedMap[item.id] === 'number'
            ? userVotedMap[item.id]
            : (userVoted ? fileVotes + 1 : 0);

        const initialVotes = Math.max(fileVotes, cachedVotes, recordedVoteVal, userVoted ? 1 : 0);
        votesCache[item.id] = initialVotes;

        const initialMonthlySearches = Math.max(
            fileMonthlySearches,
            Number(monthlySearchMap[item.id]) || 0,
            initialVotes * 2
        );
        monthlySearchMap[item.id] = initialMonthlySearches;

        return {
            ...item,
            title: cleanTitle,
            image: normalizeCoverUrl(item.image),
            content_type: contentType,
            chapters: totalChapters,
            internet_chapters: Math.max(internetChapters, totalChapters),
            free_chapters: freeChapters,
            paid_chapters: paidChapters,
            has_free: hasFree,
            free_text: freeText,
            free_posts: freePosts,
            metric_tag: engMetricTag,
            genres: genres,
            latest_range: latestRange,
            tier: tierText,
            tier_level: levelNum,
            link: feedLink,
            latest_post_link: latestPostLink,
            free_post_link: freePostLink,
            sub_link: subLink,
            originalIndex: index,
            votes: initialVotes,
            monthly_searches: initialMonthlySearches
        };
    });

    saveVotesCache();
    updateTabCountersAndBanners();
    renderHighlightsBlocks();
    renderTopForYouStrip();
    checkUrlAnchorParam();
    applyFilters();
    initCatRecommendationWidget();
    flushPendingVotesQueue();
    syncTopVotesThrottled(10);
    enrichCatalogWithRemangaPriority();
}

function checkUrlAnchorParam() {
    try {
        const params = new URLSearchParams(window.location.search);
        const targetQuery = (params.get('manga') || params.get('title') || '').trim();
        if (!targetQuery) return;

        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearchBtn');
        const normQuery = targetQuery.toLowerCase().replace(/^title_/, '');

        const matched = allItems.find(i =>
            i.metric_tag === normQuery ||
            i.title.toLowerCase().includes(normQuery) ||
            String(i.id) === targetQuery
        );

        if (matched && searchInput) {
            searchInput.value = matched.title;
            if (clearBtn) clearBtn.style.display = 'flex';
            matched._isSpotlight = true;
            incrementMonthlyTitlePopularity(matched, 2);
            setTimeout(() => updateCatWidgetContext(matched, true), 400);
        }
    } catch (e) {}
}

function updateTabCountersAndBanners() {
    const cAll = document.getElementById('count-all');
    const cAllMenu = document.getElementById('count-all-menu');
    const cFree = document.getElementById('count-free');
    const c1 = document.getElementById('count-t1');
    const c2 = document.getElementById('count-t2');

    const mAll = document.getElementById('m-count-all');
    const mFree = document.getElementById('m-count-free');
    const m1 = document.getElementById('m-count-t1');
    const m2 = document.getElementById('m-count-t2');

    const freeItems = allItems.filter(i => i.has_free || i.free_chapters > 0);
    const t1Items = allItems.filter(i => i.tier_level === 1);
    const t2Items = allItems.filter(i => i.tier_level === 2);

    const totalVoicedSum = allItems.reduce((acc, i) => acc + (Number(i.chapters) || 0), 0);
    const totalInternetSum = allItems.reduce((acc, i) => acc + Math.max(Number(i.internet_chapters) || 0, Number(i.chapters) || 0), 0);
    const totalFreeChSum = allItems.reduce((acc, i) => acc + (Number(i.free_chapters) || 0), 0);
    const totalPaidChSum = allItems.reduce((acc, i) => acc + (Number(i.paid_chapters) || 0), 0);

    if (cAll) cAll.textContent = allItems.length;
    if (cAllMenu) cAllMenu.textContent = allItems.length;
    if (cFree) cFree.textContent = freeItems.length;
    if (c1) c1.textContent = t1Items.length;
    if (c2) c2.textContent = t2Items.length;

    if (mAll) mAll.textContent = allItems.length;
    if (mFree) mFree.textContent = freeItems.length;
    if (m1) m1.textContent = t1Items.length;
    if (m2) m2.textContent = t2Items.length;

    // Обновляем две статистики около постов (Бесплатные главы и Платные главы) + динамический счётчик «Озвучено глав N / N»
    const statFreeEl = document.getElementById('statFreeChaptersTotal');
    const statPaidEl = document.getElementById('statPaidChaptersTotal');
    const statVoicedEl = document.getElementById('statVoicedVsInternet');

    if (statFreeEl) statFreeEl.textContent = `${totalFreeChSum.toLocaleString('ru-RU')} гл.`;
    if (statPaidEl) statPaidEl.textContent = `${totalPaidChSum.toLocaleString('ru-RU')} гл.`;
    if (statVoicedEl) {
        statVoicedEl.textContent = `${totalVoicedSum.toLocaleString('ru-RU')} / ${totalInternetSum.toLocaleString('ru-RU')} гл.`;
    }

    // Обновляем счётчики типов манги в селекте «Выбрать типы манги»
    const manhwaTotal = allItems.filter(x => x.content_type === 'manhwa').length;
    const manhuaTotal = allItems.filter(x => x.content_type === 'manhua').length;
    const mangaTotal = allItems.filter(x => x.content_type === 'manga').length;

    const optAll = document.getElementById('typeOptAll');
    const optManhwa = document.getElementById('typeOptManhwa');
    const optManhua = document.getElementById('typeOptManhua');
    const optManga = document.getElementById('typeOptManga');

    if (optAll) optAll.textContent = `📚 Выбрать типы манги (${allItems.length})`;
    if (optManhwa) optManhwa.textContent = `🇰🇷 Манхва (${manhwaTotal})`;
    if (optManhua) optManhua.textContent = `🇨🇳 Маньхуа (${manhuaTotal})`;
    if (optManga) optManga.textContent = `🇯🇵 Манга (${mangaTotal})`;

    const desc1 = document.getElementById('subBannerDesc1');
    const desc2 = document.getElementById('subBannerDesc2');
    if (desc1 && t1Items.length > 0) {
        desc1.textContent = `Доступ к ${t1Items.length} тайтлам базовой базы + новые серии раньше всех`;
    }
    if (desc2 && allItems.length > 0) {
        desc2.textContent = `Все ${allItems.length} тайтлов (${totalVoicedSum > 0 ? totalVoicedSum.toLocaleString('ru-RU') + '+ глав' : '725+ видео'}), Лицензии + ТГ-чат`;
    }
}

function getTopThreeVoteMap() {
    const withVotes = [...allItems]
        .filter(i => (Number(i.votes) || 0) > 0)
        .sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const rankMap = {};
    withVotes.slice(0, 3).forEach((item, idx) => {
        rankMap[item.id] = idx + 1;
    });
    return rankMap;
}

function renderHighlightsBlocks() {
    const section = document.getElementById('highlightsSection');
    const weekBlock = document.getElementById('weekNewBlock');
    const weekList = document.getElementById('weekNewList');
    const monthBlock = document.getElementById('monthHitsBlock');
    const monthList = document.getElementById('monthHitsList');
    if (!section || !weekBlock || !monthBlock) return;

    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0), Math.floor(Date.now() / 1000));
    const sevenDaysSec = 7 * 86400;
    const thirtyDaysSec = 30 * 86400;

    const recentWeekReleases = [...allItems]
        .filter(i => i.timestamp && (maxTs - i.timestamp) <= sevenDaysSec)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const newMonthTitles = [...allItems]
        .filter(i => {
            const created = i.created_ts || i.timestamp || 0;
            return created > 0 && (maxTs - created) <= thirtyDaysSec;
        })
        .sort((a, b) => (b.created_ts || b.timestamp || 0) - (a.created_ts || a.timestamp || 0));

    let hasAny = false;

    const weekTitleEl = weekBlock.querySelector(".highlight-title");
    if (weekTitleEl) {
        weekTitleEl.textContent = `🔥 Новые главы за неделю (${recentWeekReleases.length}) — на ролик с конкретными главами`;
    }
    const monthTitleEl = monthBlock.querySelector(".highlight-title");
    if (monthTitleEl) {
        monthTitleEl.textContent = `👑 Новинки месяца (${newMonthTitles.length})`;
    }

    if (recentWeekReleases.length > 0) {
        hasAny = true;
        weekBlock.style.display = 'block';
        weekList.innerHTML = recentWeekReleases.map(i => {
            const safeTitle = i.title.replace(/['"]/g, '');
            const rangeBadge = i.latest_range || (i.chapters > 0 ? `${i.chapters} гл.` : "Свежий выпуск");
            const directPostUrl = i.latest_post_id
                ? `https://boosty.to/darktaka/posts/${i.latest_post_id}`
                : (i.latest_post_link || i.link);
            const href = appendBoostyUtm(directPostUrl, i.metric_tag);
            return `
                <a href="${href}" target="_blank" rel="noopener" class="hl-chip ${i.tier_level === 2 ? 'hl-gold' : ''}"
                   data-id="${i.id}" data-metric-tag="${i.metric_tag}" title="На ролик с конкретными главами «${safeTitle}» на Boosty">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span class="hl-chip-sub">🎬 На ролик: ${rangeBadge} ↗</span>
                    </div>
                </a>
            `;
        }).join('');

        weekList.querySelectorAll('.hl-chip').forEach(chip => {
            const itemObj = allItems.find(x => String(x.id) === String(chip.dataset.id));
            if (itemObj) {
                chip.addEventListener('click', () => {
                    trackGoal('click_week_new', {
                        title: itemObj.title,
                        metric_tag: itemObj.metric_tag,
                        level: itemObj.tier_level,
                        item: itemObj
                    });
                });
            }
        });
    } else {
        weekBlock.style.display = 'none';
    }

    if (newMonthTitles.length > 0) {
        hasAny = true;
        monthBlock.style.display = 'block';
        monthList.innerHTML = newMonthTitles.map(i => {
            const safeTitle = i.title.replace(/['"]/g, '');
            const href = appendBoostyUtm(i.link, i.metric_tag);
            return `
                <a href="${href}" target="_blank" rel="noopener" class="hl-chip ${i.tier_level === 2 ? 'hl-gold' : ''}"
                   data-id="${i.id}" data-metric-tag="${i.metric_tag}">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span class="hl-chip-sub">👑 Новый тайтл • ${i.chapters > 0 ? `${i.chapters}/${i.internet_chapters || i.chapters} гл.` : "В ленте"}</span>
                    </div>
                </a>
            `;
        }).join('');

        monthList.querySelectorAll('.hl-chip').forEach(chip => {
            const itemObj = allItems.find(x => String(x.id) === String(chip.dataset.id));
            if (itemObj) {
                chip.addEventListener('click', () => {
                    trackGoal('click_month_new_title', {
                        title: itemObj.title,
                        metric_tag: itemObj.metric_tag,
                        level: itemObj.tier_level,
                        item: itemObj
                    });
                });
            }
        });
    } else {
        monthBlock.style.display = 'none';
    }

    [weekList, monthList].forEach(listContainer => {
        if (listContainer && !listContainer.dataset.wheelBound) {
            listContainer.dataset.wheelBound = "1";
            listContainer.addEventListener("wheel", (e) => {
                if (e.deltaY !== 0 && listContainer.scrollWidth > listContainer.clientWidth) {
                    e.preventDefault();
                    listContainer.scrollLeft += e.deltaY;
                }
            }, { passive: false });
        }
    });

    section.style.display = hasAny ? 'block' : 'none';
}

function renderSearchSuggestions() {
    const listEl = document.getElementById('suggestionsList');
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (!listEl || allItems.length === 0) return;

    const topFiveMonthly = [...allItems]
        .sort((a, b) => {
            const stA = getItemMonthStats(a);
            const stB = getItemMonthStats(b);
            const scoreA = stA.searches * 10 + stA.votes * 15 + (Number(a.chapters) || 0);
            const scoreB = stB.searches * 10 + stB.votes * 15 + (Number(b.chapters) || 0);
            return scoreB - scoreA;
        })
        .slice(0, 5);

    listEl.innerHTML = topFiveMonthly.map(item => `
        <div class="suggestion-item" data-title="${item.title}" data-id="${item.id}">
            <span>🐾 ${item.title}</span>
            <span style="color:var(--text-muted);font-size:11.5px;">🔥 ${item.votes || 0} • ${item.chapters > 0 ? `${item.chapters}/${item.internet_chapters || item.chapters} гл.` : 'В ленте'}</span>
        </div>
    `).join('');

    listEl.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = el.dataset.title;
                if (clearBtn) clearBtn.style.display = 'flex';
                document.getElementById('searchSuggestions').classList.remove('open');
                const found = allItems.find(x => String(x.id) === String(el.dataset.id));
                if (found) {
                    recordUserTagInterest(found, 2);
                    incrementMonthlyTitlePopularity(found, 2);
                    updateCatWidgetContext(found);
                }
                updateResetFiltersBtnVisibility();
                applyFilters();
            }
        });
    });
}

// --- СИСТЕМА ГОЛОСОВАНИЯ («🔥 ХОЧУ ПРОДУ») ---
function hasUserVoted(id) {
    if (!id) return false;
    const strId = String(id);
    if (userVotedMap && userVotedMap[strId]) return true;
    try {
        if (localStorage.getItem(`voted_${CURRENT_MONTH_KEY}_${strId}`) === 'true') return true;
    } catch (e) {}
    return false;
}

function markUserVoted(id, countVal) {
    const strId = String(id);
    userVotedMap[strId] = Number(countVal) || 1;
    try {
        localStorage.setItem(`voted_${CURRENT_MONTH_KEY}_${strId}`, 'true');
        localStorage.setItem(USER_VOTED_MAP_KEY, JSON.stringify(userVotedMap));
    } catch (e) {}
    setCookie(USER_VOTED_MAP_KEY, JSON.stringify(userVotedMap), 45);
}

function saveVotesCache() {
    try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(votesCache)); } catch (e) {}
}

function savePendingVotesQueue() {
    try { localStorage.setItem(PENDING_VOTES_KEY, JSON.stringify(pendingVotesQueue)); } catch (e) {}
}

async function fetchItemVoteCount(item) {
    if (!item || !item.id) return;
    const safeKey = item.vote_key || getSafeVoteKey(item.id);
    const url = `https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/${safeKey}`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const val = typeof data.count === 'number' ? data.count : (typeof data.value === 'number' ? data.value : 0);
            const currentLocal = Number(item.votes) || 0;
            if (val > currentLocal) {
                item.votes = val;
                votesCache[item.id] = val;
                saveVotesCache();
                document.querySelectorAll(`[id="vote-count-${item.id}"]`).forEach(el => {
                    el.textContent = val;
                });
            }
        }
    } catch (e) {}
}

async function syncTopVotesThrottled(limit = 10) {
    const topCandidates = [...allItems]
        .sort((a, b) => (b.votes || 0) - (a.votes || 0))
        .slice(0, limit);

    for (const item of topCandidates) {
        await fetchItemVoteCount(item);
        await new Promise(r => setTimeout(r, 180));
    }
}

async function incrementRemoteVote(item, optimisticCount) {
    const safeKey = item.vote_key || getSafeVoteKey(item.id);

    if (!pendingVotesQueue.includes(item.id)) {
        pendingVotesQueue.push(item.id);
        savePendingVotesQueue();
    }

    let syncedSuccess = false;
    let bestRemoteCount = optimisticCount;

    try {
        const res = await fetch(`https://api.counterapi.dev/v1/${VOTE_NAMESPACE}/${safeKey}/up`, {
            method: 'GET',
            cache: 'no-store'
        });
        if (res.ok) {
            const data = await res.json();
            const apiCount = typeof data.count === 'number' ? data.count : (typeof data.value === 'number' ? data.value : 0);
            if (apiCount > bestRemoteCount) {
                bestRemoteCount = apiCount;
            }
            syncedSuccess = true;
        }
    } catch (e) {}

    if (syncedSuccess) {
        pendingVotesQueue = pendingVotesQueue.filter(x => String(x) !== String(item.id));
        savePendingVotesQueue();
    }

    item.votes = Math.max(Number(item.votes) || 0, bestRemoteCount);
    votesCache[item.id] = item.votes;
    markUserVoted(item.id, item.votes);
    saveVotesCache();

    document.querySelectorAll(`[id="vote-count-${item.id}"]`).forEach(el => {
        el.textContent = item.votes;
    });
}

async function flushPendingVotesQueue() {
    if (!pendingVotesQueue || pendingVotesQueue.length === 0) return;
    const queueCopy = [...pendingVotesQueue];
    for (const id of queueCopy) {
        const item = allItems.find(x => String(x.id) === String(id));
        if (item) {
            await incrementRemoteVote(item, item.votes || 1);
            await new Promise(r => setTimeout(r, 250));
        }
    }
}

function openProdaPopup(item, alreadyVoted = false) {
    const modal = document.getElementById('prodaModal');
    const titleEl = document.getElementById('prodaModalTitle');
    const textEl = document.getElementById('prodaModalText');
    const rankLabelEl = document.getElementById('prodaRankLabel');
    const goalTextEl = document.getElementById('prodaVotesGoalText');
    const fillEl = document.getElementById('prodaPriorityFill');
    const hintEl = document.getElementById('prodaPriorityHint');
    const boostyBtn = document.getElementById('prodaBoostyBtn');
    const boostyBtnTitle = document.getElementById('prodaBoostyBtnTitle');
    const tgBtn = document.getElementById('prodaTgBtn');
    if (!modal) return;

    const currentVotes = Number(item.votes) || 1;
    const sortedByVotes = [...allItems].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const currentRank = sortedByVotes.findIndex(x => String(x.id) === String(item.id)) + 1;
    const thirdPlaceVotes = (sortedByVotes[2] && sortedByVotes[2].votes) ? sortedByVotes[2].votes : 5;
    const targetVotes = Math.max(thirdPlaceVotes + 1, 10);
    const fillPct = Math.min(100, Math.max(18, Math.round((currentVotes / targetVotes) * 100)));

    if (titleEl) {
        titleEl.textContent = alreadyVoted
            ? `Твой голос за «${item.title}» уже учтён! (${currentVotes} 🔥)`
            : `Голос за проду учтён! Всего голосов: ${currentVotes} 🔥`;
    }
    if (textEl) {
        textEl.textContent = `Все вышедшие главы «${item.title}» уже ждут тебя на Boosty! Подпишись или поддержи проект — это поможет мне быстрее выкупать новые главы 🥺🐾`;
    }
    if (rankLabelEl) {
        rankLabelEl.textContent = currentRank <= 3
            ? `🏆 Сейчас на ${currentRank}-м месте в Топ-3 (${CURRENT_MONTH_HUMAN})!`
            : `🔥 Место в рейтинге проды (${CURRENT_MONTH_NAME}): #${currentRank}`;
    }
    if (goalTextEl) {
        goalTextEl.textContent = `${currentVotes} гол.`;
    }
    if (fillEl) {
        fillEl.style.width = `${fillPct}%`;
    }
    if (hintEl) {
        const needed = Math.max(1, thirdPlaceVotes - currentVotes + 1);
        hintEl.textContent = currentRank <= 3
            ? `Этот тайтл уже в приоритетной тройке месяца! Подпишись на Boosty, чтобы не пропустить выход.`
            : `До попадания в Топ-3 приоритета не хватает ~${needed} гол. — или закажи выход 10 глав прямо сейчас без очереди!`;
    }

    if (boostyBtn) {
        boostyBtn.href = appendBoostyUtm(item.sub_link, item.metric_tag);
        if (boostyBtnTitle) {
            const price = item.tier_level === 2 ? '500 ₽' : '250 ₽';
            boostyBtnTitle.textContent = `🧡 Смотреть «${item.title}» по подписке (${item.tier_level} ур. • ${price})`;
        }
        boostyBtn.onclick = () => trackSubConversion({
            title: item.title,
            metric_tag: item.metric_tag,
            level: item.tier_level
        });
    }
    if (tgBtn) {
        const orderPrice = item.tier_level === 2 ? '3000 ₽' : '1500 ₽';
        const msg = encodeURIComponent(`Привет! 🐾 Хочу заказать/ускорить выход 10 глав тайтла «${item.title}» (${orderPrice} без очереди).`);
        tgBtn.href = `https://t.me/TAKA_YT?text=${msg}`;
        tgBtn.onclick = () => trackGoal('click_telegram', {
            title: item.title,
            metric_tag: item.metric_tag,
            level: item.tier_level
        });
    }
    modal.classList.add('active');
}

function handleVote(item, btnElement) {
    const id = item.id;
    const alreadyVoted = hasUserVoted(id);

    completeQuestStep(3);

    trackGoal('click_want_proda', {
        title: item.title,
        metric_tag: item.metric_tag,
        level: item.tier_level,
        item: item
    });

    if (!alreadyVoted) {
        const newCount = (Number(item.votes) || 0) + 1;
        item.votes = newCount;
        votesCache[id] = newCount;
        markUserVoted(id, newCount);
        saveVotesCache();

        if (btnElement) {
            btnElement.classList.add('voted', 'vote-pulse');
            const labelEl = btnElement.querySelector('.vote-label');
            if (labelEl) labelEl.textContent = '🐾 Жду проду!';
            setTimeout(() => btnElement.classList.remove('vote-pulse'), 600);
        }

        document.querySelectorAll(`[id="vote-count-${id}"]`).forEach(el => {
            el.textContent = newCount;
        });

        incrementRemoteVote(item, newCount);
    }

    openProdaPopup(item, alreadyVoted);
}

// --- ФИЛЬТРАЦИЯ КАТАЛОГА И ОБНОВЛЕНИЕ СТРОКИ СТАТИСТИКИ ---
function updateFilterSummaryBar(filtered = lastFilteredItems) {
    const totalEl = document.getElementById('totalTitlesCount');
    if (!totalEl) return;

    const manhwaCnt = filtered.filter(x => x.content_type === 'manhwa').length;
    const manhuaCnt = filtered.filter(x => x.content_type === 'manhua').length;
    const mangaCnt = filtered.filter(x => x.content_type === 'manga').length;

    const voicedSum = filtered.reduce((acc, i) => acc + (Number(i.chapters) || 0), 0);
    const internetSum = filtered.reduce((acc, i) => acc + Math.max(Number(i.internet_chapters) || 0, Number(i.chapters) || 0), 0);

    totalEl.textContent = `🐾 Найдено: ${filtered.length} из ${allItems.length} (🇰🇷 Манхва: ${manhwaCnt} • 🇨🇳 Маньхуа: ${manhuaCnt} • 🇯🇵 Манга: ${mangaCnt}) • 🎙️ Озвучено глав: ${voicedSum} / ${internetSum}`;
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const rawSearch = searchInput ? searchInput.value.trim() : '';
    const searchText = rawSearch.toLowerCase();
    const sortSelect = document.getElementById('sortSelect');
    const sortValue = sortSelect ? sortSelect.value : 'update_desc';
    const selectedGenreArray = Array.from(selectedGenres);

    if (missingSearchTimer) clearTimeout(missingSearchTimer);

    let filtered = allItems.filter(item => {
        const tagNamesText = (item.genres || []).map(g => READER_TAGS_DICTIONARY[g] || g).join(' ').toLowerCase();
        const typeLabelText = (CONTENT_TYPE_LABELS[item.content_type] || '').toLowerCase();
        const matchesSearch = !searchText ||
                              item.title.toLowerCase().includes(searchText) ||
                              (item.metric_tag && item.metric_tag.toLowerCase().includes(searchText)) ||
                              tagNamesText.includes(searchText) ||
                              typeLabelText.includes(searchText);

        let matchesTier = true;
        if (activeTierTab === 'free') {
            matchesTier = Boolean(item.has_free || item.free_chapters > 0);
        } else if (activeTierTab !== 'all') {
            matchesTier = String(item.tier_level) === String(activeTierTab);
        }

        let matchesType = true;
        if (activeContentTypeFilter !== 'all') {
            matchesType = item.content_type === activeContentTypeFilter;
        }

        let matchesGenre = true;
        if (selectedGenreArray.length > 0) {
            const itemGenres = Array.isArray(item.genres) ? item.genres : [];
            if (selectedGenreArray.length <= 2) {
                matchesGenre = selectedGenreArray.every(g => itemGenres.includes(g));
            } else {
                matchesGenre = selectedGenreArray.some(g => itemGenres.includes(g));
            }
        }

        let matchesLetter = true;
        if (activeLetterFilter !== 'all') {
            const firstChar = String(item.title || '').trim().charAt(0).toUpperCase().replace('Ё', 'Е');
            matchesLetter = firstChar === activeLetterFilter;
        }

        return matchesSearch && matchesTier && matchesType && matchesGenre && matchesLetter;
    });

    if (filtered.length === 0 && selectedGenreArray.length === 2 && !searchText && activeLetterFilter === 'all') {
        filtered = allItems.filter(item => {
            let matchesTier = true;
            if (activeTierTab === 'free') matchesTier = Boolean(item.has_free || item.free_chapters > 0);
            else if (activeTierTab !== 'all') matchesTier = String(item.tier_level) === String(activeTierTab);
            let matchesType = activeContentTypeFilter === 'all' || item.content_type === activeContentTypeFilter;
            const itemGenres = Array.isArray(item.genres) ? item.genres : [];
            return matchesTier && matchesType && selectedGenreArray.some(g => itemGenres.includes(g));
        });
    }

    if (rawSearch.length >= 3 && filtered.length > 0 && filtered.length <= 3) {
        missingSearchTimer = setTimeout(() => {
            recordUserTagInterest(filtered[0], 1);
            incrementMonthlyTitlePopularity(filtered[0], 1);
        }, 1000);
    }

    if (rawSearch.length >= 3 && filtered.length === 0 && activeTierTab === 'all' && selectedGenreArray.length === 0 && activeContentTypeFilter === 'all' && activeLetterFilter === 'all') {
        missingSearchTimer = setTimeout(() => {
            recordMissingSearchQuery(rawSearch);
        }, 900);
    }

    filtered.sort((a, b) => {
        if (a._isSpotlight && !b._isSpotlight) return -1;
        if (!a._isSpotlight && b._isSpotlight) return 1;

        if (selectedGenreArray.length > 1) {
            const matchCountA = (a.genres || []).filter(g => selectedGenres.has(g)).length;
            const matchCountB = (b.genres || []).filter(g => selectedGenres.has(g)).length;
            if (matchCountB !== matchCountA) return matchCountB - matchCountA;
        }

        const stA = getItemMonthStats(a, selectedStatsMonth);
        const stB = getItemMonthStats(b, selectedStatsMonth);

        if (sortValue === 'update_desc') {
            return (b.timestamp || 0) - (a.timestamp || 0);
        } else if (sortValue === 'votes_desc') {
            const vDiff = stB.votes - stA.votes;
            if (vDiff !== 0) return vDiff;
            return (b.chapters || 0) - (a.chapters || 0);
        } else if (sortValue === 'monthly_popular_desc') {
            const mDiff = (stB.searches + stB.votes * 3) - (stA.searches + stA.votes * 3);
            if (mDiff !== 0) return mDiff;
            return (b.timestamp || 0) - (a.timestamp || 0);
        } else if (sortValue === 'alpha_asc') {
            return a.title.localeCompare(b.title, 'ru');
        } else if (sortValue === 'alpha_desc') {
            return b.title.localeCompare(a.title, 'ru');
        } else if (sortValue === 'free_desc') {
            const freeDiff = (b.free_chapters || (b.has_free ? 1 : 0)) - (a.free_chapters || (a.has_free ? 1 : 0));
            if (freeDiff !== 0) return freeDiff;
            return (b.chapters || 0) - (a.chapters || 0);
        } else if (sortValue === 'chapters_desc') {
            return (b.chapters || 0) - (a.chapters || 0);
        } else {
            return a.originalIndex - b.originalIndex;
        }
    });

    lastFilteredItems = filtered;
    updateFilterSummaryBar(filtered);
    resetAndRenderCatalog(filtered, rawSearch);
}

function createCatalogCardElement(item, maxTs, topThreeMap, isPriorityImage = false) {
    const card = document.createElement('div');
    const isLicense = item.tier_level === 2;
    const hasFree = item.has_free || item.free_chapters > 0;
    const resolvedFreePosts = buildFreePostsListForItem(item);
    const hasMultipleFreePosts = resolvedFreePosts.length > 1;
    const frameClass = `tier-frame-${item.tier_level || 1}`;
    card.className = `card ${frameClass} ${hasFree ? 'has-free-card' : ''} ${item._isSpotlight ? 'anchor-spotlight' : ''}`;

    card.setAttribute('data-metric-tag', item.metric_tag);
    card.setAttribute('data-utm-campaign', item.metric_tag);
    card.setAttribute('data-title-id', item.title);
    card.setAttribute('data-month', CURRENT_MONTH_KEY);
    card.setAttribute('data-level', item.tier_level);

    const voted = hasUserVoted(item.id);
    const cleanFeedUrl = appendBoostyUtm(item.link, item.metric_tag);
    const cleanLatestPostUrl = appendBoostyUtm(item.latest_post_link || item.link, item.metric_tag);
    const cleanFreePostUrl = appendBoostyUtm(
        (resolvedFreePosts.length === 1 && resolvedFreePosts[0].link) ? resolvedFreePosts[0].link : (item.free_post_link || item.link),
        item.metric_tag
    );
    const cleanSubUrl = appendBoostyUtm(item.sub_link, item.metric_tag);

    const primaryCardUrl = (activeTierTab === 'free' && hasFree) ? cleanFreePostUrl : cleanLatestPostUrl;
    const isNewRelease = item.timestamp && (maxTs - item.timestamp) <= (5 * 86400);

    const voicedCh = Number(item.chapters) || 0;
    const internetCh = Math.max(voicedCh, Number(item.internet_chapters) || voicedCh);
    const voicedVsInternetText = voicedCh > 0 ? `${voicedCh} / ${internetCh} гл.` : 'В ленте';
    const progressPct = (internetCh > 0 && voicedCh > 0) ? Math.min(100, Math.max(8, Math.round((voicedCh / internetCh) * 100))) : 100;

    const freeChCount = item.free_chapters || 0;
    const paidChCount = voicedCh > 0 ? Math.max(0, voicedCh - freeChCount) : 0;

    const topRank = topThreeMap[item.id];
    const rankLabels = { 1: '🏆 Топ-1 проды', 2: '🥈 Топ-2 проды', 3: '🥉 Топ-3 проды' };
    const topVoteBadgeHtml = topRank
        ? `<span class="badge-top-vote-rank">${rankLabels[topRank]}</span>`
        : '';

    // Две обновляемые статистики на каждой карточке: Бесплатные главы и Платные главы
    const freePillHtml = hasFree
        ? `<a href="${cleanFreePostUrl}" target="_blank" rel="noopener" class="stat-pill stat-free free-action-trigger" title="${hasMultipleFreePosts ? 'Выбрать конкретные бесплатные главы' : 'Открыть пост с бесплатными главами'}">🆓 Бесплатные: <b>${freeChCount > 0 ? freeChCount + ' гл.' : 'Пост'}${hasMultipleFreePosts ? ' ▾' : ' ↗'}</b></a>`
        : `<span class="stat-pill stat-no-free" title="Бесплатных глав нет">🆓 Бесплатные: <b>0 гл.</b></span>`;

    const paidPillHtml = voicedCh > 0
        ? `<span class="stat-pill stat-paid" title="Платные главы по подписке">🔒 Платные: <b>${paidChCount} гл.</b></span>`
        : `<span class="stat-pill stat-paid">🔒 Платные: <b>По подп.</b></span>`;

    const watchBtnUrl = hasFree ? cleanFreePostUrl : cleanLatestPostUrl;
    const watchBtnLabel = hasFree
        ? (hasMultipleFreePosts
            ? `🎬 На ролик с конкретными главами (выбрать из ${resolvedFreePosts.length})`
            : `🎬 На ролик с конкретными главами (${freeChCount > 0 ? freeChCount + ' гл. бесплатно' : 'бесплатно'})`)
        : `🎬 На ролик с конкретными главами`;

    const typeLabel = CONTENT_TYPE_LABELS[item.content_type] || '🇰🇷 Манхва';
    const typeTagHtml = `<span class="card-type-tag" data-type-badge-id="${item.id}" data-type="${item.content_type || 'manhwa'}" title="Выбрать тип манги: ${typeLabel}">${typeLabel}</span>`;

    const miniTagsHtml = (item.genres || []).slice(0, 3).map(gKey => {
        const label = READER_TAGS_DICTIONARY[gKey] || gKey;
        const isTagActive = selectedGenres.has(gKey);
        return `<span class="card-mini-tag ${isTagActive ? 'active-mini-tag' : ''}" data-genre="${gKey}" title="Нажми для фильтра по тегу (двойной клик убирает): ${label}">${label}</span>`;
    }).join('');

    const imgLoadAttrs = isPriorityImage
        ? `fetchpriority="high" decoding="async"`
        : `loading="lazy" decoding="async"`;

    card.innerHTML = `
        <a href="${primaryCardUrl}" target="_blank" rel="noopener" class="card-link" data-metric-tag="${item.metric_tag}">
            <img src="${item.image}" alt="${item.title}" ${imgLoadAttrs} referrerpolicy="no-referrer"
                 class="card-cover-img"
                 data-metric-tag="${item.metric_tag}"
                 data-title="${item.title}"
                 onload="this.classList.add('img-loaded')"
                 onerror="this.src='https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка'; this.classList.add('img-loaded')">
            <span class="badge-top-left ${isLicense ? 'license-gold-badge' : ''}">
                ${isLicense ? '👑 Лицензия' : '🔒 Эксклюзив'}
            </span>
            ${topVoteBadgeHtml}
            <span class="chapters-floating-badge" data-floating-ch-id="${item.id}">${voicedCh > 0 ? `Озвучено: ${voicedCh}/${internetCh} гл.` : 'В ленте'}</span>
            ${hasFree ? `<span class="badge-free-access">${item.free_text || `🎁 Бесплатно: ${freeChCount} гл.`}</span>` : ''}
            ${isNewRelease ? `<span class="badge-hot-new">🔥 ${item.latest_range || 'НОВИНКА'}</span>` : ''}
        </a>
        <div class="card-info">
            <div>
                <a href="${primaryCardUrl}" target="_blank" rel="noopener" class="card-title-link" data-metric-tag="${item.metric_tag}">
                    <h3>${item.title}</h3>
                </a>
                <div class="card-tags-row">${typeTagHtml}${miniTagsHtml}</div>
            </div>

            <div class="card-bottom-wrap">
                <div class="chapters-breakdown">
                    ${freePillHtml}
                    ${paidPillHtml}
                </div>

                <div class="voiced-progress-box" title="Сколько глав уже озвучено каналом ТАКА из общего числа глав, вышедших в интернете">
                    <div class="vp-top">
                        <span>🎙️ Озвучено глав:</span>
                        <b data-ratio-id="${item.id}">${voicedVsInternetText}</b>
                    </div>
                    <div class="vp-track">
                        <div class="vp-fill" data-vp-fill-id="${item.id}" style="width:${progressPct}%;"></div>
                    </div>
                </div>

                <span class="tier-neutral-pill ${isLicense ? 'tier-pill-license' : ''}">${item.tier}</span>

                <div class="action-buttons-row">
                    <a href="${watchBtnUrl}" target="_blank" rel="noopener" class="watch-feed-link ${hasFree ? 'watch-free-emerald free-action-trigger' : ''}" data-metric-tag="${item.metric_tag}">
                        ${watchBtnLabel}
                    </a>
                    <div class="buy-sub-group">
                        <a href="${cleanSubUrl}" target="_blank" rel="noopener" class="buy-tier-link ${isLicense ? 'buy-license-gold' : ''}" data-metric-tag="${item.metric_tag}">
                            Подписаться (${item.tier_level === 2 ? '500 ₽' : '250 ₽'})
                        </a>
                        <button type="button" class="card-sub-help-q" title="Как оплатить подписку из Украины, ЕС или СНГ? Нажмите для инструкции">?</button>
                    </div>
                </div>

                <div class="details">
                    <span>Обновлено: <b>${item.last_update}</b></span>
                    <div class="card-tools-btns">
                        <button type="button" class="share-title-btn" title="Скопировать прямую ссылку на этот тайтл">🔗</button>
                        <button type="button" class="report-broken-btn" title="Сообщить о неработающей ссылке">⚠️</button>
                    </div>
                </div>

                <button type="button" class="vote-btn ${voted ? 'voted' : ''}" data-id="${item.id}" data-metric-tag="${item.metric_tag}">
                    <span class="vote-label">${voted ? '🐾 Жду проду!' : '🔥 Хочу проду'}</span>
                    <span class="vote-count" id="vote-count-${item.id}">${item.votes || 0}</span>
                </button>
            </div>
        </div>
    `;

    // Обработка нажатий на бесплатные главы:
    // Если бесплатных постов > 1 (например, «Тени», «Династия Тан» и др.) — открывается модальное окно выбора глав.
    // Если бесплатный пост только 1 — окно НЕ вылезает, происходит прямой переход к посту!
    if (hasFree) {
        card.querySelectorAll('.free-action-trigger').forEach(el => {
            el.addEventListener('click', (e) => {
                if (hasMultipleFreePosts) {
                    openFreeChaptersAction(item, e);
                } else {
                    completeQuestStep(2);
                    trackGoal('click_title', {
                        title: item.title,
                        metric_tag: item.metric_tag,
                        level: item.tier_level,
                        item: item
                    });
                }
            });
        });

        if (hasMultipleFreePosts) {
            card.querySelectorAll('.card-link, .card-title-link').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (activeTierTab === 'free') {
                        openFreeChaptersAction(item, e);
                    }
                });
            });
        }
    }

    const typeTagEl = card.querySelector('.card-type-tag');
    if (typeTagEl) {
        typeTagEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const cType = typeTagEl.dataset.type || 'all';
            const sel = document.getElementById('typeFilterSelect');
            if (sel) {
                sel.value = sel.value === cType ? 'all' : cType;
                activeContentTypeFilter = sel.value;
                updateResetFiltersBtnVisibility();
                applyFilters();
            }
        });
    }

    card.querySelectorAll('.card-mini-tag').forEach(tagEl => {
        const gKey = tagEl.dataset.genre;
        if (!gKey) return;
        tagEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedGenres.has(gKey)) {
                selectedGenres.delete(gKey);
            } else {
                selectedGenres.add(gKey);
            }
            syncGenrePillsUI();
            applyFilters();
        });
        tagEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            selectedGenres.delete(gKey);
            syncGenrePillsUI();
            applyFilters();
        });
    });

    const qHelpBtn = card.querySelector('.card-sub-help-q');
    if (qHelpBtn) {
        qHelpBtn.addEventListener('click', (e) => openPaymentGuideModal(e));
    }

    const coverLink = card.querySelector('.card-link');
    if (coverLink) {
        coverLink.addEventListener('click', () => {
            trackGoal('click_cover_image', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level,
                item: item
            });
        });
    }

    const buyLink = card.querySelector('.buy-tier-link');
    if (buyLink) {
        buyLink.addEventListener('click', () => {
            trackSubConversion({
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level
            });
        });
    }

    const shareBtn = card.querySelector('.share-title-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareUrl = `${window.location.origin}${window.location.pathname}?manga=${encodeURIComponent(item.metric_tag)}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    shareBtn.textContent = '✅';
                    setTimeout(() => { shareBtn.textContent = '🔗'; }, 1500);
                }).catch(() => {});
            }
            trackGoal('share_title_link', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level
            });
        });
    }

    const reportBtn = card.querySelector('.report-broken-btn');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            trackGoal('report_broken_link', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level
            });
            const text = encodeURIComponent(`⚠️ Привет! На витрине не работает ссылка у тайтла «${item.title}» (${item.link})`);
            window.open(`https://t.me/TAKA_YT?text=${text}`, '_blank');
        });
    }

    const voteBtn = card.querySelector('.vote-btn');
    if (voteBtn) {
        voteBtn.addEventListener('click', () => handleVote(item, voteBtn));
    }

    return card;
}

function resetAndRenderCatalog(items, rawSearchQuery = '') {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;
    catalog.innerHTML = '';
    renderedCardsCount = 0;

    if (items.length === 0) {
        if (rawSearchQuery && rawSearchQuery.length >= 2) {
            const safeQ = rawSearchQuery.replace(/[<>"']/g, '');
            const tgRequestHref = `https://t.me/TAKA_YT?text=${encodeURIComponent(`Привет! 🐾 Искал(а) в каталоге тайтл «${safeQ}», но его ещё нет на Boosty. Очень хотелось бы увидеть озвучку!`)}`;
            catalog.innerHTML = `
                <div class="empty-catalog-box">
                    <p>Тайтл <b>«${safeQ}»</b> пока не найден на Boosty 🐾</p>
                    <span class="missing-title-logged-badge">✅ Запрос «${safeQ}» автоматически записан в журнал ожидаемых тайтлов (${CURRENT_MONTH_HUMAN})!</span>
                    <div class="missing-title-actions">
                        <a href="${tgRequestHref}" target="_blank" rel="noopener" class="missing-request-btn">✈️ Предложить «${safeQ}» автору в Telegram</a>
                    </div>
                </div>
            `;
        } else {
            const emptyMsg = activeTierTab === 'free'
                ? 'Бесплатные главы обновляются — нажмите «🐾 Все тайтлы» 🐾'
                : 'По выбранным фильтрам ничего не найдено — нажмите «✕ Сбросить» 🐾';
            catalog.innerHTML = `<div class="empty-catalog-box"><p>${emptyMsg}</p></div>`;
        }
        return;
    }

    appendNextCatalogBatch();
}

function appendNextCatalogBatch() {
    const catalog = document.getElementById('catalog');
    if (!catalog || renderedCardsCount >= lastFilteredItems.length) return;

    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0), Math.floor(Date.now() / 1000));
    const topThreeMap = getTopThreeVoteMap();
    const nextBatch = lastFilteredItems.slice(renderedCardsCount, renderedCardsCount + BATCH_LOAD_SIZE);
    const frag = document.createDocumentFragment();

    nextBatch.forEach((item, idx) => {
        const isFirstScreen = (renderedCardsCount + idx) < 4;
        const cardEl = createCatalogCardElement(item, maxTs, topThreeMap, isFirstScreen);
        frag.appendChild(cardEl);
    });

    catalog.appendChild(frag);
    renderedCardsCount += nextBatch.length;
}

// --- ВИДЖЕТ КОТИКА ТАКА ---
let catWidgetSelectedTier = 1;
let catWidgetCurrentItem = null;
let catWidgetShownOnce = false;

function initCatRecommendationWidget() {
    const widget = document.getElementById('catPromoWidget');
    if (!widget) return;

    const closeBtn = document.getElementById('catWidgetCloseBtn');
    const launcherBtn = document.getElementById('catWidgetLauncher');
    const subBtn = document.getElementById('catWidgetSubBtn');
    const tier1Btn = document.getElementById('catTierBtn1');
    const tier2Btn = document.getElementById('catTierBtn2');

    const topItem = [...allItems]
        .sort((a, b) => ((b.votes || 0) * 10 + (b.timestamp || 0)) - ((a.votes || 0) * 10 + (a.timestamp || 0)))[0] || null;

    if (topItem) {
        updateCatWidgetContext(topItem, false);
    } else {
        syncCatWidgetButtons();
    }

    if (tier1Btn && tier2Btn) {
        tier1Btn.addEventListener('click', () => {
            catWidgetSelectedTier = 1;
            tier1Btn.classList.add('active');
            tier2Btn.classList.remove('active');
            syncCatWidgetButtons();
        });
        tier2Btn.addEventListener('click', () => {
            catWidgetSelectedTier = 2;
            tier2Btn.classList.add('active');
            tier1Btn.classList.remove('active');
            syncCatWidgetButtons();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            widget.classList.remove('open');
            widget.classList.add('minimized');
            try { sessionStorage.setItem('taka_cat_widget_minimized', '1'); } catch (err) {}
        });
    }

    if (launcherBtn) {
        launcherBtn.addEventListener('click', () => {
            const isOpen = widget.classList.contains('open');
            if (isOpen) {
                widget.classList.remove('open');
                widget.classList.add('minimized');
            } else {
                widget.classList.remove('minimized');
                widget.classList.add('open');
            }
        });
    }

    if (subBtn) {
        subBtn.addEventListener('click', () => {
            trackSubConversion({
                title: catWidgetCurrentItem ? catWidgetCurrentItem.title : `Виджет котика ${catWidgetSelectedTier} ур.`,
                metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : `cat_widget_tier_${catWidgetSelectedTier}`,
                level: catWidgetSelectedTier
            });
        });
    }

    const wasMinimized = sessionStorage.getItem('taka_cat_widget_minimized') === '1';
    if (wasMinimized) {
        widget.classList.add('minimized');
    } else {
        const triggerOpen = () => {
            if (catWidgetShownOnce) return;
            catWidgetShownOnce = true;
            widget.classList.remove('minimized');
            widget.classList.add('open');
        };
        setTimeout(triggerOpen, 7000);
        window.addEventListener('scroll', () => {
            if (window.scrollY > 320) triggerOpen();
        }, { passive: true });
    }
}

function updateCatWidgetContext(item, autoHighlight = true) {
    if (!item) return;
    catWidgetCurrentItem = item;
    catWidgetSelectedTier = item.tier_level === 2 ? 2 : 1;

    const tier1Btn = document.getElementById('catTierBtn1');
    const tier2Btn = document.getElementById('catTierBtn2');
    const msgEl = document.getElementById('catWidgetMessage');

    if (tier1Btn && tier2Btn) {
        tier1Btn.classList.toggle('active', catWidgetSelectedTier === 1);
        tier2Btn.classList.toggle('active', catWidgetSelectedTier === 2);
    }

    const leftSubs = liveGoalStats.left || Math.max(1, (liveGoalStats.target || 200) - (liveGoalStats.current || 174));

    if (msgEl) {
        const chInfo = item.chapters > 0 ? `все ${item.chapters} гл.` : 'все закрытые серии';
        if (item.tier_level === 2) {
            msgEl.innerHTML = `Мяу... 🥺 Смотришь <b>«${item.title}»</b>? До цели в 200 подписчиков не хватает всего <b>${leftSubs} чел.</b>! Оформи 2 уровень — откроешь ${chInfo} и очень выручишь автора с покупкой глав!`;
        } else {
            msgEl.innerHTML = `Мяу... 🥺 Понравился <b>«${item.title}»</b>? Нам осталось всего <b>${leftSubs} подп.</b> до цели 200, чтобы я мог закрыть долги и спокойно выкупать главы! Открой ${chInfo} всего за ~8 ₽ в день 🐾`;
        }
    }

    syncCatWidgetButtons();

    if (autoHighlight) {
        const widget = document.getElementById('catPromoWidget');
        if (widget && !widget.classList.contains('open') && sessionStorage.getItem('taka_cat_widget_minimized') !== '1') {
            catWidgetShownOnce = true;
            widget.classList.remove('minimized');
            widget.classList.add('open');
        }
    }
}

function syncCatWidgetButtons() {
    const subBtn = document.getElementById('catWidgetSubBtn');
    const perkEl = document.getElementById('catWidgetPerkText');
    if (!subBtn) return;

    const engTag = catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : `cat_widget_tier_${catWidgetSelectedTier}`;
    const baseSubUrl = catWidgetSelectedTier === 2 ? TIER_SUB_LINKS[2] : TIER_SUB_LINKS[1];
    subBtn.href = appendBoostyUtm(baseSubUrl, engTag);

    if (catWidgetSelectedTier === 2) {
        subBtn.textContent = '👑 Поддержать 2 ур. за 500 ₽/мес (Лицензии)';
        subBtn.classList.add('cat-sub-gold');
        if (perkEl) perkEl.textContent = '✨ Включает ВСЕ тайтлы 1 ур. + Лицензии + ТГ-чат семьи ТАКА';
    } else {
        subBtn.textContent = '🐾 Спасти котика: 1 ур. за 250 ₽/мес (~8 ₽/день)';
        subBtn.classList.remove('cat-sub-gold');
        if (perkEl) perkEl.textContent = '🧡 Доступ ко всей базовой библиотеке озвучки (725+ постов)';
    }
}
