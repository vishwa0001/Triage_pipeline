const API_URL = "http://localhost:8000/api";

// Draw pie chart
async function loadDashboard() {
  const countRes = await fetch(`${API_URL}/critical/count`);
  const { critical_patient_count } = await countRes.json();

  const patientsRes = await fetch(`${API_URL}/patients`);
  const patients = await patientsRes.json();
  const normalCount = patients.length - critical_patient_count;

  // Pie chart
  const ctx = document.getElementById("patientsChart").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Critical", "Normal"],
      datasets: [{
        data: [critical_patient_count, normalCount],
        backgroundColor: ["#dc3545", "#198754"]
      }]
    }
  });

  // Critical patients table
  const tableBody = document.querySelector("#criticalPatientsTable tbody");
  const critRes = await fetch(`${API_URL}/critical/patients`);
  const { critical_patients } = await critRes.json();

  tableBody.innerHTML = "";
  critical_patients.forEach(cp => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cp.patient.mrn}</td>
      <td>${cp.patient.first_name} ${cp.patient.last_name}</td>
      <td>${cp.patient.age}</td>
      <td>${cp.patient.gender}</td>
      <td>${cp.alerts.join(", ")}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewPatient(${cp.patient.patient_id})">View</button>
        <button class="btn btn-sm btn-success" onclick="viewPatientSummary(${cp.patient.patient_id})">Summary</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function loadPatientSummary(patientId) {
  const res = await fetch(`${API_URL}/pipeline/simple/${patientId}`);
  const data = await res.json();

  document.getElementById("pipelineOutput").innerHTML = `
    <h4>Summary View</h4>
    <div class="card p-3 mb-3">
      <h5>${data.patient.name}</h5>
      <p><strong>DOB:</strong> ${data.patient.dob}</p>
      <p><strong>Gender:</strong> ${data.patient.gender}</p>
    </div>
    <div class="card p-3 mb-3">
      <h6>Conditions</h6>
      <ul>${data.conditions.map(c => `<li>${c}</li>`).join("")}</ul>
    </div>
    <div class="card p-3 mb-3">
      <h6>Medications</h6>
      <ul>${data.medications.map(m => `<li><strong>${m.medication}</strong> – ${m.instructions}</li>`).join("")}</ul>
    </div>
    <div class="card p-3 mb-3">
      <h6>Vitals</h6>
      <ul>
        ${Object.entries(data.vitals).map(([k,v]) => `<li><strong>${k}:</strong> ${v}</li>`).join("")}
      </ul>
    </div>
    <div class="card p-3">
      <h6>Alerts</h6>
      <ul>${data.alerts.map(a => `<li class="text-danger">${a}</li>`).join("")}</ul>
    </div>
  `;
}

// Show all patients in a proper table with header/footer
async function showAllPatients() {
  const res = await fetch(`${API_URL}/patients`);
  const patients = await res.json();

  document.body.innerHTML = `
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container-fluid">
        <a class="navbar-brand" href="index.html">Triage Dashboard</a>
        <div class="d-flex">
          <a href="index.html" class="btn btn-light">← Back</a>
        </div>
      </div>
    </nav>

    <!-- Main Container -->
    <div class="container mt-4">
      <h3>All Patients</h3>
      <table class="table table-striped table-hover">
        <thead class="table-dark">
          <tr>
            <th>MRN</th>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${patients.map(p => `
            <tr>
              <td>${p.mrn}</td>
              <td>${p.first_name} ${p.last_name}</td>
              <td>
                <button class="btn btn-sm btn-success me-2" onclick="viewPatientSummary(${p.patient_id})">Summary</button>
                <button class="btn btn-sm btn-primary" onclick="viewPatient(${p.patient_id})">Full</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <footer class="bg-light text-center py-3 mt-4">
      <p class="mb-0">&copy; 2025 AI-Powered Triage System</p>
    </footer>
  `;
}


// Redirect helpers
function viewPatient(patientId) {
  window.location.href = `patient.html?id=${patientId}&mode=full`;
}

function viewPatientSummary(patientId) {
  window.location.href = `patient.html?id=${patientId}&mode=summary`;
}

// On patient details page
async function loadPatientDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const mode = params.get("mode") || "full"; // default = full

  if (!id) return;

  const res = await fetch(`${API_URL}/patient/${id}`);
  const patient = await res.json();

  document.getElementById("patientName").innerText = `${patient.first_name} ${patient.last_name} (MRN: ${patient.mrn})`;

  document.getElementById("patientDetails").innerHTML = `
    <strong>Age:</strong> ${patient.age} <br/>
    <strong>Gender:</strong> ${patient.gender} <br/>
    <strong>Race:</strong> ${patient.race} <br/>
  `;

  if (mode === "summary") {
    await loadPatientSummary(id);
  } else {
    const pipeRes = await fetch(`${API_URL}/pipeline/${id}`);
    const data = await pipeRes.json();

    document.getElementById("pipelineOutput").innerHTML = `
      <h4>Pipeline Output</h4>
      <pre>${JSON.stringify(data.bundle, null, 2)}</pre>
      <h5>Alerts</h5>
      <pre>${JSON.stringify(data.cds, null, 2)}</pre>
    `;
  }
}

// Auto-load
if (document.getElementById("patientsChart")) loadDashboard();
if (document.getElementById("patientDetails")) loadPatientDetails();
