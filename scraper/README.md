# Scraper — Generador de base de datos

Script Python que descarga el catálogo completo de productos de Mercadona
con sus macros nutricionales desde Open Food Facts.

## Requisitos

```bash
pip3 install requests
sudo apt install python3-tk  # Ubuntu/Debian
```

## Uso

```bash
cd scraper
python3 app.py
```

## Qué hace

1. Descarga todas las categorías de `tienda.mercadona.es/api`
2. Obtiene todos los productos con nombre, precio y EAN
3. Consulta Open Food Facts por EAN para obtener macros
4. Guarda el resultado en `../data/categorias_cache.json`

## Resultado

El archivo `categorias_cache.json` contiene ~1000-1500 productos con:
- Nombre, marca, precio, unidad
- EAN (código de barras)
- Imagen (thumbnail URL)
- Macros: kcal, proteína, carbos, grasa, fibra, sal (por 100g)

## Actualizar el catálogo

Pulsa "Actualizar catálogo" en la app para regenerar el JSON.
Solo es necesario cuando Mercadona actualice sus productos (~mensual).
