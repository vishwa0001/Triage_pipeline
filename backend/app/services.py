import random
from .db import patients_collection, fhir_collection

def mock_ocr_pipeline(patient_id: int):
    """Simulate OCR & NLP → FHIR parsing"""
    bundle = fhir_collection.find_one({"patient_id": patient_id}, {"_id": 0})
    if not bundle:
        return {"error": "No bundle found"}
    # Add mock NLP parsing
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
