const API_URL = "http://localhost:8000/api";

/* ---------- PAGINATION STATE ---------- */
let critPage = 1;
const critPageSize = 5;

let allPage = 1;
const allPageSize = 10;

function renderPager(el, { page, pageSize, total }, onChange) {
  if (!el) return;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  el.innerHTML = `
    <div class="text-muted">Showing ${start}-${end} of ${total}</div>
    <div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" ${page <= 1 ? "disabled" : ""} id="pgPrev">Prev</button>
      <span class="btn btn-sm btn-light disabled">Page ${page} / ${totalPages}</span>
      <button class="btn btn-sm btn-outline-secondary" ${page >= totalPages ? "disabled" : ""} id="pgNext">Next</button>
    </div>
  `;

  const prev = el.querySelector("#pgPrev");
  const next = el.querySelector("#pgNext");
  if (prev) prev.onclick = () => onChange(Math.max(1, page - 1));
  if (next) next.onclick = () => onChange(Math.min(totalPages, page + 1));
}

/* ---------- HELPERS ---------- */

// Classify severity based on alert text
function classifySeverity(text) {
  const t = text.toLowerCase();

  if (
    t.includes("heart failure") ||
    t.includes("hypertension detected") ||
    t.includes("elevated creatinine") ||
    t.includes("high ldl")
  ) return "critical";

  if (
    t.includes("obesity") ||
    t.includes("low hdl") ||
    t.includes("hypertension:") ||
    t.includes("diabetes") ||
    t.includes("bmi")
  ) return "warning";

  if (t.includes("copd") || t.includes("monitor") || t.includes("ensure"))
    return "info";

  if (t.includes("no critical alerts")) return "none";

  return "info";
}

// Bootstrap subtle badge styling
function badgeClass(severity) {
  switch (severity) {
    case "critical":
      return "badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle fw-semibold";
    case "warning":
      return "badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle fw-semibold";
    case "info":
      return "badge rounded-pill bg-info-subtle text-info border border-info-subtle fw-semibold";
    default:
      return "badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle";
  }
}

// Render ALL alerts as badges (no collapsing)
function renderAlertBadges(alerts) {
  if (!alerts || !alerts.length) {
    return `<span class="${badgeClass("none")}">No alerts</span>`;
  }
  return alerts
    .map(a => {
      const sev = classifySeverity(a);
      return `<span class="${badgeClass(sev)} me-1 mb-1">${a}</span>`;
    })
    .join(" ");
}

// Summary/Full navbar controls
function wireNavModeLinks(id) {
  const go = (mode) =>
    `patient.html?id=${encodeURIComponent(id)}&mode=${encodeURIComponent(mode)}`;

  const setLinkOrClick = (el, mode, labelText) => {
    if (!el) return;
    if (labelText) el.textContent = labelText;

    if (el.tagName === "A") {
      el.setAttribute("href", go(mode));
    } else {
      el.onclick = () => (window.location.href = go(mode));
    }
  };

  setLinkOrClick(document.getElementById("summaryNav"), "summary", "Summary");
  setLinkOrClick(document.getElementById("fullNav"), "all_details", "All Details");
}

/* ---------- DASHBOARD ---------- */

async function loadDashboard() {
  const [countRes, critCountRes] = await Promise.all([
    fetch(`${API_URL}/patients/count`),
    fetch(`${API_URL}/critical/count`)
  ]);
  const { total } = await countRes.json();
  const { critical_patient_count } = await critCountRes.json();
  const normalCount = total - critical_patient_count;

  // Pie chart
  const ctx = document.getElementById("patientsChart")?.getContext("2d");
  if (ctx) {
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Critical", "Normal"],
        datasets: [{
          data: [critical_patient_count, normalCount],
          backgroundColor: ["#dc3545", "#198754"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  await loadCriticalPatientsPage(critPage);
}

async function loadCriticalPatientsPage(page) {
  critPage = page;
  const tableBody = document.querySelector("#criticalPatientsTable tbody");
  const pagerEl = document.getElementById("critPager");
  if (!tableBody || !pagerEl) return;

  const res = await fetch(`${API_URL}/critical/patients?page=${critPage}&page_size=${critPageSize}`);
  const data = await res.json(); // { items, total, page, page_size }

  tableBody.innerHTML = "";
  data.items.forEach(cp => {
    const alertsBlock = renderAlertBadges(cp.alerts);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cp.patient.mrn}</td>
      <td>${cp.patient.first_name} ${cp.patient.last_name}</td>
      <td>${cp.patient.age}</td>
      <td>${cp.patient.gender}</td>
      <td style="max-width:380px; white-space:normal;">
        <div class="d-flex flex-wrap gap-1">${alertsBlock}</div>
      </td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-primary me-2" onclick="viewPatient(${cp.patient.patient_id})">All Details</button>
        <button class="btn btn-sm btn-success" onclick="viewPatientSummary(${cp.patient.patient_id})">Summary</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  renderPager(pagerEl, { page: data.page, pageSize: data.page_size, total: data.total }, (newPage) => {
    loadCriticalPatientsPage(newPage);
  });
}

/* ---------- ALL PATIENTS LIST ---------- */

async function showAllPatients() {
  document.body.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container-fluid">
        <a class="navbar-brand" href="index.html">Triage Dashboard</a>
        <div class="d-flex">
          <a href="index.html" class="btn btn-light btn-sm">← Back</a>
        </div>
      </div>
    </nav>

    <div class="container mt-4">
      <div class="d-flex justify-content-between align-items-center">
        <h3 class="mb-0">All Patients</h3>
        <div id="allPatientsPager"></div>
      </div>

      <table class="table table-striped table-hover mt-3">
        <thead class="table-dark">
          <tr>
            <th>MRN</th>
            <th>Name</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody id="allPatientsTableBody"></tbody>
      </table>

      <div id="allPatientsPagerBottom" class="d-flex justify-content-between align-items-center"></div>
    </div>

    <footer class="bg-light text-center py-3 mt-4">
      <p class="mb-0">&copy; 2025 AI-Powered Triage System</p>
    </footer>
  `;

  await loadAllPatientsPage(allPage);
}

async function loadAllPatientsPage(page) {
  allPage = page;
  const body = document.getElementById("allPatientsTableBody");
  const pagerTop = document.getElementById("allPatientsPager");
  const pagerBottom = document.getElementById("allPatientsPagerBottom");

  const res = await fetch(`${API_URL}/patients?page=${allPage}&page_size=${allPageSize}`);
  const data = await res.json(); // { items, total, page, page_size }

  body.innerHTML = data.items.map(p => `
    <tr>
      <td>${p.mrn}</td>
      <td>${p.first_name} ${p.last_name}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-success me-2" onclick="viewPatientSummary(${p.patient_id})">Summary</button>
        <button class="btn btn-sm btn-primary" onclick="viewPatient(${p.patient_id})">All Details</button>
      </td>
    </tr>
  `).join("");

  const meta = { page: data.page, pageSize: data.page_size, total: data.total };
  const onChange = (newPage) => loadAllPatientsPage(newPage);
  renderPager(pagerTop, meta, onChange);
  renderPager(pagerBottom, meta, onChange);
}

/* ---------- NAV HELPERS ---------- */

function viewPatient(patientId) {
  window.location.href = `patient.html?id=${patientId}&mode=all_details`;
}
function viewPatientSummary(patientId) {
  window.location.href = `patient.html?id=${patientId}&mode=summary`;
}

/* ---------- PATIENT PAGE ---------- */

async function loadPatientDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const mode = params.get("mode") || "summary"; // default = summary
  if (!id) return;

  // make the navbar Summary/Full work (anchors OR buttons)
  wireNavModeLinks(id);

  // Patient header
  const res = await fetch(`${API_URL}/patient/${id}`);
  const patient = await res.json();
  if (document.getElementById("patientName")) {
    document.getElementById("patientName").innerText =
      `${patient.first_name} ${patient.last_name} (MRN: ${patient.mrn})`;
  }
  if (document.getElementById("patientDetails")) {
    document.getElementById("patientDetails").innerHTML = `
      <div class="row row-cols-2 row-cols-md-4 g-2">
        <div class="col"><div><strong>Age:</strong><br>${patient.age}</div></div>
        <div class="col"><div><strong>Gender:</strong><br>${patient.gender}</div></div>
        <div class="col"><div><strong>Race:</strong><br>${patient.race}</div></div>
        <div class="col d-none d-md-block"><div class="text-muted"><strong>MRN:</strong><br>${patient.mrn}</div></div>
      </div>
    `;
  }

  if (mode === "summary") {
    await loadPatientSummary(id);
  } else {
    const pipeRes = await fetch(`${API_URL}/pipeline/${id}`);
    const data = await pipeRes.json();
    document.getElementById("pipelineOutput").innerHTML = `
      <div class="card p-3">
        <h5 class="mb-3">Pipeline Output</h5>
        <pre class="mb-3" style="white-space: pre-wrap;">${JSON.stringify(data.bundle, null, 2)}</pre>
        <h6 class="mb-2">Alerts</h6>
        <pre class="mb-0" style="white-space: pre-wrap;">${JSON.stringify(data.cds, null, 2)}</pre>
      </div>
    `;
  }
}

// Patient summary view
async function loadPatientSummary(patientId) {
  const res = await fetch(`${API_URL}/pipeline/simple/${patientId}`);
  const data = await res.json();

  const conditions = (data.conditions && data.conditions.length) ? data.conditions : ["None documented"];
  const meds = (data.medications && data.medications.length) ? data.medications : [];
  const vitals = data.vitals || {};
  const alerts = data.alerts || [];

  const alertsBlock = renderAlertBadges(alerts);

  document.getElementById("pipelineOutput").innerHTML = `
    <div class="card p-3 mb-3">
      <h5 class="mb-3">Summary View</h5>

      <!-- Patient Header with Alerts -->
      <div class="card p-3 mb-2">
        <h6 class="mb-1">${data.patient.name}</h6>
        <div><strong>DOB:</strong> ${data.patient.dob || "-"}</div>
        <div><strong>Gender:</strong> ${data.patient.gender || "-"}</div>
        <div class="mt-2 d-flex flex-wrap gap-1">
          <strong class="me-2">Alerts:</strong> ${alertsBlock}
        </div>
      </div>

      <div class="row row-cols-1 row-cols-lg-3 g-3">
        <!-- Conditions -->
        <div class="col">
          <div class="card h-100">
            <div class="card-body">
              <h6>Conditions</h6>
              <ul class="mb-0">
                ${conditions.map(c => `<li>${c}</li>`).join("")}
              </ul>
            </div>
          </div>
        </div>

        <!-- Medications -->
        <div class="col">
          <div class="card h-100">
            <div class="card-body">
              <h6>Medications</h6>
              ${
                meds.length
                  ? `<ul class="mb-0">
                      ${meds.map(m => `<li><strong>${m.medication}</strong> &ndash; ${m.instructions}</li>`).join("")}
                     </ul>`
                  : `<div class="text-muted">None documented</div>`
              }
            </div>
          </div>
        </div>

        <!-- Vitals -->
        <div class="col">
          <div class="card h-100">
            <div class="card-body">
              <h6>Vitals</h6>
              <ul class="mb-0">
                ${vitals.blood_pressure ? `<li><strong>Blood Pressure:</strong> ${vitals.blood_pressure}</li>` : ``}
                ${vitals.bmi ? `<li><strong>BMI:</strong> ${vitals.bmi}</li>` : ``}
                ${(!vitals.blood_pressure && !vitals.bmi) ? `<li class="text-muted">No vitals found</li>` : ``}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------- AUTO LOAD ---------- */

if (document.getElementById("patientsChart")) loadDashboard();
if (document.getElementById("patientDetails")) loadPatientDetails();
