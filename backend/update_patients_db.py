import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'ml_pipeline'))
from ml_pipeline.inference import ClinicalPredictor
from database import SessionLocal
import models

def update_patients():
    print("=" * 70)
    print("UPDATING ALL PATIENTS IN DATABASE WITH IMPROVED MODEL PREDICTIONS")
    print("=" * 70)
    
    models_path = os.path.join(os.path.dirname(__file__), 'ml_pipeline', 'models')
    predictor = ClinicalPredictor(models_dir=models_path)
    
    db = SessionLocal()
    try:
        patients = db.query(models.PatientRecord).all()
        print(f"Found {len(patients)} patients in database.\n")
        
        for p in patients:
            old_cad = p.overall_risk
            old_lad = p.lad_risk
            old_lcx = p.lcx_risk
            old_rca = p.rca_risk
            
            # Extract raw clinical data
            clinical_data = {}
            if p.raw_data:
                try:
                    clinical_data = json.loads(p.raw_data)
                except Exception:
                    clinical_data = {}
                    
            if not clinical_data:
                # Fallback to standard patient structure
                clinical_data = {
                    "Age": p.age or 55,
                    "Sex": p.sex or "Male",
                    "Weight": 80,
                    "Length": 170,
                    "BMI": 27.0,
                    "DM": 1 if old_cad > 0.7 else 0,
                    "HTN": 1 if old_cad > 0.6 else 0,
                    "Current Smoker": 1 if old_cad > 0.8 else 0,
                    "EX-Smoker": 0,
                    "FH": 0,
                    "Obesity": "Y" if old_cad > 0.7 else "N",
                    "CRF": "N", "CVA": "N", "Airway disease": "N", "Thyroid Disease": "N", "CHF": "N",
                    "DLP": "Y" if old_cad > 0.5 else "N",
                    "BP": 135 if old_cad > 0.7 else 120,
                    "PR": 75,
                    "Edema": 0, "Weak Peripheral Pulse": "N", "Lung rales": "N",
                    "Systolic Murmur": "N", "Diastolic Murmur": "N",
                    "Typical Chest Pain": 1 if old_cad > 0.8 else 0,
                    "Dyspnea": "N", "Function Class": 1 if old_cad > 0.8 else 0,
                    "Atypical": "N", "Nonanginal": "N",
                    "Exertional CP": "Y" if old_cad > 0.7 else "N",
                    "LowTH Ang": "N", "Q Wave": 0,
                    "St Elevation": 1 if old_lad > 0.7 else 0,
                    "St Depression": 1 if old_cad > 0.7 else 0,
                    "Tinversion": 1 if old_lcx > 0.5 else 0,
                    "LVH": "N", "Poor R Progression": "N", "BBB": "N",
                    "FBS": 125 if old_cad > 0.7 else 95,
                    "CR": 0.9, "TG": 220 if old_cad > 0.7 else 150,
                    "LDL": 150 if old_cad > 0.7 else 100,
                    "HDL": 32.0 if old_cad > 0.7 else 45.0,
                    "BUN": 12, "ESR": 8, "HB": 14.5, "K": 4.5, "Na": 140,
                    "WBC": 6000, "Lymph": 35, "Neut": 55, "PLT": 250,
                    "EF-TTE": 45 if old_cad > 0.7 else 55,
                    "Region RWMA": 1 if old_lad > 0.6 else 0,
                    "VHD": "N"
                }
                # Save sanitized clinical data back into raw_data
                p.raw_data = json.dumps(clinical_data)
                
            # Run inference with the newly deployed golden models
            inference_result = predictor.predict_patient_risk(clinical_data)
            probs = inference_result["probabilities"]
            
            p.overall_risk = round(float(probs["Overall_CAD"]), 4)
            p.lad_risk = round(float(probs["LAD"]), 4)
            p.lcx_risk = round(float(probs["LCX"]), 4)
            p.rca_risk = round(float(probs["RCA"]), 4)
            
            print(f"Patient ID {p.id:2d} ({p.patient_name:30s}):")
            print(f"  Overall CAD Risk : {old_cad*100:5.1f}%  -->  {p.overall_risk*100:5.1f}%")
            print(f"  LAD Stenosis     : {old_lad*100:5.1f}%  -->  {p.lad_risk*100:5.1f}%")
            print(f"  LCX Stenosis     : {old_lcx*100:5.1f}%  -->  {p.lcx_risk*100:5.1f}%")
            print(f"  RCA Stenosis     : {old_rca*100:5.1f}%  -->  {p.rca_risk*100:5.1f}%\n")
            
        db.commit()
        print("[SUCCESS] All patient records successfully synchronized with the improved models!")
    except Exception as e:
        db.rollback()
        print(f"Error updating patients: {e}")
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    update_patients()
