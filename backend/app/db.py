from pymongo import MongoClient
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/")
client = MongoClient(MONGO_URI)
db = client["triage_db"]

patients_collection = db["patients"]
fhir_collection = db["fhir_bundles"]
