// ── Constantes ────────────────────────────────────────────────────────────
const DAYS = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom'];
const MEALS = ['Desayuno','Comida','Cena','Snack'];
const MEAL_CLS = ['ft-b','ft-g','ft-r','ft-a'];
const GOALS = load('goals', {kcal:2200, p:160, c:220, f:70});

// ── localStorage ──────────────────────────────────────────────────────────
function save(key, val) {
  try { localStorage.setItem('md_'+key, JSON.stringify(val)); } catch(e) {}
}
function load(key, def) {
  try { const v = localStorage.getItem('md_'+key); return v ? JSON.parse(v) : def; } catch(e) { return def; }
}

// ── Estado global ─────────────────────────────────────────────────────────
let FOODS = [];
let CATALOG = [];
let CUSTOM_FOODS = load('custom_foods', []);

const WEEK_DEFAULT = {
  Lun:{Desayuno:[],Comida:[],Cena:[],Snack:[]},
  Mar:{Desayuno:[],Comida:[],Cena:[],Snack:[]},
  Mie:{Desayuno:[],Comida:[],Cena:[],Snack:[]},
  Jue:{Desayuno:[],Comida:[],Cena:[],Snack:[]},
  Vie:{Desayuno:[],Comida:[],Cena:[],Snack:[]},
  Sab:{Desayuno:[],Comida:[],Cena:[],Snack:[]},
  Dom:{Desayuno:[],Comida:[],Cena:[],Snack:[]},
};

let week = load('week', WEEK_DEFAULT);
DAYS.forEach(d=>{
  if(!week[d]) week[d]={Desayuno:[],Comida:[],Cena:[],Snack:[]};
  MEALS.forEach(m=>{ if(!week[d][m]) week[d][m]=[]; });
});

let RECIPES = load('recipes', [
  {id:'r1',name:'Bowl de pollo y arroz',kcal:450,p:38,c:52,f:8,ing:[{n:'Pechuga de pollo',q:150,u:'g'},{n:'Arroz redondo',q:80,u:'g'},{n:'Brocoli',q:100,u:'g'}]},
  {id:'r2',name:'Desayuno de campeon',kcal:520,p:22,c:68,f:18,ing:[{n:'Avena integral',q:80,u:'g'},{n:'Platano',q:100,u:'g'},{n:'Mantequilla cacahuete',q:20,u:'g'}]},
  {id:'r3',name:'Tortilla de 3 huevos',kcal:260,p:20,c:1,f:19,ing:[{n:'Huevos camperos',q:3,u:'ud'}]},
]);

let PANTRY = load('pantry', []);

// ── Mapeo de producto ─────────────────────────────────────────────────────
function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand || 'Hacendado',
    kcal: parseFloat(p.kcal) || 0,
    p: parseFloat(p.protein) || 0,
    c: parseFloat(p.carbs) || 0,
    f: parseFloat(p.fat) || 0,
    price: parseFloat(p.price) || 0,
    unit: p.unit || 'kg',
    unit_size: parseFloat(p.unit_size) || 1,
    bulk_price: parseFloat(p.bulk_price) || 0,
    thumbnail: p.thumbnail || '',
    ean: p.ean || '',
    category: p.category || '',
    ingredients: p.ingredients || '',
    allergens: p.allergens || '',
    description: p.description || '',
  };
}

// ── Cargar catalogo con macros ─────────────────────────────────────────────
function loadCatalog(onReady) {
  fetch('data/categorias_cache.json')
    .then(r => r.json())
    .then(data => {
      FOODS = data.map(p => mapProduct(p));
      CUSTOM_FOODS.forEach(p => {
        if (!FOODS.find(f => f.id === p.id)) FOODS.push(mapProduct(p));
      });
      console.log('Catalogo cargado:', FOODS.length, 'productos');
      if (onReady) onReady();
    })
    .catch(() => {
      console.warn('No se pudo cargar el catalogo');
      if (onReady) onReady();
    });
}

// ── Cargar catalogo completo sin macros ───────────────────────────────────
function loadFullCatalog(onReady) {
  if (CATALOG.length > 0) { onReady(CATALOG); return; }
  fetch('data/catalogo_mercadona.json')
    .then(r => r.json())
    .then(data => {
      CATALOG = data;
      onReady(CATALOG);
    })
    .catch(() => onReady([]));
}

// ── Helpers macros ─────────────────────────────────────────────────────────
function dayKcal(day) {
  return Math.round(MEALS.reduce((a,m) =>
    (week[day][m]||[]).reduce((b,i) => {
      const f = FOODS.find(x=>x.id===i.id);
      return b + (f ? f.kcal*i.qty/100 : 0);
    }, a), 0));
}

function dayMacro(day, key) {
  return Math.round(MEALS.reduce((a,m) =>
    (week[day][m]||[]).reduce((b,i) => {
      const f = FOODS.find(x=>x.id===i.id);
      return b + (f ? f[key]*i.qty/100 : 0);
    }, a), 0));
}

function getMealMacros(day, meal) {
  return (week[day][meal]||[]).reduce((a,i) => {
    const f = FOODS.find(x=>x.id===i.id);
    if (!f) return a;
    return {kcal:a.kcal+f.kcal*i.qty/100, p:a.p+f.p*i.qty/100, c:a.c+f.c*i.qty/100, f:a.f+f.f*i.qty/100};
  }, {kcal:0,p:0,c:0,f:0});
}

// ── Despensa automática ───────────────────────────────────────────────────
function pantryAdjust(foodId, delta) {
  const existing = PANTRY.find(p => p.foodId === foodId);
  const f = FOODS.find(x => x.id === foodId);
  const packSize = f ? f.unit_size * 1000 : 1000;
  const unit = f ? (f.unit === 'l' ? 'ml' : 'g') : 'g';

  if (existing) {
    existing.qty = Math.round((existing.qty + delta) * 10) / 10;
    while (existing.qty < 0 && existing.packs > 0) {
      existing.packs--;
      existing.qty += packSize;
    }
    if (existing.qty < 0) {
      existing.packs = Math.floor(existing.qty / packSize);
      existing.qty = existing.qty % packSize;
    }
  } else {
    const packsNeeded = Math.ceil(Math.abs(delta) / packSize);
    PANTRY.push({
      id: 'p' + Date.now(),
      foodId,
      name: f ? f.name : foodId,
      packs: -packsNeeded,
      qty: -(Math.abs(delta) % packSize || packSize),
      unit,
      unit_size_g: packSize,
      auto: true,
    });
  }
  save('pantry', PANTRY);
}

function pantryConsume(foodId, qty) { pantryAdjust(foodId, -qty); }
function pantryRestore(foodId, qty) { pantryAdjust(foodId, qty); }