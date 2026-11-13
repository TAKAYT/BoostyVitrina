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
    'User-Agent': 'TakaCatalogSyncBot/6.0 (+https://github.com/darktaka; API-Sync; Bot; NoTrack)',
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

# Группы синонимов и альтернативных названий тайтлов (СТРОГО РАЗДЕЛЕНЫ похожие тайтлы!)
TITLE_SYNONYM_GROUPS = [
    ["некромант я катастрофа", "ням", "ням (некромант)", "ням некромант", "катастрофический некромант", "некромант - я катастрофа"],
    ["некромант катастрофа решил уйти на пенсию", "некромант-катастрофа решил уйти на пенсию"],
    ["паладин sss ранга", "паладин sss ранга главы", "пsss", "psss", "паладин превосходящий здравый смысл"],
    [
        "всеобщий отбор укротитель драконов в самом деле самый слабый класс",
        "всеобщий отбор я укротитель драконов",
        "всеообщий отбор я укротиетль драконов",
        "воудр (дракончик)",
        "воудр дракончик",
        "воудр",
        "дракончик",
        "укротитель драконов в самом деле самый слабый класс"
    ],
    ["всеобщий отбор мечник в самом деле слабейший класс"],
    ["всеобщий отбор я сам выбираю награды"],
    ["некромант максимального уровня", "некромант макс lvl", "некромант макс лвл"],
    ["мастер древних божественных орудий", "мастер божественных орудий древней эпохи"],
    ["я перевоплотился в могущественного дракона для сокрушения мира", "я стал драконом в прошлом"],
    ["я проснулся имбой после 100 лет afk", "я проснулся имбой после 100 лет афк", "я прсонулся имбой после 100 лет afk"],
    ["начало после конца", "кнчн"],
    ["от гоблина к богу гоблинов", "к богу гоблинов", "от гоблина до бога гоблинов"],
    ["реинкарнация в начало апокалипсиса", "в начало до зомби апокалипсиса", "в начало до зомби-апокалипсиса"],
    ["я вернулся в начало зомби апокалипсиса"],
    ["зомби апокалипсис 82 08", "зомби-апокалипсис 82-08"],
    ["я стал графским ублюдком", "я стал ублюдком сильнейшего графства", "отброс графской семьи"],
    ["прокачка в аду", "прокачка в аду в одиночку"],
    ["повелитель насекомых", "король насекомых"],
    ["цивилизация мудрецов", "деревня под наблюдением бога"],
    ["перерождение демонического культиватора", "перерождение демонического культиватора в мире зомби", "возрождение демонического культиватора в мире зомби апокалипсиса", "перерождение в демонического культиватора в мире зомби"],
    ["призыватель sss ранга", "призыватель 3s ранга"],
    ["возрождение династии тан", "моя жена из династии тан", "династия тан", "династии тан"],
    ["божественный убийца я тень", "тени", "тень", "мир теней", "система теней", "божественый убийца я тень"],
    ["дитя дурных кровей", "дитя дурной крови", "дитя дурной крови предков", "дурная кровь", "дурная кровь предков"],
    ["меня обезглавил призрак и я переродился но потом какая то девушка начала делать со мной всякое", "меня обезглавила девушка призрак и я переродился но потом какая то девушка начала делать со мной всякое", "меня обезглавила девушка и я переродился но потом какая то девушка начала делать со мной всякое"],
    ["безумный призыв во время апокалипсиса", "безумный прорыв во время апокалипсиса"],
    ["стример попал в прошлое", "реинкарнация стримера"],
    ["обретя силу я стану сильнее нет предела тому что я могу сделать", "обретя силу я стану непобедимым нет предела тому что я могу сделать"],
    ["мой контрактный зверь китайская пастушья собака", "мой контрактный зверь китайская пастушья собачка"],
    ["возрождение в постапокалипсисе я достиг вершины благодаря открытию лутбоксов", "возрождение в постапокалипсисе я достиг вершины с помощью лутбоксов"],
    ["становление сильнейшим авантюристом с навыками управления гравитацией", "ставновление сильнейшим авантюристом с навыками управления гравитацией"],
    ["я строю промышленную империю на волшебном континенте", "я строю промышленную академию на континенте"],
    ["битва тысячи рас я укрощу всех чудовищ"],
    ["битва тысячи рас страж оставшийся в тылу"],
    ["повелитель тьмы"],
    ["я повелитель тьмы тот кто создал подземелья"]
]

CYR_TO_LAT = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
}

DEFAULT_TYPE_OVERRIDES = {
    "Божественный убийца, Я-тень": "manhua",
    "Всеобщий отбор: укротитель драконов в самом деле самый слабый класс?": "manhua",
    "От гоблина к Богу гоблинов": "manhua",
    "Моя девушка-дракон вернулась": "manhwa",
    "Ошибка: Эхо": "manhwa",
    "Некромант-транжира": "manhwa",
    "Некромант я катастрофа": "manhua",
    "Дитя Дурной Крови Предков": "manhwa",
    "Адский логин": "manhwa",
    "Офисный работник в ледниковом периоде": "manhwa",
    "Великий расхититель гробниц": "manhwa",
    "Моя жена из династии Тан": "manhua",
    "Повелитель тьмы": "manhwa",
    "Путь истребителя демонов": "manhwa",
    "Судный день я король вирусов": "manhua",
    "Я прокачиваюсь во сне убивая монстров": "manhua",
    "Меня обезглавил призрак и я переродился, но потом какая-то девушка начала делать со мной всякое...": "manhua",
    "Я стал ублюдком сильнейшего графства": "manhwa",
    "Я стал непобедимым ради сестры": "manhua",
    "Абсолютное оружие возвращается спустя 100 миллионов лет": "manga",
    "Я приютил повелительницу кровавого моря": "manhua",
    "Я Запасаюсь Припасами в Замороженном Мире": "manhua",
    "Становление сильнейшим авантюристом с навыками управления гравитацией": "manga",
    "После перерождения я использовал зеркальное отражение, чтобы отомстить": "manhua",
    "Паладин SSS ранга": "manhua",
    "Перерождение: Повелитель мёртвых": "manhwa",
    "Реинкарнация Наследника": "manhua",
    "Я убил бога с помощью мифического таланта": "manhua",
    "Вторжение Зверей: Я вижу пути эволюции!": "manhua",
    "После разрыва отношений все мои призванные звери стали темными существами": "manhua",
    "Ледяной судный день: выжить невозможно": "manhua",
    "Восхождение: Я покорил 999 этажей раньше остальных!": "manhua",
    "Страж Десяти Тысяч миров": "manhua",
    "Мастер Синтеза начинает с Армией Нежити": "manhua",
    "Всемирный ужас: я открыл рынок читов": "manhua",
    "Призывающий демонов Повелитель Бездны": "manhua",
    "Всеобщий отбор: мечник в самом деле слабейший класс?": "manhua",
    "Всеобщий отбор: я сам выбираю награды!": "manhua",
    "Эволюция некроманта: Мой аватар — скелет": "manhua",
    "Путь удивительного небожителя": "manhua",
    "Владыка Колеса Судьбы": "manhua",
    "Я стал злодеем в новелле": "manhua",
    "Сильнейший убийца перемещается в другой мир вместе с классом": "manga",
    "Открытие трансфера к Богу удачи и приручение миллиардов божественных питомцев!": "manhua",
    "Владыка Призыва Спасает Мир!": "manhua",
    "Убить бога": "manhua",
    "Злой Бог сошёл. У меня есть великая тюрьма зла": "manhua",
    "Постоянное пробуждение": "manhua",
    "Я - Повелитель тьмы, тот, кто создал подземелья!": "manga",
    "Битва тысячи рас: Я укрощу всех чудовищ": "manhua",
    "Сто тысяч лет заточения от Небесного Грома": "manhua",
    "Я вернулся в начало зомби апокалипсиса": "manga",
    "В начало до зомби-апокалипсиса": "manhua",
    "Королева Демонов заставила меня загадать желание": "manhua",
    "Я больше не герой": "manhwa",
    "Контрабандист Апокалипсиса": "manhua",
    "Владыка Мертвых": "manhua",
    "Игра гениального кузнеца": "manhwa",
    "Стример попал в прошлое": "manhwa",
    "Фермер, выращивающий нежить": "manhua",
    "Все эти 30 лет были прологом": "manhwa",
    "Реинкарнация Спецназа": "manhua",
    "Я оказался на вершине культивации после перерождения": "manhua",
    "Я переродился слизью в другом мире": "manhua",
    "Обретя силу, я стану сильнее. Нет предела тому, что я могу сделать": "manhua",
    "Я строю промышленную империю на волшебном континенте": "manhua",
    "Я Завоевал Весь Мир со Своим Гаремом": "manhua",
    "Злой алхимик не может справиться со своим экспериментом": "manhua",
    "Начало после конца": "manga",
    "Я получил способность красть навыки противников": "manga",
    "Возвращение демонического инструктора": "manhwa",
    "Я регрессировал, но миру не настал конец": "manhwa",
    "Одной рукой я уничтожил армии трёх тысяч миров": "manhua",
    "Нуб максимального уровня": "manhwa",
    "Мастер укрощения": "manhwa",
    "Возрождение в постапокалипсисе: я достиг вершины благодаря открытию лутбоксов": "manhua",
    "Моё перерождение в детёныша дракона": "manhwa",
    "Святой, повышающий уровень, как некромант": "manhwa",
    "Покорение академии с ножом для сашими": "manhwa",
    "Возвращение гения боевых искусств": "manhwa",
    "Доминирование нулевого уровня с аналитическими навыками": "manga",
    "Выживание на необитаемом острове с красавицей": "manhua",
    "Глобальная Смена Профессий": "manhua",
    "Охотник SSS-уровня": "manhwa",
    "Возвращение железно кровной гончей": "manhwa",
    "Убейте меня еще несколько раз, и я стану непобедимым": "manga",
    "Безумный призыв во время Апокалипсиса": "manhua",
    "Стал сторонником злодеев": "manhwa",
    "Герой X Королева демонов": "manhua",
    "Я обрел бессмертие в другом мире": "manhua",
    "Спасение мира Повелителем Крови": "manga",
    "Я стал королем, собирая мусор": "manhua",
    "Я приручаю зверо-девушек!": "manhua",
    "Я принял облик бога-демона и превратился в гигантского зверя разрушения!": "manhua",
    "Новое начало героя в академии": "manga",
    "Господство над Пустошью: я властвую в мире небожителей во время апокалипсиса": "manhua",
    "Бесконечная эволюция с нуля": "manhua",
    "Регрессия авантюриста S-ранга": "manga",
    "Я не злодей": "manhua",
    "Пожиратель": "manhua",
    "Я могу копировать способности других!": "manhua",
    "Глобальные сверхдержавы: пробуждение пурпурного грома в начале": "manhua",
    "Бог Меча в разрушенном мире": "manhua",
    "Я был сильнее героя, поэтому скрыл свою силу!": "manhwa",
    "Деревня под наблюдением Бога": "manhwa",
    "Маг песка из опалённой пустыни": "manhwa",
    "Я стал величайшим злодеем в игре": "manhua",
    "Я самый сильный БОСС": "manhua",
    "Пастух-волшебник": "manhwa",
    "Реинкарнация гоблина SSS ранга": "manga",
    "Конец Света. Я Повелеваю Зомби!": "manhua",
    "Возрождение ужаса: я начал с триллиона призрачных монет": "manhua",
    "Битва тысячи рас: Страж, оставшийся в тылу": "manhua",
    "Регрессия Тёмного Мага": "manga",
    "Магическая теория Святого Меча": "manga",
    "Истребление игроков: Начало аномалии": "manhua",
    "Прокачка с нуля в обратном мире": "manhua",
    "Система настоящего бунтаря": "manhua",
    "Я стал ублюдком в муриме": "manhwa",
    "Разрушитель обороны": "manhwa",
    "Ад, что я открыл": "manhua",
    "Призыватель 3S Ранга": "manhua",
    "Призванный в параллельные фэнтези миры несколько раз": "manga",
    "Возвышение от Монстра до Бога": "manhua",
    "Возвращение мечника-драконоборца": "manga",
    "Я охотник EX-Ранга": "manga",
    "Игрок скрывает прошлое": "manhwa",
    "Бешеный пес герцогского дома": "manhwa",
    "Адвокат с карманным измерением": "manhwa",
    "Владыка Льда": "manhwa",
    "Инструкция по перерождению": "manhwa",
    "Некромант-катастрофа решил уйти на пенсию": "manhwa",
    "Прокачка в аду в одиночку": "manhwa",
    "Я заключил контракт с самим собой": "manhua",
    "Возвращение волшебника из подворотни": "manhwa",
    "Переродился в змею которая детёныш дракона": "manhua",
    "Перерождение Демонического культиватора в мире зомби": "manhua",
    "Злодей хочет жить": "manhwa",
    "Гоблин 999 уровня": "manhwa",
    "Гениальный маг, преодолевающий лимиты возможностей": "manhwa",
    "Игрок, который ест артефакты": "manhwa",
    "Дьявол возвращается в школьные годы": "manhwa",
    "Некромант максимального уровня": "manhua",
    "Поднятие уровня в одиночку: Рагнарёк": "manhwa",
    "Запретная реинкарнация архимага - от неумелого до сильнейшего путем повышения уровня": "manga",
    "Донат сделал меня королём": "manhua",
    "Я Перевоплотился в Могущественного Дракона для Сокрушения Мира!": "manhua",
    "Мастер древних божественных орудий": "manhua",
    "Король Насекомых": "manhua",
    "Я проснулся имбой после 100 лет AFK": "manhua",
    "Бессмертный учитель императриц девушек": "manhua",
    "Последний авантюрист": "manhwa",
    "Зомби-апокалипсис 82-08": "manhwa",
    "Система всемогущего дизайнера": "manhwa",
    "Герой на прокат": "manhwa",
    "Император Боевых Искусств": "manhwa",
    "День за днём": "manhwa",
    "Прирождённый наёмник": "manhwa",
    "Подпишитесь на канал Ранкера": "manhwa",
    "Игрок, поедающий сталь": "manhwa",
    "Фермерство в башне в одиночку": "manhwa",
    "Этот воин слишком щедр": "manhua",
    "Возрождение городского бессмертного": "manhua",
    "Мой контрактный зверь - китайская пастушья собака": "manhua"
}

DEFAULT_SPECIAL_TITLES = {
    "_comment": "Управление особыми рамками и статусами тайтлов. Правила авто-проверки: тайтл может быть одновременно в romance_sakura и completed_titles (двойная рамка Сакура + Огонь финала). Если тайтл случайно указан и в frozen_titles, и в completed_titles, приоритет отдаётся completed_titles.",
    "romance_sakura": [
        "Моя жена из династии Тан",
        "День за днём",
        "Герой X Королева демонов",
        "Моя девушка-дракон вернулась",
        "Королева Демонов заставила меня загадать желание",
        "Меня обезглавил призрак и я переродился, но потом какая-то девушка начала делать со мной всякое..."
    ],
    "frozen_titles": [
        "Я Завоевал Весь Мир со Своим Гаремом",
        "Убейте меня еще несколько раз, и я стану непобедимым",
        "Обретя силу, я стану сильнее. Нет предела тому, что я могу сделать",
        "Я не злодей",
        "Безумный призыв во время Апокалипсиса",
        "Безумный прорыв во время апокалипсиса",
        "Мой контрактный зверь - китайская пастушья собака",
        "Возрождение городского бессмертного",
        "Мастер древних божественных орудий"
    ],
    "completed_titles": [
        "Прокачка в аду в одиночку",
        "Новое начало героя в академии",
        "Регрессия Тёмного Мага",
        "Господство над Пустошью: я властвую в мире небожителей во время апокалипсиса",
        "Реинкарнация гоблина SSS ранга",
        "Регрессия авантюриста S-ранга",
        "День за днём",
        "Я самый сильный БОСС",
        "Битва тысячи рас: Страж, оставшийся в тылу",
        "Спасение мира Повелителем Крови",
        "Я стал королем, собирая мусор",
        "Возвышение от Монстра до Бога",
        "Я стал величайшим злодеем в игре",
        "Меня обезглавил призрак и я переродился, но потом какая-то девушка начала делать со мной всякое...",
        "Я могу копировать способности других!",
        "Возрождение в постапокалипсисе: я достиг вершины благодаря открытию лутбоксов"
    ],
    "hidden_tags_overrides": {
        "День за днём": ["романтика", "повседневность", "драма", "отношения"],
        "Моя жена из династии Тан": ["романтика", "гарем", "история", "империя", "богатство"],
        "Моя девушка-дракон вернулась": ["романтика", "драконы", "школа", "повседневность", "комедия"],
        "Герой X Королева демонов": ["романтика", "комедия", "магия", "владыка демонов", "герой"],
        "Королева Демонов заставила меня загадать желание": ["романтика", "комедия", "система", "магия"],
        "Меня обезглавил призрак и я переродился, но потом какая-то девушка начала делать со мной всякое...": ["романтика", "призраки", "мистика", "комедия", "перерождение"]
    }
}

PRIMARY_VISIBLE_TAGS = {
    "некромантия", "система", "имба", "регрессия", "перерождение",
    "подземелья", "драконы", "призыв", "апокалипсис", "культивация",
    "фэнтези", "демоны", "месть", "артефакты", "романтика"
}

RU_EN_TAG_MAPPING = {
    "некромантия": "некромантия", "некромант": "некромантия", "нежить": "некромантия", "necromancy": "некромантия", "necromancer": "некромантия",
    "система": "система", "игровые элементы": "система", "литрпг": "система", "прокачка": "система", "рост уровня": "система", "system": "система", "leveling": "система", "video games": "система",
    "скрытые способности": "имба", "имба": "имба", "гг имба": "имба", "сильный гг": "имба", "могущественный гг": "имба", "непобедимый гг": "имба", "герой-одиночка": "имба", "overpowered": "имба",
    "регрессия": "регрессия", "возвращение в прошлое": "регрессия", "путешествие во времени": "регрессия", "петля времени": "регрессия", "regression": "регрессия", "time travel": "регрессия", "time manipulation": "регрессия",
    "реинкарнация": "перерождение", "перерождение": "перерождение", "исекай": "перерождение", "попаданец": "перерождение", "попадание в другой мир": "перерождение", "перемещение в другой мир": "перерождение", "reincarnation": "перерождение", "isekai": "перерождение",
    "подземелья": "подземелья", "данжи": "подземелья", "башня": "подземелья", "охотники": "подземелья", "врата": "подземелья", "dungeon": "подземелья", "dungeons": "подземелья",
    "драконы": "драконы", "дракон": "драконы", "dragons": "драконы",
    "призыв": "призыв", "призыватель": "призыв", "питомцы": "призыв", "укрощение": "призыв", "монстры": "призыв", "звери": "призыв", "гоблины": "призыв", "summoning": "призыв", "monsters": "призыв", "tamer": "призыв",
    "апокалипсис": "апокалипсис", "постапокалипсис": "апокалипсис", "зомби": "апокалипсис", "выживание": "апокалипсис", "apocalypse": "апокалипсис", "post-apocalyptic": "апокалипсис", "zombies": "апокалипсис", "survival": "апокалипсис",
    "культивация": "культивация", "боевые искусства": "культивация", "мурим": "культивация", "сянься": "культивация", "уся": "культивация", "дао": "культивация", "cultivation": "культивация", "martial arts": "культивация", "wuxia": "культивация", "xianxia": "культивация",
    "демоны": "демоны", "боги": "демоны", "ангелы и демоны": "демоны", "владыка демонов": "демоны", "demons": "демоны", "gods": "демоны",
    "месть": "месть", "антигерой": "месть", "жестокий мир": "месть", "злодей": "месть", "revenge": "месть", "anti-hero": "месть", "villain": "месть",
    "артефакты": "артефакты", "алхимия": "артефакты", "кузнечное дело": "артефакты", "оружие": "артефакты", "мечник": "артефакты", "alchemy": "артефакты", "blacksmith": "артефакты", "swordplay": "артефакты",
    "фэнтези": "фэнтези", "магия": "фэнтези", "рыцари": "фэнтези", "эльфы": "фэнтези", "средневековье": "фэнтези", "аристократия": "фэнтези", "fantasy": "фэнтези", "magic": "фэнтези",
    "романтика": "романтика", "любовь": "романтика", "отношения": "романтика", "romance": "романтика",
    "гарем": "гарем", "harem": "гарем",
    "комедия": "комедия", "юмор": "комедия", "comedy": "комедия",
    "боевик": "экшен", "экшен": "экшен", "экшн": "экшен", "action": "экшен",
    "приключения": "приключения", "adventure": "приключения",
    "драма": "драма", "drama": "драма",
    "школа": "школа", "академия": "академия", "school": "школа", "school life": "школа",
    "повседневность": "повседневность", "slice of life": "повседневность",
    "триллер": "триллер", "ужасы": "хоррор", "хоррор": "хоррор", "мистика": "мистика", "thriller": "триллер", "horror": "хоррор", "mystery": "мистика", "supernatural": "сверхъестественное",
    "сверхъестественное": "сверхъестественное", "психология": "психология", "psychological": "психология",
    "фантастика": "фантастика", "научная фантастика": "фантастика", "sci-fi": "фантастика",
    "история": "история", "исторический": "история", "historical": "история",
    "империя": "империя", "политика": "империя", "управление территорией": "империя", "строительство": "империя",
    "умный гг": "умный гг", "гений": "умный гг", "стратегия": "умный гг",
    "скрытая личность": "скрытая сила", "скрытая сила": "скрытая сила",
    "эволюция": "эволюция", "монстр гг": "монстр гг", "нечеловеческий гг": "монстр гг"
}

STRICT_SINGLE_TAG_PATTERNS = [
    ("некромантия", re.compile(r'(?:^|[^а-яa-z0-9])(некромант[а-я]*|скелет[а-я]*|нежит[а-я]*|мертвец[а-я]*|мёртв[а-я]*|мертв[а-я]*|лич(?:а|ем|и|ей)?|кладбищ[а-я]*|кост(?:ей|и|яной))(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
    ("система", re.compile(r'(?:^|[^а-яa-z0-9])(систем[а-я]*|уров(?:ень|ня|ней|нем)|лвл|lvl|sss|3s|s-ранг[а-я]*|f-ранг[а-я]*|ex-ранг[а-я]*|ранг(?:а|ов|у)?|ранкер[а-я]*|квест[а-я]*|прокачк[а-я]*|прокачива[а-я]*|игрок[а-я]*|навык[а-я]*|талант[а-я]*|очков|статус[а-я]*|логин|лутбокс[а-я]*|чит(?:ов|ы)?|нуб)(?=$|[^а-яa-z0-9])', re.IGNORECASE)),
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

CANDIDATE_MISSING_TITLES = [
    "Поднятие уровня в одиночку", "Башня Бога", "Всеведущий читатель",
    "Легенда о Северном Клинке", "Наномашины", "Возвращение героя класса катастрофы",
    "Лукизм", "Милый дом", "Ублюдок FFF-ранга",
    "Игрок который вернулся спустя 10000 лет", "Меч императора",
    "Звездный предок", "Пик боевых искусств", "Сказания о демонах и богах",
    "Боевой континент", "Расколотая битвой синева небес", "Восставший против неба",
    "Аватар короля", "Маг на полную ставку", "Квест превосходства",
    "Борьба в прямом эфире", "Менеджер Ким", "Пожиратель талантов",
    "Охотник S-класса", "Убийца гоблинов", "Ванпанчмен",
    "Магическая битва", "Человек-бензопила", "Берсерк", "Черный клевер"
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
            return normalize_for_match(group[0])
    # Второй проход: только если длина синонима почти равна длине названия (чтобы "некромант я катастрофа" никогда не поглощал "некромант катастрофа решил уйти на пенсию")
    for group in TITLE_SYNONYM_GROUPS:
        norm_group = [normalize_for_match(x) for x in group if x]
        for syn in norm_group:
            if len(syn) > 6 and abs(len(norm_t) - len(syn)) <= 5 and (norm_t.startswith(syn) or syn.startswith(norm_t)):
                return normalize_for_match(group[0])
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


# --- ЗАГРУЗКА И СОХРАНЕНИЕ TYPE_OVERRIDES.JSON (100% ПРИОРИТЕТ) ---
def load_and_sync_type_overrides():
    overrides = dict(DEFAULT_TYPE_OVERRIDES)
    if os.path.exists(TYPE_OVERRIDES_FILE):
        try:
            with open(TYPE_OVERRIDES_FILE, 'r', encoding='utf-8') as f:
                user_data = json.load(f)
                if isinstance(user_data, dict):
                    for k, v in user_data.items():
                        if k == "_comment":
                            continue
                        if isinstance(v, str) and v.strip():
                            overrides[k] = v.strip().lower()
                        elif k not in overrides:
                            overrides[k] = ""
        except Exception as e:
            print(f"Ошибка чтения {TYPE_OVERRIDES_FILE}: {e}")
    return overrides


def save_type_overrides(overrides_dict):
    ordered = {"_comment": "Справочник 100% приоритета типа тайтла (manhwa, manhua, manga). Новые тайтлы добавляются сюда автоматически с пустой строкой — впиши нужный тип вручную."}
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
    canon_target = resolve_canonical_title(clean_title)

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
        canon_k = resolve_canonical_title(raw_k)
        if (
            raw_k.strip().lower() == clean_title.strip().lower()
            or norm_k == norm_target
            or canon_k == canon_target
            or (len(norm_k) > 6 and abs(len(norm_k) - len(norm_target)) <= 6 and (norm_k in norm_target or norm_target in norm_k))
        ):
            if not overrides_dict.get(clean_title):
                overrides_dict[clean_title] = mapped_val
            return mapped_val

    return None


# --- ЗАГРУЗКА И АВТО-ПРОВЕРКА SPECIAL_TITLES.JSON ---
def load_and_validate_special_titles():
    spec = dict(DEFAULT_SPECIAL_TITLES)
    if os.path.exists(SPECIAL_TITLES_FILE):
        try:
            with open(SPECIAL_TITLES_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    for key in ("romance_sakura", "frozen_titles", "completed_titles", "hidden_tags_overrides"):
                        if key in loaded:
                            spec[key] = loaded[key]
        except Exception as e:
            print(f"Ошибка чтения {SPECIAL_TITLES_FILE}: {e}")
    else:
        with open(SPECIAL_TITLES_FILE, 'w', encoding='utf-8') as f:
            json.dump(spec, f, ensure_ascii=False, indent=2)

    romance_norms = {resolve_canonical_title(x) for x in spec.get("romance_sakura", []) if x}
    romance_norms.update({normalize_for_match(x) for x in spec.get("romance_sakura", []) if x})

    frozen_norms = {resolve_canonical_title(x) for x in spec.get("frozen_titles", []) if x}
    frozen_norms.update({normalize_for_match(x) for x in spec.get("frozen_titles", []) if x})

    completed_norms = {resolve_canonical_title(x) for x in spec.get("completed_titles", []) if x}
    completed_norms.update({normalize_for_match(x) for x in spec.get("completed_titles", []) if x})

    conflicts_frozen_completed = frozen_norms.intersection(completed_norms)
    if conflicts_frozen_completed:
        frozen_norms -= conflicts_frozen_completed

    hidden_overrides_norm = {}
    for k, tags_list in (spec.get("hidden_tags_overrides") or {}).items():
        if isinstance(tags_list, list):
            hidden_overrides_norm[normalize_for_match(k)] = [str(t).lower().strip() for t in tags_list if t]
            hidden_overrides_norm[resolve_canonical_title(k)] = [str(t).lower().strip() for t in tags_list if t]

    return romance_norms, frozen_norms, completed_norms, hidden_overrides_norm


def match_title_in_norm_set(clean_title, norm_set):
    norm_t = normalize_for_match(clean_title)
    canon_t = resolve_canonical_title(clean_title)
    if norm_t in norm_set or canon_t in norm_set:
        return True
    for entry in norm_set:
        if len(entry) > 6 and abs(len(entry) - len(norm_t)) <= 8 and (entry in norm_t or norm_t in entry):
            return True
    return False


# --- СЕРВЕРНОЕ ОПРЕДЕЛЕНИЕ ТИПА И КОНСЕНСУС ТЕГОВ ---
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
            return None, [], ""

        norm_q = normalize_for_match(search_title)
        q_stems = [stem_russian_word(w) for w in norm_q.split() if len(w) >= 3]
        best_item = None
        best_score = -1

        for idx, cand in enumerate(content_list):
            if not isinstance(cand, dict):
                continue
            rus_n = normalize_for_match(cand.get('rus_name') or '')
            main_n = normalize_for_match(cand.get('main_name') or '')
            en_n = normalize_for_match(cand.get('en_name') or '')
            combined = f"{rus_n} {main_n} {en_n}".strip()
            cand_stems = [stem_russian_word(w) for w in combined.split() if len(w) >= 3]

            if rus_n == norm_q or main_n == norm_q:
                best_item = cand
                break
            matched_stems = sum(1 for st in q_stems if any(st in cs or cs in st for cs in cand_stems))
            score = matched_stems * 10 - idx
            if q_stems and matched_stems >= max(1, len(q_stems) - 1) and score > best_score:
                best_score = score
                best_item = cand

        if not best_item:
            return None, [], ""

        en_name = str(best_item.get('en_name') or best_item.get('main_name') or '').strip()
        detected_type = parse_remanga_type_strict(best_item.get('type'))
        raw_tags = []
        for field in ['genres', 'categories', 'tags']:
            for el in (best_item.get(field) or []):
                raw_tags.append(el.get('name') or el.get('rus_name') or '' if isinstance(el, dict) else str(el))

        return detected_type, map_raw_tags_to_all_tags(raw_tags), en_name
    except Exception:
        return None, [], ""


def query_shikimori_source(search_title):
    norm_q = normalize_for_match(search_title)
    try:
        q = urllib.parse.quote(search_title)
        res = fetch_json(f"https://shikimori.one/api/mangas?search={q}&limit=3", timeout=5)
        if isinstance(res, list):
            for item in res:
                if not isinstance(item, dict):
                    continue
                rus = normalize_for_match(item.get('russian') or '')
                name = normalize_for_match(item.get('name') or '')
                if rus == norm_q or name == norm_q or (len(norm_q) > 5 and abs(len(norm_q) - len(rus)) <= 6 and (norm_q in rus or rus in norm_q)):
                    kind = str(item.get('kind') or '').lower()
                    c_type = 'manhua' if kind == 'manhua' else ('manhwa' if kind == 'manhwa' else ('manga' if kind in ('manga', 'light_novel', 'novel') else None))
                    en_name = str(item.get('name') or '').strip()
                    raw_tags = []
                    if item.get('id'):
                        detail = fetch_json(f"https://shikimori.one/api/mangas/{item['id']}", timeout=4)
                        if isinstance(detail, dict):
                            for g in (detail.get('genres') or []):
                                if isinstance(g, dict) and g.get('russian'):
                                    raw_tags.append(str(g['russian']))
                    return c_type, map_raw_tags_to_all_tags(raw_tags), en_name
    except Exception:
        pass
    return None, [], ""


def query_anilist_and_mangadex_origin(en_or_search_title):
    if not en_or_search_title or len(en_or_search_title) < 2:
        return None, []

    detected_origin_type = None
    collected_tags = []

    try:
        gql = {
            "query": """
            query ($search: String) {
              Media(search: $search, type: MANGA) {
                countryOfOrigin
                genres
                tags { name rank }
              }
            }
            """,
            "variables": {"search": en_or_search_title}
        }
        res = fetch_json("https://graphql.anilist.co", timeout=5, post_data=gql)
        media = ((res or {}).get('data') or {}).get('Media')
        if isinstance(media, dict):
            country = str(media.get('countryOfOrigin') or '').upper()
            if country == 'KR':
                detected_origin_type = 'manhwa'
            elif country in ('CN', 'TW', 'HK'):
                detected_origin_type = 'manhua'
            elif country == 'JP':
                detected_origin_type = 'manga'

            raw_tags = list(media.get('genres') or [])
            for t in (media.get('tags') or []):
                if isinstance(t, dict) and t.get('name') and int(t.get('rank') or 0) >= 55:
                    raw_tags.append(str(t['name']))
            collected_tags.extend(map_raw_tags_to_all_tags(raw_tags))
    except Exception:
        pass

    try:
        q = urllib.parse.quote(en_or_search_title)
        md_res = fetch_json(f"https://api.mangadex.org/manga?title={q}&limit=2", timeout=5)
        md_data = (md_res or {}).get('data') or []
        if isinstance(md_data, list) and md_data:
            attrs = (md_data[0].get('attributes') or {}) if isinstance(md_data[0], dict) else {}
            orig_lang = str(attrs.get('originalLanguage') or '').lower()
            if not detected_origin_type:
                if orig_lang == 'ko':
                    detected_origin_type = 'manhwa'
                elif orig_lang.startswith('zh'):
                    detected_origin_type = 'manhua'
                elif orig_lang == 'ja':
                    detected_origin_type = 'manga'

            md_raw_tags = []
            for t_obj in (attrs.get('tags') or []):
                if isinstance(t_obj, dict):
                    t_name = ((t_obj.get('attributes') or {}).get('name') or {}).get('en')
                    if t_name:
                        md_raw_tags.append(str(t_name))
            for mt in map_raw_tags_to_all_tags(md_raw_tags):
                if mt not in collected_tags:
                    collected_tags.append(mt)
    except Exception:
        pass

    return detected_origin_type, collected_tags


def detect_consensus_tags_and_type(clean_title, post_tags, extra_text, prev_item, overrides_dict, is_romance_special, custom_hidden_overrides):
    override_type = resolve_type_from_overrides(clean_title, overrides_dict)
    canonical = resolve_canonical_title(clean_title)

    combined_title_text = f" {canonical} {clean_title} {' '.join(post_tags or [])} {extra_text} ".lower().replace('ё', 'е')
    tag_votes = {}

    for tag_key, pattern in STRICT_SINGLE_TAG_PATTERNS:
        if pattern.search(combined_title_text):
            tag_votes[tag_key] = tag_votes.get(tag_key, 0) + 2

    for pt in map_raw_tags_to_all_tags(post_tags or []):
        tag_votes[pt] = tag_votes.get(pt, 0) + 2

    if is_romance_special:
        tag_votes["романтика"] = tag_votes.get("романтика", 0) + 5

    rm_type, rm_tags, rm_en = query_remanga_source(clean_title)
    for t in rm_tags:
        tag_votes[t] = tag_votes.get(t, 0) + 2

    sh_type, sh_tags, sh_en = query_shikimori_source(clean_title)
    for t in sh_tags:
        tag_votes[t] = tag_votes.get(t, 0) + 2

    en_query = rm_en or sh_en or clean_title
    orig_lang_type, intl_tags = (None, [])
    if not override_type or len(tag_votes) < 3:
        orig_lang_type, intl_tags = query_anilist_and_mangadex_origin(en_query)
        for t in intl_tags:
            tag_votes[t] = tag_votes.get(t, 0) + 2

    final_type = (
        override_type
        or orig_lang_type
        or sh_type
        or rm_type
        or (prev_item.get("content_type") if isinstance(prev_item, dict) else None)
        or "manhwa"
    )

    sorted_all_tags = [t for t, _ in sorted(tag_votes.items(), key=lambda kv: kv[1], reverse=True)]
    consensus_primary = [
        t for t, score in sorted(tag_votes.items(), key=lambda kv: kv[1], reverse=True)
        if t in PRIMARY_VISIBLE_TAGS and score >= 2
    ]

    if not consensus_primary:
        consensus_primary = [t for t in sorted_all_tags if t in PRIMARY_VISIBLE_TAGS][:2]
    if not consensus_primary:
        consensus_primary = ["фэнтези"]

    if is_romance_special and "романтика" not in consensus_primary:
        consensus_primary.insert(0, "романтика")

    visible_genres = consensus_primary[:3]

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


MEDIA_CACHE_DIR = 'media_cache'


def download_external_image_to_repo(img_url, file_prefix):
    """
    Скачивает картинку с Telegram (telesco.pe) или YouTube (i.ytimg.com) локально в папку media_cache/,
    чтобы на сайте всё открывалось мгновенно БЕЗ VPN!
    """
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
    """
    Берёт строго 2 самые свежие новости из ТГ-канала (без старых постов),
    скачивает их картинки локально в media_cache/ и сохраняет полный текст для чтения без VPN.
    """
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


def post_contains_video(post):
    if not isinstance(post, dict):
        return False
    for key in ('data', 'teaser'):
        blocks = post.get(key)
        if isinstance(blocks, list):
            for b in blocks:
                if isinstance(b, dict):
                    b_type = str(b.get('type') or '').lower()
                    if 'video' in b_type or b.get('vid') or b.get('playerUrls'):
                        return True
    dump = json.dumps(post).lower()
    return '"ok_video"' in dump or '"type": "video"' in dump or '"type":"video"' in dump or 'playerurls' in dump


def count_total_videos_in_blog(all_blog_posts):
    video_count = sum(1 for p in all_blog_posts if post_contains_video(p))
    return video_count if video_count > 0 else len(all_blog_posts)


def get_blog_stats_and_goals(catalog_items=None, all_blog_posts=None):
    now_utc = datetime.datetime.utcnow()
    month_key = f"{now_utc.year}_{now_utc.month:02d}"

    stats = {
        "avatar": "",
        "subscribers": 1437,
        "posts": 727,
        "videos_count": 715,
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
                    for k in ['avatar', 'subscribers', 'posts', 'videos_count', 'goals', 'tg_news', 'yt_videos', 'monthly_history']:
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
                if count_obj.get('videos') or count_obj.get('video'):
                    stats['videos_count'] = int(count_obj.get('videos') or count_obj.get('video'))
    except Exception:
        pass

    if isinstance(all_blog_posts, list) and all_blog_posts:
        counted_videos = count_total_videos_in_blog(all_blog_posts)
        if counted_videos > 0:
            stats['videos_count'] = counted_videos

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
    cleaned = re.sub(r'\b\d{2}\.\d{2}\.\d{4}\b', '', cleaned)
    cleaned = re.sub(
        r'\b\d+\s*(?:лет|год[ао]?в?|этаж(?:ей|а)?|уров(?:ень|ня|ней)|ранг[а]?|мир(?:ов|а)?|раз|тысяч|миллион(?:ов)?|сезон)\b',
        '',
        cleaned,
        flags=re.IGNORECASE
    )

    candidates = []
    for m in re.finditer(r'\b(\d+)\s*[-—–~]\s*(\d+)\s*(?:глав[аы]?|гл\.?|ч\.?|част[ьи])\b', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 <= s <= e < 2500:
            candidates.append((f"{s}-{e} гл.", max(1, s), e))

    for m in re.finditer(r'(?:глав[аы]?|гл\.?)\s*[\[\(]?\s*(\d+)\s*[-—–~]\s*(\d+)', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 <= s <= e < 2500:
            candidates.append((f"{s}-{e} гл.", max(1, s), e))

    for m in re.finditer(r'[\[\(]\s*(\d+)\s*[-—–~]\s*(\d+)\s*(?:глав[аы]?|гл\.?|все\s*главы|все)?\s*[\]\)]?', cleaned, re.IGNORECASE):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 <= s <= e < 2500 and not (s == 82 and e == 8):
            candidates.append((f"{s}-{e} гл.", max(1, s), e))

    for m in re.finditer(r'(?:[-—–:|]\s*|\s+)(\d+)\s*[-—–]\s*(\d+)\s*$', cleaned.strip()):
        s, e = int(m.group(1)), int(m.group(2))
        if 0 <= s <= e < 2500 and not (s == 82 and e == 8):
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


def is_strict_title_match(norm_bundle_title, aliases, post, all_other_bundle_norms):
    post_title_raw = str(post.get('title') or '').lower()
    if any(skip_w in post_title_raw for skip_w in ('график на ', 'расписание на ', 'стрим ', 'анонс ')):
        return False

    post_tags = extract_post_tag_names(post)
    for al in aliases:
        al_clean = al.lower().strip().rstrip('.')
        al_norm = normalize_for_match(al_clean)
        if al_clean in post_tags or (al_norm and al_norm in post_tags):
            prefix = extract_clean_series_prefix_from_post_line(post.get('title') or '')
            if prefix and prefix not in [normalize_for_match(a) for a in aliases]:
                if any(other_n != norm_bundle_title and len(other_n) > len(norm_bundle_title) and other_n in prefix for other_n in all_other_bundle_norms):
                    return False
            return True

    norm_aliases = [normalize_for_match(a) for a in aliases if normalize_for_match(a)]

    for line in extract_post_titles_strict(post):
        prefix = extract_clean_series_prefix_from_post_line(line)
        if not prefix:
            continue

        if prefix not in norm_aliases and prefix in all_other_bundle_norms:
            continue

        conflict_with_longer = False
        for other_n in all_other_bundle_norms:
            if other_n not in norm_aliases and len(other_n) > len(norm_bundle_title) + 3:
                if other_n in prefix or prefix.startswith(other_n):
                    conflict_with_longer = True
                    break
        if conflict_with_longer:
            continue

        for norm_al in norm_aliases:
            if prefix == norm_al:
                return True
            if len(norm_al) >= 6 and abs(len(prefix) - len(norm_al)) <= 5 and (prefix.startswith(norm_al) or norm_al.startswith(prefix)):
                return True

    return False


def fetch_bundle_posts_direct_paginated(bundle_id, clean_title, aliases, all_other_bundle_norms, posts_by_id):
    collected = {}
    norm_title = normalize_for_match(clean_title)
    norm_aliases = [normalize_for_match(a) for a in aliases if normalize_for_match(a)]
    offset = ""

    for _ in range(10):
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

            foreign_count = 0
            checked_sample = 0
            for sample_p in posts[:6]:
                if not isinstance(sample_p, dict):
                    continue
                s_prefix = extract_clean_series_prefix_from_post_line(sample_p.get('title') or '')
                if s_prefix:
                    checked_sample += 1
                    is_own = any(
                        s_prefix == na or (len(na) >= 5 and abs(len(s_prefix) - len(na)) <= 6 and (na in s_prefix or s_prefix in na))
                        for na in norm_aliases
                    )
                    if not is_own:
                        foreign_count += 1

            if checked_sample >= 3 and foreign_count >= 2:
                break

            for p in posts:
                if not isinstance(p, dict) or not p.get('id'):
                    continue
                pid = str(p['id']).strip()
                full_p = posts_by_id.get(pid, p)
                if is_strict_title_match(norm_title, aliases, full_p, all_other_bundle_norms):
                    collected[pid] = full_p

            if extra.get('isLast') or not extra.get('offset'):
                break
            offset = extra.get('offset')
            time.sleep(0.03)
        except Exception:
            break

    return collected


def match_posts_for_bundle(bundle, all_blog_posts, posts_by_id, global_first_post_id, all_other_bundle_norms):
    bundle_id = str(bundle.get('id', '')).strip()
    raw_title = bundle.get('title', '')
    clean_t = clean_bundle_title(raw_title)
    norm_title = normalize_for_match(clean_t)
    aliases = get_aliases_for_title(clean_t)

    matched_map = fetch_bundle_posts_direct_paginated(bundle_id, clean_t, aliases, all_other_bundle_norms, posts_by_id)
    direct_latest_post_id = ""

    for key in ['lastPost', 'latestPost', 'firstPost']:
        lp = bundle.get(key)
        if isinstance(lp, dict) and lp.get('id'):
            pid_str = str(lp['id']).strip()
            full_lp = posts_by_id.get(pid_str, lp)
            if is_strict_title_match(norm_title, aliases, full_lp, all_other_bundle_norms):
                if not direct_latest_post_id:
                    direct_latest_post_id = pid_str
                matched_map[pid_str] = full_lp

    for p in all_blog_posts:
        pid = str(p.get('id') or '').strip()
        if not pid or pid in matched_map:
            continue

        p_bundle = p.get('bundle') or p.get('bundleId') or p.get('bundle_id')
        if (isinstance(p_bundle, dict) and str(p_bundle.get('id')) == bundle_id) or str(p_bundle) == bundle_id:
            if is_strict_title_match(norm_title, aliases, p, all_other_bundle_norms):
                matched_map[pid] = p
            continue

        if is_strict_title_match(norm_title, aliases, p, all_other_bundle_norms):
            matched_map[pid] = p

    filtered_posts = list(matched_map.values())
    filtered_posts.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)

    _, _, b_max_ch = parse_strict_chapter_info(raw_title)
    if filtered_posts:
        if b_max_ch > 0:
            for rp in filtered_posts:
                for line in extract_post_titles_strict(rp):
                    _, _, p_end = parse_strict_chapter_info(line)
                    if p_end == b_max_ch and rp.get('id'):
                        direct_latest_post_id = str(rp['id']).strip()
                        break
                if direct_latest_post_id == str(rp.get('id', '')).strip():
                    break
        if not direct_latest_post_id and filtered_posts[0].get('id'):
            direct_latest_post_id = str(filtered_posts[0]['id']).strip()

    return filtered_posts, direct_latest_post_id


def fetch_isolated_tag_posts(tag_id, tag_title, all_blog_posts, posts_by_id, all_other_bundle_norms):
    tag_id_str = str(tag_id).strip()
    norm_tag_title = normalize_for_match(tag_title)
    aliases = get_aliases_for_title(tag_title)
    norm_aliases = [normalize_for_match(a) for a in aliases if normalize_for_match(a)]
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

        post_prefix = extract_clean_series_prefix_from_post_line(p.get('title') or '')
        if post_prefix:
            belongs_to_other = any(
                other_n not in norm_aliases and (post_prefix == other_n or (len(other_n) > 5 and other_n in post_prefix))
                for other_n in all_other_bundle_norms
            )
            if belongs_to_other:
                continue

        if has_exact_tag_id or is_strict_title_match(norm_tag_title, aliases, p, all_other_bundle_norms):
            matched[pid] = p

    res = list(matched.values())
    res.sort(key=lambda x: x.get('publishTime') or x.get('createdAt') or 0, reverse=True)
    if res and res[0].get('id'):
        direct_latest_id = str(res[0]['id']).strip()
    return res, direct_latest_id


def analyze_posts_stats(posts_list, fallback_ts, eng_metric_tag="", expected_title=""):
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

    expected_aliases = [normalize_for_match(a) for a in get_aliases_for_title(expected_title)] if expected_title else []

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

    for idx, mp in enumerate(posts_list, 1):
        mp_id = str(mp.get('id') or '').strip()
        if not mp_id or mp_id in seen_post_ids:
            continue

        raw_p_title = str(mp.get('title') or '').strip()
        if expected_aliases and raw_p_title:
            p_pref = extract_clean_series_prefix_from_post_line(raw_p_title)
            if p_pref and not any(p_pref == ea or ea in p_pref or p_pref in ea for ea in expected_aliases):
                continue

        seen_post_ids.add(mp_id)
        t_info = detect_post_tier_strict(mp)
        cur_range = ""
        cur_start = 0
        cur_end = 0
        mp_ts = mp.get('publishTime') or mp.get('createdAt') or fallback_ts

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
            best_latest_post_id = mp_id
            if not latest_range_label:
                latest_range_label = cur_range

        range_label = cur_range or (raw_p_title[:52] if raw_p_title else f"Выпуск #{len(all_posts_raw) + 1}")
        direct_url = build_clean_utm_url(f"https://boosty.to/{BLOG_NAME}/posts/{mp_id}", eng_metric_tag or "post")

        post_entry = {
            "post_id": mp_id,
            "title": raw_p_title or f"{expected_title} {range_label}".strip(),
            "range": range_label,
            "start_ch": cur_start if cur_start > 0 else 9999,
            "end_ch": cur_end,
            "ts": mp_ts,
            "date": datetime.datetime.fromtimestamp(mp_ts).strftime("%d.%m.%Y"),
            "is_free": bool(t_info["is_free"]),
            "tier_level": 0 if t_info["is_free"] else t_info["level"],
            "link": direct_url
        }
        all_posts_raw.append(post_entry)

        if t_info["is_free"]:
            if not best_free_post_id:
                best_free_post_id = mp_id
            free_posts_raw.append(post_entry)

            if cur_end > 0 and cur_start > 0 and (cur_end - cur_start) < 600:
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

    free_posts_raw.sort(key=lambda x: (x["start_ch"], x["end_ch"], x["ts"]))
    all_posts_raw.sort(key=lambda x: (x["start_ch"], x["end_ch"], x["ts"]))

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
            norm_cand == ex or (len(norm_cand) > 5 and abs(len(norm_cand) - len(ex)) <= 5 and (norm_cand in ex or ex in norm_cand))
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
    doc["updated_at"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    doc["current_month"] = month_key

    with open('missing_searches.json', 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)


def process_data(extra_cfg):
    type_overrides = load_and_sync_type_overrides()
    romance_norms, frozen_norms, completed_norms, hidden_overrides_norm = load_and_validate_special_titles()

    bundles_list = get_all_bundles()
    if not bundles_list:
        save_type_overrides(type_overrides)
        return [], {}, []

    prev_items_map, previous_searches, months_archive = load_previous_catalog_and_searches()
    all_blog_posts = get_all_blog_posts()
    posts_by_id = {str(p.get('id')).strip(): p for p in all_blog_posts if isinstance(p, dict) and p.get('id')}
    global_first_post_id = all_blog_posts[0].get('id') if all_blog_posts else None

    all_bundle_norms = set()
    for b in bundles_list:
        if isinstance(b, dict) and b.get('title'):
            ct = clean_bundle_title(b.get('title', ''))
            nt = normalize_for_match(ct)
            if nt:
                all_bundle_norms.add(nt)
    for c in extra_cfg.get("custom_tags", []):
        ct = clean_bundle_title(c.get("title", ""))
        nt = normalize_for_match(ct)
        if nt:
            all_bundle_norms.add(nt)

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

        is_polluted_bundle_cache = (
            int(raw_prev.get('free_chapters') or 0) == 216
            and "копировать способности" not in clean_title.lower()
        )
        prev_item = {} if is_polluted_bundle_cache else raw_prev

        cover = raw_prev.get('image') or 'https://via.placeholder.com/400x550/202020/FFFFFF?text=Обложка'
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
        matched_posts, direct_bundle_post_id = match_posts_for_bundle(
            item, all_blog_posts, posts_by_id, global_first_post_id, all_bundle_norms
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
            or str(prev_item.get('latest_post_id') or '').strip()
        )

        free_post_id = best_free_post_id or str(prev_item.get('free_post_id') or '').strip()
        if not free_posts_list and isinstance(prev_item.get('free_posts'), list):
            free_posts_list = prev_item['free_posts']
        if not all_posts_list and isinstance(prev_item.get('all_posts'), list):
            all_posts_list = prev_item['all_posts']

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
        has_free = free_chapters > 0 or len(free_posts_list) > 0

        if has_free and not free_text:
            free_text = prev_item.get('free_text') or f"🆓 Бесплатно: {free_chapters} гл."

        if not latest_range_str:
            latest_range_str = b_range if b_range else (prev_item.get('latest_range') or (f"1-{total_chapters} гл." if total_chapters > 0 else "Новые главы"))

        if not matched_posts and prev_item.get('tier_level') == 2:
            detected_level = 2

        tier_name = "👑 2 уровень • 500 ₽/мес" if detected_level == 2 else "🧡 1 уровень • 250 ₽/мес"
        sub_link = SUB_LINKS[2] if detected_level == 2 else SUB_LINKS[1]

        all_post_tags = []
        for mp in matched_posts[:10]:
            all_post_tags.extend(extract_post_tag_names(mp))

        is_romance = match_title_in_norm_set(clean_title, romance_norms)
        is_completed = match_title_in_norm_set(clean_title, completed_norms)
        is_frozen = False if is_completed else match_title_in_norm_set(clean_title, frozen_norms)

        custom_h_tags = (
            hidden_overrides_norm.get(normalize_for_match(clean_title))
            or hidden_overrides_norm.get(resolve_canonical_title(clean_title))
            or []
        )

        genres, hidden_tags, content_type = detect_consensus_tags_and_type(
            clean_title,
            all_post_tags,
            extra_text=str(item.get('description', '')),
            prev_item=prev_item,
            overrides_dict=type_overrides,
            is_romance_special=is_romance,
            custom_hidden_overrides=custom_h_tags
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
            "chapters": total_chapters,
            "free_chapters": free_chapters,
            "paid_chapters": paid_chapters,
            "free_posts_count": len(free_posts_list),
            "paid_posts_count": max(paid_posts_count, max(0, posts_count - len(free_posts_list))),
            "latest_range": latest_range_str,
            "posts_count": max(posts_count, len(all_posts_list), len(matched_posts)),
            "has_free": has_free,
            "free_text": free_text,
            "free_posts": free_posts_list,
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
            "free_post_id": free_post_id,
            "free_post_link": build_clean_utm_url(raw_free_post_url, eng_metric_tag),
            "sub_link": build_clean_utm_url(sub_link, eng_metric_tag),
            "link": build_clean_utm_url(feed_link, eng_metric_tag),
            "monthly_searches": previous_searches.get(bundle_id, 0)
        })

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

        tag_posts, direct_tag_post_id = fetch_isolated_tag_posts(
            tag_id, c_title, all_blog_posts, posts_by_id, all_bundle_norms
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

        is_prev_polluted = (
            int(raw_prev.get("chapters") or 0) >= 300
            or int(raw_prev.get("free_chapters") or 0) > 0
            or len(raw_prev.get("free_posts") or []) > 2
        )
        safe_prev = {} if is_prev_polluted else raw_prev

        updated_ts = fb_info.get("timestamp") or safe_prev.get("timestamp") or now_ts
        latest_post_id = (
            (tag_posts[0].get('id') if tag_posts and tag_posts[0].get('id') else '')
            or direct_tag_post_id
            or best_ch_post_id
            or str(safe_prev.get('latest_post_id') or '').strip()
            or fb_info.get("latest_post_id", "")
        )
        free_post_id = best_free_post_id or str(safe_prev.get('free_post_id') or '').strip()

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
        total_chapters = max(
            post_max_ch,
            int(custom.get("chapters") or 0),
            int(safe_prev.get("chapters") or 0),
            int(fb_info.get("chapters") or 0)
        )
        free_chapters = min(free_ch_count, total_chapters) if (total_chapters > 0 and free_posts_list) else 0
        paid_chapters = max(0, total_chapters - free_chapters)
        has_free = free_chapters > 0 and len(free_posts_list) > 0

        final_range = latest_range_str or safe_prev.get("latest_range") or fb_info.get("latest_range") or (f"1-{total_chapters} гл." if total_chapters > 0 else "Все главы")

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
        custom_h_tags = (
            hidden_overrides_norm.get(normalize_for_match(c_title))
            or hidden_overrides_norm.get(resolve_canonical_title(c_title))
            or []
        )

        genres, hidden_tags, content_type = detect_consensus_tags_and_type(
            c_title,
            post_tags=[],
            extra_text="",
            prev_item=safe_prev,
            overrides_dict=type_overrides,
            is_romance_special=is_romance,
            custom_hidden_overrides=custom_h_tags
        )

        raw_latest_post_url = f"https://boosty.to/{BLOG_NAME}/posts/{latest_post_id}" if latest_post_id else c_link
        raw_free_post_url = (
            f"https://boosty.to/{BLOG_NAME}/posts/{free_post_id}"
            if (free_post_id and has_free)
            else c_link
        )

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
            "posts_count": max(len(all_posts_list), len(tag_posts), 1),
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
            "free_post_id": free_post_id if has_free else "",
            "free_post_link": build_clean_utm_url(raw_free_post_url, eng_metric_tag),
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
            f"Успешно обновлено {len(data)} тайтлов напрямую из бандлов и тегов "
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
