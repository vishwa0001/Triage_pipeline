import random
from .db import patients_collection, fhir_collection

def mock_ocr_pipeline(patient_id: int):
    patient = patients_collection.find_one({"patient_id": patient_id}, {"_id": 0, "mrn": 1})
    if not patient:
        return {"error": "No patient found"}
    mrn = patient["mrn"]

    bundle = fhir_collection.find_one({"mrn": mrn}, {"_id": 0})  # use top-level mrn
    if not bundle:
        return {"error": "No bundle found"}
    bundle["nlp_status"] = "Parsed with mock LLM"
    return bundle




def mock_cds(bundle):
    """Simulate Clinical Decision Support"""
    alerts = []
    for entry in bundle["entry"]:
        res = entry["resource"]
        if res["resourceType"] == "Observation" and res.get("code", {}).get("text") == "Lipid panel":
            for comp in res["component"]:
                if comp["code"]["text"] == "LDL" and comp["valueQuantity"]["value"] >= 160:
                    alerts.append("High LDL cholesterol: consider statin")
    return {"alerts": alerts or ["No critical alerts"]}


def has_critical_alerts(patient_id: int):
    """Return alerts if patient has critical ones, else None"""
    bundle = mock_ocr_pipeline(patient_id)
    if "error" in bundle:
        return None
    
    cds = mock_cds(bundle)
    alerts = cds.get("alerts", [])
    # Check if all alerts are "No critical alerts"
    if all(a == "No critical alerts" for a in alerts):
        return None
    return alerts
