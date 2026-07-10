"""
test_extraer_macros.py
Prueba con 5 productos para validar la extraccion de macros via Claude Vision
antes de lanzar el proceso completo.
"""
import json
import base64
import requests
import os
import re

def load_api_key():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    with open(env_path) as f:
        for line in f:
            if line.startswith('ANTHROPIC_API_KEY='):
                return line.strip().split('=', 1)[1]
    raise ValueError('ANTHROPIC_API_KEY no encontrada en .env')

API_KEY = load_api_key()
MODEL = 'claude-haiku-4-5-20251001'

PROMPT = """Esta es la etiqueta de informacion nutricional de un producto alimenticio español.
Extrae los valores nutricionales POR 100g o 100ml (si vienen en otra base, calcula la equivalencia a 100g).

Responde UNICAMENTE con un JSON valido, sin texto adicional, con esta estructura exacta:
{"kcal": numero, "protein": numero, "carbs": numero, "fat": numero, "fiber": numero, "salt": numero}

Si algun valor no aparece en la etiqueta, pon 0. Si no puedes leer la etiqueta o no es una etiqueta nutricional, responde:
{"error": "no_legible"}"""


def download_image_b64(url):
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    return base64.b64encode(r.content).decode('utf-8')


def extract_macros(image_url):
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
    response.raise_for_status()
    data = response.json()
    text = data['content'][0]['text'].strip()
    text = re.sub(r'^```json\s*|\s*```$', '', text.strip())
    return json.loads(text)


def main():
    catalog = json.load(open('data/catalogo_mercadona.json', encoding='utf-8'))
    candidates = [p for p in catalog if len(p.get('photos', [])) >= 2][:5]

    print(f'Probando con {len(candidates)} productos...\n')

    for p in candidates:
        label_url = p['photos'][1]
        print(f"Producto: {p['name']}")
        print(f"  URL etiqueta: {label_url}")
        try:
            result = extract_macros(label_url)
            print(f"  Resultado: {result}")
        except Exception as e:
            print(f"  ERROR: {e}")
        print()


if __name__ == '__main__':
    main()