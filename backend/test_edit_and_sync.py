import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_edit_and_risk_sync():
    print("Running CAD Risk Synchronization and Edit Option Integration Tests...")

    # 1. Login a doctor
    login_payload = {
        "doctor_name": "Dr. Sarah Connor",
        "email": "sarah.connor@hospital.org",
        "password": "Password123!"
    }
    r = requests.post(f"{BASE_URL}/login", json=login_payload)
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Doctor logged in successfully.")

    # 2. Get list of all patients (Dashboard endpoint)
    r = requests.get(f"{BASE_URL}/patients", headers=headers)
    assert r.status_code == 200, f"Get patients failed: {r.text}"
    patients = r.json()
    assert len(patients) > 0, "No patients found in DB."
    
    first_patient = patients[0]
    pid = first_patient["id"]
    dashboard_risk = first_patient["overall_risk"]
    print(f"Patient ID #{pid} ('{first_patient['patient_name']}'): Dashboard overall_risk = {dashboard_risk:.4f} ({(dashboard_risk * 100):.1f}%)")

    # 3. Get individual report for this patient (Report endpoint)
    r = requests.get(f"{BASE_URL}/patients/{pid}", headers=headers)
    assert r.status_code == 200, f"Get patient report failed: {r.text}"
    report_data = r.json()
    report_risk = report_data["prediction"]["overall_cad_risk"]
    report_overall = report_data.get("overall_risk", report_risk)
    print(f"Patient ID #{pid}: Report prediction.overall_cad_risk = {report_risk:.4f} ({(report_risk * 100):.1f}%)")

    # Verify they match
    diff = abs(dashboard_risk - report_risk)
    assert diff < 1e-4, f"Mismatch between Dashboard ({dashboard_risk}) and Report ({report_risk})!"
    print(f"Verified: Dashboard CAD Risk matches Report CAD Risk (Diff: {diff:.6f}).")

    # 4. Edit patient using PUT /patients/{pid}
    edit_payload = {
        "patient_name": f"{first_patient['patient_name']} (Clinical Update)",
        "age": 65,
        "sex": "Male",
        "clinical_data": {
            "Typical Chest Pain": 1,
            "St Elevation": 1,
            "BP": 150,
            "FBS": 140
        }
    }
    r = requests.put(f"{BASE_URL}/patients/{pid}", json=edit_payload, headers=headers)
    assert r.status_code == 200, f"PUT /patients/{pid} failed: {r.text}"
    update_res = r.json()
    new_risk = update_res["prediction"]["overall_cad_risk"]
    print(f"Successfully edited Patient ID #{pid} via PUT. New recalculated CAD risk = {new_risk:.4f} ({(new_risk * 100):.1f}%)")
    assert update_res["doctor_name"] == "Dr. Sarah Connor", f"Expected editing doctor attribution, got {update_res['doctor_name']}"

    # 5. Re-check /patients (Dashboard endpoint) to verify Dashboard reflects the new risk
    r = requests.get(f"{BASE_URL}/patients", headers=headers)
    assert r.status_code == 200
    updated_list = r.json()
    matching_p = next(p for p in updated_list if p["id"] == pid)
    new_dashboard_risk = matching_p["overall_risk"]
    print(f"Updated Dashboard risk for Patient #{pid}: {new_dashboard_risk:.4f} ({(new_dashboard_risk * 100):.1f}%)")

    diff_after_edit = abs(new_dashboard_risk - new_risk)
    assert diff_after_edit < 1e-4, f"Mismatch after edit: Dashboard ({new_dashboard_risk}) vs Report ({new_risk})!"
    print(f"Verified: After edit, Dashboard CAD Risk and Report CAD Risk remain 100% synchronized! (Diff: {diff_after_edit:.6f})")

    print("\nALL TESTS PASSED: Edit option and CAD risk synchronization are working perfectly!")

if __name__ == "__main__":
    test_edit_and_risk_sync()
