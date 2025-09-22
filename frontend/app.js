const API_URL = "http://localhost:8000/api";

// Dashboard: load pie chart + critical patients table
async function loadDashboard() {
  const countRes = await fetch(`${API_URL}/critical/count`);
  const { critical_patient_count } = await countRes.json();

  const patientsRes = await fetch(`${API_URL}/patients`);
  const patients = await patientsRes.json();
  const normalCount = patients.length - critical_patient_count;

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

  // Critical patients table
  const tableBody = document.querySelector("#criticalPatientsTable tbody");
  if (tableBody) {
    const critRes = await fetch(`${API_URL}/critical/patients`);
    const { critical_patients } = await critRes.json();

    tableBody.innerHTML = "";
    critical_patients.forEach(cp => {
      // Turn alerts into pill-style badges
      const alertsList = cp.alerts.map(a =>
        `<span class="badge bg-danger me-1 mb-1">${a}</span>`
      ).join(" ");

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${cp.patient.mrn}</td>
        <td>${cp.patient.first_name} ${cp.patient.last_name}</td>
        <td>${cp.patient.age}</td>
        <td>${cp.patient.gender}</td>
        <td style="max-width:300px; white-space:normal;">
          <div class="d-flex flex-wrap">${alertsList}</div>
        </td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-primary me-2" onclick="viewPatient(${cp.patient.patient_id})">Full</button>
          <button class="btn btn-sm btn-success" onclick="viewPatientSummary(${cp.patient.patient_id})">Summary</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }
}

// All patients list (with proper table and footer)
async function showAllPatients() {
  const res = await fetch(`${API_URL}/patients`);
  const patients = await res.json();

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
      <h3>All Patients</h3>
      <table class="table table-striped table-hover">
        <thead class="table-dark">
          <tr>
            <th>MRN</th>
            <th>Name</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${patients.map(p => `
            <tr>
              <td>${p.mrn}</td>
              <td>${p.first_name} ${p.last_name}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-success me-2" onclick="viewPatientSummary(${p.patient_id})">Summary</button>
                <button class="btn btn-sm btn-primary" onclick="viewPatient(${p.patient_id})">Full</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <footer class="bg-light text-center py-3 mt-4">
      <p class="mb-0">&copy; 2025 AI-Powered Triage System</p>
    </footer>
  `;
}

// Navigation helpers
function viewPatient(patientId) {
  window.location.href = `patient.html?id=${patientId}&mode=full`;
}
function viewPatientSummary(patientId) {
  window.location.href = `patient.html?id=${patientId}&mode=summary`;
}

// Patient page loader
async function loadPatientDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const mode = params.get("mode") || "summary"; // default = summary
  if (!id) return;

  // Set navbar toggles
  const summaryLink = document.getElementById("summaryNav");
  const fullLink = document.getElementById("fullNav");
  if (summaryLink) summaryLink.setAttribute("href", `patient.html?id=${id}&mode=summary`);
  if (fullLink) fullLink.setAttribute("href", `patient.html?id=${id}&mode=full`);

  // Patient header info
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

// Nurse-friendly summary view
async function loadPatientSummary(patientId) {
  const res = await fetch(`${API_URL}/pipeline/simple/${patientId}`);
  const data = await res.json();

  const conditions = (data.conditions && data.conditions.length) ? data.conditions : ["None documented"];
  const meds = (data.medications && data.medications.length) ? data.medications : [];
  const vitals = data.vitals || {};
  const alerts = data.alerts || [];

  document.getElementById("pipelineOutput").innerHTML = `
    <div class="card p-3 mb-3">
      <h5 class="mb-3">Summary View <span class="badge rounded-pill text-bg-danger ms-2">${alerts.filter(a => a !== "No critical alerts").length}</span></h5>
      <div class="card p-3 mb-2">
        <h6 class="mb-1">${data.patient.name}</h6>
        <div><strong>DOB:</strong> ${data.patient.dob || "-"}</div>
        <div><strong>Gender:</strong> ${data.patient.gender || "-"}</div>
      </div>

      <div class="row row-cols-1 row-cols-lg-3 g-3">
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

        <div class="col">
          <div class="card h-100">
            <div class="card-body">
              <h6>Medications</h6>
              ${
                meds.length
                ? `<ul class="mb-0">${meds.map(m => `<li><strong>${m.medication}</strong> – ${m.instructions}</li>`).join("")}</ul>`
                : `<div class="text-muted">None documented</div>`
              }
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card h-100">
            <div class="card-body">
              <h6>Vitals</h6>
              <ul class="mb-0">
                ${vitals.blood_pressure ? `<li><strong>Blood Pressure:</strong> ${vitals.blood_pressure}</li>` : ""}
                ${vitals.bmi ? `<li><strong>BMI:</strong> ${vitals.bmi}</li>` : ""}
                ${(!vitals.blood_pressure && !vitals.bmi) ? `<li class="text-muted">No vitals found</li>` : ""}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-body">
          <h6 class="mb-2">Alerts</h6>
          <ul class="mb-0">
            ${
              alerts.length
                ? alerts.map(a => `<li class="${a === "No critical alerts" ? "text-muted" : "text-danger"}">${a}</li>`).join("")
                : `<li class="text-muted">No alerts</li>`
            }
          </ul>
        </div>
      </div>
    </div>
  `;
}

// Auto-loaders
if (document.getElementById("patientsChart")) loadDashboard();
if (document.getElementById("patientDetails")) loadPatientDetails();
