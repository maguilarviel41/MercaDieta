"""
recolectar_etiquetas_v2.py
Version robusta: menos concurrencia, reintentos, guardado incremental.
"""
import requests
import json
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

HEADERS = {'User-Agent': 'MercadonaMacros/1.0 (contacto@email.com)', 'Accept': 'application/json'}
BASE = 'https://tienda.mercadona.es/api'
OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'etiquetas_urls.json')
LABEL_PERSPECTIVE = 9
MAIN_PERSPECTIVE = 2
MAX_WORKERS = 5
MAX_RETRIES = 3


def get_categories():
    r = requests.get(f'{BASE}/categories/', headers=HEADERS, timeout=15)
    r.raise_for_status()
    data = r.json()
    return data.get('results', data) if isinstance(data, dict) else data


def get_category_products(cat_id):
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.get(f'{BASE}/categories/{cat_id}/', headers=HEADERS, timeout=15)
            r.raise_for_status()
            data = r.json()
            products = []
            for sub in data.get('categories', []):
                for p in sub.get('products', []):
                    products.append(p)
            return products
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                print(f'  FALLO categoria {cat_id}: {e}')
                return []
            time.sleep(1.5 * (attempt + 1))
    return []


def get_product_detail(product_id):
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.get(f'{BASE}/products/{product_id}/', headers=HEADERS, timeout=15)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 429:
                time.sleep(2 * (attempt + 1))
            else:
                return None
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    return None


def main():
    print('Paso 1/3: Obteniendo categorias...')
    categories = get_categories()
    sub_ids = []
    for cat in categories:
        if not isinstance(cat, dict):
            continue
        for sub in cat.get('categories', []):
            if isinstance(sub, dict) and 'id' in sub:
                sub_ids.append(sub['id'])
    print(f'  {len(sub_ids)} subcategorias')

    print('Paso 2/3: Descargando lista de productos...')
    all_basic = []
    for i, cat_id in enumerate(sub_ids):
        if i % 20 == 0:
            print(f'  {i}/{len(sub_ids)} categorias... ({len(all_basic)} productos hasta ahora)')
        all_basic.extend(get_category_products(cat_id))
        time.sleep(0.1)

    seen = set()
    unique = []
    for p in all_basic:
        pid = str(p.get('id', ''))
        if pid and pid not in seen:
            seen.add(pid)
            unique.append(p)
    print(f'  {len(unique)} productos unicos')

    print('Paso 3/3: Obteniendo fotos de etiqueta de cada producto...')
    print(f'  (usando {MAX_WORKERS} hilos, con reintentos)')
    results = []
    total = len(unique)
    done = [0]
    failed = [0]

    def fetch(p):
        pid = str(p.get('id', ''))
        data = get_product_detail(pid)
        done[0] += 1
        if done[0] % 200 == 0:
            print(f'  {done[0]}/{total}... ({failed[0]} fallos hasta ahora)')
        if not data:
            failed[0] += 1
            return {
                'id': pid,
                'name': p.get('display_name', p.get('name', '')),
                'brand': p.get('brand', ''),
                'category': '',
                'label_url': None,
                'main_url': p.get('thumbnail', ''),
                'has_label': False,
            }
        photos = data.get('photos', [])
        label_url = next((ph.get('zoom') for ph in photos if ph.get('perspective') == LABEL_PERSPECTIVE), None)
        main_url = next((ph.get('zoom') for ph in photos if ph.get('perspective') == MAIN_PERSPECTIVE), None)
        return {
            'id': pid,
            'name': data.get('display_name', ''),
            'brand': data.get('brand', ''),
            'category': (data.get('categories') or [{}])[0].get('name', ''),
            'label_url': label_url,
            'main_url': main_url,
            'has_label': label_url is not None,
        }

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(fetch, p): p for p in unique}
        for i, future in enumerate(as_completed(futures)):
            r = future.result()
            if r:
                results.append(r)
            if len(results) % 500 == 0:
                with open(OUTPUT, 'w', encoding='utf-8') as f:
                    json.dump(results, f, ensure_ascii=False, indent=2)

    with_label = sum(1 for r in results if r['has_label'])
    print(f'\n{with_label}/{len(results)} productos tienen foto de etiqueta ({failed[0]} fallos de red)')

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f'Guardado en: {OUTPUT}')


if __name__ == '__main__':
    main()