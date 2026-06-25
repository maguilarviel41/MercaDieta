let alimentosCategory = null;

const CATEGORY_ICONS = {
  'Aceite, especias y salsas': '🫒',
  'Agua y refrescos': '💧',
  'Aperitivos': '🍿',
  'Arroz, legumbres y pasta': '🍚',
  'Bodega': '🍷',
  'Cacao, cafe e infusiones': '☕',
  'Carne y charcuteria': '🥩',
  'Cereales y galletas': '🥣',
  'Congelados': '🧊',
  'Conservas y cocido': '🥫',
  'Dulces y snacks': '🍫',
  'Frutas y verduras': '🥦',
  'Huevos, leche y mantequilla': '🥛',
  'Lacteos y quesos': '🧀',
  'Marisco y pescado': '🐟',
  'Pan y bolleria': '🍞',
  'Parafarmacia': '💊',
  'Pasteleria y helados': '🍦',
  'Pizzas y platos preparados': '🍕',
  'Postres y yogures': '🍮',
  'Zumos': '🍊',
};

function getCategoryIcon(cat) {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (cat.toLowerCase().includes(key.toLowerCase().split(' ')[0])) return icon;
  }
  return '🛒';
}

function renderAlimentos(el) {
  const q = document.getElementById('food-search')?.value || '';
  el.innerHTML = `
    <div class="search-bar" style="margin-bottom:20px">
      <input id="food-search" placeholder="Buscar en todos los alimentos..." oninput="filterFoods()" value="${q}"/>
    </div>
    <div id="alimentos-content"></div>`;
  if (q.trim().length >= 2) filterFoods();
  else if (alimentosCategory) renderCategoryProducts(alimentosCategory);
  else renderCategories();
}

function renderCategories() {
  const content = document.getElementById('alimentos-content');
  if (!content) return;
  const catsWithMacros = {};
  FOODS.forEach(f => {
    const cat = f.category || 'Otros';
    if (!catsWithMacros[cat]) catsWithMacros[cat] = 0;
    catsWithMacros[cat]++;
  });
  const catsTotal = {};
  (CATALOG || []).forEach(p => {
    const cat = p.category || 'Otros';
    if (!catsTotal[cat]) catsTotal[cat] = 0;
    catsTotal[cat]++;
  });
  const allCats = new Set([...Object.keys(catsWithMacros), ...Object.keys(catsTotal)]);
  const sorted = [...allCats].map(cat => ({
    cat,
    withMacros: catsWithMacros[cat] || 0,
    total: catsTotal[cat] || catsWithMacros[cat] || 0,
  })).sort((a,b) => b.total - a.total);
  content.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px">
      ${sorted.map(({cat, withMacros, total}) => `
        <div onclick="selectCategory('${cat.replace(/'/g,"\\'")}')"
          style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px 12px;text-align:center;cursor:pointer;transition:all 0.15s"
          onmouseover="this.style.borderColor='var(--green)';this.style.background='var(--green-light)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--surface)'">
          <div style="font-size:32px;margin-bottom:8px">${getCategoryIcon(cat)}</div>
          <div style="font-size:12px;font-weight:600;color:var(--text);line-height:1.3">${cat}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">
            <span style="color:var(--green);font-weight:500">${withMacros}</span>/${total} productos
          </div>
        </div>`).join('')}
    </div>`;
}

function selectCategory(cat) {
  alimentosCategory = cat;
  renderCategoryProducts(cat);
}

function renderCategoryProducts(cat) {
  const content = document.getElementById('alimentos-content');
  if (!content) return;
  const withMacros = FOODS.filter(f => (f.category || 'Otros') === cat);
  const withMacrosIds = new Set(withMacros.map(f => f.id));
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button onclick="backToCategories()" style="background:none;border:1px solid var(--border);border-radius:var(--rs);padding:6px 12px;font-size:13px;cursor:pointer">← Categorias</button>
      <span style="font-size:16px">${getCategoryIcon(cat)}</span>
      <div>
        <div style="font-size:15px;font-weight:600">${cat}</div>
        <div style="font-size:12px;color:var(--text3)" id="cat-count">${withMacros.length} productos con macros · cargando...</div>
      </div>
    </div>
    <div class="foods-grid" id="foods-grid">${renderFoodCards(withMacros, [])}</div>`;
  loadFullCatalog(catalog => {
    const withoutMacros = catalog.filter(p => (p.category || 'Otros') === cat && !withMacrosIds.has(p.id));
    const grid = document.getElementById('foods-grid');
    const countEl = document.getElementById('cat-count');
    if (grid) grid.innerHTML = renderFoodCards(withMacros, withoutMacros);
    if (countEl) countEl.textContent = `${withMacros.length} con macros · ${withoutMacros.length} sin macros`;
  });
}

function backToCategories() {
  alimentosCategory = null;
  renderCategories();
}

function filterFoods() {
  const q = document.getElementById('food-search')?.value || '';
  const content = document.getElementById('alimentos-content');
  if (!content) return;
  if (q.trim().length < 2) {
    if (alimentosCategory) renderCategoryProducts(alimentosCategory);
    else renderCategories();
    return;
  }
  const filtered = FOODS.filter(f =>
    f.name.toLowerCase().includes(q.toLowerCase()) ||
    f.brand.toLowerCase().includes(q.toLowerCase()) ||
    (f.category||'').toLowerCase().includes(q.toLowerCase())
  );
  content.innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px">
      ${filtered.length} resultado${filtered.length!==1?'s':''} para "<strong>${q}</strong>"
    </div>
    <div class="foods-grid">${renderFoodCards(filtered, [])}</div>`;
}

function renderFoodCards(withMacros, withoutMacros) {
  const macroCards = withMacros.map(f => `
    <div class="fc" style="cursor:pointer" onclick="openProductModal('${f.id}', true)">
      ${f.thumbnail ? `<img src="${f.thumbnail}" style="width:100%;height:110px;object-fit:contain;border-radius:var(--rs);margin-bottom:10px;background:#f9fafb;" loading="lazy">` : ''}
      <div class="fc-name">${f.name}</div>
      <div class="fc-brand">${f.brand}${f.category?` · <span style="color:var(--green)">${f.category}</span>`:''}</div>
      <div class="fc-macros" style="margin-top:8px">
        <div class="fc-m"><div class="val" style="color:#f59e0b">${f.kcal}</div><div class="lbl">kcal</div></div>
        <div class="fc-m"><div class="val" style="color:#3b82f6">${f.p}g</div><div class="lbl">prot</div></div>
        <div class="fc-m"><div class="val" style="color:#10b981">${f.c}g</div><div class="lbl">carbs</div></div>
        <div class="fc-m"><div class="val" style="color:#ef4444">${f.f}g</div><div class="lbl">grasa</div></div>
      </div>
      <div class="fc-price"><span>${f.price}€/${f.unit}</span><span style="color:var(--text3)">por 100g</span></div>
      <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="event.stopPropagation();addToPantryModal('${f.id}')">+ Despensa</button>
    </div>`).join('');

  const noMacroCards = withoutMacros.map(p => `
    <div class="fc" style="opacity:0.5;cursor:pointer;position:relative" onclick="openProductModal('${p.id}', false)">
      <div style="position:absolute;top:8px;right:8px;font-size:16px">🔒</div>
      ${p.thumbnail ? `<img src="${p.thumbnail}" style="width:100%;height:110px;object-fit:contain;border-radius:var(--rs);margin-bottom:10px;background:#f9fafb;filter:grayscale(0.5);" loading="lazy">` : ''}
      <div class="fc-name">${p.name}</div>
      <div class="fc-brand">${p.brand}</div>
      <div class="fc-macros" style="margin-top:8px">
        <div class="fc-m"><div class="val" style="color:#9ca3af">—</div><div class="lbl">kcal</div></div>
        <div class="fc-m"><div class="val" style="color:#9ca3af">—</div><div class="lbl">prot</div></div>
        <div class="fc-m"><div class="val" style="color:#9ca3af">—</div><div class="lbl">carbs</div></div>
        <div class="fc-m"><div class="val" style="color:#9ca3af">—</div><div class="lbl">grasa</div></div>
      </div>
      <div class="fc-price"><span>${p.price}€/${p.unit}</span><span style="color:var(--text3)">sin macros</span></div>
      <button class="btn btn-sm" style="width:100%;margin-top:8px;border-color:var(--green);color:var(--green)" onclick="event.stopPropagation();openUnlockModal('${p.id}')">🔓 Añadir macros</button>
    </div>`).join('');

  if (!macroCards && !noMacroCards) return `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3)">Sin productos</div>`;
  return macroCards + noMacroCards;
}

function openProductModal(foodId, hasMacros) {
  const f = hasMacros ? FOODS.find(x => x.id === foodId) : (CATALOG||[]).find(x => x.id === foodId);
  if (!f) return;
  let modal = document.getElementById('product-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'product-modal';
    modal.className = 'modal-bg';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  const macrosHTML = hasMacros ? `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
      <div style="text-align:center;background:var(--bg);border-radius:var(--rs);padding:10px"><div style="font-size:20px;font-weight:700;color:#f59e0b">${f.kcal||'—'}</div><div style="font-size:10px;color:var(--text3)">kcal</div></div>
      <div style="text-align:center;background:var(--bg);border-radius:var(--rs);padding:10px"><div style="font-size:20px;font-weight:700;color:#3b82f6">${f.p||f.protein||'—'}g</div><div style="font-size:10px;color:var(--text3)">proteina</div></div>
      <div style="text-align:center;background:var(--bg);border-radius:var(--rs);padding:10px"><div style="font-size:20px;font-weight:700;color:#10b981">${f.c||f.carbs||'—'}g</div><div style="font-size:10px;color:var(--text3)">carbos</div></div>
      <div style="text-align:center;background:var(--bg);border-radius:var(--rs);padding:10px"><div style="font-size:20px;font-weight:700;color:#ef4444">${f.f||f.fat||'—'}g</div><div style="font-size:10px;color:var(--text3)">grasa</div></div>
    </div>` : `
    <div style="background:#fef3c7;border-radius:var(--rs);padding:10px;font-size:13px;color:#92400e;margin-bottom:16px">
      Sin macros — <button onclick="openUnlockModal('${f.id}')" style="background:none;border:none;color:var(--green);font-weight:600;cursor:pointer">Añadir macros</button>
    </div>`;
  modal.innerHTML = `
    <div class="modal" style="width:520px;max-height:85vh;overflow-y:auto">
      <div class="modal-head">
        <span style="font-weight:600;font-size:14px">${f.name}</span>
        <button class="btn btn-sm" onclick="document.getElementById('product-modal').classList.remove('open')">✕</button>
      </div>
      <div style="padding:16px">
        ${f.thumbnail ? `<img src="${f.thumbnail}" style="width:100%;height:160px;object-fit:contain;border-radius:var(--r);background:#f9fafb;margin-bottom:16px">` : ''}
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div>
            <div style="font-size:16px;font-weight:700">${f.name}</div>
            <div style="font-size:13px;color:var(--text2)">${f.brand} · ${f.category||''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:18px;font-weight:700;color:var(--green)">${f.price}€</div>
            <div style="font-size:11px;color:var(--text3)">por ${f.unit_size||1}${f.unit}</div>
          </div>
        </div>
        ${macrosHTML}
        ${f.description ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Descripcion</div><div style="font-size:13px;color:var(--text2)">${f.description}</div></div>` : ''}
        ${f.ingredients ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Ingredientes</div><div style="font-size:12px;color:var(--text2)">${f.ingredients.replace(/<[^>]*>/g,'')}</div></div>` : ''}
        ${f.allergens ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Alergenos</div><div style="font-size:12px;color:var(--text2)">${f.allergens.replace(/<[^>]*>/g,'')}</div></div>` : ''}
        ${f.storage_instructions ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Conservacion</div><div style="font-size:12px;color:var(--text2)">${f.storage_instructions}</div></div>` : ''}
        ${f.usage_instructions ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Modo de uso</div><div style="font-size:12px;color:var(--text2)">${f.usage_instructions}</div></div>` : ''}
        ${f.suppliers?.length ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Proveedor</div><div style="font-size:12px;color:var(--text2)">${f.suppliers.join(', ')}</div></div>` : ''}
        <div style="display:flex;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          ${hasMacros
            ? `<button class="btn btn-primary" style="flex:1" onclick="addToPantryModal('${f.id}');document.getElementById('product-modal').classList.remove('open')">+ Añadir a despensa</button>
               <button class="btn" onclick="editFoodMacros('${f.id}')">✏️ Editar</button>`
            : `<button class="btn btn-primary" style="flex:1" onclick="openUnlockModal('${f.id}')">🔓 Añadir macros</button>`}
          ${f.share_url ? `<a href="${f.share_url}" target="_blank" class="btn" style="text-decoration:none">Ver en Mercadona ↗</a>` : ''}
        </div>
      </div>
    </div>`;
  modal.classList.add('open');
}

function openUnlockModal(productId) {
  const p = (CATALOG||[]).find(x => x.id === productId) || FOODS.find(x => x.id === productId);
  if (!p) return;
  window._addFoodSelected = p;
  let modal = document.getElementById('unlock-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'unlock-modal';
    modal.className = 'modal-bg';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal" style="width:460px">
      <div class="modal-head">
        <span>🔓</span>
        <span style="font-weight:500;font-size:13px">Añadir macros</span>
        <button class="btn btn-sm" onclick="document.getElementById('unlock-modal').classList.remove('open')">✕</button>
      </div>
      <div style="padding:16px">
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--green-light);border-radius:var(--rs);border:1px solid var(--green);margin-bottom:16px">
          ${p.thumbnail ? `<img src="${p.thumbnail}" style="width:40px;height:40px;object-fit:contain;border-radius:4px;background:white;flex-shrink:0">` : ''}
          <div>
            <div style="font-weight:600;font-size:13px">${p.name}</div>
            <div style="font-size:11px;color:var(--text2)">${p.brand} · ${p.price}€/${p.unit}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:12px">Introduce los macros por 100g (los encontraras en el envase)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group"><label class="form-label">Calorias (kcal)</label><input class="form-input" id="ul-kcal" type="number" step="0.1" placeholder="344"></div>
          <div class="form-group"><label class="form-label">Proteina (g)</label><input class="form-input" id="ul-p" type="number" step="0.1" placeholder="8.2"></div>
          <div class="form-group"><label class="form-label">Carbohidratos (g)</label><input class="form-input" id="ul-c" type="number" step="0.1" placeholder="75"></div>
          <div class="form-group"><label class="form-label">Grasas (g)</label><input class="form-input" id="ul-f" type="number" step="0.1" placeholder="1"></div>
          <div class="form-group"><label class="form-label">Fibra (g)</label><input class="form-input" id="ul-fiber" type="number" step="0.1" placeholder="0.3"></div>
          <div class="form-group"><label class="form-label">Sal (g)</label><input class="form-input" id="ul-salt" type="number" step="0.1" placeholder="0.01"></div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="saveUnlockedFood()">Desbloquear producto</button>
      </div>
    </div>`;
  modal.classList.add('open');
  document.getElementById('product-modal')?.classList.remove('open');
}

function saveUnlockedFood() {
  const p = window._addFoodSelected;
  if (!p) return;
  const newFood = mapProduct({
    ...p,
    kcal:    document.getElementById('ul-kcal').value,
    protein: document.getElementById('ul-p').value,
    carbs:   document.getElementById('ul-c').value,
    fat:     document.getElementById('ul-f').value,
    fiber:   document.getElementById('ul-fiber').value,
    salt:    document.getElementById('ul-salt').value,
  });
  if (!FOODS.find(f => f.id === newFood.id)) FOODS.push(newFood);
  if (!CUSTOM_FOODS.find(f => f.id === newFood.id)) {
    CUSTOM_FOODS.push({...p,
      kcal:    document.getElementById('ul-kcal').value,
      protein: document.getElementById('ul-p').value,
      carbs:   document.getElementById('ul-c').value,
      fat:     document.getElementById('ul-f').value,
      fiber:   document.getElementById('ul-fiber').value,
      salt:    document.getElementById('ul-salt').value,
    });
    save('custom_foods', CUSTOM_FOODS);
  }
  document.getElementById('unlock-modal').classList.remove('open');
  showToast(`${p.name} desbloqueado`);
  if (alimentosCategory) renderCategoryProducts(alimentosCategory);
  else renderCategories();
}

function openAddFoodModal() {
  let modal = document.getElementById('add-food-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-food-modal';
    modal.className = 'modal-bg';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal" style="width:540px;max-height:600px">
      <div class="modal-head">
        <div style="display:flex;gap:4px;background:var(--bg);border-radius:var(--rs);padding:3px">
          <button class="vt-btn active" id="af-tab-merc" onclick="switchAddFoodTab('merc')">🛒 Mercadona</button>
          <button class="vt-btn" id="af-tab-custom" onclick="switchAddFoodTab('custom')">✏️ Producto propio</button>
        </div>
        <button class="btn btn-sm" onclick="closeAddFoodModal()">✕</button>
      </div>
      <div id="af-merc-tab">
        <div style="padding:8px 12px;border-bottom:1px solid var(--border)">
          <input id="add-food-search" placeholder="Buscar en catalogo Mercadona..." oninput="filterAddFood()"
            style="width:100%;border:none;outline:none;font-size:14px;background:none">
        </div>
        <div style="padding:8px 14px;font-size:12px;color:var(--text3)" id="add-food-status">Cargando catalogo...</div>
        <div class="modal-body" id="add-food-results" style="max-height:340px;overflow-y:auto"></div>
      </div>
      <div id="af-custom-tab" style="display:none;padding:16px;overflow-y:auto;max-height:520px">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-input" id="cf-name" placeholder="Ej: Proteina Whey Chocolate">
        </div>
        <div class="form-group">
          <label class="form-label">Marca (opcional)</label>
          <input class="form-input" id="cf-brand" placeholder="Ej: MyProtein">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group">
            <label class="form-label">Precio (€)</label>
            <input class="form-input" id="cf-price" type="number" step="0.01" placeholder="25.00">
          </div>
          <div class="form-group">
            <label class="form-label">Unidad</label>
            <select class="form-input" id="cf-unit">
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="ud">ud</option>
              <option value="g">g</option>
            </select>
          </div>
        </div>
        <div style="margin:4px 0 10px;font-size:12px;font-weight:600;color:var(--text2)">Macros por 100g</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group"><label class="form-label">Calorias (kcal)</label><input class="form-input" id="cf-kcal" type="number" step="0.1" placeholder="380"></div>
          <div class="form-group"><label class="form-label">Proteina (g)</label><input class="form-input" id="cf-p" type="number" step="0.1" placeholder="75"></div>
          <div class="form-group"><label class="form-label">Carbohidratos (g)</label><input class="form-input" id="cf-c" type="number" step="0.1" placeholder="7"></div>
          <div class="form-group"><label class="form-label">Grasas (g)</label><input class="form-input" id="cf-f" type="number" step="0.1" placeholder="6"></div>
        </div>
        <div class="form-group">
          <label class="form-label">URL imagen (opcional)</label>
          <input class="form-input" id="cf-img" placeholder="https://..." oninput="previewCfImg()">
          <div id="cf-img-preview" style="margin-top:6px"></div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="saveCustomFood()">Guardar producto</button>
      </div>
    </div>`;
  modal.classList.add('open');
  loadFullCatalog(catalog => {
    window._addFoodCatalog = catalog;
    const status = document.getElementById('add-food-status');
    if (status) status.textContent = `${catalog.length} productos — busca uno para añadir sus macros`;
    const search = document.getElementById('add-food-search');
    if (search) search.focus();
  });
}

function previewCfImg() {
  const val = document.getElementById('cf-img').value.trim();
  const preview = document.getElementById('cf-img-preview');
  if (preview) preview.innerHTML = val
    ? `<img src="${val}" style="height:60px;object-fit:contain;border-radius:6px;background:#f9fafb;">`
    : '';
}

function switchAddFoodTab(tab) {
  document.getElementById('af-merc-tab').style.display = tab==='merc'?'block':'none';
  document.getElementById('af-custom-tab').style.display = tab==='custom'?'block':'none';
  document.getElementById('af-tab-merc').classList.toggle('active', tab==='merc');
  document.getElementById('af-tab-custom').classList.toggle('active', tab==='custom');
}

function saveCustomFood() {
  const name = document.getElementById('cf-name').value.trim();
  if (!name) { showToast('El nombre es obligatorio'); return; }
  const newFood = {
    id: 'custom_' + Date.now(),
    ean: '',
    name,
    brand: document.getElementById('cf-brand').value.trim() || 'Propio',
    kcal:    document.getElementById('cf-kcal').value,
    protein: document.getElementById('cf-p').value,
    carbs:   document.getElementById('cf-c').value,
    fat:     document.getElementById('cf-f').value,
    fiber: '', salt: '',
    price: parseFloat(document.getElementById('cf-price').value) || 0,
    unit: document.getElementById('cf-unit').value,
    unit_size: 1,
    thumbnail: document.getElementById('cf-img').value.trim(),
    category: 'Productos propios',
    custom: true,
  };
  FOODS.push(mapProduct(newFood));
  CUSTOM_FOODS.push(newFood);
  save('custom_foods', CUSTOM_FOODS);
  closeAddFoodModal();
  showToast(`${name} añadido`);
  renderAlimentos(document.getElementById('page-alimentos'));
}

function closeAddFoodModal() {
  document.getElementById('add-food-modal')?.classList.remove('open');
}

function filterAddFood() {
  const q = document.getElementById('add-food-search')?.value.toLowerCase().trim() || '';
  if (q.length < 2) { document.getElementById('add-food-results').innerHTML = ''; return; }
  const catalog = window._addFoodCatalog || [];
  const existingIds = new Set(FOODS.map(f => f.id));
  const results = catalog.filter(p => !existingIds.has(p.id) &&
    (p.name.toLowerCase().includes(q) || (p.brand||'').toLowerCase().includes(q))).slice(0,12);
  document.getElementById('add-food-results').innerHTML = results.map(p => `
    <div class="sr" onclick="closeAddFoodModal();openUnlockModal('${p.id}')">
      ${p.thumbnail ? `<img src="${p.thumbnail}" style="width:36px;height:36px;object-fit:contain;border-radius:4px;background:#f9fafb;flex-shrink:0">` : `<div style="width:36px;height:36px;border-radius:4px;background:var(--bg);flex-shrink:0"></div>`}
      <div style="flex:1;min-width:0">
        <div class="sr-name">${p.name}</div>
        <div class="sr-brand">${p.brand||'Hacendado'} · ${p.price}€/${p.unit} · <span style="color:var(--green)">${p.category||''}</span></div>
      </div>
    </div>`).join('') || '<div style="padding:12px;font-size:13px;color:var(--text3)">Sin resultados o ya añadido</div>';
}

function addToPantryModal(foodId) {
  const f = FOODS.find(x => x.id===foodId);
  if (!f) return;
  const packSize = f.unit_size * 1000;
  const unitLabel = f.unit === 'l' ? 'L' : 'kg';
  const n = parseInt(prompt(`Cuantos packs de "${f.name}" tienes?\n(1 pack = ${f.unit_size}${unitLabel} · ${f.price}€)`, '1'));
  if (!n || isNaN(n) || n <= 0) return;
  const existing = PANTRY.find(p => p.foodId===foodId);
  if (existing) {
    existing.packs = (existing.packs || 0) + n;
    existing.qty = packSize;
    existing.auto = false;
  } else {
    PANTRY.push({id:'p'+Date.now(), foodId, name:f.name, packs:n, qty:packSize, unit:f.unit==='l'?'ml':'g', unit_size_g:packSize, auto:false});
  }
  save('pantry', PANTRY);
  showToast(`${n} pack${n!==1?'s':''} de ${f.name} añadido${n!==1?'s':''} a la despensa`);
}

function editFoodMacros(foodId) {
  const f = FOODS.find(x => x.id === foodId);
  if (!f) return;

  document.getElementById('product-modal')?.classList.remove('open');

  let modal = document.getElementById('edit-food-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edit-food-modal';
    modal.className = 'modal-bg';
    modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal" style="width:460px">
      <div class="modal-head">
        <span>✏️ Editar alimento</span>
        <button class="btn btn-sm" onclick="document.getElementById('edit-food-modal').classList.remove('open')">✕</button>
      </div>
      <div style="padding:16px">
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg);border-radius:var(--rs);margin-bottom:16px">
          ${f.thumbnail ? `<img src="${f.thumbnail}" style="width:40px;height:40px;object-fit:contain;border-radius:4px;background:white;flex-shrink:0">` : ''}
          <div>
            <div style="font-weight:600;font-size:13px">${f.name}</div>
            <div style="font-size:11px;color:var(--text2)">${f.brand} · ${f.category||''}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:12px">Macros por 100g</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group">
            <label class="form-label">Calorias (kcal)</label>
            <input class="form-input" id="ef-kcal" type="number" step="0.1" value="${f.kcal}">
          </div>
          <div class="form-group">
            <label class="form-label">Proteina (g)</label>
            <input class="form-input" id="ef-p" type="number" step="0.1" value="${f.p}">
          </div>
          <div class="form-group">
            <label class="form-label">Carbohidratos (g)</label>
            <input class="form-input" id="ef-c" type="number" step="0.1" value="${f.c}">
          </div>
          <div class="form-group">
            <label class="form-label">Grasas (g)</label>
            <input class="form-input" id="ef-f" type="number" step="0.1" value="${f.f}">
          </div>
          <div class="form-group">
            <label class="form-label">Fibra (g)</label>
            <input class="form-input" id="ef-fiber" type="number" step="0.1" value="${f.fiber||0}">
          </div>
          <div class="form-group">
            <label class="form-label">Sal (g)</label>
            <input class="form-input" id="ef-salt" type="number" step="0.1" value="${f.salt||0}">
          </div>
        </div>
        <div id="ef-status" style="font-size:12px;color:var(--text3);margin-top:4px;min-height:18px"></div>
        <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="saveEditedFood('${f.id}')">Guardar cambios</button>
      </div>
    </div>`;

  modal.classList.add('open');
}

async function saveEditedFood(foodId) {
  const f = FOODS.find(x => x.id === foodId);
  if (!f) return;

  const updates = {
    id:      foodId,
    kcal:    parseFloat(document.getElementById('ef-kcal').value) || 0,
    protein: parseFloat(document.getElementById('ef-p').value) || 0,
    carbs:   parseFloat(document.getElementById('ef-c').value) || 0,
    fat:     parseFloat(document.getElementById('ef-f').value) || 0,
    fiber:   parseFloat(document.getElementById('ef-fiber').value) || 0,
    salt:    parseFloat(document.getElementById('ef-salt').value) || 0,
  };

  // Actualizar en FOODS en memoria
  f.kcal = updates.kcal;
  f.p    = updates.protein;
  f.c    = updates.carbs;
  f.f    = updates.fat;

  // Actualizar en CUSTOM_FOODS localStorage
  const cfIdx = CUSTOM_FOODS.findIndex(x => x.id === foodId);
  if (cfIdx >= 0) {
    CUSTOM_FOODS[cfIdx] = {...CUSTOM_FOODS[cfIdx], ...updates};
  } else {
    CUSTOM_FOODS.push({...f, ...updates});
  }
  save('custom_foods', CUSTOM_FOODS);

  // Persistir en JSON via API
  const status = document.getElementById('ef-status');
  if (status) status.textContent = 'Guardando en base de datos...';

  const result = await apiSaveFood({
    ...f,
    kcal:    updates.kcal,
    protein: updates.protein,
    carbs:   updates.carbs,
    fat:     updates.fat,
    fiber:   updates.fiber,
    salt:    updates.salt,
  });

  if (result.ok) {
    showToast(`${f.name} actualizado`);
    document.getElementById('edit-food-modal').classList.remove('open');
    if (alimentosCategory) renderCategoryProducts(alimentosCategory);
    else renderCategories();
  } else {
    if (status) status.textContent = '⚠️ Guardado solo en local (servidor no disponible)';
    showToast(`${f.name} actualizado localmente`);
    setTimeout(() => document.getElementById('edit-food-modal')?.classList.remove('open'), 1500);
  }
}