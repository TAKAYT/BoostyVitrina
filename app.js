let allItems = [];
let activeTierTab = 'all';
let selectedGenres = new Set();
let activeContentTypeFilter = 'all';
let activeSpecialStatusFilter = 'all';
let activeLetterFilter = 'all';
let selectedStatsMonth = 'current';
let renderedCardsCount = 0;
let lastFilteredItems = [];
let infiniteScrollObserver = null;
let missingSearchTimer = null;
let monthsArchiveData = {};
let isForYouStripOpen = false;
let detectedGeoWeather = { isNight: false, weather: 'clear', season: 'autumn' };
let tgNewsCachedList = [];
const BATCH_LOAD_SIZE = 20;
const YM_ID = 114099972;

// Эталонные координаты для синхронизации реальной погоды на улице
const _METEO_SYNC_LAT = 45.0428;
const _METEO_SYNC_LON = 41.9734;

// Единый UTC-месяц, номер недели и ключ дня для счётчиков и интерактивных заданий
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
const CURRENT_DAY_KEY = `${CURRENT_MONTH_KEY}_d${String(now.getUTCDate()).padStart(2, '0')}`;

const SEARCH_NAMESPACE = `takayt_search_${CURRENT_MONTH_KEY}`;
const MISSING_NAMESPACE = `takayt_missing_${CURRENT_MONTH_KEY}`;

const LOCAL_SEARCH_COUNT_KEY = `taka_monthly_searches_${CURRENT_MONTH_KEY}`;
const LOCAL_MISSING_LOG_KEY = `taka_missing_queries_${CURRENT_MONTH_KEY}`;
const QUESTS_STATE_KEY = `taka_weekly_quests_v2_${CURRENT_WEEK_KEY}`;
const DAILY_QUESTS_STATE_KEY = `taka_daily_quests_v1_${CURRENT_DAY_KEY}`;
const USER_TAG_PREFS_KEY = 'taka_user_favorite_tags_v4';
const USER_INTERACTION_COUNT_KEY = 'taka_user_interactions_count_v2';
const ANON_USER_UID_KEY = 'taka_anon_user_uid_v1';
const TUTORIAL_DONE_STORAGE_KEY = 'taka_cat_tutorial_completed_v1';

// Справочник 15 главных видимых тегов (консенсус большинства + Романтика)
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
    "артефакты": "💎 Артефакты",
    "романтика": "🌸 Романтика"
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

// Встроенный резервный справочник 100% приоритета типов (дублирует type_overrides.json для мгновенной работы)
let clientTypeOverrides = {
    "божественный убийца я тень": "manhua",
    "всеобщий отбор укротитель драконов в самом деле самый слабый класс": "manhua",
    "всеобщий отбор я укротитель драконов": "manhua",
    "от гоблина к богу гоблинов": "manhua",
    "моя девушка дракон вернулась": "manhwa",
    "ошибка эхо": "manhwa",
    "некромант транжира": "manhwa",
    "некромант я катастрофа": "manhua",
    "дитя дурной крови предков": "manhwa",
    "дитя дурных кровей": "manhwa",
    "адский логин": "manhwa",
    "офисный работник в ледниковом периоде": "manhwa",
    "великий расхититель гробниц": "manhwa",
    "моя жена из династии тан": "manhua",
    "возрождение династии тан": "manhua",
    "повелитель тьмы": "manhwa",
    "путь истребителя демонов": "manhwa",
    "судный день я король вирусов": "manhua",
    "я прокачиваюсь во сне убивая монстров": "manhua",
    "меня обезглавил призрак и я переродился но потом какая то девушка начала делать со мной всякое": "manhua",
    "я стал ублюдком сильнейшего графства": "manhwa",
    "я стал графским ублюдком": "manhwa",
    "я стал непобедимым ради сестры": "manhua",
    "абсолютное оружие возвращается спустя 100 миллионов лет": "manga",
    "я приютил повелительницу кровавого моря": "manhua",
    "я запасаюсь припасами в замороженном мире": "manhua",
    "становление сильнейшим авантюристом с навыками управления гравитацией": "manga",
    "после перерождения я использовал зеркальное отражение чтобы отомстить": "manhua",
    "паладин sss ранга": "manhua",
    "перерождение повелитель мертвых": "manhwa",
    "реинкарнация наследника": "manhua",
    "я убил бога с помощью мифического таланта": "manhua",
    "вторжение зверей я вижу пути эволюции": "manhua",
    "после разрыва отношений все мои призванные звери стали темными существами": "manhua",
    "ледяной судный день выжить невозможно": "manhua",
    "восхождение я покорил 999 этажей раньше остальных": "manhua",
    "страж десяти тысяч миров": "manhua",
    "мастер синтеза начинает с армией нежити": "manhua",
    "всемирный ужас я открыл рынок читов": "manhua",
    "призывающий демонов повелитель бездны": "manhua",
    "всеобщий отбор мечник в самом деле слабейший класс": "manhua",
    "всеобщий отбор я сам выбираю награды": "manhua",
    "эволюция некроманта мой аватар скелет": "manhua",
    "путь удивительного небожителя": "manhua",
    "владыка колеса судьбы": "manhua",
    "я стал злодеем в новелле": "manhua",
    "сильнейший убийца перемещается в другой мир вместе с классом": "manga",
    "открытие трансфера к богу удачи и приручение миллиардов божественных питомцев": "manhua",
    "владыка призыва спасает мир": "manhua",
    "убить бога": "manhua",
    "злой бог сошел у меня есть великая тюрьма зла": "manhua",
    "постоянное пробуждение": "manhua",
    "я повелитель тьмы тот кто создал подземелья": "manga",
    "битва тысячи рас я укрощу всех чудовищ": "manhua",
    "сто тысяч лет заточения от небесного грома": "manhua",
    "я вернулся в начало зомби апокалипсиса": "manga",
    "в начало до зомби апокалипсиса": "manhua",
    "реинкарнация в начало апокалипсиса": "manhua",
    "королева демонов заставила меня загадать желание": "manhua",
    "я больше не герой": "manhwa",
    "контрабандист апокалипсиса": "manhua",
    "владыка мертвых": "manhua",
    "игра гениального кузнеца": "manhwa",
    "стример попал в прошлое": "manhwa",
    "реинкарнация стримера": "manhwa",
    "фермер выращивающий нежить": "manhua",
    "все эти 30 лет были прологом": "manhwa",
    "реинкарнация спецназа": "manhua",
    "я оказался на вершине культивации после перерождения": "manhua",
    "я переродился слизью в другом мире": "manhua",
    "обретя силу я стану сильнее нет предела тому что я могу сделать": "manhua",
    "я строю промышленную империю на волшебном континенте": "manhua",
    "я завоевал весь мир со своим гаремом": "manhua",
    "злой алхимик не может справиться со своим экспериментом": "manhua",
    "начало после конца": "manga",
    "я получил способность красть навыки противников": "manga",
    "возвращение демонического инструктора": "manhwa",
    "я регрессировал но миру не настал конец": "manhwa",
    "одной рукой я уничтожил армии трех тысяч миров": "manhua",
    "нуб максимального уровня": "manhwa",
    "мастер укрощения": "manhwa",
    "возрождение в постапокалипсисе я достиг вершины благодаря открытию лутбоксов": "manhua",
    "мое перерождение в детеныша дракона": "manhwa",
    "святой повышающий уровень как некромант": "manhwa",
    "покорение академии с ножом для сашими": "manhwa",
    "возвращение гения боевых искусств": "manhwa",
    "доминирование нулевого уровня с аналитическими навыками": "manga",
    "выживание на необитаемом острове с красавицей": "manhua",
    "глобальная смена профессий": "manhua",
    "охотник sss уровня": "manhwa",
    "возвращение железно кровной гончей": "manhwa",
    "убейте меня еще несколько раз и я стану непобедимым": "manga",
    "безумный призыв во время апокалипсиса": "manhua",
    "безумный прорыв во время апокалипсиса": "manhua",
    "стал сторонником злодеев": "manhwa",
    "герой x королева демонов": "manhua",
    "я обрел бессмертие в другом мире": "manhua",
    "спасение мира повелителем крови": "manga",
    "я стал королем собирая мусор": "manhua",
    "я приручаю зверо девушек": "manhua",
    "я принял облик бога демона и превратился в гигантского зверя разрушения": "manhua",
    "новое начало героя в академии": "manga",
    "господство над пустошью я властвую в мире небожителей во время апокалипсиса": "manhua",
    "бесконечная эволюция с нуля": "manhua",
    "регрессия авантюриста s ранга": "manga",
    "я не злодей": "manhua",
    "пожиратель": "manhua",
    "я могу копировать способности других": "manhua",
    "глобальные сверхдержавы пробуждение пурпурного грома в начале": "manhua",
    "бог меча в разрушенном мире": "manhua",
    "я был сильнее героя поэтому скрыл свою силу": "manhwa",
    "деревня под наблюдением бога": "manhwa",
    "цивилизация мудрецов": "manhwa",
    "маг песка из опаленной пустыни": "manhwa",
    "я стал величайшим злодеем в игре": "manhua",
    "я самый сильный босс": "manhua",
    "пастух волшебник": "manhwa",
    "реинкарнация гоблина sss ранга": "manga",
    "конец света я повелеваю зомби": "manhua",
    "возрождение ужаса я начал с триллиона призрачных монет": "manhua",
    "битва тысячи рас страж оставшийся в тылу": "manhua",
    "регрессия темного мага": "manga",
    "магическая теория святого меча": "manga",
    "истребление игроков начало аномалии": "manhua",
    "прокачка с нуля в обратном мире": "manhua",
    "система настоящего бунтаря": "manhua",
    "я стал ублюдком в муриме": "manhwa",
    "разрушитель обороны": "manhwa",
    "ад что я открыл": "manhua",
    "призыватель 3s ранга": "manhua",
    "призыватель sss ранга": "manhua",
    "призванный в параллельные фэнтези миры несколько раз": "manga",
    "возвышение от монстра до бога": "manhua",
    "возвращение мечника драконоборца": "manga",
    "я охотник ex ранга": "manga",
    "игрок скрывает прошлое": "manhwa",
    "бешеный пес герцогского дома": "manhwa",
    "адвокат с карманным измерением": "manhwa",
    "владыка льда": "manhwa",
    "инструкция по перерождению": "manhwa",
    "некромант катастрофа решил уйти на пенсию": "manhwa",
    "прокачка в аду в одиночку": "manhwa",
    "прокачка в аду": "manhwa",
    "я заключил контракт с самим собой": "manhua",
    "возвращение волшебника из подворотни": "manhwa",
    "переродился в змею которая детеныш дракона": "manhua",
    "перерождение демонического культиватора в мире зомби": "manhua",
    "перерождение демонического культиватора": "manhua",
    "злодей хочет жить": "manhwa",
    "гоблин 999 уровня": "manhwa",
    "гениальный маг преодолевающий лимиты возможностей": "manhwa",
    "игрок который ест артефакты": "manhwa",
    "дьявол возвращается в школьные годы": "manhwa",
    "некромант максимального уровня": "manhua",
    "поднятие уровня в одиночку рагнарек": "manhwa",
    "запретная реинкарнация архимага от неумелого до сильнейшего путем повышения уровня": "manga",
    "донат сделал меня королем": "manhua",
    "я перевоплотился в могущественного дракона для сокрушения мира": "manhua",
    "мастер древних божественных орудий": "manhua",
    "король насекомых": "manhua",
    "повелитель насекомых": "manhua",
    "я проснулся имбой после 100 лет afk": "manhua",
    "бессмертный учитель императриц девушек": "manhua",
    "последний авантюрист": "manhwa",
    "зомби апокалипсис 82 08": "manhwa",
    "система всемогущего дизайнера": "manhwa",
    "герой на прокат": "manhwa",
    "император боевых искусств": "manhwa",
    "день за днем": "manhwa",
    "прирожденный наемник": "manhwa",
    "подпишитесь на канал ранкера": "manhwa",
    "игрок поедающий сталь": "manhwa",
    "фермерство в башне в одиночку": "manhwa",
    "этот воин слишком щедр": "manhua",
    "возрождение городского бессмертного": "manhua",
    "мой контрактный зверь китайская пастушья собака": "manhua"
};

// Встроенные особые списки (синхронизируются с special_titles.json)
let clientSpecialLists = {
    romance: [
        "моя жена из династии тан",
        "возрождение династии тан",
        "день за днем",
        "герой x королева демонов",
        "моя девушка дракон вернулась",
        "королева демонов заставила меня загадать желание",
        "меня обезглавил призрак и я переродился но потом какая то девушка начала делать со мной всякое"
    ],
    frozen: [
        "я завоевал весь мир со своим гаремом",
        "убейте меня еще несколько раз и я стану непобедимым",
        "обретя силу я стану сильнее нет предела тому что я могу сделать",
        "я не злодей",
        "безумный призыв во время апокалипсиса",
        "безумный прорыв во время апокалипсиса",
        "мой контрактный зверь китайская пастушья собака",
        "возрождение городского бессмертного",
        "мастер древних божественных орудий"
    ],
    completed: [
        "прокачка в аду в одиночку",
        "прокачка в аду",
        "новое начало героя в академии",
        "регрессия темного мага",
        "господство над пустошью я властвую в мире небожителей во время апокалипсиса",
        "реинкарнация гоблина sss ранга",
        "регрессия авантюриста s ранга",
        "день за днем",
        "я самый сильный босс",
        "битва тысячи рас страж оставшийся в тылу",
        "спасение мира повелителем крови",
        "я стал королем собирая мусор",
        "возвышение от монстра до бога",
        "я стал величайшим злодеем в игре",
        "меня обезглавил призрак и я переродился но потом какая то девушка начала делать со мной всякое",
        "я могу копировать способности других",
        "возрождение в постапокалипсисе я достиг вершины благодаря открытию лутбоксов"
    ],
    hidden_tags: {
        "день за днем": ["романтика", "повседневность", "драма", "отношения"],
        "моя жена из династии тан": ["романтика", "гарем", "история", "империя", "богатство"],
        "моя девушка дракон вернулась": ["романтика", "драконы", "школа", "повседневность", "комедия"],
        "герой x королева демонов": ["романтика", "комедия", "магия", "владыка демонов", "герой"],
        "королева демонов заставила меня загадать желание": ["романтика", "комедия", "система", "магия"],
        "меня обезглавил призрак и я переродился но потом какая то девушка начала делать со мной всякое": ["романтика", "призраки", "мистика", "комедия", "перерождение"]
    }
};

const CLIENT_TAG_REGEX_RULES = [
    ["некромантия", /(?:^|[^а-яa-z0-9])(некромант[а-я]*|скелет[а-я]*|нежит[а-я]*|мертвец[а-я]*|мертв[а-я]*|лич(?:а|ем|и|ей)?|кладбищ[а-я]*|кост(?:ей|и|яной))(?=$|[^а-яa-z0-9])/i],
    ["система", /(?:^|[^а-яa-z0-9])(систем[а-я]*|уров(?:ень|ня|ней|нем)|лвл|lvl|sss|3s|s-ранг[а-я]*|f-ранг[а-я]*|ex-ранг[а-я]*|ранг(?:а|ов|у)?|ранкер[а-я]*|квест[а-я]*|прокачк[а-я]*|прокачива[а-я]*|игрок[а-я]*|навык[а-я]*|талант[а-я]*|очков|статус[а-я]*|логин|лутбокс[а-я]*|чит(?:ов|ы)?|нуб)(?=$|[^а-яa-z0-9])/i],
    ["имба", /(?:^|[^а-яa-z0-9])(имб[а-я]*|сильнейш[а-я]*|максимальн[а-я]*|непобедим[а-я]*|всемогущ[а-я]*|абсолютн[а-я]*|100\s*лет|100\s*миллионов|999|катастроф[а-я]*|божественн[а-я]*|верховн[а-я]*|нет\s+предела|босс|доминирован[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["регрессия", /(?:^|[^а-яa-z0-9])(регресс[а-я]*|вернул[а-я]*\s+в\s+прошл[а-я]*|в\s+прошлое|в\s+начало\s+до|заново|спустя\s+\d+|возвраща[а-я]*\s+в\s+школьн[а-я]*|пролог[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["перерождение", /(?:^|[^а-яa-z0-9])(перерожд[а-я]*|перерод[а-я]*|реинкарнац[а-я]*|перевопло[а-я]*|возрожд[а-я]*|начало\s+после\s+конца|стал\s+графским|стал\s+ублюдком|исекай|в\s+другом\s+мире|в\s+обратном\s+мире|параллельн[а-я]*|перемеща[а-я]*|в\s+новелле|в\s+игре)(?=$|[^а-яa-z0-9])/i],
    ["подземелья", /(?:^|[^а-яa-z0-9])(подземел[а-я]*|данж[а-я]*|башн[а-я]*|этаж[а-я]*|врат(?:а|ах)|охотник[а-я]*|рейд[а-я]*|гробниц[а-я]*|расхитител[а-я]*|лабиринт[а-я]*|прокачка\s+в\s+аду|бездн[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["драконы", /(?:^|[^а-яa-z0-9])(дракон[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["призыв", /(?:^|[^а-яa-z0-9])(призыв[а-я]*|призван[а-я]*|укротител[а-я]*|укрощ[а-я]*|прируч[а-я]*|питом[а-я]*|звер[а-я]*|насеком[а-я]*|гоблин[а-я]*|фамильяр[а-я]*|монстр[а-я]*|чудовищ[а-я]*|эволюци[а-я]*|слиз[ьи]|собак[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["апокалипсис", /(?:^|[^а-яa-z0-9])(апокалипсис[а-я]*|постапокалипсис[а-я]*|зомби|вирус[а-я]*|судный\s+день|выживан[а-я]*|выжить|конец\s+света|мутант[а-я]*|заморозк[а-я]*|заморожен[а-я]*|ледников[а-я]*|ледяной\s+судный|припас[а-я]*|пустош[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["культивация", /(?:^|[^а-яa-z0-9])(культиват[а-я]*|культивац[а-я]*|дао|бессмерт[а-я]*|боевых\s+искусств|мурим[а-я]*|сект[а-я]*|предок|император[а-я]*|императриц[а-я]*|небесн[а-я]*|небожител[а-я]*|династи[яи]\s+тан)(?=$|[^а-яa-z0-9])/i],
    ["демоны", /(?:^|[^а-яa-z0-9])(демон[а-я]*|дьявол[а-я]*|падш[а-я]*|бог[а-я]*|божеств[а-я]*|асур[а-я]*|повелител[а-я]*\s+тьмы|адский|ад\s+что)(?=$|[^а-яa-z0-9])/i],
    ["месть", /(?:^|[^а-яa-z0-9])(мест(?:ь|и|ью)|отомст[а-я]*|предател[а-я]*|сокрушен[а-я]*\s+мира|расплат[а-я]*|злоде[а-я]*|ублюд[а-я]*|отброс[а-я]*|убийц[а-я]*|истребител[а-я]*|уничтож[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["артефакты", /(?:^|[^а-яa-z0-9])(оруди[а-я]*|оружи[а-я]*|артефакт[а-я]*|кузнец[а-я]*|алхим[а-я]*|сокровищ[а-я]*|транжир[а-я]*|меч[а-я]*|нож[а-я]*|клинок|клинка|сталь|синтез[а-я]*)(?=$|[^а-яa-z0-9])/i],
    ["романтика", /(?:^|[^а-яa-z0-9])(романтик[а-я]*|моя\s+жена|моя\s+девушка|гарем[а-я]*|красавиц[а-я]*|день\s+за\s+дн[еем])(?=$|[^а-яa-z0-9])/i],
    ["фэнтези", /(?:^|[^а-яa-z0-9])(маги[а-я]*|архимаг[а-я]*|маг(?:а|у|ом|и)?|волшебн[а-я]*|академи[а-я]*|рыцар[а-я]*|паладин[а-я]*|эльф[а-я]*|графств[а-я]*|графск[а-я]*|герцог[а-я]*|королев[а-я]*|корол[а-я]*|мудрец[а-я]*|геро[а-я]*|авантюрист[а-я]*|владык[а-я]*|повелител[а-я]*|святой)(?=$|[^а-яa-z0-9])/i]
];

const CLIENT_SYNONYM_GROUPS = [
    ["некромант я катастрофа", "ням", "ням (некромант)", "ням некромант", "катастрофический некромант", "некромант - я катастрофа"],
    ["паладин sss ранга", "паладин sss ранга главы", "пsss", "psss", "паладин превосходящий здравый смысл"],
    ["всеобщий отбор укротитель драконов в самом деле самый слабый класс", "всеобщий отбор я укротитель драконов", "воудр (дракончик)", "воудр дракончик", "воудр", "дракончик", "укротитель драконов в самом деле самый слабый класс"],
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
    ["возрождение династии тан", "моя жена из династии тан", "династия тан", "династии тан"],
    ["дитя дурных кровей", "дитя дурной крови", "дитя дурной крови предков"]
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

// Расширенные интерактивные паки из 6 заданий (Еженедельные + Ежедневные)
const WEEKLY_QUEST_PACKS = {
    11: [
        {
            packTitle: "🍁 НОЯБРЬ • ПАК 1: ОСЕННИЙ МАРАФОН МАНХВЫ И МАНЬХУА",
            step2: { title: "2. Открыть бесплатные главы", desc: "Нажми — включу подборку Халявы", action: "free" },
            step3: { title: "3. Проверить Топ рейтинга", desc: "Нажми — покажу лидеров по жанрам", action: "sort:rating_desc" },
            step4: { title: "4. Открыть выбор глав тайтла", desc: "Нажми — выберем главы для просмотра", action: "open_any_chapters" },
            step5: { title: "5. Крутануть рулетку «Мне повезёт»", desc: "Нажми — соберу линию из 4 тайтлов", action: "lucky" },
            step6: { title: "6. Помочь добить цель 200 подп.", desc: "Все 715+ видео от ~8 ₽ в день", action: "reward" }
        },
        {
            packTitle: "💀 НОЯБРЬ • ПАК 2: НЕДЕЛЯ НЕКРОМАНТОВ, СИСТЕМЫ И САКУРЫ",
            step2: { title: "2. Посмотреть хиты Некромантии", desc: "Нажми — покажу Топ тёмного фэнтези", action: "genre:некромантия" },
            step3: { title: "3. Открыть коллекцию Сакуры 🌸", desc: "Нажми — покажу романтические тайтлы", action: "status:romance" },
            step4: { title: "4. Посмотреть завершённые тайтлы 🔥", desc: "Тайтлы, где озвучены ВСЕ главы", action: "status:completed" },
            step5: { title: "5. Крутануть рулетку «Мне повезёт»", desc: "Нажми — случайные 4 тайтла на вечер", action: "lucky" },
            step6: { title: "6. Открыть закрытые Лицензии 2 ур.", desc: "Полный доступ без ожидания", action: "reward" }
        },
        {
            packTitle: "🔥 НОЯБРЬ • ПАК 3: ОХОТА ЗА ЛИДЕРАМИ РЕЙТИНГА",
            step2: { title: "2. Показать лидеров рейтинга 🏆", desc: "Нажми — отсортирую по Топ рейтингу", action: "sort:rating_desc" },
            step3: { title: "3. Открыть хиты Маньхуа 🇨🇳", desc: "Нажми — покажу китайские культивации и систему", action: "type:manhua" },
            step4: { title: "4. Открыть окно выбора глав", desc: "Выбери конкретный выпуск любого тайтла", action: "open_any_chapters" },
            step5: { title: "5. Включить подборку «По предпочтениям»", desc: "Персональная лента под твои вкусы", action: "for_you" },
            step6: { title: "6. Активировать пропуск ко всем главам", desc: "Выгода подписки меньше 8 ₽ в день", action: "reward" }
        },
        {
            packTitle: "🐾 НОЯБРЬ • ПАК 4: ПРЕДЗИМНИЙ ЗАПАС СЕРИЙ",
            step2: { title: "2. Показать персональную полоску 💖", desc: "Нажми — соберу подборку по вкусам", action: "for_you" },
            step3: { title: "3. Посмотреть завершённые тайтлы 🔥", desc: "Все серии от начала и до финала", action: "status:completed" },
            step4: { title: "4. Заглянуть в ТГ-канал ТАКА ✈️", desc: "Открой новости и расписание выходов", action: "tg_modal" },
            step5: { title: "5. Крутануть рулетку «Мне повезёт»", desc: "Случайный выбор из каталога", action: "lucky" },
            step6: { title: "6. Забрать полный доступ на зиму", desc: "Смотри все серии раньше остальных", action: "reward" }
        }
    ],
    12: [
        {
            packTitle: "🔥❄️ ДЕКАБРЬ • ПАК 1: УЮТНЫЙ ВЕЧЕР У КАМИНА",
            step2: { title: "2. Согреться бесплатными главами", desc: "Нажми — открою бесплатные выпуски", action: "free" },
            step3: { title: "3. Проверить Топ рейтинга зимы 🏆", desc: "Лидеры каждого жанра и тега", action: "sort:rating_desc" },
            step4: { title: "4. Посмотреть завершённые тайтлы 🔥", desc: "Полностью готовые истории на вечер", action: "status:completed" },
            step5: { title: "5. Крутануть рулетку «Мне повезёт»", desc: "4 тайтла под тёплый чай", action: "lucky" },
            step6: { title: "6. Открыть зимний VIP-доступ у камина", desc: "Все 715+ видео без ограничений", action: "reward" }
        }
    ]
};

const DAILY_QUESTS_LIST = [
    { id: "dq_chapters", title: "🎬 Открыть выбор глав любого тайтла", desc: "Нажми на любую карточку в каталоге и выбери выпуск", action: "open_any_chapters" },
    { id: "dq_top_rating", title: "🏆 Посмотреть лидеров Топ рейтинга", desc: "Узнай, какие тайтлы занимают #1 место в своих тегах", action: "sort:rating_desc" },
    { id: "dq_completed", title: "🔥 Изучить коллекцию завершённых тайтлов (Все главы)", desc: "Посмотри тайтлы с горячей рамкой, где озвучены все серии", action: "status:completed" }
];

// --- 100% АВТОМАТИЧЕСКАЯ СЕЗОННАЯ И ПОГОДНАЯ АТМОСФЕРА ---
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
        const count = window.innerWidth <= 768 ? 7 : 12;
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
                const sym = i % 2 === 0 ? '🍁' : '🍂';
                const size = 12 + (i % 6);
                pieces.push(`<span class="ambient-particle autumn-leaf" style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;">${sym}</span>`);
            }
        }
        ambientBg.innerHTML = pieces.join('');
    }
}

function harmonizeWeatherWithSeason(rawWeatherType, seasonKey, isNight) {
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
            weatherLabel = '🌙✨ Ночь';
        } else {
            weatherLabel = '☀️ День';
        }
        badgeEl.textContent = `${cfg.label} • ${weatherLabel}`;
    }

    const weatherBg = document.getElementById('weatherAmbientBg');
    if (!weatherBg) return;

    if (weatherType === 'rain') {
        const dropCount = window.innerWidth <= 768 ? 20 : 40;
        const drops = [];
        for (let i = 0; i < dropCount; i++) {
            const left = Math.round(Math.random() * 104);
            const dur = (0.72 + Math.random() * 0.5).toFixed(2);
            const delay = (Math.random() * 2).toFixed(2);
            drops.push(`<span class="rain-streak" style="left:${left}%;animation-duration:${dur}s;animation-delay:-${delay}s;"></span>`);
        }
        weatherBg.innerHTML = drops.join('');
    } else if (weatherType === 'fireflies') {
        const flyCount = window.innerWidth <= 768 ? 10 : 18;
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
        const snowCount = window.innerWidth <= 768 ? 12 : 20;
        const flakes = [];
        for (let i = 0; i < snowCount; i++) {
            const left = Math.round(Math.random() * 98);
            const dur = (9 + Math.random() * 7).toFixed(1);
            const delay = (Math.random() * 9).toFixed(1);
            flakes.push(`<span class="ambient-particle snow-flake" style="left:${left}%;font-size:13px;animation-duration:${dur}s;animation-delay:-${delay}s;">❄️</span>`);
        }
        weatherBg.innerHTML = flakes.join('');
    } else {
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
let monthlySearchMap = {};
let missingQueriesMap = {};
let questsState = { step1: true, step2: false, step3: false, step4: false, step5: false, step6: false };
let dailyQuestsState = { dq_chapters: false, dq_top_rating: false, dq_completed: false };
let userFavoriteTags = {};
let userInteractionCount = 0;
let liveGoalStats = { current: 173, target: 200, left: 27, percent: 87, monthlyNew: 5 };

try { monthlySearchMap = JSON.parse(localStorage.getItem(LOCAL_SEARCH_COUNT_KEY) || '{}'); } catch (e) { monthlySearchMap = {}; }
try { missingQueriesMap = JSON.parse(localStorage.getItem(LOCAL_MISSING_LOG_KEY) || '{}'); } catch (e) { missingQueriesMap = {}; }
try { userInteractionCount = Number(localStorage.getItem(USER_INTERACTION_COUNT_KEY)) || 0; } catch (e) { userInteractionCount = 0; }

try {
    const savedQuests = JSON.parse(localStorage.getItem(QUESTS_STATE_KEY) || '{}');
    questsState = {
        step1: true,
        step2: Boolean(savedQuests.step2),
        step3: Boolean(savedQuests.step3),
        step4: Boolean(savedQuests.step4),
        step5: Boolean(savedQuests.step5),
        step6: Boolean(savedQuests.step6)
    };
} catch (e) {}

try {
    const savedDaily = JSON.parse(localStorage.getItem(DAILY_QUESTS_STATE_KEY) || '{}');
    dailyQuestsState = {
        dq_chapters: Boolean(savedDaily.dq_chapters),
        dq_top_rating: Boolean(savedDaily.dq_top_rating),
        dq_completed: Boolean(savedDaily.dq_completed)
    };
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

function resolveCanonicalTitleClient(title) {
    const norm = normalizeTitleForMatch(title);
    if (!norm) return String(title || 'title');
    for (const group of CLIENT_SYNONYM_GROUPS) {
        const normGroup = group.map(x => normalizeTitleForMatch(x));
        if (normGroup.includes(norm)) {
            return normGroup[0];
        }
        for (const syn of normGroup) {
            if (syn.length > 4 && (norm.startsWith(syn) || syn.startsWith(norm) || norm.includes(syn))) {
                return normGroup[0];
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

function matchTitleInNormList(cleanTitle, normArray) {
    const normT = normalizeTitleForMatch(cleanTitle);
    const canonT = resolveCanonicalTitleClient(cleanTitle);
    for (const entry of normArray) {
        const normE = normalizeTitleForMatch(entry);
        if (!normE) continue;
        if (normT === normE || canonT === normE) return true;
        if (normE.length > 6 && (normT.includes(normE) || normE.includes(normT))) return true;
    }
    return false;
}

// Автоматическая проверка и определение типа (100% приоритет type_overrides.json), тегов и особых статусов без конфликтов
function resolveClientItemMetadata(cleanTitle, itemObj = {}) {
    const normT = normalizeTitleForMatch(cleanTitle);
    const canonT = resolveCanonicalTitleClient(cleanTitle);

    // 1. 100% Приоритет: type_overrides.json
    let resolvedType = null;
    for (const [k, v] of Object.entries(clientTypeOverrides)) {
        if (!v || k === '_comment') continue;
        const normK = normalizeTitleForMatch(k);
        const canonK = resolveCanonicalTitleClient(k);
        if (normK === normT || canonK === canonT || (normK.length > 6 && (normT.includes(normK) || normK.includes(normT)))) {
            const rawVal = String(v).trim().toLowerCase();
            if (rawVal === 'manhua' || rawVal === 'маньхуа') resolvedType = 'manhua';
            else if (rawVal === 'manga' || rawVal === 'манга' || rawVal.includes('oel')) resolvedType = 'manga';
            else if (rawVal === 'manhwa' || rawVal === 'манхва' || rawVal.includes('комикс')) resolvedType = 'manhwa';
            break;
        }
    }

    if (!resolvedType) {
        resolvedType = CONTENT_TYPE_LABELS[itemObj.content_type] ? itemObj.content_type : 'manhwa';
    }

    // 2. Особые коллекции (Романтика Сакура, Завершён, Заморожен) с защитой от конфликтов:
    // Романтика + Завершён МОГУТ совмещаться (двойная рамка!), а Завершён побеждает Заморожен.
    const isRomance = Boolean(itemObj.is_romance || matchTitleInNormList(cleanTitle, clientSpecialLists.romance));
    const isCompleted = Boolean(itemObj.is_completed || matchTitleInNormList(cleanTitle, clientSpecialLists.completed));
    const isFrozen = isCompleted ? false : Boolean(itemObj.is_frozen || matchTitleInNormList(cleanTitle, clientSpecialLists.frozen));

    // 3. Ключевые видимые теги (консенсус) + скрытые теги
    const visibleTags = [];
    if (isRomance) visibleTags.push('романтика');

    if (Array.isArray(itemObj.genres)) {
        itemObj.genres.forEach(rawG => {
            const g = LEGACY_TAG_MIGRATION[rawG] || rawG;
            if (READER_TAGS_DICTIONARY[g] && !visibleTags.includes(g)) {
                visibleTags.push(g);
            }
        });
    }

    const searchText = ` ${canonT} ${normT} `;
    for (const [tagKey, regex] of CLIENT_TAG_REGEX_RULES) {
        if (regex.test(searchText) && !visibleTags.includes(tagKey)) {
            visibleTags.push(tagKey);
        }
    }

    if (visibleTags.length === 0) {
        visibleTags.push('фэнтези');
    }

    const primaryGenres = visibleTags.slice(0, 3);
    const extraVisibleToHidden = visibleTags.slice(3);

    const hiddenTagsSet = new Set(extraVisibleToHidden);
    if (Array.isArray(itemObj.hidden_tags)) {
        itemObj.hidden_tags.forEach(ht => {
            if (ht && !primaryGenres.includes(ht)) hiddenTagsSet.add(String(ht).toLowerCase());
        });
    }

    for (const [hk, hList] of Object.entries(clientSpecialLists.hidden_tags || {})) {
        const normHK = normalizeTitleForMatch(hk);
        if (normHK === normT || normHK === canonT || (normHK.length > 6 && normT.includes(normHK))) {
            (hList || []).forEach(t => hiddenTagsSet.add(String(t).toLowerCase()));
        }
    }

    if (isRomance) hiddenTagsSet.add('романтика');
    if (isCompleted) {
        hiddenTagsSet.add('завершен');
        hiddenTagsSet.add('все главы');
        hiddenTagsSet.add('финал');
    }
    if (isFrozen) {
        hiddenTagsSet.add('заморожен');
        hiddenTagsSet.add('заброшен');
    }

    return {
        contentType: resolvedType,
        genres: primaryGenres,
        hiddenTags: Array.from(hiddenTagsSet),
        isRomance,
        isCompleted,
        isFrozen
    };
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

// --- СИСТЕМА ВЫБОРА ГЛАВ И ВЫПУСКОВ ПРИ НАЖАТИИ НА КАРТОЧКУ ТАЙТЛА ---
function buildAllEpisodesForItem(item) {
    if (!item) return [];

    // 1. Если серверный скрипт update.py уже собрал массив all_posts
    if (Array.isArray(item.all_posts) && item.all_posts.length > 0) {
        return item.all_posts;
    }

    // 2. Собираем из free_posts + свежий платный выпуск (если есть)
    const list = [];
    const seenIds = new Set();

    if (Array.isArray(item.free_posts)) {
        item.free_posts.forEach((fp, idx) => {
            const pid = fp.post_id || `${item.id}_free_${idx + 1}`;
            if (!seenIds.has(pid)) {
                seenIds.add(pid);
                list.push({
                    post_id: pid,
                    title: fp.title || `${item.title} (${fp.range || 'Бесплатный выпуск'})`,
                    range: fp.range || `Выпуск #${idx + 1}`,
                    date: fp.date || item.last_update || 'На Boosty',
                    is_free: true,
                    tier_level: 0,
                    link: fp.link || item.free_post_link || item.link
                });
            }
        });
    }

    if (item.latest_post_id && !seenIds.has(item.latest_post_id)) {
        seenIds.add(item.latest_post_id);
        const isLatestFree = (item.paid_chapters === 0 && item.has_free);
        list.push({
            post_id: item.latest_post_id,
            title: `${item.title} — ${item.latest_range || 'Свежий выпуск'}`,
            range: item.latest_range || (item.chapters > 0 ? `До ${item.chapters} гл.` : 'Свежий выпуск'),
            date: item.last_update || 'На Boosty',
            is_free: isLatestFree,
            tier_level: isLatestFree ? 0 : item.tier_level,
            link: item.latest_post_link || `https://boosty.to/darktaka/posts/${item.latest_post_id}`
        });
    }

    if (list.length === 0) {
        list.push({
            post_id: `${item.id}_main`,
            title: `${item.title} (${item.latest_range || 'Все вышедшие главы'})`,
            range: item.latest_range || (item.chapters > 0 ? `1-${item.chapters} гл.` : 'Все главы'),
            date: item.last_update || 'На Boosty',
            is_free: Boolean(item.has_free && item.paid_chapters === 0),
            tier_level: item.tier_level || 1,
            link: item.latest_post_link || item.link
        });
    }

    return list;
}

function openChaptersSelectModal(item, event) {
    if (!item) return;
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    completeQuestStep(4);
    completeDailyQuest('dq_chapters');
    markTitleSelectedForCatReturn(item);

    trackGoal('open_chapters_modal', {
        title: item.title,
        metric_tag: item.metric_tag,
        level: item.tier_level,
        item: item
    });

    const modal = document.getElementById('chaptersSelectModal');
    const coverEl = document.getElementById('chModalCover');
    const badgesRow = document.getElementById('chModalBadgesRow');
    const titleEl = document.getElementById('chModalTitle');
    const subEl = document.getElementById('chModalSubtitle');
    const hiddenTagsRow = document.getElementById('chModalHiddenTagsRow');
    const latestBtn = document.getElementById('chModalLatestPostBtn');
    const latestRangeEl = document.getElementById('chModalLatestRange');
    const bundleBtn = document.getElementById('chModalBundleFeedBtn');
    const postsListEl = document.getElementById('chModalPostsList');

    if (!modal || !postsListEl) return;

    if (coverEl) coverEl.src = item.image;
    if (titleEl) titleEl.textContent = item.title;

    const badges = [];
    badges.push(`<span class="ch-meta-badge">${CONTENT_TYPE_LABELS[item.content_type] || '🇰🇷 Манхва'}</span>`);
    badges.push(`<span class="ch-meta-badge">🎙️ Озвучено: ${item.chapters || 0} гл.</span>`);
    if (item.is_completed) badges.push(`<span class="ch-meta-badge" style="border-color:#ff6a00;color:#ffb800;">🔥 Завершён (Все главы)</span>`);
    if (item.is_romance) badges.push(`<span class="ch-meta-badge" style="border-color:#ff9a76;color:#ffb49a;">🌸 Романтика (Сакура)</span>`);
    if (item.is_frozen) badges.push(`<span class="ch-meta-badge" style="border-color:#7dd3fc;color:#bae6fd;">❄️ Заморожен</span>`);
    if (badgesRow) badgesRow.innerHTML = badges.join('');

    if (subEl) {
        subEl.textContent = `Бесплатно: ${item.free_chapters || 0} гл. • Платно по подписке: ${item.paid_chapters || 0} гл. • Нажми на нужный выпуск для прямого перехода к ролику:`;
    }

    if (hiddenTagsRow) {
        const allTags = [...(item.genres || []).map(g => READER_TAGS_DICTIONARY[g] || g), ...(item.hidden_tags || [])];
        hiddenTagsRow.innerHTML = allTags.slice(0, 8).map(t => `<span class="ch-hidden-tag-chip">#${t}</span>`).join('');
    }

    const directLatestHref = appendBoostyUtm(item.latest_post_link || item.link, item.metric_tag);
    const bundleFeedHref = appendBoostyUtm(item.link, item.metric_tag);

    if (latestBtn) {
        latestBtn.href = directLatestHref;
        latestBtn.onclick = () => {
            markTitleSelectedForCatReturn(item);
            trackGoal('click_direct_post', { title: item.title, metric_tag: item.metric_tag, level: item.tier_level, item });
        };
    }
    if (latestRangeEl) {
        latestRangeEl.textContent = item.latest_range || (item.chapters > 0 ? `${item.chapters} гл.` : 'Свежий выпуск');
    }
    if (bundleBtn) {
        bundleBtn.href = bundleFeedHref;
        bundleBtn.onclick = () => {
            markTitleSelectedForCatReturn(item);
            trackGoal('click_bundle_feed', { title: item.title, metric_tag: item.metric_tag, level: item.tier_level, item });
        };
    }

    const episodes = buildAllEpisodesForItem(item);
    postsListEl.innerHTML = episodes.map((ep, idx) => {
        const postHref = appendBoostyUtm(ep.link || `https://boosty.to/darktaka/posts/${ep.post_id}`, item.metric_tag);
        const isFree = Boolean(ep.is_free);
        const badgeText = isFree
            ? '🆓 Бесплатно • Открыть ролик ↗'
            : `🔒 По подписке (${item.tier_level === 2 ? '2 ур.' : '1 ур.'}) • Открыть ↗`;
        return `
            <a href="${postHref}" target="_blank" rel="noopener" class="ch-post-item ${isFree ? 'is-free-post' : ''}" data-ep-idx="${idx}">
                <div class="ch-post-left">
                    <span class="ch-post-title">🎬 ${ep.range || `Выпуск #${idx + 1}`} — ${ep.title || item.title}</span>
                    <span class="ch-post-sub">📅 Опубликовано: ${ep.date || item.last_update} • Прямая ссылка на пост</span>
                </div>
                <span class="ch-post-badge ${isFree ? 'free' : 'paid'}">${badgeText}</span>
            </a>
        `;
    }).join('');

    postsListEl.querySelectorAll('.ch-post-item').forEach(linkEl => {
        linkEl.addEventListener('click', () => {
            if (linkEl.classList.contains('is-free-post')) {
                completeQuestStep(2);
            }
            markTitleSelectedForCatReturn(item);
            trackGoal('click_episode_post', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level,
                item: item
            });
        });
    });

    modal.classList.add('active');
}

// --- МОДАЛЬНОЕ ОКНО ТЕЛЕГРАМ-КАНАЛА ТАКА (ПО КНОПКЕ В ШАПКЕ) ---
function populateTelegramChannelModal(tgNewsList) {
    if (Array.isArray(tgNewsList) && tgNewsList.length > 0) {
        tgNewsCachedList = tgNewsList;
    }
    const listEl = document.getElementById('tgModalNewsList');
    if (!listEl) return;

    if (!tgNewsCachedList || tgNewsCachedList.length === 0) {
        listEl.innerHTML = `
            <a href="https://t.me/PoteranSusheter" target="_blank" rel="noopener" class="modal-option highlight-orange-btn">
                <div class="option-title">✈️ Перейти в Telegram-канал @PoteranSusheter ↗</div>
                <div class="option-desc">Открыть все посты, анонсы и расписание серий в Telegram</div>
            </a>
        `;
        return;
    }

    listEl.innerHTML = tgNewsCachedList.slice(0, 4).map((post, idx) => {
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
            const post = tgNewsCachedList[Number(btn.dataset.idx)];
            if (post) openTgNewsLightbox(post);
        });
    });
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
            recordUserTagInterest(payload.item, 1);
            incrementMonthlyTitlePopularity(payload.item, 1);
            if (typeof updateCatWidgetContext === 'function') {
                updateCatWidgetContext(payload.item, false);
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
        completeQuestStep(6);
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

// --- ЕЖЕНЕДЕЛЬНЫЕ ПАКИ + ЕЖЕДНЕВНЫЕ ИНТЕРАКТИВНЫЕ ЗАДАНИЯ ---
function getCurrentWeeklyQuestPack() {
    const month = now.getUTCMonth() + 1;
    const monthPacks = WEEKLY_QUEST_PACKS[month] || WEEKLY_QUEST_PACKS[11];
    return monthPacks[CURRENT_WEEK_INDEX] || monthPacks[0];
}

function saveQuestsState() {
    try {
        localStorage.setItem(QUESTS_STATE_KEY, JSON.stringify(questsState));
        localStorage.setItem(DAILY_QUESTS_STATE_KEY, JSON.stringify(dailyQuestsState));
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

function completeDailyQuest(dqId) {
    if (dailyQuestsState[dqId] === false) {
        dailyQuestsState[dqId] = true;
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

    [2, 3, 4, 5, 6].forEach(num => {
        const cfg = activePack[`step${num}`];
        const tEl = document.getElementById(`questTitle${num}`);
        const dEl = document.getElementById(`questDesc${num}`);
        if (cfg && tEl && dEl) {
            tEl.textContent = cfg.title;
            dEl.textContent = cfg.desc;
        }
    });

    const stepsArr = [questsState.step1, questsState.step2, questsState.step3, questsState.step4, questsState.step5, questsState.step6];
    const doneCount = stepsArr.filter(Boolean).length;
    const percent = Math.round((doneCount / 6) * 100);

    const badgeEl = document.getElementById('headerQuestProgressBadge');
    const statusEl = document.getElementById('wqStatusText');
    const barEl = document.getElementById('wqProgressBar');

    if (badgeEl) badgeEl.textContent = `${doneCount}/6`;
    if (barEl) barEl.style.width = `${percent}%`;
    if (statusEl) {
        statusEl.textContent = doneCount >= 6
            ? '🎉 Все 6 заданий недели выполнены! Спасибо за активность в семье ТАКА!'
            : `Выполнено ${doneCount} из 6 • Нажми на любую задачу — выполнится в 1 клик!`;
    }

    [2, 3, 4, 5, 6].forEach(num => {
        const stepEl = document.getElementById(`questStep${num}`);
        const iconEl = document.getElementById(`questIcon${num}`);
        if (stepEl && questsState[`step${num}`]) {
            stepEl.classList.add('done');
            if (iconEl) iconEl.textContent = '✅';
        }
    });

    // Рендерим блок ежедневных заданий в модальном окне
    const dailyListEl = document.getElementById('dailyQuestsModalList');
    const dailyBadgeEl = document.getElementById('dailyQuestsCounterBadge');
    if (dailyListEl) {
        const dailyDoneCount = Object.values(dailyQuestsState).filter(Boolean).length;
        if (dailyBadgeEl) dailyBadgeEl.textContent = `${dailyDoneCount} / ${DAILY_QUESTS_LIST.length}`;

        dailyListEl.innerHTML = DAILY_QUESTS_LIST.map(dq => {
            const isDone = Boolean(dailyQuestsState[dq.id]);
            return `
                <button type="button" class="wq-step ${isDone ? 'done' : ''}" data-dq-id="${dq.id}" data-dq-action="${dq.action}">
                    <span class="wq-check">${isDone ? '✅' : '☀️'}</span>
                    <div class="wq-step-info">
                        <b>${dq.title}</b>
                        <span>${dq.desc}</span>
                    </div>
                </button>
            `;
        }).join('');

        dailyListEl.querySelectorAll('.wq-step').forEach(btn => {
            btn.addEventListener('click', () => {
                const dqId = btn.dataset.dqId;
                const act = btn.dataset.dqAction;
                completeDailyQuest(dqId);
                const qModal = document.getElementById('questsModal');
                if (qModal) qModal.classList.remove('active');
                executeQuestActionString(act);
            });
        });
    }
}

function executeQuestActionString(action) {
    if (!action) return;
    if (action === 'free') {
        selectTierLevelOption('free');
    } else if (action === 'for_you') {
        isForYouStripOpen = true;
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
            if (sortKey === 'rating_desc') completeDailyQuest('dq_top_rating');
            applyFilters();
        }
    } else if (action.startsWith('genre:')) {
        const genreKey = action.split(':')[1];
        selectedGenres.clear();
        selectedGenres.add(genreKey);
        syncGenrePillsUI();
        applyFilters();
    } else if (action.startsWith('status:')) {
        const stKey = action.split(':')[1];
        selectSpecialStatusFilter(stKey);
    } else if (action.startsWith('type:')) {
        const tKey = action.split(':')[1];
        const typeSel = document.getElementById('typeFilterSelect');
        if (typeSel) {
            typeSel.value = tKey;
            activeContentTypeFilter = tKey;
            updateResetFiltersBtnVisibility();
            applyFilters();
        }
    } else if (action === 'lucky') {
        openLuckySingleRow();
    } else if (action === 'open_any_chapters') {
        const targetItem = lastFilteredItems[0] || allItems[0];
        if (targetItem) openChaptersSelectModal(targetItem);
    } else if (action === 'tg_modal') {
        const tgModal = document.getElementById('tgChannelModal');
        if (tgModal) tgModal.classList.add('active');
    } else {
        const qModal = document.getElementById('questsModal');
        if (qModal) qModal.classList.add('active');
    }
}

function runLazyQuestAction(stepNumber) {
    const activePack = getCurrentWeeklyQuestPack();
    const stepCfg = activePack[`step${stepNumber}`] || {};
    const action = stepCfg.action || 'reward';
    completeQuestStep(stepNumber);
    executeQuestActionString(action);
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

function selectSpecialStatusFilter(statusVal) {
    activeSpecialStatusFilter = statusVal || 'all';
    if (activeSpecialStatusFilter === 'completed') {
        completeDailyQuest('dq_completed');
    }
    document.querySelectorAll('#specialStatusFilterRow .status-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === activeSpecialStatusFilter);
    });
    updateResetFiltersBtnVisibility();
    applyFilters();
}

function initMobileSubscriptionSliders() {
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

// --- ЛИНИЯ СЛУЧАЙНЫХ ТАЙТЛОВ («🎲 МНЕ ПОВЕЗЁТ!») ---
function openLuckySingleRow() {
    if (allItems.length === 0) return;
    const section = document.getElementById('luckyRowSection');
    const grid = document.getElementById('luckyRowGrid');
    if (!section || !grid) return;

    completeQuestStep(5);

    const pool = [...allItems];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosenFour = pool.slice(0, 4);

    grid.innerHTML = '';
    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0));
    const topMap = getTopThreeRatingMap();

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

// --- ПОЛОСКА «💖 ПО ВАШИМ ПРЕДПОЧТЕНИЯМ» ---
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
        });
    }

    const recommended = [...allItems]
        .filter(item => prefTags.length === 0 || (Array.isArray(item.genres) && item.genres.some(g => prefTags.includes(g))))
        .sort((a, b) => {
            const scoreA = (a.genres || []).reduce((acc, g) => acc + (Number(userFavoriteTags[g]) || 0), 0) * 20 + (a.rating_score || 0);
            const scoreB = (b.genres || []).reduce((acc, g) => acc + (Number(userFavoriteTags[g]) || 0), 0) * 20 + (b.rating_score || 0);
            return scoreB - scoreA;
        })
        .slice(0, 4);

    gridEl.innerHTML = '';
    const maxTs = Math.max(...allItems.map(i => i.timestamp || 0));
    const topMap = getTopThreeRatingMap();

    recommended.forEach((item, idx) => {
        const cardEl = createCatalogCardElement(item, maxTs, topMap, idx < 2);
        gridEl.appendChild(cardEl);
    });

    stripEl.style.display = 'block';
}

// --- МУЛЬТИВЫБОР ТЕГОВ, ОСОБЫХ СТАТУСОВ И АЛФАВИТА ---
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
        activeSpecialStatusFilter !== 'all' ||
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
                activeLetterFilter = (activeLetterFilter === clickedLetter && clickedLetter !== 'all') ? 'all' : clickedLetter;
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

    document.querySelectorAll('#specialStatusFilterRow .status-filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const clicked = btn.dataset.status || 'all';
            const nextVal = (activeSpecialStatusFilter === clicked && clicked !== 'all') ? 'all' : clicked;
            selectSpecialStatusFilter(nextVal);
        });
    });

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

        pill.addEventListener('click', (e) => {
            e.preventDefault();
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
        });
    });

    const resetAllFiltersBtn = document.getElementById('resetAllFiltersBtn');
    if (resetAllFiltersBtn) {
        resetAllFiltersBtn.addEventListener('click', () => {
            selectedGenres.clear();
            activeContentTypeFilter = 'all';
            activeSpecialStatusFilter = 'all';
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
            document.querySelectorAll('#specialStatusFilterRow .status-filter-pill').forEach(b => {
                b.classList.toggle('active', b.dataset.status === 'all');
            });
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
        if (sortSelect && sortSelect.value !== 'monthly_popular_desc' && sortSelect.value !== 'rating_desc') {
            sortSelect.value = 'monthly_popular_desc';
        }
        applyFilters();
    });
}

function getItemMonthStats(item, monthKey = selectedStatsMonth) {
    const targetMonth = (!monthKey || monthKey === 'current') ? CURRENT_MONTH_KEY : monthKey;
    if (targetMonth === CURRENT_MONTH_KEY) {
        return {
            rating: Number(item.rating_score) || 0,
            searches: Number(item.monthly_searches) || 0
        };
    }
    const arch = monthsArchiveData[targetMonth];
    if (arch && arch.items && arch.items[item.id]) {
        const entry = arch.items[item.id];
        return {
            rating: Number(entry.rating_score) || Number(item.rating_score) || 0,
            searches: Number(entry.monthly_searches) || 0
        };
    }
    return { rating: Number(item.rating_score) || 0, searches: 0 };
}

document.addEventListener("DOMContentLoaded", () => {
    initAutomatedAtmosphereEngine();
    initThemeToggle();
    initViewSwitcher();
    initTwoMainButtonsAndFilters();
    initMobileSubscriptionSliders();
    renderQuestsUI();
    initInfiniteScrollObserver();

    const monthlySortOpt = document.getElementById('monthlySortOption');
    if (monthlySortOpt) {
        monthlySortOpt.textContent = `📅 Популярное (${CURRENT_MONTH_NAME})`;
    }

    const sugHead = document.getElementById('suggestionsHeadTitle');
    if (sugHead) {
        sugHead.textContent = `🏆 Лидеры рейтинга за ${CURRENT_MONTH_HUMAN.toLowerCase()}:`;
    }

    setupModal('orderModal', 'openOrderModal', 'closeOrderModal', 'open_order_modal');
    setupModal('guideModal', null, 'closeGuideModal', 'open_payment_guide');
    setupModal('questsModal', 'openQuestsModalBtn', 'closeQuestsModal', 'open_quests_modal');
    setupModal('chaptersSelectModal', null, 'closeChaptersSelectModal', null);
    setupModal('tgChannelModal', 'openTgChannelModalBtn', 'closeTgChannelModal', 'open_tg_channel_modal');
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
    loadOverridesAndCatalogData();
    initCatTutorialSystem();

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
            if (sortSelect.value === 'rating_desc') {
                completeQuestStep(3);
                completeDailyQuest('dq_top_rating');
            }
            applyFilters();
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
            const videosEl = document.getElementById('statVideos');
            if (subsEl && stats.subscribers) {
                subsEl.textContent = Number(stats.subscribers).toLocaleString('ru-RU');
            }
            if (videosEl) {
                const vCount = Number(stats.videos_count) || Number(stats.posts) || 715;
                videosEl.textContent = vCount.toLocaleString('ru-RU');
            }

            if (Array.isArray(stats.tg_news) && stats.tg_news.length > 0) {
                populateTelegramChannelModal(stats.tg_news);
            }

            if (Array.isArray(stats.goals) && stats.goals.length > 0) {
                const g = stats.goals[0];
                const current = typeof g.current === 'number' ? g.current : 173;
                const target = g.target || 200;
                const left = Math.max(1, target - current);
                const percent = Math.min(100, Math.round((current / target) * 100));

                // Вычисляем динамику платных подписчиков за месяц
                let monthlyNew = Number(stats.monthly_new_paid_subs);
                if (!monthlyNew || monthlyNew < 0) {
                    const baselineKey = `taka_paid_subs_baseline_${CURRENT_MONTH_KEY}`;
                    let savedBase = Number(localStorage.getItem(baselineKey));
                    if (!savedBase || savedBase > current) {
                        savedBase = Math.max(1, current - 5);
                        try { localStorage.setItem(baselineKey, String(savedBase)); } catch (e) {}
                    }
                    monthlyNew = Math.max(1, current - savedBase);
                }

                liveGoalStats = { current, target, left, percent, monthlyNew };

                const numEl = document.getElementById('goalNumbers');
                const barEl = document.getElementById('goalProgressBar');
                const descEl = document.getElementById('goalDesc');
                const monthlyNewEl = document.getElementById('goalMonthlyNewCount');

                if (numEl) numEl.textContent = `${current} из ${target} платных подписчиков (${percent}%) — осталось всего ${left}!`;
                if (barEl) barEl.style.width = `${percent}%`;
                if (descEl && g.description) descEl.textContent = g.description;
                if (monthlyNewEl) monthlyNewEl.textContent = `+${monthlyNew}`;

                const cwGoalText = document.getElementById('catWidgetGoalText');
                const cwGoalLeft = document.getElementById('catWidgetGoalLeft');
                const cwGoalFill = document.getElementById('catWidgetGoalFill');
                const cwLauncher = document.getElementById('catLauncherLabel');

                if (cwGoalText) cwGoalText.textContent = `🎯 Цель: ${current} из ${target} подп. (${percent}%)`;
                if (cwGoalLeft) cwGoalLeft.textContent = `Осталось ${left} чел.! (+${monthlyNew} за мес.)`;
                if (cwGoalFill) cwGoalFill.style.width = `${percent}%`;
                if (cwLauncher) cwLauncher.textContent = `Цель: ${current}/${target} 🥺🐾`;
            }
        })
        .catch(() => {});
}

async function loadOverridesAndCatalogData() {
    const ts = Date.now();

    // Подгружаем справочник 100% приоритета type_overrides.json
    try {
        const toRes = await fetch('type_overrides.json?v=' + ts);
        if (toRes.ok) {
            const toData = await toRes.json();
            if (toData && typeof toData === 'object') {
                Object.entries(toData).forEach(([k, v]) => {
                    if (k !== '_comment' && v && String(v).trim()) {
                        clientTypeOverrides[normalizeTitleForMatch(k)] = String(v).trim().toLowerCase();
                    }
                });
            }
        }
    } catch (e) {}

    // Подгружаем особые категории special_titles.json
    try {
        const spRes = await fetch('special_titles.json?v=' + ts);
        if (spRes.ok) {
            const spData = await spRes.json();
            if (spData && typeof spData === 'object') {
                if (Array.isArray(spData.romance_sakura)) {
                    clientSpecialLists.romance = spData.romance_sakura.map(normalizeTitleForMatch);
                }
                if (Array.isArray(spData.completed_titles)) {
                    clientSpecialLists.completed = spData.completed_titles.map(normalizeTitleForMatch);
                }
                if (Array.isArray(spData.frozen_titles)) {
                    clientSpecialLists.frozen = spData.frozen_titles.map(normalizeTitleForMatch);
                }
                if (spData.hidden_tags_overrides && typeof spData.hidden_tags_overrides === 'object') {
                    Object.entries(spData.hidden_tags_overrides).forEach(([k, arr]) => {
                        if (Array.isArray(arr)) {
                            clientSpecialLists.hidden_tags[normalizeTitleForMatch(k)] = arr;
                        }
                    });
                }
            }
        }
    } catch (e) {}

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

function computeClientRatingsAndGenreLeaders(itemsList) {
    if (!Array.isArray(itemsList) || itemsList.length === 0) return;

    const maxTs = Math.max(...itemsList.map(i => i.timestamp || 0), Math.floor(Date.now() / 1000));

    itemsList.forEach(item => {
        const ch = Number(item.chapters) || 0;
        const postsCnt = Number(item.posts_count) || 1;
        const searches = Number(item.monthly_searches) || 0;
        const ts = Number(item.timestamp) || 0;
        const recencyBonus = ts > 0 ? Math.max(0, 60 - Math.floor((maxTs - ts) / 86400)) : 0;
        const tierBonus = item.tier_level === 2 ? 25 : 10;
        const completedBonus = item.is_completed ? 20 : 0;

        item.rating_score = Number(item.rating_score) || (ch * 3 + postsCnt * 14 + searches * 8 + recencyBonus + tierBonus + completedBonus);
        item.top_genre_badges = [];
    });

    const sortedByRating = [...itemsList].sort((a, b) => (b.rating_score || 0) - (a.rating_score || 0));
    sortedByRating.forEach((it, idx) => {
        it.rating_rank = idx + 1;
    });

    Object.keys(READER_TAGS_DICTIONARY).forEach(tagKey => {
        const candidates = sortedByRating.filter(it => Array.isArray(it.genres) && it.genres.includes(tagKey) && !it.is_frozen);
        if (candidates.length > 0) {
            candidates[0].top_genre_badges.push(tagKey);
        }
    });
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

        const tierText = levelNum === 2 ? "👑 2 уровень • 500 ₽/мес" : "🧡 1 уровень • 250 ₽/мес";
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
        const allPosts = Array.isArray(item.all_posts) ? item.all_posts : [];
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
        const meta = resolveClientItemMetadata(cleanTitle, item);

        const latestRange = totalChapters > 0
            ? (item.latest_range && !String(item.id).startsWith('tag_') ? item.latest_range : `1-${totalChapters} гл.`)
            : 'Все главы в ленте';

        const fileVoteEntry = votesFileMap[item.id];
        const fileMonthlySearches = fileVoteEntry && typeof fileVoteEntry === 'object'
            ? (Number(fileVoteEntry.monthly_searches) || 0)
            : 0;

        const initialMonthlySearches = Math.max(
            fileMonthlySearches,
            Number(monthlySearchMap[item.id]) || 0,
            Number(item.monthly_searches) || 0
        );
        monthlySearchMap[item.id] = initialMonthlySearches;

        return {
            ...item,
            title: cleanTitle,
            image: normalizeCoverUrl(item.image),
            content_type: meta.contentType,
            chapters: totalChapters,
            free_chapters: freeChapters,
            paid_chapters: paidChapters,
            has_free: hasFree,
            free_text: freeText,
            free_posts: freePosts,
            all_posts: allPosts,
            metric_tag: engMetricTag,
            genres: meta.genres,
            hidden_tags: meta.hiddenTags,
            is_romance: meta.isRomance,
            is_completed: meta.isCompleted,
            is_frozen: meta.isFrozen,
            latest_range: latestRange,
            tier: tierText,
            tier_level: levelNum,
            link: feedLink,
            latest_post_link: latestPostLink,
            free_post_link: freePostLink,
            sub_link: subLink,
            originalIndex: index,
            monthly_searches: initialMonthlySearches
        };
    });

    computeClientRatingsAndGenreLeaders(allItems);
    updateTabCountersAndBanners();
    renderHighlightsBlocks();
    renderTopForYouStrip();
    checkUrlAnchorParam();
    applyFilters();
    initCatRecommendationWidget();
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
            setTimeout(() => openChaptersSelectModal(matched), 350);
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

    const totalFreeChSum = allItems.reduce((acc, i) => acc + (Number(i.free_chapters) || 0), 0);
    const totalPaidChSum = allItems.reduce((acc, i) => acc + (Number(i.paid_chapters) || 0), 0);
    const totalVoicedSum = totalFreeChSum + totalPaidChSum;

    if (cAll) cAll.textContent = allItems.length;
    if (cAllMenu) cAllMenu.textContent = allItems.length;
    if (cFree) cFree.textContent = freeItems.length;
    if (c1) c1.textContent = t1Items.length;
    if (c2) c2.textContent = t2Items.length;

    if (mAll) mAll.textContent = allItems.length;
    if (mFree) mFree.textContent = freeItems.length;
    if (m1) m1.textContent = t1Items.length;
    if (m2) m2.textContent = t2Items.length;

    // Обновляем статистику в шапке: Бесплатные главы, Платные главы, Озвучено всего глав (платные + бесплатные)
    const statFreeEl = document.getElementById('statFreeChaptersTotal');
    const statPaidEl = document.getElementById('statPaidChaptersTotal');
    const statVoicedEl = document.getElementById('statVoicedTotal');

    if (statFreeEl) statFreeEl.textContent = `${totalFreeChSum.toLocaleString('ru-RU')} гл.`;
    if (statPaidEl) statPaidEl.textContent = `${totalPaidChSum.toLocaleString('ru-RU')} гл.`;
    if (statVoicedEl) statVoicedEl.textContent = `${totalVoicedSum.toLocaleString('ru-RU')} гл.`;

    // Счётчики особых коллекций
    const cntCompleted = document.getElementById('count-status-completed');
    const cntRomance = document.getElementById('count-status-romance');
    const cntFrozen = document.getElementById('count-status-frozen');
    if (cntCompleted) cntCompleted.textContent = allItems.filter(x => x.is_completed).length;
    if (cntRomance) cntRomance.textContent = allItems.filter(x => x.is_romance).length;
    if (cntFrozen) cntFrozen.textContent = allItems.filter(x => x.is_frozen).length;

    // Обновляем счётчики типов манги
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
        desc2.textContent = `Все ${allItems.length} тайтлов (${totalVoicedSum.toLocaleString('ru-RU')}+ глав), Лицензии + ТГ-чат`;
    }
}

function getTopThreeRatingMap() {
    const sorted = [...allItems]
        .filter(i => !i.is_frozen)
        .sort((a, b) => (b.rating_score || 0) - (a.rating_score || 0));
    const rankMap = {};
    sorted.slice(0, 3).forEach((item, idx) => {
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
        weekTitleEl.textContent = `🔥 Новые главы за неделю (${recentWeekReleases.length}) — прямой переход на свежий ролик`;
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
                   data-id="${i.id}" data-metric-tag="${i.metric_tag}" title="Перейти сразу на свежий ролик «${safeTitle}» на Boosty">
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
                    markTitleSelectedForCatReturn(itemObj);
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
            return `
                <a href="#choose-chapters" class="hl-chip ${i.tier_level === 2 ? 'hl-gold' : ''}"
                   data-id="${i.id}" data-metric-tag="${i.metric_tag}">
                    <img src="${i.image}" alt="${safeTitle}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
                    <div>
                        <div class="hl-chip-title">${i.title}</div>
                        <span class="hl-chip-sub">👑 Новый тайтл • Озвучено: ${i.chapters || 0} гл.</span>
                    </div>
                </a>
            `;
        }).join('');

        monthList.querySelectorAll('.hl-chip').forEach(chip => {
            const itemObj = allItems.find(x => String(x.id) === String(chip.dataset.id));
            if (itemObj) {
                chip.addEventListener('click', (e) => {
                    openChaptersSelectModal(itemObj, e);
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

    const topFiveRating = [...allItems]
        .sort((a, b) => (b.rating_score || 0) - (a.rating_score || 0))
        .slice(0, 5);

    listEl.innerHTML = topFiveRating.map((item, idx) => `
        <div class="suggestion-item" data-title="${item.title}" data-id="${item.id}">
            <span>🏆 #${idx + 1} ${item.title}</span>
            <span style="color:var(--text-muted);font-size:11.5px;">🎙️ ${item.chapters || 0} гл.</span>
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
                }
                updateResetFiltersBtnVisibility();
                applyFilters();
            }
        });
    });
}

// --- ФИЛЬТРАЦИЯ КАТАЛОГА (ВКЛЮЧАЯ СКРЫТЫЕ ТЕГИ И ОСОБЫЕ КОЛЛЕКЦИИ) ---
function updateFilterSummaryBar(filtered = lastFilteredItems) {
    const totalEl = document.getElementById('totalTitlesCount');
    if (!totalEl) return;

    const manhwaCnt = filtered.filter(x => x.content_type === 'manhwa').length;
    const manhuaCnt = filtered.filter(x => x.content_type === 'manhua').length;
    const mangaCnt = filtered.filter(x => x.content_type === 'manga').length;

    const freeSum = filtered.reduce((acc, i) => acc + (Number(i.free_chapters) || 0), 0);
    const paidSum = filtered.reduce((acc, i) => acc + (Number(i.paid_chapters) || 0), 0);
    const voicedSum = freeSum + paidSum;

    totalEl.textContent = `🐾 Найдено: ${filtered.length} из ${allItems.length} (🇰🇷 Манхва: ${manhwaCnt} • 🇨🇳 Маньхуа: ${manhuaCnt} • 🇯🇵 Манга: ${mangaCnt}) • 🎙️ Озвучено всего: ${voicedSum.toLocaleString('ru-RU')} гл.`;
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
        const hiddenTagsText = (item.hidden_tags || []).join(' ').toLowerCase();
        const typeLabelText = (CONTENT_TYPE_LABELS[item.content_type] || '').toLowerCase();

        const matchesSearch = !searchText ||
                              item.title.toLowerCase().includes(searchText) ||
                              (item.metric_tag && item.metric_tag.toLowerCase().includes(searchText)) ||
                              tagNamesText.includes(searchText) ||
                              hiddenTagsText.includes(searchText) ||
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

        let matchesStatus = true;
        if (activeSpecialStatusFilter === 'completed') {
            matchesStatus = Boolean(item.is_completed);
        } else if (activeSpecialStatusFilter === 'romance') {
            matchesStatus = Boolean(item.is_romance);
        } else if (activeSpecialStatusFilter === 'frozen') {
            matchesStatus = Boolean(item.is_frozen);
        }

        let matchesGenre = true;
        if (selectedGenreArray.length > 0) {
            const itemAllTags = [...(item.genres || []), ...(item.hidden_tags || [])];
            if (selectedGenreArray.length <= 2) {
                matchesGenre = selectedGenreArray.every(g => itemAllTags.includes(g));
            } else {
                matchesGenre = selectedGenreArray.some(g => itemAllTags.includes(g));
            }
        }

        let matchesLetter = true;
        if (activeLetterFilter !== 'all') {
            const firstChar = String(item.title || '').trim().charAt(0).toUpperCase().replace('Ё', 'Е');
            matchesLetter = firstChar === activeLetterFilter;
        }

        return matchesSearch && matchesTier && matchesType && matchesStatus && matchesGenre && matchesLetter;
    });

    if (rawSearch.length >= 3 && filtered.length > 0 && filtered.length <= 3) {
        missingSearchTimer = setTimeout(() => {
            recordUserTagInterest(filtered[0], 1);
            incrementMonthlyTitlePopularity(filtered[0], 1);
        }, 1000);
    }

    if (rawSearch.length >= 3 && filtered.length === 0 && activeTierTab === 'all' && selectedGenreArray.length === 0 && activeContentTypeFilter === 'all' && activeSpecialStatusFilter === 'all' && activeLetterFilter === 'all') {
        missingSearchTimer = setTimeout(() => {
            recordMissingSearchQuery(rawSearch);
        }, 900);
    }

    filtered.sort((a, b) => {
        if (a._isSpotlight && !b._isSpotlight) return -1;
        if (!a._isSpotlight && b._isSpotlight) return 1;

        // Если выбран конкретный тег, лидер этого тега (Топ-1 жанра) поднимается выше при сортировке по рейтингу
        if (selectedGenreArray.length === 1 && sortValue === 'rating_desc') {
            const activeTag = selectedGenreArray[0];
            const aIsKing = Array.isArray(a.top_genre_badges) && a.top_genre_badges.includes(activeTag);
            const bIsKing = Array.isArray(b.top_genre_badges) && b.top_genre_badges.includes(activeTag);
            if (aIsKing && !bIsKing) return -1;
            if (!aIsKing && bIsKing) return 1;
        }

        const stA = getItemMonthStats(a, selectedStatsMonth);
        const stB = getItemMonthStats(b, selectedStatsMonth);

        if (sortValue === 'update_desc') {
            return (b.timestamp || 0) - (a.timestamp || 0);
        } else if (sortValue === 'rating_desc') {
            return (b.rating_score || 0) - (a.rating_score || 0);
        } else if (sortValue === 'monthly_popular_desc') {
            const mDiff = (stB.searches * 15 + stB.rating) - (stA.searches * 15 + stA.rating);
            if (mDiff !== 0) return mDiff;
            return (b.timestamp || 0) - (a.timestamp || 0);
        } else if (sortValue === 'completed_first') {
            if (a.is_completed && !b.is_completed) return -1;
            if (!a.is_completed && b.is_completed) return 1;
            return (b.chapters || 0) - (a.chapters || 0);
        } else if (sortValue === 'alpha_asc') {
            return a.title.localeCompare(b.title, 'ru');
        } else if (sortValue === 'alpha_desc') {
            return b.title.localeCompare(a.title, 'ru');
        } else if (sortValue === 'free_desc') {
            const freeDiff = (b.free_chapters || 0) - (a.free_chapters || 0);
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

// --- СОЗДАНИЕ КАРТОЧКИ ТАЙТЛА (БЕЗ КНОПКИ КУПИТЬ ПОДПИСКУ И БЕЗ ХОЧУ ПРОДУ) ---
function createCatalogCardElement(item, maxTs, topThreeMap, isPriorityImage = false) {
    const card = document.createElement('div');
    const isLicense = item.tier_level === 2;
    const hasFree = item.has_free || item.free_chapters > 0;
    const isRomance = Boolean(item.is_romance);
    const isCompleted = Boolean(item.is_completed);
    const isFrozen = Boolean(item.is_frozen);

    const classes = ['card', `tier-frame-${item.tier_level || 1}`];
    if (hasFree) classes.push('has-free-card');
    if (isRomance) classes.push('romance-sakura-card');
    if (isCompleted) classes.push('completed-fire-card');
    if (isFrozen) classes.push('frozen-ice-card');
    if (item._isSpotlight) classes.push('anchor-spotlight');
    card.className = classes.join(' ');

    card.setAttribute('data-metric-tag', item.metric_tag);
    card.setAttribute('data-title-id', item.title);
    card.setAttribute('data-level', item.tier_level);

    // Огонёк горячих глав: появляется ТОЛЬКО если тайтл обновлялся за последние 7 дней
    const isHotWeekRelease = Boolean(item.timestamp && (maxTs - item.timestamp) <= (7 * 86400));

    const voicedCh = Number(item.chapters) || 0;
    const freeChCount = Number(item.free_chapters) || 0;
    const paidChCount = voicedCh > 0 ? Math.max(0, voicedCh - freeChCount) : 0;

    // 1. Верхний левый бейдж: Заморожен (вместо Эксклюзив/Лицензия) ИЛИ Лицензия / Эксклюзив
    let topLeftBadgeHtml = '';
    if (isFrozen) {
        topLeftBadgeHtml = `<span class="badge-top-left frozen-ice-badge" title="Тайтл заморожен или заброшен">❄️ Заморожен</span>`;
    } else if (isLicense) {
        topLeftBadgeHtml = `<span class="badge-top-left license-gold-badge">👑 Лицензия</span>`;
    } else {
        topLeftBadgeHtml = `<span class="badge-top-left">🔒 Эксклюзив</span>`;
    }

    // 2. Бейдж завершённого тайтла (Все главы + огонёк)
    const completedBadgeHtml = isCompleted
        ? `<span class="badge-completed-fire" title="Тайтл полностью завершён — озвучены все главы!">🔥 Все главы</span>`
        : '';

    // 3. Бейдж Топ рейтинга (Глобальный Топ-3 или Топ-1 своего тега)
    const topGlobalRank = topThreeMap[item.id];
    const activeGenreArray = Array.from(selectedGenres);
    let ratingBadgeHtml = '';
    if (activeGenreArray.length === 1 && Array.isArray(item.top_genre_badges) && item.top_genre_badges.includes(activeGenreArray[0])) {
        const gLabel = (READER_TAGS_DICTIONARY[activeGenreArray[0]] || activeGenreArray[0]).replace(/^[^\s]+\s/, '');
        ratingBadgeHtml = `<span class="badge-top-rating-rank">🏆 Топ-1: ${gLabel}</span>`;
    } else if (topGlobalRank) {
        ratingBadgeHtml = `<span class="badge-top-rating-rank">🏆 Топ-${topGlobalRank} рейтинга</span>`;
    } else if (Array.isArray(item.top_genre_badges) && item.top_genre_badges.length > 0) {
        const firstKingTag = item.top_genre_badges[0];
        const shortTag = (READER_TAGS_DICTIONARY[firstKingTag] || firstKingTag).replace(/^[^\s]+\s/, '');
        ratingBadgeHtml = `<span class="badge-top-rating-rank">🏆 Топ-1: ${shortTag}</span>`;
    }

    // 4. Декор мягкой оранжевой сакуры (веточка + лепестки) для романтических тайтлов
    const sakuraDecorHtml = isRomance ? `
        <div class="sakura-frame-decor" aria-hidden="true">
            <svg class="sakura-branch-svg" viewBox="0 0 110 80">
                <path d="M110,0 Q75,18 42,12 Q22,8 6,22" fill="none" stroke="#8c4a27" stroke-width="2.4" stroke-linecap="round"/>
                <path d="M76,14 Q62,30 46,36" fill="none" stroke="#8c4a27" stroke-width="1.7" stroke-linecap="round"/>
                <circle cx="88" cy="11" r="6" fill="#ff9e7d"/>
                <circle cx="88" cy="11" r="2.2" fill="#ffe5d9"/>
                <circle cx="64" cy="16" r="6.8" fill="#ffb088"/>
                <circle cx="64" cy="16" r="2.5" fill="#fff0e6"/>
                <circle cx="48" cy="35" r="5.5" fill="#ff9470"/>
                <circle cx="28" cy="14" r="5.8" fill="#ffaa80"/>
                <circle cx="11" cy="21" r="4.8" fill="#ffc2a3"/>
            </svg>
            <span class="sakura-corner-petal p1">🌸</span>
            <span class="sakura-corner-petal p2">🌸</span>
            <span class="sakura-corner-petal p3">💮</span>
        </div>
    ` : '';

    // 5. Плашки Бесплатных и Платных глав (ровные и компактные для любых экранов)
    const freePillHtml = hasFree
        ? `<span class="stat-pill stat-free open-chapters-trigger" title="Нажми, чтобы выбрать бесплатные главы">🆓 Беспл: <b>${freeChCount} гл.</b></span>`
        : `<span class="stat-pill stat-no-free">🆓 Беспл: <b>0 гл.</b></span>`;

    const paidPillHtml = `<span class="stat-pill stat-paid" title="Платные главы по подписке">🔒 Платн: <b>${paidChCount} гл.</b></span>`;

    const typeLabel = CONTENT_TYPE_LABELS[item.content_type] || '🇰🇷 Манхва';
    const typeTagHtml = `<span class="card-type-tag" data-type="${item.content_type || 'manhwa'}" title="Фильтр по типу: ${typeLabel}">${typeLabel}</span>`;

    const miniTagsHtml = (item.genres || []).slice(0, 3).map(gKey => {
        const label = READER_TAGS_DICTIONARY[gKey] || gKey;
        const isTagActive = selectedGenres.has(gKey);
        return `<span class="card-mini-tag ${isTagActive ? 'active-mini-tag' : ''}" data-genre="${gKey}" title="Фильтр по тегу: ${label}">${label}</span>`;
    }).join('');

    const episodesCount = (Array.isArray(item.all_posts) && item.all_posts.length > 0)
        ? item.all_posts.length
        : Math.max(1, Number(item.posts_count) || 1);

    const watchBtnLabel = `🎬 На ролик с конкретными главами (${episodesCount} вып.)`;

    const imgLoadAttrs = isPriorityImage
        ? `fetchpriority="high" decoding="async"`
        : `loading="lazy" decoding="async"`;

    card.innerHTML = `
        ${sakuraDecorHtml}
        <a href="#select-chapters-${item.metric_tag}" class="card-link open-chapters-trigger" data-metric-tag="${item.metric_tag}">
            <img src="${item.image}" alt="${item.title}" ${imgLoadAttrs} referrerpolicy="no-referrer"
                 class="card-cover-img"
                 onload="this.classList.add('img-loaded')"
                 onerror="this.src='https://via.placeholder.com/400x550/241a14/ff6b00?text=ТАКА+Озвучка'; this.classList.add('img-loaded')">
            ${topLeftBadgeHtml}
            ${completedBadgeHtml}
            ${ratingBadgeHtml}
            <span class="chapters-floating-badge">${voicedCh > 0 ? `Озвучено: ${voicedCh} гл.` : 'В ленте'}</span>
            ${hasFree ? `<span class="badge-free-access">🆓 Бесплатно: ${freeChCount} гл.</span>` : ''}
            ${isHotWeekRelease ? `<span class="badge-hot-new">🔥 ${item.latest_range || 'НОВИНКА'}</span>` : ''}
        </a>
        <div class="card-info">
            <div>
                <a href="#select-chapters-${item.metric_tag}" class="card-title-link open-chapters-trigger" data-metric-tag="${item.metric_tag}">
                    <h3>${item.title}</h3>
                </a>
                <div class="card-tags-row">${typeTagHtml}${miniTagsHtml}</div>
            </div>

            <div class="card-bottom-wrap">
                <div class="chapters-breakdown">
                    ${freePillHtml}
                    ${paidPillHtml}
                </div>

                <div class="voiced-total-strip">
                    <span>🎙️ Озвучено всего: <b>${voicedCh} гл.</b></span>
                    <span class="rating-mini-pill" title="Место в общем рейтинге каталога">🏆 #${item.rating_rank || 1}</span>
                </div>

                <span class="tier-neutral-pill ${isLicense ? 'tier-pill-license' : ''}">${item.tier}</span>

                <div class="action-buttons-row">
                    <button type="button" class="watch-feed-link ${hasFree ? 'watch-free-emerald' : ''} open-chapters-trigger">
                        ${watchBtnLabel}
                    </button>
                </div>

                <div class="details">
                    <span>Обновлено: <b>${item.last_update}</b></span>
                    <div class="card-tools-btns">
                        <button type="button" class="share-title-btn" title="Скопировать прямую ссылку на этот тайтл">🔗</button>
                        <button type="button" class="report-broken-btn" title="Сообщить о неработающей ссылке">⚠️</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // При клике на карточку, заголовок или кнопку «На ролик с конкретными главами» открывается модальное окно выбора глав
    card.querySelectorAll('.open-chapters-trigger').forEach(el => {
        el.addEventListener('click', (e) => {
            openChaptersSelectModal(item, e);
        });
    });

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
    });

    const shareBtn = card.querySelector('.share-title-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
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
        reportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            trackGoal('report_broken_link', {
                title: item.title,
                metric_tag: item.metric_tag,
                level: item.tier_level
            });
            const text = encodeURIComponent(`⚠️ Привет! На витрине не работает ссылка у тайтла «${item.title}» (${item.link})`);
            window.open(`https://t.me/TAKA_YT?text=${text}`, '_blank');
        });
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
    const topThreeMap = getTopThreeRatingMap();
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

// ==========================================================================
// ВИДЖЕТ КОТИКА ТАКА (ОТКРЫВАЕТСЯ ТОЛЬКО СПУСТЯ 10 МИНУТ ИЛИ ПОСЛЕ ВЫБОРА ТАЙТЛА И ВОЗВРАТА НА САЙТ)
// ==========================================================================
let catWidgetSelectedTier = 1;
let catWidgetCurrentItem = null;
let catWidgetShownOnce = false;
let userSelectedTitleForReturn = null;

function markTitleSelectedForCatReturn(item) {
    if (!item) return;
    userSelectedTitleForReturn = item;
    updateCatWidgetContext(item, false);
}

function triggerCatWidgetPopupSafely() {
    if (catWidgetShownOnce) return;
    if (sessionStorage.getItem('taka_cat_widget_minimized') === '1') return;
    const widget = document.getElementById('catPromoWidget');
    if (!widget) return;
    catWidgetShownOnce = true;
    widget.classList.remove('minimized');
    widget.classList.add('open');
}

function initCatRecommendationWidget() {
    const widget = document.getElementById('catPromoWidget');
    if (!widget) return;

    const closeBtn = document.getElementById('catWidgetCloseBtn');
    const launcherBtn = document.getElementById('catWidgetLauncher');
    const subBtn = document.getElementById('catWidgetSubBtn');
    const tier1Btn = document.getElementById('catTierBtn1');
    const tier2Btn = document.getElementById('catTierBtn2');

    const topItem = [...allItems]
        .sort((a, b) => (b.rating_score || 0) - (a.rating_score || 0))[0] || null;

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

    // ПРАВИЛО 1: Просто так не вылезает! Таймер строго на 10 минут (600 000 мс) пребывания на сайте
    setTimeout(() => {
        triggerCatWidgetPopupSafely();
    }, 10 * 60 * 1000);

    // ПРАВИЛО 2: Или появляется после того, как человек выбрал определённый тайтл и вернулся обратно на вкладку/к каталогу
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && userSelectedTitleForReturn) {
            setTimeout(() => triggerCatWidgetPopupSafely(), 600);
        }
    });

    window.addEventListener('focus', () => {
        if (userSelectedTitleForReturn) {
            setTimeout(() => triggerCatWidgetPopupSafely(), 600);
        }
    });
}

function updateCatWidgetContext(item, autoOpen = false) {
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

    const leftSubs = liveGoalStats.left || Math.max(1, (liveGoalStats.target || 200) - (liveGoalStats.current || 173));

    if (msgEl) {
        const chInfo = item.chapters > 0 ? `все ${item.chapters} гл.` : 'все закрытые серии';
        if (item.tier_level === 2) {
            msgEl.innerHTML = `Мяу... 🥺 Смотришь <b>«${item.title}»</b>? До цели в 200 подписчиков не хватает всего <b>${leftSubs} чел.</b>! Оформи 2 уровень — откроешь ${chInfo} и очень выручишь автора с покупкой глав!`;
        } else {
            msgEl.innerHTML = `Мяу... 🥺 Понравился <b>«${item.title}»</b>? Нам осталось всего <b>${leftSubs} подп.</b> до цели 200, чтобы я мог спокойно выкупать главы! Открой ${chInfo} всего за ~8 ₽ в день 🐾`;
        }
    }

    syncCatWidgetButtons();

    if (autoOpen) {
        triggerCatWidgetPopupSafely();
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
        if (perkEl) perkEl.textContent = '🧡 Доступ ко всей базовой библиотеке озвучки (715+ видео)';
    }
}

// ==========================================================================
// РАЗОВОЕ ИНТЕРАКТИВНОЕ ОБУЧЕНИЕ КОТИКОМ ТАКА (ПО IP + FINGERPRINT + COOKIE + LOCALSTORAGE)
// ==========================================================================
const CAT_TUTORIAL_STEPS = [
    {
        targetId: 'tutorialStepSocials',
        title: '1/4 • Следи за мной в соцсетях и Telegram! 🐾',
        desc: 'Здесь находятся мой официальный блог Boosty, YouTube, группа ВК и кнопка «ТГ-Канал» — нажми на неё в любой момент, чтобы посмотреть свежие новости и подписаться!'
    },
    {
        targetId: 'tutorialStepSubscriptions',
        title: '2/4 • Уровни подписки и мгновенный доступ 👑',
        desc: '1 уровень (250 ₽/мес) открывает базовую библиотеку, а 2 уровень (500 ₽/мес) — вообще ВСЕ тайтлы, эксклюзивные Лицензии и закрытый ТГ-чат. Нажми «?», если нужна помощь с оплатой из другой страны.'
    },
    {
        targetId: 'tutorialStepHighlights',
        title: '3/4 • Новые главы недели и Новинки месяца 🔥',
        desc: 'В этой ленте всегда лежат самые свежие серии, вышедшие за последние 7 дней, и новые тайтлы месяца с 1-й главы — клик сразу перенесёт тебя к нужному ролику!'
    },
    {
        targetId: 'tutorialStepFilters',
        title: '4/4 • Умный поиск, Топ рейтинга и выбор глав 🎬',
        desc: 'Ищи тайтлы по названию или тегам, выбирай уровень подписки и сортируй по «🏆 Самые Топ рейтинга». А при нажатии на любую карточку откроется удобное окно выбора конкретных глав!'
    }
];

let currentTutorialStepIdx = 0;
let detectedClientIpHash = 'ip_default';

function hasCompletedCatTutorial(ipHash) {
    try {
        if (localStorage.getItem(TUTORIAL_DONE_STORAGE_KEY) === '1') return true;
        if (getCookie(TUTORIAL_DONE_STORAGE_KEY) === '1') return true;
        if (ipHash && localStorage.getItem(`${TUTORIAL_DONE_STORAGE_KEY}_${ipHash}`) === '1') return true;
    } catch (e) {}
    return false;
}

function markCatTutorialCompleted() {
    try {
        localStorage.setItem(TUTORIAL_DONE_STORAGE_KEY, '1');
        if (detectedClientIpHash) {
            localStorage.setItem(`${TUTORIAL_DONE_STORAGE_KEY}_${detectedClientIpHash}`, '1');
        }
    } catch (e) {}
    setCookie(TUTORIAL_DONE_STORAGE_KEY, '1', 365);
}

function clearTutorialSpotlights() {
    document.querySelectorAll('.tutorial-spotlight-active').forEach(el => {
        el.classList.remove('tutorial-spotlight-active');
    });
}

function renderCatTutorialStep(stepIdx) {
    const overlay = document.getElementById('catTutorialOverlay');
    const badgeEl = document.getElementById('catTutStepBadge');
    const titleEl = document.getElementById('catTutTitle');
    const descEl = document.getElementById('catTutDesc');
    const dotsEl = document.getElementById('catTutDots');
    const prevBtn = document.getElementById('catTutPrevBtn');
    const nextBtn = document.getElementById('catTutNextBtn');

    if (!overlay) return;

    clearTutorialSpotlights();
    const step = CAT_TUTORIAL_STEPS[stepIdx];
    if (!step) {
        closeCatTutorial();
        return;
    }

    if (badgeEl) badgeEl.textContent = `Шаг ${stepIdx + 1} из ${CAT_TUTORIAL_STEPS.length}`;
    if (titleEl) titleEl.textContent = step.title;
    if (descEl) descEl.textContent = step.desc;

    if (dotsEl) {
        dotsEl.innerHTML = CAT_TUTORIAL_STEPS.map((_, idx) =>
            `<span class="tut-dot ${idx === stepIdx ? 'active' : ''}"></span>`
        ).join('');
    }

    if (prevBtn) prevBtn.style.display = stepIdx > 0 ? 'inline-block' : 'none';
    if (nextBtn) {
        nextBtn.textContent = stepIdx === CAT_TUTORIAL_STEPS.length - 1 ? 'Понятно, к тайтлам! 🐾' : 'Дальше →';
    }

    const targetEl = document.getElementById(step.targetId);
    if (targetEl && targetEl.offsetParent !== null) {
        targetEl.classList.add('tutorial-spotlight-active');
        try {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {}
    }
}

function startCatTutorial(force = false) {
    if (!force && hasCompletedCatTutorial(detectedClientIpHash)) return;
    const overlay = document.getElementById('catTutorialOverlay');
    if (!overlay) return;

    currentTutorialStepIdx = 0;
    overlay.style.display = 'block';
    overlay.setAttribute('aria-hidden', 'false');
    renderCatTutorialStep(0);
}

function closeCatTutorial() {
    clearTutorialSpotlights();
    markCatTutorialCompleted();
    const overlay = document.getElementById('catTutorialOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }
}

function initCatTutorialSystem() {
    const startBtn = document.getElementById('startCatTutorialBtn');
    const skipBtn = document.getElementById('catTutSkipBtn');
    const backdrop = document.getElementById('catTutorialBackdrop');
    const prevBtn = document.getElementById('catTutPrevBtn');
    const nextBtn = document.getElementById('catTutNextBtn');

    if (startBtn) {
        startBtn.addEventListener('click', () => startCatTutorial(true));
    }
    if (skipBtn) {
        skipBtn.addEventListener('click', closeCatTutorial);
    }
    if (backdrop) {
        backdrop.addEventListener('click', closeCatTutorial);
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentTutorialStepIdx > 0) {
                currentTutorialStepIdx -= 1;
                renderCatTutorialStep(currentTutorialStepIdx);
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentTutorialStepIdx < CAT_TUTORIAL_STEPS.length - 1) {
                currentTutorialStepIdx += 1;
                renderCatTutorialStep(currentTutorialStepIdx);
            } else {
                closeCatTutorial();
            }
        });
    }

    // Если обучение уже пройдено в браузере — не беспокоим пользователя
    if (hasCompletedCatTutorial(null)) return;

    // Проверяем IP + Fingerprint, чтобы показать обучение ровно 1 раз
    fetch('https://api.country.is/')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
            if (d && d.ip) {
                let hash = 0;
                const ipStr = String(d.ip);
                for (let i = 0; i < ipStr.length; i++) {
                    hash = ((hash << 5) - hash) + ipStr.charCodeAt(i);
                    hash |= 0;
                }
                detectedClientIpHash = 'ip_' + Math.abs(hash).toString(36);
            }
        })
        .catch(() => {})
        .finally(() => {
            if (!hasCompletedCatTutorial(detectedClientIpHash)) {
                setTimeout(() => startCatTutorial(false), 1800);
            }
        });
}
