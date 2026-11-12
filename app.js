let allItems = [];
let activeTierTab = 'all';
let activeGenreFilter = 'all';
let renderedCardsCount = 0;
let lastFilteredItems = [];
let infiniteScrollObserver = null;
const BATCH_LOAD_SIZE = 20;
const YM_ID = 114099972;

// Единый UTC-месяц и номер недели для синхронизации голосов и еженедельных паков заданий
const now = new Date();
const CURRENT_MONTH_KEY = `${now.getUTCFullYear()}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
const CURRENT_WEEK_INDEX = Math.min(3, Math.floor((now.getUTCDate() - 1) / 7)); // 0..3 (4 пака на каждый месяц)
const CURRENT_WEEK_KEY = `${CURRENT_MONTH_KEY}_w${CURRENT_WEEK_INDEX + 1}`;
const VOTE_NAMESPACE = `takayt_vitrina_${CURRENT_MONTH_KEY}`;
const LOCAL_CACHE_KEY = `taka_votes_cache_${CURRENT_MONTH_KEY}`;
const USER_VOTED_MAP_KEY = `taka_user_voted_map_${CURRENT_MONTH_KEY}`;
const PENDING_VOTES_KEY = `taka_pending_votes_${CURRENT_MONTH_KEY}`;
const QUESTS_STATE_KEY = `taka_weekly_quests_${CURRENT_WEEK_KEY}`;
const USER_TAG_PREFS_KEY = 'taka_user_favorite_tags_v1';
const ANON_USER_UID_KEY = 'taka_anon_user_uid_v1';

// Справочник 12 тегов читалки с русскими названиями и иконками
const READER_TAGS_DICTIONARY = {
    "некромантия": "💀 Некромантия",
    "система": "⚡ Система и Уровни",
    "имба_гг": "👑 Имба ГГ",
    "перерождение": "🔄 Перерождение",
    "подземелья": "🏰 Подземелья",
    "драконы_и_призыв": "🐉 Драконы и Призыв",
    "апокалипсис": "☣️ Апокалипсис",
    "культивация": "🏯 Культивация",
    "магия_и_фэнтези": "🧙‍♂️ Магия и Фэнтези",
    "демоны_и_боги": "😈 Демоны и Боги",
    "месть": "🗡️ Месть",
    "артефакты": "💎 Артефакты"
};

// Правила автоматического присвоения тегов на клиенте (синхронизированы с интернет-парсером в update.py)
const CLIENT_TAG_RULES = [
    ["некромантия", ["некромант", "скелет", "мертв", "нежить", "лич", "жнец", "кладбищ", "кост"]],
    ["система", ["система", "уров", "лвл", "lvl", "ранг", "sss", "квест", "статус", "игрок", "навык", "класс"]],
    ["имба_гг", ["имб", "сильнейш", "максимальн", "бог", "абсолют", "непобедим", "владыка", "повелитель", "король", "катастроф", "100 лет", "афк", "afk"]],
    ["перерождение", ["перерожд", "реинкарнац", "вернул", "возвращ", "прошл", "заново", "жизнь", "регресс", "перевоплот", "начало"]],
    ["подземелья", ["подземел", "данж", "башн", "врата", "охотник", "рейд", "гробниц", "расхититель", "лабиринт", "ад"]],
    ["драконы_и_призыв", ["дракон", "призыв", "укротитель", "питом", "монстр", "звер", "насеком", "рой", "гоблин", "фамильяр"]],
    ["апокалипсис", ["апокалипсис", "зомби", "вирус", "судный день", "выживан", "конец света", "мутант", "инфекц"]],
    ["культивация", ["культиват", "дао", "бессмерт", "боевых искусств", "мурим", "секта", "духовн", "древн"]],
    ["магия_и_фэнтези", ["маг", "мастер", "академ", "рыцар", "паладин", "эльф", "меч", "копь", "граф", "ублюдок", "импери"]],
    ["демоны_и_боги", ["демон", "божеств", "дьявол", "ангел", "падш", "небесн", "проклят", "тьма", "тень"]],
    ["месть", ["мест", "предател", "убийц", "уничтож", "сокруш", "расплат", "враг"]],
    ["артефакты", ["оруди", "оружи", "артефакт", "кузнец", "алхим", "сокровищ", "транжир", "богат"]]
];

// Таблица синонимов для стопроцентно одинаковых русских UTM-тегов
const CLIENT_SYNONYM_GROUPS = [
    ["некромант я катастрофа", "ням", "ням (некромант)", "ням некромант"],
    ["паладин sss ранга", "паладин sss ранга главы", "пsss", "psss"],
    ["всеобщий отбор укротитель драконов в самом деле самый слабый класс", "воудр (дракончик)", "воудр дракончик", "воудр", "дракончик"],
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
];

const TIER_SUB_LINKS = {
    1: 'https://boosty.to/darktaka/purchase/3988840?ssource=DIRECT&share=subscription_link',
    2: 'https://boosty.to/darktaka/purchase/3988841?ssource=DIRECT&share=subscription_link',
    3: 'https://boosty.to/darktaka/purchase/3979820?ssource=DIRECT&share=subscription_link'
};

// 16 ЕЖЕНЕДЕЛЬНЫХ ПАКОВ ЗАДАНИЙ С НОЯБРЯ ПО ФЕВРАЛЬ (по 4 пака на каждый месяц, переключаются от даты)
const WEEKLY_QUEST_PACKS = {
    11: [
        {
            packTitle: "🍁 НОЯБРЬ • ПАК 1: ОСЕННИЙ МАРАФОН МАНХВЫ",
            step2: { title: "2. Открыть бесплатные серии", desc: "Нажми — включу подборку Халявы", action: "free" },
            step3: { title: "3. Проголосовать за выход проды", desc: "Нажми — отдадим голос в 1 клик", action: "vote" },
            step4: { title: "4. Забрать осенний VIP-доступ", desc: "Все 725+ серий от ~8 ₽ в день", action: "reward" }
        },
        {
            packTitle: "💀 НОЯБРЬ • ПАК 2: НЕДЕЛЯ НЕКРОМАНТОВ И СИСТЕМЫ",
            step2: { title: "2. Посмотреть хиты Некромантии", desc: "Нажми — отфильтрую топ тёмного фэнтези", action: "genre:некромантия" },
            step3: { title: "3. Крутануть рулетку «Мне повезёт»", desc: "Нажми — соберу линию из 4 тайтлов", action: "lucky" },
            step4: { title: "4. Открыть закрытые Лицензии 2 ур.", desc: "Полный доступ без ожидания", action: "reward" }
        },
        {
            packTitle: "🔥 НОЯБРЬ • ПАК 3: БИТВА ЗА ТОП-3 ПРОДЫ",
            step2: { title: "2. Проверить лидеров голосования", desc: "Нажми — покажу Топ голосов месяца", action: "genre:top_votes" },
            step3: { title: "3. Ускорить любимый тайтл голосом", desc: "Нажми — проголосуем за фаворита", action: "vote" },
            step4: { title: "4. Активировать пропуск ко всем главам", desc: "Выгода подписки меньше 8 ₽ в день", action: "reward" }
        },
        {
            packTitle: "🐾 НОЯБРЬ • ПАК 4: ПРЕДЗИМНИЙ ЗАПАС СЕРИЙ",
            step2: { title: "2. Настроить личные предпочтения", desc: "Нажми — открою подборку «Для вас»", action: "for_you" },
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
            step2: { title: "2. Выбрать тайтлы про Имба ГГ", desc: "Нажми — включу тег «👑 Имба ГГ»", action: "genre:имба_гг" },
            step3: { title: "3. Открыть случайную линию тайтлов", desc: "Нажми — выберем 4 манхвы на вечер", action: "lucky" },
            step4: { title: "4. Забрать 2 уровень с Лицензиями", desc: "Эксклюзивы + закрытый ТГ-чат", action: "reward" }
        },
        {
            packTitle: "🎄 ДЕКАБРЬ • ПАК 3: НОВОГОДНИЙ ЗАПАС ОЗВУЧКИ",
            step2: { title: "2. Проверить персональную подборку", desc: "Нажми — открою вкладку «По предпочтениям»", action: "for_you" },
            step3: { title: "3. Вывести тайтл в Топ декабря", desc: "Нажми — отдадим голос в 1 клик", action: "vote" },
            step4: { title: "4. Подарить себе подписку на каникулы", desc: "Сотни часов озвучки без очереди", action: "reward" }
        },
        {
            packTitle: "🎆 ДЕКАБРЬ • ПАК 4: ФИНАЛ ГОДА С СЕМЬЁЙ ТАКА",
            step2: { title: "2. Посмотреть лидеров декабря", desc: "Нажми — покажу Топ голосования", action: "genre:top_votes" },
            step3: { title: "3. Отдать финальный голос месяца", desc: "Нажми — поддержим выход новых глав", action: "vote" },
            step4: { title: "4. Войти в Новый год с полным доступом", desc: "Все уровни и Лицензии в 1 клик", action: "reward" }
        }
    ],
    1: [
        {
            packTitle: "❄️ ЯНВАРЬ • ПАК 1: НОВОГОДНИЕ КАНИКУЛЫ С КОТИКОМ",
            step2: { title: "2. Начать год с бесплатных серий", desc: "Нажми — включу фильтр Халявы", action: "free" },
            step3: { title: "3. Открыть линию «Мне повезёт!»", desc: "Нажми — покажу 4 тайтла на каникулы", action: "lucky" },
            step4: { title: "4. Открыть всю базу на праздники", desc: "Смотри сотни глав без перерыва", action: "reward" }
        },
        {
            packTitle: "⚡ ЯНВАРЬ • ПАК 2: ЛЕДЯНОЙ ПРОРЫВ СИСТЕМЫ",
            step2: { title: "2. Включить тег «Система и Уровни»", desc: "Нажми — покажу лучшую прокачку", action: "genre:система" },
            step3: { title: "3. Проголосовать за январскую проду", desc: "Нажми — учтём голос в 1 клик", action: "vote" },
            step4: { title: "4. Забрать VIP-пропуск 2 уровня", desc: "Все манхвы 1 ур. + Лицензии", action: "reward" }
        },
        {
            packTitle: "🐉 ЯНВАРЬ • ПАК 3: ВРЕМЯ ДРАКОНОВ И ПОДЗЕМЕЛИЙ",
            step2: { title: "2. Открыть тайтлы про Подземелья", desc: "Нажми — включу тег «🏰 Подземелья»", action: "genre:подземелья" },
            step3: { title: "3. Поднять рейтинг любимого тайтла", desc: "Нажми — проголосуем в 1 клик", action: "vote" },
            step4: { title: "4. Смотреть закрытые главы раньше всех", desc: "Подписка дешевле чашки кофе", action: "reward" }
        },
        {
            packTitle: "🔥 ЯНВАРЬ • ПАК 4: ГОРЯЧИЙ ТОП ЯНВАРЯ",
            step2: { title: "2. Открыть подборку по вашим вкусам", desc: "Нажми — перейдём в «По предпочтениям»", action: "for_you" },
            step3: { title: "3. Ускорить выход следующих 10 глав", desc: "Нажми — отдадим голос за проду", action: "vote" },
            step4: { title: "4. Активировать полный доступ на Boosty", desc: "Более 725 постов озвучки сразу", action: "reward" }
        }
    ],
    2: [
        {
            packTitle: "🌨️ ФЕВРАЛЬ • ПАК 1: ФЕВРАЛЬСКИЙ ШТУРМ ГЛАВ",
            step2: { title: "2. Проверить бесплатные выпуски", desc: "Нажми — открою все бесплатные главы", action: "free" },
            step3: { title: "3. Дать буст голосованию февраля", desc: "Нажми — проголосуем за проду в 1 клик", action: "vote" },
            step4: { title: "4. Открыть закрытый архив озвучки", desc: "Доступ ко всем сериям от ~8 ₽ в день", action: "reward" }
        },
        {
            packTitle: "💖 ФЕВРАЛЬ • ПАК 2: НЕДЕЛЯ ЛЮБИМЫХ ТАЙТЛОВ",
            step2: { title: "2. Открыть вкладку «По предпочтениям»", desc: "Нажми — соберу тайтлы по твоим тегам", action: "for_you" },
            step3: { title: "3. Поддержать любимую манхву голосом", desc: "Нажми — добавим +1 голос", action: "vote" },
            step4: { title: "4. Забрать королевский 2 уровень", desc: "Все Лицензии + закрытый ТГ-чат", action: "reward" }
        },
        {
            packTitle: "🔄 ФЕВРАЛЬ • ПАК 3: МАСТЕР ПЕРЕРОЖДЕНИЯ",
            step2: { title: "2. Выбрать тег «Перерождение»", desc: "Нажми — покажу топ регрессии и исэкая", action: "genre:перерождение" },
            step3: { title: "3. Вытянуть 4 случайных тайтла", desc: "Нажми — запустим «Мне повезёт!»", action: "lucky" },
            step4: { title: "4. Открыть просмотр без ограничений", desc: "Мгновенный доступ на Boosty", action: "reward" }
        },
        {
            packTitle: "🌸 ФЕВРАЛЬ • ПАК 4: ФИНАЛ ЗИМЫ У КАМИНА",
            step2: { title: "2. Посмотреть Топ голосования месяца", desc: "Нажми — отфильтрую лидеров проды", action: "genre:top_votes" },
            step3: { title: "3. Отдать решающий голос февраля", desc: "Нажми — проголосуем в 1 клик", action: "vote" },
            step4: { title: "4. Встретить весну с VIP-доступом", desc: "Все серии и новинки без ожидания", action: "reward" }
        }
    ]
};

// --- 4 СЕЗОННЫХ СТИЛЯ (АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ ПО ДАТЕ + ПЕРЕКЛЮЧАТЕЛЬ ПРЕДПРОСМОТРА) ---
const SEASONS_CONFIG = {
    winter: {
        label: "🔥❄️ Зима у камина",
        brandText: "🔥❄️ Тёплый зимний вечер у камина с озвучкой ТАКА!",
        particles: ["❄️", "🔥", "✨", "🐾", "❄️", "🔥"]
    },
    spring: {
        label: "🌸 Оранжевая сакура",
        brandText: "🌸 Весеннее настроение и свежие главы в семье ТАКА!",
        particles: ["🌸", "🐾", "🌺", "✨", "🌸", "🐾"]
    },
    summer: {
        label: "☀️ Летняя жара",
        brandText: "☀️ Жаркие летние релизы и марафон озвучки ТАКА!",
        particles: ["☀️", "🔥", "🐾", "✨", "☀️", "🔥"]
    },
    autumn: {
        label: "🍁 Осенний стиль",
        brandText: "🍁 Уютная осень и ежедневные серии в семье ТАКА!",
        particles: ["🍁", "🐾", "🍂", "🐾", "🍁", "🍂"]
    }
};

function detectSeasonByDate(dateObj = new Date()) {
    const m = dateObj.getMonth() + 1; // 1..12
    // Зима: 1 декабря – 28/29 февраля
    if (m === 12 || m === 1 || m === 2) return 'winter';
    // Весна: 1 марта – 31 мая
    if (m >= 3 && m <= 5) return 'spring';
    // Лето: 1 июня – 31 августа
    if (m >= 6 && m <= 8) return 'summer';
    // Осень: 1 сентября – 30 ноября
    return 'autumn';
}

function applySeasonStyle(seasonKey) {
    const validSeason = SEASONS_CONFIG[seasonKey] ? seasonKey : detectSeasonByDate();
    document.documentElement.setAttribute('data-season', validSeason);
    const cfg = SEASONS_CONFIG[validSeason];

    const seasonBtn = document.getElementById('seasonBadgeBtn');
    if (seasonBtn) seasonBtn.textContent = cfg.label;

    const brandEl = document.getElementById('heroBrandBadge');
    if (brandEl) brandEl.textContent = cfg.brandText;

    const particlesEl = document.getElementById('seasonParticles');
    if (particlesEl) {
        particlesEl.innerHTML = cfg.particles.map(p => `<span>${p}</span>`).join('');
    }
}

function initSeasonalStyleEngine() {
    const autoSeason = detectSeasonByDate(now);
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

// --- РАБОТА С COOKIE И АНОНИМНЫМ ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ БЕЗ РЕГИСТРАЦИИ ---
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

// Локальные хранилища голосов, очереди, квестов и предпочтений пользователя
let votesFileMap = {};
let votesCache = {};
let userVotedMap = {};
let pendingVotesQueue = [];
let questsState = { step1: true, step2: false, step3: false, step4: false };
let userFavoriteTags = {};

try {
    votesCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
} catch (e) {
    votesCache = {};
}

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
    userFavoriteTags = JSON.parse(localStorage.getItem(USER_TAG_PREFS_KEY) || '{}');
    if (!userFavoriteTags || typeof userFavoriteTags !== 'object') userFavoriteTags = {};
} catch (e) {
    userFavoriteTags = {};
}

function saveUserTagPrefs() {
    try {
        localStorage.setItem(USER_TAG_PREFS_KEY, JSON.stringify(userFavoriteTags));
    } catch (e) {}
    updateForYouBadgeCount();
}

function recordUserTagInterest(item, weight = 1) {
    if (!item || !Array.isArray(item.genres)) return;
    item.genres.forEach(g => {
        if (READER_TAGS_DICTIONARY[g]) {
            userFavoriteTags[g] = (Number(userFavoriteTags[g]) || 0) + weight;
        }
    });
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
    if (!norm) return String(title || 'тайтл');
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

function makeClientRussianTag(title) {
    const canonical = resolveCanonicalTitleClient(title);
    const slug = String(canonical || 'тайтл')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 48);
    return slug || 'тайтл_каталог';
}

function detectClientReaderTags(title, existingGenres = []) {
    const t = `${resolveCanonicalTitleClient(title)} ${String(title || '')}`.toLowerCase().replace(/ё/g, 'е');
    const tags = [];

    if (Array.isArray(existingGenres)) {
        existingGenres.forEach(g => {
            if (READER_TAGS_DICTIONARY[g] && !tags.includes(g)) tags.push(g);
        });
    }

    for (const [tagKey, kwList] of CLIENT_TAG_RULES) {
        for (const kw of kwList) {
            if (t.includes(kw)) {
                if (!tags.includes(tagKey)) tags.push(tagKey);
                break;
            }
        }
    }

    if (tags.length === 0) {
        tags.push('магия_и_фэнтези', 'система');
    } else if (tags.length === 1) {
        tags.push(tags[0] === 'имба_гг' ? 'система' : 'имба_гг');
    }

    return tags.slice(0, 4);
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

function appendBoostyUtm(url, ruMetricTag, medium = 'карточка', content = 'каталог') {
    const cleanTag = ruMetricTag || 'каталог_тайтлов';
    const baseUrl = url || 'https://boosty.to/darktaka';
    try {
        const parsed = new URL(baseUrl, window.location.origin);
        parsed.searchParams.set('from', 'site_catalog');
        parsed.searchParams.set('title', cleanTag);
        parsed.searchParams.set('utm_source', 'каталог_така');
        parsed.searchParams.set('utm_medium', medium);
        parsed.searchParams.set('utm_campaign', cleanTag);
        parsed.searchParams.set('utm_content', content);
        return parsed.toString();
    } catch (e) {
        const sep = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${sep}from=site_catalog&title=${encodeURIComponent(cleanTag)}&utm_source=${encodeURIComponent('каталог_така')}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(cleanTag)}&utm_content=${encodeURIComponent(content)}`;
    }
}

function trackGoal(goalName, payload = {}) {
    try {
        const cleanTitle = cleanDisplayTitle(payload.title || payload.metric_tag || 'Общее действие');
        const ruMetricTag = payload.metric_tag || makeClientRussianTag(cleanTitle);
        const levelNum = Number(payload.level) || 1;
        const levelLabel = payload.level ? `${levelNum} уровень` : 'Общее';
        const placement = payload.placement || 'каталог';

        if (payload.item) {
            recordUserTagInterest(payload.item, goalName === 'click_want_proda' ? 2 : 1);
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
                            id: ruMetricTag,
                            name: cleanTitle,
                            category: levelLabel,
                            price: levelNum === 2 ? 500 : 250,
                            variant: placement
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
                            id: ruMetricTag,
                            name: cleanTitle,
                            category: "Голос Хочу проду",
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
                metric_tag: ruMetricTag,
                utm_campaign: ruMetricTag,
                level: levelNum,
                placement: placement,
                user_uid: CURRENT_USER_UID
            });

            const visitParams = {
                Русские_UTM_Тайтлов: {
                    [ruMetricTag]: {
                        Название: cleanTitle,
                        Действие: goalName,
                        Уровень: levelLabel,
                        Место: placement
                    }
                },
                Нажатия_на_тайтлы: {
                    [cleanTitle]: {
                        Действие: goalName,
                        Русский_тег: ruMetricTag,
                        Уровень: levelLabel,
                        Место: placement
                    }
                }
            };

            if (goalName === 'click_cover_image') {
                visitParams['Клики_по_картинкам_тайтлов'] = {
                    [cleanTitle]: levelLabel
                };
            }

            if (goalName === 'click_title' || goalName === 'click_cover_image' || goalName === 'click_week_new' || goalName === 'click_month_new_title') {
                visitParams['Переходы_в_тайтлы'] = {
                    [cleanTitle]: {
                        Русский_тег: ruMetricTag,
                        Уровень: levelLabel
                    }
                };
            }

            if (goalName === 'click_want_proda') {
                visitParams['Голоса_Хочу_проду'] = {
                    [cleanTitle]: {
                        Русский_тег: ruMetricTag,
                        Уровень: levelLabel,
                        Пользователь: CURRENT_USER_UID
                    }
                };
            }

            window.ym(YM_ID, 'params', visitParams);
        }
    } catch (e) {}
}

function trackSubConversion(payload = {}) {
    try {
        completeQuestStep(4);
        const cleanTitle = cleanDisplayTitle(payload.title || 'Подписка на канал');
        const ruMetricTag = payload.metric_tag || makeClientRussianTag(cleanTitle);
        const levelNum = Number(payload.level) || 1;
        const priceRub = levelNum === 3 ? 1000 : (levelNum === 2 ? 500 : 250);
        const placement = payload.placement || 'карточка_подписка';

        trackGoal('click_subscribe', {
            title: cleanTitle,
            metric_tag: ruMetricTag,
            level: levelNum,
            placement: placement
        });

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            ecommerce: {
                currencyCode: "RUB",
                purchase: {
                    actionField: {
                        id: `sub_${CURRENT_USER_UID}_${Date.now()}`,
                        affiliation: placement,
                        revenue: priceRub
                    },
                    products: [{
                        id: ruMetricTag,
                        name: cleanTitle,
                        category: `Подписка ${levelNum} ур.`,
                        price: priceRub,
                        quantity: 1,
                        variant: placement
                    }]
                }
            }
        });

        if (typeof window.ym === 'function') {
            window.ym(YM_ID, 'reachGoal', 'sub_conversion', {
                title: cleanTitle,
                metric_tag: ruMetricTag,
                utm_campaign: ruMetricTag,
                level: levelNum,
                price: priceRub,
                placement: placement,
                user_uid: CURRENT_USER_UID
            });

            window.ym(YM_ID, 'params', {
                Конверсия_Подписки: {
                    [placement]: {
                        Тайтл: cleanTitle,
                        Русский_тег: ruMetricTag,
                        Уровень: `${levelNum} ур. (${priceRub} ₽)`,
                        Цена: priceRub
                    }
                }
            });
        }
    } catch (e) {}
}

// --- ЕЖЕНЕДЕЛЬНЫЕ ПАКИ ЗАДАНИЙ (НОЯБРЬ – ФЕВРАЛЬ, АВТОМАТИЧЕСКИЙ ВЫБОР ПО ДАТЕ) ---
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
            ? '🎉 Все 4 задания этой недели выполнены! Твой VIP-бонус открыт!'
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
        const forYouTab = document.querySelector('.tier-tab[data-tier="for_you"]');
        if (forYouTab) forYouTab.click();
        const nav = document.getElementById('stickyNav');
        if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action.startsWith('genre:')) {
        const genreKey = action.split(':')[1];
        const pill = document.querySelector(`.genre-pill[data-genre="${genreKey}"]`);
        if (pill) pill.click();
        const nav = document.getElementById('stickyNav');
        if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// --- ОДНА ЛИНИЯ СЛУЧАЙНЫХ ТАЙТЛОВ НА ВЫБОР («🎲 МНЕ ПОВЕЗЁТ!») ---
function openLuckySingleRow() {
    if (allItems.length === 0) return;
    const section = document.getElementById('luckyRowSection');
    const grid = document.getElementById('luckyRowGrid');
    if (!section || !grid) return;

    completeQuestStep(2);

    const pool = [...allItems].sort(() => Math.random() - 0.5);
    const chosenFour = pool.slice(0, 4);

    grid.innerHTML = '';
    chosenFour.forEach((item, idx) => {
        const cardEl = createCatalogCardElement(item, Math.max(...allItems.map(i => i.timestamp || 0)), getTopThreeVoteMap(), idx < 4);
        grid.appendChild(cardEl);
    });

    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (chosenFour[0]) {
        updateCatWidgetContext(chosenFour[0], false);
    }

    trackGoal('click_random_line', {
        title: 'Линия Мне повезёт (4 тайтла)',
        metric_tag: 'мне_повезет_линия',
        level: 1
    });
}

// --- ВКЛАДКА «💖 ПО ПРЕДПОЧТЕНИЯМ» И ВЫБОР ТЕГОВ ---
function updateForYouBadgeCount() {
    const badgeEl = document.getElementById('count-foryou');
    if (!badgeEl || allItems.length === 0) return;
    const prefTags = getActivePreferredTags();
    if (prefTags.length === 0) {
        badgeEl.textContent = Math.min(allItems.length, 12);
    } else {
        const matches = allItems.filter(i => Array.isArray(i.genres) && i.genres.some(g => prefTags.includes(g)));
        badgeEl.textContent = matches.length;
    }
}

function renderUserPreferencesBar() {
    const banner = document.getElementById('userPrefsBanner');
    const listEl = document.getElementById('userPrefsTagsList');
    if (!banner || !listEl) return;

    if (activeTierTab !== 'for_you') {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'block';
    const prefTags = getActivePreferredTags();

    listEl.innerHTML = Object.entries(READER_TAGS_DICTIONARY).map(([tagKey, label]) => {
        const isSelected = prefTags.includes(tagKey);
        return `<button type="button" class="pref-tag-chip ${isSelected ? 'selected' : ''}" data-tag="${tagKey}">${label}</button>`;
    }).join('');

    listEl.querySelectorAll('.pref-tag-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            if (userFavoriteTags[tag] && Number(userFavoriteTags[tag]) > 0) {
                delete userFavoriteTags[tag];
            } else {
                userFavoriteTags[tag] = 3;
            }
            saveUserTagPrefs();
            renderUserPreferencesBar();
            applyFilters();
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initSeasonalStyleEngine();
    initThemeToggle();
    initViewSwitcher();
    renderQuestsUI();
    initInfiniteScrollObserver();

    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const resetInfoEl = document.getElementById('voteResetInfo');
    if (resetInfoEl) {
        resetInfoEl.textContent = `🐾 Голосование за проду • ${monthNames[now.getUTCMonth()]} ${now.getUTCFullYear()} (обновляется 1-го числа)`;
    }

    setupModal('orderModal', 'openOrderModal', 'closeOrderModal', 'open_order_modal');
    setupModal('guideModal', 'openGuideModal', 'closeGuideModal', 'open_payment_guide');
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
            if (activeTierTab === 'free' || activeTierTab === 'for_you') completeQuestStep(2);
            renderUserPreferencesBar();
            applyFilters();
        });
    });

    const resetPrefsBtn = document.getElementById('resetPrefsBtn');
    if (resetPrefsBtn) {
        resetPrefsBtn.addEventListener('click', () => {
            userFavoriteTags = {};
            saveUserTagPrefs();
            renderUserPreferencesBar();
            applyFilters();
        });
    }

    // Кнопка «🎲 Мне повезёт!» — открывает 1 линию из 4 тайтлов на выбор
    const randomBtn = document.getElementById('randomTitleBtn');
    const rerollBtn = document.getElementById('rerollLuckyBtn');
    const closeLuckyBtn = document.getElementById('closeLuckyRowBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', openLuckySingleRow);
    }
    if (rerollBtn) {
        rerollBtn.addEventListener('click', openLuckySingleRow);
    }
    if (closeLuckyBtn) {
        closeLuckyBtn.addEventListener('click', () => {
            const sec = document.getElementById('luckyRowSection');
            if (sec) sec.style.display = 'none';
        });
    }

    // Быстрые жанровые чипсы (12 тегов читалки)
    document.querySelectorAll('.genre-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeGenreFilter = pill.dataset.genre || 'all';
            if (activeGenreFilter === 'top_votes') {
                const sortSelect = document.getElementById('sortSelect');
                if (sortSelect) sortSelect.value = 'votes_desc';
            } else if (READER_TAGS_DICTIONARY[activeGenreFilter]) {
                userFavoriteTags[activeGenreFilter] = (Number(userFavoriteTags[activeGenreFilter]) || 0) + 1;
                saveUserTagPrefs();
            }
            applyFilters();
        });
    });

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
            if (sortSelect.value === 'votes_desc') {
                syncTopVotesThrottled(12);
            }
        });
    }
});

// Автоматическая бесконечная подгрузка карточек при прокрутке (без кнопок и названий)
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
                const numEl = document.getElementById('goalNumbers');
                const barEl = document.getElementById('goalProgressBar');
                const descEl = document.getElementById('goalDesc');

                const current = typeof g.current === 'number' ? g.current : 175;
                const target = g.target || 200;
                const percent = Math.min(100, Math.round((current / target) * 100));

                if (numEl) numEl.textContent = `${current} из ${target} платных подписчиков (${percent}%)`;
                if (barEl) barEl.style.width = `${percent}%`;
                if (descEl && g.description) descEl.textContent = g.description;
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
            if (vDoc && vDoc.items && typeof vDoc.items === 'object') {
                votesFileMap = vDoc.items;
            }
        }
    } catch (e) {}

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

        const ruMetricTag = makeClientRussianTag(cleanTitle);
        const genres = detectClientReaderTags(cleanTitle, item.genres);

        const latestRange = totalChapters > 0
            ? (item.latest_range && !String(item.id).startsWith('tag_') ? item.latest_range : `1-${totalChapters} гл.`)
            : 'Все главы в ленте';

        const dataVotes = Number(item.votes) || 0;
        const fileVoteEntry = votesFileMap[item.id];
        const fileVotes = fileVoteEntry
            ? (typeof fileVoteEntry === 'number' ? fileVoteEntry : Number(fileVoteEntry.votes) || 0)
            : 0;
        const cachedVotes = typeof votesCache[item.id] === 'number' ? votesCache[item.id] : 0;
        const userVoted = hasUserVoted(item.id);
        const recordedVoteVal = typeof userVotedMap[item.id] === 'number'
            ? userVotedMap[item.id]
            : (userVoted ? Math.max(dataVotes, fileVotes) + 1 : 0);

        const initialVotes = Math.max(dataVotes, fileVotes, cachedVotes, recordedVoteVal, userVoted ? 1 : 0);
        votesCache[item.id] = initialVotes;

        return {
            ...item,
            title: cleanTitle,
            image: normalizeCoverUrl(item.image),
            chapters: totalChapters,
            free_chapters: freeChapters,
            paid_chapters: paidChapters,
            has_free: hasFree,
            free_text: freeText,
            metric_tag: ruMetricTag,
            genres: genres,
            latest_range: latestRange,
            tier: tierText,
            tier_level: levelNum,
            link: feedLink,
            sub_link: subLink,
            originalIndex: index,
            votes: initialVotes
        };
    });

    saveVotesCache();
    updateTabCountersAndBanners();
    updateForYouBadgeCount();
    renderHighlightsBlocks();
    checkUrlAnchorParam();
    applyFilters();
    initCatRecommendationWidget();
    flushPendingVotesQueue();
    syncTopVotesThrottled(10);
}

function checkUrlAnchorParam() {
    try {
        const params = new URLSearchParams(window.location.search);
        const targetQuery = (params.get('manga') || params.get('title') || '').trim();
        if (!targetQuery) return;

        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearchBtn');
        const normQuery = targetQuery.toLowerCase();

        const matched = allItems.find(i =>
            i.metric_tag === normQuery ||
            i.title.toLowerCase().includes(normQuery) ||
            String(i.id) === targetQuery
        );

        if (matched && searchInput) {
            searchInput.value = matched.title;
            if (clearBtn) clearBtn.style.display = 'flex';
            matched._isSpotlight = true;
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
            const isCreatedRecently = created > 0 && (maxTs - created) <= thirtyDaysSec;
            return isCreatedRecently;
        })
        .sort((a, b) => (b.created_ts || b.timestamp || 0) - (a.created_ts || a.timestamp || 0));

    let hasAny = false;

    const weekTitleEl = weekBlock.querySelector(".highlight-title");
    if (weekTitleEl) {
        weekTitleEl.textContent = `🔥 Новые главы за неделю (${recentWeekReleases.length})`;
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
            const rangeBadge = i.latest_range || (i.chapters > 0 ? `${i.chapters} гл.` : "Свежие серии");
            const href = appendBoostyUtm(i.link, i.metric_tag, 'новинки_недели', 'чип');
            return `
                <a href="${href}" target="_blank" class="hl-chip ${i.tier_level === 2 ? 'hl-gold' : ''}"
                   data-id="${i.id}" data-metric-tag="${i.metric_tag}">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
                         data-metric-tag="${i.metric_tag}">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span style="font-size:11px;color:var(--accent-amber);font-weight:700;">🔥 Вышли: ${rangeBadge}</span>
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
                        placement: 'новинки_недели',
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
            const href = appendBoostyUtm(i.link, i.metric_tag, 'новинки_месяца', 'чип');
            return `
                <a href="${href}" target="_blank" class="hl-chip ${i.tier_level === 2 ? 'hl-gold' : ''}"
                   data-id="${i.id}" data-metric-tag="${i.metric_tag}">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
                         data-metric-tag="${i.metric_tag}">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span style="font-size:11px;color:#ffd166;font-weight:700;">👑 Новый тайтл • ${i.chapters > 0 ? `1-${i.chapters} гл.` : "В ленте"}</span>
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
                        placement: 'новинки_месяца',
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

    const topFour = [...allItems]
        .sort((a, b) => ((b.votes || 0) * 15 + (b.chapters || 0)) - ((a.votes || 0) * 15 + (a.chapters || 0)))
        .slice(0, 5);

    listEl.innerHTML = topFour.map(item => `
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
        textEl.textContent = `Не хочешь ждать бесплатной очереди? Все вышедшие главы «${item.title}» уже доступны по подписке, либо закажи 10 новых серий без очереди! 🐾`;
    }
    if (rankLabelEl) {
        rankLabelEl.textContent = currentRank <= 3
            ? `🏆 Сейчас на ${currentRank}-м месте в Топ-3 месяца!`
            : `🔥 Место в рейтинге проды: #${currentRank}`;
    }
    if (goalTextEl) {
        goalTextEl.textContent = `${currentVotes} голосов`;
    }
    if (fillEl) {
        fillEl.style.width = `${fillPct}%`;
    }
    if (hintEl) {
        const needed = Math.max(1, thirdPlaceVotes - currentVotes + 1);
        hintEl.textContent = currentRank <= 3
            ? `Этот тайтл уже в приоритетной тройке месяца! Подпишись на Boosty, чтобы не пропустить выход.`
            : `До попадания в Топ-3 приоритета не хватает всего ~${needed} гол. — или закажи выход 10 глав прямо сейчас без очереди!`;
    }

    if (boostyBtn) {
        boostyBtn.href = appendBoostyUtm(item.sub_link, item.metric_tag, 'модалка_проды', 'кнопка_подписки');
        if (boostyBtnTitle) {
            const price = item.tier_level === 2 ? '500 ₽' : '250 ₽';
            boostyBtnTitle.textContent = `🧡 Смотреть все главы по подписке (${item.tier_level} ур. • ${price})`;
        }
        boostyBtn.onclick = () => trackSubConversion({
            title: item.title,
            metric_tag: item.metric_tag,
            level: item.tier_level,
            placement: 'модалка_проды_подписка'
        });
    }
    if (tgBtn) {
        const orderPrice = item.tier_level === 2 ? '3000 ₽' : '1500 ₽';
        const msg = encodeURIComponent(`Привет! 🐾 Хочу заказать/ускорить выход 10 глав тайтла «${item.title}» (${orderPrice} без очереди). Тег: #${item.metric_tag}`);
        tgBtn.href = `https://t.me/TAKA_YT?text=${msg}`;
        tgBtn.onclick = () => trackGoal('click_telegram', {
            title: item.title,
            metric_tag: item.metric_tag,
            level: item.tier_level,
            placement: 'модалка_проды_телеграм'
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
        placement: 'карточка_хочу_проду',
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

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const sortSelect = document.getElementById('sortSelect');
    const sortValue = sortSelect ? sortSelect.value : 'update_desc';
    const prefTags = getActivePreferredTags();

    let filtered = allItems.filter(item => {
        const tagNamesText = (item.genres || []).map(g => READER_TAGS_DICTIONARY[g] || g).join(' ').toLowerCase();
        const matchesSearch = item.title.toLowerCase().includes(searchText) ||
                              (item.metric_tag && item.metric_tag.toLowerCase().includes(searchText)) ||
                              tagNamesText.includes(searchText);

        let matchesTier = true;
        if (activeTierTab === 'free') {
            matchesTier = Boolean(item.has_free || item.free_chapters > 0);
        } else if (activeTierTab === 'for_you') {
            if (prefTags.length > 0) {
                matchesTier = Array.isArray(item.genres) && item.genres.some(g => prefTags.includes(g));
            } else {
                matchesTier = true;
            }
        } else if (activeTierTab !== 'all') {
            matchesTier = String(item.tier_level) === String(activeTierTab);
        }

        let matchesGenre = true;
        if (activeGenreFilter === 'top_votes') {
            matchesGenre = (Number(item.votes) || 0) > 0;
        } else if (activeGenreFilter !== 'all') {
            matchesGenre = Array.isArray(item.genres) && item.genres.includes(activeGenreFilter);
        }

        return matchesSearch && matchesTier && matchesGenre;
    });

    filtered.sort((a, b) => {
        if (a._isSpotlight && !b._isSpotlight) return -1;
        if (!a._isSpotlight && b._isSpotlight) return 1;

        if (activeTierTab === 'for_you' && prefTags.length > 0) {
            const scoreA = (a.genres || []).reduce((acc, g) => acc + (Number(userFavoriteTags[g]) || 0), 0);
            const scoreB = (b.genres || []).reduce((acc, g) => acc + (Number(userFavoriteTags[g]) || 0), 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
        }

        if (sortValue === 'update_desc') {
            return (b.timestamp || 0) - (a.timestamp || 0);
        } else if (sortValue === 'free_desc') {
            const freeDiff = (b.free_chapters || (b.has_free ? 1 : 0)) - (a.free_chapters || (a.has_free ? 1 : 0));
            if (freeDiff !== 0) return freeDiff;
            return (b.chapters || 0) - (a.chapters || 0);
        } else if (sortValue === 'chapters_desc') {
            return (b.chapters || 0) - (a.chapters || 0);
        } else if (sortValue === 'votes_desc') {
            const vDiff = (b.votes || 0) - (a.votes || 0);
            if (vDiff !== 0) return vDiff;
            return (b.chapters || 0) - (a.chapters || 0);
        } else {
            return a.originalIndex - b.originalIndex;
        }
    });

    lastFilteredItems = filtered;

    const totalEl = document.getElementById('totalTitlesCount');
    if (totalEl) {
        totalEl.textContent = `🐾 Найдено тайтлов: ${filtered.length} из ${allItems.length}`;
    }

    resetAndRenderCatalog(filtered);
}

// Создание DOM-элемента карточки с оптимизацией картинок и кликабельными мини-тегами
function createCatalogCardElement(item, maxTs, topThreeMap, isPriorityImage = false) {
    const card = document.createElement('div');
    const isLicense = item.tier_level === 2;
    const hasFree = item.has_free || item.free_chapters > 0;
    const frameClass = `tier-frame-${item.tier_level || 1}`;
    card.className = `card ${frameClass} ${hasFree ? 'has-free-card' : ''} ${item._isSpotlight ? 'anchor-spotlight' : ''}`;

    card.setAttribute('data-metric-tag', item.metric_tag);
    card.setAttribute('data-utm-campaign', item.metric_tag);
    card.setAttribute('data-title-id', item.title);
    card.setAttribute('data-level', item.tier_level);

    const voted = hasUserVoted(item.id);
    const utmCoverLink = appendBoostyUtm(item.link, item.metric_tag, 'карточка', 'обложка');
    const utmTitleLink = appendBoostyUtm(item.link, item.metric_tag, 'карточка', 'заголовок');
    const utmWatchLink = appendBoostyUtm(item.link, item.metric_tag, 'карточка', 'кнопка_смотреть');
    const utmSubLink = appendBoostyUtm(item.sub_link, item.metric_tag, 'карточка_подписка', `уровень_${item.tier_level}`);
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
        ? (freeChCount > 0 ? `🎁 ${freeChCount} гл. бесплатно` : '🎁 Смотреть бесплатно')
        : '▶ Смотреть';

    const miniTagsHtml = (item.genres || []).slice(0, 3).map(gKey => {
        const label = READER_TAGS_DICTIONARY[gKey] || gKey;
        return `<span class="card-mini-tag" data-genre="${gKey}" title="Фильтровать по тегу: ${label}">${label}</span>`;
    }).join('');

    const imgLoadAttrs = isPriorityImage
        ? `fetchpriority="high" decoding="async"`
        : `loading="lazy" decoding="async"`;

    card.innerHTML = `
        <a href="${utmCoverLink}" target="_blank" class="card-link" data-metric-tag="${item.metric_tag}">
            <img src="${item.image}" alt="${item.title}" ${imgLoadAttrs} referrerpolicy="no-referrer"
                 class="card-cover-img"
                 data-metric-tag="${item.metric_tag}"
                 data-title="${item.title}"
                 onload="this.classList.add('img-loaded')"
                 onerror="this.src='https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка'; this.classList.add('img-loaded')">
            <span class="badge-top-left ${isLicense ? 'license-gold-badge' : ''}">
                ${isLicense ? '👑 Лицензия Boosty' : '🔒 Эксклюзив Boosty'}
            </span>
            ${topVoteBadgeHtml}
            <span class="chapters-floating-badge">Всего: ${totalChText}</span>
            ${hasFree ? `<span class="badge-free-access">${item.free_text || `🎁 Бесплатно: ${freeChCount} гл.`}</span>` : ''}
            ${isNewRelease ? `<span class="badge-hot-new">🔥 ${item.latest_range || 'НОВИНКА'}</span>` : ''}
        </a>
        <div class="card-info">
            <div>
                <a href="${utmTitleLink}" target="_blank" class="card-title-link" data-metric-tag="${item.metric_tag}">
                    <h3>${item.title}</h3>
                </a>
                <div class="card-tags-row">${miniTagsHtml}</div>
            </div>

            <div class="card-bottom-wrap">
                <div class="chapters-breakdown">
                    ${freePillHtml}
                    ${paidPillHtml}
                </div>

                <span class="tier-neutral-pill ${isLicense ? 'tier-pill-license' : ''}">${item.tier}</span>

                <div class="action-buttons-row">
                    <a href="${utmWatchLink}" target="_blank" class="watch-feed-link ${hasFree ? 'watch-free-emerald' : ''}" data-metric-tag="${item.metric_tag}">
                        ${watchBtnLabel}
                    </a>
                    <a href="${utmSubLink}" target="_blank" class="buy-tier-link ${isLicense ? 'buy-license-gold' : ''}" data-metric-tag="${item.metric_tag}">
                        Подписаться
                    </a>
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

    card.querySelectorAll('.card-mini-tag').forEach(tagEl => {
        tagEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const gKey = tagEl.dataset.genre;
            const pill = document.querySelector(`.genre-pill[data-genre="${gKey}"]`);
            if (pill) pill.click();
        });
    });

    const coverLink = card.querySelector('.card-link');
    if (coverLink) {
        const sendImageMetric = () => {
            trackGoal('click_cover_image', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level,
                placement: 'обложка_карточки',
                item: item
            });
            trackGoal('click_title', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level,
                placement: 'обложка_карточки',
                item: item
            });
        };
        coverLink.addEventListener('click', sendImageMetric);
        coverLink.addEventListener('auxclick', (e) => {
            if (e.button === 1) sendImageMetric();
        });
    }

    card.querySelectorAll('.card-title-link, .watch-feed-link').forEach(link => {
        const isWatchBtn = link.classList.contains('watch-feed-link');
        const sendTitleMetric = () => {
            trackGoal('click_title', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level,
                placement: isWatchBtn ? 'кнопка_смотреть' : 'заголовок_карточки',
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
                level: item.tier_level,
                placement: 'карточка_кнопка_подписаться'
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
                level: item.tier_level,
                placement: 'кнопка_поделиться'
            });
        });
    }

    const reportBtn = card.querySelector('.report-broken-btn');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            trackGoal('report_broken_link', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level,
                placement: 'жалоба_на_ссылку'
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

// Первичная отрисовка первой порции карточек и бесшовная авто-подгрузка следующих порций при скролле
function resetAndRenderCatalog(items) {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;
    catalog.innerHTML = '';
    renderedCardsCount = 0;

    if (items.length === 0) {
        const emptyMsg = activeTierTab === 'free'
            ? 'Бесплатные главы обновляются — переключитесь на «Все тайтлы» 🐾'
            : 'По вашему запросу ничего не найдено — попробуйте выбрать другой тег 🐾';
        catalog.innerHTML = `<div class="empty-catalog-box"><p>${emptyMsg}</p></div>`;
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

// --- РЕКОМЕНДАТЕЛЬНЫЙ ВИДЖЕТ С ГОЛОВОЙ КОТИКА ---
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
                metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : 'виджет_котика',
                level: catWidgetSelectedTier,
                placement: 'виджет_котика'
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
                    metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : 'виджет_котика',
                    level: catWidgetSelectedTier,
                    placement: 'виджет_котика'
                });
            }
        });
    }

    if (subBtn) {
        subBtn.addEventListener('click', () => {
            trackSubConversion({
                title: catWidgetCurrentItem ? catWidgetCurrentItem.title : `Виджет котика ${catWidgetSelectedTier} ур.`,
                metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : `виджет_котика_${catWidgetSelectedTier}ур`,
                level: catWidgetSelectedTier,
                placement: 'виджет_котика_подписка'
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
                title: catWidgetCurrentItem ? catWidgetCurrentItem.title : 'Виджет котика (авто)',
                metric_tag: catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : 'виджет_котика',
                level: catWidgetSelectedTier,
                placement: 'виджет_котика_авто'
            });
        };

        setTimeout(triggerOpen, 8500);
        window.addEventListener('scroll', () => {
            if (window.scrollY > 360) triggerOpen();
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

    if (msgEl) {
        const chInfo = item.chapters > 0 ? `все ${item.chapters} гл.` : 'все закрытые серии';
        if (item.tier_level === 2) {
            msgEl.innerHTML = `Мяу! 🐾 Смотришь <b>«${item.title}»</b>? Оформи <b>2 уровень (Лицензии)</b> и открой ${chInfo} + закрытый чат!`;
        } else {
            msgEl.innerHTML = `Мяу! 🐾 Понравился тайтл <b>«${item.title}»</b>? Подпишись на Boosty и смотри ${chInfo} всего за ~8 ₽ в день!`;
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

    const ruMetricTag = catWidgetCurrentItem ? catWidgetCurrentItem.metric_tag : `виджет_котика_${catWidgetSelectedTier}ур`;
    const baseSubUrl = catWidgetSelectedTier === 2 ? TIER_SUB_LINKS[2] : TIER_SUB_LINKS[1];
    subBtn.href = appendBoostyUtm(baseSubUrl, ruMetricTag, 'виджет_котика', `уровень_${catWidgetSelectedTier}`);

    if (catWidgetSelectedTier === 2) {
        subBtn.textContent = '👑 Оформить 2 ур. за 500 ₽/мес';
        subBtn.classList.add('cat-sub-gold');
        if (perkEl) perkEl.textContent = '✨ Включает ВСЕ тайтлы 1 ур. + Эксклюзивные Лицензии + ТГ-чат';
    } else {
        subBtn.textContent = '🐾 Оформить 1 ур. за 250 ₽/мес (~8 ₽/день)';
        subBtn.classList.remove('cat-sub-gold');
        if (perkEl) perkEl.textContent = '🧡 Доступ ко всей базовой библиотеке озвучки (725+ постов)';
    }
}
