"""
enriquecer_cache.py
Enriquece el categorias_cache.json existente con toda la información
disponible en la API de Mercadona: ingredientes, alérgenos, categorías,
instrucciones, proveedores, fotos, etc.
"""
import requests
import json
import time
import os

HEADERS = {
    'User-Agent': 'MercadonaMacros/1.0 (contacto@email.com)',
    'Accept': 'application/json',
}
BASE = 'https://tienda.mercadona.es/api'
CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'categorias_cache.json')


def get_product_detail(product_id):
    try:
        r = requests.get(f'{BASE}/products/{product_id}/', headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f'  Error producto {product_id}: {e}')
    return None


def extract_full_product(data, existing):
    """Combina los datos existentes (macros de OFF) con los nuevos de la API."""
    details = data.get('details', {})
    nutrition = data.get('nutrition_information', {})
    price_info = data.get('price_instructions', {})
    photos = data.get('photos', [])
    categories = data.get('categories', [])

    # Categoria principal y subcategoria
    cat_name, subcat_name = '', ''
    if categories:
        cat_name = categories[0].get('name', '')
        subcats = categories[0].get('categories', [])
        if subcats:
            subcat_name = subcats[0].get('name', '')

    # Fotos en zoom
    photo_urls = [p.get('zoom', '') for p in photos if p.get('zoom')]

    # Proveedores
    suppliers = [s.get('name', '') for s in details.get('suppliers', []) if s.get('name')]

    enriched = {
        # Identificación
        'id': existing.get('id', str(data.get('id', ''))),
        'ean': data.get('ean', existing.get('ean', '')),
        'slug': data.get('slug', ''),
        'share_url': data.get('share_url', ''),

        # Nombre y marca
        'name': existing.get('name', data.get('display_name', '')),
        'brand': existing.get('brand', data.get('brand', 'Hacendado')),
        'legal_name': details.get('legal_name', ''),
        'description': details.get('description', ''),
        'packaging': data.get('packaging', ''),

        # Categorías
        'category': cat_name,
        'subcategory': subcat_name,

        # Origen y proveedores
        'origin': data.get('origin') or details.get('origin', ''),
        'suppliers': suppliers,

        # Instrucciones
        'usage_instructions': details.get('usage_instructions', ''),
        'storage_instructions': details.get('storage_instructions', ''),
        'mandatory_mentions': details.get('mandatory_mentions', ''),

        # Nutrición (de nutrition_information de Mercadona)
        'allergens': nutrition.get('allergens', ''),
        'ingredients': nutrition.get('ingredients', ''),

        # Precios
        'price': price_info.get('unit_price', existing.get('price', '')),
        'bulk_price': price_info.get('bulk_price', existing.get('bulk_price', '')),
        'unit': price_info.get('size_format', existing.get('unit', '')),
        'unit_size': price_info.get('unit_size', existing.get('unit_size', 1)),
        'unit_name': price_info.get('unit_name', ''),
        'is_new': price_info.get('is_new', False),
        'price_decreased': price_info.get('price_decreased', False),

        # Imágenes
        'thumbnail': data.get('thumbnail', existing.get('thumbnail', '')),
        'photos': photo_urls,

        # Badges
        'requires_age_check': data.get('badges', {}).get('requires_age_check', False),
        'is_bulk': data.get('is_bulk', False),
        'is_variable_weight': data.get('is_variable_weight', False),

        # Macros (de Open Food Facts, ya los teníamos)
        'kcal': existing.get('kcal', ''),
        'protein': existing.get('protein', ''),
        'carbs': existing.get('carbs', ''),
        'fat': existing.get('fat', ''),
        'fiber': existing.get('fiber', ''),
        'salt': existing.get('salt', ''),
    }

    return enriched


def main():
    print(f'Cargando cache existente...')
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)
    total = len(cache)
    print(f'{total} productos en cache')

    enriched_cache = []
    errors = 0

    for i, product in enumerate(cache):
        if i % 50 == 0:
            print(f'  {i}/{total} productos procesados...')

        data = get_product_detail(product['id'])
        if data:
            enriched = extract_full_product(data, product)
            enriched_cache.append(enriched)
        else:
            # Si falla, mantener el producto original
            enriched_cache.append(product)
            errors += 1

        time.sleep(0.05)

    print(f'\nGuardando cache enriquecido...')
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(enriched_cache, f, ensure_ascii=False, indent=2)

    print(f'Listo! {total} productos, {errors} errores')
    print(f'Guardado en: {CACHE_FILE}')


if __name__ == '__main__':
    main()
