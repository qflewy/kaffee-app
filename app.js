"use strict";

const BREW_METHODS = ["Espresso", "Filter", "Cold Brew", "Over Ice"];
const BASE_GRIND = {
  Espresso: 8,
  Filter: 18,
  "Cold Brew": 28,
  "Over Ice": 15,
};
const GRIND_HINTS = {
  Espresso: "sehr fein, wie Puderzucker",
  Filter: "mittel, wie grober Sand",
  "Cold Brew": "sehr grob, wie Meersalz",
  "Over Ice": "mittel-fein (Japanese Iced Coffee)",
};

const STORAGE_KEY = "kaffeebohnen_data_v1";

// ---------- Storage ----------

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { beans: [] };
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.beans)) return { beans: [] };
    return data;
  } catch (e) {
    console.warn("Could not load data:", e);
    return { beans: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let state = loadData();

// ---------- Grind suggestion ----------

function suggestGrind(method, roast, robusta) {
  const base = BASE_GRIND[method];
  const roastAdjust = (roast - 5) * 0.4;
  const robustaAdjust = -(robusta / 100) * 1.5;
  const value = base + roastAdjust + robustaAdjust;
  return Math.max(1, Math.min(30, Math.round(value)));
}

// ---------- Rendering ----------

const beanListEl = document.getElementById("bean-list");
const emptyStateEl = document.getElementById("empty-state");
const beanCountEl = document.getElementById("bean-count");
const searchEl = document.getElementById("search");

const openBeans = new Set();

function renderBeans() {
  const query = searchEl.value.trim().toLowerCase();
  const matches = state.beans.filter((b) => {
    if (!query) return true;
    const hay = [b.name, b.herkunft, b.geschmacksnoten, b.notizen]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  });

  beanCountEl.textContent = state.beans.length;
  emptyStateEl.hidden = state.beans.length > 0;

  beanListEl.innerHTML = "";
  if (state.beans.length === 0) return;

  if (matches.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = "Keine Treffer für diese Suche.";
    beanListEl.appendChild(p);
    return;
  }

  for (const bean of matches) {
    beanListEl.appendChild(renderBeanCard(bean));
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBeanCard(bean) {
  const card = document.createElement("div");
  card.className = "bean-card";
  if (openBeans.has(bean.id)) card.classList.add("open");

  const head = document.createElement("div");
  head.className = "bean-head";
  head.innerHTML = `
    <div class="bean-title">
      <strong>${escapeHtml(bean.name)}</strong>
      <span class="meta">${escapeHtml(bean.herkunft || "unbekannte Herkunft")}</span>
    </div>
    <span class="bean-chevron">▾</span>
  `;
  head.addEventListener("click", () => {
    if (openBeans.has(bean.id)) openBeans.delete(bean.id);
    else openBeans.add(bean.id);
    card.classList.toggle("open");
  });
  card.appendChild(head);

  const body = document.createElement("div");
  body.className = "bean-body";

  const propGrid = document.createElement("div");
  propGrid.className = "prop-grid";
  propGrid.innerHTML = `
    <div class="prop-label">Röstgrad</div>
    <div class="prop-value">${bean.roestgrad} / 10</div>
    <div class="prop-label">Robusta-Anteil</div>
    <div class="prop-value">${bean.robusta_anteil} %</div>
    ${bean.geschmacksnoten ? `
      <div class="prop-label">Noten</div>
      <div class="prop-value">${escapeHtml(bean.geschmacksnoten)}</div>` : ""}
    ${bean.notizen ? `
      <div class="prop-label">Notizen</div>
      <div class="prop-value">${escapeHtml(bean.notizen)}</div>` : ""}
  `;
  body.appendChild(propGrid);

  body.appendChild(renderGrindSection(bean));
  body.appendChild(renderSavedGrinds(bean));
  body.appendChild(renderActions(bean));

  card.appendChild(body);
  return card;
}

function renderGrindSection(bean) {
  const section = document.createElement("div");
  section.className = "grind-section";

  const title = document.createElement("h3");
  title.textContent = "Mahlgrad";
  section.appendChild(title);

  const methodLabel = document.createElement("label");
  methodLabel.innerHTML = `Brühmethode`;
  const select = document.createElement("select");
  for (const m of BREW_METHODS) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  }
  methodLabel.appendChild(select);
  section.appendChild(methodLabel);

  const hint = document.createElement("small");
  section.appendChild(hint);

  const suggestionLine = document.createElement("div");
  suggestionLine.className = "suggestion-line";
  section.appendChild(suggestionLine);

  const grindRow = document.createElement("div");
  grindRow.className = "grind-row";
  const grindLabel = document.createElement("label");
  grindLabel.innerHTML = "Mahlgrad eintragen / bearbeiten";
  const grindInput = document.createElement("input");
  grindInput.type = "number";
  grindInput.min = "1";
  grindInput.max = "30";
  grindInput.step = "1";
  grindInput.inputMode = "numeric";
  grindLabel.appendChild(grindInput);
  grindRow.appendChild(grindLabel);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "💾 Speichern";
  saveBtn.addEventListener("click", () => {
    const method = select.value;
    const val = parseInt(grindInput.value, 10);
    if (!Number.isFinite(val) || val < 1 || val > 30) {
      toast("Bitte Zahl zwischen 1 und 30 eingeben.");
      return;
    }
    bean.grinds = bean.grinds || {};
    bean.grinds[method] = val;
    saveData(state);
    toast(`Mahlgrad ${val} für ${method} gespeichert.`);
    update();
  });
  grindRow.appendChild(saveBtn);
  section.appendChild(grindRow);

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "danger";
  resetBtn.textContent = "Zurücksetzen";
  resetBtn.style.marginTop = "0.5rem";
  resetBtn.style.width = "100%";
  resetBtn.addEventListener("click", () => {
    const method = select.value;
    if (bean.grinds && bean.grinds[method] != null) {
      delete bean.grinds[method];
      saveData(state);
      toast(`Mahlgrad für ${method} entfernt.`);
      update();
    }
  });
  section.appendChild(resetBtn);

  function refreshForMethod() {
    const method = select.value;
    const roast = bean.roestgrad;
    const robusta = bean.robusta_anteil;
    const suggested = suggestGrind(method, roast, robusta);
    const current = bean.grinds ? bean.grinds[method] : undefined;

    hint.textContent = `Richtwert ${method}: ${GRIND_HINTS[method]}`;

    suggestionLine.classList.toggle("saved", current != null);
    if (current != null) {
      suggestionLine.innerHTML = `
        <div>
          <div class="suggestion-note">Gespeichert · Vorschlag war ${suggested}</div>
        </div>
        <div class="suggestion-value saved">${current}</div>
      `;
    } else {
      suggestionLine.innerHTML = `
        <div>
          <div class="suggestion-note">Vorschlag (Skala 1–30)</div>
        </div>
        <div class="suggestion-value">${suggested}</div>
      `;
    }
    grindInput.value = current != null ? current : suggested;
    resetBtn.disabled = current == null;
    resetBtn.style.opacity = current == null ? "0.5" : "1";
  }
  select.addEventListener("change", refreshForMethod);
  refreshForMethod();

  return section;
}

function renderSavedGrinds(bean) {
  const wrap = document.createElement("div");
  wrap.className = "saved-grinds";
  for (const m of BREW_METHODS) {
    const cell = document.createElement("div");
    const val = bean.grinds ? bean.grinds[m] : undefined;
    cell.className = "saved-grind-cell" + (val == null ? " empty" : "");
    cell.innerHTML = `
      <span class="m-label">${m}</span>
      <span class="m-value">${val != null ? val : "—"}</span>
    `;
    wrap.appendChild(cell);
  }
  return wrap;
}

function renderActions(bean) {
  const row = document.createElement("div");
  row.className = "bean-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "✏️ Bearbeiten";
  edit.addEventListener("click", () => openEditDialog(bean));
  row.appendChild(edit);

  const del = document.createElement("button");
  del.type = "button";
  del.className = "danger";
  del.textContent = "🗑️ Löschen";
  del.addEventListener("click", () => {
    if (confirm(`Bohne "${bean.name}" wirklich löschen?`)) {
      state.beans = state.beans.filter((b) => b.id !== bean.id);
      openBeans.delete(bean.id);
      saveData(state);
      toast("Gelöscht.");
      update();
    }
  });
  row.appendChild(del);

  return row;
}

// ---------- Edit dialog ----------

const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
let editingBeanId = null;

function openEditDialog(bean) {
  editingBeanId = bean.id;
  editForm.name.value = bean.name;
  editForm.herkunft.value = bean.herkunft || "";
  editForm.roestgrad.value = bean.roestgrad;
  editForm.robusta_anteil.value = bean.robusta_anteil;
  editForm.geschmacksnoten.value = bean.geschmacksnoten || "";
  editForm.notizen.value = bean.notizen || "";
  updateSliderValues(editDialog);
  editDialog.showModal();
}

document.getElementById("edit-cancel").addEventListener("click", () => {
  editDialog.close();
});

editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!editingBeanId) return;
  const bean = state.beans.find((b) => b.id === editingBeanId);
  if (!bean) return;
  bean.name = editForm.name.value.trim() || bean.name;
  bean.herkunft = editForm.herkunft.value.trim();
  bean.roestgrad = parseInt(editForm.roestgrad.value, 10);
  bean.robusta_anteil = parseInt(editForm.robusta_anteil.value, 10);
  bean.geschmacksnoten = editForm.geschmacksnoten.value.trim();
  bean.notizen = editForm.notizen.value.trim();
  saveData(state);
  toast("Gespeichert.");
  editDialog.close();
  editingBeanId = null;
  update();
});

// ---------- Add form ----------

const addForm = document.getElementById("add-form");
addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = addForm.name.value.trim();
  if (!name) {
    toast("Name ist erforderlich.");
    return;
  }
  const bean = {
    id: cryptoRandomId(),
    name,
    herkunft: addForm.herkunft.value.trim(),
    roestgrad: parseInt(addForm.roestgrad.value, 10),
    robusta_anteil: parseInt(addForm.robusta_anteil.value, 10),
    geschmacksnoten: addForm.geschmacksnoten.value.trim(),
    notizen: addForm.notizen.value.trim(),
    grinds: {},
  };
  state.beans.push(bean);
  saveData(state);
  toast(`"${name}" hinzugefügt.`);
  addForm.reset();
  updateSliderValues(document);
  switchTab("list");
  update();
});

function cryptoRandomId() {
  if (crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

// ---------- Tabs ----------

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  document.querySelectorAll(".tab-panel").forEach((p) => {
    p.classList.toggle("active", p.id === "tab-" + name);
  });
}

document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => switchTab(t.dataset.tab));
});

// ---------- Slider labels ----------

function updateSliderValues(root) {
  root.querySelectorAll('input[type="range"]').forEach((range) => {
    const label = root.querySelector(
      `.slider-value[data-for="${range.name}"]`
    );
    if (label) label.textContent = range.value;
    range.addEventListener("input", () => {
      if (label) label.textContent = range.value;
    });
  });
}
updateSliderValues(document);

// ---------- Import / Export / Reset ----------

document.getElementById("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `kaffeebohnen-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById("import-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.beans)) throw new Error("bad format");
      if (
        !confirm(
          `${parsed.beans.length} Bohnen importieren? Deine aktuellen Daten werden ersetzt.`
        )
      )
        return;
      state = parsed;
      saveData(state);
      toast("Importiert.");
      update();
    } catch {
      toast("Datei ungültig.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (confirm("Wirklich ALLE Bohnen und Mahlgrade löschen?")) {
    state = { beans: [] };
    openBeans.clear();
    saveData(state);
    toast("Alles gelöscht.");
    update();
  }
});

// ---------- Toast ----------

let toastEl = null;
let toastTimer = null;
function toast(msg) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// ---------- Search ----------

searchEl.addEventListener("input", renderBeans);

// ---------- Main update ----------

function update() {
  renderBeans();
}

update();
