(() => {
  const $ = (id) => document.getElementById(id);
  const MAX_PHOTOS = 6;

  const state = {
    dishes: [],
    records: {},
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    selectedDate: null,
    pendingCategory: null,
    pickSelected: new Set(),
  };

  const el = {
    monthLabel: $('month-label'),
    days: $('days'),
    calendar: $('calendar'),
    notice: $('notice'),
    noticeText: $('notice-text'),
    btnPrev: $('btn-prev'),
    btnNext: $('btn-next'),
    btnSettings: $('btn-settings'),
    settingsMenu: $('settings-menu'),
    menuClear: $('menu-clear'),
    btnAddDish: $('btn-add-dish'),
    panel: $('panel'),
    signinView: $('signin-view'),
    btnSignin: $('btn-signin'),
    resultView: $('result-view'),
    resultDate: $('result-date'),
    combo: $('combo'),
    photoGrid: $('photo-grid'),
    emptyState: $('empty-state'),

    choiceMask: $('choice-mask'),
    choiceSheet: $('choice-sheet'),
    btnCloseChoice: $('btn-close-choice'),
    btnRandom: $('btn-random'),
    btnManual: $('btn-manual'),

    pickMask: $('pick-mask'),
    pickSheet: $('pick-sheet'),
    btnClosePick: $('btn-close-pick'),
    pickList: $('pick-list'),
    btnPickAdd: $('btn-pick-add'),
    btnPickSave: $('btn-pick-save'),

    sheetMask: $('sheet-mask'),
    dishSheet: $('dish-sheet'),
    btnCloseSheet: $('btn-close-sheet'),
    inputName: $('input-name'),
    categoryChips: $('category-chips'),
    categoryHint: $('category-hint'),
    btnSaveDish: $('btn-save-dish'),
    dishList: $('dish-list'),

    fileInput: $('file-input'),
    viewer: $('viewer'),
    viewerImg: $('viewer-img'),
    viewerClose: $('viewer-close'),

    dialogMask: $('dialog-mask'),
    dialogText: $('dialog-text'),
    dialogCancel: $('dialog-cancel'),
    dialogConfirm: $('dialog-confirm'),
  };

  async function refreshData() {
    state.dishes = await Dishes.all();
    const all = await Records.all();
    state.records = {};
    for (const r of all) state.records[r.date] = r;
  }

  function renderCalendar() {
    const { viewYear, viewMonth } = state;
    el.monthLabel.textContent = `${viewYear}年${viewMonth + 1}月`;
    el.days.innerHTML = '';

    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = todayStr();

    for (let i = 0; i < startPad; i++) {
      const b = document.createElement('div');
      b.className = 'day blank';
      el.days.appendChild(b);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(new Date(viewYear, viewMonth, d));
      const btn = document.createElement('button');
      btn.className = 'day';
      btn.type = 'button';

      const num = document.createElement('span');
      num.textContent = d;
      btn.appendChild(num);

      const rec = state.records[dateStr];
      const isFuture = dateStr > today;

      if (dateStr === today) btn.classList.add('today');
      if (isFuture) btn.classList.add('future');

      if (rec) {
        btn.classList.add('signed');
        const dot = document.createElement('span');
        dot.className = 'dot';
        btn.appendChild(dot);

        if (rec.dishes && rec.dishes.length) {
          const label = document.createElement('span');
          label.className = 'dish-name';
          label.textContent = rec.dishes.map((x) => x.name)[0];
          btn.appendChild(label);
        }
      } else if (!isFuture && dateStr < today) {
        btn.classList.add('absent');
        const dot = document.createElement('span');
        dot.className = 'dot absent';
        btn.appendChild(dot);
      }

      if (dateStr === state.selectedDate) btn.classList.add('selected');

      if (isFuture) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => selectDate(dateStr));
      }
      el.days.appendChild(btn);
    }
  }

  function renderPanel() {
    const hasDishes = state.dishes.length > 0;
    const date = state.selectedDate || todayStr();
    const rec = state.records[date];
    const isToday = date === todayStr();

    el.emptyState.classList.add('hidden');
    el.signinView.classList.add('hidden');
    el.resultView.classList.add('hidden');
    el.notice.classList.add('hidden');
    el.notice.classList.remove('standalone');
    el.panel.classList.remove('centered');

    if (rec) {
      renderResult(date, rec);
      return;
    }

    if (isToday) {
      if (!hasDishes) {
        el.emptyState.classList.remove('hidden');
        return;
      }
      el.noticeText.textContent = '今天偷懒了没有吃饭';
      el.notice.classList.remove('hidden');
      el.signinView.classList.remove('hidden');
      el.panel.classList.add('centered');
      return;
    }

    el.noticeText.textContent = '这天没有记录';
    el.notice.classList.add('standalone');
    el.notice.classList.remove('hidden');
  }

  function renderResult(date, rec) {
    el.resultView.classList.remove('hidden');
    const [y, m, d] = date.split('-');
    el.resultDate.textContent = `${y}年${Number(m)}月${Number(d)}日 的午饭`;

    el.combo.innerHTML = '';
    for (const item of rec.dishes || []) {
      const row = document.createElement('div');
      row.className = 'combo-row';
      const cat = document.createElement('span');
      cat.className = 'combo-cat';
      cat.textContent = item.categoryLabel;
      const name = document.createElement('span');
      name.className = 'combo-name';
      name.textContent = item.name;
      row.appendChild(cat);
      row.appendChild(name);
      el.combo.appendChild(row);
    }

    if (rec.reason) {
      const reason = document.createElement('div');
      reason.className = 'combo-reason';
      reason.textContent = rec.reason;
      el.combo.appendChild(reason);
    }

    renderPhotos(rec);
  }

  // 照片网格：每行 3 张，最多 2 行（6 张）；＋ 紧跟在最后一张后面
  function renderPhotos(rec) {
    el.photoGrid.innerHTML = '';
    if (!rec.photos) rec.photos = [];

    rec.photos.forEach((src, index) => {
      const cell = document.createElement('div');
      cell.className = 'photo-cell';

      const img = document.createElement('img');
      img.src = src;
      img.alt = `照片 ${index + 1}`;
      img.addEventListener('click', () => openViewer(src));

      const del = document.createElement('button');
      del.className = 'photo-del';
      del.textContent = '✕';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        rec.photos.splice(index, 1);
        await Records.put(rec);
        renderPhotos(rec);
      });

      cell.appendChild(img);
      cell.appendChild(del);
      el.photoGrid.appendChild(cell);
    });

    if (rec.photos.length < MAX_PHOTOS) {
      const add = document.createElement('button');
      add.className = 'photo-cell add-photo-cell';
      add.textContent = '＋';
      add.setAttribute('aria-label', '添加照片');
      add.addEventListener('click', () => el.fileInput.click());
      el.photoGrid.appendChild(add);
    }
  }

  function openViewer(src) {
    el.viewerImg.src = src;
    el.viewer.classList.remove('hidden');
  }

  function closeViewer() {
    el.viewer.classList.add('hidden');
    el.viewerImg.src = '';
  }

  function selectDate(dateStr) {
    state.selectedDate = dateStr === todayStr() ? null : dateStr;
    renderCalendar();
    renderPanel();
  }

  /* ---------- 签到：随机 / 自选 ---------- */

  function openChoice() {
    el.choiceMask.classList.remove('hidden');
    el.choiceSheet.classList.remove('hidden');
  }

  function closeChoice() {
    el.choiceMask.classList.add('hidden');
    el.choiceSheet.classList.add('hidden');
  }

  async function saveRecord(combo, reason) {
    const date = todayStr();
    const record = { date, dishes: combo, reason, photos: [], createdAt: Date.now() };
    await Records.put(record);
    state.records[date] = record;
    state.selectedDate = null;
    renderCalendar();
    renderPanel();
  }

  async function doRandom() {
    closeChoice();
    const date = todayStr();
    if (state.records[date]) return;

    const { combo, reason } = generateCombo(state.dishes, state.records, date);
    if (combo.length === 0) return;
    await saveRecord(combo, reason);
  }

  function openPick() {
    closeChoice();
    state.pickSelected = new Set();
    el.pickMask.classList.remove('hidden');
    el.pickSheet.classList.remove('hidden');
    renderPickList();
  }

  function closePick() {
    el.pickMask.classList.add('hidden');
    el.pickSheet.classList.add('hidden');
  }

  function renderPickList() {
    el.pickList.innerHTML = '';

    if (state.dishes.length === 0) {
      const p = document.createElement('p');
      p.className = 'pick-empty';
      p.textContent = '还没有菜品，点下面的「＋ 新增菜品」添加';
      el.pickList.appendChild(p);
    }

    for (const cat of CATEGORIES) {
      const group = state.dishes.filter((d) => d.category === cat.key);
      if (group.length === 0) continue;

      const title = document.createElement('div');
      title.className = 'dish-group-title';
      title.textContent = `${cat.label} · ${group.length}`;
      el.pickList.appendChild(title);

      for (const dish of group) {
        const selected = state.pickSelected.has(dish.id);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'pick-item' + (selected ? ' selected' : '');

        const name = document.createElement('span');
        name.textContent = dish.name;
        const mark = document.createElement('span');
        mark.className = 'pick-mark';
        mark.textContent = selected ? '✓' : '';

        row.appendChild(name);
        row.appendChild(mark);
        row.addEventListener('click', () => {
          if (state.pickSelected.has(dish.id)) state.pickSelected.delete(dish.id);
          else state.pickSelected.add(dish.id);
          renderPickList();
        });
        el.pickList.appendChild(row);
      }
    }

    updatePickSave();
  }

  function updatePickSave() {
    const n = state.pickSelected.size;
    el.btnPickSave.textContent = n > 0 ? `选好了（${n} 道）` : '选好了';
    el.btnPickSave.disabled = n === 0;
  }

  async function savePick() {
    const ids = [...state.pickSelected];
    if (ids.length === 0) return;
    if (state.records[todayStr()]) { closePick(); return; }

    const { combo, reason } = buildManualCombo(state.dishes, ids);
    if (combo.length === 0) return;

    closePick();
    await saveRecord(combo, reason);
  }

  /* ---------- 菜品管理 ---------- */

  function openSheet() {
    el.sheetMask.classList.remove('hidden');
    el.dishSheet.classList.remove('hidden');
    el.inputName.value = '';
    setCategory(null);
    renderDishList();
    el.inputName.focus();
  }

  function closeSheet() {
    el.sheetMask.classList.add('hidden');
    el.dishSheet.classList.add('hidden');
  }

  function setCategory(value) {
    state.pendingCategory = value;
    for (const chip of el.categoryChips.querySelectorAll('.chip')) {
      chip.classList.toggle('active', chip.dataset.value === value);
    }
    el.categoryHint.classList.toggle('warn', !value);
  }

  function renderDishList() {
    el.dishList.innerHTML = '';
    if (state.dishes.length === 0) {
      const p = document.createElement('div');
      p.className = 'dish-group-title';
      p.textContent = '还没有菜品，添加后会显示在这里';
      el.dishList.appendChild(p);
      return;
    }
    for (const cat of CATEGORIES) {
      const group = state.dishes.filter((d) => d.category === cat.key);
      if (group.length === 0) continue;
      const title = document.createElement('div');
      title.className = 'dish-group-title';
      title.textContent = `${cat.label} · ${group.length}`;
      el.dishList.appendChild(title);

      for (const dish of group) {
        const item = document.createElement('div');
        item.className = 'dish-item';
        const name = document.createElement('span');
        name.textContent = dish.name;
        const del = document.createElement('button');
        del.textContent = '✕';
        del.addEventListener('click', async () => {
          await Dishes.remove(dish.id);
          state.pickSelected.delete(dish.id);
          await refreshData();
          renderDishList();
          if (isPickOpen()) renderPickList();
          renderCalendar();
          renderPanel();
        });
        item.appendChild(name);
        item.appendChild(del);
        el.dishList.appendChild(item);
      }
    }
  }

  function isPickOpen() {
    return !el.pickSheet.classList.contains('hidden');
  }

  async function saveDish() {
    const name = el.inputName.value.trim();
    if (!name) {
      el.inputName.focus();
      return;
    }
    if (!state.pendingCategory) {
      el.categoryHint.classList.add('warn');
      return;
    }

    await Dishes.add({ name, category: state.pendingCategory });
    await refreshData();
    el.inputName.value = '';
    setCategory(null);
    renderDishList();
    if (isPickOpen()) renderPickList();
    renderCalendar();
    renderPanel();
  }

  /* ---------- 照片 ---------- */

  async function handlePhotos(files) {
    const date = state.selectedDate || todayStr();
    const rec = state.records[date];
    if (!rec) return;

    if (!rec.photos) rec.photos = [];
    for (const file of files) {
      if (rec.photos.length >= MAX_PHOTOS) break;
      try {
        rec.photos.push(await downscale(file, 1000));
      } catch (e) { /* 跳过损坏文件 */ }
    }
    await Records.put(rec);
    renderPhotos(rec);
  }

  function downscale(file, maxSize) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ---------- 设置与弹窗 ---------- */

  function toggleMenu(show) {
    const next = show === undefined ? el.settingsMenu.classList.contains('hidden') : show;
    el.settingsMenu.classList.toggle('hidden', !next);
  }

  let dialogResolve = null;

  function openDialog(text) {
    el.dialogText.textContent = text;
    el.dialogMask.classList.remove('hidden');
    return new Promise((resolve) => { dialogResolve = resolve; });
  }

  function closeDialog(result) {
    el.dialogMask.classList.add('hidden');
    if (dialogResolve) { dialogResolve(result); dialogResolve = null; }
  }

  async function clearAllData() {
    // 先关掉自己持有的数据库连接，否则 deleteDatabase 会被阻塞、数据删不掉
    await closeDB();

    try {
      const req = indexedDB.deleteDatabase('lunch-db');
      await new Promise((resolve) => {
        req.onsuccess = resolve;
        req.onerror = resolve;
        req.onblocked = resolve;
        setTimeout(resolve, 3000);
      });
    } catch (e) { /* 忽略，继续清缓存 */ }

    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* 忽略 */ }

    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch (e) { /* 忽略 */ }

    location.reload();
  }

  function bind() {
    el.btnPrev.addEventListener('click', () => {
      state.viewMonth--;
      if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
      renderCalendar();
    });
    el.btnNext.addEventListener('click', () => {
      state.viewMonth++;
      if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
      renderCalendar();
    });

    el.btnSignin.addEventListener('click', openChoice);
    el.btnCloseChoice.addEventListener('click', closeChoice);
    el.choiceMask.addEventListener('click', closeChoice);
    el.btnRandom.addEventListener('click', doRandom);
    el.btnManual.addEventListener('click', openPick);

    el.btnClosePick.addEventListener('click', closePick);
    el.pickMask.addEventListener('click', closePick);
    el.btnPickAdd.addEventListener('click', openSheet);
    el.btnPickSave.addEventListener('click', savePick);

    el.btnAddDish.addEventListener('click', openSheet);
    el.btnCloseSheet.addEventListener('click', closeSheet);
    el.sheetMask.addEventListener('click', closeSheet);
    el.btnSaveDish.addEventListener('click', saveDish);
    el.inputName.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveDish(); });

    el.viewerClose.addEventListener('click', closeViewer);
    el.viewer.addEventListener('click', (e) => { if (e.target === el.viewer) closeViewer(); });

    el.btnSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    el.menuClear.addEventListener('click', async () => {
      toggleMenu(false);
      const ok = await openDialog('此操作会丢失所有数据，是否清除？');
      if (ok) clearAllData();
    });
    el.dialogCancel.addEventListener('click', () => closeDialog(false));
    el.dialogConfirm.addEventListener('click', () => closeDialog(true));

    document.addEventListener('click', () => toggleMenu(false));

    el.fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) handlePhotos(files);
      e.target.value = '';
    });

    for (const chip of el.categoryChips.querySelectorAll('.chip')) {
      chip.addEventListener('click', () => setCategory(chip.dataset.value));
    }
  }

  // 跨天自动刷新：切回前台或每分钟检查日期是否变化
  function watchDayChange() {
    let day = todayStr();
    const check = () => {
      const now = todayStr();
      if (now === day) return;
      day = now;
      state.selectedDate = null;
      state.viewYear = new Date().getFullYear();
      state.viewMonth = new Date().getMonth();
      renderCalendar();
      renderPanel();
    };
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) check();
    });
    setInterval(check, 60000);
  }

  function setupServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });

    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
    }).catch(() => {});
  }

  async function init() {
    await refreshData();
    bind();
    renderCalendar();
    renderPanel();
    watchDayChange();
    setupServiceWorker();
  }

  init();
})();
