import csv
from .db import patients_collection

def seed_patients():
    if patients_collection.count_documents({}) == 0:
        with open("/app/mock_data/mock_emr_patients.csv") as f:
            reader = csv.DictReader(f)
            patients = [row for row in reader]
            for p in patients:
                p["patient_id"] = int(p["patient_id"])
                p["age"] = int(p["age"])
            patients_collection.insert_many(patients)
