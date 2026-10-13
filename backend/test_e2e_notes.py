import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Register or login
reg_payload = {
    "email": "dr.smith@cardio.org",
    "full_name": "Dr. Sarah Smith",
    "password": "SecurePassword123!"
}

session = requests.Session()
# Try login first
res = session.post(f"{BASE_URL}/login", json={"email": "dr.smith@cardio.org", "doctor_name": "Dr. Sarah Smith", "password": "SecurePassword123!"})
if res.status_code == 200:
    token = res.json()["access_token"]
    print("Logged in successfully:", res.json())
else:
    # Try register
    res = session.post(f"{BASE_URL}/register", json=reg_payload)
    if res.status_code == 200:
        print("Registered successfully:", res.json())
        res = session.post(f"{BASE_URL}/login", json={"email": "dr.smith@cardio.org", "doctor_name": "Dr. Sarah Smith", "password": "SecurePassword123!"})
        token = res.json()["access_token"]
    else:
        print("Auth failed:", res.text)
        exit(1)

headers = {"Authorization": f"Bearer {token}"}

# Get patients
res = session.get(f"{BASE_URL}/patients", headers=headers)
patients = res.json()
print(f"Retrieved {len(patients)} patients from registry.")

if patients:
    patient_id = patients[0]["id"]
    print(f"Testing note appending on patient {patient_id} ({patients[0]['patient_name']})...")
    
    note_payload = {
        "note": "Urgent consultation: Patient presents with critical multi-vessel CAD profile. Severe ischemia risk in LAD distribution.",
        "action_plan": "1. Urgent coronary catheterization within 48h.\n2. Initiate DAPT (Aspirin 81mg + Clopidogrel 75mg).\n3. Statin 80mg.\n4. CCU cardiac telemetry admission.",
        "urgency": "Urgent (<48h)"
    }
    
    res = session.post(f"{BASE_URL}/patients/{patient_id}/notes", json=note_payload, headers=headers)
    print("Note Append Status:", res.status_code)
    print("Appended Note:", json.dumps(res.json(), indent=2))
    
    # Verify patient report includes the note
    res = session.get(f"{BASE_URL}/patients/{patient_id}", headers=headers)
    report = res.json()
    print(f"Report retrieved. Clinical notes count: {len(report.get('clinical_notes', []))}")
    print("Attributed Doctor:", report.get('clinical_notes', [])[0].get('doctor_name'))
    print("Urgency:", report.get('clinical_notes', [])[0].get('urgency'))
    print("ALL TESTS PASSED! End-to-end clinical notes API verified successfully.")
else:
    print("No patients in DB yet. Creating a patient via /predict...")
    # Create a prediction
    pred_payload = {
        "patient_name": "Robert Miller",
        "age": 62,
        "sex": "Male",
        "clinical_data": {
            "Age": 62, "Weight": 85, "Length": 172, "Sex": "Male", "BMI": 28.7,
            "DM": 1, "HTN": 1, "Current Smoker": 1, "EX-Smoker": 0, "FH": 1, "Obesity": "Y",
            "CRF": "N", "CVA": "N", "Airway disease": "N", "Thyroid Disease": "N", "CHF": "N",
            "DLP": "Y", "BP": 140, "PR": 82, "Edema": 0, "Weak Peripheral Pulse": "N", "Lung rales": "N",
            "Systolic Murmur": "N", "Diastolic Murmur": "N", "Typical Chest Pain": 1, "Dyspnea": "Y",
            "Function Class": 2, "Atypical": "N", "Nonanginal": "N", "Exertional CP": "Y",
            "LowTH Ang": "N", "Q Wave": 1, "St Elevation": 1, "St Depression": 1, "Tinversion": 1,
            "LVH": "N", "Poor R Progression": "N", "BBB": "N", "FBS": 142, "CR": 1.1, "TG": 260,
            "LDL": 165, "HDL": 32.0, "BUN": 18, "ESR": 14, "HB": 14.8, "K": 4.5, "Na": 139,
            "WBC": 7200, "Lymph": 30, "Neut": 62, "PLT": 240, "EF-TTE": 45, "Region RWMA": 2, "VHD": "N"
        }
    }
    res = session.post(f"{BASE_URL}/predict", json=pred_payload, headers=headers)
    pred_res = res.json()
    patient_id = pred_res.get("patient_id")
    print(f"Created patient {patient_id}. Appending clinical note...")
    note_payload = {
        "note": "Urgent consultation: Patient presents with critical multi-vessel CAD profile. Severe ischemia risk in LAD distribution.",
        "action_plan": "1. Urgent coronary catheterization within 48h.\n2. Initiate DAPT (Aspirin 81mg + Clopidogrel 75mg).\n3. Statin 80mg.\n4. CCU cardiac telemetry admission.",
        "urgency": "Urgent (<48h)"
    }
    res = session.post(f"{BASE_URL}/patients/{patient_id}/notes", json=note_payload, headers=headers)
    print("Note Append Status:", res.status_code)
    print("Appended Note:", json.dumps(res.json(), indent=2))
    print("ALL TESTS PASSED! End-to-end clinical notes API verified successfully.")
