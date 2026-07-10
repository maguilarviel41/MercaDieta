"""
rellenar_frutas_verduras.py
Asigna macros estandar (BEDCA/USDA, por 100g) a productos de la categoria
'Fruta y verdura' basandose en palabras clave del nombre.
No depende de imagenes ni de la API de Mercadona.
"""
import json

CATALOG_FILE = 'data/catalogo_mercadona.json'
CACHE_FILE = 'data/categorias_cache.json'

FRUIT_VEG_TABLE = [
    (['manzana'], 52, 0.3, 14, 0.2, 2.4, 0),
    (['platano', 'plátano'], 89, 1.1, 23, 0.3, 2.6, 0),
    (['naranja'], 47, 0.9, 12, 0.1, 2.4, 0),
    (['mandarina', 'clementina'], 53, 0.8, 13, 0.3, 1.8, 0),
    (['limon', 'limón'], 29, 1.1, 9.3, 0.3, 2.8, 0),
    (['pomelo'], 42, 0.8, 11, 0.1, 1.6, 0),
    (['pera'], 57, 0.4, 15, 0.1, 3.1, 0),
    (['melocoton', 'melocotón'], 39, 0.9, 9.5, 0.3, 1.5, 0),
    (['nectarina'], 44, 1.1, 10.6, 0.3, 1.7, 0),
    (['albaricoque'], 48, 1.4, 11, 0.4, 2.0, 0),
    (['ciruela'], 46, 0.7, 11, 0.3, 1.4, 0),
    (['kiwi'], 61, 1.1, 15, 0.5, 3.0, 0),
    (['fresa', 'fresón', 'fresas'], 32, 0.7, 7.7, 0.3, 2.0, 0),
    (['frambuesa'], 52, 1.2, 12, 0.7, 6.5, 0),
    (['arandano', 'arándano'], 57, 0.7, 14, 0.3, 2.4, 0),
    (['uva'], 69, 0.7, 18, 0.2, 0.9, 0),
    (['melon', 'melón'], 34, 0.8, 8.2, 0.2, 0.9, 0),
    (['sandia', 'sandía'], 30, 0.6, 7.6, 0.2, 0.4, 0),
    (['piña', 'pina'], 50, 0.5, 13, 0.1, 1.4, 0),
    (['mango'], 60, 0.8, 15, 0.4, 1.6, 0),
    (['aguacate'], 160, 2.0, 8.5, 15, 6.7, 0),
    (['caqui'], 70, 0.6, 18, 0.2, 3.6, 0),
    (['higo'], 74, 0.8, 19, 0.3, 2.9, 0),
    (['granada'], 83, 1.7, 19, 1.2, 4.0, 0),
    (['cereza'], 63, 1.1, 16, 0.2, 2.1, 0),
    (['papaya'], 43, 0.5, 11, 0.3, 1.7, 0),
    (['tomate'], 18, 0.9, 3.9, 0.2, 1.2, 0),
    (['lechuga'], 15, 1.4, 2.9, 0.2, 1.3, 0),
    (['pepino'], 15, 0.7, 3.6, 0.1, 0.5, 0),
    (['zanahoria'], 41, 0.9, 10, 0.2, 2.8, 0),
    (['cebolla'], 40, 1.1, 9.3, 0.1, 1.7, 0),
    (['patata'], 77, 2.0, 17, 0.1, 2.2, 0),
    (['pimiento'], 31, 1.0, 6.0, 0.3, 2.1, 0),
    (['brocoli', 'brócoli'], 34, 2.8, 6.6, 0.4, 2.6, 0),
    (['coliflor'], 25, 1.9, 5.0, 0.3, 2.0, 0),
    (['puerro'], 61, 1.5, 14, 0.3, 1.8, 0),
    (['calabaza'], 26, 1.0, 6.5, 0.1, 0.5, 0),
    (['berenjena'], 25, 1.0, 6.0, 0.2, 3.0, 0),
    (['ajo'], 149, 6.4, 33, 0.5, 2.1, 0),
    (['espinaca'], 23, 2.9, 3.6, 0.4, 2.2, 0),
    (['acelga'], 19, 1.8, 3.7, 0.2, 1.6, 0),
    (['calabacin', 'calabacín'], 17, 1.2, 3.1, 0.3, 1.0, 0),
    (['apio'], 16, 0.7, 3.0, 0.2, 1.6, 0),
    (['rabano', 'rábano'], 16, 0.7, 3.4, 0.1, 1.6, 0),
    (['remolacha'], 43, 1.6, 10, 0.2, 2.8, 0),
    (['judia verde', 'judía verde'], 31, 1.8, 7.0, 0.1, 3.4, 0),
    (['guisante'], 81, 5.4, 14, 0.4, 5.7, 0),
    (['champiñon', 'champiñón', 'champinon'], 22, 3.1, 3.3, 0.3, 1.0, 0),
    (['alcachofa'], 47, 3.3, 10, 0.2, 5.4, 0),
    (['col ', 'repollo'], 25, 1.3, 5.8, 0.1, 2.5, 0),
    (['breva'], 74, 0.8, 19, 0.3, 2.9, 0),
    (['cebollino'], 32, 3.3, 4.7, 0.6, 2.5, 0),
    (['cilantro'], 23, 2.1, 3.7, 0.5, 2.8, 0),
    (['esparrago', 'espárrago'], 20, 2.2, 3.9, 0.1, 2.1, 0),
    (['hierbabuena', 'menta'], 44, 3.3, 8.4, 0.7, 6.8, 0),
    (['mora'], 43, 1.4, 9.6, 0.5, 5.3, 0),
    (['paraguayo'], 39, 0.9, 9.5, 0.3, 1.5, 0),
    (['rabanito'], 16, 0.7, 3.4, 0.1, 1.6, 0),
    (['yuca', 'mandioca'], 160, 1.4, 38, 0.3, 1.8, 0),
]


def find_macros(name):
    name_lower = name.lower()
    for keywords, kcal, p, c, f, fiber, salt in FRUIT_VEG_TABLE:
        for kw in keywords:
            if kw in name_lower:
                return {'kcal': kcal, 'protein': p, 'carbs': c, 'fat': f, 'fiber': fiber, 'salt': salt}
    return None


def main():
    catalog = json.load(open(CATALOG_FILE, encoding='utf-8'))
    cache = json.load(open(CACHE_FILE, encoding='utf-8'))
    cache_by_id = {p['id']: p for p in cache}

    fruit_veg = [p for p in catalog if p.get('category') == 'Fruta y verdura']
    print(f'Productos en Fruta y verdura: {len(fruit_veg)}')

    matched = 0
    already_had = 0
    unmatched = []

    for p in fruit_veg:
        existing = cache_by_id.get(p['id'])
        has_macros = existing and existing.get('kcal') not in (None, '', 0)
        if has_macros:
            already_had += 1
            continue

        macros = find_macros(p['name'])
        if not macros:
            unmatched.append(p['name'])
            continue

        if existing:
            existing.update(macros)
        else:
            entry = dict(p)
            entry.update(macros)
            cache_by_id[p['id']] = entry

        matched += 1

    final = list(cache_by_id.values())
    json.dump(final, open(CACHE_FILE, 'w', encoding='utf-8'), ensure_ascii=False)

    print(f'Ya tenian macros: {already_had}')
    print(f'Macros asignados ahora: {matched}')
    print(f'Sin match: {len(unmatched)}')
    if unmatched:
        print('\nEjemplos sin match:')
        for n in unmatched[:20]:
            print(' -', n)


if __name__ == '__main__':
    main()