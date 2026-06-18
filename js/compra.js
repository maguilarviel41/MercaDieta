let checkedItems = {};

function renderCompra(el) {
  const needed = {};
  DAYS.forEach(day => MEALS.forEach(meal => (week[day][meal]||[]).forEach(item => {
    const f = FOODS.find(x=>x.id===item.id);
    if (!f) return;
    if (!needed[item.id]) needed[item.id] = {f, qty:0};
    needed[item.id].qty += item.qty;
  })));

  const items = Object.values(needed).map(({f, qty}) => {
    const pItem = PANTRY.find(p => p.foodId===f.id);
    const have = pItem && pItem.qty > 0 ? pItem.qty : 0;
    const toBuyG = Math.max(0, qty - have);
    if (toBuyG === 0) return null;
    // Calcular packs necesarios
    const packSizeG = f.unit_size * 1000;
    const packs = Math.ceil(toBuyG / packSizeG);
    const price = (packs * f.price).toFixed(2);
    return {f, needed:qty, have, toBuyG, packs, packSizeG, price};
  }).filter(Boolean);

  const total = items.reduce((a,i) => a+parseFloat(i.price), 0).toFixed(2);

  if (items.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text3)">
      <div style="font-size:40px;margin-bottom:12px">🛒</div>
      <div style="font-size:15px;font-weight:500;color:var(--text2);margin-bottom:8px">Todo cubierto</div>
      <div style="font-size:13px">La despensa cubre todo lo planificado esta semana</div>
    </div>`;
    return;
  }

  const rows = items.map(i => `
    <div class="si">
      <div class="si-chk${checkedItems[i.f.id]?' done':''}" onclick="toggleCheck('${i.f.id}')">${checkedItems[i.f.id]?'✓':''}</div>
      <div style="flex:1;min-width:0">
        <div class="si-name" style="${checkedItems[i.f.id]?'text-decoration:line-through;opacity:.4':''}">${i.f.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">
          Necesitas ${i.needed}g · Tienes ${i.have}g · Comprar ${i.toBuyG}g
        </div>
      </div>
      <div style="text-align:center;min-width:80px">
        <div style="font-size:13px;font-weight:600">${i.packs} ${i.packs===1?'pack':'packs'}</div>
        <div style="font-size:10px;color:var(--text3)">${i.f.unit_size}${i.f.unit} c/u</div>
      </div>
      <div class="si-price">${i.price}€</div>
    </div>`).join('');

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:13px;color:var(--text2)">${items.length} productos · <strong style="color:var(--green)">${total}€ estimado</strong></div>
      <button class="btn btn-sm" onclick="exportShoppingList()">Exportar lista</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden">${rows}</div>`;
}

function toggleCheck(id) {
  checkedItems[id] = !checkedItems[id];
  renderCompra(document.getElementById('page-compra'));
}

function exportShoppingList() {
  const needed = {};
  DAYS.forEach(day => MEALS.forEach(meal => (week[day][meal]||[]).forEach(item => {
    const f = FOODS.find(x=>x.id===item.id);
    if (!f) return;
    if (!needed[item.id]) needed[item.id] = {f, qty:0};
    needed[item.id].qty += item.qty;
  })));

  const items = Object.values(needed).map(({f, qty}) => {
    const pItem = PANTRY.find(p => p.foodId===f.id);
    const have = pItem ? pItem.qty : 0;
    const toBuy = Math.max(0, qty-have);
    const price = toBuy>0 ? ((toBuy/1000)*f.price).toFixed(2) : 0;
    return {f, toBuy, price};
  }).filter(i => i.toBuy>0);

  const total = items.reduce((a,i) => a+parseFloat(i.price), 0).toFixed(2);
  const text = [
    'LISTA DE LA COMPRA - MercaDieta',
    '================================',
    ...items.map(i => `- ${i.f.name}: ~${i.toBuy}g (${i.price}€)`),
    '================================',
    `TOTAL ESTIMADO: ${total}€`
  ].join('\n');

  const blob = new Blob([text], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lista_compra.txt';
  a.click();
}
