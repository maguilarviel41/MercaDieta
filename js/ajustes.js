let objetivosMode = load('objetivosMode', 'calc');

function renderAjustes(el) {
  const profile = load('profile', {nombre:'', peso:'', altura:'', edad:'', sexo:'hombre'});
  const goals   = load('goals', {kcal:2200, p:160, c:220, f:70});
  const weights = load('weights', []);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <div class="card">
        <div class="card-title">Mi perfil</div>
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-input" id="pf-nombre" value="${profile.nombre}" placeholder="Tu nombre">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group">
            <label class="form-label">Peso (kg)</label>
            <input class="form-input" id="pf-peso" type="number" step="0.1" value="${profile.peso}" placeholder="70">
          </div>
          <div class="form-group">
            <label class="form-label">Altura (cm)</label>
            <input class="form-input" id="pf-altura" type="number" value="${profile.altura}" placeholder="175">
          </div>
          <div class="form-group">
            <label class="form-label">Edad</label>
            <input class="form-input" id="pf-edad" type="number" value="${profile.edad}" placeholder="25">
          </div>
          <div class="form-group">
            <label class="form-label">Sexo</label>
            <select class="form-input" id="pf-sexo">
              <option value="hombre" ${profile.sexo==='hombre'?'selected':''}>Hombre</option>
              <option value="mujer"  ${profile.sexo==='mujer' ?'selected':''}>Mujer</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="saveProfile()">Guardar perfil</button>
      </div>

      <div class="card">
        <div class="card-title">Objetivos diarios</div>
        <div class="view-toggle" style="margin-bottom:16px">
          <button class="vt-btn${objetivosMode==='calc'?' active':''}" onclick="setObjetivosMode('calc')">Calculadora</button>
          <button class="vt-btn${objetivosMode==='manual'?' active':''}" onclick="setObjetivosMode('manual')">Manual</button>
        </div>
        <div id="objetivos-body">${renderObjetivosBody(profile, goals)}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Registro de peso</div>
      <div style="display:grid;grid-template-columns:1fr 1.8fr;gap:20px;align-items:start">
        <div>
          <div style="display:flex;gap:8px;margin-bottom:12px;align-items:flex-end">
            <div class="form-group" style="margin:0;flex:1">
              <label class="form-label">Fecha</label>
              <input class="form-input" id="w-fecha" type="date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group" style="margin:0;width:80px">
              <label class="form-label">Peso (kg)</label>
              <input class="form-input" id="w-peso" type="number" step="0.1" placeholder="70.5">
            </div>
            <button class="btn btn-primary btn-sm" onclick="addWeight()">+</button>
          </div>
          ${renderWeightTable(weights)}
        </div>
        <div>
          ${weights.length >= 2 ? renderWeightChart(weights) : '<div style="text-align:center;padding:40px 20px;color:var(--text3);font-size:13px;border:1px dashed var(--border);border-radius:var(--r)">Añade al menos 2 registros para ver la grafica</div>'}
        </div>
      </div>
    </div>`;
}

function renderObjetivosBody(profile, goals) {
  if (objetivosMode === 'calc') {
    const actividad = load('profile', {}).actividad || '1.55';
    const preset = load('goalPreset', '0');
    return `
      <div class="form-group">
        <label class="form-label">Nivel de actividad diaria</label>
        <select class="form-input" id="pf-actividad" onchange="recalcTDEE()">
          <option value="1.2"   ${actividad==='1.2'  ?'selected':''}>Sedentario (sin ejercicio)</option>
          <option value="1.375" ${actividad==='1.375'?'selected':''}>Ligero (1-3 dias/semana)</option>
          <option value="1.55"  ${actividad==='1.55' ?'selected':''}>Moderado (3-5 dias/semana)</option>
          <option value="1.725" ${actividad==='1.725'?'selected':''}>Activo (6-7 dias/semana)</option>
          <option value="1.9"   ${actividad==='1.9'  ?'selected':''}>Muy activo (2x dia)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Objetivo</label>
        <div style="display:flex;gap:6px">
          <button class="goal-preset-btn${preset==='-500'?' active':''}" onclick="applyGoalPreset('-500')">Perder peso<br><span>-500 kcal</span></button>
          <button class="goal-preset-btn${preset==='0'?' active':''}" onclick="applyGoalPreset('0')">Mantener<br><span>TDEE</span></button>
          <button class="goal-preset-btn${preset==='+300'?' active':''}" onclick="applyGoalPreset('+300')">Ganar musculo<br><span>+300 kcal</span></button>
        </div>
      </div>
      <div id="tdee-box">${renderTDEEBox()}</div>`;
    } else {
        const pPct = load('macroPct', {p:30, c:45, f:25});
        const kcal = goals.kcal;
        const pg = Math.round(kcal * pPct.p/100 / 4);
        const cg = Math.round(kcal * pPct.c/100 / 4);
        const fg = Math.round(kcal * pPct.f/100 / 9);
        return `
          <div class="form-group">
            <label class="form-label">Calorias objetivo (kcal)</label>
            <input class="form-input" id="goal-kcal" type="number" value="${kcal}" oninput="updateMacroGrams()">
          </div>
          <div style="margin:12px 0 4px;font-size:12px;font-weight:600;color:var(--text2)">Distribucion de macros</div>
          <div class="form-group">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <label class="form-label" style="margin:0">Proteina</label>
              <span style="font-size:12px;color:#3b82f6;font-weight:600"><span id="pct-p">${pPct.p}</span>% → <span id="g-p">${pg}</span>g</span>
            </div>
            <input type="range" id="range-p" min="10" max="60" value="${pPct.p}" oninput="updatePcts('p')" style="width:100%;accent-color:#3b82f6">
          </div>
          <div class="form-group">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <label class="form-label" style="margin:0">Carbohidratos</label>
              <span style="font-size:12px;color:#10b981;font-weight:600"><span id="pct-c">${pPct.c}</span>% → <span id="g-c">${cg}</span>g</span>
            </div>
            <input type="range" id="range-c" min="10" max="70" value="${pPct.c}" oninput="updatePcts('c')" style="width:100%;accent-color:#10b981">
          </div>
          <div class="form-group">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <label class="form-label" style="margin:0">Grasas</label>
              <span style="font-size:12px;color:#ef4444;font-weight:600"><span id="pct-f">${pPct.f}</span>% → <span id="g-f">${fg}</span>g</span>
            </div>
            <input type="range" id="range-f" min="10" max="50" value="${pPct.f}" oninput="updatePcts('f')" style="width:100%;accent-color:#ef4444">
          </div>
          <div style="height:8px;border-radius:4px;overflow:hidden;display:flex;margin-bottom:8px">
            <div id="bar-p" style="height:100%;background:#3b82f6;width:${pPct.p}%;transition:width 0.2s"></div>
            <div id="bar-c" style="height:100%;background:#10b981;width:${pPct.c}%;transition:width 0.2s"></div>
            <div id="bar-f" style="height:100%;background:#ef4444;width:${pPct.f}%;transition:width 0.2s"></div>
          </div>
          <div id="pct-warning" style="font-size:11px;color:var(--red);margin-bottom:8px;display:none"></div>
          <button class="btn btn-primary" style="width:100%" onclick="saveGoalsManual()">Guardar objetivos</button>`;
      }
}

function renderTDEEBox() {
  const profile = load('profile', {});
  const actividad = document.getElementById('pf-actividad')?.value || profile.actividad || '1.55';
  const p = parseFloat(profile.peso), h = parseFloat(profile.altura), a = parseFloat(profile.edad);
  if (!p || !h || !a) {
    return `<div style="background:var(--bg);border-radius:var(--rs);padding:12px;font-size:12px;color:var(--text3);text-align:center">
      Guarda tu perfil primero (peso, altura, edad)
    </div>`;
  }
  const bmr = profile.sexo==='hombre' ? 10*p+6.25*h-5*a+5 : 10*p+6.25*h-5*a-161;
  const tdee = Math.round(bmr * parseFloat(actividad));
  const preset = load('goalPreset','0');
  const delta = preset==='-500'?-500:preset==='+300'?300:0;
  const kcal = tdee + delta;
  const prot = Math.round(p * 2);
  const fat  = Math.round(kcal * 0.25 / 9);
  const carb = Math.max(0, Math.round((kcal - prot*4 - fat*9) / 4));
  return `
    <div style="background:var(--green-light);border:1px solid var(--green);border-radius:var(--rs);padding:12px;margin-top:8px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;margin-bottom:10px">
        <div><div style="font-size:18px;font-weight:700;color:var(--green)">${kcal}</div><div style="font-size:10px;color:var(--green)">kcal</div></div>
        <div><div style="font-size:18px;font-weight:700;color:#3b82f6">${prot}g</div><div style="font-size:10px;color:#3b82f6">prot</div></div>
        <div><div style="font-size:18px;font-weight:700;color:#10b981">${carb}g</div><div style="font-size:10px;color:#10b981">carbs</div></div>
        <div><div style="font-size:18px;font-weight:700;color:#ef4444">${fat}g</div><div style="font-size:10px;color:#ef4444">grasa</div></div>
      </div>
      <button class="btn btn-primary" style="width:100%;font-size:12px" onclick="saveGoalsFromCalc(${kcal},${prot},${carb},${fat})">Aplicar estos objetivos</button>
    </div>`;
}

function renderWeightTable(weights) {
  if (!weights.length) return `<div style="font-size:12px;color:var(--text3);padding:10px 0">Sin registros aun</div>`;
  const sorted = [...weights].reverse().slice(0,10);
  const rows = sorted.map((w,i) => {
    const prev = sorted[i+1];
    const diff = prev ? (w.peso - prev.peso).toFixed(1) : null;
    const diffColor = diff===null?'':parseFloat(diff)<=0?'color:var(--green)':'color:var(--red)';
    return `<tr>
      <td style="padding:6px 8px;font-size:12px;color:var(--text2)">${w.fecha.slice(5).replace('-','/')}</td>
      <td style="padding:6px 8px;font-size:13px;font-weight:600">${w.peso} kg</td>
      <td style="padding:6px 8px;font-size:11px;${diffColor}">${diff!==null?(parseFloat(diff)>0?'+':'')+diff:'—'}</td>
      <td style="padding:6px 8px"><button onclick="deleteWeight('${w.fecha}')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:12px">✕</button></td>
    </tr>`;
  }).join('');
  return `<table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th style="text-align:left;font-size:10px;color:var(--text3);padding:4px 8px;border-bottom:1px solid var(--border)">Fecha</th>
      <th style="text-align:left;font-size:10px;color:var(--text3);padding:4px 8px;border-bottom:1px solid var(--border)">Peso</th>
      <th style="text-align:left;font-size:10px;color:var(--text3);padding:4px 8px;border-bottom:1px solid var(--border)">Cambio</th>
      <th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderWeightChart(weights) {
  const W=500, H=180, PL=36, PR=16, PT=16, PB=28;
  const sorted = [...weights].sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const pesos = sorted.map(w=>w.peso);
  const minP = Math.min(...pesos)-0.5, maxP = Math.max(...pesos)+0.5;
  const n = sorted.length;
  const cx = i => PL + (i/(n-1))*(W-PL-PR);
  const cy = v => PT + (1-(v-minP)/(maxP-minP))*(H-PT-PB);
  const pts = sorted.map((w,i)=>`${cx(i)},${cy(w.peso)}`).join(' ');
  const area = `${cx(0)},${H-PB} ${pts} ${cx(n-1)},${H-PB}`;
  const dots = sorted.map((w,i)=>`<circle cx="${cx(i)}" cy="${cy(w.peso)}" r="3.5" fill="var(--green)"/>`).join('');
  const xlabels = sorted.filter((_,i)=>i===0||i===n-1||i===Math.floor(n/2)).map(w=>{
    const idx=sorted.indexOf(w);
    return `<text x="${cx(idx)}" y="${H-6}" text-anchor="middle" font-size="9" fill="#9ca3af">${w.fecha.slice(5).replace('-','/')}</text>`;
  }).join('');
  const ylabels = [minP+0.5,(minP+maxP)/2,maxP-0.5].map(v=>
    `<text x="${PL-4}" y="${cy(v)+3}" text-anchor="end" font-size="9" fill="#9ca3af">${v.toFixed(1)}</text>`
  ).join('');
  const change = pesos[pesos.length-1]-pesos[0];
  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
      <polygon points="${area}" fill="#00A650" opacity="0.1"/>
      <polyline points="${pts}" fill="none" stroke="#00A650" stroke-width="2" stroke-linejoin="round"/>
      ${dots}${xlabels}${ylabels}
      <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H-PB}" stroke="#e5e7eb" stroke-width="1"/>
      <line x1="${PL}" y1="${H-PB}" x2="${W-PR}" y2="${H-PB}" stroke="#e5e7eb" stroke-width="1"/>
    </svg>
    <div style="display:flex;justify-content:space-around;font-size:12px;color:var(--text2);margin-top:4px">
      <span>Inicio: <strong>${pesos[0]} kg</strong></span>
      <span>Actual: <strong>${pesos[pesos.length-1]} kg</strong></span>
      <span>Total: <strong style="color:${change<=0?'var(--green)':'var(--red)'}">${change>0?'+':''}${change.toFixed(1)} kg</strong></span>
    </div>`;
}

function setObjetivosMode(mode) {
  objetivosMode = mode;
  save('objetivosMode', mode);
  const profile = load('profile',{});
  const goals = load('goals',{kcal:2200,p:160,c:220,f:70});
  document.getElementById('objetivos-body').innerHTML = renderObjetivosBody(profile, goals);
  document.querySelectorAll('.view-toggle .vt-btn').forEach((b,i)=>{
    b.classList.toggle('active',(i===0&&mode==='calc')||(i===1&&mode==='manual'));
  });
}

function recalcTDEE() {
  const box = document.getElementById('tdee-box');
  if (box) box.innerHTML = renderTDEEBox();
}

function applyGoalPreset(preset) {
  save('goalPreset', preset);
  document.querySelectorAll('.goal-preset-btn').forEach(b=>b.classList.remove('active'));
  event.target.closest('.goal-preset-btn').classList.add('active');
  recalcTDEE();
}

function saveProfile() {
  const actividad = document.getElementById('pf-actividad')?.value || load('profile',{}).actividad || '1.55';
  const profile = {
    nombre:    document.getElementById('pf-nombre').value,
    peso:      document.getElementById('pf-peso').value,
    altura:    document.getElementById('pf-altura').value,
    edad:      document.getElementById('pf-edad').value,
    sexo:      document.getElementById('pf-sexo').value,
    actividad,
  };
  save('profile', profile);
  showToast('Perfil guardado');
  recalcTDEE();
}

function updatePcts(changed) {
  const p = parseInt(document.getElementById('range-p').value);
  const c = parseInt(document.getElementById('range-c').value);
  const f = parseInt(document.getElementById('range-f').value);
  const total = p + c + f;
  document.getElementById('pct-p').textContent = p;
  document.getElementById('pct-c').textContent = c;
  document.getElementById('pct-f').textContent = f;
  document.getElementById('bar-p').style.width = p + '%';
  document.getElementById('bar-c').style.width = c + '%';
  document.getElementById('bar-f').style.width = f + '%';
  const warn = document.getElementById('pct-warning');
  warn.style.display = total !== 100 ? 'block' : 'none';
  warn.textContent = `Los porcentajes suman ${total}% (deben ser 100%)`;
  save('macroPct', {p, c, f});
  updateMacroGrams();
}

function updateMacroGrams() {
  const kcal = parseInt(document.getElementById('goal-kcal')?.value) || 2200;
  const p = parseInt(document.getElementById('range-p')?.value) || 30;
  const c = parseInt(document.getElementById('range-c')?.value) || 45;
  const f = parseInt(document.getElementById('range-f')?.value) || 25;
  const gp = document.getElementById('g-p');
  const gc = document.getElementById('g-c');
  const gf = document.getElementById('g-f');
  if (gp) gp.textContent = Math.round(kcal * p/100 / 4);
  if (gc) gc.textContent = Math.round(kcal * c/100 / 4);
  if (gf) gf.textContent = Math.round(kcal * f/100 / 9);
}

function saveGoalsManual() {
  const kcal = parseInt(document.getElementById('goal-kcal').value) || 2200;
  const p = parseInt(document.getElementById('range-p')?.value) || 30;
  const c = parseInt(document.getElementById('range-c')?.value) || 45;
  const f = parseInt(document.getElementById('range-f')?.value) || 25;
  if (p + c + f !== 100) {
    showToast('Los porcentajes deben sumar 100%');
    return;
  }
  const goals = {
    kcal,
    p: Math.round(kcal * p/100 / 4),
    c: Math.round(kcal * c/100 / 4),
    f: Math.round(kcal * f/100 / 9),
  };
  save('goals', goals);
  save('macroPct', {p, c, f});
  Object.assign(GOALS, goals);
  showToast('Objetivos guardados');
}

function saveGoalsFromCalc(kcal, p, c, f) {
  const goals = {kcal, p, c, f};
  save('goals', goals);
  Object.assign(GOALS, goals);
  showToast('Objetivos aplicados');
}

function addWeight() {
  const fecha = document.getElementById('w-fecha').value;
  const peso  = parseFloat(document.getElementById('w-peso').value);
  if (!fecha || !peso) return;
  const weights = load('weights', []);
  const idx = weights.findIndex(w=>w.fecha===fecha);
  if (idx>=0) weights[idx].peso = peso;
  else weights.push({fecha, peso});
  weights.sort((a,b)=>a.fecha.localeCompare(b.fecha));
  save('weights', weights);
  document.getElementById('w-peso').value = '';
  renderAjustes(document.getElementById('page-ajustes'));
}

function deleteWeight(fecha) {
  const weights = load('weights',[]).filter(w=>w.fecha!==fecha);
  save('weights', weights);
  renderAjustes(document.getElementById('page-ajustes'));
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111827;color:white;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999;opacity:0;transition:opacity 0.2s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(()=>t.style.opacity='0', 2000);
}