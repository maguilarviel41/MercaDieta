let currentPage = 'dashboard';
let modalTarget = null;
let modalSelected = null;
let modalTab = 'food';

const PAGES_DEF = [
  {id:'dashboard', label:'Inicio',          icon:'🏠'},
  {id:'planner',   label:'Planificador',     icon:'📅'},
  {id:'recetas',   label:'Mis comidas',      icon:'🍽️'},
  {id:'alimentos', label:'Alimentos',        icon:'🥦'},
  {id:'despensa',  label:'Despensa',         icon:'📦'},
  {id:'compra',    label:'Lista de compra',  icon:'🛒'},
  {id:'ajustes',   label:'Mi perfil',        icon:'👤'},
];

const PAGE_TITLES = {
  dashboard: 'Inicio',
  planner:   'Planificador semanal',
  recetas:   'Mis comidas guardadas',
  alimentos: 'Base de datos de alimentos',
  despensa:  'Mi despensa',
  compra:    'Lista de la compra',
  ajustes:   'Mi perfil y objetivos',
};

const PAGE_ACTIONS = {
  planner: `<div style="display:flex;gap:8px">
    <button class="btn btn-sm" onclick="saveDiet()">💾 Guardar dieta</button>
    <button class="btn btn-primary btn-sm" onclick="exportPlannerPDF()">📄 Exportar PDF</button>
  </div>`,
  recetas: `<div style="display:flex;gap:8px">
    <button class="btn btn-sm" onclick="exportRecipesPDF()">📄 Exportar PDF</button>
    <button class="btn btn-primary btn-sm" onclick="openNewRecipeModal()">+ Nueva comida</button>
  </div>`,
  alimentos: '<button class="btn btn-primary btn-sm" onclick="openAddFoodModal()">+ Anadir alimento</button>',
  despensa:  '<button class="btn btn-primary btn-sm" onclick="openAddFoodModal()">+ Anadir producto</button>',
};

function buildNav() {
  document.getElementById('nav').innerHTML = PAGES_DEF.map(p =>
    `<button class="nav-item${p.id===currentPage?' active':''}" onclick="goTo('${p.id}')">
      <span class="nav-icon">${p.icon}</span> ${p.label}
    </button>`
  ).join('');
}

function goTo(id) {
  currentPage = id;
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.getElementById('topbar-title').textContent = PAGE_TITLES[id];
  document.getElementById('topbar-actions').innerHTML = PAGE_ACTIONS[id] || '';
  buildNav();
  render(id);
}

function render(id) {
  const el = document.getElementById('page-'+id);
  if (id==='dashboard') renderDashboard(el);
  else if (id==='planner')   renderPlanner(el);
  else if (id==='recetas')   renderRecetas(el);
  else if (id==='alimentos') renderAlimentos(el);
  else if (id==='despensa')  renderDespensa(el);
  else if (id==='compra')    renderCompra(el);
  else if (id==='ajustes')   renderAjustes(el);
}

function openModal(day, meal) {
  modalTarget = {day, meal};
  modalSelected = null;
  document.getElementById('modal-bg').classList.add('open');
  switchModalTab('food');
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
  modalTarget = null;
  modalSelected = null;
}

function switchModalTab(tab) {
  modalTab = tab;
  document.getElementById('modal-food-tab').style.display = tab==='food' ? 'block' : 'none';
  document.getElementById('modal-recipe-tab').style.display = tab==='recipe' ? 'block' : 'none';
  document.getElementById('modal-tab-food').classList.toggle('active', tab==='food');
  document.getElementById('modal-tab-recipe').classList.toggle('active', tab==='recipe');
  if (tab==='recipe') renderModalRecipes();
  else {
    document.getElementById('modal-search').value = '';
    document.getElementById('modal-qty').value = 100;
    document.getElementById('modal-results').innerHTML = '';
    filterModal();
    document.getElementById('modal-search').focus();
  }
}

function renderModalRecipes() {
  const el = document.getElementById('modal-recipe-results');
  if (!RECIPES.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">
      No tienes comidas guardadas.<br>En la vista dia pulsa 💾 para guardar una comida.
    </div>`;
    return;
  }
  el.innerHTML = RECIPES.map(r => `
    <div class="sr" style="flex-direction:column;align-items:flex-start;gap:6px" onclick="addRecipeToMeal('${r.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
        <div class="sr-name">${r.name}</div>
        <div class="sr-pills">
          <span class="sr-pill p-kcal">${r.kcal||0}kcal</span>
          <span class="sr-pill p-prot">P${r.p||0}g</span>
          <span class="sr-pill p-carb">C${r.c||0}g</span>
          <span class="sr-pill p-fat">G${r.f||0}g</span>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text3)">${(r.ing||[]).map(i=>`${i.n} ${i.q}${i.u}`).join(' · ')}</div>
    </div>`).join('');
}

function addRecipeToMeal(recipeId) {
  if (!modalTarget) return;
  const r = RECIPES.find(x => x.id===recipeId);
  if (!r) return;
  const {day, meal} = modalTarget;
  (r.ing||[]).forEach(ing => {
    const f = FOODS.find(x => x.id === ing.id) ||
              FOODS.find(x => x.name.toLowerCase().includes(ing.n.toLowerCase()));
    if (f) {
      week[day][meal].push({id:f.id, name:f.name, qty:ing.q});
      pantryConsume(f.id, ing.q);
    }
  });
  save('week', week);
  closeModal();
  renderPlanner(document.getElementById('page-planner'));
  showToast(`${r.name} añadida a ${meal}`);
}

function filterModal() {
  const q = document.getElementById('modal-search').value.toLowerCase();
  const res = FOODS.filter(f =>
    f.name.toLowerCase().includes(q) || f.brand.toLowerCase().includes(q)
  ).slice(0, 8);
  document.getElementById('modal-results').innerHTML = res.map(f => `
    <div class="sr${modalSelected&&modalSelected.id===f.id?' sel':''}" onclick="selectFood('${f.id}')">
      ${f.thumbnail
        ? `<img src="${f.thumbnail}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;background:#f9fafb;flex-shrink:0">`
        : `<div style="width:40px;height:40px;border-radius:6px;background:var(--bg);flex-shrink:0"></div>`}
      <div style="flex:1;min-width:0">
        <div class="sr-name">${f.name}</div>
        <div class="sr-brand">${f.brand} · ${f.price}€/${f.unit}</div>
      </div>
      <div class="sr-pills">
        <span class="sr-pill p-kcal">${f.kcal}kcal</span>
        <span class="sr-pill p-prot">P${f.p}g</span>
        <span class="sr-pill p-carb">C${f.c}g</span>
        <span class="sr-pill p-fat">G${f.f}g</span>
      </div>
    </div>`).join('');
}

function selectFood(id) {
  modalSelected = FOODS.find(f => f.id===id);
  filterModal();
}

function confirmAdd() {
  if (!modalSelected || !modalTarget) return;
  const qty = parseInt(document.getElementById('modal-qty').value) || 100;
  const {day, meal} = modalTarget;
  week[day][meal].push({id:modalSelected.id, name:modalSelected.name, qty});
  save('week', week);
  pantryConsume(modalSelected.id, qty);
  closeModal();
  renderPlanner(document.getElementById('page-planner'));
}

function saveDiet() {
  const name = prompt('Nombre para esta dieta:', 'Mi dieta');
  if (!name) return;
  const diets = load('saved_diets', []);
  diets.push({id:'d'+Date.now(), name, week: JSON.parse(JSON.stringify(week))});
  save('saved_diets', diets);
  showToast(`Dieta "${name}" guardada`);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmAdd();
  });
  loadCatalog(() => {
    buildNav();
    render('dashboard');
  });
});