from pydantic import BaseModel
from typing import List, Dict, Any

class Patient(BaseModel):
    patient_id: int
    mrn: str
    first_name: str
    last_name: str
    age: int
    gender: str
    race: str

class FHIRBundle(BaseModel):
    resourceType: str
    type: str
    entry: List[Dict[str, Any]]
