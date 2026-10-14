const STORAGE_KEY = "driver-expenses-all-years-v2";
const LEGACY_KEYS = [
  "uber-earnings-tracker-all-years-purple-v1",
  "rideshare-tracker-may-2026-v1"
];

const views = {
  daily: document.querySelector("#dailyView"),
  costs: document.querySelector("#costsView"),
  weekly: document.querySelector("#weeklyView"),
  monthly: document.querySelector("#monthlyView"),
  saved: document.querySelector("#savedView")
};

const titles = {
  daily: "Daily Data",
  costs: "Monthly Costs",
  weekly: "Weekly Data",
  monthly: "Monthly Data",
  saved: "Saved Days"
};

const fields = {
  screenTitle: document.querySelector("#screenTitle"),
  activeYear: document.querySelector("#activeYear"),
  prevYearBtn: document.querySelector("#prevYearBtn"),
  nextYearBtn: document.querySelector("#nextYearBtn"),
  entryForm: document.querySelector("#entryForm"),
  costForm: document.querySelector("#costForm"),
  costsList: document.querySelector("#costsList"),
  weeklyList: document.querySelector("#weeklyList"),
  monthlyList: document.querySelector("#monthlyList"),
  savedList: document.querySelector("#savedList"),
  dailyProfitHero: document.querySelector("#dailyProfitHero"),
  dailyNetHero: document.querySelector("#dailyNetHero"),
  dailyExpenseHero: document.querySelector("#dailyExpenseHero"),
  dailyPerKmHero: document.querySelector("#dailyPerKmHero"),
  logSummaryDate: document.querySelector("#logSummaryDate"),
  summaryRevenue: document.querySelector("#summaryRevenue"),
  summaryNet: document.querySelector("#summaryNet"),
  summaryKept: document.querySelector("#summaryKept"),
  keptBar: document.querySelector("#keptBar"),
  summaryFuel: document.querySelector("#summaryFuel"),
  summaryMaintenance: document.querySelector("#summaryMaintenance"),
  summaryOther: document.querySelector("#summaryOther"),
  summaryProfit: document.querySelector("#summaryProfit"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  importJsonInput: document.querySelector("#importJsonInput")
};

let state = loadState();
let currentView = "daily";
let activeYear = Number(new Date().getFullYear());

function loadState() {
  const current = parseStored(localStorage.getItem(STORAGE_KEY));
  if (current) return current;

  for (const key of LEGACY_KEYS) {
    const legacy = parseStored(localStorage.getItem(key));
    if (legacy && (legacy.entries.length || legacy.monthlyCosts.length)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      return legacy;
    }
  }

  return { entries: [], monthlyCosts: [] };
}

function parseStored(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries.map(normalizeEntry) : [],
      monthlyCosts: Array.isArray(parsed.monthlyCosts) ? parsed.monthlyCosts.map(normalizeCost) : []
    };
  } catch {
    return null;
  }
}

function saveState() {
  state.entries = state.entries.map(normalizeEntry);
  state.monthlyCosts = state.monthlyCosts.map(normalizeCost);
  state.entries.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  state.monthlyCosts.sort((a, b) => b.month.localeCompare(a.month));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safeNumber(value));
}

function loss(value) {
  return value > 0 ? `-${money(value)}` : money(0);
}

function oneDecimal(value) {
  return safeNumber(value).toFixed(1).replace(/\.0$/, "");
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function value(form, name) {
  return safeNumber(new FormData(form).get(name));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return todayIso().slice(0, 7);
}

function dateLabel(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(month) {
  const [year, monthIndex] = String(month).split("-");
  return new Date(Number(year), Number(monthIndex) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function entryMath(entry) {
  const totalFares = entry.uberFares + entry.lyftFares + entry.amazonFares;
  const fuelLitres = entry.km * (entry.mileage / 100);
  const fuelCost = fuelLitres * entry.fuelRate;
  const dailyCosts = fuelCost + entry.maintenance + entry.otherCost;
  const netEarnings = totalFares;
  const profit = netEarnings - dailyCosts;

  return {
    totalFares,
    fuelLitres,
    fuelCost,
    dailyCosts,
    netEarnings,
    profit,
    keptPercent: totalFares > 0 ? (netEarnings / totalFares) * 100 : 0,
    faresKm: entry.km > 0 ? totalFares / entry.km : 0,
    profitKm: entry.km > 0 ? profit / entry.km : 0,
    profitHour: entry.hours > 0 ? profit / entry.hours : 0
  };
}

function costMath(cost) {
  return cost.insurance + cost.maintenance + cost.carPayment + cost.phone + cost.other;
}

function summarize(entries) {
  const base = {
    days: new Set(entries.map((entry) => entry.date)).size,
    trips: 0,
    hours: 0,
    km: 0,
    uberFares: 0,
    lyftFares: 0,
    amazonFares: 0,
    totalFares: 0,
    fuelCost: 0,
    maintenance: 0,
    otherCost: 0,
    netEarnings: 0,
    profit: 0
  };

  entries.forEach((entry) => {
    const calc = entryMath(entry);
    base.trips += entry.trips;
    base.hours += entry.hours;
    base.km += entry.km;
    base.uberFares += entry.uberFares;
    base.lyftFares += entry.lyftFares;
    base.amazonFares += entry.amazonFares;
    base.totalFares += calc.totalFares;
    base.fuelCost += calc.fuelCost;
    base.maintenance += entry.maintenance;
    base.otherCost += entry.otherCost;
    base.netEarnings += calc.netEarnings;
    base.profit += calc.profit;
  });

  return {
    ...base,
    expenses: base.fuelCost + base.maintenance + base.otherCost,
    profitKm: base.km > 0 ? base.profit / base.km : 0,
    faresKm: base.km > 0 ? base.totalFares / base.km : 0,
    profitHour: base.hours > 0 ? base.profit / base.hours : 0
  };
}

function startOfWeek(date) {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function endOfWeek(monday) {
  const d = new Date(`${monday}T00:00:00`);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function groupBy(entries, keyGetter) {
  const groups = new Map();
  entries.forEach((entry) => {
    const key = keyGetter(entry);
    groups.set(key, [...(groups.get(key) || []), entry]);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupEntries]) => ({ key, entries: groupEntries, summary: summarize(groupEntries) }));
}

function yearEntries() {
  return state.entries.filter((entry) => entry.date.slice(0, 4) === String(activeYear));
}

function yearCosts() {
  return state.monthlyCosts.filter((cost) => cost.month.slice(0, 4) === String(activeYear));
}

function renderDaily() {
  const entry = formEntry();
  const calc = entryMath(entry);

  fields.dailyProfitHero.textContent = money(calc.profit);
  fields.dailyNetHero.textContent = money(calc.netEarnings);
  fields.dailyExpenseHero.textContent = loss(calc.dailyCosts);
  fields.dailyPerKmHero.textContent = money(calc.profitKm);
  fields.logSummaryDate.textContent = dateLabel(entry.date || todayIso());
  fields.summaryRevenue.textContent = money(calc.totalFares);
  fields.summaryNet.textContent = money(calc.netEarnings);
  fields.summaryKept.textContent = `${Math.round(calc.keptPercent)}%`;
  fields.keptBar.style.width = `${Math.max(0, Math.min(100, calc.keptPercent))}%`;
  fields.summaryFuel.textContent = loss(calc.fuelCost);
  fields.summaryMaintenance.textContent = loss(entry.maintenance);
  fields.summaryOther.textContent = loss(entry.otherCost);
  fields.summaryProfit.textContent = money(calc.profit);
}

function renderCosts() {
  const costs = yearCosts();
  fields.costsList.innerHTML = costs.length
    ? costs.map(costCard).join("")
    : '<section class="mini-card muted-card">No monthly costs saved for this year.</section>';
}

function renderWeekly() {
  const weeks = groupBy(yearEntries(), (entry) => startOfWeek(entry.date));
  fields.weeklyList.innerHTML = weeks.length
    ? weeks.map((week) => {
        const title = `${dateLabel(week.key)} - ${dateLabel(endOfWeek(week.key))}`;
        return reportCard(title, week.summary, `${week.summary.days} saved days`);
      }).join("")
    : '<section class="mini-card muted-card">No weekly data saved for this year.</section>';
}

function renderMonthly() {
  const months = groupBy(yearEntries(), (entry) => entry.date.slice(0, 7));
  const costsByMonth = new Map(yearCosts().map((cost) => [cost.month, costMath(cost)]));
  fields.monthlyList.innerHTML = months.length
    ? months.map((month) => {
        const monthlyCost = costsByMonth.get(month.key) || 0;
        return reportCard(monthLabel(month.key), month.summary, `${month.summary.days} saved days`, monthlyCost);
      }).join("")
    : '<section class="mini-card muted-card">No monthly data saved for this year.</section>';
}

function renderSaved() {
  const entries = yearEntries();
  fields.savedList.innerHTML = entries.length
    ? entries.map(entryCard).join("")
    : '<section class="mini-card muted-card">No saved days for this year.</section>';
}

function reportCard(title, summary, subtitle, monthlyCost = 0) {
  const profitAfterMonthly = summary.profit - monthlyCost;
  return `
    <article class="entry-card report-row">
      <div class="entry-card-head">
        <div>
          <h3>${title}</h3>
          <p>${subtitle}</p>
        </div>
        <strong>${money(profitAfterMonthly)}</strong>
      </div>
      <div class="entry-metrics">
        <div><span>Total km</span><b>${oneDecimal(summary.km)}</b></div>
        <div><span>Uber fares</span><b>${money(summary.uberFares)}</b></div>
        <div><span>Lyft fares</span><b>${money(summary.lyftFares)}</b></div>
        <div><span>Amazon Flex</span><b>${money(summary.amazonFares)}</b></div>
        <div><span>Total fares</span><b>${money(summary.totalFares)}</b></div>
        <div><span>Fuel</span><b>${loss(summary.fuelCost)}</b></div>
        <div><span>Daily costs</span><b>${loss(summary.maintenance + summary.insurance + summary.otherCost)}</b></div>
        <div><span>Profit / km</span><b>${money(summary.profitKm)}</b></div>
        ${monthlyCost ? `<div><span>Monthly costs</span><b>${loss(monthlyCost)}</b></div>` : ""}
      </div>
    </article>
  `;
}

function entryCard(entry) {
  const calc = entryMath(entry);
  return `
    <article class="entry-card">
      <div class="entry-card-head">
        <div>
          <h3>${dateLabel(entry.date)}</h3>
          <p>${entry.trips || 0} trips • ${oneDecimal(entry.km)} km</p>
        </div>
        <div>
          <strong>${money(calc.profit)}</strong>
          <button class="delete-entry" type="button" data-id="${entry.id}">Delete</button>
        </div>
      </div>
      <div class="entry-metrics">
        <div><span>Uber fares</span><b>${money(entry.uberFares)}</b></div>
        <div><span>Lyft fares</span><b>${money(entry.lyftFares)}</b></div>
        <div><span>Amazon Flex</span><b>${money(entry.amazonFares)}</b></div>
        <div><span>Fuel cost</span><b>${loss(calc.fuelCost)}</b></div>
      </div>
      ${entry.description ? `<p>${escapeHtml(entry.description)}</p>` : ""}
    </article>
  `;
}

function costCard(cost) {
  return `
    <article class="entry-card">
      <div class="entry-card-head">
        <div>
          <h3>${monthLabel(cost.month)}</h3>
          <p>${cost.note ? escapeHtml(cost.note) : "Monthly fixed costs"}</p>
        </div>
        <div>
          <strong>${loss(costMath(cost))}</strong>
          <button class="delete-cost" type="button" data-id="${cost.id}">Delete</button>
        </div>
      </div>
      <div class="entry-metrics">
        <div><span>Insurance</span><b>${money(cost.insurance)}</b></div>
        <div><span>Maintenance</span><b>${money(cost.maintenance)}</b></div>
        <div><span>Car payment</span><b>${money(cost.carPayment)}</b></div>
        <div><span>Phone / data</span><b>${money(cost.phone)}</b></div>
        <div><span>Other</span><b>${money(cost.other)}</b></div>
      </div>
    </article>
  `;
}

function render() {
  fields.activeYear.textContent = activeYear;
  renderDaily();
  renderCosts();
  renderWeekly();
  renderMonthly();
  renderSaved();
}

function setView(view) {
  currentView = view;
  document.body.dataset.view = view;
  fields.screenTitle.textContent = titles[view];
  Object.entries(views).forEach(([key, node]) => node.classList.toggle("active", key === view));
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function formEntry() {
  return normalizeEntry({
    date: fields.entryForm.elements.date.value || todayIso(),
    km: value(fields.entryForm, "km"),
    trips: value(fields.entryForm, "trips"),
    hours: value(fields.entryForm, "hours"),
    uberFares: value(fields.entryForm, "uberFares"),
    lyftFares: value(fields.entryForm, "lyftFares"),
    amazonFares: value(fields.entryForm, "amazonFares"),
    fuelRate: value(fields.entryForm, "fuelRate"),
    mileage: value(fields.entryForm, "mileage"),
    maintenance: value(fields.entryForm, "maintenance"),
    otherCost: value(fields.entryForm, "otherCost"),
    description: new FormData(fields.entryForm).get("description")
  });
}

function normalizeEntry(entry) {
  const date = String(entry.date || todayIso());
  const createdAt = String(entry.createdAt || new Date().toISOString());
  const legacyRevenue = safeNumber(entry.revenue);
  const legacyOther = safeNumber(entry.otherCost);
  return {
    id: String(entry.id || `${date}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`),
    createdAt,
    date,
    km: safeNumber(entry.km),
    trips: safeNumber(entry.trips),
    hours: safeNumber(entry.hours),
    uberFares: safeNumber(entry.uberFares ?? legacyRevenue),
    lyftFares: safeNumber(entry.lyftFares),
    amazonFares: safeNumber(entry.amazonFares),
    fuelRate: safeNumber(entry.fuelRate),
    mileage: safeNumber(entry.mileage),
    maintenance: safeNumber(entry.maintenance),
    otherCost: legacyOther,
    description: String(entry.description || "")
  };
}

function normalizeCost(cost) {
  const month = String(cost.month || currentMonth());
  return {
    id: String(cost.id || `${month}-${Math.random().toString(36).slice(2, 8)}`),
    month,
    insurance: safeNumber(cost.insurance),
    maintenance: safeNumber(cost.maintenance),
    carPayment: safeNumber(cost.carPayment),
    phone: safeNumber(cost.phone),
    other: safeNumber(cost.other),
    note: String(cost.note || "")
  };
}

function download(name, type, text) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  download(`driver-expenses-backup-${todayIso()}.json`, "application/json", JSON.stringify(state, null, 2));
}

function exportCsv() {
  const headers = [
    "date",
    "totalKm",
    "trips",
    "hours",
    "uberFares",
    "lyftFares",
    "amazonFlexFares",
    "totalFares",
    "fuelCost",
    "maintenance",
    "other",
    "profit"
  ];
  const rows = state.entries.map((entry) => {
    const calc = entryMath(entry);
    return [
      entry.date,
      entry.km,
      entry.trips,
      entry.hours,
      entry.uberFares,
      entry.lyftFares,
      entry.amazonFares,
      calc.totalFares.toFixed(2),
      calc.fuelCost.toFixed(2),
      entry.maintenance,
      entry.otherCost,
      calc.profit.toFixed(2)
    ].map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",");
  });
  download(`driver-expenses-${todayIso()}.csv`, "text/csv", [headers.join(","), ...rows].join("\n"));
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const importedEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const importedCosts = Array.isArray(parsed.monthlyCosts) ? parsed.monthlyCosts : [];
      const entries = new Map(state.entries.map((entry) => [entry.id, normalizeEntry(entry)]));
      const costs = new Map(state.monthlyCosts.map((cost) => [cost.id, normalizeCost(cost)]));
      importedEntries.forEach((entry) => entries.set(normalizeEntry(entry).id, normalizeEntry(entry)));
      importedCosts.forEach((cost) => costs.set(normalizeCost(cost).id, normalizeCost(cost)));
      state.entries = [...entries.values()];
      state.monthlyCosts = [...costs.values()];
      saveState();
      render();
      setView("saved");
    } catch {
      alert("Could not import that JSON backup.");
    }
  };
  reader.readAsText(file);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

fields.prevYearBtn.addEventListener("click", () => {
  activeYear -= 1;
  render();
});

fields.nextYearBtn.addEventListener("click", () => {
  activeYear += 1;
  render();
});

fields.entryForm.addEventListener("input", renderDaily);

fields.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = {
    ...formEntry(),
    id: crypto.randomUUID ? crypto.randomUUID() : undefined,
    createdAt: new Date().toISOString()
  };
  state.entries.push(normalizeEntry(entry));
  activeYear = Number(entry.date.slice(0, 4));
  saveState();
  render();
  setView("saved");
});

fields.costForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(fields.costForm);
  const cost = normalizeCost({
    id: crypto.randomUUID ? crypto.randomUUID() : undefined,
    month: formData.get("month"),
    insurance: formData.get("insurance"),
    maintenance: formData.get("maintenance"),
    carPayment: formData.get("carPayment"),
    phone: formData.get("phone"),
    other: formData.get("other"),
    note: formData.get("note")
  });
  state.monthlyCosts = state.monthlyCosts.filter((item) => item.month !== cost.month);
  state.monthlyCosts.push(cost);
  activeYear = Number(cost.month.slice(0, 4));
  saveState();
  render();
});

document.addEventListener("click", (event) => {
  const deleteEntry = event.target.closest(".delete-entry");
  const deleteCost = event.target.closest(".delete-cost");
  if (deleteEntry) {
    state.entries = state.entries.filter((entry) => entry.id !== deleteEntry.dataset.id);
    saveState();
    render();
  }
  if (deleteCost) {
    state.monthlyCosts = state.monthlyCosts.filter((cost) => cost.id !== deleteCost.dataset.id);
    saveState();
    render();
  }
});

fields.exportJsonBtn.addEventListener("click", exportJson);
fields.exportCsvBtn.addEventListener("click", exportCsv);
fields.importJsonInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importJson(file);
});

fields.entryForm.elements.date.value = todayIso();
fields.entryForm.elements.fuelRate.value = "1.85";
fields.entryForm.elements.mileage.value = "9";
fields.costForm.elements.month.value = currentMonth();
saveState();
render();
