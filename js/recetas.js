function renderRecetas(el) {
  const cards = RECIPES.map(r => `
    <div class="rc-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div class="rc-name">${r.name}</div>
        <button class="btn btn-sm" style="border:none;background:none" onclick="deleteRecipe('${r.id}')">🗑️</button>
      </div>
      <div class="rc-pills">
        <span class="pill p-kcal">${r.kcal} kcal</span>
        <span class="pill p-prot">P: ${r.p}g</span>
        <span class="pill p-carb">C: ${r.c}g</span>
        <span class="pill p-fat">G: ${r.f}g</span>
      </div>
      <div style="padding-top:10px;border-top:1px solid var(--border)">
        ${r.ing.map(i => `<div class="rc-ing">· ${i.n} — ${i.q}${i.u}</div>`).join('')}
      </div>
    </div>`).join('');

  el.innerHTML = `<div class="rc-grid">
    ${cards}
    <div class="rc-card" style="border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;min-height:140px;cursor:pointer;color:var(--text3)" onclick="openNewRecipeModal()">
      <div style="text-align:center">
        <div style="font-size:24px;margin-bottom:8px">+</div>
        <div>Nueva comida</div>
      </div>
    </div>
  </div>`;
}

function deleteRecipe(id) {
  const idx = RECIPES.findIndex(r => r.id===id);
  if (idx === -1) return;
  RECIPES.splice(idx, 1);
  save('recipes', RECIPES);
  renderRecetas(document.getElementById('page-recetas'));
}

function openNewRecipeModal() {
  const name = prompt('Nombre de la comida:');
  if (!name) return;
  const kcal = parseFloat(prompt('Calorias totales (kcal):', '0')) || 0;
  const p = parseFloat(prompt('Proteinas (g):', '0')) || 0;
  const c = parseFloat(prompt('Carbohidratos (g):', '0')) || 0;
  const f = parseFloat(prompt('Grasas (g):', '0')) || 0;

  RECIPES.push({
    id: 'r'+Date.now(),
    name, kcal, p, c, f,
    ing: []
  });
  save('recipes', RECIPES);
  renderRecetas(document.getElementById('page-recetas'));
}
