from http.server import HTTPServer, SimpleHTTPRequestHandler
import json, os

CACHE_FILE = 'data/categorias_cache.json'
PORT = 8080

class MercaDietaHandler(SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/save-food':
            self._save_food()
        elif self.path == '/api/delete-food':
            self._delete_food()
        else:
            self.send_response(404)
            self.end_headers()

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

    def _json(self, data):
        body = json.dumps(data).encode()
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        if args and (str(args[1]) != '200' or '/api/' in str(args[0])):
            super().log_message(format, *args)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f'MercaDieta server en http://localhost:{PORT}')
    HTTPServer(('', PORT), MercaDietaHandler).serve_forever()