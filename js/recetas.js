function renderRecetas(el) {
  const cards = RECIPES.map(r => {
    const imgs = (r.ing||[])
      .map(i => i.thumbnail || (FOODS.find(f => f.id === i.id)?.thumbnail) || '')
      .filter(t => t);
    const cols = imgs.length <= 1 ? 1 : imgs.length <= 4 ? 2 : 3;
    const rows = Math.ceil(imgs.length / cols);
    const imgHeight = rows === 1 ? 120 : rows === 2 ? 80 : 60;
    const mosaic = imgs.length ? `
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;border-radius:var(--rs);overflow:hidden;margin-bottom:12px;background:var(--bg)">
        ${imgs.map(t => `<img src="${t}" style="width:100%;height:${imgHeight}px;object-fit:contain;background:#f9fafb;" loading="lazy">`).join('')}
      </div>` : `<div style="height:80px;background:var(--bg);border-radius:var(--rs);margin-bottom:12px;display:flex;align-items:center;justify-content:center;font-size:32px">🍽️</div>`;

    return `
      <div class="rc-card">
        ${mosaic}
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div class="rc-name">${r.name}</div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm" style="border:none;background:none" onclick="editRecipe('${r.id}')">✏️</button>
            <button class="btn btn-sm" style="border:none;background:none" onclick="deleteRecipe('${r.id}')">🗑️</button>
          </div>
        </div>
        <div class="rc-pills">
          <span class="pill p-kcal">${r.kcal} kcal</span>
          <span class="pill p-prot">P: ${r.p}g</span>
          <span class="pill p-carb">C: ${r.c}g</span>
          <span class="pill p-fat">G: ${r.f}g</span>
        </div>
        <div style="padding-top:10px;border-top:1px solid var(--border);margin-top:10px">
          ${(r.ing||[]).map(i => `<div class="rc-ing">· ${i.n} — ${i.q}${i.u}</div>`).join('')}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="rc-grid">
      ${cards}
      <div class="rc-card" style="border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;min-height:200px;cursor:pointer;color:var(--text3)" onclick="openNewRecipeModal()">
        <div style="text-align:center">
          <div style="font-size:24px;margin-bottom:8px">+</div>
          <div>Nueva comida</div>
        </div>
      </div>
    </div>`;
}

function deleteRecipe(id) {
  if (!confirm('¿Eliminar esta comida?')) return;
  const idx = RECIPES.findIndex(r => r.id===id);
  if (idx === -1) return;
  RECIPES.splice(idx, 1);
  save('recipes', RECIPES);
  renderRecetas(document.getElementById('page-recetas'));
}

function editRecipe(id) {
  const r = RECIPES.find(x => x.id === id);
  if (!r) return;

  let modal = document.getElementById('edit-recipe-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edit-recipe-modal';
    modal.className = 'modal-bg';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  const ingsHTML = (r.ing||[]).map((ing, i) => `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px" id="ing-row-${i}">
      <input class="form-input" style="flex:2" value="${ing.n}" id="ing-n-${i}" placeholder="Nombre">
      <input class="form-input" style="width:60px" type="number" value="${ing.q}" id="ing-q-${i}" placeholder="g">
      <span style="font-size:12px;color:var(--text3)">g</span>
      <button onclick="removeIngRow(${i})" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px">✕</button>
    </div>`).join('');

  modal.innerHTML = `
    <div class="modal" style="width:500px;max-height:85vh;overflow-y:auto">
      <div class="modal-head">
        <span style="font-weight:600">Editar comida</span>
        <button class="btn btn-sm" onclick="document.getElementById('edit-recipe-modal').classList.remove('open')">✕</button>
      </div>
      <div style="padding:16px">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-input" id="er-name" value="${r.name}">
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
          <div class="form-group">
            <label class="form-label">kcal</label>
            <input class="form-input" id="er-kcal" type="number" value="${r.kcal}">
          </div>
          <div class="form-group">
            <label class="form-label">Prot (g)</label>
            <input class="form-input" id="er-p" type="number" value="${r.p}">
          </div>
          <div class="form-group">
            <label class="form-label">Carbs (g)</label>
            <input class="form-input" id="er-c" type="number" value="${r.c}">
          </div>
          <div class="form-group">
            <label class="form-label">Grasa (g)</label>
            <input class="form-input" id="er-f" type="number" value="${r.f}">
          </div>
        </div>
        <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">Ingredientes</div>
        <div id="ing-rows">${ingsHTML}</div>
        <button class="btn btn-sm" style="margin-bottom:12px" onclick="addIngRow()">+ Añadir ingrediente</button>
        <button class="btn btn-primary" style="width:100%" onclick="saveEditRecipe('${r.id}')">Guardar cambios</button>
      </div>
    </div>`;

  modal.classList.add('open');
  window._editRecipeId = id;
}

function addIngRow() {
  const rows = document.getElementById('ing-rows');
  const i = rows.children.length;
  const div = document.createElement('div');
  div.id = `ing-row-${i}`;
  div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px';
  div.innerHTML = `
    <input class="form-input" style="flex:2" id="ing-n-${i}" placeholder="Nombre">
    <input class="form-input" style="width:60px" type="number" id="ing-q-${i}" placeholder="g">
    <span style="font-size:12px;color:var(--text3)">g</span>
    <button onclick="removeIngRow(${i})" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px">✕</button>`;
  rows.appendChild(div);
}

function removeIngRow(i) {
  document.getElementById(`ing-row-${i}`)?.remove();
}

function saveEditRecipe(id) {
  const r = RECIPES.find(x => x.id === id);
  if (!r) return;

  r.name = document.getElementById('er-name').value.trim() || r.name;
  r.kcal = parseFloat(document.getElementById('er-kcal').value) || 0;
  r.p    = parseFloat(document.getElementById('er-p').value) || 0;
  r.c    = parseFloat(document.getElementById('er-c').value) || 0;
  r.f    = parseFloat(document.getElementById('er-f').value) || 0;

  const rows = document.getElementById('ing-rows');
  const ing = [];
  [...rows.children].forEach((row, i) => {
    const n = document.getElementById(`ing-n-${i}`)?.value.trim();
    const q = parseFloat(document.getElementById(`ing-q-${i}`)?.value) || 0;
    if (n) ing.push({n, q, u:'g', id: r.ing?.[i]?.id, thumbnail: r.ing?.[i]?.thumbnail});
  });
  r.ing = ing;

  save('recipes', RECIPES);
  document.getElementById('edit-recipe-modal').classList.remove('open');
  showToast('Comida actualizada');
  renderRecetas(document.getElementById('page-recetas'));
}

function openNewRecipeModal() {
  const name = prompt('Nombre de la comida:');
  if (!name) return;
  RECIPES.push({
    id: 'r'+Date.now(),
    name, kcal:0, p:0, c:0, f:0, ing:[]
  });
  save('recipes', RECIPES);
  renderRecetas(document.getElementById('page-recetas'));
}