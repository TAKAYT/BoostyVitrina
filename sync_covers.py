"""
Скрипт быстрого добавления и сжатия новых обложек в media_cache/covers/.
Скачивает только отсутствующие обложки из data.json, не трогая уже сохранённые.
"""
import json
import os
import re
import io
import urllib.request

try:
    from PIL import Image
except ImportError:
    Image = None

COVERS_DIR = os.path.join("media_cache", "covers").replace("\\", "/")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
}


def download_and_optimize(url, out_path, max_width=340):
    if not url or not url.startswith("http"):
        return False
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12) as resp:
            content = resp.read()
            if not content or len(content) < 512:
                return False
            if Image is not None:
                im = Image.open(io.BytesIO(content)).convert("RGB")
                if im.width > max_width:
                    ratio = max_width / float(im.width)
                    im = im.resize((max_width, int(im.height * ratio)), Image.LANCZOS)
                im.save(out_path, format="JPEG", quality=76, optimize=True, progressive=True)
            else:
                with open(out_path, "wb") as f:
                    f.write(content)
            return True
    except Exception as e:
        print(f"[SKIP] {url}: {e}")
        return False


def main():
    if not os.path.exists("data.json"):
        print("Файл data.json не найден.")
        return

    os.makedirs(COVERS_DIR, exist_ok=True)
    with open("data.json", "r", encoding="utf-8") as f:
        items = json.load(f)

    added = 0
    for item in items:
        slug = re.sub(r"[^a-zA-Z0-9_-]", "", str(item.get("metric_tag") or item.get("id") or "cover"))[:54]
        remote = item.get("remote_image") or (item.get("image") if str(item.get("image", "")).startswith("http") else "")
        target_path = os.path.join(COVERS_DIR, f"{slug}.jpg").replace("\\", "/")

        if not os.path.exists(target_path) or os.path.getsize(target_path) < 1024:
            if remote and download_and_optimize(remote, target_path):
                item["remote_image"] = remote
                item["image"] = target_path
                added += 1
        else:
            if remote:
                item["remote_image"] = remote
            item["image"] = target_path

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"Готово. Добавлено новых обложек: {added}, всего в каталоге: {len(items)}.")


if __name__ == "__main__":
    main()
