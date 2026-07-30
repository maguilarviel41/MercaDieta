// ── MercaDietaAuth ──────────────────────────────────────────────────────────
// Gestiona login/registro, la sesion (token) y la sincronizacion inicial de
// datos entre dispositivos. La cuenta es OPCIONAL: si el usuario elige
// "usar sin cuenta", la app sigue funcionando 100% local como antes.
//
// Flujo:
// 1. boot() decide si hay que mostrar el overlay de login o pasar directo.
// 2. Si hay token guardado -> se descarga /api/data/all y se sobreescribe
//    localStorage con lo que haya en el servidor.
// 3. Tras login/registro nuevo -> si el servidor no tenia nada todavia pero
//    el navegador si tenia datos locales, se suben esos datos (no se pierden).
// 4. Se cargan el resto de los <script> de la app en orden.
const MercaDietaAuth = (function () {
  const TOKEN_KEY = 'mercadieta_token';
  const EMAIL_KEY = 'mercadieta_email';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getEmail() { return localStorage.getItem(EMAIL_KEY) || ''; }
  function isLoggedIn() { return !!getToken(); }

  function setSession(token, email) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email || '');
  }

  function clearSession() {
    const token = getToken();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    if (token) {
      fetch('/api/logout', {method: 'POST', headers: {Authorization: 'Bearer ' + token}}).catch(() => {});
    }
  }

  function logout() {
    clearSession();
    location.reload();
  }

  // Todas las claves 'md_xxx' que hoy vive en localStorage (excluye el token/email de sesion)
  function localDataKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('md_')) keys.push(k.slice(3));
    }
    return keys;
  }

  async function pushAllLocalData(token) {
    const keys = localDataKeys();
    for (const key of keys) {
      const raw = localStorage.getItem('md_' + key);
      if (raw === null) continue;
      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token},
          body: JSON.stringify({key, value: JSON.parse(raw)}),
        });
      } catch (e) { /* si falla una clave, seguimos con el resto */ }
    }
  }

  async function pullAllServerData(token) {
    try {
      const res = await fetch('/api/data/all', {headers: {Authorization: 'Bearer ' + token}});
      if (res.status === 401) { clearSession(); return {ok: false}; }
      if (!res.ok) return {ok: false};
      const data = await res.json();
      Object.keys(data).forEach(key => {
        localStorage.setItem('md_' + key, JSON.stringify(data[key]));
      });
      return {ok: true, count: Object.keys(data).length};
    } catch (e) {
      console.warn('No se pudo sincronizar con el servidor, usando datos locales', e);
      return {ok: false, offline: true};
    }
  }

  // Se llama una vez, justo despues de iniciar sesion o registrarse
  async function syncAfterLogin(token) {
    const server = await pullAllServerData(token);
    if (server.ok && server.count === 0) {
      // Cuenta nueva sin datos todavia: sube lo que ya tenias en este navegador
      await pushAllLocalData(token);
    }
  }

  function loadScriptsSequentially(list, done) {
    let i = 0;
    function next() {
      if (i >= list.length) { done(); return; }
      const s = document.createElement('script');
      s.src = list[i++];
      s.onload = next;
      s.onerror = next;
      document.body.appendChild(s);
    }
    next();
  }

  function buildOverlay(onDone) {
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg,#f4f6f5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="width:100%;max-width:340px;background:var(--card,#fff);border-radius:16px;padding:28px 24px;box-shadow:0 8px 30px rgba(0,0,0,.12)">
        <div style="text-align:center;margin-bottom:18px">
          <div style="font-size:28px">🥦</div>
          <div style="font-weight:700;font-size:18px;margin-top:4px">MercaDieta</div>
          <div style="font-size:13px;color:var(--text2,#888);margin-top:4px">Inicia sesion para tener tus datos en todos tus dispositivos</div>
        </div>
        <div style="display:flex;gap:4px;background:var(--bg,#f4f6f5);border-radius:10px;padding:3px;margin-bottom:14px">
          <button id="auth-tab-login" style="flex:1;padding:8px;border:none;border-radius:8px;background:var(--green,#2e7d32);color:#fff;font-weight:600;cursor:pointer">Iniciar sesion</button>
          <button id="auth-tab-register" style="flex:1;padding:8px;border:none;border-radius:8px;background:transparent;color:var(--text2,#888);font-weight:600;cursor:pointer">Crear cuenta</button>
        </div>
        <input id="auth-email" type="email" placeholder="Email" autocomplete="email"
          style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--border,#ddd);border-radius:8px;margin-bottom:8px;font-size:14px">
        <input id="auth-password" type="password" placeholder="Contraseña" autocomplete="current-password"
          style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--border,#ddd);border-radius:8px;margin-bottom:8px;font-size:14px">
        <div id="auth-error" style="color:#c0392b;font-size:13px;min-height:18px;margin-bottom:6px"></div>
        <button id="auth-submit" style="width:100%;padding:11px;border:none;border-radius:8px;background:var(--green,#2e7d32);color:#fff;font-weight:700;cursor:pointer;font-size:14px">Iniciar sesion</button>
        <button id="auth-skip" style="width:100%;padding:8px;border:none;background:transparent;color:var(--text2,#888);font-size:13px;margin-top:10px;cursor:pointer;text-decoration:underline">Usar sin cuenta (solo este dispositivo)</button>
      </div>
    `;
    document.body.appendChild(overlay);

    let mode = 'login';
    const tabLogin = overlay.querySelector('#auth-tab-login');
    const tabRegister = overlay.querySelector('#auth-tab-register');
    const submitBtn = overlay.querySelector('#auth-submit');
    const errorEl = overlay.querySelector('#auth-error');
    const emailEl = overlay.querySelector('#auth-email');
    const passEl = overlay.querySelector('#auth-password');

    function setMode(m) {
      mode = m;
      const isLogin = m === 'login';
      tabLogin.style.background = isLogin ? 'var(--green,#2e7d32)' : 'transparent';
      tabLogin.style.color = isLogin ? '#fff' : 'var(--text2,#888)';
      tabRegister.style.background = !isLogin ? 'var(--green,#2e7d32)' : 'transparent';
      tabRegister.style.color = !isLogin ? '#fff' : 'var(--text2,#888)';
      submitBtn.textContent = isLogin ? 'Iniciar sesion' : 'Crear cuenta';
      errorEl.textContent = '';
    }
    tabLogin.onclick = () => setMode('login');
    tabRegister.onclick = () => setMode('register');

    async function submit() {
      const email = emailEl.value.trim();
      const password = passEl.value;
      if (!email || !password) { errorEl.textContent = 'Rellena email y contraseña'; return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Un momento...';
      try {
        const endpoint = mode === 'login' ? '/api/login' : '/api/register';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email, password}),
        });
        const data = await res.json();
        if (!data.ok) {
          errorEl.textContent = data.error || 'Error al iniciar sesion';
          submitBtn.disabled = false;
          setMode(mode);
          return;
        }
        setSession(data.token, data.email);
        await syncAfterLogin(data.token);
        overlay.remove();
        onDone();
      } catch (e) {
        errorEl.textContent = 'No se pudo conectar con el servidor';
        submitBtn.disabled = false;
        setMode(mode);
      }
    }
    submitBtn.onclick = submit;
    passEl.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

    overlay.querySelector('#auth-skip').onclick = () => {
      overlay.remove();
      onDone();
    };
  }

  const APP_SCRIPTS = [
    'js/db.js', 'js/dashboard.js', 'js/planner.js', 'js/icons.js',
    'js/alimentos.js', 'js/despensa.js', 'js/compra.js', 'js/recetas.js',
    'js/ajustes.js', 'js/dietas.js', 'js/coach.js', 'js/app.js', 'js/export.js',
  ];

  async function boot() {
    const token = getToken();
    if (token) {
      const result = await pullAllServerData(token);
      if (!result.ok && !result.offline) {
        // token invalido/expirado -> pedir login de nuevo
        buildOverlay(() => loadScriptsSequentially(APP_SCRIPTS, () => {}));
        return;
      }
      loadScriptsSequentially(APP_SCRIPTS, () => {});
    } else {
      buildOverlay(() => loadScriptsSequentially(APP_SCRIPTS, () => {}));
    }
  }

  return {getToken, getEmail, isLoggedIn, logout, boot, showOverlayForLogin: () => buildOverlay(() => location.reload())};
})();

MercaDietaAuth.boot();