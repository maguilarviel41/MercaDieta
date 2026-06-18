let plannerView = 'week';
let plannerDay = 'Lun';

function renderPlanner(el) {
  if (plannerView === 'week') renderPlannerWeek(el);
  else renderPlannerDay(el);
}

function renderPlannerWeek(el) {
  const headers = DAYS.map(d => {
    const k = dayKcal(d);
    return `<div class="wg-h" style="cursor:pointer" onclick="switchToDay('${d}')">
      ${d}<div class="day-kcal">${k ? k+' kcal' : '—'}</div>
    </div>`;
  }).join('');

  const rows = MEALS.map((meal, mi) => {
    const cls = MEAL_CLS[mi];
    const cells = DAYS.map(day => {
      const items = week[day][meal] || [];
      const mkcal = Math.round(items.reduce((a,i) => {
        const f = FOODS.find(x=>x.id===i.id);
        return a + (f ? f.kcal*i.qty/100 : 0);
      }, 0));
      const tags = items.map((item,i) => `
        <div class="ftag ${cls}">
          <span class="ftag-name">${item.name.replace(' Hacendado','').replace(' fresco','')}</span>
          <span class="ftag-qty">${item.qty}g</span>
          <span class="ftag-del" onclick="removeFood('${day}','${meal}',${i})">✕</span>
        </div>`).join('');
      const kcalTag = items.length ? `<div style="font-size:10px;color:var(--text3);margin-top:3px">${mkcal} kcal</div>` : '';
      return `<div class="wg-c">${tags}${kcalTag}<button class="add-slot" onclick="openModal('${day}','${meal}')">+ añadir</button></div>`;
    }).join('');
    return `<div class="wg-ml">${meal}</div>${cells}`;
  }).join('');

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="view-toggle">
        <button class="vt-btn active">Vista semana</button>
        <button class="vt-btn" onclick="plannerView='day';renderPlanner(document.getElementById('page-planner'))">Vista dia</button>
      </div>
      <div style="font-size:12px;color:var(--text3)">Pulsa un dia para ver detalle</div>
    </div>
    <div class="week-wrap"><div class="wgrid"><div class="wg-h"></div>${headers}${rows}</div></div>`;
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
        ${macroBar}
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
