from fastapi import APIRouter, Query
from app.db import patients_collection, fhir_collection
from app.services import mock_ocr_pipeline, mock_cds, has_critical_alerts

router = APIRouter()

@router.get("/patients")
def get_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    skip = (page - 1) * page_size
    total = patients_collection.count_documents({})
    items = list(
        patients_collection.find({}, {"_id": 0})
        .skip(skip)
        .limit(page_size)
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/patients/count")
def get_patients_count():
    total = patients_collection.count_documents({})
    return {"total": total}


@router.get("/patient/{patient_id}")
def get_patient(patient_id: int):
    return patients_collection.find_one({"patient_id": patient_id}, {"_id": 0})


@router.get("/pipeline/{patient_id}")
def run_pipeline(patient_id: int):
    bundle = mock_ocr_pipeline(patient_id)
    cds = mock_cds(bundle)
    return {"bundle": bundle, "cds": cds}


@router.get("/critical/count")
def get_critical_count():
    critical_count = 0
    patients = list(patients_collection.find({}, {"_id": 0, "patient_id": 1}))
    for p in patients:
        alerts = has_critical_alerts(p["patient_id"])
        if alerts:
            critical_count += 1
    return {"critical_patient_count": critical_count}


@router.get("/critical/patients")
def get_critical_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    all_patients = list(patients_collection.find({}, {"_id": 0}))
    critical_patients_all = []
    for p in all_patients:
        alerts = has_critical_alerts(p["patient_id"])
        if alerts:
            critical_patients_all.append({"patient": p, "alerts": alerts})

    total = len(critical_patients_all)
    start = (page - 1) * page_size
    end = start + page_size
    items = critical_patients_all[start:end]

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/pipeline/simple/{patient_id}")
def run_pipeline_simple(patient_id: int):
    from app.services import mock_ocr_pipeline, mock_cds

    bundle = mock_ocr_pipeline(patient_id)
    if "error" in bundle:
        return bundle

    cds = mock_cds(bundle)

    patient = next(
        (e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Patient"),
        None
    )
    name = f"{patient['name'][0]['given'][0]} {patient['name'][0]['family']}" if patient else "Unknown"
    gender = patient.get("gender") if patient else ""
    birth_date = patient.get("birthDate") if patient else ""

    conditions = [
        e["resource"]["code"]["text"]
        for e in bundle["entry"]
        if e["resource"]["resourceType"] == "Condition"
    ]

    medications = [
        {
            "medication": e["resource"]["medicationCodeableConcept"]["text"],
            "instructions": e["resource"]["dosageInstruction"][0]["text"]
        }
        for e in bundle["entry"]
        if e["resource"]["resourceType"] == "MedicationRequest"
    ]

    vitals = {}
    for e in bundle["entry"]:
        res = e["resource"]
        if res["resourceType"] == "Observation" and res["code"]["text"] == "Blood pressure":
            vitals["blood_pressure"] = f"{res['component'][0]['valueQuantity']['value']}/{res['component'][1]['valueQuantity']['value']} mmHg"
        if res["resourceType"] == "Observation" and res["code"]["text"] == "Body mass index":
            vitals["bmi"] = f"{res['valueQuantity']['value']} {res['valueQuantity']['unit']}"

    return {
        "patient": {
            "name": name,
            "gender": gender,
            "dob": birth_date,
        },
        "conditions": conditions,
        "medications": medications,
        "vitals": vitals,
        "alerts": cds.get("alerts", []),
    }


def build_patient_overview_item(p: dict) -> dict:
    """
    Returns a compact, nurse-friendly overview item:
    - patient (mrn, name, age, gender, patient_id)
    - status ('critical' | 'normal')
    - alerts (list[str])  # from CDS, can include warnings/info
    """
    pid = p["patient_id"]
    # Build CDS once so lists can render alert badges consistently
    bundle = mock_ocr_pipeline(pid)
    cds = mock_cds(bundle) if "error" not in bundle else {}
    alerts = cds.get("alerts", []) or []
    status = "critical" if has_critical_alerts(pid) else "normal"

    return {
        "patient": {
            "patient_id": pid,
            "mrn": p.get("mrn"),
            "first_name": p.get("first_name"),
            "last_name": p.get("last_name"),
            "age": p.get("age"),
            "gender": p.get("gender"),
        },
        "status": status,
        "alerts": alerts,
    }

@router.get("/patients/overview")
def get_patients_overview(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """
    Paginated 'all patients' list WITH server-computed status and CDS alerts.
    """
    skip = (page - 1) * page_size
    total = patients_collection.count_documents({})
    raw_items = list(
        patients_collection.find({}, {"_id": 0}).skip(skip).limit(page_size)
    )

    items = [build_patient_overview_item(p) for p in raw_items]
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/normal/patients")
def get_normal_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """
    Paginated list of NON-CRITICAL patients. Each item includes patient + alerts.
    """
    # Pull all (the cohort is small in this mock; in production, do two-pass with skip/limit)
    all_patients = list(patients_collection.find({}, {"_id": 0}))
    normal_all = []
    for p in all_patients:
        if not has_critical_alerts(p["patient_id"]):
            normal_all.append(build_patient_overview_item(p))

    total = len(normal_all)
    start = (page - 1) * page_size
    end = start + page_size
    items = normal_all[start:end]

    return {"items": items, "total": total, "page": page, "page_size": page_size}

