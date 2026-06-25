let plannerView = 'week';
let plannerDay = 'Lun';

function renderPlanner(el) {
  if (plannerView === 'week') renderPlannerWeek(el);
  else renderPlannerDay(el);
}

function renderPlannerWeek(el) {
  const MEAL_LABELS = {Desayuno:'🌅', Comida:'☀️', Cena:'🌙', Snack:'🍎'};
  const DAY_COLORS = ['#f0fdf4','#eff6ff','#fdf4ff','#fff7ed','#f0fdfa','#fef9c3','#fdf2f8'];
  const DAY_BORDER = ['#00A650','#93c5fd','#d8b4fe','#fed7aa','#99f6e4','#fde047','#f9a8d4'];

  const dayCols = DAYS.map((d, di) => {
    const k = dayKcal(d);
    const p = dayMacro(d,'p'), c = dayMacro(d,'c'), f = dayMacro(d,'f');
    const pct = Math.min(100, Math.round(k/GOALS.kcal*100));

    const mealCards = MEALS.map((meal, mi) => {
      const items = week[d][meal] || [];
      const mm = getMealMacros(d, meal);
      const mkcal = Math.round(mm.kcal);

      const imgs = items.map(item => {
        const food = FOODS.find(x => x.id === item.id);
        return food?.thumbnail || '';
      }).filter(t => t).slice(0, 4);

      const cols = imgs.length <= 1 ? 1 : 2;
      const mosaic = imgs.length ? `
        <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:1px;border-radius:4px;overflow:hidden;margin:4px 0;background:#f3f4f6">
          ${imgs.map(t => `<img src="${t}" style="width:100%;height:30px;object-fit:contain;background:#f9fafb;" loading="lazy">`).join('')}
        </div>` : '';

      const MEAL_COLORS = ['#dbeafe','#dcfce7','#fce7f3','#fef9c3'];
      const MEAL_TEXT = ['#1e40af','#166534','#9d174d','#854d0e'];

      return `
        <div style="border-radius:6px;overflow:hidden;margin-bottom:5px;border:1px solid #e5e7eb">
          <div style="background:${MEAL_COLORS[mi]};padding:3px 8px">
            <span style="font-size:9px;font-weight:700;color:${MEAL_TEXT[mi]};text-transform:uppercase;letter-spacing:.06em">${meal}</span>
          </div>
          <div style="background:white;padding:5px 7px;cursor:pointer" onclick="openModal('${d}','${meal}')">
            ${mosaic}
            ${items.length
              ? `<div style="font-size:10px;font-weight:700;color:#111">${mkcal} kcal</div>
                <div style="display:flex;gap:3px;margin-top:1px">
                  <span style="font-size:9px;color:#3b82f6;font-weight:600">P${Math.round(mm.p)}g</span>
                  <span style="font-size:9px;color:#10b981;font-weight:600">C${Math.round(mm.c)}g</span>
                  <span style="font-size:9px;color:#ef4444;font-weight:600">G${Math.round(mm.f)}g</span>
                </div>`
              : `<div style="font-size:10px;color:#9ca3af">+ añadir</div>`}
          </div>
        </div>`;
    }).join('');

    return `
      <div style="flex:1;min-width:130px">
        <div style="background:${DAY_COLORS[di]};border:1px solid ${DAY_BORDER[di]};border-radius:8px 8px 0 0;padding:10px 10px 8px;border-bottom:3px solid ${DAY_BORDER[di]}">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <div style="font-size:13px;font-weight:800;color:#111">${d}</div>
            <div style="font-size:13px;font-weight:700;color:${k?'#111':'#9ca3af'}">${k||'—'}${k?'<span style="font-size:9px;font-weight:400;color:#6b7280"> kcal</span>':''}</div>
          </div>
          ${k ? `
            <div style="height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-bottom:4px">
              <div style="width:${pct}%;height:100%;background:${DAY_BORDER[di]};border-radius:2px"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:9px;color:#6b7280;font-weight:500">
              <span>P${p}g</span><span>C${c}g</span><span>G${f}g</span>
            </div>` : `<div style="font-size:10px;color:#9ca3af">Sin planificar</div>`}
        </div>
        <div style="background:${DAY_COLORS[di]};border:1px solid ${DAY_BORDER[di]};border-top:none;border-radius:0 0 8px 8px;padding:6px">
          ${mealCards}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="view-toggle">
        <button class="vt-btn active">Vista semana</button>
        <button class="vt-btn" onclick="plannerView='day';renderPlanner(document.getElementById('page-planner'))">Vista dia</button>
      </div>
      <div style="font-size:12px;color:var(--text3)">Pulsa una comida para añadir alimentos</div>
    </div>
    <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;align-items:flex-start">
      ${dayCols}
    </div>`;
}

function switchToDay(day) {
  plannerDay = day;
  plannerView = 'day';
  renderPlanner(document.getElementById('page-planner'));
}

function renderPlannerDay(el) {
  const dayTabs = DAYS.map(d => {
    const k = dayKcal(d);
    return `<button class="day-tab${d===plannerDay?' active':''}" onclick="plannerDay='${d}';renderPlanner(document.getElementById('page-planner'))">
      ${d}<span class="dt-kcal">${k ? k+' kcal' : '—'}</span>
    </button>`;
  }).join('');

  const totKcal = dayKcal(plannerDay);
  const totP = dayMacro(plannerDay,'p');
  const totC = dayMacro(plannerDay,'c');
  const totF = dayMacro(plannerDay,'f');

  const totalsHTML = `<div class="day-totals">
    <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Totales del dia</div>
    <div class="day-totals-grid">
      <div class="dt-item"><div class="dt-val" style="color:#f59e0b">${totKcal}</div><div class="dt-lbl">kcal</div><div class="dt-pct">${Math.round(totKcal/GOALS.kcal*100)}% objetivo</div></div>
      <div class="dt-item"><div class="dt-val" style="color:#3b82f6">${totP}g</div><div class="dt-lbl">proteina</div><div class="dt-pct">${Math.round(totP/GOALS.p*100)}% objetivo</div></div>
      <div class="dt-item"><div class="dt-val" style="color:#10b981">${totC}g</div><div class="dt-lbl">carbos</div><div class="dt-pct">${Math.round(totC/GOALS.c*100)}% objetivo</div></div>
      <div class="dt-item"><div class="dt-val" style="color:#ef4444">${totF}g</div><div class="dt-lbl">grasas</div><div class="dt-pct">${Math.round(totF/GOALS.f*100)}% objetivo</div></div>
    </div>
    <div class="pbar" style="margin-top:12px">
      <div class="pfill" style="width:${Math.min(100,Math.round(totKcal/GOALS.kcal*100))}%;background:#f59e0b"></div>
    </div>
  </div>`;

  const mealsHTML = MEALS.map((meal, mi) => {
    const items = week[plannerDay][meal] || [];
    const mm = getMealMacros(plannerDay, meal);
    const macroBar = items.length ? `<div class="meal-section-macros">
      <span class="meal-macro-pill p-kcal">${Math.round(mm.kcal)} kcal</span>
      <span class="meal-macro-pill p-prot">P: ${Math.round(mm.p)}g</span>
      <span class="meal-macro-pill p-carb">C: ${Math.round(mm.c)}g</span>
      <span class="meal-macro-pill p-fat">G: ${Math.round(mm.f)}g</span>
    </div>` : '';

    const saveMealBtn = items.length
      ? `<button class="btn btn-sm" style="font-size:11px;margin-left:8px" onclick="saveMealAsRecipe('${plannerDay}','${meal}')">💾 Guardar</button>`
      : '';

    const foodsHTML = items.map((item,i) => {
      const f = FOODS.find(x=>x.id===item.id);
      if (!f) return '';
      const ikcal=Math.round(f.kcal*item.qty/100), ip=Math.round(f.p*item.qty/100), ic=Math.round(f.c*item.qty/100), iff=Math.round(f.f*item.qty/100);
      const img = f.thumbnail
        ? `<img src="${f.thumbnail}" class="mfi-img" loading="lazy">`
        : `<div class="mfi-img-placeholder">🥦</div>`;
      return `<div class="meal-food-item">
        ${img}
        <div style="flex:1;min-width:0">
          <div class="mfi-name">${f.name}</div>
          <div class="mfi-brand">${f.brand}</div>
          <div class="mfi-macros" style="margin-top:4px">
            <span class="meal-macro-pill p-kcal" style="font-size:10px">${ikcal}kcal</span>
            <span class="meal-macro-pill p-prot" style="font-size:10px">P${ip}g</span>
            <span class="meal-macro-pill p-carb" style="font-size:10px">C${ic}g</span>
            <span class="meal-macro-pill p-fat" style="font-size:10px">G${iff}g</span>
          </div>
        </div>
        <div class="mfi-qty">${item.qty}g</div>
        <button class="mfi-del" onclick="removeFood('${plannerDay}','${meal}',${i})">✕</button>
      </div>`;
    }).join('');

    return `<div class="meal-section">
      <div class="meal-section-header">
        <div class="meal-section-title">${meal}</div>
        <div style="display:flex;align-items:center">${macroBar}${saveMealBtn}</div>
      </div>
      <div class="meal-food-list">${foodsHTML}</div>
      <button class="add-slot" style="margin-top:8px" onclick="openModal('${plannerDay}','${meal}')">+ añadir alimento</button>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="view-toggle">
        <button class="vt-btn" onclick="plannerView='week';renderPlanner(document.getElementById('page-planner'))">Vista semana</button>
        <button class="vt-btn active">Vista dia</button>
      </div>
    </div>
    <div class="day-tabs">${dayTabs}</div>
    ${totalsHTML}
    ${mealsHTML}`;
}

function removeFood(day, meal, idx) {
  const item = week[day][meal][idx];
  pantryRestore(item.id, item.qty);
  week[day][meal].splice(idx, 1);
  save('week', week);
  renderPlanner(document.getElementById('page-planner'));
}

function saveMealAsRecipe(day, meal) {
  const items = week[day][meal] || [];
  if (!items.length) return;
  const name = prompt(`Nombre para guardar esta comida:`, meal);
  if (!name) return;
  const mm = getMealMacros(day, meal);
  const ing = items.map(item => {
    const f = FOODS.find(x => x.id === item.id);
    return {
      id: item.id,
      n: f ? f.name.replace(' Hacendado','') : item.name,
      q: item.qty,
      u: 'g',
      thumbnail: f ? f.thumbnail : '',
    };
  });
  RECIPES.push({
    id: 'r' + Date.now(),
    name,
    kcal: Math.round(mm.kcal),
    p: Math.round(mm.p),
    c: Math.round(mm.c),
    f: Math.round(mm.f),
    ing,
  });
  save('recipes', RECIPES);
  showToast(`"${name}" guardada en Mis comidas`);
}