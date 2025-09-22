import csv
from .db import patients_collection, fhir_collection
import os
import json

def seed_patients():
    if patients_collection.count_documents({}) == 0:
        with open("/mock_data/mock_emr_patients.csv") as f:
            reader = csv.DictReader(f)
            patients = [row for row in reader]
            for p in patients:
                p["patient_id"] = int(p["patient_id"])
                p["age"] = int(p["age"])
            patients_collection.insert_many(patients)



def seed_fhir():
    if fhir_collection.count_documents({}) == 0:
        file_path = os.path.join(os.path.dirname(__file__), "mock_data", "mock_fhir_bundles.json")
        with open(file_path) as f:
            bundles = json.load(f)   # this is a list
            for bundle in bundles:
                fhir_collection.insert_one(bundle)
