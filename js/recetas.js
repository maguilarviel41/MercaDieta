let currentFolder = null;
let PUBLIC_RECIPES = [];

function loadPublicRecipes(onReady) {
  fetch('data/recetas_publicas.json')
    .then(r => r.json())
    .then(data => { PUBLIC_RECIPES = data; if (onReady) onReady(); })
    .catch(() => { PUBLIC_RECIPES = []; if (onReady) onReady(); });
}

function getFolders() {
  return load('recipe_folders', []);
}

function saveFolders(folders) {
  save('recipe_folders', folders);
}

function renderRecetas(el) {
  if (currentFolder) renderFolderView(el);
  else renderFoldersOverview(el);
}

function renderFoldersOverview(el) {
  const folders = getFolders();
  const unfiled = RECIPES.filter(r => !r.folder).length;

  const folderCards = folders.map(f => {
    const count = RECIPES.filter(r => r.folder === f.id).length;
    return `
      <div class="rc-card" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:160px;text-align:center;position:relative"
        onclick="openFolder('${f.id}')">
        <button onclick="event.stopPropagation();deleteFolder('${f.id}')" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px">🗑️</button>
        <div style="font-size:36px;margin-bottom:8px">${f.icon || '📁'}</div>
        <div style="font-weight:600;font-size:14px">${f.name}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">${count} comida${count!==1?'s':''}</div>
      </div>`;
  }).join('');

  const unfiledCard = unfiled > 0 ? `
    <div class="rc-card" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:160px;text-align:center"
      onclick="openFolder('_unfiled')">
      <div style="font-size:36px;margin-bottom:8px">📋</div>
      <div style="font-weight:600;font-size:14px">Sin carpeta</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">${unfiled} comida${unfiled!==1?'s':''}</div>
    </div>` : '';

  const publicCard = `
    <div class="rc-card" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:160px;text-align:center;background:var(--green-light);border-color:var(--green)"
      onclick="openFolder('_public')">
      <div style="font-size:36px;margin-bottom:8px">🌍</div>
      <div style="font-weight:600;font-size:14px;color:var(--green)">Comidas de la comunidad</div>
      <div style="font-size:12px;color:var(--green);margin-top:4px">${PUBLIC_RECIPES.length} comida${PUBLIC_RECIPES.length!==1?'s':''}</div>
    </div>`;

  const newFolderCard = `
    <div class="rc-card" style="border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;min-height:160px;cursor:pointer;color:var(--text3)" onclick="createFolder()">
      <div style="text-align:center">
        <div style="font-size:24px;margin-bottom:8px">+</div>
        <div style="font-size:13px">Nueva carpeta</div>
      </div>
    </div>`;

  el.innerHTML = `<div class="rc-grid">${publicCard}${folderCards}${unfiledCard}${newFolderCard}</div>`;
}

function createFolder() {
  let modal = document.getElementById('folder-emoji-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'folder-emoji-modal';
    modal.className = 'modal-bg';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  const FOLDER_EMOJIS = ['🍽️','🌅','☀️','🌙','🍎','🥗','🍚','🥩','🐟','🧀',
    '🍞','🍕','🍰','🥤','🍜','🥘','🍳','🥪','🍲','⭐','📁','💪','🔥','❤️'];

  modal.innerHTML = `
    <div class="modal" style="--modal-w:420px">
      <div class="modal-head">
        <span style="font-weight:600">Nueva carpeta</span>
        <button class="btn btn-sm" onclick="document.getElementById('folder-emoji-modal').classList.remove('open')">✕</button>
      </div>
      <div style="padding:16px">
        <div class="form-group">
          <label class="form-label">Nombre de la carpeta</label>
          <input class="form-input" id="new-folder-name" placeholder="Ej: Desayunos">
        </div>
        <div class="form-group">
          <label class="form-label">Elige un icono</label>
          <div id="folder-emoji-picker" style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-top:6px">
            ${FOLDER_EMOJIS.map((e,i) => `
              <button type="button" onclick="selectFolderEmoji('${e}', this)"
                style="font-size:22px;padding:6px;border-radius:8px;border:2px solid ${i===0?'var(--green)':'transparent'};background:${i===0?'var(--green-light)':'var(--bg)'};cursor:pointer">
                ${e}
              </button>`).join('')}
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="confirmCreateFolder()">Crear carpeta</button>
      </div>
    </div>`;

  window._selectedFolderEmoji = FOLDER_EMOJIS[0];
  modal.classList.add('open');
  setTimeout(() => document.getElementById('new-folder-name')?.focus(), 50);
}

function selectFolderEmoji(emoji, btn) {
  window._selectedFolderEmoji = emoji;
  document.querySelectorAll('#folder-emoji-picker button').forEach(b => {
    b.style.border = '2px solid transparent';
    b.style.background = 'var(--bg)';
  });
  btn.style.border = '2px solid var(--green)';
  btn.style.background = 'var(--green-light)';
}

function confirmCreateFolder() {
  const name = document.getElementById('new-folder-name').value.trim();
  if (!name) { showToast('Ponle un nombre a la carpeta'); return; }
  const icon = window._selectedFolderEmoji || '📁';
  const folders = getFolders();
  folders.push({id: 'f'+Date.now(), name, icon});
  saveFolders(folders);
  document.getElementById('folder-emoji-modal').classList.remove('open');
  renderRecetas(document.getElementById('page-recetas'));
}

function deleteFolder(folderId) {
  if (!confirm('¿Eliminar esta carpeta? Las comidas dentro pasarán a "Sin carpeta".')) return;
  let folders = getFolders().filter(f => f.id !== folderId);
  saveFolders(folders);
  RECIPES.forEach(r => { if (r.folder === folderId) delete r.folder; });
  save('recipes', RECIPES);
  renderRecetas(document.getElementById('page-recetas'));
}

function openFolder(folderId) {
  currentFolder = folderId;
  renderRecetas(document.getElementById('page-recetas'));
}

function backToFolders() {
  currentFolder = null;
  renderRecetas(document.getElementById('page-recetas'));
}

function renderFolderView(el) {
  let recipes, title, icon, isPublic = false;

  if (currentFolder === '_public') {
    recipes = PUBLIC_RECIPES; title = 'Comidas de la comunidad'; icon = '🌍'; isPublic = true;
  } else if (currentFolder === '_unfiled') {
    recipes = RECIPES.filter(r => !r.folder); title = 'Sin carpeta'; icon = '📋';
  } else {
    const folder = getFolders().find(f => f.id === currentFolder);
    recipes = RECIPES.filter(r => r.folder === currentFolder);
    title = folder ? folder.name : 'Carpeta';
    icon = folder ? folder.icon : '📁';
  }

  const cards = recipes.map(r => renderRecipeCard(r, isPublic)).join('');
  const newCard = !isPublic ? `
    <div class="rc-card" style="border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;min-height:200px;cursor:pointer;color:var(--text3)" onclick="openNewRecipeModal()">
      <div style="text-align:center"><div style="font-size:24px;margin-bottom:8px">+</div><div>Nueva comida</div></div>
    </div>` : '';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button onclick="backToFolders()" style="background:none;border:1px solid var(--border);border-radius:var(--rs);padding:6px 12px;font-size:13px;cursor:pointer">← Carpetas</button>
      <span style="font-size:18px">${icon}</span>
      <div style="font-size:15px;font-weight:600">${title}</div>
    </div>
    <div class="rc-grid">${cards}${newCard}</div>`;
}

function renderRecipeCard(r, isPublic) {
  const imgs = (r.ing||[]).map(i => i.thumbnail || (FOODS.find(f => f.id === i.id)?.thumbnail) || '').filter(t => t);
  const cols = imgs.length <= 1 ? 1 : imgs.length <= 4 ? 2 : 3;
  const rows = Math.ceil(imgs.length / cols);
  const imgHeight = rows === 1 ? 120 : rows === 2 ? 80 : 60;
  const mosaic = imgs.length ? `
    <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;border-radius:var(--rs);overflow:hidden;margin-bottom:12px;background:var(--bg)">
      ${imgs.map(t => `<img src="${t}" style="width:100%;height:${imgHeight}px;object-fit:contain;background:#f9fafb;" loading="lazy">`).join('')}
    </div>` : `<div style="height:80px;background:var(--bg);border-radius:var(--rs);margin-bottom:12px;display:flex;align-items:center;justify-content:center;font-size:32px">🍽️</div>`;

  const actions = isPublic
    ? `<button class="btn btn-sm btn-primary" onclick="importPublicRecipe('${r.id}')">+ Añadir a mis comidas</button>`
    : `<div style="display:flex;gap:4px">
        <button class="btn btn-sm" style="border:none;background:none" onclick="moveRecipeToFolder('${r.id}')">📁</button>
        <button class="btn btn-sm" style="border:none;background:none" onclick="editRecipe('${r.id}')">✏️</button>
        <button class="btn btn-sm" style="border:none;background:none" onclick="deleteRecipe('${r.id}')">🗑️</button>
      </div>`;

  return `
    <div class="rc-card">
      ${mosaic}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div class="rc-name">${r.name}</div>
        ${!isPublic ? actions : ''}
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
      ${isPublic ? `<div style="margin-top:10px">${actions}</div>` : ''}
    </div>`;
}

function moveRecipeToFolder(recipeId) {
  const r = RECIPES.find(x => x.id === recipeId);
  if (!r) return;
  const folders = getFolders();
  if (!folders.length) { alert('Primero crea una carpeta desde la vista principal de Mis comidas.'); return; }
  const options = folders.map((f,i) => `${i+1}. ${f.icon} ${f.name}`).join('\n');
  const choice = prompt(`¿A qué carpeta quieres mover "${r.name}"?\n\n${options}\n\n0. Sin carpeta\n\nEscribe el numero:`);
  const idx = parseInt(choice);
  if (isNaN(idx)) return;
  if (idx === 0) delete r.folder;
  else if (folders[idx-1]) r.folder = folders[idx-1].id;
  save('recipes', RECIPES);
  renderRecetas(document.getElementById('page-recetas'));
}

function importPublicRecipe(recipeId) {
  const r = PUBLIC_RECIPES.find(x => x.id === recipeId);
  if (!r) return;
  const copy = {...r, id: 'r'+Date.now(), imported: true, folder: null};
  RECIPES.push(copy);
  save('recipes', RECIPES);
  showToast(`"${r.name}" añadida a tus comidas`);
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
      <input class="form-input" style="flex:2" value="${ing.n}" id="ing-n-${i}" data-food-id="${ing.id||''}" placeholder="Nombre" oninput="recalcRecipeMacros()">
      <input class="form-input" style="width:70px" type="number" value="${ing.q}" id="ing-q-${i}" placeholder="g" oninput="recalcRecipeMacros()">
      <span style="font-size:12px;color:var(--text3)">g</span>
      <button onclick="removeIngRow(${i});recalcRecipeMacros()" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px">✕</button>
    </div>`).join('');

  const folders = getFolders();
  const folderOptions = `<option value="">Sin carpeta</option>` +
    folders.map(f => `<option value="${f.id}" ${r.folder===f.id?'selected':''}>${f.icon} ${f.name}</option>`).join('');

  modal.innerHTML = `
    <div class="modal" style="--modal-w:500px;max-height:85vh;overflow-y:auto">
      <div class="modal-head">
        <span style="font-weight:600">Editar comida</span>
        <button class="btn btn-sm" onclick="document.getElementById('edit-recipe-modal').classList.remove('open')">✕</button>
      </div>
      <div style="padding:16px">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-input" id="er-name" value="${r.name}">
        </div>
        <div class="form-group">
          <label class="form-label">Carpeta</label>
          <select class="form-input" id="er-folder">${folderOptions}</select>
        </div>

        <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">Ingredientes</div>
        <div id="ing-rows">${ingsHTML}</div>
        <button class="btn btn-sm" style="margin-bottom:16px" onclick="addIngRowEdit()">+ Añadir ingrediente</button>

        <div style="background:var(--green-light);border:1px solid var(--green);border-radius:var(--rs);padding:12px;margin-bottom:16px">
          <div style="font-size:11px;font-weight:600;color:var(--green);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Macros totales (calculados automaticamente)</div>
          <div id="recipe-macro-totals" class="grid-4-sm" style="text-align:center"></div>
        </div>

        <button class="btn btn-primary" style="width:100%" onclick="saveEditRecipe('${r.id}')">Guardar cambios</button>
      </div>
    </div>`;

  modal.classList.add('open');
  recalcRecipeMacros();
}

function addIngRowEdit() {
  const rows = document.getElementById('ing-rows');
  const i = rows.children.length;
  const div = document.createElement('div');
  div.id = `ing-row-${i}`;
  div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px';
  div.innerHTML = `
    <input class="form-input" style="flex:2" id="ing-n-${i}" data-food-id="" placeholder="Nombre (busca por texto)" oninput="recalcRecipeMacros()">
    <input class="form-input" style="width:70px" type="number" id="ing-q-${i}" placeholder="g" oninput="recalcRecipeMacros()">
    <span style="font-size:12px;color:var(--text3)">g</span>
    <button onclick="removeIngRow(${i});recalcRecipeMacros()" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px">✕</button>`;
  rows.appendChild(div);
}

function recalcRecipeMacros() {
  const rows = document.getElementById('ing-rows');
  if (!rows) return;
  let totals = {kcal:0, p:0, c:0, f:0};

  [...rows.children].forEach((row, i) => {
    const nameInput = document.getElementById(`ing-n-${i}`);
    const qtyInput = document.getElementById(`ing-q-${i}`);
    if (!nameInput || !qtyInput) return;
    const qty = parseFloat(qtyInput.value) || 0;
    const foodId = nameInput.dataset.foodId;
    let food = foodId ? FOODS.find(f => f.id === foodId) : null;
    if (!food) {
      const name = nameInput.value.trim().toLowerCase();
      food = FOODS.find(f => f.name.toLowerCase().includes(name)) || null;
    }
    if (food && qty) {
      totals.kcal += food.kcal * qty / 100;
      totals.p    += food.p    * qty / 100;
      totals.c    += food.c    * qty / 100;
      totals.f    += food.f    * qty / 100;
    }
  });

  const el = document.getElementById('recipe-macro-totals');
  if (el) {
    el.innerHTML = `
      <div><div style="font-size:18px;font-weight:700;color:#f59e0b">${Math.round(totals.kcal)}</div><div style="font-size:10px;color:var(--text3)">kcal</div></div>
      <div><div style="font-size:18px;font-weight:700;color:#3b82f6">${Math.round(totals.p)}g</div><div style="font-size:10px;color:var(--text3)">prot</div></div>
      <div><div style="font-size:18px;font-weight:700;color:#10b981">${Math.round(totals.c)}g</div><div style="font-size:10px;color:var(--text3)">carbs</div></div>
      <div><div style="font-size:18px;font-weight:700;color:#ef4444">${Math.round(totals.f)}g</div><div style="font-size:10px;color:var(--text3)">grasa</div></div>`;
  }
  window._recipeMacroTotals = totals;
}

function saveEditRecipe(id) {
  const r = RECIPES.find(x => x.id === id);
  if (!r) return;

  r.name = document.getElementById('er-name').value.trim() || r.name;
  const folderVal = document.getElementById('er-folder').value;
  if (folderVal) r.folder = folderVal; else delete r.folder;

  const rows = document.getElementById('ing-rows');
  const ing = [];
  [...rows.children].forEach((row, i) => {
    const nameInput = document.getElementById(`ing-n-${i}`);
    const q = parseFloat(document.getElementById(`ing-q-${i}`)?.value) || 0;
    const n = nameInput?.value.trim();
    if (n) {
      const foodId = nameInput.dataset.foodId;
      const food = foodId ? FOODS.find(f=>f.id===foodId) : FOODS.find(f=>f.name.toLowerCase().includes(n.toLowerCase()));
      ing.push({n, q, u:'g', id: food?.id, thumbnail: food?.thumbnail});
    }
  });
  r.ing = ing;

  const totals = window._recipeMacroTotals || {kcal:0,p:0,c:0,f:0};
  r.kcal = Math.round(totals.kcal);
  r.p = Math.round(totals.p);
  r.c = Math.round(totals.c);
  r.f = Math.round(totals.f);

  save('recipes', RECIPES);
  document.getElementById('edit-recipe-modal').classList.remove('open');
  showToast('Comida actualizada');
  renderRecetas(document.getElementById('page-recetas'));
}

function removeIngRow(i) {
  document.getElementById(`ing-row-${i}`)?.remove();
}
