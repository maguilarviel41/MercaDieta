let currentPage = 'dashboard';
let modalTarget = null;
let modalSelected = null;

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
  planner:   '<button class="btn btn-sm">Guardar dieta</button>',
  recetas:   '<button class="btn btn-primary btn-sm" onclick="openNewRecipeModal()">+ Nueva comida</button>',
  alimentos: '<button class="btn btn-primary btn-sm" onclick="openAddFoodModal()">+ Anadir alimento</button>',
  despensa:  '<button class="btn btn-primary btn-sm" onclick="addToPantryModal()">+ Anadir producto</button>',
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
  else if (id==='ajustes') renderAjustes(el);
}

function openModal(day, meal) {
  modalTarget = {day, meal};
  modalSelected = null;
  document.getElementById('modal-search').value = '';
  document.getElementById('modal-qty').value = 100;
  document.getElementById('modal-bg').classList.add('open');
  filterModal();
  document.getElementById('modal-search').focus();
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
  modalTarget = null;
  modalSelected = null;
}

function filterModal() {
  const q = document.getElementById('modal-search').value.toLowerCase();
  const res = FOODS.filter(f =>
    f.name.toLowerCase().includes(q) || f.brand.toLowerCase().includes(q)
  ).slice(0, 8);
  document.getElementById('modal-results').innerHTML = res.map(f => `
    <div class="sr${modalSelected&&modalSelected.id===f.id?' sel':''}" onclick="selectFood('${f.id}')">
      <div style="flex:1">
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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmAdd();
  });
  loadCatalog(() => {
    buildNav();
    render('dashboard');
  });
});