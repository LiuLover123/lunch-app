(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    dishes: [],
    records: {},
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    selectedDate: null,
    pendingCategory: 'main',
  };

  const el = {
    monthLabel: $('month-label'),
    days: $('days'),
    calendar: $('calendar'),
    notice: $('notice'),
    noticeText: $('notice-text'),
    btnPrev: $('btn-prev'),
    btnNext: $('btn-next'),
    btnAddDish: $('btn-add-dish'),
    panel: $('panel'),
    signinView: $('signin-view'),
    btnSignin: $('btn-signin'),
    resultView: $('result-view'),
    resultDate: $('result-date'),
    combo: $('combo'),
    photoSlot: $('photo-slot'),
    emptyState: $('empty-state'),
    sheetMask: $('sheet-mask'),
    dishSheet: $('dish-sheet'),
    btnCloseSheet: $('btn-close-sheet'),
    inputName: $('input-name'),
    categoryChips: $('category-chips'),
    btnSaveDish: $('btn-save-dish'),
    dishList: $('dish-list'),
    fileInput: $('file-input'),
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
      // 今天未签到：显示"偷懒"提示 + 签到按钮（整体居中）
      el.noticeText.textContent = '今天偷懒了没有吃饭';
      el.notice.classList.remove('hidden');
      el.signinView.classList.remove('hidden');
      el.panel.classList.add('centered');
      return;
    }

    // 选中的历史日期：只显示提示文案
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

    renderPhoto(rec);
  }

  function renderPhoto(rec) {
    el.photoSlot.innerHTML = '';
    if (rec.photo) {
      const wrap = document.createElement('div');
      wrap.className = 'photo-wrap';
      const img = document.createElement('img');
      img.className = 'photo-img';
      img.src = rec.photo;
      img.alt = '当日照片';
      const del = document.createElement('button');
      del.className = 'photo-del';
      del.textContent = '✕';
      del.addEventListener('click', async () => {
        rec.photo = null;
        await Records.put(rec);
        renderPhoto(rec);
      });
      wrap.appendChild(img);
      wrap.appendChild(del);
      el.photoSlot.appendChild(wrap);
      return;
    }

    const btn = document.createElement('button');
    btn.className = 'add-photo';
    btn.textContent = '＋';
    btn.addEventListener('click', () => el.fileInput.click());
    const hint = document.createElement('span');
    hint.className = 'photo-hint';
    hint.textContent = '添加今天的照片';

    el.photoSlot.appendChild(btn);
    el.photoSlot.appendChild(hint);
  }

  function selectDate(dateStr) {
    state.selectedDate = dateStr === todayStr() ? null : dateStr;
    renderCalendar();
    renderPanel();
  }

  async function handleSignin() {
    const date = todayStr();
    if (state.records[date]) return;

    const { combo, reason } = generateCombo(state.dishes, state.records, date);
    if (combo.length === 0) return;

    const record = { date, dishes: combo, reason, photo: null, createdAt: Date.now() };
    await Records.put(record);
    state.records[date] = record;

    state.selectedDate = null;
    renderCalendar();
    renderPanel();
  }

  function openSheet() {
    el.sheetMask.classList.remove('hidden');
    el.dishSheet.classList.remove('hidden');
    el.inputName.value = '';
    setCategory('main');
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
          await refreshData();
          renderDishList();
          renderCalendar();
          renderPanel();
        });
        item.appendChild(name);
        item.appendChild(del);
        el.dishList.appendChild(item);
      }
    }
  }

  async function saveDish() {
    const name = el.inputName.value.trim();
    if (!name) {
      el.inputName.focus();
      return;
    }
    await Dishes.add({ name, category: state.pendingCategory });
    await refreshData();
    el.inputName.value = '';
    renderDishList();
    renderCalendar();
    renderPanel();
  }

  async function handlePhoto(file) {
    const date = state.selectedDate || todayStr();
    const rec = state.records[date];
    if (!rec) return;

    const dataUrl = await downscale(file, 1280);
    rec.photo = dataUrl;
    await Records.put(rec);
    renderPhoto(rec);
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
    el.btnAddDish.addEventListener('click', openSheet);
    el.btnCloseSheet.addEventListener('click', closeSheet);
    el.sheetMask.addEventListener('click', closeSheet);
    el.btnSaveDish.addEventListener('click', saveDish);
    el.inputName.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveDish(); });
    el.btnSignin.addEventListener('click', handleSignin);
    el.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handlePhoto(e.target.files[0]);
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

  async function init() {
    await refreshData();
    bind();
    renderCalendar();
    renderPanel();
    watchDayChange();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();
