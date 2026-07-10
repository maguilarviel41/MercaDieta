// ── Iconos de categoria usando Twemoji (CC-BY 4.0, github.com/twitter/twemoji) ──

const TWEMOJI_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/';

const CATEGORY_EMOJI = {
  'Aceite, especias y salsas': '🫒',
  'Agua y refrescos': '🥤',
  'Aperitivos': '🍿',
  'Arroz, legumbres y pasta': '🍚',
  'Azúcar, caramelos y chocolate': '🍬',
  'Bebé': '🍼',
  'Bodega': '🍷',
  'Cacao, café e infusiones': '☕',
  'Carne': '🥩',
  'Cereales y galletas': '🍪',
  'Charcutería y quesos': '🧀',
  'Congelados': '🧊',
  'Conservas, caldos y cremas': '🥫',
  'Cuidado del cabello': '💇',
  'Cuidado personal': '🧴',
  'Cuidado facial y corporal': '🧴',
  'Fitoterapia y parafarmacia': '💊',
  'Fruta y verdura': '🍎',
  'Huevos, leche y mantequilla': '🥛',
  'Limpieza y hogar': '🧽',
  'Maquillaje': '💄',
  'Marisco y pescado': '🐟',
  'Mascotas': '🐾',
  'Panadería y pastelería': '🥖',
  'Pizzas y platos preparados': '🍕',
  'Postres y yogures': '🍮',
  'Zumos': '🧃',
  'Otros': '🛒',
  'Productos propios': '⭐',
};

const DEFAULT_EMOJI = '🛒';

function emojiToCodepoint(emoji) {
  const codepoints = [];
  for (const char of emoji) {
    codepoints.push(char.codePointAt(0).toString(16));
  }
  return codepoints.filter(cp => cp !== 'fe0f').join('-');
}

function categoryIconSVG(category, size) {
  size = size || 28;
  const emoji = CATEGORY_EMOJI[category] || DEFAULT_EMOJI;
  const code = emojiToCodepoint(emoji);
  const url = `${TWEMOJI_BASE}${code}.svg`;
  return `<img src="${url}" width="${size}" height="${size}" style="display:inline-block;vertical-align:middle" loading="lazy" alt="${category}" onerror="this.style.display='none'">`;
}

function getCategoryIcon(cat, size) {
  return categoryIconSVG(cat, size);
}

// Convierte cualquier emoji a imagen Twemoji (uso general, no solo categorias)
function twemojiImg(emoji, size) {
  size = size || 20;
  const code = emojiToCodepoint(emoji);
  const url = `${TWEMOJI_BASE}${code}.svg`;
  return `<img src="${url}" width="${size}" height="${size}" style="display:inline-block;vertical-align:middle" loading="lazy" onerror="this.style.display='none'">`;
}