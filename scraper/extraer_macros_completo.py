import json
import base64
import requests
import os
import re
import time

API_KEY_ENV = '.env'
MODEL = 'claude-haiku-4-5-20251001'
INPUT_CATALOG = 'data/catalogo_mercadona.json'
OUTPUT_FILE = 'data/categorias_cache_v2.json'
PROGRESS_FILE = 'data/extraccion_progreso.json'
SLEEP_BETWEEN = 0.3
MAX_RETRIES = 3

PROMPT = """Esta es la etiqueta de informacion nutricional de un producto alimenticio español.
Extrae los valores nutricionales POR 100g o 100ml (si vienen en otra base, calcula la equivalencia a 100g).

Responde UNICAMENTE con un JSON valido, sin texto adicional, con esta estructura exacta:
{"kcal": numero, "protein": numero, "carbs": numero, "fat": numero, "fiber": numero, "salt": numero}

Si algun valor no aparece en la etiqueta, pon 0. Si no puedes leer la etiqueta o no es una etiqueta nutricional, responde:
{"error": "no_legible"}"""


def load_api_key():
    with open(API_KEY_ENV) as f:
        for line in f:
            if line.startswith('ANTHROPIC_API_KEY='):
                return line.strip().split('=', 1)[1]
    raise ValueError('ANTHROPIC_API_KEY no encontrada en .env')


API_KEY = load_api_key()


def download_image_b64(url):
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    return base64.b64encode(r.content).decode('utf-8')


def extract_macros(image_url):
    for attempt in range(MAX_RETRIES):
        try:
            img_b64 = download_image_b64(image_url)
            response = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'x-api-key': API_KEY,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                json={
                    'model': MODEL,
                    'max_tokens': 300,
                    'messages': [{
                        'role': 'user',
                        'content': [
                            {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': img_b64}},
                            {'type': 'text', 'text': PROMPT}
                        ]
                    }]
                },
                timeout=30
            )
            if response.status_code == 429:
                time.sleep(3 * (attempt + 1))
                continue
            response.raise_for_status()
            data = response.json()
            text = data['content'][0]['text'].strip()
            text = re.sub(r'^```json\s*|\s*```$', '', text.strip())
            return json.loads(text)
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                return {'error': str(e)}
            time.sleep(1.5 * (attempt + 1))
    return {'error': 'max_retries'}


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        return json.load(open(PROGRESS_FILE, encoding='utf-8'))
    return {}


def save_progress(progress):
    json.dump(progress, open(PROGRESS_FILE, 'w', encoding='utf-8'), ensure_ascii=False)


def main():
    catalog = json.load(open(INPUT_CATALOG, encoding='utf-8'))
    progress = load_progress()

    candidates = [p for p in catalog if len(p.get('photos', [])) >= 2]
    total = len(candidates)
    print(f'Total productos con etiqueta: {total}')
    print(f'Ya procesados anteriormente: {len(progress)}')

    remaining = [p for p in candidates if p['id'] not in progress]
    print(f'Pendientes: {len(remaining)}\n')

    no_legible = 0
    errors = 0

    for i, p in enumerate(remaining):
        label_url = p['photos'][1]
        result = extract_macros(label_url)

        if 'error' in result:
            if result['error'] == 'no_legible':
                no_legible += 1
            else:
                errors += 1
                print(f"  [{i+1}/{len(remaining)}] ERROR en {p['name']}: {result['error']}")
        else:
            progress[p['id']] = result

        if (i + 1) % 25 == 0:
            print(f'  [{i+1}/{len(remaining)}] procesados... ({no_legible} no legibles, {errors} errores)')
            save_progress(progress)

        time.sleep(SLEEP_BETWEEN)

    save_progress(progress)
    print(f'\nCompletado. {len(progress)} productos con macros extraidos.')
    print(f'{no_legible} no legibles')
    print(f'{errors} errores')

    print('\nGenerando categorias_cache_v2.json...')
    final = []
    for p in catalog:
        macros = progress.get(p['id'])
        entry = dict(p)
        if macros:
            entry['kcal'] = macros.get('kcal', 0)
            entry['protein'] = macros.get('protein', 0)
            entry['carbs'] = macros.get('carbs', 0)
            entry['fat'] = macros.get('fat', 0)
            entry['fiber'] = macros.get('fiber', 0)
            entry['salt'] = macros.get('salt', 0)
        final.append(entry)

    json.dump(final, open(OUTPUT_FILE, 'w', encoding='utf-8'), ensure_ascii=False)
    with_macros = sum(1 for e in final if e.get('kcal'))
    print(f'Guardado: {OUTPUT_FILE}')
    print(f'{with_macros}/{len(final)} productos con macros')


if __name__ == '__main__':
    main()