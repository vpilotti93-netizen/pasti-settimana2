/**
* Pasti della settimana - PWA Vanilla JavaScript Application
* 100% Client-Side, LocalStorage, Zero External Dependencies, Zero Bundler required.
* Self-contained for seamless deployment on GitHub Pages.
*/
// ============================================================================
// 1. PURE LOGIC & UTILITIES (Inlined for 100% zero-dependency portability)
// ============================================================================
const DEFAULT_CATEGORIES = [
	{
		id: "carne_rossa",
		name: "Carne rossa",
		icon: "🥩"
	},
	{
		id: "carne_bianca",
		name: "Carne bianca",
		icon: "🍗"
	},
	{
		id: "formaggio",
		name: "Formaggio",
		icon: "🧀"
	},
	{
		id: "uova",
		name: "Uova",
		icon: "🥚"
	},
	{
		id: "legumi",
		name: "Legumi",
		icon: "🫘"
	},
	{
		id: "altro",
		name: "Altro",
		icon: "🍽️",
		isCustom: true
	}
];
const MONTHS_IT = [
	"gennaio",
	"febbraio",
	"marzo",
	"aprile",
	"maggio",
	"giugno",
	"luglio",
	"agosto",
	"settembre",
	"ottobre",
	"novembre",
	"dicembre"
];
const DAY_NAMES_IT = [
	"Domenica",
	"Lunedì",
	"Martedì",
	"Mercoledì",
	"Giovedì",
	"Venerdì",
	"Sabato"
];
function getMonday(date = new Date()) {
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const day = d.getDay();
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
	const m = String(monday.getMonth() + 1).padStart(2, "0");
	const d = String(monday.getDate()).padStart(2, "0");
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
		if (typeof sanitized[cat.id] !== "number" || sanitized[cat.id] < 0) {
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
			status: safeCount === 0 ? "zero_zero" : "no_target",
			label: "Nessun obiettivo impostato",
			isExceeded: false,
			isReached: false,
			hasTarget: false,
			displayCountTarget: `${safeCount} (nessun obiettivo)`
		};
	}
	const percent = Math.min(100, Math.round(safeCount / safeTarget * 100));
	if (safeCount > safeTarget) {
		const diff = safeCount - safeTarget;
		return {
			percent: 100,
			status: "exceeded",
			label: `Superato di ${diff} ${diff === 1 ? "occasione" : "occasioni"}`,
			isExceeded: true,
			isReached: true,
			hasTarget: true,
			displayCountTarget: `${safeCount} / ${safeTarget}`
		};
	}
	if (safeCount === safeTarget) {
		return {
			percent: 100,
			status: "reached",
			label: "Obiettivo raggiunto",
			isExceeded: false,
			isReached: true,
			hasTarget: true,
			displayCountTarget: `${safeCount} / ${safeTarget}`
		};
	}
	const remaining = safeTarget - safeCount;
	return {
		percent,
		status: "in_progress",
		label: `Mancano ${remaining} ${remaining === 1 ? "occasione" : "occasioni"}`,
		isExceeded: false,
		isReached: false,
		hasTarget: true,
		displayCountTarget: `${safeCount} / ${safeTarget}`
	};
}
function validateAndProcessBackup(raw, currentDate = new Date()) {
	if (!raw || typeof raw !== "object") {
		return {
			valid: false,
			error: "Il file di backup non contiene un oggetto JSON valido."
		};
	}
	const appIdentifier = raw.app;
	if (appIdentifier && appIdentifier !== "pasti_della_settimana") {
		return {
			valid: false,
			error: "Il file non sembra essere un backup di \"Pasti della settimana\"."
		};
	}
	const targets = {};
	if (raw.targets && typeof raw.targets === "object") {
		for (const cat of DEFAULT_CATEGORIES) {
			const val = parseInt(raw.targets[cat.id], 10);
			targets[cat.id] = isNaN(val) || val < 0 ? 0 : val;
		}
	} else {
		for (const cat of DEFAULT_CATEGORIES) {
			targets[cat.id] = 0;
		}
	}
	const customCategoryName = typeof raw.customCategoryName === "string" && raw.customCategoryName.trim().length > 0 ? raw.customCategoryName.trim().slice(0, 50) : "Altro";
	const notes = typeof raw.notes === "string" ? raw.notes : "";
	const currentWeekKey = getWeekKey(currentDate);
	const backupWeekKey = typeof raw.weekKey === "string" ? raw.weekKey : "";
	const isPastWeek = backupWeekKey !== currentWeekKey;
	const counts = {};
	for (const cat of DEFAULT_CATEGORIES) {
		if (isPastWeek) {
			counts[cat.id] = 0;
		} else {
			const val = raw.counts ? parseInt(raw.counts[cat.id], 10) : 0;
			counts[cat.id] = isNaN(val) || val < 0 ? 0 : val;
		}
	}
	return {
		valid: true,
		data: {
			targets,
			customCategoryName,
			notes,
			weekKey: currentWeekKey,
			counts,
			isPastWeek,
			backupWeekKey
		}
	};
}
// ============================================================================
// 2. PURE JAVASCRIPT ZIP BUILDER (Self-contained, zero-CDN)
// ============================================================================
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++) {
		c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
	}
	crcTable[n] = c;
}
function calculateCRC32(data) {
	let crc = 4294967295;
	for (let i = 0; i < data.length; i++) {
		crc = crcTable[(crc ^ data[i]) & 255] ^ crc >>> 8;
	}
	return (crc ^ 4294967295) >>> 0;
}
class SimpleZip {
	constructor() {
		this.files = [];
	}
	addFile(path, content) {
		let bytes;
		if (typeof content === "string") {
			bytes = new TextEncoder().encode(content);
		} else if (content instanceof Uint8Array) {
			bytes = content;
		} else {
			bytes = new Uint8Array(content);
		}
		this.files.push({
			path,
			bytes,
			crc: calculateCRC32(bytes)
		});
	}
	generateBlob() {
		const parts = [];
		const centralDirectoryHeaders = [];
		let offset = 0;
		const now = new Date();
		const dosTime = (now.getHours() << 11 | now.getMinutes() << 5 | Math.floor(now.getSeconds() / 2)) & 65535;
		const dosDate = (now.getFullYear() - 1980 << 9 | now.getMonth() + 1 << 5 | now.getDate()) & 65535;
		for (const file of this.files) {
			const nameBytes = new TextEncoder().encode(file.path);
			const fileLength = file.bytes.length;
			const lfh = new Uint8Array(30 + nameBytes.length);
			const lfhView = new DataView(lfh.buffer);
			lfhView.setUint32(0, 67324752, true);
			lfhView.setUint16(4, 20, true);
			lfhView.setUint16(6, 2048, true);
			lfhView.setUint16(8, 0, true);
			lfhView.setUint16(10, dosTime, true);
			lfhView.setUint16(12, dosDate, true);
			lfhView.setUint32(14, file.crc, true);
			lfhView.setUint32(18, fileLength, true);
			lfhView.setUint32(22, fileLength, true);
			lfhView.setUint16(26, nameBytes.length, true);
			lfhView.setUint16(28, 0, true);
			lfh.set(nameBytes, 30);
			parts.push(lfh);
			parts.push(file.bytes);
			const cdh = new Uint8Array(46 + nameBytes.length);
			const cdhView = new DataView(cdh.buffer);
			cdhView.setUint32(0, 33639248, true);
			cdhView.setUint16(4, 20, true);
			cdhView.setUint16(6, 20, true);
			cdhView.setUint16(8, 2048, true);
			cdhView.setUint16(10, 0, true);
			cdhView.setUint16(12, dosTime, true);
			cdhView.setUint16(14, dosDate, true);
			cdhView.setUint32(16, file.crc, true);
			cdhView.setUint32(20, fileLength, true);
			cdhView.setUint32(24, fileLength, true);
			cdhView.setUint16(28, nameBytes.length, true);
			cdhView.setUint16(30, 0, true);
			cdhView.setUint16(32, 0, true);
			cdhView.setUint16(34, 0, true);
			cdhView.setUint16(36, 0, true);
			cdhView.setUint32(38, 0, true);
			cdhView.setUint32(42, offset, true);
			cdh.set(nameBytes, 46);
			centralDirectoryHeaders.push(cdh);
			offset += lfh.length + fileLength;
		}
		const cdStartOffset = offset;
		let cdSize = 0;
		for (const cdh of centralDirectoryHeaders) {
			parts.push(cdh);
			cdSize += cdh.length;
		}
		const eocd = new Uint8Array(22);
		const eocdView = new DataView(eocd.buffer);
		eocdView.setUint32(0, 101010256, true);
		eocdView.setUint16(4, 0, true);
		eocdView.setUint16(6, 0, true);
		eocdView.setUint16(8, this.files.length, true);
		eocdView.setUint16(10, this.files.length, true);
		eocdView.setUint32(12, cdSize, true);
		eocdView.setUint32(16, cdStartOffset, true);
		eocdView.setUint16(20, 0, true);
		parts.push(eocd);
		return new Blob(parts, { type: "application/zip" });
	}
}
// ============================================================================
// 3. APPLICATION STATE & CONTROLLER
// ============================================================================
const STORAGE_KEYS = {
	INITIALIZED: "pasti_app_initialized",
	TARGETS: "pasti_targets",
	COUNTS: "pasti_counts",
	WEEK_KEY: "pasti_current_week_key",
	NOTES: "pasti_notes",
	CUSTOM_NAME: "pasti_custom_category_name"
};
const state = {
	categories: DEFAULT_CATEGORIES,
	customCategoryName: "Altro",
	targets: {},
	counts: {},
	weekKey: "",
	notes: ""
};
const elements = {
	weekDates: document.getElementById("week-dates"),
	currentDayName: document.getElementById("current-day-name"),
	rolloverToast: document.getElementById("rollover-toast"),
	categoriesContainer: document.getElementById("categories-container"),
	notesTextarea: document.getElementById("notes-textarea"),
	notesStatus: document.getElementById("notes-status"),
	btnClearNotes: document.getElementById("btn-clear-notes"),
	btnSettings: document.getElementById("btn-settings"),
	btnData: document.getElementById("btn-data"),
	btnInstall: document.getElementById("btn-install"),
	modalSettings: document.getElementById("modal-settings"),
	modalData: document.getElementById("modal-data"),
	modalInstall: document.getElementById("modal-install"),
	modalConfirmDeleteNotes: document.getElementById("modal-confirm-delete-notes"),
	modalConfirmImport: document.getElementById("modal-confirm-import"),
	settingsForm: document.getElementById("settings-form"),
	settingsCategoriesList: document.getElementById("settings-categories-list"),
	customNameInput: document.getElementById("custom-name-input"),
	settingsModalTitle: document.getElementById("settings-modal-title"),
	btnExportBackup: document.getElementById("btn-export-backup"),
	fileInputImport: document.getElementById("file-input-import"),
	btnDownloadZip: document.getElementById("btn-download-zip"),
	importConfirmationText: document.getElementById("import-confirmation-text"),
	btnConfirmImportApply: document.getElementById("btn-confirm-import-apply"),
	btnConfirmDeleteNotesApply: document.getElementById("btn-confirm-delete-notes-apply")
};
let pendingImportData = null;
function loadState() {
	const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED) === "true";
	const savedCustomName = localStorage.getItem(STORAGE_KEYS.CUSTOM_NAME);
	state.customCategoryName = savedCustomName && savedCustomName.trim() ? savedCustomName.trim() : "Altro";
	try {
		const rawTargets = JSON.parse(localStorage.getItem(STORAGE_KEYS.TARGETS) || "{}");
		state.targets = {};
		for (const cat of state.categories) {
			const val = parseInt(rawTargets[cat.id], 10);
			state.targets[cat.id] = isNaN(val) || val < 0 ? 0 : val;
		}
	} catch (e) {
		state.targets = {};
		for (const cat of state.categories) state.targets[cat.id] = 0;
	}
	state.notes = localStorage.getItem(STORAGE_KEYS.NOTES) || "";
	const savedWeekKey = localStorage.getItem(STORAGE_KEYS.WEEK_KEY);
	let savedCounts = {};
	try {
		savedCounts = JSON.parse(localStorage.getItem(STORAGE_KEYS.COUNTS) || "{}");
	} catch (e) {
		savedCounts = {};
	}
	const rollover = checkWeekRollover(new Date(), savedWeekKey, savedCounts, state.categories);
	state.weekKey = rollover.currentWeekKey;
	state.counts = rollover.counts;
	saveWeekAndCounts();
	return isInitialized;
}
function saveWeekAndCounts() {
	localStorage.setItem(STORAGE_KEYS.WEEK_KEY, state.weekKey);
	localStorage.setItem(STORAGE_KEYS.COUNTS, JSON.stringify(state.counts));
}
function saveTargetsAndSettings() {
	localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(state.targets));
	localStorage.setItem(STORAGE_KEYS.CUSTOM_NAME, state.customCategoryName);
	localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
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
		showRolloverNotification();
	} else {
		renderWeekHeader();
	}
}
function showRolloverNotification() {
	if (elements.rolloverToast) {
		elements.rolloverToast.classList.add("visible");
		setTimeout(() => {
			elements.rolloverToast.classList.remove("visible");
		}, 8e3);
	}
}
function renderWeekHeader() {
	const now = new Date();
	if (elements.weekDates) {
		elements.weekDates.textContent = formatWeekRange(now);
	}
	if (elements.currentDayName) {
		elements.currentDayName.textContent = `Oggi: ${DAY_NAMES_IT[now.getDay()]}`;
	}
}
function renderCategories() {
	if (!elements.categoriesContainer) return;
	elements.categoriesContainer.innerHTML = "";
	for (const cat of state.categories) {
		const isCustom = cat.isCustom;
		const catName = isCustom ? state.customCategoryName : cat.name;
		const count = state.counts[cat.id] || 0;
		const target = state.targets[cat.id] || 0;
		const progress = calculateProgress(count, target);
		const card = document.createElement("div");
		card.className = `category-card ${progress.isExceeded ? "is-exceeded" : ""} ${progress.isReached && !progress.isExceeded ? "is-reached" : ""} ${!progress.hasTarget ? "no-target" : ""}`;
		card.setAttribute("data-category-id", cat.id);
		let badgeHtml = "";
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
            <span class="category-target-subtext">Obiettivo settimanale: ${target > 0 ? target + " pasti" : "Non impostato"}</span>
          </div>
        </div>
        <div class="category-counter-wrap">
          <div class="counter-fraction">
            <span class="current-count">${count}</span>${target > 0 ? `<span class="target-count"> / ${target}</span>` : ""}
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
            ${count <= 0 ? "disabled" : ""}
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
		elements.categoriesContainer.appendChild(card);
	}
}
function handleCategoryClick(event) {
	const targetBtn = event.target.closest("button[data-action]");
	if (!targetBtn) return;
	const action = targetBtn.getAttribute("data-action");
	const catId = targetBtn.getAttribute("data-category");
	if (!catId) return;
	verifyWeekTransition();
	const currentVal = state.counts[catId] || 0;
	if (action === "increment") {
		state.counts[catId] = currentVal + 1;
		saveWeekAndCounts();
		renderCategories();
	} else if (action === "decrement") {
		if (currentVal > 0) {
			state.counts[catId] = Math.max(0, currentVal - 1);
			saveWeekAndCounts();
			renderCategories();
		}
	}
}
function initNotes() {
	if (!elements.notesTextarea) return;
	elements.notesTextarea.value = state.notes;
	let saveTimer = null;
	elements.notesTextarea.addEventListener("input", (e) => {
		state.notes = e.target.value;
		localStorage.setItem(STORAGE_KEYS.NOTES, state.notes);
		if (elements.notesStatus) {
			elements.notesStatus.textContent = "Salvataggio in corso...";
			elements.notesStatus.style.opacity = "1";
		}
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			if (elements.notesStatus) {
				elements.notesStatus.textContent = "Salvato automaticamente ✓";
			}
		}, 600);
	});
	if (elements.btnClearNotes) {
		elements.btnClearNotes.addEventListener("click", () => {
			openModal(elements.modalConfirmDeleteNotes);
		});
	}
	if (elements.btnConfirmDeleteNotesApply) {
		elements.btnConfirmDeleteNotesApply.addEventListener("click", () => {
			state.notes = "";
			localStorage.setItem(STORAGE_KEYS.NOTES, "");
			if (elements.notesTextarea) elements.notesTextarea.value = "";
			if (elements.notesStatus) elements.notesStatus.textContent = "Note cancellate";
			closeModal(elements.modalConfirmDeleteNotes);
		});
	}
}
function populateSettingsForm(isFirstRun = false) {
	if (!elements.settingsCategoriesList) return;
	elements.settingsCategoriesList.innerHTML = "";
	if (elements.settingsModalTitle) {
		elements.settingsModalTitle.textContent = isFirstRun ? "Configurazione Iniziale" : "Modifica Obiettivi Settimanali";
	}
	for (const cat of state.categories) {
		const isCustom = cat.isCustom;
		const currentTarget = state.targets[cat.id] ?? 0;
		const catName = isCustom ? state.customCategoryName || "Altro" : cat.name;
		const row = document.createElement("div");
		row.className = "target-setting-row";
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
		elements.settingsCategoriesList.appendChild(row);
	}
	if (elements.customNameInput) {
		elements.customNameInput.value = state.customCategoryName || "Altro";
	}
}
function handleSettingsStepperClick(e) {
	const btn = e.target.closest(".btn-stepper-adj");
	if (!btn) return;
	const targetId = btn.getAttribute("data-target-id");
	const op = btn.getAttribute("data-op");
	const input = document.getElementById(`target-input-${targetId}`);
	if (!input) return;
	let val = parseInt(input.value, 10) || 0;
	if (op === "+") val++;
	else if (op === "-" && val > 0) val--;
	input.value = Math.max(0, val);
}
function handleSettingsSubmit(e) {
	e.preventDefault();
	for (const cat of state.categories) {
		const input = document.getElementById(`target-input-${cat.id}`);
		const val = input ? parseInt(input.value, 10) : 0;
		state.targets[cat.id] = isNaN(val) || val < 0 ? 0 : val;
	}
	if (elements.customNameInput) {
		const customVal = elements.customNameInput.value.trim();
		state.customCategoryName = customVal.length > 0 ? customVal.slice(0, 50) : "Altro";
	}
	saveTargetsAndSettings();
	renderCategories();
	closeModal(elements.modalSettings);
}
function exportBackup() {
	const now = new Date();
	const backupObject = {
		app: "pasti_della_settimana",
		version: "1.0",
		exportDate: now.toISOString(),
		weekKey: state.weekKey,
		weekFormatted: formatWeekRange(now),
		customCategoryName: state.customCategoryName,
		targets: state.targets,
		counts: state.counts,
		notes: state.notes
	};
	const jsonString = JSON.stringify(backupObject, null, 2);
	const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `pasti-settimana-backup-${state.weekKey}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
function handleFileImport(event) {
	const file = event.target.files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = (e) => {
		try {
			const parsed = JSON.parse(e.target.result);
			const validation = validateAndProcessBackup(parsed, new Date());
			if (!validation.valid) {
				alert(`Errore nel file di backup: ${validation.error}`);
				return;
			}
			pendingImportData = validation.data;
			const isPast = pendingImportData.isPastWeek;
			if (elements.importConfirmationText) {
				elements.importConfirmationText.innerHTML = `
          <p><strong>Stai per importare il backup:</strong></p>
          <ul style="margin: 8px 0 8px 20px; font-size: 0.88rem; line-height: 1.4;">
            <li>Settimana del backup: <code>${escapeHtml(pendingImportData.backupWeekKey || "N/D")}</code></li>
            <li>Settimana attuale: <code>${escapeHtml(state.weekKey)}</code></li>
            <li>Categoria "Altro": <strong>${escapeHtml(pendingImportData.customCategoryName)}</strong></li>
          </ul>
          ${isPast ? `<div style="background: #FFF9E6; border: 1px solid #FFE699; padding: 10px; border-radius: 8px; font-size: 0.85rem; color: #8A6400;">
                 <strong>Nota importante:</strong> Questo backup appartiene a una settimana precedente. 
                 Verranno ripristinati gli obiettivi, il nome personalizzato e le note, ma i consumi della settimana attuale saranno impostati a zero.
               </div>` : `<div style="background: #EBF7EE; border: 1px solid #C4E8CC; padding: 10px; border-radius: 8px; font-size: 0.85rem; color: #2B683B;">
                 Questo backup è della settimana corrente. Verranno ripristinati sia gli obiettivi che i consumi registrati.
               </div>`}
        `;
			}
			closeModal(elements.modalData);
			openModal(elements.modalConfirmImport);
		} catch (err) {
			alert("Impossibile leggere il file JSON. Assicurati che sia un file di backup valido.");
		} finally {
			event.target.value = "";
		}
	};
	reader.readAsText(file);
}
function applyPendingImport() {
	if (!pendingImportData) return;
	state.targets = pendingImportData.targets;
	state.customCategoryName = pendingImportData.customCategoryName;
	state.notes = pendingImportData.notes;
	state.counts = pendingImportData.counts;
	state.weekKey = pendingImportData.weekKey;
	saveTargetsAndSettings();
	saveWeekAndCounts();
	localStorage.setItem(STORAGE_KEYS.NOTES, state.notes);
	if (elements.notesTextarea) {
		elements.notesTextarea.value = state.notes;
	}
	renderWeekHeader();
	renderCategories();
	closeModal(elements.modalConfirmImport);
	pendingImportData = null;
	alert("Backup ripristinato con successo!");
}
async function downloadCompleteZip() {
	const statusBtn = elements.btnDownloadZip;
	const originalText = statusBtn ? statusBtn.innerHTML : "";
	if (statusBtn) statusBtn.innerHTML = "Creazione archivio ZIP in corso...";
	try {
		const zip = new SimpleZip();
		const filesToBundle = [
			"index.html",
			"style.css",
			"app.js",
			"sw.js",
			"manifest.webmanifest",
			".nojekyll",
			"icon.svg",
			"icon-192.png",
			"icon-512.png",
			"apple-touch-icon.png",
			"favicon.png",
			"favicon.ico",
			"README.md"
		];
		for (const filePath of filesToBundle) {
			try {
				const response = await fetch(`./${filePath}`);
				if (response.ok) {
					const blob = await response.blob();
					const buffer = await blob.arrayBuffer();
					zip.addFile(filePath, new Uint8Array(buffer));
				}
			} catch (err) {
				console.warn(`File ${filePath} non scaricato per il zip:`, err);
			}
		}
		const zipBlob = zip.generateBlob();
		const url = URL.createObjectURL(zipBlob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "pasti-della-settimana-pwa.zip";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	} catch (err) {
		alert("Errore durante la creazione dello ZIP: " + err.message);
	} finally {
		if (statusBtn) statusBtn.innerHTML = originalText;
	}
}
function openModal(modal) {
	if (!modal) return;
	modal.classList.add("open");
	modal.setAttribute("aria-hidden", "false");
	document.body.style.overflow = "hidden";
}
function closeModal(modal) {
	if (!modal) return;
	modal.classList.remove("open");
	modal.setAttribute("aria-hidden", "true");
	document.body.style.overflow = "";
}
function initModals() {
	document.querySelectorAll("[data-close-modal]").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const modal = e.target.closest(".modal-overlay");
			closeModal(modal);
		});
	});
	document.querySelectorAll(".modal-overlay").forEach((overlay) => {
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) {
				const isFirstRun = localStorage.getItem(STORAGE_KEYS.INITIALIZED) !== "true";
				if (overlay === elements.modalSettings && isFirstRun) return;
				closeModal(overlay);
			}
		});
	});
	if (elements.btnSettings) {
		elements.btnSettings.addEventListener("click", () => {
			populateSettingsForm(false);
			openModal(elements.modalSettings);
		});
	}
	if (elements.btnData) {
		elements.btnData.addEventListener("click", () => {
			openModal(elements.modalData);
		});
	}
	if (elements.btnInstall) {
		elements.btnInstall.addEventListener("click", () => {
			const isAndroid = /android/i.test(navigator.userAgent || "");
			if (isAndroid && typeof window.switchInstallTab === "function") {
				window.switchInstallTab("android");
			} else if (typeof window.switchInstallTab === "function") {
				window.switchInstallTab("ios");
			}
			openModal(elements.modalInstall);
		});
	}
	if (elements.btnExportBackup) {
		elements.btnExportBackup.addEventListener("click", exportBackup);
	}
	if (elements.fileInputImport) {
		elements.fileInputImport.addEventListener("change", handleFileImport);
	}
	if (elements.btnConfirmImportApply) {
		elements.btnConfirmImportApply.addEventListener("click", applyPendingImport);
	}
	if (elements.btnDownloadZip) {
		elements.btnDownloadZip.addEventListener("click", downloadCompleteZip);
	}
	if (elements.settingsForm) {
		elements.settingsForm.addEventListener("submit", handleSettingsSubmit);
		elements.settingsForm.addEventListener("click", handleSettingsStepperClick);
	}
}
function registerServiceWorker() {
	if ("serviceWorker" in navigator) {
		window.addEventListener("load", () => {
			navigator.serviceWorker.register("./sw.js", { scope: "./" }).then((reg) => {
				console.log("[PWA] Service Worker attivo. Scope:", reg.scope);
			}).catch((err) => {
				console.warn("[PWA] Service Worker fallback:", err);
			});
		});
	}
}
function escapeHtml(text) {
	if (!text) return "";
	return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function initApp() {
	const isInitialized = loadState();
	renderWeekHeader();
	renderCategories();
	initNotes();
	initModals();
	registerServiceWorker();
	if (elements.categoriesContainer) {
		elements.categoriesContainer.addEventListener("click", handleCategoryClick);
	}
	document.addEventListener("visibilitychange", () => {
		if (!document.hidden) verifyWeekTransition();
	});
	window.addEventListener("focus", verifyWeekTransition);
	window.addEventListener("pageshow", verifyWeekTransition);
	setInterval(verifyWeekTransition, 15e3);
	if (!isInitialized) {
		populateSettingsForm(true);
		openModal(elements.modalSettings);
	}
}
// Android PWA prompt handler
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
	e.preventDefault();
	deferredInstallPrompt = e;
	const quickBox = document.getElementById("android-pwa-quick-btn");
	if (quickBox) quickBox.style.display = "block";
	const triggerBtn = document.getElementById("btn-trigger-android-install");
	if (triggerBtn && !triggerBtn.dataset.bound) {
		triggerBtn.dataset.bound = "true";
		triggerBtn.addEventListener("click", async () => {
			if (deferredInstallPrompt) {
				deferredInstallPrompt.prompt();
				const { outcome } = await deferredInstallPrompt.userChoice;
				if (outcome === "accepted") {
					deferredInstallPrompt = null;
					quickBox.style.display = "none";
					closeModal(elements.modalInstall);
				}
			}
		});
	}
});
// Tab Switcher for iOS / Android guide
window.switchInstallTab = function(platform) {
	const tabIos = document.getElementById("tab-btn-ios");
	const tabAndroid = document.getElementById("tab-btn-android");
	const guideIos = document.getElementById("install-guide-ios");
	const guideAndroid = document.getElementById("install-guide-android");
	if (platform === "android") {
		if (tabIos) tabIos.classList.remove("active");
		if (tabAndroid) tabAndroid.classList.add("active");
		if (guideIos) guideIos.style.display = "none";
		if (guideAndroid) guideAndroid.style.display = "block";
	} else {
		if (tabAndroid) tabAndroid.classList.remove("active");
		if (tabIos) tabIos.classList.add("active");
		if (guideAndroid) guideAndroid.style.display = "none";
		if (guideIos) guideIos.style.display = "block";
	}
};
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initApp);
} else {
	initApp();
}

//# sourceMappingURL=data:application/json;base64,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QUksY0FBYyxhQUFhLE1BQU0sVUFBVTtFQUMvQyxJQUFJLFVBQVUsU0FBUyxNQUFNLFVBQVU7Q0FDekM7QUFDRjtBQUVBLElBQUksU0FBUyxlQUFlLFdBQVc7Q0FDckMsU0FBUyxpQkFBaUIsb0JBQW9CLE9BQU87QUFDdkQsT0FBTztDQUNMLFFBQVE7QUFDViIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJhcHAuanMiXSwidmVyc2lvbiI6Mywic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBQYXN0aSBkZWxsYSBzZXR0aW1hbmEgLSBQV0EgVmFuaWxsYSBKYXZhU2NyaXB0IEFwcGxpY2F0aW9uXG4gKiAxMDAlIENsaWVudC1TaWRlLCBMb2NhbFN0b3JhZ2UsIFplcm8gRXh0ZXJuYWwgRGVwZW5kZW5jaWVzLCBaZXJvIEJ1bmRsZXIgcmVxdWlyZWQuXG4gKiBTZWxmLWNvbnRhaW5lZCBmb3Igc2VhbWxlc3MgZGVwbG95bWVudCBvbiBHaXRIdWIgUGFnZXMuXG4gKi9cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gMS4gUFVSRSBMT0dJQyAmIFVUSUxJVElFUyAoSW5saW5lZCBmb3IgMTAwJSB6ZXJvLWRlcGVuZGVuY3kgcG9ydGFiaWxpdHkpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNvbnN0IERFRkFVTFRfQ0FURUdPUklFUyA9IFtcbiAgeyBpZDogJ2Nhcm5lX3Jvc3NhJywgbmFtZTogJ0Nhcm5lIHJvc3NhJywgaWNvbjogJ/CfpaknIH0sXG4gIHsgaWQ6ICdjYXJuZV9iaWFuY2EnLCBuYW1lOiAnQ2FybmUgYmlhbmNhJywgaWNvbjogJ/CfjZcnIH0sXG4gIHsgaWQ6ICdmb3JtYWdnaW8nLCBuYW1lOiAnRm9ybWFnZ2lvJywgaWNvbjogJ/Cfp4AnIH0sXG4gIHsgaWQ6ICd1b3ZhJywgbmFtZTogJ1VvdmEnLCBpY29uOiAn8J+lmicgfSxcbiAgeyBpZDogJ2xlZ3VtaScsIG5hbWU6ICdMZWd1bWknLCBpY29uOiAn8J+rmCcgfSxcbiAgeyBpZDogJ2FsdHJvJywgbmFtZTogJ0FsdHJvJywgaWNvbjogJ/Cfjb3vuI8nLCBpc0N1c3RvbTogdHJ1ZSB9XG5dO1xuXG5jb25zdCBNT05USFNfSVQgPSBbXG4gICdnZW5uYWlvJywgJ2ZlYmJyYWlvJywgJ21hcnpvJywgJ2FwcmlsZScsICdtYWdnaW8nLCAnZ2l1Z25vJyxcbiAgJ2x1Z2xpbycsICdhZ29zdG8nLCAnc2V0dGVtYnJlJywgJ290dG9icmUnLCAnbm92ZW1icmUnLCAnZGljZW1icmUnXG5dO1xuXG5jb25zdCBEQVlfTkFNRVNfSVQgPSBbXG4gICdEb21lbmljYScsICdMdW5lZMOsJywgJ01hcnRlZMOsJywgJ01lcmNvbGVkw6wnLCAnR2lvdmVkw6wnLCAnVmVuZXJkw6wnLCAnU2FiYXRvJ1xuXTtcblxuZnVuY3Rpb24gZ2V0TW9uZGF5KGRhdGUgPSBuZXcgRGF0ZSgpKSB7XG4gIGNvbnN0IGQgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCkpO1xuICBjb25zdCBkYXkgPSBkLmdldERheSgpOyAvLyAwIGlzIFN1bmRheSwgMSBpcyBNb25kYXkuLi5cbiAgY29uc3QgZGlmZiA9IGRheSA9PT0gMCA/IC02IDogMSAtIGRheTtcbiAgZC5zZXREYXRlKGQuZ2V0RGF0ZSgpICsgZGlmZik7XG4gIGQuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gIHJldHVybiBkO1xufVxuXG5mdW5jdGlvbiBnZXRTdW5kYXkoZGF0ZSA9IG5ldyBEYXRlKCkpIHtcbiAgY29uc3QgbW9uZGF5ID0gZ2V0TW9uZGF5KGRhdGUpO1xuICBjb25zdCBzdW5kYXkgPSBuZXcgRGF0ZShtb25kYXkuZ2V0RnVsbFllYXIoKSwgbW9uZGF5LmdldE1vbnRoKCksIG1vbmRheS5nZXREYXRlKCkgKyA2KTtcbiAgc3VuZGF5LnNldEhvdXJzKDIzLCA1OSwgNTksIDk5OSk7XG4gIHJldHVybiBzdW5kYXk7XG59XG5cbmZ1bmN0aW9uIGdldFdlZWtLZXkoZGF0ZSA9IG5ldyBEYXRlKCkpIHtcbiAgY29uc3QgbW9uZGF5ID0gZ2V0TW9uZGF5KGRhdGUpO1xuICBjb25zdCB5ID0gbW9uZGF5LmdldEZ1bGxZZWFyKCk7XG4gIGNvbnN0IG0gPSBTdHJpbmcobW9uZGF5LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICBjb25zdCBkID0gU3RyaW5nKG1vbmRheS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gIHJldHVybiBgJHt5fS0ke219LSR7ZH1gO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrUmFuZ2UoZGF0ZSA9IG5ldyBEYXRlKCkpIHtcbiAgY29uc3QgbW9uZGF5ID0gZ2V0TW9uZGF5KGRhdGUpO1xuICBjb25zdCBzdW5kYXkgPSBnZXRTdW5kYXkoZGF0ZSk7XG5cbiAgY29uc3QgbURheSA9IG1vbmRheS5nZXREYXRlKCk7XG4gIGNvbnN0IG1Nb250aCA9IE1PTlRIU19JVFttb25kYXkuZ2V0TW9udGgoKV07XG4gIGNvbnN0IG1ZZWFyID0gbW9uZGF5LmdldEZ1bGxZZWFyKCk7XG5cbiAgY29uc3Qgc0RheSA9IHN1bmRheS5nZXREYXRlKCk7XG4gIGNvbnN0IHNNb250aCA9IE1PTlRIU19JVFtzdW5kYXkuZ2V0TW9udGgoKV07XG4gIGNvbnN0IHNZZWFyID0gc3VuZGF5LmdldEZ1bGxZZWFyKCk7XG5cbiAgaWYgKG1ZZWFyICE9PSBzWWVhcikge1xuICAgIHJldHVybiBgTHVuICR7bURheX0gJHttTW9udGh9ICR7bVllYXJ9IOKAkyBEb20gJHtzRGF5fSAke3NNb250aH0gJHtzWWVhcn1gO1xuICB9XG4gIGlmIChtTW9udGggIT09IHNNb250aCkge1xuICAgIHJldHVybiBgTHVuICR7bURheX0gJHttTW9udGh9IOKAkyBEb20gJHtzRGF5fSAke3NNb250aH0gJHtzWWVhcn1gO1xuICB9XG4gIHJldHVybiBgTHVuICR7bURheX0g4oCTIERvbSAke3NEYXl9ICR7c01vbnRofSAke3NZZWFyfWA7XG59XG5cbmZ1bmN0aW9uIGNoZWNrV2Vla1JvbGxvdmVyKGN1cnJlbnREYXRlLCBzYXZlZFdlZWtLZXksIGN1cnJlbnRDb3VudHMgPSB7fSwgY2F0ZWdvcmllcyA9IERFRkFVTFRfQ0FURUdPUklFUykge1xuICBjb25zdCBhY3RpdmVXZWVrS2V5ID0gZ2V0V2Vla0tleShjdXJyZW50RGF0ZSk7XG5cbiAgY29uc3QgaW5pdFplcm9Db3VudHMgPSAoKSA9PiB7XG4gICAgY29uc3QgZnJlc2ggPSB7fTtcbiAgICBmb3IgKGNvbnN0IGNhdCBvZiBjYXRlZ29yaWVzKSB7XG4gICAgICBmcmVzaFtjYXQuaWRdID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIGZyZXNoO1xuICB9O1xuXG4gIGlmICghc2F2ZWRXZWVrS2V5IHx8IHNhdmVkV2Vla0tleSAhPT0gYWN0aXZlV2Vla0tleSkge1xuICAgIHJldHVybiB7XG4gICAgICByb2xsZWRPdmVyOiB0cnVlLFxuICAgICAgY3VycmVudFdlZWtLZXk6IGFjdGl2ZVdlZWtLZXksXG4gICAgICBjb3VudHM6IGluaXRaZXJvQ291bnRzKClcbiAgICB9O1xuICB9XG5cbiAgY29uc3Qgc2FuaXRpemVkID0geyAuLi5jdXJyZW50Q291bnRzIH07XG4gIGZvciAoY29uc3QgY2F0IG9mIGNhdGVnb3JpZXMpIHtcbiAgICBpZiAodHlwZW9mIHNhbml0aXplZFtjYXQuaWRdICE9PSAnbnVtYmVyJyB8fCBzYW5pdGl6ZWRbY2F0LmlkXSA8IDApIHtcbiAgICAgIHNhbml0aXplZFtjYXQuaWRdID0gMDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJvbGxlZE92ZXI6IGZhbHNlLFxuICAgIGN1cnJlbnRXZWVrS2V5OiBhY3RpdmVXZWVrS2V5LFxuICAgIGNvdW50czogc2FuaXRpemVkXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZVByb2dyZXNzKGNvdW50LCB0YXJnZXQpIHtcbiAgY29uc3Qgc2FmZUNvdW50ID0gTWF0aC5tYXgoMCwgcGFyc2VJbnQoY291bnQsIDEwKSB8fCAwKTtcbiAgY29uc3Qgc2FmZVRhcmdldCA9IE1hdGgubWF4KDAsIHBhcnNlSW50KHRhcmdldCwgMTApIHx8IDApO1xuXG4gIGlmIChzYWZlVGFyZ2V0ID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBlcmNlbnQ6IDAsXG4gICAgICBzdGF0dXM6IHNhZmVDb3VudCA9PT0gMCA/ICd6ZXJvX3plcm8nIDogJ25vX3RhcmdldCcsXG4gICAgICBsYWJlbDogJ05lc3N1biBvYmlldHRpdm8gaW1wb3N0YXRvJyxcbiAgICAgIGlzRXhjZWVkZWQ6IGZhbHNlLFxuICAgICAgaXNSZWFjaGVkOiBmYWxzZSxcbiAgICAgIGhhc1RhcmdldDogZmFsc2UsXG4gICAgICBkaXNwbGF5Q291bnRUYXJnZXQ6IGAke3NhZmVDb3VudH0gKG5lc3N1biBvYmlldHRpdm8pYFxuICAgIH07XG4gIH1cblxuICBjb25zdCBwZXJjZW50ID0gTWF0aC5taW4oMTAwLCBNYXRoLnJvdW5kKChzYWZlQ291bnQgLyBzYWZlVGFyZ2V0KSAqIDEwMCkpO1xuXG4gIGlmIChzYWZlQ291bnQgPiBzYWZlVGFyZ2V0KSB7XG4gICAgY29uc3QgZGlmZiA9IHNhZmVDb3VudCAtIHNhZmVUYXJnZXQ7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBlcmNlbnQ6IDEwMCxcbiAgICAgIHN0YXR1czogJ2V4Y2VlZGVkJyxcbiAgICAgIGxhYmVsOiBgU3VwZXJhdG8gZGkgJHtkaWZmfSAke2RpZmYgPT09IDEgPyAnb2NjYXNpb25lJyA6ICdvY2Nhc2lvbmknfWAsXG4gICAgICBpc0V4Y2VlZGVkOiB0cnVlLFxuICAgICAgaXNSZWFjaGVkOiB0cnVlLFxuICAgICAgaGFzVGFyZ2V0OiB0cnVlLFxuICAgICAgZGlzcGxheUNvdW50VGFyZ2V0OiBgJHtzYWZlQ291bnR9IC8gJHtzYWZlVGFyZ2V0fWBcbiAgICB9O1xuICB9XG5cbiAgaWYgKHNhZmVDb3VudCA9PT0gc2FmZVRhcmdldCkge1xuICAgIHJldHVybiB7XG4gICAgICBwZXJjZW50OiAxMDAsXG4gICAgICBzdGF0dXM6ICdyZWFjaGVkJyxcbiAgICAgIGxhYmVsOiAnT2JpZXR0aXZvIHJhZ2dpdW50bycsXG4gICAgICBpc0V4Y2VlZGVkOiBmYWxzZSxcbiAgICAgIGlzUmVhY2hlZDogdHJ1ZSxcbiAgICAgIGhhc1RhcmdldDogdHJ1ZSxcbiAgICAgIGRpc3BsYXlDb3VudFRhcmdldDogYCR7c2FmZUNvdW50fSAvICR7c2FmZVRhcmdldH1gXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IHJlbWFpbmluZyA9IHNhZmVUYXJnZXQgLSBzYWZlQ291bnQ7XG4gIHJldHVybiB7XG4gICAgcGVyY2VudCxcbiAgICBzdGF0dXM6ICdpbl9wcm9ncmVzcycsXG4gICAgbGFiZWw6IGBNYW5jYW5vICR7cmVtYWluaW5nfSAke3JlbWFpbmluZyA9PT0gMSA/ICdvY2Nhc2lvbmUnIDogJ29jY2FzaW9uaSd9YCxcbiAgICBpc0V4Y2VlZGVkOiBmYWxzZSxcbiAgICBpc1JlYWNoZWQ6IGZhbHNlLFxuICAgIGhhc1RhcmdldDogdHJ1ZSxcbiAgICBkaXNwbGF5Q291bnRUYXJnZXQ6IGAke3NhZmVDb3VudH0gLyAke3NhZmVUYXJnZXR9YFxuICB9O1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUFuZFByb2Nlc3NCYWNrdXAocmF3LCBjdXJyZW50RGF0ZSA9IG5ldyBEYXRlKCkpIHtcbiAgaWYgKCFyYXcgfHwgdHlwZW9mIHJhdyAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIGVycm9yOiAnSWwgZmlsZSBkaSBiYWNrdXAgbm9uIGNvbnRpZW5lIHVuIG9nZ2V0dG8gSlNPTiB2YWxpZG8uJyB9O1xuICB9XG5cbiAgY29uc3QgYXBwSWRlbnRpZmllciA9IHJhdy5hcHA7XG4gIGlmIChhcHBJZGVudGlmaWVyICYmIGFwcElkZW50aWZpZXIgIT09ICdwYXN0aV9kZWxsYV9zZXR0aW1hbmEnKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogJ0lsIGZpbGUgbm9uIHNlbWJyYSBlc3NlcmUgdW4gYmFja3VwIGRpIFwiUGFzdGkgZGVsbGEgc2V0dGltYW5hXCIuJyB9O1xuICB9XG5cbiAgY29uc3QgdGFyZ2V0cyA9IHt9O1xuICBpZiAocmF3LnRhcmdldHMgJiYgdHlwZW9mIHJhdy50YXJnZXRzID09PSAnb2JqZWN0Jykge1xuICAgIGZvciAoY29uc3QgY2F0IG9mIERFRkFVTFRfQ0FURUdPUklFUykge1xuICAgICAgY29uc3QgdmFsID0gcGFyc2VJbnQocmF3LnRhcmdldHNbY2F0LmlkXSwgMTApO1xuICAgICAgdGFyZ2V0c1tjYXQuaWRdID0gaXNOYU4odmFsKSB8fCB2YWwgPCAwID8gMCA6IHZhbDtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBjYXQgb2YgREVGQVVMVF9DQVRFR09SSUVTKSB7XG4gICAgICB0YXJnZXRzW2NhdC5pZF0gPSAwO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGN1c3RvbUNhdGVnb3J5TmFtZSA9IHR5cGVvZiByYXcuY3VzdG9tQ2F0ZWdvcnlOYW1lID09PSAnc3RyaW5nJyAmJiByYXcuY3VzdG9tQ2F0ZWdvcnlOYW1lLnRyaW0oKS5sZW5ndGggPiAwXG4gICAgPyByYXcuY3VzdG9tQ2F0ZWdvcnlOYW1lLnRyaW0oKS5zbGljZSgwLCA1MClcbiAgICA6ICdBbHRybyc7XG5cbiAgY29uc3Qgbm90ZXMgPSB0eXBlb2YgcmF3Lm5vdGVzID09PSAnc3RyaW5nJyA/IHJhdy5ub3RlcyA6ICcnO1xuICBjb25zdCBjdXJyZW50V2Vla0tleSA9IGdldFdlZWtLZXkoY3VycmVudERhdGUpO1xuICBjb25zdCBiYWNrdXBXZWVrS2V5ID0gdHlwZW9mIHJhdy53ZWVrS2V5ID09PSAnc3RyaW5nJyA/IHJhdy53ZWVrS2V5IDogJyc7XG4gIGNvbnN0IGlzUGFzdFdlZWsgPSBiYWNrdXBXZWVrS2V5ICE9PSBjdXJyZW50V2Vla0tleTtcblxuICBjb25zdCBjb3VudHMgPSB7fTtcbiAgZm9yIChjb25zdCBjYXQgb2YgREVGQVVMVF9DQVRFR09SSUVTKSB7XG4gICAgaWYgKGlzUGFzdFdlZWspIHtcbiAgICAgIGNvdW50c1tjYXQuaWRdID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdmFsID0gcmF3LmNvdW50cyA/IHBhcnNlSW50KHJhdy5jb3VudHNbY2F0LmlkXSwgMTApIDogMDtcbiAgICAgIGNvdW50c1tjYXQuaWRdID0gaXNOYU4odmFsKSB8fCB2YWwgPCAwID8gMCA6IHZhbDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHZhbGlkOiB0cnVlLFxuICAgIGRhdGE6IHtcbiAgICAgIHRhcmdldHMsXG4gICAgICBjdXN0b21DYXRlZ29yeU5hbWUsXG4gICAgICBub3RlcyxcbiAgICAgIHdlZWtLZXk6IGN1cnJlbnRXZWVrS2V5LFxuICAgICAgY291bnRzLFxuICAgICAgaXNQYXN0V2VlayxcbiAgICAgIGJhY2t1cFdlZWtLZXlcbiAgICB9XG4gIH07XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIDIuIFBVUkUgSkFWQVNDUklQVCBaSVAgQlVJTERFUiAoU2VsZi1jb250YWluZWQsIHplcm8tQ0ROKVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBjcmNUYWJsZSA9IG5ldyBVaW50MzJBcnJheSgyNTYpO1xuZm9yIChsZXQgbiA9IDA7IG4gPCAyNTY7IG4rKykge1xuICBsZXQgYyA9IG47XG4gIGZvciAobGV0IGsgPSAwOyBrIDwgODsgaysrKSB7XG4gICAgYyA9IChjICYgMSkgPyAoMHhFREI4ODMyMCBeIChjID4+PiAxKSkgOiAoYyA+Pj4gMSk7XG4gIH1cbiAgY3JjVGFibGVbbl0gPSBjO1xufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVDUkMzMihkYXRhKSB7XG4gIGxldCBjcmMgPSAweEZGRkZGRkZGO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICBjcmMgPSBjcmNUYWJsZVsoY3JjIF4gZGF0YVtpXSkgJiAweEZGXSBeIChjcmMgPj4+IDgpO1xuICB9XG4gIHJldHVybiAoY3JjIF4gMHhGRkZGRkZGRikgPj4+IDA7XG59XG5cbmNsYXNzIFNpbXBsZVppcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZmlsZXMgPSBbXTtcbiAgfVxuICBhZGRGaWxlKHBhdGgsIGNvbnRlbnQpIHtcbiAgICBsZXQgYnl0ZXM7XG4gICAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgYnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoY29udGVudCk7XG4gICAgfSBlbHNlIGlmIChjb250ZW50IGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgYnl0ZXMgPSBjb250ZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBieXRlcyA9IG5ldyBVaW50OEFycmF5KGNvbnRlbnQpO1xuICAgIH1cbiAgICB0aGlzLmZpbGVzLnB1c2goeyBwYXRoLCBieXRlcywgY3JjOiBjYWxjdWxhdGVDUkMzMihieXRlcykgfSk7XG4gIH1cbiAgZ2VuZXJhdGVCbG9iKCkge1xuICAgIGNvbnN0IHBhcnRzID0gW107XG4gICAgY29uc3QgY2VudHJhbERpcmVjdG9yeUhlYWRlcnMgPSBbXTtcbiAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIGNvbnN0IGRvc1RpbWUgPSAoKG5vdy5nZXRIb3VycygpIDw8IDExKSB8IChub3cuZ2V0TWludXRlcygpIDw8IDUpIHwgKE1hdGguZmxvb3Iobm93LmdldFNlY29uZHMoKSAvIDIpKSkgJiAweEZGRkY7XG4gICAgY29uc3QgZG9zRGF0ZSA9ICgoKG5vdy5nZXRGdWxsWWVhcigpIC0gMTk4MCkgPDwgOSkgfCAoKG5vdy5nZXRNb250aCgpICsgMSkgPDwgNSkgfCBub3cuZ2V0RGF0ZSgpKSAmIDB4RkZGRjtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiB0aGlzLmZpbGVzKSB7XG4gICAgICBjb25zdCBuYW1lQnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoZmlsZS5wYXRoKTtcbiAgICAgIGNvbnN0IGZpbGVMZW5ndGggPSBmaWxlLmJ5dGVzLmxlbmd0aDtcblxuICAgICAgY29uc3QgbGZoID0gbmV3IFVpbnQ4QXJyYXkoMzAgKyBuYW1lQnl0ZXMubGVuZ3RoKTtcbiAgICAgIGNvbnN0IGxmaFZpZXcgPSBuZXcgRGF0YVZpZXcobGZoLmJ1ZmZlcik7XG4gICAgICBsZmhWaWV3LnNldFVpbnQzMigwLCAweDA0MDM0YjUwLCB0cnVlKTtcbiAgICAgIGxmaFZpZXcuc2V0VWludDE2KDQsIDIwLCB0cnVlKTtcbiAgICAgIGxmaFZpZXcuc2V0VWludDE2KDYsIDB4MDgwMCwgdHJ1ZSk7XG4gICAgICBsZmhWaWV3LnNldFVpbnQxNig4LCAwLCB0cnVlKTtcbiAgICAgIGxmaFZpZXcuc2V0VWludDE2KDEwLCBkb3NUaW1lLCB0cnVlKTtcbiAgICAgIGxmaFZpZXcuc2V0VWludDE2KDEyLCBkb3NEYXRlLCB0cnVlKTtcbiAgICAgIGxmaFZpZXcuc2V0VWludDMyKDE0LCBmaWxlLmNyYywgdHJ1ZSk7XG4gICAgICBsZmhWaWV3LnNldFVpbnQzMigxOCwgZmlsZUxlbmd0aCwgdHJ1ZSk7XG4gICAgICBsZmhWaWV3LnNldFVpbnQzMigyMiwgZmlsZUxlbmd0aCwgdHJ1ZSk7XG4gICAgICBsZmhWaWV3LnNldFVpbnQxNigyNiwgbmFtZUJ5dGVzLmxlbmd0aCwgdHJ1ZSk7XG4gICAgICBsZmhWaWV3LnNldFVpbnQxNigyOCwgMCwgdHJ1ZSk7XG4gICAgICBsZmguc2V0KG5hbWVCeXRlcywgMzApO1xuXG4gICAgICBwYXJ0cy5wdXNoKGxmaCk7XG4gICAgICBwYXJ0cy5wdXNoKGZpbGUuYnl0ZXMpO1xuXG4gICAgICBjb25zdCBjZGggPSBuZXcgVWludDhBcnJheSg0NiArIG5hbWVCeXRlcy5sZW5ndGgpO1xuICAgICAgY29uc3QgY2RoVmlldyA9IG5ldyBEYXRhVmlldyhjZGguYnVmZmVyKTtcbiAgICAgIGNkaFZpZXcuc2V0VWludDMyKDAsIDB4MDIwMTRiNTAsIHRydWUpO1xuICAgICAgY2RoVmlldy5zZXRVaW50MTYoNCwgMjAsIHRydWUpO1xuICAgICAgY2RoVmlldy5zZXRVaW50MTYoNiwgMjAsIHRydWUpO1xuICAgICAgY2RoVmlldy5zZXRVaW50MTYoOCwgMHgwODAwLCB0cnVlKTtcbiAgICAgIGNkaFZpZXcuc2V0VWludDE2KDEwLCAwLCB0cnVlKTtcbiAgICAgIGNkaFZpZXcuc2V0VWludDE2KDEyLCBkb3NUaW1lLCB0cnVlKTtcbiAgICAgIGNkaFZpZXcuc2V0VWludDE2KDE0LCBkb3NEYXRlLCB0cnVlKTtcbiAgICAgIGNkaFZpZXcuc2V0VWludDMyKDE2LCBmaWxlLmNyYywgdHJ1ZSk7XG4gICAgICBjZGhWaWV3LnNldFVpbnQzMigyMCwgZmlsZUxlbmd0aCwgdHJ1ZSk7XG4gICAgICBjZGhWaWV3LnNldFVpbnQzMigyNCwgZmlsZUxlbmd0aCwgdHJ1ZSk7XG4gICAgICBjZGhWaWV3LnNldFVpbnQxNigyOCwgbmFtZUJ5dGVzLmxlbmd0aCwgdHJ1ZSk7XG4gICAgICBjZGhWaWV3LnNldFVpbnQxNigzMCwgMCwgdHJ1ZSk7XG4gICAgICBjZGhWaWV3LnNldFVpbnQxNigzMiwgMCwgdHJ1ZSk7XG4gICAgICBjZGhWaWV3LnNldFVpbnQxNigzNCwgMCwgdHJ1ZSk7XG4gICAgICBjZGhWaWV3LnNldFVpbnQxNigzNiwgMCwgdHJ1ZSk7XG4gICAgICBjZGhWaWV3LnNldFVpbnQzMigzOCwgMCwgdHJ1ZSk7XG4gICAgICBjZGhWaWV3LnNldFVpbnQzMig0Miwgb2Zmc2V0LCB0cnVlKTtcbiAgICAgIGNkaC5zZXQobmFtZUJ5dGVzLCA0Nik7XG5cbiAgICAgIGNlbnRyYWxEaXJlY3RvcnlIZWFkZXJzLnB1c2goY2RoKTtcbiAgICAgIG9mZnNldCArPSBsZmgubGVuZ3RoICsgZmlsZUxlbmd0aDtcbiAgICB9XG5cbiAgICBjb25zdCBjZFN0YXJ0T2Zmc2V0ID0gb2Zmc2V0O1xuICAgIGxldCBjZFNpemUgPSAwO1xuICAgIGZvciAoY29uc3QgY2RoIG9mIGNlbnRyYWxEaXJlY3RvcnlIZWFkZXJzKSB7XG4gICAgICBwYXJ0cy5wdXNoKGNkaCk7XG4gICAgICBjZFNpemUgKz0gY2RoLmxlbmd0aDtcbiAgICB9XG5cbiAgICBjb25zdCBlb2NkID0gbmV3IFVpbnQ4QXJyYXkoMjIpO1xuICAgIGNvbnN0IGVvY2RWaWV3ID0gbmV3IERhdGFWaWV3KGVvY2QuYnVmZmVyKTtcbiAgICBlb2NkVmlldy5zZXRVaW50MzIoMCwgMHgwNjA1NGI1MCwgdHJ1ZSk7XG4gICAgZW9jZFZpZXcuc2V0VWludDE2KDQsIDAsIHRydWUpO1xuICAgIGVvY2RWaWV3LnNldFVpbnQxNig2LCAwLCB0cnVlKTtcbiAgICBlb2NkVmlldy5zZXRVaW50MTYoOCwgdGhpcy5maWxlcy5sZW5ndGgsIHRydWUpO1xuICAgIGVvY2RWaWV3LnNldFVpbnQxNigxMCwgdGhpcy5maWxlcy5sZW5ndGgsIHRydWUpO1xuICAgIGVvY2RWaWV3LnNldFVpbnQzMigxMiwgY2RTaXplLCB0cnVlKTtcbiAgICBlb2NkVmlldy5zZXRVaW50MzIoMTYsIGNkU3RhcnRPZmZzZXQsIHRydWUpO1xuICAgIGVvY2RWaWV3LnNldFVpbnQxNigyMCwgMCwgdHJ1ZSk7XG5cbiAgICBwYXJ0cy5wdXNoKGVvY2QpO1xuICAgIHJldHVybiBuZXcgQmxvYihwYXJ0cywgeyB0eXBlOiAnYXBwbGljYXRpb24vemlwJyB9KTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyAzLiBBUFBMSUNBVElPTiBTVEFURSAmIENPTlRST0xMRVJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuY29uc3QgU1RPUkFHRV9LRVlTID0ge1xuICBJTklUSUFMSVpFRDogJ3Bhc3RpX2FwcF9pbml0aWFsaXplZCcsXG4gIFRBUkdFVFM6ICdwYXN0aV90YXJnZXRzJyxcbiAgQ09VTlRTOiAncGFzdGlfY291bnRzJyxcbiAgV0VFS19LRVk6ICdwYXN0aV9jdXJyZW50X3dlZWtfa2V5JyxcbiAgTk9URVM6ICdwYXN0aV9ub3RlcycsXG4gIENVU1RPTV9OQU1FOiAncGFzdGlfY3VzdG9tX2NhdGVnb3J5X25hbWUnXG59O1xuXG5jb25zdCBzdGF0ZSA9IHtcbiAgY2F0ZWdvcmllczogREVGQVVMVF9DQVRFR09SSUVTLFxuICBjdXN0b21DYXRlZ29yeU5hbWU6ICdBbHRybycsXG4gIHRhcmdldHM6IHt9LFxuICBjb3VudHM6IHt9LFxuICB3ZWVrS2V5OiAnJyxcbiAgbm90ZXM6ICcnXG59O1xuXG5jb25zdCBlbGVtZW50cyA9IHtcbiAgd2Vla0RhdGVzOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd2Vlay1kYXRlcycpLFxuICBjdXJyZW50RGF5TmFtZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1cnJlbnQtZGF5LW5hbWUnKSxcbiAgcm9sbG92ZXJUb2FzdDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JvbGxvdmVyLXRvYXN0JyksXG4gIGNhdGVnb3JpZXNDb250YWluZXI6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYXRlZ29yaWVzLWNvbnRhaW5lcicpLFxuICBub3Rlc1RleHRhcmVhOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbm90ZXMtdGV4dGFyZWEnKSxcbiAgbm90ZXNTdGF0dXM6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdub3Rlcy1zdGF0dXMnKSxcbiAgYnRuQ2xlYXJOb3RlczogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1jbGVhci1ub3RlcycpLFxuXG4gIGJ0blNldHRpbmdzOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLXNldHRpbmdzJyksXG4gIGJ0bkRhdGE6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tZGF0YScpLFxuICBidG5JbnN0YWxsOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLWluc3RhbGwnKSxcblxuICBtb2RhbFNldHRpbmdzOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kYWwtc2V0dGluZ3MnKSxcbiAgbW9kYWxEYXRhOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kYWwtZGF0YScpLFxuICBtb2RhbEluc3RhbGw6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbC1pbnN0YWxsJyksXG4gIG1vZGFsQ29uZmlybURlbGV0ZU5vdGVzOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kYWwtY29uZmlybS1kZWxldGUtbm90ZXMnKSxcbiAgbW9kYWxDb25maXJtSW1wb3J0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kYWwtY29uZmlybS1pbXBvcnQnKSxcblxuICBzZXR0aW5nc0Zvcm06IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZXR0aW5ncy1mb3JtJyksXG4gIHNldHRpbmdzQ2F0ZWdvcmllc0xpc3Q6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZXR0aW5ncy1jYXRlZ29yaWVzLWxpc3QnKSxcbiAgY3VzdG9tTmFtZUlucHV0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3VzdG9tLW5hbWUtaW5wdXQnKSxcbiAgc2V0dGluZ3NNb2RhbFRpdGxlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2V0dGluZ3MtbW9kYWwtdGl0bGUnKSxcblxuICBidG5FeHBvcnRCYWNrdXA6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tZXhwb3J0LWJhY2t1cCcpLFxuICBmaWxlSW5wdXRJbXBvcnQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlLWlucHV0LWltcG9ydCcpLFxuICBidG5Eb3dubG9hZFppcDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1kb3dubG9hZC16aXAnKSxcbiAgaW1wb3J0Q29uZmlybWF0aW9uVGV4dDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ltcG9ydC1jb25maXJtYXRpb24tdGV4dCcpLFxuICBidG5Db25maXJtSW1wb3J0QXBwbHk6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tY29uZmlybS1pbXBvcnQtYXBwbHknKSxcbiAgYnRuQ29uZmlybURlbGV0ZU5vdGVzQXBwbHk6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tY29uZmlybS1kZWxldGUtbm90ZXMtYXBwbHknKVxufTtcblxubGV0IHBlbmRpbmdJbXBvcnREYXRhID0gbnVsbDtcblxuZnVuY3Rpb24gbG9hZFN0YXRlKCkge1xuICBjb25zdCBpc0luaXRpYWxpemVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oU1RPUkFHRV9LRVlTLklOSVRJQUxJWkVEKSA9PT0gJ3RydWUnO1xuXG4gIGNvbnN0IHNhdmVkQ3VzdG9tTmFtZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZUy5DVVNUT01fTkFNRSk7XG4gIHN0YXRlLmN1c3RvbUNhdGVnb3J5TmFtZSA9IHNhdmVkQ3VzdG9tTmFtZSAmJiBzYXZlZEN1c3RvbU5hbWUudHJpbSgpID8gc2F2ZWRDdXN0b21OYW1lLnRyaW0oKSA6ICdBbHRybyc7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByYXdUYXJnZXRzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShTVE9SQUdFX0tFWVMuVEFSR0VUUykgfHwgJ3t9Jyk7XG4gICAgc3RhdGUudGFyZ2V0cyA9IHt9O1xuICAgIGZvciAoY29uc3QgY2F0IG9mIHN0YXRlLmNhdGVnb3JpZXMpIHtcbiAgICAgIGNvbnN0IHZhbCA9IHBhcnNlSW50KHJhd1RhcmdldHNbY2F0LmlkXSwgMTApO1xuICAgICAgc3RhdGUudGFyZ2V0c1tjYXQuaWRdID0gaXNOYU4odmFsKSB8fCB2YWwgPCAwID8gMCA6IHZhbDtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBzdGF0ZS50YXJnZXRzID0ge307XG4gICAgZm9yIChjb25zdCBjYXQgb2Ygc3RhdGUuY2F0ZWdvcmllcykgc3RhdGUudGFyZ2V0c1tjYXQuaWRdID0gMDtcbiAgfVxuXG4gIHN0YXRlLm5vdGVzID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oU1RPUkFHRV9LRVlTLk5PVEVTKSB8fCAnJztcblxuICBjb25zdCBzYXZlZFdlZWtLZXkgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShTVE9SQUdFX0tFWVMuV0VFS19LRVkpO1xuICBsZXQgc2F2ZWRDb3VudHMgPSB7fTtcbiAgdHJ5IHtcbiAgICBzYXZlZENvdW50cyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oU1RPUkFHRV9LRVlTLkNPVU5UUykgfHwgJ3t9Jyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBzYXZlZENvdW50cyA9IHt9O1xuICB9XG5cbiAgY29uc3Qgcm9sbG92ZXIgPSBjaGVja1dlZWtSb2xsb3ZlcihuZXcgRGF0ZSgpLCBzYXZlZFdlZWtLZXksIHNhdmVkQ291bnRzLCBzdGF0ZS5jYXRlZ29yaWVzKTtcbiAgc3RhdGUud2Vla0tleSA9IHJvbGxvdmVyLmN1cnJlbnRXZWVrS2V5O1xuICBzdGF0ZS5jb3VudHMgPSByb2xsb3Zlci5jb3VudHM7XG5cbiAgc2F2ZVdlZWtBbmRDb3VudHMoKTtcbiAgcmV0dXJuIGlzSW5pdGlhbGl6ZWQ7XG59XG5cbmZ1bmN0aW9uIHNhdmVXZWVrQW5kQ291bnRzKCkge1xuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWVMuV0VFS19LRVksIHN0YXRlLndlZWtLZXkpO1xuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWVMuQ09VTlRTLCBKU09OLnN0cmluZ2lmeShzdGF0ZS5jb3VudHMpKTtcbn1cblxuZnVuY3Rpb24gc2F2ZVRhcmdldHNBbmRTZXR0aW5ncygpIHtcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oU1RPUkFHRV9LRVlTLlRBUkdFVFMsIEpTT04uc3RyaW5naWZ5KHN0YXRlLnRhcmdldHMpKTtcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oU1RPUkFHRV9LRVlTLkNVU1RPTV9OQU1FLCBzdGF0ZS5jdXN0b21DYXRlZ29yeU5hbWUpO1xuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWVMuSU5JVElBTElaRUQsICd0cnVlJyk7XG59XG5cbmZ1bmN0aW9uIHZlcmlmeVdlZWtUcmFuc2l0aW9uKCkge1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCByb2xsb3ZlciA9IGNoZWNrV2Vla1JvbGxvdmVyKG5vdywgc3RhdGUud2Vla0tleSwgc3RhdGUuY291bnRzLCBzdGF0ZS5jYXRlZ29yaWVzKTtcbiAgaWYgKHJvbGxvdmVyLnJvbGxlZE92ZXIpIHtcbiAgICBzdGF0ZS53ZWVrS2V5ID0gcm9sbG92ZXIuY3VycmVudFdlZWtLZXk7XG4gICAgc3RhdGUuY291bnRzID0gcm9sbG92ZXIuY291bnRzO1xuICAgIHNhdmVXZWVrQW5kQ291bnRzKCk7XG4gICAgcmVuZGVyV2Vla0hlYWRlcigpO1xuICAgIHJlbmRlckNhdGVnb3JpZXMoKTtcbiAgICBzaG93Um9sbG92ZXJOb3RpZmljYXRpb24oKTtcbiAgfSBlbHNlIHtcbiAgICByZW5kZXJXZWVrSGVhZGVyKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hvd1JvbGxvdmVyTm90aWZpY2F0aW9uKCkge1xuICBpZiAoZWxlbWVudHMucm9sbG92ZXJUb2FzdCkge1xuICAgIGVsZW1lbnRzLnJvbGxvdmVyVG9hc3QuY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgZWxlbWVudHMucm9sbG92ZXJUb2FzdC5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XG4gICAgfSwgODAwMCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyV2Vla0hlYWRlcigpIHtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgaWYgKGVsZW1lbnRzLndlZWtEYXRlcykge1xuICAgIGVsZW1lbnRzLndlZWtEYXRlcy50ZXh0Q29udGVudCA9IGZvcm1hdFdlZWtSYW5nZShub3cpO1xuICB9XG4gIGlmIChlbGVtZW50cy5jdXJyZW50RGF5TmFtZSkge1xuICAgIGVsZW1lbnRzLmN1cnJlbnREYXlOYW1lLnRleHRDb250ZW50ID0gYE9nZ2k6ICR7REFZX05BTUVTX0lUW25vdy5nZXREYXkoKV19YDtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJDYXRlZ29yaWVzKCkge1xuICBpZiAoIWVsZW1lbnRzLmNhdGVnb3JpZXNDb250YWluZXIpIHJldHVybjtcbiAgZWxlbWVudHMuY2F0ZWdvcmllc0NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcblxuICBmb3IgKGNvbnN0IGNhdCBvZiBzdGF0ZS5jYXRlZ29yaWVzKSB7XG4gICAgY29uc3QgaXNDdXN0b20gPSBjYXQuaXNDdXN0b207XG4gICAgY29uc3QgY2F0TmFtZSA9IGlzQ3VzdG9tID8gc3RhdGUuY3VzdG9tQ2F0ZWdvcnlOYW1lIDogY2F0Lm5hbWU7XG4gICAgY29uc3QgY291bnQgPSBzdGF0ZS5jb3VudHNbY2F0LmlkXSB8fCAwO1xuICAgIGNvbnN0IHRhcmdldCA9IHN0YXRlLnRhcmdldHNbY2F0LmlkXSB8fCAwO1xuXG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBjYWxjdWxhdGVQcm9ncmVzcyhjb3VudCwgdGFyZ2V0KTtcblxuICAgIGNvbnN0IGNhcmQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjYXJkLmNsYXNzTmFtZSA9IGBjYXRlZ29yeS1jYXJkICR7cHJvZ3Jlc3MuaXNFeGNlZWRlZCA/ICdpcy1leGNlZWRlZCcgOiAnJ30gJHtwcm9ncmVzcy5pc1JlYWNoZWQgJiYgIXByb2dyZXNzLmlzRXhjZWVkZWQgPyAnaXMtcmVhY2hlZCcgOiAnJ30gJHshcHJvZ3Jlc3MuaGFzVGFyZ2V0ID8gJ25vLXRhcmdldCcgOiAnJ31gO1xuICAgIGNhcmQuc2V0QXR0cmlidXRlKCdkYXRhLWNhdGVnb3J5LWlkJywgY2F0LmlkKTtcblxuICAgIGxldCBiYWRnZUh0bWwgPSAnJztcbiAgICBpZiAoIXByb2dyZXNzLmhhc1RhcmdldCkge1xuICAgICAgYmFkZ2VIdG1sID0gYDxzcGFuIGNsYXNzPVwiY291bnRlci1iYWRnZSBiYWRnZS1uby10YXJnZXRcIj5OZXNzdW4gb2JpZXR0aXZvIGltcG9zdGF0bzwvc3Bhbj5gO1xuICAgIH0gZWxzZSBpZiAocHJvZ3Jlc3MuaXNFeGNlZWRlZCkge1xuICAgICAgYmFkZ2VIdG1sID0gYDxzcGFuIGNsYXNzPVwiY291bnRlci1iYWRnZSBiYWRnZS1leGNlZWRlZFwiPlN1cGVyYXRvIGRpICR7Y291bnQgLSB0YXJnZXR9PC9zcGFuPmA7XG4gICAgfSBlbHNlIGlmIChwcm9ncmVzcy5pc1JlYWNoZWQpIHtcbiAgICAgIGJhZGdlSHRtbCA9IGA8c3BhbiBjbGFzcz1cImNvdW50ZXItYmFkZ2UgYmFkZ2UtcmVhY2hlZFwiPk9iaWV0dGl2byByYWdnaXVudG8g4pyTPC9zcGFuPmA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJhZGdlSHRtbCA9IGA8c3BhbiBjbGFzcz1cImNvdW50ZXItYmFkZ2UgYmFkZ2UtaW4tcHJvZ3Jlc3NcIj4ke2NvdW50fSBzdSAke3RhcmdldH08L3NwYW4+YDtcbiAgICB9XG5cbiAgICBjYXJkLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJjYXRlZ29yeS1oZWFkZXJcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNhdGVnb3J5LWlkZW50aXR5XCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJjYXRlZ29yeS1pY29uXCI+JHtjYXQuaWNvbn08L3NwYW4+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImNhdGVnb3J5LW5hbWUtZ3JvdXBcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY2F0ZWdvcnktbmFtZVwiPiR7ZXNjYXBlSHRtbChjYXROYW1lKX08L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImNhdGVnb3J5LXRhcmdldC1zdWJ0ZXh0XCI+T2JpZXR0aXZvIHNldHRpbWFuYWxlOiAke3RhcmdldCA+IDAgPyB0YXJnZXQgKyAnIHBhc3RpJyA6ICdOb24gaW1wb3N0YXRvJ308L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2F0ZWdvcnktY291bnRlci13cmFwXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImNvdW50ZXItZnJhY3Rpb25cIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY3VycmVudC1jb3VudFwiPiR7Y291bnR9PC9zcGFuPiR7dGFyZ2V0ID4gMCA/IGA8c3BhbiBjbGFzcz1cInRhcmdldC1jb3VudFwiPiAvICR7dGFyZ2V0fTwvc3Bhbj5gIDogJyd9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgJHtiYWRnZUh0bWx9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy1iYXItdHJhY2tcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzLWJhci1maWxsXCIgc3R5bGU9XCJ3aWR0aDogJHtwcm9ncmVzcy5wZXJjZW50fSU7XCI+PC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzcz1cImNhdGVnb3J5LWNvbnRyb2xzXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwic3RhdHVzLWxhYmVsXCI+JHtlc2NhcGVIdG1sKHByb2dyZXNzLmxhYmVsKX08L3NwYW4+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJzdGVwcGVyLWJ1dHRvbnNcIj5cbiAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiIFxuICAgICAgICAgICAgY2xhc3M9XCJidG4tc3RlcC1taW51c1wiIFxuICAgICAgICAgICAgZGF0YS1hY3Rpb249XCJkZWNyZW1lbnRcIiBcbiAgICAgICAgICAgIGRhdGEtY2F0ZWdvcnk9XCIke2NhdC5pZH1cIlxuICAgICAgICAgICAgYXJpYS1sYWJlbD1cIkRpbWludWlzY2kgJHtlc2NhcGVIdG1sKGNhdE5hbWUpfVwiXG4gICAgICAgICAgICAke2NvdW50IDw9IDAgPyAnZGlzYWJsZWQnIDogJyd9XG4gICAgICAgICAgPuKIkjwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCIgXG4gICAgICAgICAgICBjbGFzcz1cImJ0bi1zdGVwLXBsdXNcIiBcbiAgICAgICAgICAgIGRhdGEtYWN0aW9uPVwiaW5jcmVtZW50XCIgXG4gICAgICAgICAgICBkYXRhLWNhdGVnb3J5PVwiJHtjYXQuaWR9XCJcbiAgICAgICAgICAgIGFyaWEtbGFiZWw9XCJBZ2dpdW5naSBjb25zdW1vICR7ZXNjYXBlSHRtbChjYXROYW1lKX1cIlxuICAgICAgICAgID4rPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIGVsZW1lbnRzLmNhdGVnb3JpZXNDb250YWluZXIuYXBwZW5kQ2hpbGQoY2FyZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlQ2F0ZWdvcnlDbGljayhldmVudCkge1xuICBjb25zdCB0YXJnZXRCdG4gPSBldmVudC50YXJnZXQuY2xvc2VzdCgnYnV0dG9uW2RhdGEtYWN0aW9uXScpO1xuICBpZiAoIXRhcmdldEJ0bikgcmV0dXJuO1xuXG4gIGNvbnN0IGFjdGlvbiA9IHRhcmdldEJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtYWN0aW9uJyk7XG4gIGNvbnN0IGNhdElkID0gdGFyZ2V0QnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1jYXRlZ29yeScpO1xuICBpZiAoIWNhdElkKSByZXR1cm47XG5cbiAgdmVyaWZ5V2Vla1RyYW5zaXRpb24oKTtcblxuICBjb25zdCBjdXJyZW50VmFsID0gc3RhdGUuY291bnRzW2NhdElkXSB8fCAwO1xuICBpZiAoYWN0aW9uID09PSAnaW5jcmVtZW50Jykge1xuICAgIHN0YXRlLmNvdW50c1tjYXRJZF0gPSBjdXJyZW50VmFsICsgMTtcbiAgICBzYXZlV2Vla0FuZENvdW50cygpO1xuICAgIHJlbmRlckNhdGVnb3JpZXMoKTtcbiAgfSBlbHNlIGlmIChhY3Rpb24gPT09ICdkZWNyZW1lbnQnKSB7XG4gICAgaWYgKGN1cnJlbnRWYWwgPiAwKSB7XG4gICAgICBzdGF0ZS5jb3VudHNbY2F0SWRdID0gTWF0aC5tYXgoMCwgY3VycmVudFZhbCAtIDEpO1xuICAgICAgc2F2ZVdlZWtBbmRDb3VudHMoKTtcbiAgICAgIHJlbmRlckNhdGVnb3JpZXMoKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdE5vdGVzKCkge1xuICBpZiAoIWVsZW1lbnRzLm5vdGVzVGV4dGFyZWEpIHJldHVybjtcbiAgZWxlbWVudHMubm90ZXNUZXh0YXJlYS52YWx1ZSA9IHN0YXRlLm5vdGVzO1xuXG4gIGxldCBzYXZlVGltZXIgPSBudWxsO1xuICBlbGVtZW50cy5ub3Rlc1RleHRhcmVhLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGUpID0+IHtcbiAgICBzdGF0ZS5ub3RlcyA9IGUudGFyZ2V0LnZhbHVlO1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFNUT1JBR0VfS0VZUy5OT1RFUywgc3RhdGUubm90ZXMpO1xuXG4gICAgaWYgKGVsZW1lbnRzLm5vdGVzU3RhdHVzKSB7XG4gICAgICBlbGVtZW50cy5ub3Rlc1N0YXR1cy50ZXh0Q29udGVudCA9ICdTYWx2YXRhZ2dpbyBpbiBjb3Jzby4uLic7XG4gICAgICBlbGVtZW50cy5ub3Rlc1N0YXR1cy5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgIH1cblxuICAgIGNsZWFyVGltZW91dChzYXZlVGltZXIpO1xuICAgIHNhdmVUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKGVsZW1lbnRzLm5vdGVzU3RhdHVzKSB7XG4gICAgICAgIGVsZW1lbnRzLm5vdGVzU3RhdHVzLnRleHRDb250ZW50ID0gJ1NhbHZhdG8gYXV0b21hdGljYW1lbnRlIOKckyc7XG4gICAgICB9XG4gICAgfSwgNjAwKTtcbiAgfSk7XG5cbiAgaWYgKGVsZW1lbnRzLmJ0bkNsZWFyTm90ZXMpIHtcbiAgICBlbGVtZW50cy5idG5DbGVhck5vdGVzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgb3Blbk1vZGFsKGVsZW1lbnRzLm1vZGFsQ29uZmlybURlbGV0ZU5vdGVzKTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChlbGVtZW50cy5idG5Db25maXJtRGVsZXRlTm90ZXNBcHBseSkge1xuICAgIGVsZW1lbnRzLmJ0bkNvbmZpcm1EZWxldGVOb3Rlc0FwcGx5LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgc3RhdGUubm90ZXMgPSAnJztcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFNUT1JBR0VfS0VZUy5OT1RFUywgJycpO1xuICAgICAgaWYgKGVsZW1lbnRzLm5vdGVzVGV4dGFyZWEpIGVsZW1lbnRzLm5vdGVzVGV4dGFyZWEudmFsdWUgPSAnJztcbiAgICAgIGlmIChlbGVtZW50cy5ub3Rlc1N0YXR1cykgZWxlbWVudHMubm90ZXNTdGF0dXMudGV4dENvbnRlbnQgPSAnTm90ZSBjYW5jZWxsYXRlJztcbiAgICAgIGNsb3NlTW9kYWwoZWxlbWVudHMubW9kYWxDb25maXJtRGVsZXRlTm90ZXMpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBvcHVsYXRlU2V0dGluZ3NGb3JtKGlzRmlyc3RSdW4gPSBmYWxzZSkge1xuICBpZiAoIWVsZW1lbnRzLnNldHRpbmdzQ2F0ZWdvcmllc0xpc3QpIHJldHVybjtcbiAgZWxlbWVudHMuc2V0dGluZ3NDYXRlZ29yaWVzTGlzdC5pbm5lckhUTUwgPSAnJztcblxuICBpZiAoZWxlbWVudHMuc2V0dGluZ3NNb2RhbFRpdGxlKSB7XG4gICAgZWxlbWVudHMuc2V0dGluZ3NNb2RhbFRpdGxlLnRleHRDb250ZW50ID0gaXNGaXJzdFJ1blxuICAgICAgPyAnQ29uZmlndXJhemlvbmUgSW5pemlhbGUnXG4gICAgICA6ICdNb2RpZmljYSBPYmlldHRpdmkgU2V0dGltYW5hbGknO1xuICB9XG5cbiAgZm9yIChjb25zdCBjYXQgb2Ygc3RhdGUuY2F0ZWdvcmllcykge1xuICAgIGNvbnN0IGlzQ3VzdG9tID0gY2F0LmlzQ3VzdG9tO1xuICAgIGNvbnN0IGN1cnJlbnRUYXJnZXQgPSBzdGF0ZS50YXJnZXRzW2NhdC5pZF0gPz8gMDtcbiAgICBjb25zdCBjYXROYW1lID0gaXNDdXN0b20gPyAoc3RhdGUuY3VzdG9tQ2F0ZWdvcnlOYW1lIHx8ICdBbHRybycpIDogY2F0Lm5hbWU7XG5cbiAgICBjb25zdCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICByb3cuY2xhc3NOYW1lID0gJ3RhcmdldC1zZXR0aW5nLXJvdyc7XG5cbiAgICByb3cuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cInRhcmdldC1zZXR0aW5nLWxhYmVsXCI+XG4gICAgICAgIDxzcGFuPiR7Y2F0Lmljb259PC9zcGFuPlxuICAgICAgICA8c3Bhbj4ke2VzY2FwZUh0bWwoY2F0TmFtZSl9PC9zcGFuPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwidGFyZ2V0LXN0ZXBwZXJcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4tc3RlcHBlci1hZGpcIiBkYXRhLXRhcmdldC1pZD1cIiR7Y2F0LmlkfVwiIGRhdGEtb3A9XCItXCI+4oiSPC9idXR0b24+XG4gICAgICAgIDxpbnB1dCBcbiAgICAgICAgICB0eXBlPVwibnVtYmVyXCIgXG4gICAgICAgICAgaWQ9XCJ0YXJnZXQtaW5wdXQtJHtjYXQuaWR9XCJcbiAgICAgICAgICBuYW1lPVwidGFyZ2V0XyR7Y2F0LmlkfVwiIFxuICAgICAgICAgIGNsYXNzPVwidGFyZ2V0LWlucHV0XCIgXG4gICAgICAgICAgbWluPVwiMFwiIFxuICAgICAgICAgIG1heD1cIjk5XCIgXG4gICAgICAgICAgdmFsdWU9XCIke2N1cnJlbnRUYXJnZXR9XCJcbiAgICAgICAgICBhcmlhLWxhYmVsPVwiT2JpZXR0aXZvIHBlciAke2VzY2FwZUh0bWwoY2F0TmFtZSl9XCJcbiAgICAgICAgLz5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4tc3RlcHBlci1hZGpcIiBkYXRhLXRhcmdldC1pZD1cIiR7Y2F0LmlkfVwiIGRhdGEtb3A9XCIrXCI+KzwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIGVsZW1lbnRzLnNldHRpbmdzQ2F0ZWdvcmllc0xpc3QuYXBwZW5kQ2hpbGQocm93KTtcbiAgfVxuXG4gIGlmIChlbGVtZW50cy5jdXN0b21OYW1lSW5wdXQpIHtcbiAgICBlbGVtZW50cy5jdXN0b21OYW1lSW5wdXQudmFsdWUgPSBzdGF0ZS5jdXN0b21DYXRlZ29yeU5hbWUgfHwgJ0FsdHJvJztcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVTZXR0aW5nc1N0ZXBwZXJDbGljayhlKSB7XG4gIGNvbnN0IGJ0biA9IGUudGFyZ2V0LmNsb3Nlc3QoJy5idG4tc3RlcHBlci1hZGonKTtcbiAgaWYgKCFidG4pIHJldHVybjtcbiAgY29uc3QgdGFyZ2V0SWQgPSBidG4uZ2V0QXR0cmlidXRlKCdkYXRhLXRhcmdldC1pZCcpO1xuICBjb25zdCBvcCA9IGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtb3AnKTtcbiAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgdGFyZ2V0LWlucHV0LSR7dGFyZ2V0SWR9YCk7XG4gIGlmICghaW5wdXQpIHJldHVybjtcblxuICBsZXQgdmFsID0gcGFyc2VJbnQoaW5wdXQudmFsdWUsIDEwKSB8fCAwO1xuICBpZiAob3AgPT09ICcrJykgdmFsKys7XG4gIGVsc2UgaWYgKG9wID09PSAnLScgJiYgdmFsID4gMCkgdmFsLS07XG4gIGlucHV0LnZhbHVlID0gTWF0aC5tYXgoMCwgdmFsKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlU2V0dGluZ3NTdWJtaXQoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgZm9yIChjb25zdCBjYXQgb2Ygc3RhdGUuY2F0ZWdvcmllcykge1xuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHRhcmdldC1pbnB1dC0ke2NhdC5pZH1gKTtcbiAgICBjb25zdCB2YWwgPSBpbnB1dCA/IHBhcnNlSW50KGlucHV0LnZhbHVlLCAxMCkgOiAwO1xuICAgIHN0YXRlLnRhcmdldHNbY2F0LmlkXSA9IGlzTmFOKHZhbCkgfHwgdmFsIDwgMCA/IDAgOiB2YWw7XG4gIH1cblxuICBpZiAoZWxlbWVudHMuY3VzdG9tTmFtZUlucHV0KSB7XG4gICAgY29uc3QgY3VzdG9tVmFsID0gZWxlbWVudHMuY3VzdG9tTmFtZUlucHV0LnZhbHVlLnRyaW0oKTtcbiAgICBzdGF0ZS5jdXN0b21DYXRlZ29yeU5hbWUgPSBjdXN0b21WYWwubGVuZ3RoID4gMCA/IGN1c3RvbVZhbC5zbGljZSgwLCA1MCkgOiAnQWx0cm8nO1xuICB9XG5cbiAgc2F2ZVRhcmdldHNBbmRTZXR0aW5ncygpO1xuICByZW5kZXJDYXRlZ29yaWVzKCk7XG4gIGNsb3NlTW9kYWwoZWxlbWVudHMubW9kYWxTZXR0aW5ncyk7XG59XG5cbmZ1bmN0aW9uIGV4cG9ydEJhY2t1cCgpIHtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgY29uc3QgYmFja3VwT2JqZWN0ID0ge1xuICAgIGFwcDogJ3Bhc3RpX2RlbGxhX3NldHRpbWFuYScsXG4gICAgdmVyc2lvbjogJzEuMCcsXG4gICAgZXhwb3J0RGF0ZTogbm93LnRvSVNPU3RyaW5nKCksXG4gICAgd2Vla0tleTogc3RhdGUud2Vla0tleSxcbiAgICB3ZWVrRm9ybWF0dGVkOiBmb3JtYXRXZWVrUmFuZ2Uobm93KSxcbiAgICBjdXN0b21DYXRlZ29yeU5hbWU6IHN0YXRlLmN1c3RvbUNhdGVnb3J5TmFtZSxcbiAgICB0YXJnZXRzOiBzdGF0ZS50YXJnZXRzLFxuICAgIGNvdW50czogc3RhdGUuY291bnRzLFxuICAgIG5vdGVzOiBzdGF0ZS5ub3Rlc1xuICB9O1xuXG4gIGNvbnN0IGpzb25TdHJpbmcgPSBKU09OLnN0cmluZ2lmeShiYWNrdXBPYmplY3QsIG51bGwsIDIpO1xuICBjb25zdCBibG9iID0gbmV3IEJsb2IoW2pzb25TdHJpbmddLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTgnIH0pO1xuICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICBhLmhyZWYgPSB1cmw7XG4gIGEuZG93bmxvYWQgPSBgcGFzdGktc2V0dGltYW5hLWJhY2t1cC0ke3N0YXRlLndlZWtLZXl9Lmpzb25gO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICBhLmNsaWNrKCk7XG4gIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG4gIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlRmlsZUltcG9ydChldmVudCkge1xuICBjb25zdCBmaWxlID0gZXZlbnQudGFyZ2V0LmZpbGVzPy5bMF07XG4gIGlmICghZmlsZSkgcmV0dXJuO1xuXG4gIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gIHJlYWRlci5vbmxvYWQgPSAoZSkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGUudGFyZ2V0LnJlc3VsdCk7XG4gICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVBbmRQcm9jZXNzQmFja3VwKHBhcnNlZCwgbmV3IERhdGUoKSk7XG4gICAgICBpZiAoIXZhbGlkYXRpb24udmFsaWQpIHtcbiAgICAgICAgYWxlcnQoYEVycm9yZSBuZWwgZmlsZSBkaSBiYWNrdXA6ICR7dmFsaWRhdGlvbi5lcnJvcn1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBwZW5kaW5nSW1wb3J0RGF0YSA9IHZhbGlkYXRpb24uZGF0YTtcbiAgICAgIGNvbnN0IGlzUGFzdCA9IHBlbmRpbmdJbXBvcnREYXRhLmlzUGFzdFdlZWs7XG5cbiAgICAgIGlmIChlbGVtZW50cy5pbXBvcnRDb25maXJtYXRpb25UZXh0KSB7XG4gICAgICAgIGVsZW1lbnRzLmltcG9ydENvbmZpcm1hdGlvblRleHQuaW5uZXJIVE1MID0gYFxuICAgICAgICAgIDxwPjxzdHJvbmc+U3RhaSBwZXIgaW1wb3J0YXJlIGlsIGJhY2t1cDo8L3N0cm9uZz48L3A+XG4gICAgICAgICAgPHVsIHN0eWxlPVwibWFyZ2luOiA4cHggMCA4cHggMjBweDsgZm9udC1zaXplOiAwLjg4cmVtOyBsaW5lLWhlaWdodDogMS40O1wiPlxuICAgICAgICAgICAgPGxpPlNldHRpbWFuYSBkZWwgYmFja3VwOiA8Y29kZT4ke2VzY2FwZUh0bWwocGVuZGluZ0ltcG9ydERhdGEuYmFja3VwV2Vla0tleSB8fCAnTi9EJyl9PC9jb2RlPjwvbGk+XG4gICAgICAgICAgICA8bGk+U2V0dGltYW5hIGF0dHVhbGU6IDxjb2RlPiR7ZXNjYXBlSHRtbChzdGF0ZS53ZWVrS2V5KX08L2NvZGU+PC9saT5cbiAgICAgICAgICAgIDxsaT5DYXRlZ29yaWEgXCJBbHRyb1wiOiA8c3Ryb25nPiR7ZXNjYXBlSHRtbChwZW5kaW5nSW1wb3J0RGF0YS5jdXN0b21DYXRlZ29yeU5hbWUpfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgPC91bD5cbiAgICAgICAgICAke2lzUGFzdCBcbiAgICAgICAgICAgID8gYDxkaXYgc3R5bGU9XCJiYWNrZ3JvdW5kOiAjRkZGOUU2OyBib3JkZXI6IDFweCBzb2xpZCAjRkZFNjk5OyBwYWRkaW5nOiAxMHB4OyBib3JkZXItcmFkaXVzOiA4cHg7IGZvbnQtc2l6ZTogMC44NXJlbTsgY29sb3I6ICM4QTY0MDA7XCI+XG4gICAgICAgICAgICAgICAgIDxzdHJvbmc+Tm90YSBpbXBvcnRhbnRlOjwvc3Ryb25nPiBRdWVzdG8gYmFja3VwIGFwcGFydGllbmUgYSB1bmEgc2V0dGltYW5hIHByZWNlZGVudGUuIFxuICAgICAgICAgICAgICAgICBWZXJyYW5ubyByaXByaXN0aW5hdGkgZ2xpIG9iaWV0dGl2aSwgaWwgbm9tZSBwZXJzb25hbGl6emF0byBlIGxlIG5vdGUsIG1hIGkgY29uc3VtaSBkZWxsYSBzZXR0aW1hbmEgYXR0dWFsZSBzYXJhbm5vIGltcG9zdGF0aSBhIHplcm8uXG4gICAgICAgICAgICAgICA8L2Rpdj5gXG4gICAgICAgICAgICA6IGA8ZGl2IHN0eWxlPVwiYmFja2dyb3VuZDogI0VCRjdFRTsgYm9yZGVyOiAxcHggc29saWQgI0M0RThDQzsgcGFkZGluZzogMTBweDsgYm9yZGVyLXJhZGl1czogOHB4OyBmb250LXNpemU6IDAuODVyZW07IGNvbG9yOiAjMkI2ODNCO1wiPlxuICAgICAgICAgICAgICAgICBRdWVzdG8gYmFja3VwIMOoIGRlbGxhIHNldHRpbWFuYSBjb3JyZW50ZS4gVmVycmFubm8gcmlwcmlzdGluYXRpIHNpYSBnbGkgb2JpZXR0aXZpIGNoZSBpIGNvbnN1bWkgcmVnaXN0cmF0aS5cbiAgICAgICAgICAgICAgIDwvZGl2PmBcbiAgICAgICAgICB9XG4gICAgICAgIGA7XG4gICAgICB9XG5cbiAgICAgIGNsb3NlTW9kYWwoZWxlbWVudHMubW9kYWxEYXRhKTtcbiAgICAgIG9wZW5Nb2RhbChlbGVtZW50cy5tb2RhbENvbmZpcm1JbXBvcnQpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgYWxlcnQoJ0ltcG9zc2liaWxlIGxlZ2dlcmUgaWwgZmlsZSBKU09OLiBBc3NpY3VyYXRpIGNoZSBzaWEgdW4gZmlsZSBkaSBiYWNrdXAgdmFsaWRvLicpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJztcbiAgICB9XG4gIH07XG4gIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xufVxuXG5mdW5jdGlvbiBhcHBseVBlbmRpbmdJbXBvcnQoKSB7XG4gIGlmICghcGVuZGluZ0ltcG9ydERhdGEpIHJldHVybjtcblxuICBzdGF0ZS50YXJnZXRzID0gcGVuZGluZ0ltcG9ydERhdGEudGFyZ2V0cztcbiAgc3RhdGUuY3VzdG9tQ2F0ZWdvcnlOYW1lID0gcGVuZGluZ0ltcG9ydERhdGEuY3VzdG9tQ2F0ZWdvcnlOYW1lO1xuICBzdGF0ZS5ub3RlcyA9IHBlbmRpbmdJbXBvcnREYXRhLm5vdGVzO1xuICBzdGF0ZS5jb3VudHMgPSBwZW5kaW5nSW1wb3J0RGF0YS5jb3VudHM7XG4gIHN0YXRlLndlZWtLZXkgPSBwZW5kaW5nSW1wb3J0RGF0YS53ZWVrS2V5O1xuXG4gIHNhdmVUYXJnZXRzQW5kU2V0dGluZ3MoKTtcbiAgc2F2ZVdlZWtBbmRDb3VudHMoKTtcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oU1RPUkFHRV9LRVlTLk5PVEVTLCBzdGF0ZS5ub3Rlcyk7XG5cbiAgaWYgKGVsZW1lbnRzLm5vdGVzVGV4dGFyZWEpIHtcbiAgICBlbGVtZW50cy5ub3Rlc1RleHRhcmVhLnZhbHVlID0gc3RhdGUubm90ZXM7XG4gIH1cblxuICByZW5kZXJXZWVrSGVhZGVyKCk7XG4gIHJlbmRlckNhdGVnb3JpZXMoKTtcbiAgY2xvc2VNb2RhbChlbGVtZW50cy5tb2RhbENvbmZpcm1JbXBvcnQpO1xuICBwZW5kaW5nSW1wb3J0RGF0YSA9IG51bGw7XG5cbiAgYWxlcnQoJ0JhY2t1cCByaXByaXN0aW5hdG8gY29uIHN1Y2Nlc3NvIScpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZENvbXBsZXRlWmlwKCkge1xuICBjb25zdCBzdGF0dXNCdG4gPSBlbGVtZW50cy5idG5Eb3dubG9hZFppcDtcbiAgY29uc3Qgb3JpZ2luYWxUZXh0ID0gc3RhdHVzQnRuID8gc3RhdHVzQnRuLmlubmVySFRNTCA6ICcnO1xuICBpZiAoc3RhdHVzQnRuKSBzdGF0dXNCdG4uaW5uZXJIVE1MID0gJ0NyZWF6aW9uZSBhcmNoaXZpbyBaSVAgaW4gY29yc28uLi4nO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgemlwID0gbmV3IFNpbXBsZVppcCgpO1xuXG4gICAgY29uc3QgZmlsZXNUb0J1bmRsZSA9IFtcbiAgICAgICdpbmRleC5odG1sJyxcbiAgICAgICdzdHlsZS5jc3MnLFxuICAgICAgJ2FwcC5qcycsXG4gICAgICAnc3cuanMnLFxuICAgICAgJ21hbmlmZXN0LndlYm1hbmlmZXN0JyxcbiAgICAgICcubm9qZWt5bGwnLFxuICAgICAgJ2ljb24uc3ZnJyxcbiAgICAgICdpY29uLTE5Mi5wbmcnLFxuICAgICAgJ2ljb24tNTEyLnBuZycsXG4gICAgICAnYXBwbGUtdG91Y2gtaWNvbi5wbmcnLFxuICAgICAgJ2Zhdmljb24ucG5nJyxcbiAgICAgICdmYXZpY29uLmljbycsXG4gICAgICAnUkVBRE1FLm1kJ1xuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGZpbGVzVG9CdW5kbGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYC4vJHtmaWxlUGF0aH1gKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IHJlc3BvbnNlLmJsb2IoKTtcbiAgICAgICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCBibG9iLmFycmF5QnVmZmVyKCk7XG4gICAgICAgICAgemlwLmFkZEZpbGUoZmlsZVBhdGgsIG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBGaWxlICR7ZmlsZVBhdGh9IG5vbiBzY2FyaWNhdG8gcGVyIGlsIHppcDpgLCBlcnIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHppcEJsb2IgPSB6aXAuZ2VuZXJhdGVCbG9iKCk7XG4gICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTCh6aXBCbG9iKTtcbiAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgIGEuaHJlZiA9IHVybDtcbiAgICBhLmRvd25sb2FkID0gJ3Bhc3RpLWRlbGxhLXNldHRpbWFuYS1wd2EuemlwJztcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgIGEuY2xpY2soKTtcbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGEpO1xuICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgYWxlcnQoJ0Vycm9yZSBkdXJhbnRlIGxhIGNyZWF6aW9uZSBkZWxsbyBaSVA6ICcgKyBlcnIubWVzc2FnZSk7XG4gIH0gZmluYWxseSB7XG4gICAgaWYgKHN0YXR1c0J0bikgc3RhdHVzQnRuLmlubmVySFRNTCA9IG9yaWdpbmFsVGV4dDtcbiAgfVxufVxuXG5mdW5jdGlvbiBvcGVuTW9kYWwobW9kYWwpIHtcbiAgaWYgKCFtb2RhbCkgcmV0dXJuO1xuICBtb2RhbC5jbGFzc0xpc3QuYWRkKCdvcGVuJyk7XG4gIG1vZGFsLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcbiAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xufVxuXG5mdW5jdGlvbiBjbG9zZU1vZGFsKG1vZGFsKSB7XG4gIGlmICghbW9kYWwpIHJldHVybjtcbiAgbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpO1xuICBtb2RhbC5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICcnO1xufVxuXG5mdW5jdGlvbiBpbml0TW9kYWxzKCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1jbG9zZS1tb2RhbF0nKS5mb3JFYWNoKChidG4pID0+IHtcbiAgICBidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgY29uc3QgbW9kYWwgPSBlLnRhcmdldC5jbG9zZXN0KCcubW9kYWwtb3ZlcmxheScpO1xuICAgICAgY2xvc2VNb2RhbChtb2RhbCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5tb2RhbC1vdmVybGF5JykuZm9yRWFjaCgob3ZlcmxheSkgPT4ge1xuICAgIG92ZXJsYXkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgaWYgKGUudGFyZ2V0ID09PSBvdmVybGF5KSB7XG4gICAgICAgIGNvbnN0IGlzRmlyc3RSdW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShTVE9SQUdFX0tFWVMuSU5JVElBTElaRUQpICE9PSAndHJ1ZSc7XG4gICAgICAgIGlmIChvdmVybGF5ID09PSBlbGVtZW50cy5tb2RhbFNldHRpbmdzICYmIGlzRmlyc3RSdW4pIHJldHVybjtcbiAgICAgICAgY2xvc2VNb2RhbChvdmVybGF5KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgaWYgKGVsZW1lbnRzLmJ0blNldHRpbmdzKSB7XG4gICAgZWxlbWVudHMuYnRuU2V0dGluZ3MuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBwb3B1bGF0ZVNldHRpbmdzRm9ybShmYWxzZSk7XG4gICAgICBvcGVuTW9kYWwoZWxlbWVudHMubW9kYWxTZXR0aW5ncyk7XG4gICAgfSk7XG4gIH1cblxuICBpZiAoZWxlbWVudHMuYnRuRGF0YSkge1xuICAgIGVsZW1lbnRzLmJ0bkRhdGEuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBvcGVuTW9kYWwoZWxlbWVudHMubW9kYWxEYXRhKTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChlbGVtZW50cy5idG5JbnN0YWxsKSB7XG4gICAgZWxlbWVudHMuYnRuSW5zdGFsbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIGNvbnN0IGlzQW5kcm9pZCA9IC9hbmRyb2lkL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50IHx8ICcnKTtcbiAgICAgIGlmIChpc0FuZHJvaWQgJiYgdHlwZW9mIHdpbmRvdy5zd2l0Y2hJbnN0YWxsVGFiID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHdpbmRvdy5zd2l0Y2hJbnN0YWxsVGFiKCdhbmRyb2lkJyk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cuc3dpdGNoSW5zdGFsbFRhYiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB3aW5kb3cuc3dpdGNoSW5zdGFsbFRhYignaW9zJyk7XG4gICAgICB9XG4gICAgICBvcGVuTW9kYWwoZWxlbWVudHMubW9kYWxJbnN0YWxsKTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChlbGVtZW50cy5idG5FeHBvcnRCYWNrdXApIHtcbiAgICBlbGVtZW50cy5idG5FeHBvcnRCYWNrdXAuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBleHBvcnRCYWNrdXApO1xuICB9XG5cbiAgaWYgKGVsZW1lbnRzLmZpbGVJbnB1dEltcG9ydCkge1xuICAgIGVsZW1lbnRzLmZpbGVJbnB1dEltcG9ydC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBoYW5kbGVGaWxlSW1wb3J0KTtcbiAgfVxuXG4gIGlmIChlbGVtZW50cy5idG5Db25maXJtSW1wb3J0QXBwbHkpIHtcbiAgICBlbGVtZW50cy5idG5Db25maXJtSW1wb3J0QXBwbHkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhcHBseVBlbmRpbmdJbXBvcnQpO1xuICB9XG5cbiAgaWYgKGVsZW1lbnRzLmJ0bkRvd25sb2FkWmlwKSB7XG4gICAgZWxlbWVudHMuYnRuRG93bmxvYWRaaXAuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBkb3dubG9hZENvbXBsZXRlWmlwKTtcbiAgfVxuXG4gIGlmIChlbGVtZW50cy5zZXR0aW5nc0Zvcm0pIHtcbiAgICBlbGVtZW50cy5zZXR0aW5nc0Zvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgaGFuZGxlU2V0dGluZ3NTdWJtaXQpO1xuICAgIGVsZW1lbnRzLnNldHRpbmdzRm9ybS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGhhbmRsZVNldHRpbmdzU3RlcHBlckNsaWNrKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWdpc3RlclNlcnZpY2VXb3JrZXIoKSB7XG4gIGlmICgnc2VydmljZVdvcmtlcicgaW4gbmF2aWdhdG9yKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiB7XG4gICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlcignLi9zdy5qcycsIHsgc2NvcGU6ICcuLycgfSlcbiAgICAgICAgLnRoZW4oKHJlZykgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdbUFdBXSBTZXJ2aWNlIFdvcmtlciBhdHRpdm8uIFNjb3BlOicsIHJlZy5zY29wZSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdbUFdBXSBTZXJ2aWNlIFdvcmtlciBmYWxsYmFjazonLCBlcnIpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlc2NhcGVIdG1sKHRleHQpIHtcbiAgaWYgKCF0ZXh0KSByZXR1cm4gJyc7XG4gIHJldHVybiBTdHJpbmcodGV4dClcbiAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgIC5yZXBsYWNlKC8nL2csICcmIzAzOTsnKTtcbn1cblxuZnVuY3Rpb24gaW5pdEFwcCgpIHtcbiAgY29uc3QgaXNJbml0aWFsaXplZCA9IGxvYWRTdGF0ZSgpO1xuXG4gIHJlbmRlcldlZWtIZWFkZXIoKTtcbiAgcmVuZGVyQ2F0ZWdvcmllcygpO1xuICBpbml0Tm90ZXMoKTtcbiAgaW5pdE1vZGFscygpO1xuICByZWdpc3RlclNlcnZpY2VXb3JrZXIoKTtcblxuICBpZiAoZWxlbWVudHMuY2F0ZWdvcmllc0NvbnRhaW5lcikge1xuICAgIGVsZW1lbnRzLmNhdGVnb3JpZXNDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoYW5kbGVDYXRlZ29yeUNsaWNrKTtcbiAgfVxuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCAoKSA9PiB7XG4gICAgaWYgKCFkb2N1bWVudC5oaWRkZW4pIHZlcmlmeVdlZWtUcmFuc2l0aW9uKCk7XG4gIH0pO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCB2ZXJpZnlXZWVrVHJhbnNpdGlvbik7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwYWdlc2hvdycsIHZlcmlmeVdlZWtUcmFuc2l0aW9uKTtcblxuICBzZXRJbnRlcnZhbCh2ZXJpZnlXZWVrVHJhbnNpdGlvbiwgMTUwMDApO1xuXG4gIGlmICghaXNJbml0aWFsaXplZCkge1xuICAgIHBvcHVsYXRlU2V0dGluZ3NGb3JtKHRydWUpO1xuICAgIG9wZW5Nb2RhbChlbGVtZW50cy5tb2RhbFNldHRpbmdzKTtcbiAgfVxufVxuXG4vLyBBbmRyb2lkIFBXQSBwcm9tcHQgaGFuZGxlclxubGV0IGRlZmVycmVkSW5zdGFsbFByb21wdCA9IG51bGw7XG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmVmb3JlaW5zdGFsbHByb21wdCcsIChlKSA9PiB7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgZGVmZXJyZWRJbnN0YWxsUHJvbXB0ID0gZTtcbiAgY29uc3QgcXVpY2tCb3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5kcm9pZC1wd2EtcXVpY2stYnRuJyk7XG4gIGlmIChxdWlja0JveCkgcXVpY2tCb3guc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cbiAgY29uc3QgdHJpZ2dlckJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tdHJpZ2dlci1hbmRyb2lkLWluc3RhbGwnKTtcbiAgaWYgKHRyaWdnZXJCdG4gJiYgIXRyaWdnZXJCdG4uZGF0YXNldC5ib3VuZCkge1xuICAgIHRyaWdnZXJCdG4uZGF0YXNldC5ib3VuZCA9ICd0cnVlJztcbiAgICB0cmlnZ2VyQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKGRlZmVycmVkSW5zdGFsbFByb21wdCkge1xuICAgICAgICBkZWZlcnJlZEluc3RhbGxQcm9tcHQucHJvbXB0KCk7XG4gICAgICAgIGNvbnN0IHsgb3V0Y29tZSB9ID0gYXdhaXQgZGVmZXJyZWRJbnN0YWxsUHJvbXB0LnVzZXJDaG9pY2U7XG4gICAgICAgIGlmIChvdXRjb21lID09PSAnYWNjZXB0ZWQnKSB7XG4gICAgICAgICAgZGVmZXJyZWRJbnN0YWxsUHJvbXB0ID0gbnVsbDtcbiAgICAgICAgICBxdWlja0JveC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgIGNsb3NlTW9kYWwoZWxlbWVudHMubW9kYWxJbnN0YWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59KTtcblxuLy8gVGFiIFN3aXRjaGVyIGZvciBpT1MgLyBBbmRyb2lkIGd1aWRlXG53aW5kb3cuc3dpdGNoSW5zdGFsbFRhYiA9IGZ1bmN0aW9uKHBsYXRmb3JtKSB7XG4gIGNvbnN0IHRhYklvcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0YWItYnRuLWlvcycpO1xuICBjb25zdCB0YWJBbmRyb2lkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RhYi1idG4tYW5kcm9pZCcpO1xuICBjb25zdCBndWlkZUlvcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnN0YWxsLWd1aWRlLWlvcycpO1xuICBjb25zdCBndWlkZUFuZHJvaWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW5zdGFsbC1ndWlkZS1hbmRyb2lkJyk7XG5cbiAgaWYgKHBsYXRmb3JtID09PSAnYW5kcm9pZCcpIHtcbiAgICBpZiAodGFiSW9zKSB0YWJJb3MuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgaWYgKHRhYkFuZHJvaWQpIHRhYkFuZHJvaWQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgaWYgKGd1aWRlSW9zKSBndWlkZUlvcy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIGlmIChndWlkZUFuZHJvaWQpIGd1aWRlQW5kcm9pZC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgfSBlbHNlIHtcbiAgICBpZiAodGFiQW5kcm9pZCkgdGFiQW5kcm9pZC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICBpZiAodGFiSW9zKSB0YWJJb3MuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgaWYgKGd1aWRlQW5kcm9pZCkgZ3VpZGVBbmRyb2lkLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgaWYgKGd1aWRlSW9zKSBndWlkZUlvcy5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgfVxufTtcblxuaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdsb2FkaW5nJykge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgaW5pdEFwcCk7XG59IGVsc2Uge1xuICBpbml0QXBwKCk7XG59XG4iXX0=