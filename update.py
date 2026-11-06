import urllib.request
import json
import re
import datetime

BLOG_NAME = 'darktaka'
# Пробуем эндпоинт витрины (showcase), который точнее отражает твою страницу
API_URL = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/showcase/'

def get_bundles():
    req = urllib.request.Request(API_URL, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    })
    try:
        with urllib.request.urlopen(req) as response:
            raw_data = json.loads(response.read().decode('utf-8'))
            print("Успешный ответ API. Доступные ключи:", raw_data.keys() if isinstance(raw_data, dict) else "Это список")
            
            # Ищем, где Бусти спрятал наши данные
            if isinstance(raw_data, dict) and 'data' in raw_data:
                return raw_data['data']
            return raw_data
    except Exception as e:
        print(f"Ошибка API: {e}")
        return []

def process_data(api_data):
    result = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    
    # Защита: если Бусти вернул один словарь, а не список, оборачиваем его в список
    if isinstance(api_data, dict):
        if all(isinstance(v, dict) for v in api_data.values()):
            api_data = list(api_data.values())
        else:
            api_data = [api_data]
            
    for item in api_data:
        # Защита: пропускаем всё, что не является словарем (бандлом)
        if not isinstance(item, dict):
            print(f"Пропущен элемент неизвестного типа: {type(item)} -> {item}")
            continue
            
        title = item.get('title', 'Без названия')
        bundle_id = item.get('id', '')
        
        # Если это не бандл и у него нет ID, пропускаем
        if not bundle_id:
            continue
            
        chapters = 0
        chapters_match = re.search(r'\[.*?(\d+)\]', title)
        if chapters_match:
            chapters = int(chapters_match.group(1))
            
        cover = ''
        if item.get('cover_url'):
            cover = item['cover_url']
        elif item.get('image_url'):
            cover = item['image_url']
            
        price = item.get('price', 0)
        tier = f"Цена: {price} ₽" if price > 0 else "Бесплатно"
        
        result.append({
            "id": str(bundle_id),
            "title": str(title),
            "image": str(cover),
            "chapters": chapters,
            "last_update": today,
            "tier": tier,
            "link": f"https://boosty.to/{BLOG_NAME}/bundle/{bundle_id}?isFromShowcasePreview=true&view=grid"
        })
        
    return result

if __name__ == '__main__':
    data = get_bundles()
    if data:
        formatted_data = process_data(data)
        if formatted_data:
            with open('data.json', 'w', encoding='utf-8') as f:
                json.dump(formatted_data, f, ensure_ascii=False, indent=2)
            print(f"Успешно обработано и обновлено {len(formatted_data)} бандлов.")
        else:
            print("Данные загружены, но не найдено ни одного подходящего бандла. Возможно, неверная структура.")
    else:
        print("Данные не загрузились.")
