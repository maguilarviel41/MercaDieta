"""
recolectar_etiquetas.py
Recorre todo el catalogo de Mercadona y guarda, para cada producto,
la URL de la foto de etiqueta nutricional (perspective=9).
Salida: data/etiquetas_urls.json
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


def get_categories():
    r = requests.get(f'{BASE}/categories/', headers=HEADERS, timeout=10)
    r.raise_for_status()
    data = r.json()
    return data.get('results', data) if isinstance(data, dict) else data


def get_category_products(cat_id):
    r = requests.get(f'{BASE}/categories/{cat_id}/', headers=HEADERS, timeout=10)
    r.raise_for_status()
    data = r.json()
    products = []
    for sub in data.get('categories', []):
        for p in sub.get('products', []):
            products.append(p)
    return products


def get_product_detail(product_id):
    try:
        r = requests.get(f'{BASE}/products/{product_id}/', headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
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
            print(f'  {i}/{len(sub_ids)} categorias...')
        try:
            all_basic.extend(get_category_products(cat_id))
        except Exception as e:
            print(f'  Error categoria {cat_id}: {e}')

    seen = set()
    unique = []
    for p in all_basic:
        pid = str(p.get('id', ''))
        if pid and pid not in seen:
            seen.add(pid)
            unique.append(p)
    print(f'  {len(unique)} productos unicos')

    print('Paso 3/3: Obteniendo fotos de etiqueta de cada producto...')
    results = []
    total = len(unique)
    done = [0]

    def fetch(p):
        pid = str(p.get('id', ''))
        data = get_product_detail(pid)
        done[0] += 1
        if done[0] % 100 == 0:
            print(f'  {done[0]}/{total}...')
        if not data:
            return None
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

    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = [executor.submit(fetch, p) for p in unique]
        for future in as_completed(futures):
            r = future.result()
            if r:
                results.append(r)

    with_label = sum(1 for r in results if r['has_label'])
    print(f'\n{with_label}/{len(results)} productos tienen foto de etiqueta')

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f'Guardado en: {OUTPUT}')


if __name__ == '__main__':
    main()