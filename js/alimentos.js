function renderAlimentos(el) {
  el.innerHTML = `
    <div class="search-bar">
      <input id="food-search" placeholder="Buscar alimento..." oninput="filterFoods()" />
    </div>
    <div class="foods-grid" id="foods-grid"></div>`;
  renderFoodsGrid('');
}

function renderFoodsGrid(q) {
  const grid = document.getElementById('foods-grid');
  if (!grid) return;
  const filtered = FOODS.filter(f =>
    f.name.toLowerCase().includes(q.toLowerCase()) ||
    f.brand.toLowerCase().includes(q.toLowerCase())
  );
  grid.innerHTML = filtered.map(f => `
    <div class="fc">
      ${f.thumbnail ? `<img src="${f.thumbnail}" style="width:100%;height:110px;object-fit:contain;border-radius:var(--rs);margin-bottom:10px;background:#f9fafb;" loading="lazy">` : ''}
      <div class="fc-name">${f.name}</div>
      <div class="fc-brand">${f.brand}</div>
      <div class="fc-macros">
        <div class="fc-m"><div class="val" style="color:#f59e0b">${f.kcal}</div><div class="lbl">kcal</div></div>
        <div class="fc-m"><div class="val" style="color:#3b82f6">${f.p}g</div><div class="lbl">prot</div></div>
        <div class="fc-m"><div class="val" style="color:#10b981">${f.c}g</div><div class="lbl">carbs</div></div>
        <div class="fc-m"><div class="val" style="color:#ef4444">${f.f}g</div><div class="lbl">grasa</div></div>
      </div>
      <div class="fc-price"><span>${f.price}€/${f.unit}</span><span style="color:var(--text3)">por 100g</span></div>
      <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="addToPantryModal('${f.id}')">+ Anadir a despensa</button>
    </div>`).join('');
}

function filterFoods() {
  renderFoodsGrid(document.getElementById('food-search').value);
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
    PANTRY.push({
      id: 'p' + Date.now(),
      foodId,
      name: f.name,
      packs: n,
      qty: packSize,
      unit: f.unit === 'l' ? 'ml' : 'g',
      unit_size_g: packSize,
      auto: false,
    });
  }
  save('pantry', PANTRY);
  showToast(`${n} pack${n!==1?'s':''} de ${f.name} añadido${n!==1?'s':''} a la despensa`);
}
