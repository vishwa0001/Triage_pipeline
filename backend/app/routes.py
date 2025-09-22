from fastapi import APIRouter
from .db import patients_collection, fhir_collection
from .services import mock_ocr_pipeline, mock_cds

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
