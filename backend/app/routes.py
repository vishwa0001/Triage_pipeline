from fastapi import APIRouter
from app.db import patients_collection, fhir_collection
from app.services import mock_ocr_pipeline, mock_cds
from app.services import has_critical_alerts

router = APIRouter()

@router.get("/patients")
def get_patients():
    return list(patients_collection.find({}, {"_id": 0}))

@router.get("/patient/{patient_id}")
def get_patient(patient_id: int):
    return patients_collection.find_one({"patient_id": patient_id}, {"_id": 0})

@router.get("/pipeline/{patient_id}")
def run_pipeline(patient_id: int):
    # Step 1: OCR & NLP
    bundle = mock_ocr_pipeline(patient_id)
    # Step 2: CDS
    cds = mock_cds(bundle)
    return {"bundle": bundle, "cds": cds}

@router.get("/critical/count")
def get_critical_count():
    from app.db import patients_collection
    critical_count = 0
    patients = list(patients_collection.find({}, {"_id": 0, "patient_id": 1}))
    for p in patients:
        alerts = has_critical_alerts(p["patient_id"])
        if alerts:
            critical_count += 1
    return {"critical_patient_count": critical_count}


@router.get("/critical/patients")
def get_critical_patients():
    from app.db import patients_collection
    critical_patients = []
    patients = list(patients_collection.find({}, {"_id": 0}))
    for p in patients:
        alerts = has_critical_alerts(p["patient_id"])
        if alerts:
            critical_patients.append({
                "patient": p,
                "alerts": alerts
            })
    return {"critical_patients": critical_patients}
