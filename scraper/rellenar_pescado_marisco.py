"""
rellenar_pescado_marisco.py
Asigna macros estandar (BEDCA/USDA, por 100g, en crudo) a productos de la
categoria 'Marisco y pescado' basandose en palabras clave del nombre.
"""
import json

CATALOG_FILE = 'data/catalogo_mercadona.json'
CACHE_FILE = 'data/categorias_cache.json'

FISH_SEAFOOD_TABLE = [
    (['merluza'], 71, 17, 0, 0.9, 0, 0.2),
    (['bacalao'], 82, 18, 0, 0.7, 0, 0.2),
    (['salmon', 'salmón'], 208, 20, 0, 13, 0, 0.1),
    (['dorada'], 96, 20, 0, 2.0, 0, 0.2),
    (['lubina'], 97, 19, 0, 2.5, 0, 0.2),
    (['trucha'], 119, 20, 0, 3.5, 0, 0.1),
    (['boqueron', 'boquerón', 'anchoa'], 96, 20, 0, 1.4, 0, 0.3),
    (['sardina'], 135, 20, 0, 5.5, 0, 0.2),
    (['caballa'], 205, 19, 0, 14, 0, 0.2),
    (['atun', 'atún'], 132, 28, 0, 1.0, 0, 0.2),
    (['rape'], 76, 15, 0, 1.5, 0, 0.2),
    (['panga'], 90, 15, 0, 3.0, 0, 0.2),
    (['congrio'], 92, 18, 0, 2.0, 0, 0.2),
    (['rodaballo'], 81, 16, 0, 1.9, 0, 0.2),
    (['emperador', 'pez espada'], 121, 20, 0, 4.0, 0, 0.2),
    (['lenguado'], 86, 17, 0, 1.5, 0, 0.2),
    (['gallo'], 76, 17, 0, 1.0, 0, 0.2),
    (['bonito'], 144, 25, 0, 5.0, 0, 0.2),
    (['jurel', 'chicharro'], 114, 19, 0, 4.5, 0, 0.2),
    (['gamba', 'langostino', 'camaron', 'camarón'], 85, 20, 0.9, 0.5, 0, 0.5),
    (['cigala'], 89, 19, 0.5, 0.9, 0, 0.5),
    (['calamar', 'chipirón', 'chipiron'], 92, 15, 3.0, 1.4, 0, 0.4),
    (['sepia'], 79, 16, 0.8, 1.0, 0, 0.4),
    (['pulpo'], 82, 15, 2.2, 1.0, 0, 0.4),
    (['mejillon', 'mejillón'], 86, 12, 3.7, 2.2, 0, 0.5),
    (['almeja'], 74, 13, 2.6, 1.0, 0, 0.5),
    (['berberecho'], 74, 13, 2.6, 1.0, 0, 0.6),
    (['vieira'], 88, 17, 3.0, 0.8, 0, 0.4),
    (['bogavante', 'langosta'], 89, 19, 0.5, 0.9, 0, 0.4),
    (['centollo', 'nécora', 'necora', 'buey de mar', 'cangrejo'], 87, 18, 0, 1.1, 0, 0.5),
    (['percebe'], 80, 16, 1.0, 1.2, 0, 0.6),
    (['navaja'], 75, 13, 2.5, 1.0, 0, 0.5),
    (['ostra'], 68, 9, 4.0, 2.3, 0, 0.6),
    (['surimi'], 95, 13, 9, 0.5, 0, 1.2),
    (['anguila'], 184, 18, 0, 12, 0, 0.2),
    (['chirla'], 74, 13, 2.6, 1.0, 0, 0.5),
    (['corvina'], 90, 18, 0, 1.8, 0, 0.2),
    (['gallineta'], 90, 18, 0, 1.8, 0, 0.2),
    (['morralla'], 90, 17, 0, 2.0, 0, 0.2),
]


def find_macros(name):
    name_lower = name.lower()
    for keywords, kcal, p, c, f, fiber, salt in FISH_SEAFOOD_TABLE:
        for kw in keywords:
            if kw in name_lower:
                return {'kcal': kcal, 'protein': p, 'carbs': c, 'fat': f, 'fiber': fiber, 'salt': salt}
    return None


def main():
    catalog = json.load(open(CATALOG_FILE, encoding='utf-8'))
    cache = json.load(open(CACHE_FILE, encoding='utf-8'))
    cache_by_id = {p['id']: p for p in cache}

    fish = [p for p in catalog if p.get('category') == 'Marisco y pescado']
    print(f'Productos en Marisco y pescado: {len(fish)}')

    matched = 0
    already_had = 0
    unmatched = []

    for p in fish:
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