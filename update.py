import urllib.request
import json
import re
import datetime

BLOG_NAME = 'darktaka'
API_URL = f'https://api.boosty.to/v1/blog/{BLOG_NAME}/post/?limit=300'

def get_bundles():
    req = urllib.request.Request(API_URL, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('data', [])
    except Exception as e:
        print(f"Ошибка API: {e}")
        return []

def process_data(api_data):
    result = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    
    for item in api_data:
        # Проверяем, есть ли бандл внутри поста
        if 'showcase' in item and item['showcase']:
            bundle = item['showcase']
            
            title = bundle.get('title', 'Без названия')
            bundle_id = bundle.get('id', '')
            
            chapters = 0
            chapters_match = re.search(r'\[.*?(\d+)\]', title)
            if chapters_match:
                chapters = int(chapters_match.group(1))
                
            cover = ''
            if bundle.get('cover_url'):
                cover = bundle['cover_url']
            elif bundle.get('image_url'):
                cover = bundle['image_url']
                
            price = bundle.get('price', 0)
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
            print(f"Успешно обработано {len(formatted_data)} бандлов.")
        else:
            print("Бандлы не найдены.")
    else:
        print("Данные не загрузились.")
