function imgToBase64(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch(e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function exportPlannerPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 14;
  let y = 0;
  const clientName = prompt('Nombre del cliente (opcional):', '') || '';

  showToast('Generando PDF...');

  // Precargar imágenes
  const allFoodIds = new Set();
  DAYS.forEach(d => MEALS.forEach(m => (week[d][m]||[]).forEach(i => allFoodIds.add(i.id))));
  const imgCache = {};
  await Promise.all([...allFoodIds].map(async id => {
    const f = FOODS.find(x => x.id === id);
    if (f?.thumbnail) imgCache[id] = await imgToBase64(f.thumbnail);
  }));

  // Portada
  doc.setFillColor(0,166,80);
  doc.rect(0, 0, W, 45, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(26); doc.setFont('helvetica','bold');
  doc.text('MercaDieta', margin, 20);
  doc.setFontSize(13); doc.setFont('helvetica','normal');
  doc.text('Planificacion nutricional semanal', margin, 30);
  if (clientName) { doc.setFontSize(15); doc.setFont('helvetica','bold'); doc.text('Para: '+clientName, margin, 40); }
  doc.setTextColor(0,0,0);
  y = 56;

  // Resumen semanal
  doc.setFontSize(13); doc.setFont('helvetica','bold');
  doc.text('Resumen semanal', margin, y);
  y += 7;

  const colW = (W-margin*2)/6;
  doc.setFillColor(0,166,80);
  doc.rect(margin, y-4, W-margin*2, 7, 'F');
  doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  ['Dia','kcal','Prot','Carbs','Grasa','% Obj'].forEach((h,i) => doc.text(h, margin+colW*i+colW/2, y, {align:'center'}));
  doc.setTextColor(0,0,0); y += 5;

  DAYS.forEach((d,di) => {
    const k=dayKcal(d), p=dayMacro(d,'p'), c=dayMacro(d,'c'), f=dayMacro(d,'f');
    if (di%2===0) { doc.setFillColor(248,250,252); doc.rect(margin, y-3, W-margin*2, 6, 'F'); }
    doc.setFontSize(8); doc.setFont('helvetica','normal');
    [d, k||'—', p?(p+'g'):'—', c?(c+'g'):'—', f?(f+'g'):'—', k?(Math.round(k/GOALS.kcal*100)+'%'):'—']
      .forEach((v,i) => doc.text(''+v, margin+colW*i+colW/2, y, {align:'center'}));
    y += 6;
  });

  const tk=DAYS.reduce((a,d)=>a+dayKcal(d),0), tp=DAYS.reduce((a,d)=>a+dayMacro(d,'p'),0);
  const tc=DAYS.reduce((a,d)=>a+dayMacro(d,'c'),0), tf=DAYS.reduce((a,d)=>a+dayMacro(d,'f'),0);
  doc.setFillColor(0,122,61); doc.rect(margin, y-3, W-margin*2, 7, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
  ['TOTAL', tk+'', tp+'g', tc+'g', tf+'g', Math.round(tk/7)+' avg'].forEach((v,i) => doc.text(v, margin+colW*i+colW/2, y+1, {align:'center'}));
  doc.setTextColor(0,0,0); y += 14;

  // Detalle por día
  for (const d of DAYS) {
    if (!MEALS.some(m => (week[d][m]||[]).length > 0)) continue;
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFillColor(0,166,80); doc.rect(margin, y-4, W-margin*2, 8, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text(`${d}  —  ${dayKcal(d)} kcal  |  P:${dayMacro(d,'p')}g  C:${dayMacro(d,'c')}g  G:${dayMacro(d,'f')}g`, margin+2, y+1);
    doc.setTextColor(0,0,0); y += 10;

    for (const meal of MEALS) {
      const items = week[d][meal]||[];
      if (!items.length) continue;
      if (y > 255) { doc.addPage(); y = 20; }
      const mm = getMealMacros(d, meal);
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(60,60,60);
      doc.text(`${meal.toUpperCase()}  —  ${Math.round(mm.kcal)} kcal  P:${Math.round(mm.p)}g C:${Math.round(mm.c)}g G:${Math.round(mm.f)}g`, margin+2, y);
      doc.setTextColor(0,0,0); y += 5;

      for (const item of items) {
        const f = FOODS.find(x => x.id===item.id);
        if (!f) continue;
        if (y > 265) { doc.addPage(); y = 20; }
        const ikcal=Math.round(f.kcal*item.qty/100), ip=Math.round(f.p*item.qty/100);
        const ic=Math.round(f.c*item.qty/100), iff=Math.round(f.f*item.qty/100);
        const b64 = imgCache[item.id];
        if (b64) {
          doc.addImage(b64, 'JPEG', margin+2, y-4, 8, 8);
          doc.setFontSize(8); doc.setFont('helvetica','normal');
          doc.text(f.name.replace(' Hacendado',''), margin+12, y);
          doc.setTextColor(100,100,100);
          doc.text(`${item.qty}g — ${ikcal}kcal P${ip}g C${ic}g G${iff}g`, W-margin, y, {align:'right'});
          doc.setTextColor(0,0,0); y += 9;
        } else {
          doc.setFontSize(8); doc.setFont('helvetica','normal');
          doc.text(`· ${f.name.replace(' Hacendado','')}`, margin+4, y);
          doc.setTextColor(100,100,100);
          doc.text(`${item.qty}g — ${ikcal}kcal P${ip}g C${ic}g G${iff}g`, W-margin, y, {align:'right'});
          doc.setTextColor(0,0,0); y += 5;
        }
      }
      y += 3;
    }
    y += 4;
  }

  const pages = doc.getNumberOfPages();
  for (let i=1; i<=pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(150,150,150);
    doc.text('MercaDieta · Planificacion nutricional', margin, 292);
    doc.text(`Pag ${i}/${pages}`, W-margin, 292, {align:'right'});
  }

  doc.save(clientName ? `dieta_${clientName.replace(/\s+/g,'_')}.pdf` : 'dieta_semanal.pdf');
  showToast('PDF generado');
}

function exportRecipesPDF() {
  if (!RECIPES.length) { showToast('No hay comidas guardadas'); return; }
  let modal = document.getElementById('export-recipes-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'export-recipes-modal';
    modal.className = 'modal-bg';
    modal.onclick = e => { if (e.target===modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal" style="width:420px;max-height:80vh;overflow-y:auto">
      <div class="modal-head">
        <span style="font-weight:600">Exportar recetas a PDF</span>
        <button class="btn btn-sm" onclick="document.getElementById('export-recipes-modal').classList.remove('open')">✕</button>
      </div>
      <div style="padding:16px">
        <div class="form-group">
          <label class="form-label">Nombre del cliente (opcional)</label>
          <input class="form-input" id="exp-client" placeholder="Para: ...">
        </div>
        <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">Selecciona las comidas</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <button class="btn btn-sm" onclick="toggleAllRecipes(true)">Todas</button>
          <button class="btn btn-sm" onclick="toggleAllRecipes(false)">Ninguna</button>
        </div>
        ${RECIPES.map(r => `
          <label style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:var(--rs);cursor:pointer;margin-bottom:4px;background:var(--bg)">
            <input type="checkbox" id="exp-r-${r.id}" checked style="width:16px;height:16px;accent-color:var(--green)">
            <div>
              <div style="font-size:13px;font-weight:500">${r.name}</div>
              <div style="font-size:11px;color:var(--text3)">${r.kcal}kcal · P${r.p}g C${r.c}g G${r.f}g</div>
            </div>
          </label>`).join('')}
        <button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="generateRecipesPDF()">Generar PDF</button>
      </div>
    </div>`;
  modal.classList.add('open');
}

function toggleAllRecipes(checked) {
  RECIPES.forEach(r => { const cb=document.getElementById(`exp-r-${r.id}`); if(cb) cb.checked=checked; });
}

async function generateRecipesPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 14;
  const clientName = document.getElementById('exp-client')?.value.trim() || '';
  const selected = RECIPES.filter(r => document.getElementById(`exp-r-${r.id}`)?.checked);
  if (!selected.length) { showToast('Selecciona al menos una comida'); return; }
  document.getElementById('export-recipes-modal').classList.remove('open');
  showToast('Generando PDF...');

  const allImgs = new Set();
  selected.forEach(r => (r.ing||[]).forEach(i => {
    if (i.thumbnail) allImgs.add(i.thumbnail);
    const f = FOODS.find(x=>x.id===i.id);
    if (f?.thumbnail) allImgs.add(f.thumbnail);
  }));
  const imgCache = {};
  await Promise.all([...allImgs].map(async url => { imgCache[url] = await imgToBase64(url); }));

  // Portada
  doc.setFillColor(0,166,80); doc.rect(0,0,W,45,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(26); doc.setFont('helvetica','bold'); doc.text('MercaDieta', margin, 20);
  doc.setFontSize(13); doc.setFont('helvetica','normal'); doc.text('Recetario nutricional', margin, 30);
  if (clientName) { doc.setFontSize(15); doc.setFont('helvetica','bold'); doc.text('Para: '+clientName, margin, 40); }
  doc.setTextColor(0,0,0);
  let y = 56;

  for (let ri=0; ri<selected.length; ri++) {
    const r = selected[ri];
    
    // Separador entre recetas (no en la primera)
    if (ri > 0) {
      y += 6;
      doc.setFillColor(240,253,244);
      doc.rect(margin, y, W-margin*2, 0.5, 'F');
      doc.setDrawColor(0,166,80);
      doc.setLineWidth(0.4);
      doc.line(margin, y, W-margin, y);
      y += 10;
    }

    // Si no cabe el header, nueva página
    if (y > 250) { doc.addPage(); y = 20; }

    // Header receta
    doc.setFillColor(240,253,244); doc.rect(margin, y-5, W-margin*2, 14, 'F');
    doc.setDrawColor(0,166,80); doc.setLineWidth(0.5); doc.rect(margin, y-5, W-margin*2, 14, 'S');
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(0,122,61);
    doc.text(r.name, margin+3, y+4);
    doc.setTextColor(0,0,0); y += 16;

    // Macros en línea (más compacto)
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.setTextColor(245,158,11); doc.text(`${r.kcal} kcal`, margin, y);
    doc.setTextColor(59,130,246); doc.text(`P: ${r.p}g`, margin+28, y);
    doc.setTextColor(16,185,129); doc.text(`C: ${r.c}g`, margin+50, y);
    doc.setTextColor(239,68,68); doc.text(`G: ${r.f}g`, margin+72, y);
    doc.setTextColor(0,0,0); y += 7;

    // Ingredientes
    for (let i=0; i<(r.ing||[]).length; i++) {
      const ing = r.ing[i];
      if (y > 270) { doc.addPage(); y = 20; }
      if (i%2===0) { doc.setFillColor(250,250,250); doc.rect(margin, y-2, W-margin*2, 12, 'F'); }
      const f = FOODS.find(x=>x.id===ing.id);
      const thumb = ing.thumbnail || f?.thumbnail;
      const b64 = thumb ? imgCache[thumb] : null;
      if (b64) {
      doc.addImage(b64, 'JPEG', margin+1, y-2, 10, 10);
      doc.setFontSize(9); doc.setFont('helvetica','normal');
      doc.text(ing.n, margin+13, y+4);
      doc.setTextColor(100,100,100);
      doc.text(`${ing.q}${ing.u||'g'}`, W-margin, y+4, {align:'right'});
      } else {
      doc.setFontSize(9); doc.setFont('helvetica','normal');
      doc.text(`· ${ing.n}`, margin+2, y+4);
      doc.setTextColor(100,100,100);
      doc.text(`${ing.q}${ing.u||'g'}`, W-margin, y+4, {align:'right'});
      }
      doc.setTextColor(0,0,0); y += 12;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i=1; i<=pages; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150,150,150);
    doc.text('MercaDieta · Recetario nutricional', margin, 292);
    doc.text(`Pag ${i}/${pages}`, W-margin, 292, {align:'right'});
  }

  doc.save(clientName ? `recetas_${clientName.replace(/\s+/g,'_')}.pdf` : 'recetas_mercadieta.pdf');
  showToast('PDF generado');
}