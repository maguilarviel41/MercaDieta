// ── Entrenador personal (chat con Claude + herramientas) ──────────────────

let coachMessages = [];
let coachBusy = false;

function renderCoach(el) {
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:calc(100vh - 140px);max-width:800px;margin:0 auto">
      <div id="coach-messages" style="flex:1;overflow-y:auto;padding:10px 4px;display:flex;flex-direction:column;gap:14px"></div>
      <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border)">
        <input id="coach-input" class="form-input" placeholder="Ej: Quiero perder peso, dime cuantas calorias necesito y hazme la dieta de esta semana"
          style="flex:1" onkeydown="if(event.key==='Enter')sendCoachMessage()">
        <button class="btn btn-primary" onclick="sendCoachMessage()" id="coach-send-btn">Enviar</button>
      </div>
    </div>`;

  if (coachMessages.length === 0) {
    addCoachBubble('assistant', '¡Hola! Soy tu entrenador personal 💪 Puedo diseñarte dietas semanales completas, ajustar tus objetivos de macros, crear recetas y planificar tus dias usando productos reales de tu app.\n\nCuentame: ¿cual es tu objetivo? (perder peso, ganar musculo, mantener, rendimiento) y si tienes alguna restriccion alimentaria.');
  } else {
    coachMessages.forEach(m => {
      if (m.role === 'user' && typeof m.content === 'string') addCoachBubble('user', m.content, false);
      if (m.role === 'assistant') {
        const textBlocks = (Array.isArray(m.content) ? m.content : []).filter(b => b.type === 'text');
        textBlocks.forEach(b => addCoachBubble('assistant', b.text, false));
      }
    });
    scrollCoachToBottom();
  }
}

function addCoachBubble(role, text, scroll = true) {
  const container = document.getElementById('coach-messages');
  if (!container) return;
  const isUser = role === 'user';
  const bubble = document.createElement('div');
  bubble.style.cssText = `display:flex;${isUser?'justify-content:flex-end':''}`;
  bubble.innerHTML = `
    <div style="max-width:75%;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;white-space:pre-wrap;
      background:${isUser?'var(--green)':'var(--bg)'};color:${isUser?'white':'var(--text)'}">
      ${escapeHtml(text)}
    </div>`;
  container.appendChild(bubble);
  if (scroll) scrollCoachToBottom();
}

function addCoachStatus(text) {
  const container = document.getElementById('coach-messages');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'coach-status';
  el.style.cssText = 'font-size:11px;color:var(--text3);text-align:center;font-style:italic';
  el.textContent = text;
  container.appendChild(el);
  scrollCoachToBottom();
  return el;
}

function scrollCoachToBottom() {
  const container = document.getElementById('coach-messages');
  if (container) container.scrollTop = container.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function sendCoachMessage() {
  if (coachBusy) return;
  const input = document.getElementById('coach-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  addCoachBubble('user', text);
  coachMessages.push({role: 'user', content: text});

  await runCoachLoop();
}

async function runCoachLoop() {
  coachBusy = true;
  const sendBtn = document.getElementById('coach-send-btn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '...'; }
  const statusEl = addCoachStatus('Pensando...');

  try {
    let keepGoing = true;
    let safety = 0;

    while (keepGoing && safety < 20) {
      safety++;
      const httpRes = await fetch((window.API_BASE || '') + '/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({messages: coachMessages})
      });

      if (!httpRes.ok) {
        const isTimeout = httpRes.status === 502 || httpRes.status === 504;
        throw new Error(isTimeout
          ? 'El servidor tardó demasiado en responder (probablemente por una tarea muy grande de golpe). Lo que ya se aplicó antes de este punto se ha guardado — escribe "continua" para seguir con el resto.'
          : `Error del servidor (${httpRes.status}).`);
      }

      const res = await httpRes.json();

      if (res.error) {
        statusEl?.remove();
        addCoachBubble('assistant', 'Hubo un error contactando con el servidor: ' + res.error);
        break;
      }

      coachMessages.push({role: 'assistant', content: res.content});

      const toolUses = res.content.filter(b => b.type === 'tool_use');
      const textBlocks = res.content.filter(b => b.type === 'text');

      textBlocks.forEach(b => {
        statusEl?.remove();
        addCoachBubble('assistant', b.text);
      });

      if (toolUses.length === 0) {
        keepGoing = false;
        break;
      }

      const toolResults = [];
      for (const tool of toolUses) {
        if (statusEl) statusEl.textContent = describeCoachTool(tool.name);
        const result = await executeCoachTool(tool.name, tool.input);
        addCoachActionCard(tool.name, tool.input, result);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        });
      }

      coachMessages.push({role: 'user', content: toolResults});
    }
  } catch (e) {
    statusEl?.remove();
    addCoachBubble('assistant', e.message.startsWith('El servidor') || e.message.startsWith('Error del servidor')
      ? e.message
      : 'Error de conexion: ' + e.message);
  }

  document.querySelectorAll('.coach-status').forEach(s => s.remove());
  const doneEl = addCoachStatus('✓ Listo');
  setTimeout(() => doneEl?.remove(), 1500);
  coachBusy = false;
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar'; }
}

function describeCoachTool(name) {
  const labels = {
    buscar_alimentos: '🔍 Buscando alimentos...',
    ver_perfil: '👤 Consultando tu perfil...',
    actualizar_perfil: '✏️ Actualizando tu perfil...',
    establecer_objetivos: '🎯 Ajustando tus objetivos...',
    anadir_a_comida: '📅 Planificando comida...',
    vaciar_dia: '🗑️ Vaciando dia...',
    crear_receta_guardada: '💾 Guardando receta...',
  };
  return labels[name] || 'Trabajando...';
}

function addCoachActionCard(toolName, input, result) {
  const container = document.getElementById('coach-messages');
  if (!container) return;

  let icon = '⚙️', text = '';

  if (toolName === 'anadir_a_comida' && result.ok) {
    icon = '📅';
    const items = (result.añadidos || []).filter(a => !a.error).map(a => `${a.nombre} (${a.gramos}g)`).join(', ');
    text = `Añadido a ${input.dia} - ${input.comida}: ${items || 'nada'}`;
  } else if (toolName === 'crear_receta_guardada' && result.ok) {
    icon = '💾';
    text = `Receta guardada: "${result.receta}" (~${Math.round(result.macros.kcal)} kcal)`;
  } else if (toolName === 'establecer_objetivos' && result.ok) {
    icon = '🎯';
    text = `Objetivos actualizados: ${result.objetivos.kcal} kcal, P${result.objetivos.p}g C${result.objetivos.c}g G${result.objetivos.f}g`;
  } else if (toolName === 'actualizar_perfil' && result.ok) {
    icon = '👤';
    text = `Perfil actualizado`;
  } else if (toolName === 'vaciar_dia' && result.ok) {
    icon = '🗑️';
    text = `Dia ${input.dia} vaciado`;
  } else if (toolName === 'buscar_alimentos') {
    icon = '🔍';
    const queries = input.queries || [];
    const total = Object.values(result.resultados || {}).reduce((sum, arr) => sum + arr.length, 0);
    text = `Buscando ${queries.map(q => `"${q}"`).join(', ')} — ${total} resultados`;
  } else if (toolName === 'ver_perfil') {
    icon = '👁️';
    text = `Perfil consultado`;
  } else {
    text = toolName;
  }

  const card = document.createElement('div');
  card.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--green-light);border:1px solid var(--green);border-radius:10px;padding:8px 12px;font-size:12px;color:var(--green);max-width:80%';
  card.innerHTML = `<span>${icon}</span><span>${escapeHtml(text)}</span>`;
  container.appendChild(card);
  scrollCoachToBottom();
}

async function executeCoachTool(name, input) {
  switch (name) {
    case 'buscar_alimentos': {
      const queries = input.queries || (input.query ? [input.query] : []);
      const resultados = {};
      for (const query of queries) {
        const q = (query || '').toLowerCase();
        resultados[query] = FOODS.filter(f => f.name.toLowerCase().includes(q)).slice(0, 8)
          .map(f => ({id: f.id, name: f.name, kcal: f.kcal, protein: f.p, carbs: f.c, fat: f.f, price: f.price, unit: f.unit}));
      }
      return {resultados};
    }
    case 'ver_perfil': {
      return {
        perfil: load('profile', {}),
        objetivos: load('goals', {}),
        despensa: PANTRY.map(p => ({nombre: p.name, packs: p.packs})),
      };
    }
    case 'actualizar_perfil': {
      const profile = load('profile', {});
      const updated = {...profile, ...input};
      save('profile', updated);
      if (currentPage === 'ajustes') renderAjustes(document.getElementById('page-ajustes'));
      return {ok: true, perfil: updated};
    }
    case 'establecer_objetivos': {
      const goals = {
        kcal: input.kcal,
        p: input.proteina,
        c: input.carbohidratos,
        f: input.grasa,
      };
      save('goals', goals);
      Object.assign(GOALS, goals);
      if (currentPage === 'ajustes') renderAjustes(document.getElementById('page-ajustes'));
      return {ok: true, objetivos: goals};
    }
    case 'anadir_a_comida': {
      const {dia, comida, alimentos} = input;
      if (!DAYS.includes(dia)) return {ok: false, error: 'dia invalido'};
      if (!week[dia][comida]) week[dia][comida] = [];
      const added = [];
      for (const item of alimentos) {
        const f = FOODS.find(x => x.id === item.food_id);
        if (!f) { added.push({food_id: item.food_id, error: 'no encontrado'}); continue; }
        week[dia][comida].push({id: f.id, name: f.name, qty: item.gramos});
        pantryConsume(f.id, item.gramos);
        added.push({nombre: f.name, gramos: item.gramos});
      }
      save('week', week);
      if (currentPage === 'planner') renderPlanner(document.getElementById('page-planner'));
      if (currentPage === 'dashboard') renderDashboard(document.getElementById('page-dashboard'));
      return {ok: true, añadidos: added};
    }
    case 'vaciar_dia': {
      const {dia} = input;
      if (!DAYS.includes(dia)) return {ok: false, error: 'dia invalido'};
      MEALS.forEach(m => { week[dia][m] = []; });
      save('week', week);
      if (currentPage === 'planner') renderPlanner(document.getElementById('page-planner'));
      return {ok: true};
    }
    case 'crear_receta_guardada': {
      const {nombre, ingredientes} = input;
      let totals = {kcal:0, p:0, c:0, f:0};
      const ing = [];
      for (const item of ingredientes) {
        const f = FOODS.find(x => x.id === item.food_id);
        if (!f) continue;
        totals.kcal += f.kcal * item.gramos / 100;
        totals.p += f.p * item.gramos / 100;
        totals.c += f.c * item.gramos / 100;
        totals.f += f.f * item.gramos / 100;
        ing.push({n: f.name.replace(' Hacendado',''), q: item.gramos, u: 'g', id: f.id, thumbnail: f.thumbnail});
      }
      RECIPES.push({
        id: 'r' + Date.now(),
        name: nombre,
        kcal: Math.round(totals.kcal), p: Math.round(totals.p),
        c: Math.round(totals.c), f: Math.round(totals.f),
        ing,
      });
      save('recipes', RECIPES);
      if (currentPage === 'recetas') renderRecetas(document.getElementById('page-recetas'));
      return {ok: true, receta: nombre, macros: totals};
    }
    default:
      return {ok: false, error: 'herramienta desconocida'};
  }
}