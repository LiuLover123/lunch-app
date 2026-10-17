const CATEGORIES = [
  { key: 'staple', label: '主食' },
  { key: 'main', label: '主菜' },
  { key: 'veg', label: '素菜' },
];

const RECENT_DAYS = 2;

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return formatDate(new Date());
}

function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return formatDate(date);
}

function recentDates(fromDate) {
  const dates = [];
  for (let i = -RECENT_DAYS; i <= RECENT_DAYS; i++) {
    if (i === 0) continue;
    dates.push(addDays(fromDate, i));
  }
  return dates;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * 纯规则引擎：主食 + 主菜 + 素菜 各一，排除前后 2 天内出现过的菜品。
 * 零调用、零延迟、结果可复现（给定同一输入与随机源）。
 */
function generateCombo(dishes, records, dateStr) {
  const excluded = new Set();
  for (const d of recentDates(dateStr)) {
    const rec = records[d];
    if (rec && rec.dishes) {
      for (const item of rec.dishes) excluded.add(item.dishId);
    }
  }

  const combo = [];
  const missing = [];

  for (const cat of CATEGORIES) {
    const pool = dishes.filter((d) => d.category === cat.key);
    const fresh = pool.filter((d) => !excluded.has(d.id));
    const usable = fresh.length > 0 ? fresh : pool;

    if (usable.length === 0) {
      missing.push(cat.label);
      continue;
    }
    const chosen = pickRandom(usable);
    combo.push({ category: cat.key, categoryLabel: cat.label, dishId: chosen.id, name: chosen.name });
  }

  return { combo, missing, reason: buildReason(combo, missing) };
}

function buildReason(combo, missing) {
  if (combo.length === 0) return '还没有菜品，先去添加几道菜吧。';

  const names = combo.map((c) => c.name).join('、');
  const parts = [`今日推荐搭配：${names}。`];

  const hasVeg = combo.some((c) => c.category === 'veg');
  const hasMain = combo.some((c) => c.category === 'main');
  const hasStaple = combo.some((c) => c.category === 'staple');

  const why = [];
  if (hasStaple) why.push('有主食垫底');
  if (hasMain) why.push('有主菜解馋');
  if (hasVeg) why.push('有素菜平衡');
  if (why.length) parts.push('这样配下来，' + why.join('、') + '，荤素搭配不腻。');

  if (missing.length) {
    parts.push(`（缺少${missing.join('、')}分类的菜品，分类越全搭配越合理。）`);
  }
  return parts.join('');
}
