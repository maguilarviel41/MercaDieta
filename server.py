from http.server import HTTPServer, SimpleHTTPRequestHandler
import json, os, requests
import db_layer

CACHE_FILE = 'data/categorias_cache.json'
PORT = int(os.environ.get('PORT', 8080))

def load_api_key():
    key = os.environ.get('ANTHROPIC_API_KEY')
    if key:
        return key
    with open('.env') as f:
        for line in f:
            if line.startswith('ANTHROPIC_API_KEY='):
                return line.strip().split('=', 1)[1]
    raise ValueError('ANTHROPIC_API_KEY no encontrada')

COACH_SYSTEM_PROMPT = """Eres un entrenador personal y nutricionista experto integrado en MercaDieta,
una app de planificacion de dietas basada en productos reales de Mercadona.

Tu trabajo es ayudar al usuario a:
- Disenar dietas semanales realistas usando SOLO productos que existan en su base de datos (usa la herramienta buscar_alimentos para encontrarlos, nunca inventes productos ni IDs)
- Ajustar su perfil y objetivos de calorias/macros
- Crear recetas guardadas reutilizables
- Planificar dias y comidas especificas

Reglas importantes:
- SIEMPRE usa buscar_alimentos antes de añadir cualquier alimento a una comida o receta. Nunca uses un food_id que no venga de un resultado real de busqueda.
- Antes de disenar una dieta completa, si no conoces el perfil del usuario, usa ver_perfil primero.
- Se practico y directo, como un entrenador real: pregunta lo esencial (objetivo, restricciones, comidas al dia) si falta info, pero no satures con preguntas si ya tienes suficiente contexto.
- Explica brevemente tus decisiones nutricionales cuando diseñes algo.
- Los dias validos son: Lun, Mar, Mie, Jue, Vie, Sab, Dom.
- Las cantidades de alimentos siempre son en gramos.
"""

COACH_TOOLS = [
    {
        "name": "buscar_alimentos",
        "description": "Busca alimentos reales en la base de datos de la app por nombre. Acepta varias queries a la vez (una por cada ingrediente que necesites) para no gastar turnos buscando uno a uno. Devuelve hasta 8 resultados por query, con su id, nombre, macros por 100g y precio.",
        "input_schema": {
            "type": "object",
            "properties": {
                "queries": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Lista de textos a buscar, ej: ['pechuga de pollo', 'arroz', 'brocoli']"
                }
            },
            "required": ["queries"]
        }
    },
    {
        "name": "ver_perfil",
        "description": "Devuelve el perfil, objetivos de macros y despensa actual del usuario.",
        "input_schema": {"type": "object", "properties": {}}
    },
    {
        "name": "actualizar_perfil",
        "description": "Actualiza datos del perfil del usuario (peso, altura, edad, sexo, nivel de actividad).",
        "input_schema": {
            "type": "object",
            "properties": {
                "peso": {"type": "number"},
                "altura": {"type": "number"},
                "edad": {"type": "number"},
                "sexo": {"type": "string", "enum": ["hombre", "mujer"]},
                "actividad": {"type": "string", "enum": ["1.2", "1.375", "1.55", "1.725", "1.9"]}
            }
        }
    },
    {
        "name": "establecer_objetivos",
        "description": "Establece los objetivos diarios de calorias y macros del usuario.",
        "input_schema": {
            "type": "object",
            "properties": {
                "kcal": {"type": "number"},
                "proteina": {"type": "number"},
                "carbohidratos": {"type": "number"},
                "grasa": {"type": "number"}
            },
            "required": ["kcal", "proteina", "carbohidratos", "grasa"]
        }
    },
    {
        "name": "anadir_a_comida",
        "description": "Añade uno o mas alimentos a una comida especifica de un dia. Los food_id deben venir de resultados previos de buscar_alimentos.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dia": {"type": "string", "enum": ["Lun","Mar","Mie","Jue","Vie","Sab","Dom"]},
                "comida": {"type": "string", "description": "Ej: Desayuno, Comida, Cena, Snack, o un tipo personalizado"},
                "alimentos": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "food_id": {"type": "string"},
                            "gramos": {"type": "number"}
                        },
                        "required": ["food_id", "gramos"]
                    }
                }
            },
            "required": ["dia", "comida", "alimentos"]
        }
    },
    {
        "name": "vaciar_dia",
        "description": "Elimina todos los alimentos planificados en un dia especifico, para poder replanificarlo desde cero.",
        "input_schema": {
            "type": "object",
            "properties": {"dia": {"type": "string", "enum": ["Lun","Mar","Mie","Jue","Vie","Sab","Dom"]}},
            "required": ["dia"]
        }
    },
    {
        "name": "crear_receta_guardada",
        "description": "Crea una comida/receta guardada y reutilizable a partir de una lista de alimentos con cantidades.",
        "input_schema": {
            "type": "object",
            "properties": {
                "nombre": {"type": "string"},
                "ingredientes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "food_id": {"type": "string"},
                            "gramos": {"type": "number"}
                        },
                        "required": ["food_id", "gramos"]
                    }
                }
            },
            "required": ["nombre", "ingredientes"]
        }
    }
]

class MercaDietaHandler(SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/data/all':
            self._get_all_data()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/save-food':
            self._save_food()
        elif self.path == '/api/delete-food':
            self._delete_food()
        elif self.path == '/api/chat':
            self._chat()
        elif self.path == '/api/register':
            self._register()
        elif self.path == '/api/login':
            self._login()
        elif self.path == '/api/logout':
            self._logout()
        elif self.path == '/api/data':
            self._set_data()
        else:
            self.send_response(404)
            self.end_headers()

    # ── Auth y sincronizacion de datos ──────────────────────────────────

    def _read_json_body(self):
        length = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def _bearer_token(self):
        auth = self.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            return auth[len('Bearer '):].strip()
        return None

    def _require_user(self):
        """Devuelve el user_id del token, o None y ya envia un 401."""
        token = self._bearer_token()
        try:
            user_id = db_layer.user_id_from_token(token)
        except RuntimeError as e:
            self._json({'ok': False, 'error': str(e)}, status=503)
            return None
        if not user_id:
            self._json({'ok': False, 'error': 'No autenticado'}, status=401)
            return None
        return user_id

    def _register(self):
        try:
            data = self._read_json_body()
            result = db_layer.create_user(data.get('email', ''), data.get('password', ''))
            self._json(result, status=200 if result.get('ok') else 400)
        except RuntimeError as e:
            self._json({'ok': False, 'error': str(e)}, status=503)
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, status=500)

    def _login(self):
        try:
            data = self._read_json_body()
            result = db_layer.verify_user(data.get('email', ''), data.get('password', ''))
            self._json(result, status=200 if result.get('ok') else 401)
        except RuntimeError as e:
            self._json({'ok': False, 'error': str(e)}, status=503)
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, status=500)

    def _logout(self):
        token = self._bearer_token()
        try:
            if token:
                db_layer.delete_session(token)
        except Exception:
            pass
        self._json({'ok': True})

    def _get_all_data(self):
        user_id = self._require_user()
        if user_id is None:
            return
        try:
            data = db_layer.get_all_data(user_id)
            self._json(data)
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, status=500)

    def _set_data(self):
        user_id = self._require_user()
        if user_id is None:
            return
        try:
            body = self._read_json_body()
            key = body.get('key')
            if not key:
                return self._json({'ok': False, 'error': 'Sin key'}, status=400)
            db_layer.set_data(user_id, key, body.get('value'))
            self._json({'ok': True})
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, status=500)

    def _chat(self):
        try:
            length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(length))
            messages = data.get('messages', [])
            api_key = load_api_key()
            response = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'x-api-key': api_key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                json={
                    'model': 'claude-sonnet-5',
                    'max_tokens': 4096,
                    'system': COACH_SYSTEM_PROMPT,
                    'tools': COACH_TOOLS,
                    'messages': messages,
                },
                timeout=60
            )
            if response.status_code >= 400:
                print(f'[chat] Error {response.status_code}: {response.text}')
            response.raise_for_status()
            self._json(response.json())
        except Exception as e:
            print(f'[chat] Error: {e}')
            self._json({'error': str(e)})

    def _save_food(self):
        try:
            length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(length))
            food_id = data.get('id')
            if not food_id:
                return self._json({'ok': False, 'error': 'Sin id'})
            cache = json.load(open(CACHE_FILE, encoding='utf-8'))
            idx = next((i for i,p in enumerate(cache) if str(p.get('id')) == str(food_id)), None)
            if idx is not None:
                cache[idx] = {**cache[idx], **data}
                action = 'updated'
            else:
                cache.append(data)
                action = 'added'
            json.dump(cache, open(CACHE_FILE, 'w', encoding='utf-8'), ensure_ascii=False)
            print(f'[API] {action}: {data.get("name", food_id)}')
            self._json({'ok': True, 'action': action})
        except Exception as e:
            print(f'[API] Error: {e}')
            self._json({'ok': False, 'error': str(e)})

    def _delete_food(self):
        try:
            length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(length))
            food_id = str(data.get('id', ''))
            cache = json.load(open(CACHE_FILE, encoding='utf-8'))
            before = len(cache)
            cache = [p for p in cache if str(p.get('id')) != food_id]
            json.dump(cache, open(CACHE_FILE, 'w', encoding='utf-8'), ensure_ascii=False)
            self._json({'ok': True, 'deleted': before - len(cache)})
        except Exception as e:
            self._json({'ok': False, 'error': str(e)})

    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def log_message(self, format, *args):
        if args and (str(args[1]) != '200' or '/api/' in str(args[0])):
            super().log_message(format, *args)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    db_layer.init_db()
    print(f'MercaDieta server en http://localhost:{PORT}')
    HTTPServer(('', PORT), MercaDietaHandler).serve_forever()