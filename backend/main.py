from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import joblib
import shap
import json
import time
from datetime import datetime, timedelta

import models, schemas, auth, database
from database import engine

# Create tables
models.Base.metadata.create_all(bind=engine)

# Automatic lightweight SQLite schema synchronization
try:
    with engine.connect() as conn:
        cursor = conn.connection.cursor()
        cursor.execute("PRAGMA table_info(patients)")
        columns = [row[1] for row in cursor.fetchall()]
        if "clinical_notes" not in columns:
            cursor.execute("ALTER TABLE patients ADD COLUMN clinical_notes TEXT DEFAULT '[]'")
            conn.connection.commit()
except Exception as e:
    print(f"Schema check error: {e}")

app = FastAPI(title="Artery3D API", description="API for Cardiovascular Risk Visualization & Prediction")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'ml_pipeline'))
from ml_pipeline.inference import ClinicalPredictor

# Load Models
try:
    predictor = ClinicalPredictor(models_dir=os.path.join(os.path.dirname(__file__), 'ml_pipeline', 'models'))
except Exception as e:
    print(f"Error loading models: {e}")


@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password, full_name=user.full_name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "doctor_name": user.full_name,
        "email": user.email
    }

@app.post("/login", response_model=schemas.Token)
def doctor_login(login_data: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email.strip()).first()
    if not user or not auth.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # If doctor name is specified, verify matching with registered doctor name
    if login_data.doctor_name:
        input_doc = login_data.doctor_name.strip().lower().replace("dr.", "").replace("dr ", "").strip()
        db_doc = user.full_name.strip().lower().replace("dr.", "").replace("dr ", "").strip()
        if input_doc and db_doc and (input_doc not in db_doc and db_doc not in input_doc):
            raise HTTPException(
                status_code=400,
                detail=f"Entered Doctor Name '{login_data.doctor_name}' does not match registered account name '{user.full_name}'."
            )
            
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "doctor_name": user.full_name,
        "email": user.email
    }

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.post("/predict", response_model=dict)
def predict_risk(patient_req: schemas.PatientCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Run Inference
    inference_result = predictor.predict_patient_risk(patient_req.clinical_data)
    
    prob_Cath = inference_result["probabilities"]["Overall_CAD"]
    prob_LAD = inference_result["probabilities"]["LAD"]
    prob_LCX = inference_result["probabilities"]["LCX"]
    prob_RCA = inference_result["probabilities"]["RCA"]
    shap_dict = inference_result["shap_values"]
    
    doc_name = current_user.full_name if (current_user and current_user.full_name) else "Dr. Medical Specialist"
    
    # Save to database with evaluating Doctor's Name
    db_patient = models.PatientRecord(
        doctor_id=current_user.id,
        doctor_name=doc_name,
        patient_name=patient_req.patient_name,
        age=patient_req.age,
        sex=patient_req.sex,
        overall_risk=prob_Cath,
        lad_risk=prob_LAD,
        lcx_risk=prob_LCX,
        rca_risk=prob_RCA,
        raw_data=json.dumps(patient_req.clinical_data),
        clinical_notes="[]"
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    return {
        "patient_id": db_patient.id,
        "doctor_name": doc_name,
        "patient_name": db_patient.patient_name,
        "overall_cad_risk": prob_Cath,
        "stenosis_probabilities": {
            "LAD": prob_LAD,
            "LCX": prob_LCX,
            "RCA": prob_RCA
        },
        "confidence_intervals": inference_result.get("confidence_intervals", {}),
        "shap_values": shap_dict,
        "clinical_notes": []
    }

@app.get("/patients/{patient_id}", response_model=dict)
def get_patient_report(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Patient reports are accessible to every authenticated doctor
    db_patient = db.query(models.PatientRecord).filter(models.PatientRecord.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    clinical_data = json.loads(db_patient.raw_data) if db_patient.raw_data else {}
    inference_result = predictor.predict_patient_risk(clinical_data)
    
    # Ensure database record is synchronized with inference results so Dashboard and Report ALWAYS match exactly
    cad_risk = inference_result["probabilities"]["Overall_CAD"]
    if db_patient.overall_risk != cad_risk:
        db_patient.overall_risk = cad_risk
        db_patient.lad_risk = inference_result["probabilities"]["LAD"]
        db_patient.lcx_risk = inference_result["probabilities"]["LCX"]
        db_patient.rca_risk = inference_result["probabilities"]["RCA"]
        db.commit()
        db.refresh(db_patient)
    
    attending_doctor = db_patient.doctor_name or (db_patient.doctor.full_name if db_patient.doctor else "Dr. Medical Specialist")
    notes_list = json.loads(db_patient.clinical_notes) if db_patient.clinical_notes else []
    
    return {
        "id": db_patient.id,
        "patient_id": db_patient.id,
        "patient_name": db_patient.patient_name,
        "doctor_name": attending_doctor,
        "age": db_patient.age,
        "sex": db_patient.sex,
        "overall_risk": db_patient.overall_risk,
        "clinical_data": clinical_data,
        "clinical_notes": notes_list,
        "prediction": {
            "overall_cad_risk": db_patient.overall_risk,
            "stenosis_probabilities": {
                "LAD": db_patient.lad_risk if db_patient.lad_risk is not None else inference_result["probabilities"]["LAD"],
                "LCX": db_patient.lcx_risk if db_patient.lcx_risk is not None else inference_result["probabilities"]["LCX"],
                "RCA": db_patient.rca_risk if db_patient.rca_risk is not None else inference_result["probabilities"]["RCA"]
            },
            "confidence_intervals": inference_result.get("confidence_intervals", {}),
            "shap_values": inference_result["shap_values"]
        }
    }

@app.put("/patients/{patient_id}", response_model=dict)
def update_patient_report(
    patient_id: int,
    patient_update: schemas.PatientUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Enable editing patient details & recalculating cardiovascular risk
    db_patient = db.query(models.PatientRecord).filter(models.PatientRecord.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    if patient_update.patient_name is not None and patient_update.patient_name.strip():
        db_patient.patient_name = patient_update.patient_name.strip()
    if patient_update.age is not None:
        db_patient.age = int(patient_update.age)
    if patient_update.sex is not None and patient_update.sex.strip():
        db_patient.sex = patient_update.sex.strip()
        
    clinical_data = json.loads(db_patient.raw_data) if db_patient.raw_data else {}
    if patient_update.clinical_data:
        clinical_data.update(patient_update.clinical_data)
        
    if db_patient.age is not None:
        clinical_data["Age"] = db_patient.age
    if db_patient.sex is not None:
        clinical_data["Sex"] = db_patient.sex
        
    # Re-run inference with updated clinical parameters
    inference_result = predictor.predict_patient_risk(clinical_data)
    prob_Cath = inference_result["probabilities"]["Overall_CAD"]
    prob_LAD = inference_result["probabilities"]["LAD"]
    prob_LCX = inference_result["probabilities"]["LCX"]
    prob_RCA = inference_result["probabilities"]["RCA"]
    
    # Update doctor attribution to active doctor who edited the patient
    doc_name = current_user.full_name if (current_user and current_user.full_name) else db_patient.doctor_name
    db_patient.doctor_name = doc_name
    db_patient.doctor_id = current_user.id
    
    db_patient.overall_risk = prob_Cath
    db_patient.lad_risk = prob_LAD
    db_patient.lcx_risk = prob_LCX
    db_patient.rca_risk = prob_RCA
    db_patient.raw_data = json.dumps(clinical_data)
    
    db.commit()
    db.refresh(db_patient)
    
    notes_list = json.loads(db_patient.clinical_notes) if db_patient.clinical_notes else []

    return {
        "id": db_patient.id,
        "patient_id": db_patient.id,
        "patient_name": db_patient.patient_name,
        "doctor_name": db_patient.doctor_name,
        "age": db_patient.age,
        "sex": db_patient.sex,
        "overall_risk": db_patient.overall_risk,
        "clinical_data": clinical_data,
        "clinical_notes": notes_list,
        "prediction": {
            "overall_cad_risk": prob_Cath,
            "stenosis_probabilities": {
                "LAD": prob_LAD,
                "LCX": prob_LCX,
                "RCA": prob_RCA
            },
            "confidence_intervals": inference_result.get("confidence_intervals", {}),
            "shap_values": inference_result["shap_values"]
        }
    }

@app.post("/patients/{patient_id}/notes", response_model=dict)
def add_clinical_note(
    patient_id: int,
    note_req: schemas.ClinicalNoteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_patient = db.query(models.PatientRecord).filter(models.PatientRecord.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient record not found")
        
    existing_notes = json.loads(db_patient.clinical_notes) if db_patient.clinical_notes else []
    
    doc_name = current_user.full_name if (current_user and current_user.full_name) else "Dr. Attending Cardiologist"
    
    new_note = {
        "id": f"note_{int(time.time() * 1000)}",
        "doctor_id": current_user.id,
        "doctor_name": doc_name,
        "timestamp": datetime.now().strftime("%b %d, %Y • %I:%M %p"),
        "note": note_req.note.strip(),
        "action_plan": note_req.action_plan.strip() if note_req.action_plan else None,
        "urgency": note_req.urgency or "Routine"
    }
    
    # Prepend newest note first
    existing_notes.insert(0, new_note)
    db_patient.clinical_notes = json.dumps(existing_notes)
    db.commit()
    db.refresh(db_patient)
    
    return {
        "success": True,
        "patient_id": db_patient.id,
        "note": new_note,
        "clinical_notes": existing_notes
    }

@app.get("/patients", response_model=List[schemas.PatientResponse])
def get_patients(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # All patient records are visible to every doctor logged into the system
    patients = db.query(models.PatientRecord).order_by(models.PatientRecord.id.desc()).all()
    for p in patients:
        if not p.doctor_name and p.doctor:
            p.doctor_name = p.doctor.full_name
    return patients
