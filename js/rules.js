const CATEGORIES = [
  { key: 'staple', label: '主食' },
  { key: 'main', label: '荤菜' },
  { key: 'veg', label: '素菜' },
];

// 随机搭配的结构：主食 ×1 + 荤菜 ×2 + 素菜 ×1
const COMBO_SPEC = [
  { key: 'staple', label: '主食', count: 1 },
  { key: 'main', label: '荤菜', count: 2 },
  { key: 'veg', label: '素菜', count: 1 },
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

// 从数组里随机取 count 个不重复的元素
function pickSome(list, count) {
  const pool = list.slice();
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picked;
}

/**
 * 纯规则引擎：主食 ×1 + 荤菜 ×2 + 素菜 ×1，排除前后 2 天内出现过的菜品。
 * 某分类菜品不足时不阻塞，按实际数量给出，并在理由里说明原因。
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

  for (const spec of COMBO_SPEC) {
    const pool = dishes.filter((d) => d.category === spec.key);
    if (pool.length === 0) {
      missing.push(`没有${spec.label}`);
      continue;
    }

    const fresh = pool.filter((d) => !excluded.has(d.id));

    // 优先取没吃过的；不够时才用吃过的补，尽量少重复
    const picked = pickSome(fresh, spec.count);
    if (picked.length < spec.count) {
      const rest = pool.filter((d) => !picked.some((p) => p.id === d.id));
      picked.push(...pickSome(rest, spec.count - picked.length));
    }

    for (const p of picked) {
      combo.push({
        category: spec.key,
        categoryLabel: spec.label,
        dishId: p.id,
        name: p.name,
      });
    }

    if (picked.length < spec.count) {
      missing.push(`${spec.label}只有 ${picked.length} 道（需 ${spec.count} 道）`);
    }
  }

  return { combo, missing, reason: buildReason(combo, missing) };
}

/**
 * 自选搭配：按用户勾选的菜品生成，不做重复排除、不限数量。
 * 输出按分类顺序排列，同一道菜不会重复。
 */
function buildManualCombo(dishes, selectedIds) {
  const combo = [];
  for (const cat of CATEGORIES) {
    for (const dish of dishes.filter((d) => d.category === cat.key && selectedIds.includes(d.id))) {
      combo.push({
        category: cat.key,
        categoryLabel: cat.label,
        dishId: dish.id,
        name: dish.name,
      });
    }
  }

  if (combo.length === 0) return { combo, missing: [], reason: '' };

  const counts = {};
  for (const c of combo) counts[c.categoryLabel] = (counts[c.categoryLabel] || 0) + 1;
  const detail = Object.entries(counts).map(([k, v]) => `${v} 道${k}`).join('、');
  const reason = `自己选的搭配：${combo.map((c) => c.name).join('、')}。（${detail}）`;

  return { combo, missing: [], reason };
}

function buildReason(combo, missing) {
  if (combo.length === 0) return '还没有菜品，先去添加几道菜吧。';

  const names = combo.map((c) => c.name).join('、');
  const parts = [`今日推荐搭配：${names}。`];

  const stapleCount = combo.filter((c) => c.category === 'staple').length;
  const mainCount = combo.filter((c) => c.category === 'main').length;
  const vegCount = combo.filter((c) => c.category === 'veg').length;

  const why = [];
  if (stapleCount) why.push('有主食垫底');
  if (mainCount) why.push(`${mainCount} 道荤菜`);
  if (vegCount) why.push(`${vegCount} 道素菜解腻`);
  if (why.length) parts.push('按「两荤一素」配的，' + why.join('、') + '，荤素均衡。');

  if (missing.length) parts.push(`（${missing.join('、')}，分类越全搭配越完整。）`);
  return parts.join('');
}
