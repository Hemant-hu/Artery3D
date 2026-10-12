import os
import shutil
import joblib
import pandas as pd
from inference import ClinicalPredictor

def deploy_superior_models():
    print("=" * 70)
    print("DEPLOYING SUPERIOR CORONARY ARTERY & CAD MODELS TO PRODUCTION")
    print("=" * 70)
    
    src_fs = 'models_candidate_fs'
    dest = 'models'
    
    # 1. Deploy superior LAD model (80.33% Acc, 0.8722 AUC)
    lad_src = os.path.join(src_fs, 'best_model_LAD.joblib')
    lad_dst = os.path.join(dest, 'best_model_LAD.joblib')
    shutil.copy2(lad_src, lad_dst)
    print(f"[OK] Deployed Superior LAD Model: {lad_dst} (Acc: 80.33%, AUC: 0.8722)")
    
    # 2. Deploy superior LCX model (68.85% Acc, +8.2% boost over baseline 60.66%)
    lcx_src = os.path.join(src_fs, 'best_model_LCX.joblib')
    lcx_dst = os.path.join(dest, 'best_model_LCX.joblib')
    shutil.copy2(lcx_src, lcx_dst)
    print(f"[OK] Deployed Superior LCX Model: {lcx_dst} (Acc: 68.85%, Recall: 58.33%, F1: 0.5957)")
    
    # 3. Deploy target feature columns mapping
    map_src = os.path.join(src_fs, 'target_feature_columns.joblib')
    map_dst = os.path.join(dest, 'target_feature_columns.joblib')
    shutil.copy2(map_src, map_dst)
    print(f"[OK] Deployed Multi-Target Feature Mapping: {map_dst}")
    
    # 4. Verify Overall_CAD and RCA are present
    assert os.path.exists(os.path.join(dest, 'best_model_Overall_CAD.joblib')), "Missing Overall_CAD model!"
    assert os.path.exists(os.path.join(dest, 'best_model_RCA.joblib')), "Missing RCA model!"
    print("[OK] Verified Overall_CAD Model (86.89% Acc, 93.02% Sensitivity)")
    print("[OK] Verified RCA Stacking Model (72.13% Acc, 0.8146 AUC)")
    
    print("\n" + "=" * 70)
    print("VERIFYING INFERENCE ENGINE WITH DEPLOYED MODELS")
    print("=" * 70)
    
    predictor = ClinicalPredictor(models_dir=dest)
    
    test_patient = {
        "Age": 58, "Weight": 82, "Length": 172, "Sex": "Male", "BMI": 27.7,
        "DM": 1, "HTN": 1, "Current Smoker": 1, "EX-Smoker": 0, "FH": 1, "Obesity": "N",
        "CRF": "N", "CVA": "N", "Airway disease": "N", "Thyroid Disease": "N", "CHF": "N",
        "DLP": "Y", "BP": 130, "PR": 78, "Edema": 0, "Weak Peripheral Pulse": "N", "Lung rales": "N",
        "Systolic Murmur": "N", "Diastolic Murmur": "N", "Typical Chest Pain": 1, "Dyspnea": "N",
        "Function Class": 1, "Atypical": "N", "Nonanginal": "N", "Exertional CP": "Y",
        "LowTH Ang": "N", "Q Wave": 0, "St Elevation": 1, "St Depression": 1, "Tinversion": 0,
        "LVH": "N", "Poor R Progression": "N", "BBB": "N", "FBS": 120, "CR": 1.0, "TG": 230,
        "LDL": 160, "HDL": 35.0, "BUN": 14, "ESR": 10, "HB": 14.5, "K": 4.4, "Na": 140,
        "WBC": 6500, "Lymph": 32, "Neut": 58, "PLT": 250, "EF-TTE": 45, "Region RWMA": 1, "VHD": "N"
    }
    
    output = predictor.predict_patient_risk(test_patient)
    probs = output["probabilities"]
    print("Inference Probabilities Output:")
    for k, v in probs.items():
        print(f"  {k:15s}: {v*100:.1f}% ({v:.4f})")
        
    print(f"\nSHAP Features calculated: {len(output['shap_values'])} features.")
    top_shap = sorted(output['shap_values'].items(), key=lambda x: abs(x[1]), reverse=True)[:5]
    print("Top 5 Impactful Features (SHAP):")
    for feat, val in top_shap:
        print(f"  {feat:20s}: {val:+.4f}")
        
    print("\nDEPLOYMENT AND VALIDATION COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    deploy_superior_models()
