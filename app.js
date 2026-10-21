/**
 * Pasti della settimana - PWA Vanilla JavaScript Application
 * 100% Client-Side, LocalStorage con SafeStorage fallback, Zero dipendenze esterne.
 * Compatibile con GitHub Pages (sottocartelle) e Safari iOS / Android PWA.
 */

(function() {
  // ============================================================================
  // 1. COSTANTI E CONFIGURAZIONE
  // ============================================================================

  const DEFAULT_CATEGORIES = [
    { id: 'carne_rossa', name: 'Carne rossa', icon: '🥩' },
    { id: 'carne_bianca', name: 'Carne bianca', icon: '🍗' },
    { id: 'formaggio', name: 'Formaggio', icon: '🧀' },
    { id: 'uova', name: 'Uova', icon: '🥚' },
    { id: 'legumi', name: 'Legumi', icon: '🫘' },
    { id: 'altro', name: 'Altro', icon: '🍽️', isCustom: true }
  ];

  const MONTHS_IT = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
  ];

  const MONTHS_IT_SHORT = [
    'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
    'lug', 'ago', 'set', 'ott', 'nov', 'dic'
  ];

  const DAY_NAMES_IT = [
    'Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'
  ];

  const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const DAY_NAMES_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  // SafeStorage: non va mai in errore (nemmeno in Safari Incognito o iframe restrittivi)
  const SafeStorage = {
    _mem: {},
    get(key) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      } catch (e) {}
      return this._mem[key] || null;
    },
    set(key, val) {
      try {
        localStorage.setItem(key, String(val));
      } catch (e) {}
      this._mem[key] = String(val);
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
      delete this._mem[key];
    }
  };

  const STORAGE_KEYS = {
    INITIALIZED: 'pasti_app_initialized',
    TARGETS: 'pasti_targets',
    COUNTS: 'pasti_counts',
    WEEK_KEY: 'pasti_current_week_key',
    NOTES: 'pasti_notes',
    CUSTOM_NAME: 'pasti_custom_category_name'
  };

  // ============================================================================
  // 2. FUNZIONI DI CALCOLO DATE E PROGRESSI
  // ============================================================================

  function getMonday(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0 è Domenica, 1 è Lunedì...
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getSunday(date = new Date()) {
    const monday = getMonday(date);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }

  function getWeekKey(date = new Date()) {
    const monday = getMonday(date);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatWeekRange(date = new Date()) {
    const monday = getMonday(date);
    const sunday = getSunday(date);

    const mDay = monday.getDate();
    const mMonth = MONTHS_IT[monday.getMonth()];
    const mYear = monday.getFullYear();

    const sDay = sunday.getDate();
    const sMonth = MONTHS_IT[sunday.getMonth()];
    const sYear = sunday.getFullYear();

    if (mYear !== sYear) {
      return `Lun ${mDay} ${mMonth} ${mYear} – Dom ${sDay} ${sMonth} ${sYear}`;
    }
    if (mMonth !== sMonth) {
      return `Lun ${mDay} ${mMonth} – Dom ${sDay} ${sMonth} ${sYear}`;
    }
    return `Lun ${mDay} – Dom ${sDay} ${sMonth} ${sYear}`;
  }

  function getWeekDays(date = new Date()) {
    const monday = getMonday(date);
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const isToday = d.getTime() === today.getTime();
      days.push({
        index: i,
        nameShort: DAY_NAMES_SHORT[i],
        nameFull: DAY_NAMES_FULL[i],
        dayNumber: d.getDate(),
        monthShort: MONTHS_IT_SHORT[d.getMonth()],
        isToday: isToday,
        isFirstDay: i === 0, // Lunedì
        dateString: `${d.getDate()} ${MONTHS_IT_SHORT[d.getMonth()]}`
      });
    }
    return days;
  }

  function checkWeekRollover(currentDate, savedWeekKey, currentCounts = {}, categories = DEFAULT_CATEGORIES) {
    const activeWeekKey = getWeekKey(currentDate);

    const initZeroCounts = () => {
      const fresh = {};
      for (const cat of categories) {
        fresh[cat.id] = 0;
      }
      return fresh;
    };

    if (!savedWeekKey || savedWeekKey !== activeWeekKey) {
      return {
        rolledOver: true,
        currentWeekKey: activeWeekKey,
        counts: initZeroCounts()
      };
    }

    const sanitized = { ...currentCounts };
    for (const cat of categories) {
      if (typeof sanitized[cat.id] !== 'number' || sanitized[cat.id] < 0) {
        sanitized[cat.id] = 0;
      }
    }

    return {
      rolledOver: false,
      currentWeekKey: activeWeekKey,
      counts: sanitized
    };
  }

  function calculateProgress(count, target) {
    const safeCount = Math.max(0, parseInt(count, 10) || 0);
    const safeTarget = Math.max(0, parseInt(target, 10) || 0);

    if (safeTarget === 0) {
      return {
        percent: 0,
        status: 'no_target',
        label: 'Nessun obiettivo impostato',
        isExceeded: false,
        isReached: false,
        hasTarget: false
      };
    }

    const percent = Math.min(100, Math.round((safeCount / safeTarget) * 100));

    if (safeCount > safeTarget) {
      const diff = safeCount - safeTarget;
      return {
        percent: 100,
        status: 'exceeded',
        label: `Superato di ${diff} ${diff === 1 ? 'occasione' : 'occasioni'}`,
        isExceeded: true,
        isReached: true,
        hasTarget: true
      };
    }

    if (safeCount === safeTarget) {
      return {
        percent: 100,
        status: 'reached',
        label: 'Obiettivo raggiunto',
        isExceeded: false,
        isReached: true,
        hasTarget: true
      };
    }

    const remaining = safeTarget - safeCount;
    return {
      percent: percent,
      status: 'in_progress',
      label: `Mancano ${remaining} ${remaining === 1 ? 'occasione' : 'occasioni'}`,
      isExceeded: false,
      isReached: false,
      hasTarget: true
    };
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============================================================================
  // 3. STATO APPLICATIVO
  // ============================================================================

  const state = {
    categories: DEFAULT_CATEGORIES,
    customCategoryName: 'Altro',
    targets: {},
    counts: {},
    weekKey: '',
    notes: ''
  };

  let pendingImportData = null;

  function loadState() {
    const isInitialized = SafeStorage.get(STORAGE_KEYS.INITIALIZED) === 'true';
    const savedCustomName = SafeStorage.get(STORAGE_KEYS.CUSTOM_NAME);
    state.customCategoryName = savedCustomName && savedCustomName.trim() ? savedCustomName.trim() : 'Altro';

    try {
      const rawTargets = JSON.parse(SafeStorage.get(STORAGE_KEYS.TARGETS) || '{}');
      state.targets = {};
      for (const cat of state.categories) {
        const val = parseInt(rawTargets[cat.id], 10);
        state.targets[cat.id] = isNaN(val) || val < 0 ? 0 : val;
      }
    } catch (e) {
      state.targets = {};
      for (const cat of state.categories) state.targets[cat.id] = 0;
    }

    state.notes = SafeStorage.get(STORAGE_KEYS.NOTES) || '';

    const savedWeekKey = SafeStorage.get(STORAGE_KEYS.WEEK_KEY);
    let savedCounts = {};
    try {
      savedCounts = JSON.parse(SafeStorage.get(STORAGE_KEYS.COUNTS) || '{}');
    } catch (e) {
      savedCounts = {};
    }

    const rollover = checkWeekRollover(new Date(), savedWeekKey, savedCounts, state.categories);
    state.weekKey = rollover.currentWeekKey;
    state.counts = rollover.counts;

    SafeStorage.set(STORAGE_KEYS.WEEK_KEY, state.weekKey);
    SafeStorage.set(STORAGE_KEYS.COUNTS, JSON.stringify(state.counts));

    return isInitialized;
  }

  function saveWeekAndCounts() {
    SafeStorage.set(STORAGE_KEYS.WEEK_KEY, state.weekKey);
    SafeStorage.set(STORAGE_KEYS.COUNTS, JSON.stringify(state.counts));
  }

  function saveTargetsAndSettings() {
    SafeStorage.set(STORAGE_KEYS.TARGETS, JSON.stringify(state.targets));
    SafeStorage.set(STORAGE_KEYS.CUSTOM_NAME, state.customCategoryName);
    SafeStorage.set(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // ============================================================================
  // 4. RENDERING INTERFACCIA
  // ============================================================================

  function renderWeekHeader() {
    const now = new Date();
    const weekDatesEl = document.getElementById('week-dates');
    const currentDayNameEl = document.getElementById('current-day-name');
    const weekDaysGridEl = document.getElementById('week-days-grid');

    if (weekDatesEl) {
      weekDatesEl.textContent = formatWeekRange(now);
    }
    if (currentDayNameEl) {
      currentDayNameEl.textContent = `Oggi: ${DAY_NAMES_IT[now.getDay()]}`;
    }

    // Rendering del Quadrante dei 7 Giorni della Settimana (Lunedì -> Domenica)
    if (weekDaysGridEl) {
      const days = getWeekDays(now);
      weekDaysGridEl.innerHTML = '';
      for (const day of days) {
        const cell = document.createElement('div');
        cell.className = `day-cell ${day.isToday ? 'is-today' : ''} ${day.isFirstDay ? 'is-first-day' : ''}`;
        cell.innerHTML = `
          <span class="day-cell-name">${day.nameShort}</span>
          <span class="day-cell-num">${day.dayNumber}</span>
          <span class="day-cell-label">${day.isToday ? 'Oggi' : day.monthShort}</span>
        `;
        weekDaysGridEl.appendChild(cell);
      }
    }
  }

  function renderCategories() {
    const container = document.getElementById('categories-container');
    if (!container) return;
    container.innerHTML = '';

    for (const cat of state.categories) {
      const isCustom = cat.isCustom;
      const catName = isCustom ? state.customCategoryName : cat.name;
      const count = state.counts[cat.id] || 0;
      const target = state.targets[cat.id] || 0;

      const progress = calculateProgress(count, target);

      const card = document.createElement('div');
      card.className = `category-card ${progress.isExceeded ? 'is-exceeded' : ''} ${progress.isReached && !progress.isExceeded ? 'is-reached' : ''} ${!progress.hasTarget ? 'no-target' : ''}`;
      card.setAttribute('data-category-id', cat.id);

      let badgeHtml = '';
      if (!progress.hasTarget) {
        badgeHtml = `<span class="counter-badge badge-no-target">Nessun obiettivo impostato</span>`;
      } else if (progress.isExceeded) {
        badgeHtml = `<span class="counter-badge badge-exceeded">Superato di ${count - target}</span>`;
      } else if (progress.isReached) {
        badgeHtml = `<span class="counter-badge badge-reached">Obiettivo raggiunto ✓</span>`;
      } else {
        badgeHtml = `<span class="counter-badge badge-in-progress">${count} su ${target}</span>`;
      }

      card.innerHTML = `
        <div class="category-header">
          <div class="category-identity">
            <span class="category-icon">${cat.icon}</span>
            <div class="category-name-group">
              <span class="category-name">${escapeHtml(catName)}</span>
              <span class="category-target-subtext">Obiettivo settimanale: ${target > 0 ? target + ' pasti' : 'Non impostato'}</span>
            </div>
          </div>
          <div class="category-counter-wrap">
            <div class="counter-fraction">
              <span class="current-count">${count}</span>${target > 0 ? `<span class="target-count"> / ${target}</span>` : ''}
            </div>
            ${badgeHtml}
          </div>
        </div>

        <div class="progress-bar-track" aria-hidden="true">
          <div class="progress-bar-fill" style="width: ${progress.percent}%;"></div>
        </div>

        <div class="category-controls">
          <span class="status-label">${escapeHtml(progress.label)}</span>
          <div class="stepper-buttons">
            <button 
              type="button" 
              class="btn-step-minus" 
              data-action="decrement" 
              data-category="${cat.id}"
              aria-label="Diminuisci ${escapeHtml(catName)}"
              ${count <= 0 ? 'disabled' : ''}
            >−</button>
            <button 
              type="button" 
              class="btn-step-plus" 
              data-action="increment" 
              data-category="${cat.id}"
              aria-label="Aggiungi consumo ${escapeHtml(catName)}"
            >+</button>
          </div>
        </div>
      `;

      container.appendChild(card);
    }
  }

  function handleCategoryClick(event) {
    const targetBtn = event.target.closest('button[data-action]');
    if (!targetBtn) return;

    const action = targetBtn.getAttribute('data-action');
    const catId = targetBtn.getAttribute('data-category');
    if (!catId) return;

    verifyWeekTransition();

    const currentVal = state.counts[catId] || 0;
    if (action === 'increment') {
      state.counts[catId] = currentVal + 1;
      saveWeekAndCounts();
      renderCategories();
    } else if (action === 'decrement') {
      if (currentVal > 0) {
        state.counts[catId] = Math.max(0, currentVal - 1);
        saveWeekAndCounts();
        renderCategories();
      }
    }
  }

  function verifyWeekTransition() {
    const now = new Date();
    const rollover = checkWeekRollover(now, state.weekKey, state.counts, state.categories);
    if (rollover.rolledOver) {
      state.weekKey = rollover.currentWeekKey;
      state.counts = rollover.counts;
      saveWeekAndCounts();
      renderWeekHeader();
      renderCategories();
      const toast = document.getElementById('rollover-toast');
      if (toast) {
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 8000);
      }
    } else {
      renderWeekHeader();
    }
  }

  function initNotes() {
    const textarea = document.getElementById('notes-textarea');
    const status = document.getElementById('notes-status');
    const btnClear = document.getElementById('btn-clear-notes');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete-notes-apply');

    if (textarea) {
      textarea.value = state.notes;

      let timer = null;
      textarea.addEventListener('input', (e) => {
        state.notes = e.target.value;
        SafeStorage.set(STORAGE_KEYS.NOTES, state.notes);

        if (status) {
          status.textContent = 'Salvataggio in corso...';
          status.style.opacity = '1';
        }

        clearTimeout(timer);
        timer = setTimeout(() => {
          if (status) {
            status.textContent = 'Salvato automaticamente ✓';
          }
        }, 500);
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        openModal(document.getElementById('modal-confirm-delete-notes'));
      });
    }

    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', () => {
        state.notes = '';
        SafeStorage.set(STORAGE_KEYS.NOTES, '');
        if (textarea) textarea.value = '';
        if (status) status.textContent = 'Note cancellate';
        closeModal(document.getElementById('modal-confirm-delete-notes'));
      });
    }
  }

  // ============================================================================
  // 5. GESTIONE FINESTRE MODALI & IMPOSTAZIONI
  // ============================================================================

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function populateSettingsForm(isFirstRun = false) {
    const listEl = document.getElementById('settings-categories-list');
    const titleEl = document.getElementById('settings-modal-title');
    const customNameInput = document.getElementById('custom-name-input');

    if (titleEl) {
      titleEl.textContent = isFirstRun
        ? 'Configurazione Iniziale'
        : 'Modifica Obiettivi Settimanali';
    }

    if (!listEl) return;
    listEl.innerHTML = '';

    for (const cat of state.categories) {
      const isCustom = cat.isCustom;
      const currentTarget = state.targets[cat.id] ?? 0;
      const catName = isCustom ? (state.customCategoryName || 'Altro') : cat.name;

      const row = document.createElement('div');
      row.className = 'target-setting-row';
      row.innerHTML = `
        <div class="target-setting-label">
          <span>${cat.icon}</span>
          <span>${escapeHtml(catName)}</span>
        </div>
        <div class="target-stepper">
          <button type="button" class="btn-stepper-adj" data-target-id="${cat.id}" data-op="-">−</button>
          <input 
            type="number" 
            id="target-input-${cat.id}"
            name="target_${cat.id}" 
            class="target-input" 
            min="0" 
            max="99" 
            value="${currentTarget}"
            aria-label="Obiettivo per ${escapeHtml(catName)}"
          />
          <button type="button" class="btn-stepper-adj" data-target-id="${cat.id}" data-op="+">+</button>
        </div>
      `;
      listEl.appendChild(row);
    }

    if (customNameInput) {
      customNameInput.value = state.customCategoryName || 'Altro';
    }
  }

  function handleSettingsSubmit(e) {
    e.preventDefault();

    for (const cat of state.categories) {
      const input = document.getElementById(`target-input-${cat.id}`);
      const val = input ? parseInt(input.value, 10) : 0;
      state.targets[cat.id] = isNaN(val) || val < 0 ? 0 : val;
    }

    const customNameInput = document.getElementById('custom-name-input');
    if (customNameInput) {
      const customVal = customNameInput.value.trim();
      state.customCategoryName = customVal.length > 0 ? customVal.slice(0, 50) : 'Altro';
    }

    saveTargetsAndSettings();
    renderCategories();
    closeModal(document.getElementById('modal-settings'));

    // Nascondi eventuale banner onboarding se presente
    const banner = document.getElementById('onboarding-banner');
    if (banner) banner.style.display = 'none';
  }

  function handleSettingsStepperClick(e) {
    const btn = e.target.closest('.btn-stepper-adj');
    if (!btn) return;
    const targetId = btn.getAttribute('data-target-id');
    const op = btn.getAttribute('data-op');
    const input = document.getElementById(`target-input-${targetId}`);
    if (!input) return;

    let val = parseInt(input.value, 10) || 0;
    if (op === '+') val++;
    else if (op === '-' && val > 0) val--;
    input.value = Math.max(0, val);
  }

  // ============================================================================
  // 6. FUNZIONI GLOBALI (Richiamabili direttamente da attributi HTML onclick)
  // ============================================================================

  window.openSettingsModal = function() {
    populateSettingsForm(false);
    openModal(document.getElementById('modal-settings'));
  };

  window.openDataModal = function() {
    openModal(document.getElementById('modal-data'));
  };

  window.openInstallModal = function() {
    const isAndroid = /android/i.test(navigator.userAgent || '');
    if (isAndroid && typeof window.switchInstallTab === 'function') {
      window.switchInstallTab('android');
    } else if (typeof window.switchInstallTab === 'function') {
      window.switchInstallTab('ios');
    }
    openModal(document.getElementById('modal-install'));
  };

  window.closeAllModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(closeModal);
  };

  window.switchInstallTab = function(platform) {
    const tabIos = document.getElementById('tab-btn-ios');
    const tabAndroid = document.getElementById('tab-btn-android');
    const guideIos = document.getElementById('install-guide-ios');
    const guideAndroid = document.getElementById('install-guide-android');

    if (platform === 'android') {
      if (tabIos) tabIos.classList.remove('active');
      if (tabAndroid) tabAndroid.classList.add('active');
      if (guideIos) guideIos.style.display = 'none';
      if (guideAndroid) guideAndroid.style.display = 'block';
    } else {
      if (tabAndroid) tabAndroid.classList.remove('active');
      if (tabIos) tabIos.classList.add('active');
      if (guideAndroid) guideAndroid.style.display = 'none';
      if (guideIos) guideIos.style.display = 'block';
    }
  };

  // ============================================================================
  // 7. BACKUP, RIPRISTINO & DOWNLOAD ZIP
  // ============================================================================

  function initBackupAndData() {
    const btnExport = document.getElementById('btn-export-backup');
    const fileInput = document.getElementById('file-input-import');
    const btnConfirmImport = document.getElementById('btn-confirm-import-apply');
    const btnDownloadZip = document.getElementById('btn-download-zip');

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const now = new Date();
        const backupObject = {
          app: 'pasti_della_settimana',
          version: '1.0',
          exportDate: now.toISOString(),
          weekKey: state.weekKey,
          weekFormatted: formatWeekRange(now),
          customCategoryName: state.customCategoryName,
          targets: state.targets,
          counts: state.counts,
          notes: state.notes
        };
        const jsonString = JSON.stringify(backupObject, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pasti-settimana-backup-${state.weekKey}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            const currentWeekKey = getWeekKey(new Date());
            const isPast = parsed.weekKey !== currentWeekKey;

            const targets = {};
            for (const cat of DEFAULT_CATEGORIES) {
              const val = parseInt(parsed.targets?.[cat.id], 10);
              targets[cat.id] = isNaN(val) || val < 0 ? 0 : val;
            }
            const customCategoryName = parsed.customCategoryName || 'Altro';
            const notes = parsed.notes || '';
            const counts = {};
            for (const cat of DEFAULT_CATEGORIES) {
              counts[cat.id] = isPast ? 0 : (parseInt(parsed.counts?.[cat.id], 10) || 0);
            }

            pendingImportData = { targets, customCategoryName, notes, counts, weekKey: currentWeekKey, isPastWeek: isPast, backupWeekKey: parsed.weekKey };

            const confText = document.getElementById('import-confirmation-text');
            if (confText) {
              confText.innerHTML = `
                <p><strong>Riepilogo dati del backup:</strong></p>
                <ul style="margin: 8px 0 8px 20px; font-size: 0.88rem; line-height: 1.4;">
                  <li>Settimana del backup: <code>${escapeHtml(parsed.weekKey || 'N/D')}</code></li>
                  <li>Settimana attuale: <code>${escapeHtml(currentWeekKey)}</code></li>
                  <li>Categoria personalizzata: <strong>${escapeHtml(customCategoryName)}</strong></li>
                </ul>
                ${isPast 
                  ? `<div style="background: #FFF9E6; border: 1px solid #FFE699; padding: 10px; border-radius: 8px; font-size: 0.85rem; color: #8A6400;">
                       <strong>Nota importante:</strong> Questo backup appartiene a una settimana precedente. 
                       Obiettivi, nome personalizzato e note verranno ripristinati, ma i consumi della settimana attuale saranno azzerati.
                     </div>`
                  : `<div style="background: #EBF7EE; border: 1px solid #C4E8CC; padding: 10px; border-radius: 8px; font-size: 0.85rem; color: #2B683B;">
                       Questo backup è della settimana corrente. Verranno ripristinati sia gli obiettivi che i consumi registrati.
                     </div>`
                }
              `;
            }
            closeModal(document.getElementById('modal-data'));
            openModal(document.getElementById('modal-confirm-import'));
          } catch (err) {
            alert('Errore nel file di backup. Verifica che sia un file JSON corretto.');
          } finally {
            event.target.value = '';
          }
        };
        reader.readAsText(file);
      });
    }

    if (btnConfirmImport) {
      btnConfirmImport.addEventListener('click', () => {
        if (!pendingImportData) return;
        state.targets = pendingImportData.targets;
        state.customCategoryName = pendingImportData.customCategoryName;
        state.notes = pendingImportData.notes;
        state.counts = pendingImportData.counts;
        state.weekKey = pendingImportData.weekKey;

        saveTargetsAndSettings();
        saveWeekAndCounts();
        SafeStorage.set(STORAGE_KEYS.NOTES, state.notes);

        const textarea = document.getElementById('notes-textarea');
        if (textarea) textarea.value = state.notes;

        renderWeekHeader();
        renderCategories();
        closeModal(document.getElementById('modal-confirm-import'));
        pendingImportData = null;
        alert('Backup ripristinato con successo!');
      });
    }

    if (btnDownloadZip) {
      btnDownloadZip.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = './pasti-della-settimana-pwa.zip';
        a.download = 'pasti-della-settimana-pwa.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }
  }

  // ============================================================================
  // 8. INIZIALIZZAZIONE EVENTI E DOM
  // ============================================================================

  function initModals() {
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        closeModal(modal);
        SafeStorage.set(STORAGE_KEYS.INITIALIZED, 'true');
      });
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal(overlay);
          SafeStorage.set(STORAGE_KEYS.INITIALIZED, 'true');
        }
      });
    });

    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', handleSettingsSubmit);
      settingsForm.addEventListener('click', handleSettingsStepperClick);
    }
  }

  function init() {
    const isInitialized = loadState();
    renderWeekHeader();
    renderCategories();
    initNotes();
    initModals();
    initBackupAndData();

    const categoriesContainer = document.getElementById('categories-container');
    if (categoriesContainer) {
      categoriesContainer.addEventListener('click', handleCategoryClick);
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) verifyWeekTransition();
    });
    window.addEventListener('focus', verifyWeekTransition);
    window.addEventListener('pageshow', verifyWeekTransition);
    setInterval(verifyWeekTransition, 15000);

    // Se primo avvio, mostra il banner informativo
    const banner = document.getElementById('onboarding-banner');
    if (!isInitialized && banner) {
      banner.style.display = 'flex';
    }
  }

  // Registrazione Service Worker per offline su GitHub Pages
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
