function stockColor(pct) {
  if (pct <= 0) return '#E2001A';
  if (pct >= 50) {
    const t = (pct - 50) / 50;
    const r = Math.round(245 - t * 245);
    const g = Math.round(158 + t * (166 - 158));
    const b = Math.round(11 - t * 11);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = pct / 50;
    const r = Math.round(226 - t * (226 - 245));
    const g = Math.round(t * 158);
    const b = Math.round(26 - t * 15);
    return `rgb(${r},${g},${b})`;
  }
}

function macroTileHTML(label, val, target, unit, color) {
  const pct = Math.min(100, Math.round(val/target*100));
  return `<div class="macro-tile">
    <div class="mt-label">${label}</div>
    <div class="mt-val" style="color:${color}">${Math.round(val)}<span class="mt-unit"> ${unit}</span></div>
    <div class="mt-sub">objetivo: ${target}${unit}</div>
    <div class="pbar"><div class="pfill" style="width:${pct}%;background:${color}"></div></div>
  </div>`;
}

function renderDonut(kcal, p, c, f) {
  const totalKcal = p*4 + c*4 + f*9;
  if (totalKcal === 0) return `<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">Sin datos hoy</div>`;
  const pPct = Math.round(p*4/totalKcal*100);
  const cPct = Math.round(c*4/totalKcal*100);
  const fPct = Math.round(f*9/totalKcal*100);
  const R = 80, cx = 100, cy = 100, stroke = 22;
  const circumference = 2 * Math.PI * R;
  function arc(pct, offset, color) {
    const dash = (pct/100) * circumference;
    return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${circumference}" stroke-dashoffset="${-offset * circumference / 100}"
      transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`;
  }
  const arcs = [
    arc(pPct, 0, '#3b82f6'),
    arc(cPct, pPct, '#10b981'),
    arc(fPct, pPct+cPct, '#ef4444'),
  ].join('');
  return `
    <div style="display:flex;align-items:center;gap:20px">
      <svg viewBox="0 0 200 200" style="width:160px;height:160px;flex-shrink:0">
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
        ${arcs}
        <text x="${cx}" y="${cy-10}" text-anchor="middle" font-size="26" font-weight="700" fill="var(--text)">${Math.round(kcal)}</text>
        <text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="12" fill="#9ca3af">kcal</text>
        <text x="${cx}" y="${cy+30}" text-anchor="middle" font-size="10" fill="#9ca3af">consumidas</text>
      </svg>
      <div style="flex:1;display:flex;flex-direction:column;gap:14px">
        <div class="donut-legend-item">
          <span class="donut-dot" style="background:#3b82f6"></span>
          <span class="donut-lbl">Proteina</span>
          <span class="donut-val">${Math.round(p)}g</span>
          <span class="donut-pct">${pPct}%</span>
        </div>
        <div class="donut-legend-item">
          <span class="donut-dot" style="background:#10b981"></span>
          <span class="donut-lbl">Carbos</span>
          <span class="donut-val">${Math.round(c)}g</span>
          <span class="donut-pct">${cPct}%</span>
        </div>
        <div class="donut-legend-item">
          <span class="donut-dot" style="background:#ef4444"></span>
          <span class="donut-lbl">Grasas</span>
          <span class="donut-val">${Math.round(f)}g</span>
          <span class="donut-pct">${fPct}%</span>
        </div>
      </div>
    </div>`;
}

function renderWeeklySpend() {
  const needed = {};
  DAYS.forEach(day => MEALS.forEach(meal => (week[day][meal]||[]).forEach(item => {
    const f = FOODS.find(x=>x.id===item.id);
    if (!f) return;
    if (!needed[item.id]) needed[item.id] = {f, qty:0};
    needed[item.id].qty += item.qty;
  })));
  const total = Object.values(needed).reduce((a,{f,qty}) => a + (qty/1000)*f.price, 0);

  const daySpends = DAYS.map(day => {
    const spend = MEALS.reduce((a,meal) => a + (week[day][meal]||[]).reduce((b,item) => {
      const f = FOODS.find(x=>x.id===item.id);
      return b + (f ? (item.qty/1000)*f.price : 0);
    }, 0), 0);
    return {day, spend};
  });

  const maxSpend = Math.max(...daySpends.map(d=>d.spend), 0.01);

  const bars = daySpends.map(({day, spend}) => {
    const pct = Math.round((spend/maxSpend)*100);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:110px">
      <div style="font-size:10px;color:var(--text2);font-weight:500;height:14px">
        ${spend>0?spend.toFixed(1)+'€':''}
      </div>
      <div style="width:100%;background:var(--bg);border-radius:4px 4px 0 0;flex:1;display:flex;align-items:flex-end;overflow:hidden">
        <div style="width:100%;height:${pct}%;background:${spend>0?'var(--green)':'var(--border)'};border-radius:4px 4px 0 0;transition:height 0.3s;min-height:${spend>0?'4px':'0'}"></div>
      </div>
      <div style="font-size:10px;color:var(--text3)">${day}</div>
    </div>`;
  }).join('');

  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <span style="font-size:13px;color:var(--text2)">Total estimado</span>
    <span style="font-size:18px;font-weight:700;color:var(--green)">${total.toFixed(2)}€</span>
  </div>
  <div style="display:flex;gap:6px;height:120px;align-items:flex-end;margin-bottom:12px">${bars}</div>
  <div style="border-top:1px solid var(--border);padding-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
    <div>
      <div style="font-size:18px;font-weight:700;color:var(--green)">${total.toFixed(2)}€</div>
      <div style="font-size:10px;color:var(--text3)">total semana</div>
    </div>
    <div>
      <div style="font-size:18px;font-weight:700;color:var(--text)">${(total / Math.max(daySpends.filter(d=>d.spend>0).length, 1)).toFixed(2)}€</div>
      <div style="font-size:10px;color:var(--text3)">media por dia</div>
    </div>
    <div>
      <div style="font-size:18px;font-weight:700;color:var(--text)">${(total * 4.33).toFixed(0)}€</div>
      <div style="font-size:10px;color:var(--text3)">estimado mes</div>
    </div>
  </div>`;
}

function renderPantryDash() {
  if (!PANTRY.length) return `<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">
    La despensa esta vacia — <a href="#" onclick="goTo('despensa')" style="color:var(--green)">añade productos</a>
  </div>`;
  return PANTRY.map(p => {
    const f = FOODS.find(x=>x.id===p.foodId);
    const pct = Math.min(100, Math.round(p.qty/p.total*100));
    const barColor = pct <= 0 ? '#E2001A' : stockColor(pct);
    const img = f?.thumbnail
      ? `<img src="${f.thumbnail}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;background:#f9fafb;flex-shrink:0" loading="lazy">`
      : `<div style="width:40px;height:40px;border-radius:6px;background:var(--bg);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px">📦</div>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      ${img}
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
          <div style="flex:1;height:5px;background:var(--bg);border-radius:3px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px"></div>
          </div>
          <span style="font-size:10px;color:var(--text3);white-space:nowrap">${p.qty}${p.unit}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderDashboard(el) {
  const today = DAYS[0];
  const tk = dayKcal(today), tp = dayMacro(today,'p'), tc = dayMacro(today,'c'), tf = dayMacro(today,'f');
  const wk = DAYS.reduce((a,d) => a+dayKcal(d), 0);
  const profile = load('profile', {});
  const greeting = profile.nombre ? `Hola, ${profile.nombre}` : 'Bienvenido';
  const weekHTML = DAYS.map(d => {
    const k = dayKcal(d);
    const pct = Math.min(100, Math.round(k/GOALS.kcal*100));
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span style="color:var(--text2);font-weight:500">${d}</span>
        <span style="color:${k>=GOALS.kcal*0.9?'var(--green)':'var(--text2)'}">${k||'—'}${k?' kcal':''}</span>
      </div>
      <div class="pbar"><div class="pfill" style="width:${pct}%;background:${k?'var(--green)':'var(--border)'}"></div></div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="margin-bottom:20px">
      <div style="font-size:20px;font-weight:700;color:var(--text)">${greeting} 👋</div>
      <div style="font-size:13px;color:var(--text3);margin-top:2px">${new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</div>
    </div>
    <div class="macro-grid">
      ${macroTileHTML('Calorias hoy', tk, GOALS.kcal, 'kcal', '#f59e0b')}
      ${macroTileHTML('Proteina', tp, GOALS.p, 'g', '#3b82f6')}
      ${macroTileHTML('Carbohidratos', tc, GOALS.c, 'g', '#10b981')}
      ${macroTileHTML('Grasas', tf, GOALS.f, 'g', '#ef4444')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-title">Distribucion de macros — hoy</div>
        ${renderDonut(tk, tp, tc, tf)}
      </div>
      <div class="card">
        <div class="card-title">Progreso semanal</div>
        ${weekHTML}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="card-title" style="margin:0">Mi despensa</div>
          <button class="btn btn-sm" onclick="goTo('despensa')">Ver todo</button>
        </div>
        ${renderPantryDash()}
      </div>
      <div class="card">
        <div class="card-title">Gasto estimado esta semana</div>
        ${renderWeeklySpend()}
      </div>
    </div>`;
}