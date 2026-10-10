from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import joblib
import shap
import json
from datetime import timedelta

import models, schemas, auth, database
from database import engine

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Artery3D API", description="API for Cardiovascular Risk Visualization & Prediction")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models
try:
    preprocessor = joblib.load("preprocessor.joblib")
    model_Cath = joblib.load("model_Cath.joblib")
    model_LAD = joblib.load("model_LAD.joblib")
    model_LCX = joblib.load("model_LCX.joblib")
    model_RCA = joblib.load("model_RCA.joblib")
    with open("feature_names.json", "r") as f:
        feature_names = json.load(f)
    explainer = shap.TreeExplainer(model_Cath)
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
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.post("/predict", response_model=dict)
def predict_risk(patient_req: schemas.PatientCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    df = pd.DataFrame([patient_req.clinical_data])
    X_processed = preprocessor.transform(df)
    
    prob_Cath = float(model_Cath.predict_proba(X_processed)[0][1])
    prob_LAD = float(model_LAD.predict_proba(X_processed)[0][1])
    prob_LCX = float(model_LCX.predict_proba(X_processed)[0][1])
    prob_RCA = float(model_RCA.predict_proba(X_processed)[0][1])
    
    shap_values = explainer.shap_values(X_processed)
    if isinstance(shap_values, list):
        shap_class1 = shap_values[1][0]
    else:
        if len(shap_values.shape) == 3:
            shap_class1 = shap_values[0, :, 1]
        else:
            shap_class1 = shap_values[0]
            
    shap_dict = {feat: float(val) for feat, val in zip(feature_names, shap_class1)}
    
    # Save to database
    db_patient = models.PatientRecord(
        doctor_id=current_user.id,
        patient_name=patient_req.patient_name,
        age=patient_req.age,
        sex=patient_req.sex,
        overall_risk=prob_Cath,
        lad_risk=prob_LAD,
        lcx_risk=prob_LCX,
        rca_risk=prob_RCA,
        raw_data=json.dumps(patient_req.clinical_data)
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    return {
        "patient_id": db_patient.id,
        "overall_cad_risk": prob_Cath,
        "stenosis_probabilities": {
            "LAD": prob_LAD,
            "LCX": prob_LCX,
            "RCA": prob_RCA
        },
        "shap_values": shap_dict
    }

@app.get("/patients/{patient_id}", response_model=dict)
def get_patient_report(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_patient = db.query(models.PatientRecord).filter(models.PatientRecord.id == patient_id, models.PatientRecord.doctor_id == current_user.id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    clinical_data = json.loads(db_patient.raw_data)
    df = pd.DataFrame([clinical_data])
    X_processed = preprocessor.transform(df)
    
    prob_Cath = db_patient.overall_risk
    prob_LAD = db_patient.lad_risk
    prob_LCX = db_patient.lcx_risk
    prob_RCA = db_patient.rca_risk
    
    shap_values = explainer.shap_values(X_processed)
    if isinstance(shap_values, list):
        shap_class1 = shap_values[1][0]
    else:
        if len(shap_values.shape) == 3:
            shap_class1 = shap_values[0, :, 1]
        else:
            shap_class1 = shap_values[0]
            
    shap_dict = {feat: float(val) for feat, val in zip(feature_names, shap_class1)}
    
    return {
        "patient_name": db_patient.patient_name,
        "prediction": {
            "overall_cad_risk": prob_Cath,
            "stenosis_probabilities": {
                "LAD": prob_LAD,
                "LCX": prob_LCX,
                "RCA": prob_RCA
            },
            "shap_values": shap_dict
        }
    }

@app.get("/patients", response_model=List[schemas.PatientResponse])
def get_patients(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.PatientRecord).filter(models.PatientRecord.doctor_id == current_user.id).all()
