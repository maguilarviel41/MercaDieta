"""
descargar_catalogo.py
Descarga el catálogo completo de Mercadona (~4377 productos) con toda
la información disponible en la API excepto macros nutricionales.
Guarda el resultado en data/catalogo_mercadona.json
"""
import requests
import json
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

HEADERS = {
    'User-Agent': 'MercadonaMacros/1.0 (contacto@email.com)',
    'Accept': 'application/json',
}
BASE = 'https://tienda.mercadona.es/api'
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'catalogo_mercadona.json')


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


def parse_full_product(data):
    details = data.get('details', {})
    nutrition = data.get('nutrition_information', {})
    price_info = data.get('price_instructions', {})
    photos = data.get('photos', [])
    categories = data.get('categories', [])

    cat_name, subcat_name = '', ''
    if categories:
        cat_name = categories[0].get('name', '')
        subcats = categories[0].get('categories', [])
        if subcats:
            subcat_name = subcats[0].get('name', '')

    photo_urls = [p.get('zoom', '') for p in photos if p.get('zoom')]
    suppliers = [s.get('name', '') for s in details.get('suppliers', []) if s.get('name')]

    return {
        'id': str(data.get('id', '')),
        'ean': data.get('ean', ''),
        'slug': data.get('slug', ''),
        'share_url': data.get('share_url', ''),
        'name': data.get('display_name', data.get('name', '')),
        'brand': data.get('brand', 'Hacendado'),
        'legal_name': details.get('legal_name', ''),
        'description': details.get('description', ''),
        'packaging': data.get('packaging', ''),
        'category': cat_name,
        'subcategory': subcat_name,
        'origin': data.get('origin') or details.get('origin', ''),
        'suppliers': suppliers,
        'usage_instructions': details.get('usage_instructions', ''),
        'storage_instructions': details.get('storage_instructions', ''),
        'mandatory_mentions': details.get('mandatory_mentions', ''),
        'allergens': nutrition.get('allergens', ''),
        'ingredients': nutrition.get('ingredients', ''),
        'price': price_info.get('unit_price', ''),
        'bulk_price': price_info.get('bulk_price', ''),
        'unit': price_info.get('size_format', ''),
        'unit_size': price_info.get('unit_size', 1),
        'unit_name': price_info.get('unit_name', ''),
        'is_new': price_info.get('is_new', False),
        'price_decreased': price_info.get('price_decreased', False),
        'thumbnail': data.get('thumbnail', ''),
        'photos': photo_urls,
        'requires_age_check': data.get('badges', {}).get('requires_age_check', False),
        'is_bulk': data.get('is_bulk', False),
        'is_variable_weight': data.get('is_variable_weight', False),
        # Macros vacíos — se rellenan manualmente o via OFF
        'kcal': '',
        'protein': '',
        'carbs': '',
        'fat': '',
        'fiber': '',
        'salt': '',
    }


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

    print(f'  {len(sub_ids)} subcategorias encontradas')

    print('Paso 2/3: Descargando productos por categoria...')
    all_basic = []
    for i, cat_id in enumerate(sub_ids):
        if i % 10 == 0:
            print(f'  {i}/{len(sub_ids)} categorias...')
        try:
            products = get_category_products(cat_id)
            all_basic.extend(products)
        except Exception as e:
            print(f'  Error categoria {cat_id}: {e}')

    # Deduplicar
    seen = set()
    unique_basic = []
    for p in all_basic:
        pid = str(p.get('id', ''))
        if pid not in seen:
            seen.add(pid)
            unique_basic.append(p)

    print(f'  {len(unique_basic)} productos únicos encontrados')

    print('Paso 3/3: Obteniendo detalle de cada producto...')
    full_products = []
    total = len(unique_basic)
    done = [0]

    def fetch_detail(p):
        pid = str(p.get('id', ''))
        data = get_product_detail(pid)
        done[0] += 1
        if done[0] % 100 == 0:
            print(f'  {done[0]}/{total} productos...')
        if data:
            return parse_full_product(data)
        else:
            # Fallback con info básica
            price_info = p.get('price_instructions', {})
            return {
                'id': pid,
                'ean': '',
                'name': p.get('display_name', p.get('name', '')),
                'brand': p.get('brand', 'Hacendado'),
                'thumbnail': p.get('thumbnail', ''),
                'price': price_info.get('unit_price', ''),
                'unit': price_info.get('size_format', ''),
                'unit_size': price_info.get('unit_size', 1),
                'bulk_price': price_info.get('bulk_price', ''),
                'photos': [],
                'category': '', 'subcategory': '', 'slug': '',
                'legal_name': '', 'description': '', 'packaging': '',
                'origin': '', 'suppliers': [],
                'usage_instructions': '', 'storage_instructions': '',
                'mandatory_mentions': '', 'allergens': '', 'ingredients': '',
                'unit_name': '', 'is_new': False, 'price_decreased': False,
                'requires_age_check': False, 'is_bulk': False,
                'is_variable_weight': False, 'share_url': '',
                'kcal': '', 'protein': '', 'carbs': '', 'fat': '',
                'fiber': '', 'salt': '',
            }

    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = [executor.submit(fetch_detail, p) for p in unique_basic]
        for future in as_completed(futures):
            result = future.result()
            if result:
                full_products.append(result)

    # Ordenar por nombre
    full_products.sort(key=lambda x: x.get('name', ''))

    print(f'\nGuardando {len(full_products)} productos...')
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(full_products, f, ensure_ascii=False)

    print(f'Listo! Guardado en: {OUTPUT_FILE}')
    print(f'Total: {len(full_products)} productos')


if __name__ == '__main__':
    main()
