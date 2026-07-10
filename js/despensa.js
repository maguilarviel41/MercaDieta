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

function renderDespensa(el) {
  if (PANTRY.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text3)">
      <div style="font-size:40px;margin-bottom:12px">📦</div>
      <div style="font-size:15px;font-weight:500;color:var(--text2);margin-bottom:8px">Tu despensa esta vacia</div>
      <div style="font-size:13px">Ve a Alimentos y pulsa "+ Anadir a despensa"<br>o añade alimentos al planificador</div>
    </div>`;
    return;
  }

  const rows = PANTRY.map(p => {
    const f = FOODS.find(x => x.id === p.foodId);
    const packSize = f ? f.unit_size * 1000 : p.unit_size_g || 1000;
    const unit = p.unit || 'g';
    const packs = p.packs || 0;
    const qty = p.qty !== undefined ? p.qty : 0;
    const deficit = packs < 0 || (packs === 0 && qty <= 0);
    const pct = deficit ? 0 : Math.min(100, Math.round(qty / packSize * 100));
    const barColor = deficit ? '#E2001A' : stockColor(pct);

    const packsLabel = deficit
      ? `<span style="color:var(--red);font-weight:700">
          Necesitas comprar ${Math.abs(packs) || 1} pack${(Math.abs(packs)||1)!==1?'s':''}
        </span>`
      : packs === 0
        ? `Ultimo pack · ${Math.round(qty)}${unit} restantes`
        : `${packs} pack${packs!==1?'s':''} · ${Math.round(qty)}${unit} restantes`;

    const packInfo = f
      ? `${f.unit_size}${f.unit} · ${f.price}€/pack`
      : `${packSize}${unit}/pack`;

    const img = f?.thumbnail
      ? `<img src="${f.thumbnail}" style="width:44px;height:44px;object-fit:contain;border-radius:6px;background:#f9fafb;flex-shrink:0" loading="lazy">`
      : `<div style="width:44px;height:44px;border-radius:6px;background:var(--bg);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px">📦</div>`;

    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${img}
          <div>
            <div style="font-weight:500;font-size:13px">${p.name}${p.auto?'<span style="font-size:10px;color:var(--text3);margin-left:6px">(auto)</span>':''}</div>
            <div style="font-size:11px;color:var(--text3)">${packInfo}</div>
          </div>
        </div>
      </td>
      <td>
        <div style="font-size:12px;margin-bottom:5px">${packsLabel}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:var(--bg);border-radius:3px;overflow:hidden;min-width:80px">
            ${deficit
              ? `<div style="width:100%;height:100%;background:#E2001A;border-radius:3px;opacity:0.25"></div>`
              : `<div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px;transition:width 0.3s"></div>`
            }
          </div>
          ${deficit
            ? `<span style="font-size:11px;color:#E2001A;font-weight:700;white-space:nowrap">${Math.round(qty)}${unit}</span>`
            : `<span style="font-size:10px;color:var(--text3);white-space:nowrap">${Math.round(pct)}%</span>`
          }
        </div>
      </td>
      <td>
        <span class="sbadge ${deficit?'s-out':packs===0&&pct<30?'s-low':pct>50?'s-ok':pct>20?'s-low':'s-out'}">
          ${deficit?'Comprar':packs===0?'Ultimo pack':pct>50?'Bien':pct>20?'Poco':'Agotado'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm" style="border:none;background:none;font-size:13px" onclick="addPacksToPantry('${p.id}')" title="Añadir packs">+📦</button>
        <button class="btn btn-sm" style="border:none;background:none" onclick="editPantryItem('${p.id}')">✏️</button>
        <button class="btn btn-sm" style="border:none;background:none" onclick="deletePantryItem('${p.id}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div style="margin-bottom:12px;font-size:13px;color:var(--text2)">
      Los productos en <span style="color:var(--red);font-weight:600">rojo</span> indican deficit — faltan en la despensa.
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="pantry-table">
        <thead><tr><th>Producto</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function addPacksToPantry(id) {
  const item = PANTRY.find(p => p.id===id);
  if (!item) return;
  const f = FOODS.find(x => x.id === item.foodId);
  const packSize = f ? f.unit_size * 1000 : item.unit_size_g || 1000;
  const unitLabel = f ? `${f.unit_size}${f.unit}` : `${packSize}g`;
  const n = parseInt(prompt(`Cuantos packs añades de "${item.name}"?\n(1 pack = ${unitLabel})`, '1'));
  if (!n || isNaN(n) || n <= 0) return;
  item.packs = (item.packs || 0) + n;
  item.qty = packSize;
  item.auto = false;
  save('pantry', PANTRY);
  renderDespensa(document.getElementById('page-despensa'));
}

function editPantryItem(id) {
  const item = PANTRY.find(p => p.id===id);
  if (!item) return;
  const f = FOODS.find(x => x.id === item.foodId);
  const packSize = f ? f.unit_size * 1000 : 1000;
  const packs = parseInt(prompt(`Cuantos packs tienes de "${item.name}"?`, item.packs || 0));
  if (isNaN(packs)) return;
  item.packs = packs;
  item.qty = packs > 0 ? packSize : 0;
  item.auto = false;
  save('pantry', PANTRY);
  renderDespensa(document.getElementById('page-despensa'));
}

function deletePantryItem(id) {
  const idx = PANTRY.findIndex(p => p.id===id);
  if (idx === -1) return;
  PANTRY.splice(idx, 1);
  save('pantry', PANTRY);
  renderDespensa(document.getElementById('page-despensa'));
}