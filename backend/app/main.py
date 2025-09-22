from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router as api_router
from app.seed_data import seed_patients

app = FastAPI(title="Mock Triage Pipeline API", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    seed_patients()

app.include_router(api_router, prefix="/api")
