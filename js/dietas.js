// ── Mis dietas guardadas ───────────────────────────────────────────────────

function getSavedDiets() {
  return load('saved_diets', []);
}

function renderDietas(el) {
  const diets = getSavedDiets();

  if (!diets.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:12px">🗂️</div>
        <div style="font-size:15px;font-weight:500;color:var(--text2);margin-bottom:8px">No tienes dietas guardadas</div>
        <div style="font-size:13px">Ve al Planificador y pulsa "Guardar dieta" para guardar tu semana actual</div>
      </div>`;
    return;
  }

  const cards = diets.map(diet => {
    const days = Object.keys(diet.week || {});
    const totalKcal = days.reduce((a, d) => {
      return a + MEALS.reduce((b, m) => b + (diet.week[d][m]||[]).reduce((c, item) => {
        const f = FOODS.find(x => x.id === item.id);
        return c + (f ? f.kcal*item.qty/100 : 0);
      }, 0), 0);
    }, 0);
    const avgKcal = Math.round(totalKcal / 7);
    const daysWithFood = days.filter(d => MEALS.some(m => (diet.week[d][m]||[]).length > 0)).length;

    return `
      <div class="rc-card" style="cursor:pointer" onclick="previewDiet('${diet.id}')">
        <div style="height:80px;background:var(--green-light);border-radius:var(--rs);margin-bottom:12px;display:flex;align-items:center;justify-content:center;font-size:32px">🗂️</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div class="rc-name">${diet.name}</div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm" style="border:none;background:none" onclick="event.stopPropagation();loadSavedDiet('${diet.id}')" title="Cargar">📂</button>
            <button class="btn btn-sm" style="border:none;background:none" onclick="event.stopPropagation();deleteSavedDiet('${diet.id}')">🗑️</button>
          </div>
        </div>
        <div class="rc-pills">
          <span class="pill p-kcal">~${avgKcal} kcal/dia</span>
          <span class="pill p-prot">${daysWithFood}/7 dias planificados</span>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
          Guardada el ${new Date(parseInt(diet.id.replace('d',''))).toLocaleDateString('es-ES')}
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:10px" onclick="event.stopPropagation();previewDiet('${diet.id}')">👁️ Ver dieta</button>
      </div>`;
  }).join('');

  el.innerHTML = `<div class="rc-grid">${cards}</div>`;
}

function loadSavedDiet(dietId) {
  const diets = getSavedDiets();
  const diet = diets.find(d => d.id === dietId);
  if (!diet) return;
  if (!confirm(`¿Cargar "${diet.name}"? Esto reemplazara tu planificacion actual de la semana.`)) return;
  week = JSON.parse(JSON.stringify(diet.week));
  save('week', week);
  showToast(`"${diet.name}" cargada`);
  goTo('planner');
}

function deleteSavedDiet(dietId) {
  if (!confirm('¿Eliminar esta dieta guardada?')) return;
  let diets = getSavedDiets().filter(d => d.id !== dietId);
  save('saved_diets', diets);
  renderDietas(document.getElementById('page-dietas'));
}

let editingDietId = null;

function previewDiet(dietId) {
  const diets = getSavedDiets();
  const diet = diets.find(d => d.id === dietId);
  if (!diet) return;

  let modal = document.getElementById('diet-preview-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'diet-preview-modal';
    modal.className = 'modal-bg';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  const daysHTML = DAYS.map(d => {
    const dayData = diet.week[d] || {};
    const kcal = MEALS.reduce((a,m) => a + (dayData[m]||[]).reduce((b,item) => {
      const f = FOODS.find(x=>x.id===item.id);
      return b + (f ? f.kcal*item.qty/100 : 0);
    }, 0), 0);

    const mealsHTML = MEALS.map(m => {
      const items = dayData[m] || [];
      if (!items.length) return '';
      return `<div style="font-size:10px;color:var(--text2);margin-bottom:2px"><strong>${m}:</strong> ${items.map(i=>i.name.replace(' Hacendado','')).join(', ')}</div>`;
    }).join('');

    return `
      <div style="background:var(--bg);border-radius:var(--rs);padding:10px;margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <strong style="font-size:12px">${d}</strong>
          <span style="font-size:12px;color:var(--text2)">${Math.round(kcal)} kcal</span>
        </div>
        ${mealsHTML || '<div style="font-size:10px;color:var(--text3);font-style:italic">Sin planificar</div>'}
      </div>`;
  }).join('');

  modal.innerHTML = `
    <div class="modal" style="width:480px;max-height:80vh;overflow-y:auto">
      <div class="modal-head">
        <span style="font-weight:600">${diet.name}</span>
        <button class="btn btn-sm" onclick="document.getElementById('diet-preview-modal').classList.remove('open')">✕</button>
      </div>
      <div style="padding:16px">
        ${daysHTML}
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" style="flex:1" onclick="editSavedDiet('${diet.id}')">✏️ Editar en planificador</button>
          <button class="btn" onclick="loadSavedDiet('${diet.id}')">📂 Cargar (nueva copia)</button>
        </div>
      </div>
    </div>`;
  modal.classList.add('open');
}

function editSavedDiet(dietId) {
  const diets = getSavedDiets();
  const diet = diets.find(d => d.id === dietId);
  if (!diet) return;

  week = JSON.parse(JSON.stringify(diet.week));
  save('week', week);
  editingDietId = dietId; // marca que estamos editando esta dieta especifica
  document.getElementById('diet-preview-modal')?.classList.remove('open');
  showToast(`Editando "${diet.name}" — al guardar se actualizara`);
  goTo('planner');
}