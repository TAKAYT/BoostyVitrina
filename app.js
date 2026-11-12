let allItems = [];
let activeTierTab = 'all';
let activeGenreFilter = 'all';
let activeContentTypeFilter = 'all';
let activeLetterFilter = 'all';
let selectedStatsMonth = 'current';
let renderedCardsCount = 0;
let lastFilteredItems = [];
let infiniteScrollObserver = null;
let missingSearchTimer = null;
let monthsArchiveData = {};
let forYouStripHiddenByUser = false;
const BATCH_LOAD_SIZE = 20;
const YM_ID = 114099972;

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

// Отдельные пространства имён на каждый месяц (в ноябре свой счётчик, в декабре — новый)
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
const RU_METADATA_CACHE_KEY = 'taka_ru_metadata_cache_v2';
const ANON_USER_UID_KEY = 'taka_anon_user_uid_v1';

// Справочник 14 одиночных (несмежных) тегов читалки (синхронизировано с ReManga / Senkuro)
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
    "manhua": "🇨🇳 Маньхуа"
};

// Конвертация старых смежных тегов в чистые одиночные
const LEGACY_TAG_MIGRATION = {
    "имба_гг": "имба",
    "драконы_и_призыв": "драконы",
    "магия_и_фэнтези": "фэнтези",
    "демоны_и_боги": "демоны"
};

// Маппинг русских жанров и категорий с ReManga / Senkuro в 14 тегов нашего каталога
const RU_SITE_TAG_MAPPING = {
    "некромантия": "некромантия",
    "некромант": "некромантия",
    "нежить": "некромантия",
    "система": "система",
    "игровые элементы": "система",
    "литрпг": "система",
    "прокачка": "система",
    "рост уровня": "система",
    "скрытые способности": "имба",
    "имба": "имба",
    "сильный гг": "имба",
    "могущественный гг": "имба",
    "непобедимый гг": "имба",
    "умный гг": "имба",
    "регрессия": "регрессия",
    "возвращение в прошлое": "регрессия",
    "путешествие во времени": "регрессия",
    "петля времени": "регрессия",
    "реинкарнация": "перерождение",
    "перерождение": "перерождение",
    "исекай": "перерождение",
    "попаданец": "перерождение",
    "попадание в другой мир": "перерождение",
    "подземелья": "подземелья",
    "данжи": "подземелья",
    "башня": "подземелья",
    "охотники": "подземелья",
    "врата": "подземелья",
    "драконы": "драконы",
    "дракон": "драконы",
    "призыв": "призыв",
    "призыватель": "призыв",
    "питомцы": "призыв",
    "укрощение": "призыв",
    "монстры": "призыв",
    "звери": "призыв",
    "гоблины": "призыв",
    "апокалипсис": "апокалипсис",
    "постапокалипсис": "апокалипсис",
    "зомби": "апокалипсис",
    "выживание": "апокалипсис",
    "культивация": "культивация",
    "боевые искусства": "культивация",
    "мурим": "культивация",
    "сянься": "культивация",
    "уся": "культивация",
    "дао": "культивация",
    "демоны": "демоны",
    "боги": "демоны",
    "ангелы и демоны": "демоны",
    "месть": "месть",
    "антигерой": "месть",
    "жестокий мир": "месть",
    "артефакты": "артефакты",
    "алхимия": "артефакты",
    "кузнечное дело": "артефакты",
    "фэнтези": "фэнтези",
    "магия": "фэнтези",
    "рыцари": "фэнтези",
    "эльфы": "фэнтези",
    "средневековье": "фэнтези",
    "аристократия": "фэнтези"
};

// Строгие правила определения одиночных тегов по границам слов
const CLIENT_TAG_REGEX_RULES = [
    ["некромантия", /(?:^|[^а-яa-z0-9])(некромант[а-я]*|скелет[а-я]*|нежит[а-я]*|мертвец[а-я]*|лич(?:а|ем|и|ей)?|кладбищ[а-я]*|кост(?:ей|и|яной))(?=$|[^а-яa-z0-9])/i],
    ["система", /(?:^|[^а-яa-z0-9])(систем[а-я]*|уров(?:ень|ня|ней|нем)|лвл|lvl|sss|3s|s-ранг[а-я]*|f-ранг[а-я]*|ранг(?:а|ов|у)?|квест[а-я]*|прокачк[а-я]*|прокачива[а-я]*|игрок[а-я]*|навык[а-я]*|талант[а-я]*|очков|статус[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["имба", /(?:^|[^а-яa-z0-9])(имб[а-я]*|сильнейш[а-я]*|максимальн[а-я]*|непобедим[а-я]*|всемогущ[а-я]*|абсолютн[а-я]*|100\s*лет|катастроф[а-я]*|божественн[а-я]*|верховн[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["регрессия", /(?:^|[^а-яa-z0-9])(регресс[а-я]*|вернул[а-я]*\s+в\s+прошл[а-я]*|в\s+начало\s+до|заново|спустя\s+\d+\s+лет|в\s+прошлое)(?=$|[^а-яa-z0-9])/i],
    ["перерождение", /(?:^|[^а-яa-z0-9])(перерожд[а-я]*|реинкарнац[а-я]*|перевопло[а-я]*|начало\s+после\s+конца|стал\s+графским|стал\s+ублюдком|исекай|в\s+другом\s+мире|стал\s+злодеем|стал\s+деревом|переселен[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["подземелья", /(?:^|[^а-яa-z0-9])(подземел[а-я]*|данж[а-я]*|башн[а-я]*|врат(?:а|ах)|охотник[а-я]*|рейд[а-я]*|гробниц[а-я]*|расхитител[а-я]*|лабиринт[а-я]*|прокачка\s+в\s+аду|бездн[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["драконы", /(?:^|[^а-яa-z0-9])(дракон[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["призыв", /(?:^|[^а-яa-z0-9])(призыв[а-я]*|укротител[а-я]*|питом[а-я]*|звер[а-я]*|насеком[а-я]*|гоблин[а-я]*|фамильяр[а-я]*|монстр[а-я]*|рой|роя|эволюци[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["апокалипсис", /(?:^|[^а-яa-z0-9])(апокалипсис[а-я]*|зомби|вирус[а-я]*|судный\s+день|выживан[а-я]*|конец\s+света|мутант[а-я]*|заморозк[а-я]*|ледников[а-я]*|убежищ[а-я]*|припас[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["культивация", /(?:^|[^а-яa-z0-9])(культиват[а-я]*|дао|бессмертн[а-я]*|боевых\s+искусств|мурим[а-я]*|сект[а-я]*|предок|император[а-я]*|небесн[а-я]*|континент[а-я]*|пик\s+боевых)(?=$|[^а-яa-z0-9])/i],
    ["демоны", /(?:^|[^а-яa-z0-9])(демон[а-я]*|дьявол[а-я]*|падш[а-я]*|бог[а-я]*\s+гоблин[а-я]*|под\s+наблюдением\s+бога|злой\s+бог|божеств[а-я]*|асур[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["месть", /(?:^|[^а-яa-z0-9])(мест(?:ь|и|ью)|предател[а-я]*|сокрушен[а-я]*\s+мира|расплат[а-я]*|злоде[а-я]*|ублюд[а-я]*|отброс[а-я]*|убийц[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["артефакты", /(?:^|[^а-яa-z0-9])(оруди[а-я]*|артефакт[а-я]*|кузнец[а-я]*|алхим[а-я]*|сокровищ[а-я]*|транжир[а-я]*|меч[а-я]*|клинок|клинка)(?=$|[^а-яa-z0-9])/i],
    ["фэнтези", /(?:^|[^а-яa-z0-9])(маги[а-я]*|архимаг[а-я]*|маг(?:а|у|ом|и)?|академи[а-я]*|рыцар[а-я]*|паладин[а-я]*|эльф[а-я]*|графств[а-я]*|графск[а-я]*|герцог[а-я]*|принц[а-я]*|королев[а-я]*|мудрец[а-я]*|геро[а-я]*)(?=$|[^а-яa-z0-9])/i]
];

const CLIENT_MANHUA_REGEX = /(?:^|[^а-яa-z0-9])(культиват[а-я]*|дао|бессмертн[а-я]*|боевых\s+искусств|сект[а-я]*|божественн[а-я]*\s+оруди[а-я]*|100\s*лет\s*(?:афк|afk)|в\s+мире\s+зомби|король\s+вирусов|судный\s+день|повелитель\s+насекомых|к\s+богу\s+гоблинов|от\s+гоблина|укротитель\s+драконов|всеобщий\s+отбор|сокрушен[а-я]*\s+мира|в\s+начало\s+до\s+зомби|реинкарнация\s+в\s+начало\s+апокалипсиса|во\s+сне\s+убивая\s+монстров|призыватель\s+sss|призыватель\s+3s|некромант\s+я\s+катастрофа|ням|заморозк[а-я]*|припас[а-я]*|эволюци[а-я]*\s+дерев[а-я]*|злой\s+бог)(?=$|[^а-яa-z0-9])/i;

// Эталонная база проверенных метаданных с ReManga и Senkuro (тип Манхва/Маньхуа + точные теги)
const CURATED_RU_METADATA = {
    "некромант я катастрофа": { type: "manhua", tags: ["некромантия", "система", "имба"] },
    "паладин sss ранга": { type: "manhwa", tags: ["система", "фэнтези", "имба"] },
    "всеобщий отбор укротитель драконов в самом деле самый слабый класс": { type: "manhua", tags: ["драконы", "призыв", "система"] },
    "некромант максимального уровня": { type: "manhwa", tags: ["некромантия", "система", "имба"] },
    "мастер древних божественных орудий": { type: "manhua", tags: ["артефакты", "культивация", "перерождение"] },
    "я перевоплотился в могущественного дракона для сокрушения мира": { type: "manhua", tags: ["драконы", "перерождение", "месть"] },
    "я проснулся имбой после 100 лет afk": { type: "manhua", tags: ["имба", "система", "культивация"] },
    "начало после конца": { type: "manhwa", tags: ["перерождение", "фэнтези", "имба"] },
    "от гоблина к богу гоблинов": { type: "manhua", tags: ["перерождение", "призыв", "система"] },
    "реинкарнация в начало апокалипсиса": { type: "manhua", tags: ["апокалипсис", "регрессия", "система"] },
    "я стал графским ублюдком": { type: "manhwa", tags: ["перерождение", "фэнтези"] },
    "прокачка в аду": { type: "manhwa", tags: ["система", "подземелья", "имба"] },
    "повелитель насекомых": { type: "manhua", tags: ["призыв", "перерождение", "апокалипсис"] },
    "цивилизация мудрецов": { type: "manhwa", tags: ["фэнтези", "демоны"] },
    "некромант катастрофа решил уйти на пенсию": { type: "manhwa", tags: ["некромантия", "имба", "фэнтези"] },
    "перерождение демонического культиватора": { type: "manhua", tags: ["культивация", "апокалипсис", "перерождение"] },
    "призыватель sss ранга": { type: "manhua", tags: ["призыв", "система", "имба"] },
    "я прокачиваюсь во сне убивая монстров": { type: "manhua", tags: ["система", "призыв", "имба"] },
    "судный день я король вирусов": { type: "manhua", tags: ["апокалипсис", "имба", "система"] },
    "великий расхититель гробниц": { type: "manhwa", tags: ["подземелья", "артефакты", "регрессия"] },
    "эволюция дерева": { type: "manhua", tags: ["перерождение", "призыв", "система"] },
    "я стал деревом": { type: "manhua", tags: ["перерождение", "призыв"] },
    "глобальная заморозка": { type: "manhua", tags: ["апокалипсис", "регрессия", "месть"] },
    "ледниковый период": { type: "manhua", tags: ["апокалипсис", "регрессия"] },
    "я коплю припасы в судный день": { type: "manhua", tags: ["апокалипсис", "система"] },
    "таинственный злодей": { type: "manhua", tags: ["система", "культивация", "имба"] },
    "я злой бог": { type: "manhua", tags: ["система", "культивация", "демоны"] },
    "демонический император": { type: "manhua", tags: ["культивация", "перерождение", "месть"] }
};

// Таблица синонимов для стопроцентно одинаковых чистых английских UTM-тегов
const CLIENT_SYNONYM_GROUPS = [
    ["некромант я катастрофа", "ням", "ням (некромант)", "ням некромант", "катастрофический некромант"],
    ["паладин sss ранга", "паладин sss ранга главы", "пsss", "psss"],
    ["всеобщий отбор укротитель драконов в самом деле самый слабый класс", "воудр (дракончик)", "воудр дракончик", "воудр", "дракончик"],
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
];

// Таблица транслитерации в чистый английский (ASCII) без префиксов и без источников
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

// Еженедельные паки заданий
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
            step2: { title: "2. Согреться бесплатными главами", desc: "Нажми — открою вкладку Халявы", action: "free" },
            step3: { title: "3. Подбросить дров в проду (Голос)", desc: "Нажми — проголосуем за тайтл в 1 клик", action: "vote" },
            step4: { title: "4. Открыть зимний VIP-доступ у камина", desc: "Все 725+ серий без ограничений", action: "reward" }
        },
        {
            packTitle: "👑 ДЕКАБРЬ • ПАК 2: ЗИМНИЙ РЕЙД ИМБА-ГЕРОЕВ",
            step2: { title: "2. Выбрать тайтлы про Имба ГГ", desc: "Нажми — включу тег «👑 Имба ГГ»", action: "genre:имба" },
            step3: { title: "3. Открыть случайную линию тайтлов", desc: "Нажми — выберем 4 манхвы на вечер", action: "lucky" },
            step4: { title: "4. Забрать 2 уровень с Лицензиями", desc: "Эксклюзивы + закрытый ТГ-чат", action: "reward" }
        },
        {
            packTitle: "🎄 ДЕКАБРЬ • ПАК 3: НОВОГОДНИЙ ЗАПАС ОЗВУЧКИ",
            step2: { title: "2. Открыть подборку по предпочтениям", desc: "Нажми — покажу полоску рекомендаций", action: "for_you" },
            step3: { title: "3. Вывести тайтл в Топ декабря", desc: "Нажми — отдадим голос в 1 клик", action: "vote" },
            step4: { title: "4. Подарить себе подписку на каникулы", desc: "Сотни часов озвучки без очереди", action: "reward" }
        },
        {
            packTitle: "🎆 ДЕКАБРЬ • ПАК 4: ФИНАЛ ГОДА С СЕМЬЁЙ ТАКА",
            step2: { title: "2. Посмотреть лидеров декабря", desc: "Нажми — покажу Топ голосования", action: "sort:votes_desc" },
            step3: { title: "3. Отдать финальный голос месяца", desc: "Нажми — поддержим выход новых глав", action: "vote" },
            step4: { title: "4. Войти в Новый год с полным доступом", desc: "Все уровни и Лицензии в 1 клик", action: "reward" }
        }
    ]
};

// --- 4 СЕЗОННЫХ СТИЛЯ (МЕНЯЕТСЯ ПАЛИТРА САЙТА + ФОНОВЫЙ СНЕГ/САКУРА/СВЕТЛЯЧКИ + ГИРЛЯНДЫ) ---
const SEASONS_CONFIG = {
    winter: {
        label: "🔥❄️ Зима у камина",
        brandText: "🔥❄️ Тёплый зимний вечер у камина с озвучкой ТАКА!",
        particles: ["❄️", "🔥", "✨", "🐾", "❄️", "🔥"]
    },
    spring: {
        label: "🌸 Оранжевая сакура",
        brandText: "🌸 Весеннее цветение сакуры и свежие главы ТАКА!",
        particles: ["🌸", "🐾", "🌺", "✨", "🌸", "🐾"]
    },
    summer: {
        label: "☀️ Солнечное лето",
        brandText: "☀️ Жаркие летние релизы и марафон озвучки ТАКА!",
        particles: ["☀️", "🔥", "🐾", "✨", "☀️", "🔥"]
    },
    autumn: {
        label: "🍁 Уютная осень",
        brandText: "🍁 Тёплая бархатная осень и ежедневные серии ТАКА!",
        particles: ["🍁", "🐾", "🍂", "🐾", "🍁", "🍂"]
    }
};

function detectSeasonByDate(dateObj = new Date()) {
    const m = dateObj.getMonth() + 1;
    if (m === 12 || m === 1 || m === 2) return 'winter';
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    return 'autumn';
}

function renderSeasonDecorations(seasonKey) {
    const ambientBg = document.getElementById('seasonAmbientBg');
    const garlandBar = document.getElementById('seasonGarlandBar');

    if (garlandBar) {
        if (seasonKey === 'winter') {
            garlandBar.className = 'season-garland-bar has-wire';
            const colors = ['bulb-gold', 'bulb-orange', 'bulb-ruby', 'bulb-emerald'];
            const bulbs = [];
            for (let i = 0; i < 18; i++) {
                bulbs.push(`<span class="garland-bulb ${colors[i % colors.length]}" style="animation-delay:${(i * 0.25).toFixed(2)}s"></span>`);
            }
            garlandBar.innerHTML = bulbs.join('');
        } else if (seasonKey === 'spring') {
            garlandBar.className = 'season-garland-bar';
            const charms = ['🌸', '🌺', '🌸', '✨', '🌸', '🌺', '🌸', '✨', '🌸', '🌺', '🌸', '✨'];
            garlandBar.innerHTML = charms.map((c, i) => `<span class="garland-charm" style="animation-delay:${(i * 0.3).toFixed(2)}s">${c}</span>`).join('');
        } else if (seasonKey === 'summer') {
            garlandBar.className = 'season-garland-bar has-wire';
            const bulbs = [];
            for (let i = 0; i < 14; i++) {
                bulbs.push(`<span class="garland-bulb ${i % 2 === 0 ? 'bulb-gold' : 'bulb-orange'}" style="animation-delay:${(i * 0.3).toFixed(2)}s"></span>`);
            }
            garlandBar.innerHTML = bulbs.join('');
        } else {
            garlandBar.className = 'season-garland-bar has-wire';
            const items = [];
            for (let i = 0; i < 14; i++) {
                if (i % 2 === 0) {
                    items.push(`<span class="garland-bulb bulb-orange" style="animation-delay:${(i * 0.25).toFixed(2)}s"></span>`);
                } else {
                    items.push(`<span class="garland-charm" style="animation-delay:${(i * 0.3).toFixed(2)}s">🍁</span>`);
                }
            }
            garlandBar.innerHTML = items.join('');
        }
    }

    if (ambientBg) {
        const count = window.innerWidth <= 768 ? 10 : 18;
        const pieces = [];
        for (let i = 0; i < count; i++) {
            const left = Math.round((i / count) * 96 + (Math.random() * 4));
            const delay = (Math.random() * 12).toFixed(1);
            const dur = (13 + Math.random() * 10).toFixed(1);

            if (seasonKey === 'winter') {
                const sym = i % 3 === 0 ? '❄️' : (i % 2 === 0 ? '❅' : '•');
                const size = sym === '•' ? (10 + (i % 6)) : (12 + (i % 8));
                pieces.push(`<span class="ambient-particle snow-flake" style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;">${sym}</span>`);
            } else if (seasonKey === 'spring') {
                const sym = i % 2 === 0 ? '🌸' : '💮';
                const size = 11 + (i % 6);
                pieces.push(`<span class="ambient-particle sakura-petal" style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;">${sym}</span>`);
            } else if (seasonKey === 'summer') {
                const top = Math.round(15 + Math.random() * 75);
                const fDur = (4 + Math.random() * 4).toFixed(1);
                pieces.push(`<span class="ambient-particle summer-firefly" style="left:${left}%;top:${top}%;animation-duration:${fDur}s;animation-delay:-${delay}s;"></span>`);
            } else {
                const sym = i % 2 === 0 ? '🍁' : '🍂';
                const size = 12 + (i % 6);
                pieces.push(`<span class="ambient-particle autumn-leaf" style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;">${sym}</span>`);
            }
        }
        ambientBg.innerHTML = pieces.join('');
    }
}

function applySeasonStyle(seasonKey) {
    const validSeason = SEASONS_CONFIG[seasonKey] ? seasonKey : detectSeasonByDate();
    document.documentElement.setAttribute('data-season', validSeason);
    try { localStorage.setItem('taka_selected_season', validSeason); } catch (e) {}

    const cfg = SEASONS_CONFIG[validSeason];
    const seasonBtn = document.getElementById('seasonBadgeBtn');
    if (seasonBtn) seasonBtn.textContent = cfg.label;

    const brandEl = document.getElementById('heroBrandBadge');
    if (brandEl) brandEl.textContent = cfg.brandText;

    const particlesEl = document.getElementById('seasonParticles');
    if (particlesEl) {
        particlesEl.innerHTML = cfg.particles.map(p => `<span>${p}</span>`).join('');
    }

    renderSeasonDecorations(validSeason);
}

function initSeasonalStyleEngine() {
    const savedSeason = localStorage.getItem('taka_selected_season');
    const autoSeason = savedSeason && SEASONS_CONFIG[savedSeason] ? savedSeason : detectSeasonByDate(now);
    applySeasonStyle(autoSeason);

    const seasonBtn = document.getElementById('seasonBadgeBtn');
    if (seasonBtn) {
        const order = ['autumn', 'winter', 'spring', 'summer'];
        seasonBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-season') || autoSeason;
            const next = order[(order.indexOf(current) + 1) % order.length];
            applySeasonStyle(next);
        });
    }
}

// Открытие модального окна с инструкцией оплаты по нажатию на маленький вопросик (?)
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

// --- РАБОТА С COOKIE И АНОНИМНЫМ ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ ---
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
            nav.language || '',
            nav.platform || '',
            nav.hardwareConcurrency || '',
            nav.deviceMemory || '',
            scr.width || 0,
            scr.height || 0,
            scr.colorDepth || 0,
            tz
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
    try {
        uid = localStorage.getItem(ANON_USER_UID_KEY) || getCookie(ANON_USER_UID_KEY);
    } catch (e) {}

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

// Помесячные хранилища голосов, поисков, квестов, метаданных ReManga/Senkuro и предпочтений
let votesFileMap = {};
let votesCache = {};
let monthlySearchMap = {};
let missingQueriesMap = {};
let userVotedMap = {};
let pendingVotesQueue = [];
let questsState = { step1: true, step2: false, step3: false, step4: false };
let userFavoriteTags = {};
let userInteractionCount = 0;
let ruMetadataCache = {};
let liveGoalStats = { current: 174, target: 200, left: 26, percent: 87 };

try { votesCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}'); } catch (e) { votesCache = {}; }
try { monthlySearchMap = JSON.parse(localStorage.getItem(LOCAL_SEARCH_COUNT_KEY) || '{}'); } catch (e) { monthlySearchMap = {}; }
try { missingQueriesMap = JSON.parse(localStorage.getItem(LOCAL_MISSING_LOG_KEY) || '{}'); } catch (e) { missingQueriesMap = {}; }
try { ruMetadataCache = JSON.parse(localStorage.getItem(RU_METADATA_CACHE_KEY) || '{}'); } catch (e) { ruMetadataCache = {}; }
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
    const rawTags = JSON.parse(localStorage.getItem(USER_TAG_PREFS_KEY) || localStorage.getItem('taka_user_favorite_tags_v2') || '{}');
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
    renderTopForYouStrip();
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

function resolveCanonicalTitleClient(title) {
    const norm = normalizeTitleForMatch(title);
    if (!norm) return String(title || 'title');
    for (const group of CLIENT_SYNONYM_GROUPS) {
        const normGroup = group.map(x => normalizeTitleForMatch(x));
        if (normGroup.includes(norm)) {
            return group[0];
        }
        for (const syn of normGroup) {
            if (syn.length > 5 && (norm.startsWith(syn) || syn.startsWith(norm))) {
                return group[0];
            }
        }
    }
    return norm;
}

// Чистый английский транслит-тег БЕЗ префикса title_ и БЕЗ русских символов
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

    const cleanSlug = out
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 48);

    return cleanSlug || 'manga_title';
}

// Определение одиночных тегов и типа (manhwa / manhua) с учётом базы ReManga / Senkuro
function detectClientTagsAndType(title, itemObj = {}) {
    const canonical = resolveCanonicalTitleClient(title);

    // 1. Эталонная база проверенных тайтлов ReManga / Senkuro
    if (CURATED_RU_METADATA[canonical]) {
        return {
            tags: [...CURATED_RU_METADATA[canonical].tags],
            contentType: CURATED_RU_METADATA[canonical].type
        };
    }

    // 2. Если update.py уже сохранил спарсенные с ReManga / Senkuro метаданные в data.json
    if (itemObj.ru_parsed_ok && Array.isArray(itemObj.genres) && itemObj.genres.length > 0 && (itemObj.content_type === 'manhwa' || itemObj.content_type === 'manhua')) {
        const validTags = itemObj.genres
            .map(g => LEGACY_TAG_MIGRATION[g] || g)
            .filter(g => READER_TAGS_DICTIONARY[g]);
        if (validTags.length > 0) {
            return {
                tags: validTags.slice(0, 3),
                contentType: itemObj.content_type
            };
        }
    }

    // 3. Клиентский кэш спарсенных метаданных ReManga / Senkuro
    if (ruMetadataCache[canonical]) {
        const cached = ruMetadataCache[canonical];
        if (Array.isArray(cached.tags) && cached.tags.length > 0 && cached.type) {
            return {
                tags: cached.tags.slice(0, 3),
                contentType: cached.type
            };
        }
    }

    // 4. Строгий анализ по регулярным выражениям
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

    const contentType = (itemObj.content_type === 'manhua' || itemObj.content_type === 'manhwa')
        ? itemObj.content_type
        : ((CLIENT_MANHUA_REGEX.test(t) || tags.includes('культивация')) ? 'manhua' : 'manhwa');

    return {
        tags: tags.slice(0, 3),
        contentType
    };
}

// Фоновое подтягивание тегов и типа (Манхва / Маньхуа) с популярных РУ-сайтов (ReManga / Senkuro / Shikimori)
async function enrichCatalogMetadataFromRuSites() {
    const uncachedItems = allItems.filter(it => {
        const canonical = resolveCanonicalTitleClient(it.title);
        return !CURATED_RU_METADATA[canonical] && !it.ru_parsed_ok && !ruMetadataCache[canonical];
    }).slice(0, 12);

    if (uncachedItems.length === 0) return;

    let updatedAny = false;

    for (const item of uncachedItems) {
        const canonical = resolveCanonicalTitleClient(item.title);
        try {
            const q = encodeURIComponent(item.title);
            const res = await fetch(`https://api.remanga.org/api/search/?query=${q}&count=3`, { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                const list = (data && Array.isArray(data.content)) ? data.content : [];
                if (list.length > 0) {
                    const hit = list[0];
                    const typeObj = hit.type;
                    const typeStr = String((typeObj && (typeObj.name || typeObj.rus_name)) || typeObj || '').toLowerCase();
                    let cType = item.content_type || 'manhwa';
                    if (typeStr.includes('маньхуа') || typeStr.includes('manhua')) cType = 'manhua';
                    else if (typeStr.includes('манхва') || typeStr.includes('manhwa')) cType = 'manhwa';

                    const rawTags = [];
                    ['genres', 'categories', 'tags'].forEach(f => {
                        if (Array.isArray(hit[f])) {
                            hit[f].forEach(el => {
                                const name = typeof el === 'object' ? (el.name || el.rus_name || '') : String(el || '');
                                if (name) rawTags.push(name.toLowerCase().replace(/ё/g, 'е').trim());
                            });
                        }
                    });

                    const mapped = [];
                    rawTags.forEach(rt => {
                        if (RU_SITE_TAG_MAPPING[rt] && !mapped.includes(RU_SITE_TAG_MAPPING[rt])) {
                            mapped.push(RU_SITE_TAG_MAPPING[rt]);
                        } else {
                            Object.entries(RU_SITE_TAG_MAPPING).forEach(([k, v]) => {
                                if (k.length >= 4 && rt.includes(k) && !mapped.includes(v)) {
                                    mapped.push(v);
                                }
                            });
                        }
                    });

                    if (mapped.length > 0 || cType) {
                        const finalTags = mapped.length > 0 ? mapped.slice(0, 3) : item.genres;
                        item.genres = finalTags;
                        item.content_type = cType;
                        ruMetadataCache[canonical] = { type: cType, tags: finalTags };
                        updatedAny = true;
                    }
                }
            }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 220));
    }

    if (updatedAny) {
        try { localStorage.setItem(RU_METADATA_CACHE_KEY, JSON.stringify(ruMetadataCache)); } catch (e) {}
        applyFilters();
    }
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

// Формирует чистую ссылку на Boosty ТОЛЬКО с английским названием тайтла
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

// Помесячный учёт поисков и кликов по тайтлу
function incrementMonthlyTitlePopularity(item, weight = 1) {
    if (!item || !item.id) return;
    const strId = String(item.id);
    const nextVal = (Number(monthlySearchMap[strId]) || Number(item.monthly_searches) || 0) + weight;
    monthlySearchMap[strId] = nextVal;
    item.monthly_searches = nextVal;

    try {
        localStorage.setItem(LOCAL_SEARCH_COUNT_KEY, JSON.stringify(monthlySearchMap));
    } catch (e) {}

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

// Запись поискового запроса, если тайтла НЕТ на Boosty
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

    try {
        localStorage.setItem(LOCAL_MISSING_LOG_KEY, JSON.stringify(missingQueriesMap));
    } catch (e) {}

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

        window.dataLayer = window.dataLayer || [];
        if (goalName === 'click_title' || goalName === 'click_cover_image' || goalName === 'click_week_new' || goalName === 'click_month_new_title') {
            if (payload.item && payload.item.has_free) {
                completeQuestStep(2);
            }
            window.dataLayer.push({
                ecommerce: {
                    currencyCode: "RUB",
                    detail: {
                        products: [{
                            id: engTag,
                            name: cleanTitle,
                            category: CURRENT_MONTH_KEY,
                            price: levelNum === 2 ? 500 : 250
                        }]
                    }
                }
            });
        } else if (goalName === 'click_want_proda') {
            window.dataLayer.push({
                ecommerce: {
                    currencyCode: "RUB",
                    add: {
                        products: [{
                            id: engTag,
                            name: cleanTitle,
                            category: CURRENT_MONTH_KEY,
                            price: levelNum === 2 ? 500 : 250,
                            quantity: 1
                        }]
                    }
                }
            });
        }

        if (typeof window.ym === 'function') {
            window.ym(YM_ID, 'setUserID', CURRENT_USER_UID);
            window.ym(YM_ID, 'reachGoal', goalName, {
                title: cleanTitle,
                utm_campaign: engTag,
                month: CURRENT_MONTH_KEY
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
    try {
        localStorage.setItem(QUESTS_STATE_KEY, JSON.stringify(questsState));
    } catch (e) {}
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

function runLazyQuestAction(stepNumber) {
    const activePack = getCurrentWeeklyQuestPack();
    const stepCfg = activePack[`step${stepNumber}`] || {};
    const action = stepCfg.action || (stepNumber === 2 ? 'free' : (stepNumber === 3 ? 'vote' : 'reward'));

    completeQuestStep(stepNumber);

    if (action === 'free') {
        const freeTab = document.querySelector('.tier-tab[data-tier="free"]');
        if (freeTab) freeTab.click();
        const nav = document.getElementById('stickyNav');
        if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'for_you') {
        forYouStripHiddenByUser = false;
        userInteractionCount = Math.max(userInteractionCount, 1);
        if (getActivePreferredTags().length === 0) {
            userFavoriteTags['система'] = 2;
            userFavoriteTags['имба'] = 2;
        }
        saveUserTagPrefs();
        const strip = document.getElementById('forYouTopStrip');
        if (strip) strip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (action.startsWith('sort:')) {
        const sortKey = action.split(':')[1];
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.value = sortKey;
            applyFilters();
        }
    } else if (action.startsWith('genre:')) {
        const genreKey = action.split(':')[1];
        const pill = document.querySelector(`.genre-pill[data-genre="${genreKey}"]`);
        if (pill) pill.click();
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

// --- ЛИНИЯ СЛУЧАЙНЫХ ТАЙТЛОВ («🎲 МНЕ ПОВЕЗЁТ!») ---
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
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (chosenFour[0]) {
        updateCatWidgetContext(chosenFour[0], false);
    }

    trackGoal('click_random_line', {
        title: 'Подборка Мне повезёт',
        metric_tag: 'lucky_row',
        level: 1
    });
}

// --- ПЕРВАЯ СТРОКА: ПОЛОСКА РЕКОМЕНДАЦИЙ «💖 ПО ВАШИМ ПРЕДПОЧТЕНИЯМ» (ПОЯВЛЯЕТСЯ ПОСЛЕ СБОРА ДАННЫХ О ПОЛЬЗОВАТЕЛЕ) ---
function renderTopForYouStrip() {
    const stripEl = document.getElementById('forYouTopStrip');
    const gridEl = document.getElementById('forYouRowGrid');
    const matchedTextEl = document.getElementById('forYouMatchedTagsText');
    const tagsListEl = document.getElementById('userPrefsTagsList');
    if (!stripEl || !gridEl || allItems.length === 0) return;

    const prefTags = getActivePreferredTags();

    // Полоска появляется только после того, как о пользователе собрана информация (клик по тайтлу, голос, поиск или выбор тега)
    if (forYouStripHiddenByUser || (prefTags.length === 0 && userInteractionCount < 1)) {
        stripEl.style.display = 'none';
        return;
    }

    const topPrefTags = prefTags.slice(0, 3);
    if (matchedTextEl) {
        if (topPrefTags.length > 0) {
            const labels = topPrefTags.map(t => READER_TAGS_DICTIONARY[t] || t).join(', ');
            matchedTextEl.textContent = `На основе ваших интересов: ${labels}`;
        } else {
            matchedTextEl.textContent = `Подобрано специально для вас`;
        }
    }

    if (tagsListEl) {
        tagsListEl.innerHTML = Object.entries(READER_TAGS_DICTIONARY).map(([tagKey, label]) => {
            const isSelected = prefTags.includes(tagKey);
            return `<button type="button" class="pref-tag-chip ${isSelected ? 'selected' : ''}" data-tag="${tagKey}">${label}</button>`;
        }).join('');

        tagsListEl.querySelectorAll('.pref-tag-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.dataset.tag;
                if (userFavoriteTags[tag] && Number(userFavoriteTags[tag]) > 0) {
                    delete userFavoriteTags[tag];
                } else {
                    userFavoriteTags[tag] = 3;
                    userInteractionCount = Math.max(userInteractionCount, 1);
                }
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

    if (recommended.length === 0) {
        stripEl.style.display = 'none';
        return;
    }

    gridEl.innerHTML = '';
    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0));
    const topMap = getTopThreeVoteMap();

    recommended.forEach((item, idx) => {
        const cardEl = createCatalogCardElement(item, maxTs, topMap, idx < 2);
        gridEl.appendChild(cardEl);
    });

    stripEl.style.display = 'block';
}

// --- РАСКРЫВАЮЩАЯСЯ ПАНЕЛЬ ЖАНРОВ И АЛФАВИТА (А–Я) ---
function initCollapsibleGenresAndAlphabet() {
    const toggleGenresBtn = document.getElementById('toggleGenresBtn');
    const genresDrawer = document.getElementById('genrePillsDrawer');
    const activeGenreBadge = document.getElementById('activeGenreLabelBadge');

    const toggleAlphaBtn = document.getElementById('toggleAlphaBtn');
    const alphaDrawer = document.getElementById('alphaPillsDrawer');
    const alphaRow = document.getElementById('alphaPillsRow');
    const activeLetterBadge = document.getElementById('activeLetterBadge');

    // Генерируем кнопки русского алфавита (Все + А..Я)
    if (alphaRow) {
        const buttonsHtml = [
            `<button type="button" class="alpha-pill active" data-letter="all">Все</button>`,
            ...RUSSIAN_ALPHABET.map(letter => `<button type="button" class="alpha-pill" data-letter="${letter}">${letter}</button>`)
        ].join('');
        alphaRow.innerHTML = buttonsHtml;

        alphaRow.querySelectorAll('.alpha-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                alphaRow.querySelectorAll('.alpha-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeLetterFilter = btn.dataset.letter || 'all';

                if (activeLetterBadge) {
                    if (activeLetterFilter !== 'all') {
                        activeLetterBadge.style.display = 'inline-block';
                        activeLetterBadge.textContent = activeLetterFilter;
                    } else {
                        activeLetterBadge.style.display = 'none';
                    }
                }
                applyFilters();
            });
        });
    }

    if (toggleGenresBtn && genresDrawer) {
        toggleGenresBtn.addEventListener('click', () => {
            if (alphaDrawer && alphaDrawer.classList.contains('open')) {
                alphaDrawer.classList.remove('open');
                if (toggleAlphaBtn) toggleAlphaBtn.classList.remove('open');
            }
            const isOpen = genresDrawer.classList.toggle('open');
            toggleGenresBtn.classList.toggle('open', isOpen);
            toggleGenresBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            genresDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        });
    }

    if (toggleAlphaBtn && alphaDrawer) {
        toggleAlphaBtn.addEventListener('click', () => {
            if (genresDrawer && genresDrawer.classList.contains('open')) {
                genresDrawer.classList.remove('open');
                if (toggleGenresBtn) toggleGenresBtn.classList.remove('open');
            }
            const isOpen = alphaDrawer.classList.toggle('open');
            toggleAlphaBtn.classList.toggle('open', isOpen);
            toggleAlphaBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            alphaDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        });
    }

    document.querySelectorAll('.genre-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeGenreFilter = pill.dataset.genre || 'all';

            if (activeGenreFilter === 'all' && activeLetterFilter !== 'all') {
                activeLetterFilter = 'all';
                if (alphaRow) {
                    alphaRow.querySelectorAll('.alpha-pill').forEach(b => b.classList.toggle('active', b.dataset.letter === 'all'));
                }
                if (activeLetterBadge) activeLetterBadge.style.display = 'none';
            }

            if (activeGenreBadge) {
                if (READER_TAGS_DICTIONARY[activeGenreFilter]) {
                    activeGenreBadge.style.display = 'inline-block';
                    activeGenreBadge.textContent = READER_TAGS_DICTIONARY[activeGenreFilter];
                } else {
                    activeGenreBadge.style.display = 'none';
                }
            }

            if (READER_TAGS_DICTIONARY[activeGenreFilter]) {
                userInteractionCount += 1;
                userFavoriteTags[activeGenreFilter] = (Number(userFavoriteTags[activeGenreFilter]) || 0) + 1;
                saveUserTagPrefs();
            }

            applyFilters();
        });
    });
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
    initSeasonalStyleEngine();
    initThemeToggle();
    initViewSwitcher();
    initCollapsibleGenresAndAlphabet();
    renderQuestsUI();
    initInfiniteScrollObserver();

    // Мобильное сворачивание/разворачивание пака заданий
    const wqStrip = document.getElementById('weeklyQuestsStrip');
    const wqHeader = document.getElementById('wqToggleHeader');
    if (wqStrip && wqHeader) {
        wqHeader.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                wqStrip.classList.toggle('mobile-open');
            }
        });
    }

    const resetInfoEl = document.getElementById('voteResetInfo');
    if (resetInfoEl) {
        resetInfoEl.textContent = `🐾 Счётчик месяца: ${CURRENT_MONTH_HUMAN} (новый счётчик каждого 1-го числа)`;
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

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-wrap')) {
            const sug = document.getElementById('searchSuggestions');
            if (sug) sug.classList.remove('open');
        }
    });

    document.querySelectorAll('.tier-tab[data-tier]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tier-tab[data-tier]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTierTab = tab.dataset.tier;
            if (activeTierTab === 'free') completeQuestStep(2);
            applyFilters();
        });
    });

    const typeFilterSelect = document.getElementById('typeFilterSelect');
    if (typeFilterSelect) {
        typeFilterSelect.addEventListener('change', () => {
            activeContentTypeFilter = typeFilterSelect.value || 'all';
            applyFilters();
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
            forYouStripHiddenByUser = true;
            const strip = document.getElementById('forYouTopStrip');
            if (strip) strip.style.display = 'none';
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

        // Гарантируем прямую ссылку на последний пост внутри бандла, если есть latest_post_id или ссылка на /posts/
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

        const paidChapters = Math.max(0, totalChapters - freeChapters);
        const hasFree = Boolean(item.has_free || freeChapters > 0);
        const freeText = hasFree
            ? (item.free_text || `🆓 Бесплатно: ${freeChapters} гл.`)
            : '';

        const engMetricTag = makeCleanEnglishTag(cleanTitle);
        const { tags: genres, contentType } = detectClientTagsAndType(cleanTitle, item);

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
            free_chapters: freeChapters,
            paid_chapters: paidChapters,
            has_free: hasFree,
            free_text: freeText,
            metric_tag: engMetricTag,
            genres: genres,
            latest_range: latestRange,
            tier: tierText,
            tier_level: levelNum,
            link: feedLink,
            latest_post_link: latestPostLink,
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
    enrichCatalogMetadataFromRuSites();
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
    const cFree = document.getElementById('count-free');
    const c1 = document.getElementById('count-t1');
    const c2 = document.getElementById('count-t2');

    const t1Items = allItems.filter(i => i.tier_level === 1);
    const t2Items = allItems.filter(i => i.tier_level === 2);
    const totalChaptersSum = allItems.reduce((acc, i) => acc + (Number(i.chapters) || 0), 0);

    if (cAll) cAll.textContent = allItems.length;
    if (cFree) cFree.textContent = allItems.filter(i => i.has_free || i.free_chapters > 0).length;
    if (c1) c1.textContent = t1Items.length;
    if (c2) c2.textContent = t2Items.length;

    const desc1 = document.getElementById('subBannerDesc1');
    const desc2 = document.getElementById('subBannerDesc2');
    if (desc1 && t1Items.length > 0) {
        desc1.textContent = `Прямой доступ к ${t1Items.length} тайтлам базовой базы + новые серии раньше всех`;
    }
    if (desc2 && allItems.length > 0) {
        desc2.textContent = `Все ${allItems.length} тайтлов (${totalChaptersSum > 0 ? totalChaptersSum.toLocaleString('ru-RU') + '+ глав' : '725+ видео'}), Лицензии + ТГ-чат`;
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

// В блоке «Новые главы за неделю» клик перекидывает ПРЯМО на последний пост этих глав внутри бандла
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
        weekTitleEl.textContent = `🔥 Новые главы за неделю (${recentWeekReleases.length}) — сразу на пост глав`;
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
                   data-id="${i.id}" data-metric-tag="${i.metric_tag}" title="Открыть сразу последний пост с новыми главами «${safeTitle}» на Boosty">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span class="hl-chip-sub">▶ Пост: ${rangeBadge} ↗</span>
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
                        <span class="hl-chip-sub">👑 Новый тайтл • ${i.chapters > 0 ? `1-${i.chapters} гл.` : "В ленте"}</span>
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
            <span style="color:var(--text-muted);font-size:11.5px;">🔥 ${item.votes || 0} • ${item.chapters > 0 ? item.chapters + ' гл.' : 'В ленте'}</span>
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
    try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(votesCache));
    } catch (e) {}
}

function savePendingVotesQueue() {
    try {
        localStorage.setItem(PENDING_VOTES_KEY, JSON.stringify(pendingVotesQueue));
    } catch (e) {}
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

// --- ОБЩАЯ ФИЛЬТРАЦИЯ (ПОДПИСКИ, МАНХВА/МАНЬХУА, ЖАНРЫ, АЛФАВИТ А–Я, ТОПЫ) ---
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const rawSearch = searchInput ? searchInput.value.trim() : '';
    const searchText = rawSearch.toLowerCase();
    const sortSelect = document.getElementById('sortSelect');
    const sortValue = sortSelect ? sortSelect.value : 'update_desc';

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
        if (activeGenreFilter !== 'all') {
            matchesGenre = Array.isArray(item.genres) && item.genres.includes(activeGenreFilter);
        }

        let matchesLetter = true;
        if (activeLetterFilter !== 'all') {
            const firstChar = String(item.title || '').trim().charAt(0).toUpperCase().replace('Ё', 'Е');
            matchesLetter = firstChar === activeLetterFilter;
        }

        return matchesSearch && matchesTier && matchesType && matchesGenre && matchesLetter;
    });

    if (rawSearch.length >= 3 && filtered.length > 0 && filtered.length <= 3) {
        missingSearchTimer = setTimeout(() => {
            recordUserTagInterest(filtered[0], 1);
            incrementMonthlyTitlePopularity(filtered[0], 1);
        }, 1000);
    }

    if (rawSearch.length >= 3 && filtered.length === 0 && activeTierTab === 'all' && activeGenreFilter === 'all' && activeContentTypeFilter === 'all' && activeLetterFilter === 'all') {
        missingSearchTimer = setTimeout(() => {
            recordMissingSearchQuery(rawSearch);
        }, 900);
    }

    filtered.sort((a, b) => {
        if (a._isSpotlight && !b._isSpotlight) return -1;
        if (!a._isSpotlight && b._isSpotlight) return 1;

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

    const totalEl = document.getElementById('totalTitlesCount');
    if (totalEl) {
        const manhwaCnt = filtered.filter(x => x.content_type === 'manhwa').length;
        const manhuaCnt = filtered.filter(x => x.content_type === 'manhua').length;
        totalEl.textContent = `🐾 Найдено: ${filtered.length} из ${allItems.length} (🇰🇷 Манхва: ${manhwaCnt} • 🇨🇳 Маньхуа: ${manhuaCnt})`;
    }

    resetAndRenderCatalog(filtered, rawSearch);
}

// Создание карточки с чистыми английскими UTM-метками, типом Манхва/Маньхуа и вопросиком (?) возле кнопки Подписаться
function createCatalogCardElement(item, maxTs, topThreeMap, isPriorityImage = false) {
    const card = document.createElement('div');
    const isLicense = item.tier_level === 2;
    const hasFree = item.has_free || item.free_chapters > 0;
    const frameClass = `tier-frame-${item.tier_level || 1}`;
    card.className = `card ${frameClass} ${hasFree ? 'has-free-card' : ''} ${item._isSpotlight ? 'anchor-spotlight' : ''}`;

    card.setAttribute('data-metric-tag', item.metric_tag);
    card.setAttribute('data-utm-campaign', item.metric_tag);
    card.setAttribute('data-title-id', item.title);
    card.setAttribute('data-month', CURRENT_MONTH_KEY);
    card.setAttribute('data-level', item.tier_level);

    const voted = hasUserVoted(item.id);
    const cleanWatchUrl = appendBoostyUtm(item.link, item.metric_tag);
    const cleanSubUrl = appendBoostyUtm(item.sub_link, item.metric_tag);
    const isNewRelease = item.timestamp && (maxTs - item.timestamp) <= (5 * 86400);

    const totalChText = item.chapters > 0 ? `${item.chapters} гл.` : 'В ленте';
    const freeChCount = item.free_chapters || 0;
    const paidChCount = item.chapters > 0 ? Math.max(0, item.chapters - freeChCount) : 0;

    const topRank = topThreeMap[item.id];
    const rankLabels = { 1: '🏆 Топ-1 проды', 2: '🥈 Топ-2 проды', 3: '🥉 Топ-3 проды' };
    const topVoteBadgeHtml = topRank
        ? `<span class="badge-top-vote-rank">${rankLabels[topRank]}</span>`
        : '';

    const freePillHtml = hasFree
        ? `<span class="stat-pill stat-free" title="Доступно бесплатно без подписки">🆓 Бесплатно: <b>${freeChCount > 0 ? freeChCount + ' гл.' : 'Есть'}</b></span>`
        : `<span class="stat-pill stat-no-free" title="Доступно по подписке Boosty">🆓 Бесплатно: <b>0 гл.</b></span>`;

    const paidPillHtml = item.chapters > 0
        ? `<span class="stat-pill stat-paid" title="Главы по подписке">🔒 Платно: <b>${paidChCount} гл.</b></span>`
        : `<span class="stat-pill stat-paid">🔒 По подписке</span>`;

    const watchBtnLabel = hasFree
        ? (freeChCount > 0 ? `🎁 ${freeChCount} гл. бесплатно` : '🎁 Смотреть')
        : '▶ Смотреть';

    const typeLabel = CONTENT_TYPE_LABELS[item.content_type] || '🇰🇷 Манхва';
    const typeTagHtml = `<span class="card-type-tag" data-type="${item.content_type || 'manhwa'}" title="Фильтровать по типу: ${typeLabel}">${typeLabel}</span>`;

    const miniTagsHtml = (item.genres || []).slice(0, 3).map(gKey => {
        const label = READER_TAGS_DICTIONARY[gKey] || gKey;
        return `<span class="card-mini-tag" data-genre="${gKey}" title="Фильтровать по жанру: ${label}">${label}</span>`;
    }).join('');

    const imgLoadAttrs = isPriorityImage
        ? `fetchpriority="high" decoding="async"`
        : `loading="lazy" decoding="async"`;

    card.innerHTML = `
        <a href="${cleanWatchUrl}" target="_blank" rel="noopener" class="card-link" data-metric-tag="${item.metric_tag}">
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
            <span class="chapters-floating-badge">Всего: ${totalChText}</span>
            ${hasFree ? `<span class="badge-free-access">${item.free_text || `🎁 Бесплатно: ${freeChCount} гл.`}</span>` : ''}
            ${isNewRelease ? `<span class="badge-hot-new">🔥 ${item.latest_range || 'НОВИНКА'}</span>` : ''}
        </a>
        <div class="card-info">
            <div>
                <a href="${cleanWatchUrl}" target="_blank" rel="noopener" class="card-title-link" data-metric-tag="${item.metric_tag}">
                    <h3>${item.title}</h3>
                </a>
                <div class="card-tags-row">${typeTagHtml}${miniTagsHtml}</div>
            </div>

            <div class="card-bottom-wrap">
                <div class="chapters-breakdown">
                    ${freePillHtml}
                    ${paidPillHtml}
                </div>

                <span class="tier-neutral-pill ${isLicense ? 'tier-pill-license' : ''}">${item.tier}</span>

                <div class="action-buttons-row">
                    <a href="${cleanWatchUrl}" target="_blank" rel="noopener" class="watch-feed-link ${hasFree ? 'watch-free-emerald' : ''}" data-metric-tag="${item.metric_tag}">
                        ${watchBtnLabel}
                    </a>
                    <div class="buy-sub-group">
                        <a href="${cleanSubUrl}" target="_blank" rel="noopener" class="buy-tier-link ${isLicense ? 'buy-license-gold' : ''}" data-metric-tag="${item.metric_tag}">
                            Подписаться
                        </a>
                        <button type="button" class="card-sub-help-q" title="Как оплатить подписку из Украины, ЕС или СНГ? Нажмите для инструкции">?</button>
                    </div>
                </div>

                <div class="details">
                    <span>Озвучено: <b>${totalChText}</b></span>
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

    const typeTagEl = card.querySelector('.card-type-tag');
    if (typeTagEl) {
        typeTagEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const cType = typeTagEl.dataset.type || 'all';
            const sel = document.getElementById('typeFilterSelect');
            if (sel) {
                sel.value = sel.value === cType ? 'all' : cType;
                activeContentTypeFilter = sel.value;
                applyFilters();
            }
        });
    }

    card.querySelectorAll('.card-mini-tag').forEach(tagEl => {
        tagEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const gKey = tagEl.dataset.genre;
            const pill = document.querySelector(`.genre-pill[data-genre="${gKey}"]`);
            if (pill) pill.click();
        });
    });

    const qHelpBtn = card.querySelector('.card-sub-help-q');
    if (qHelpBtn) {
        qHelpBtn.addEventListener('click', (e) => openPaymentGuideModal(e));
    }

    const coverLink = card.querySelector('.card-link');
    if (coverLink) {
        const sendImageMetric = () => {
            trackGoal('click_cover_image', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level,
                item: item
            });
        };
        coverLink.addEventListener('click', sendImageMetric);
        coverLink.addEventListener('auxclick', (e) => {
            if (e.button === 1) sendImageMetric();
        });
    }

    card.querySelectorAll('.card-title-link, .watch-feed-link').forEach(link => {
        const sendTitleMetric = () => {
            trackGoal('click_title', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level,
                item: item
            });
        };
        link.addEventListener('click', sendTitleMetric);
        link.addEventListener('auxclick', (e) => {
            if (e.button === 1) sendTitleMetric();
        });
    });

    const buyLink = card.querySelector('.buy-tier-link');
    if (buyLink) {
        const sendSubMetric = () => {
            trackSubConversion({
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level
            });
        };
        buyLink.addEventListener('click', sendSubMetric);
        buyLink.addEventListener('auxclick', (e) => {
            if (e.button === 1) sendSubMetric();
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
                ? 'Бесплатные главы обновляются — переключитесь на «Все тайтлы» 🐾'
                : 'По выбранному фильтру ничего не найдено — попробуйте сбросить фильтр или букву 🐾';
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

// --- РЕКОМЕНДАТЕЛЬНЫЙ ВИДЖЕТ С РЫЖИМ КОТИКОМ ТАКА ---
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
            trackGoal('cat_widget_minimize', {
                title: catWidgetCurrentItem ? catWidgetCurrentItem.title : 'Виджет котика',
                metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : 'cat_widget',
                level: catWidgetSelectedTier
            });
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
                trackGoal('cat_widget_open', {
                    title: catWidgetCurrentItem ? catWidgetCurrentItem.title : 'Виджет котика',
                    metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : 'cat_widget',
                    level: catWidgetSelectedTier
                });
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
            trackGoal('cat_widget_impression', {
                title: catWidgetCurrentItem ? catWidgetCurrentItem.title : 'Виджет котика',
                metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : 'cat_widget',
                level: catWidgetSelectedTier
            });
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
