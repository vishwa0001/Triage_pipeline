const API_URL = "http://localhost:8000/api";

async function loadPatients() {
  const res = await fetch(`${API_URL}/patients`);
  const patients = await res.json();
  const list = document.getElementById("patients");
  list.innerHTML = "";
  patients.forEach(p => {
    let li = document.createElement("li");
    li.innerHTML = `${p.mrn} - ${p.first_name} ${p.last_name} 
      <button onclick="runPipeline(${p.patient_id})">Run Pipeline</button>`;
    list.appendChild(li);
  });
}

async function runPipeline(pid) {
  const res = await fetch(`${API_URL}/pipeline/${pid}`);
  const data = await res.json();
  document.getElementById("pipeline-output").innerHTML = `
    <h2>FHIR Bundle (Patient ${pid})</h2>
    <pre>${JSON.stringify(data.bundle, null, 2)}</pre>
    <h3>CDS Alerts</h3>
    <pre>${JSON.stringify(data.cds, null, 2)}</pre>
  `;
}
