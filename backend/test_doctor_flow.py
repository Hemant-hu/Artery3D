import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("Testing Artery3D Doctor Multi-User Shared Registry & Attribution Flow...")
    
    # 1. Register Doctor 1
    doc1 = {
        "full_name": "Dr. Sarah Connor",
        "email": "sarah.connor@hospital.org",
        "password": "Password123!"
    }
    r = requests.post(f"{BASE_URL}/register", json=doc1)
    if r.status_code == 200:
        print("Doctor 1 registered successfully.")
    elif r.status_code == 400 and "already registered" in r.text:
        print("Doctor 1 already exists, proceeding to login.")
    else:
        print(f"Error registering Doctor 1: {r.status_code} {r.text}")

    # 2. Login Doctor 1 with Doctor Name, Email, Password
    login1_payload = {
        "doctor_name": "Dr. Sarah Connor",
        "email": "sarah.connor@hospital.org",
        "password": "Password123!"
    }
    r = requests.post(f"{BASE_URL}/login", json=login1_payload)
    assert r.status_code == 200, f"Login Doc 1 failed: {r.text}"
    token1 = r.json()["access_token"]
    assert r.json()["doctor_name"] == "Dr. Sarah Connor"
    print("Doctor 1 logged in successfully with Doctor Name, Email, Password.")

    # 3. Doctor 1 creates patient entry "Patient Alpha"
    patient1_data = {
        "patient_name": "Patient Alpha (Connor's Case)",
        "age": 62,
        "sex": "Male",
        "clinical_data": {
            "Age": 62, "Weight": 85, "Length": 175, "Sex": "Male", "BMI": 27.7,
            "DM": 1, "HTN": 1, "Current Smoker": 1, "EX-Smoker": 0, "FH": 1, "Obesity": "N",
            "CRF": "N", "CVA": "N", "Airway disease": "N", "Thyroid Disease": "N", "CHF": "N",
            "DLP": "Y", "BP": 140, "PR": 82, "Edema": 0, "Weak Peripheral Pulse": "N", "Lung rales": "N",
            "Systolic Murmur": "N", "Diastolic Murmur": "N", "Typical Chest Pain": 1, "Dyspnea": "N",
            "Function Class": 2, "Atypical": "N", "Nonanginal": "N", "Exertional CP": "Y",
            "LowTH Ang": "N", "Q Wave": 1, "St Elevation": 1, "St Depression": 0, "Tinversion": 0,
            "LVH": "N", "Poor R Progression": "N", "BBB": "N", "FBS": 126, "CR": 1.1, "TG": 210,
            "LDL": 160, "HDL": 35.0, "BUN": 15, "ESR": 12, "HB": 14.2, "K": 4.5, "Na": 140,
            "WBC": 6800, "Lymph": 30, "Neut": 60, "PLT": 240, "EF-TTE": 45, "Region RWMA": 1, "VHD": "N"
        }
    }
    r = requests.post(
        f"{BASE_URL}/predict",
        json=patient1_data,
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert r.status_code == 200, f"Predict failed: {r.text}"
    patient1_res = r.json()
    p1_id = patient1_res["patient_id"]
    assert patient1_res["doctor_name"] == "Dr. Sarah Connor", f"Expected Dr. Sarah Connor, got {patient1_res['doctor_name']}"
    print(f"Doctor 1 created Patient Alpha (ID #{p1_id}) with attributed doctor: {patient1_res['doctor_name']}.")

    # 4. Register Doctor 2
    doc2 = {
        "full_name": "Dr. Marcus Brody",
        "email": "marcus.brody@hospital.org",
        "password": "Password456!"
    }
    r = requests.post(f"{BASE_URL}/register", json=doc2)
    if r.status_code == 200:
        print("Doctor 2 registered successfully.")
    elif r.status_code == 400 and "already registered" in r.text:
        print("Doctor 2 already exists, proceeding to login.")

    # 5. Login Doctor 2
    login2_payload = {
        "doctor_name": "Dr. Marcus Brody",
        "email": "marcus.brody@hospital.org",
        "password": "Password456!"
    }
    r = requests.post(f"{BASE_URL}/login", json=login2_payload)
    assert r.status_code == 200, f"Login Doc 2 failed: {r.text}"
    token2 = r.json()["access_token"]
    assert r.json()["doctor_name"] == "Dr. Marcus Brody"
    print("Doctor 2 logged in successfully with Doctor Name, Email, Password.")

    # 6. Doctor 2 accesses /patients (Hospital-wide shared registry)
    r = requests.get(f"{BASE_URL}/patients", headers={"Authorization": f"Bearer {token2}"})
    assert r.status_code == 200, f"Get patients failed: {r.text}"
    patients_list = r.json()
    print(f"Doctor 2 fetched {len(patients_list)} total hospital patient records from shared registry.")
    
    # Check that Patient Alpha is visible to Doctor 2 and attributes Dr. Sarah Connor
    alpha_record = next((p for p in patients_list if p["id"] == p1_id), None)
    assert alpha_record is not None, "Doctor 2 could not see Patient Alpha!"
    assert alpha_record["doctor_name"] == "Dr. Sarah Connor", f"Expected Dr. Sarah Connor, got {alpha_record['doctor_name']}"
    print(f"Verified: Patient Alpha is visible to Doctor 2 and displays evaluating physician: {alpha_record['doctor_name']}.")

    # 7. Doctor 2 views full report for Patient Alpha
    r = requests.get(f"{BASE_URL}/patients/{p1_id}", headers={"Authorization": f"Bearer {token2}"})
    assert r.status_code == 200, f"Get report failed: {r.text}"
    report_data = r.json()
    assert report_data["doctor_name"] == "Dr. Sarah Connor", f"Expected Dr. Sarah Connor, got {report_data['doctor_name']}"
    print(f"Verified: Patient report viewed by Doctor 2 contains evaluating physician: {report_data['doctor_name']}.")

    # 8. Doctor 2 creates their own patient entry "Patient Beta"
    patient2_data = {
        "patient_name": "Patient Beta (Brody's Case)",
        "age": 48,
        "sex": "Female",
        "clinical_data": {
            "Age": 48, "Weight": 65, "Length": 162, "Sex": "Female", "BMI": 24.8,
            "DM": 0, "HTN": 0, "Current Smoker": 0, "EX-Smoker": 0, "FH": 0, "Obesity": "N",
            "CRF": "N", "CVA": "N", "Airway disease": "N", "Thyroid Disease": "N", "CHF": "N",
            "DLP": "N", "BP": 115, "PR": 72, "Edema": 0, "Weak Peripheral Pulse": "N", "Lung rales": "N",
            "Systolic Murmur": "N", "Diastolic Murmur": "N", "Typical Chest Pain": 0, "Dyspnea": "N",
            "Function Class": 0, "Atypical": "N", "Nonanginal": "N", "Exertional CP": "N",
            "LowTH Ang": "N", "Q Wave": 0, "St Elevation": 0, "St Depression": 0, "Tinversion": 0,
            "LVH": "N", "Poor R Progression": "N", "BBB": "N", "FBS": 88, "CR": 0.8, "TG": 120,
            "LDL": 100, "HDL": 55.0, "BUN": 12, "ESR": 6, "HB": 13.5, "K": 4.2, "Na": 138,
            "WBC": 5500, "Lymph": 35, "Neut": 55, "PLT": 220, "EF-TTE": 60, "Region RWMA": 0, "VHD": "N"
        }
    }
    r = requests.post(
        f"{BASE_URL}/predict",
        json=patient2_data,
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert r.status_code == 200, f"Predict failed: {r.text}"
    patient2_res = r.json()
    p2_id = patient2_res["patient_id"]
    assert patient2_res["doctor_name"] == "Dr. Marcus Brody"
    print(f"Doctor 2 created Patient Beta (ID #{p2_id}) with attributed doctor: {patient2_res['doctor_name']}.")

    # 9. Verify Doctor 1 sees Patient Beta created by Doctor 2
    r = requests.get(f"{BASE_URL}/patients/{p2_id}", headers={"Authorization": f"Bearer {token1}"})
    assert r.status_code == 200
    report_data_beta = r.json()
    assert report_data_beta["doctor_name"] == "Dr. Marcus Brody"
    print(f"Verified: Doctor 1 can view Patient Beta with doctor: {report_data_beta['doctor_name']}.")

    print("\nALL MULTI-DOCTOR & REPORT ATTRIBUTION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
