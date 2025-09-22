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
      <td><button class="btn btn-sm btn-primary" onclick="viewPatient(${cp.patient.patient_id})">View</button></td>
    `;
    tableBody.appendChild(row);
  });
}

// Show all patients in a modal-like list
async function showAllPatients() {
  const res = await fetch(`${API_URL}/patients`);
  const patients = await res.json();

  let html = "<h4>All Patients</h4><ul class='list-group'>";
  patients.forEach(p => {
    html += `<li class="list-group-item d-flex justify-content-between align-items-center">
      ${p.mrn} - ${p.first_name} ${p.last_name}
      <button class="btn btn-sm btn-success" onclick="runPipeline(${p.patient_id})">Run Pipeline</button>
    </li>`;
  });
  html += "</ul>";

  document.body.innerHTML = html;
}

// Redirect to patient details page
function viewPatient(patientId) {
  window.location.href = `patient.html?id=${patientId}`;
}

function runPipeline(patientId) {
  // same as viewPatient: route to patient details page
  window.location.href = `patient.html?id=${patientId}`;
}

// On patient details page
async function loadPatientDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  const res = await fetch(`${API_URL}/patient/${id}`);
  const patient = await res.json();

  document.getElementById("patientName").innerText = `${patient.first_name} ${patient.last_name} (MRN: ${patient.mrn})`;

  document.getElementById("patientDetails").innerHTML = `
    <strong>Age:</strong> ${patient.age} <br/>
    <strong>Gender:</strong> ${patient.gender} <br/>
    <strong>Race:</strong> ${patient.race} <br/>
  `;

  const pipeRes = await fetch(`${API_URL}/pipeline/${id}`);
  const data = await pipeRes.json();

  document.getElementById("pipelineOutput").innerHTML = `
    <h4>Pipeline Output</h4>
    <pre>${JSON.stringify(data.bundle, null, 2)}</pre>
    <h5>Alerts</h5>
    <pre>${JSON.stringify(data.cds, null, 2)}</pre>
  `;
}

// Auto-load on homepage or details page
if (document.getElementById("patientsChart")) loadDashboard();
if (document.getElementById("patientDetails")) loadPatientDetails();
