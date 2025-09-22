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
    """Simulate Clinical Decision Support with diverse alerts"""
    alerts = []

    for entry in bundle["entry"]:
        res = entry["resource"]

        # 🔹 Lab: Lipid panel
        if res["resourceType"] == "Observation" and res.get("code", {}).get("text") == "Lipid panel":
            for comp in res.get("component", []):
                if comp["code"]["text"] == "LDL" and comp["valueQuantity"]["value"] >= 160:
                    alerts.append("High LDL cholesterol: consider statin")
                if comp["code"]["text"] == "HDL" and comp["valueQuantity"]["value"] < 40:
                    alerts.append("Low HDL cholesterol: lifestyle modification advised")

        # 🔹 Vitals: Blood pressure
        if res["resourceType"] == "Observation" and res.get("code", {}).get("text") == "Blood pressure":
            systolic = res["component"][0]["valueQuantity"]["value"]
            diastolic = res["component"][1]["valueQuantity"]["value"]
            if systolic >= 140 or diastolic >= 90:
                alerts.append(f"Hypertension detected ({systolic}/{diastolic} mmHg)")

        # 🔹 Vitals: BMI
        if res["resourceType"] == "Observation" and res.get("code", {}).get("text") == "Body mass index":
            bmi = res["valueQuantity"]["value"]
            if bmi >= 30:
                alerts.append(f"Obesity (BMI {bmi}): recommend weight management")
            elif bmi < 18.5:
                alerts.append(f"Underweight (BMI {bmi}): evaluate nutrition")

        # 🔹 Lab: HbA1c
        if res["resourceType"] == "Observation" and res.get("code", {}).get("text") == "HbA1c":
            hba1c = res["valueQuantity"]["value"]
            if hba1c >= 6.5:
                alerts.append(f"Diabetes control issue (HbA1c {hba1c}%)")

        # 🔹 Lab: Creatinine (renal function)
        if res["resourceType"] == "Observation" and res.get("code", {}).get("text") == "Creatinine":
            cr = res["valueQuantity"]["value"]
            if cr >= 1.5:
                alerts.append(f"Elevated creatinine ({cr} mg/dL): check renal function")

        # 🔹 Condition-based alerts
        if res["resourceType"] == "Condition":
            cond = res["code"]["text"].lower()
            if "heart failure" in cond:
                alerts.append("Heart failure: monitor fluid status")
            if "copd" in cond:
                alerts.append("COPD: ensure inhaler adherence")
            if "hypertension" in cond:
                alerts.append("Hypertension: consider tighter BP control")
            if "diabetes" in cond:
                alerts.append("Diabetes: monitor HbA1c and glucose levels")

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
