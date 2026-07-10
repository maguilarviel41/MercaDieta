"""
arreglar_categorias.py
Infiere la categoria de productos con category vacia, basandose en
palabras clave del nombre. No hace peticiones a Mercadona.
"""
import json

CATALOG_FILE = 'data/catalogo_mercadona.json'

KEYWORD_RULES = [
    (['pan ', 'barra', 'panecillo', 'baguette', 'chapata', 'hogaza', 'integral 100%'], 'Panadería y pastelería'),
    (['bollo', 'croissant', 'napolitana', 'ensaimada', 'magdalena', 'donut', 'palmera'], 'Panadería y pastelería'),
    (['bocadillo', 'sandwich', 'sándwich'], 'Panadería y pastelería'),
    (['galleta', 'cereales', 'muesli', 'granola'], 'Cereales y galletas'),
    (['yogur', 'petit suisse', 'natillas', 'flan', 'cuajada'], 'Postres y yogures'),
    (['queso', 'jamón', 'jamon', 'chorizo', 'salchichón', 'salchichon', 'mortadela',
      'lomo embuchado', 'fiambre', 'bacon', 'panceta'], 'Charcutería y quesos'),
    (['pollo', 'pavo', 'ternera', 'cerdo', 'vacuno', 'cordero', 'conejo', 'carne picada'], 'Carne'),
    (['merluza', 'salmón', 'salmon', 'atún', 'atun', 'bacalao', 'gamba', 'langostino',
      'pescado', 'marisco', 'calamar', 'pulpo', 'mejillón', 'mejillon'], 'Marisco y pescado'),
    (['leche', 'huevo', 'mantequilla', 'nata'], 'Huevos, leche y mantequilla'),
    (['agua mineral', 'refresco', 'cola', 'tónica', 'tonica', 'gaseosa'], 'Agua y refrescos'),
    (['zumo', 'nectar', 'néctar'], 'Zumos'),
    (['vino', 'cerveza', 'cava', 'licor', 'ginebra', 'whisky', 'ron ', 'vodka'], 'Bodega'),
    (['café', 'cafe', 'cacao', 'infusión', 'infusion', 'té '], 'Cacao, café e infusiones'),
    (['patata frita', 'snack', 'aperitivo', 'nachos', 'ganchito', 'gusanito'], 'Aperitivos'),
    (['chocolate', 'bombón', 'bombon', 'caramelo', 'chuche', 'golosina', 'azúcar', 'azucar'], 'Azúcar, caramelos y chocolate'),
    (['arroz', 'lenteja', 'garbanzo', 'alubia', 'pasta ', 'macarrón', 'macarron', 'espagueti', 'fideo'], 'Arroz, legumbres y pasta'),
    (['aceite', 'vinagre', 'especias', 'sal ', 'pimienta', 'orégano', 'oregano', 'salsa'], 'Aceite, especias y salsas'),
    (['conserva', 'caldo', 'crema de', 'gazpacho', 'sopa'], 'Conservas, caldos y cremas'),
    (['congelad', 'helado'], 'Congelados'),
    (['pizza', 'plato preparado', 'lasaña', 'lasagna', 'canelones'], 'Pizzas y platos preparados'),
    (['pañal', 'potito', 'papilla', 'toallita bebé', 'toallita bebe'], 'Bebé'),
    (['pienso', 'gato', 'perro'], 'Mascotas'),
    (['manzana', 'plátano', 'platano', 'naranja', 'tomate', 'lechuga', 'pepino',
      'zanahoria', 'cebolla', 'patata ', 'fruta', 'verdura', 'ensalada',
      'acelga', 'espinaca', 'calabacín', 'calabacin', 'pimiento', 'brócoli', 'brocoli',
      'coliflor', 'puerro', 'calabaza', 'berenjena', 'ajo', 'limón', 'limon',
      'kiwi', 'fresa', 'uva', 'melón', 'melon', 'sandía', 'sandia', 'pera',
      'albahaca', 'perejil', 'cilantro', 'romero', 'tomillo', 'apio',
      'avena', 'bebida de almendra', 'bebida de avena', 'bebida de soja',
      'bebida de coco', 'bebida vegetal'], 'Fruta y verdura'),
    (['bacón', 'bacon', 'burrata', 'mozzarella', 'burger', 'hamburguesa'], 'Charcutería y quesos'),
    (['boquerón', 'boqueron', 'sardina', 'anchoa', 'trucha', 'lubina', 'dorada', 'rape'], 'Marisco y pescado'),
    (['batido', 'bebida láctea', 'bebida lactea'], 'Huevos, leche y mantequilla'),
    (['albóndiga', 'albondiga', 'guisad', 'estofad', 'cocido', 'fabada', 'callos'], 'Pizzas y platos preparados'),
    (['anís', 'anis', 'brandy', 'pacharán', 'pacharan', 'orujo', 'vermut',
      'bebida espirituosa', 'bitter', 'ginebra', 'ron añejo'], 'Bodega'),
    (['champú', 'champu', 'acondicionador', 'gel de baño', 'gel de bano', 'gel íntimo',
      'jabón', 'jabon', 'desodorante', 'colonia', 'perfume', 'crema facial', 'crema corporal',
      'maquillaje', 'labial', 'rimel', 'mascara de pestañas', 'esmalte', 'protector solar',
      'pañal', 'compresa', 'tampón', 'tampon', 'papel higiénico', 'papel higienico',
      'arcos dentales', 'cepillo de dientes', 'pasta de dientes', 'enjuague bucal',
      'body spray'], 'Cuidado personal'),
    (['detergente', 'suavizante', 'lejía', 'lejia', 'limpiador', 'ambientador',
      'friegasuelos', 'quitagrasa', 'insecticida', 'bolsa basura', 'estropajo',
      'guante', 'servilleta', 'papel de cocina', 'vela', 'pila ', 'absorbeolores',
      'alguicida', 'agua destilada', 'bayeta', 'antipolillas'], 'Limpieza y hogar'),
    (['bífidus', 'bifidus', 'probiótico', 'probiotico', 'cheesecake', 'tarta ',
      'cabecero de lomo', 'lacón', 'lacon', 'morcilla', 'sobrasada'], 'Charcutería y quesos'),
    (['alcachofa', 'membrillo', 'dulce de'], 'Conservas, caldos y cremas'),
]

FOOD_CATEGORIES = {
    'Panadería y pastelería', 'Cereales y galletas', 'Postres y yogures',
    'Charcutería y quesos', 'Carne', 'Marisco y pescado', 'Huevos, leche y mantequilla',
    'Agua y refrescos', 'Zumos', 'Bodega', 'Cacao, café e infusiones', 'Aperitivos',
    'Azúcar, caramelos y chocolate', 'Arroz, legumbres y pasta', 'Aceite, especias y salsas',
    'Conservas, caldos y cremas', 'Congelados', 'Pizzas y platos preparados',
    'Bebé', 'Mascotas', 'Fruta y verdura',
}


def infer_category(name):
    name_lower = name.lower()
    for keywords, category in KEYWORD_RULES:
        for kw in keywords:
            if kw in name_lower:
                return category
    return None

def is_probably_non_food(name):
    name_lower = name.lower()
    hints = ['bálsamo', 'balsamo', 'cepillo', 'cera ', 'coloración', 'coloracion',
             'crema', 'gel', 'after shave', 'tinte', 'depilat', 'higiene', 'dental',
             'dentífrico', 'dentifrico', 'eau de parfum', 'laxforte', 'cloro',
             'perfume', 'contorno de ojos', 'cápsulas lax']
    return any(h in name_lower for h in hints)

def main():
    catalog = json.load(open(CATALOG_FILE, encoding='utf-8'))
    fixed = 0
    still_unknown = 0

    for p in catalog:
        if not p.get('category'):
            inferred = infer_category(p.get('name', ''))
            if inferred:
                p['category'] = inferred
                fixed += 1
            elif is_probably_non_food(p.get('name', '')):
                p['category'] = 'Cuidado personal'
                fixed += 1
            else:
                p['category'] = 'Otros'
                still_unknown += 1

        # Marcar si es alimento o no, para la seccion de Drogueria
        p['is_food'] = p.get('category') in FOOD_CATEGORIES

    json.dump(catalog, open(CATALOG_FILE, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'Categorias inferidas: {fixed}')
    print(f'Aun sin categoria: {still_unknown}')

    food_count = sum(1 for p in catalog if p.get('is_food'))
    print(f'Productos marcados como alimento: {food_count}')
    print(f'Productos marcados como NO alimento: {len(catalog) - food_count}')

    if still_unknown > 0:
        print('\nEjemplos sin categoria:')
        count = 0
        for p in catalog:
            if not p.get('category') and count < 15:
                print(' -', p['name'])
                count += 1


if __name__ == '__main__':
    main()