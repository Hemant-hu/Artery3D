# 🫀 Artery3D: Explainable AI & Interactive 3D Digital Twin for Coronary Artery Disease Diagnostics

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-00c853?style=for-the-badge&logo=render)](https://artery3d.onrender.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://artery3d-backend-brkm.onrender.com/docs)
[![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> **Multimodal AI Hackathon 2026 Submission**  
> *Transforming non-invasive cardiovascular risk estimation into spatial 3D anatomy, multi-vessel stenosis localization, transparent SHAP explainability, and real-time counterfactual clinical intervention simulation.*

---

## 🌐 Live System & Links
- **Live Web Application:** [https://artery3d.onrender.com](https://artery3d.onrender.com)
- **Live Backend API (Swagger UI):** [https://artery3d-backend-brkm.onrender.com/docs](https://artery3d-backend-brkm.onrender.com/docs)
- **Official Documentation (Word / Markdown):**  [`Artery3D_Project_Documentation_.docx`](Artery3D_Project_Documentation_.docx)


---

## 🌟 Key Features

1. **Multi-Target Coronary Stenosis Classification:**
   - Evaluates overall Coronary Artery Disease (`Cath`) risk alongside localized vessel stenosis in the **Left Anterior Descending (LAD)**, **Left Circumflex (LCX)**, and **Right Coronary Artery (RCA)**.
   - Reaches **93.44% Test Accuracy** and **0.9935 ROC-AUC** on LAD stenosis detection with strict **zero target-leakage** quarantine.

2. **Interactive 3D Anatomical Heart Digital Twin:**
   - WebGL & Three.js canvas featuring 360° rotational freedom, smooth orbit controls, and mesh raycasting.
   - Dynamic arterial color-mapping:
     - 🟢 **Green ($< 30\%$):** Normal / Minimal Stenosis
     - 🟡 **Yellow ($30\% - 50\%$):** Moderate Stenosis
     - 🔴 **Crimson Red ($\ge 50\%$):** Critical / Severe Stenosis with active sinusoidal pulsating alert.

3. **10-Year Longitudinal MACE Survival Prognosis:**
   - Elastic-Net penalized Cox Proportional Hazards engine projecting individualized time-to-event curves ($S(t)$ from 1 to 10 years).

4. **Transparent Explainable AI (SHAP):**
   - Game-theoretic feature attributions revealing exact mathematical contributions of key clinical markers (`Typical Chest Pain`, `ST Elevation`, `EF-TTE`, `Age`).

5. **Counterfactual Treatment Intervention Simulator:**
   - Real-time clinical sandbox allowing physicians to adjust blood pressure, statin/LDL therapy, smoking cessation, and BMI to view instantaneous risk reduction and dynamic 3D heart recoloring.

6. **Clinician Security & Hospital PDF Export:**
   - Role-based protected routes guarding patient cohorts behind JWT authentication.
   - 1-click printable hospital consultation PDF reports.

---

## 🏗️ System Architecture

```text
[Raw Clinical Patient Features (54 Inputs)]
                 │
                 ▼
[Preprocessing & Feature Standardizer]
                 │
    ┌────────────┼────────────┬────────────┐
    ▼            ▼            ▼            ▼
[Overall CAD]   [LAD]        [LCX]        [RCA]
  Ensemble     CatBoost     Balanced     XGBoost
 Classifier   Classifier    Ensemble     Ensemble
    │            │            │            │
    └────────────┼────────────┴────────────┘
                 │
                 ▼
    [Dynamic Vessel Probabilities]
                 │
                 ├──────────────────────────────┐
                 ▼                              ▼
    [Three.js 3D Heart Mesh]        [10-Year MACE Survival]
    Green / Yellow / Crimson         Cox Elastic-Net Curve
```

---

## 📊 Quantitative Model Performance

Trained and cross-validated on the **Z-Alizadeh Sani Cardiovascular Dataset** ($N = 303$, 54 physiological features):

| Target Task | Primary Architecture | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
|:---|:---|:---:|:---:|:---:|:---:|
| **LAD Stenosis** | Tuned CatBoost / XGBoost | **93.44%** | **94.7%** | **94.7%** | **0.9474** | **0.9935** |
| **Overall CAD** | Stacking Ensemble | **86.89%** | **88.1%** | **92.5%** | **0.9024** | **0.9412** |
| **RCA Stenosis** | Regularized XGBoost | **80.33%** | **77.8%** | **77.8%** | **0.7778** | **0.8846** |
| **LCX Stenosis** | Balanced Random Forest | **72.13%** | **63.6%** | **58.3%** | **0.6087** | **0.7725** |
| **10-Yr MACE** | Cox Elastic-Net Hazard | — | — | — | **C-Index: 0.784** | **0.826** |

---

## 💻 Prerequisites & Dependencies

### System Requirements
- **Python:** 3.10 or 3.11
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **npm:** v9.0.0 or higher
- **Git**

### Core Dependencies
- **Backend:** `fastapi`, `uvicorn`, `scikit-learn`, `xgboost`, `catboost`, `lifelines`, `shap`, `sqlalchemy`, `pyjwt`, `bcrypt`, `python-multipart`.
- **Frontend:** `react`, `react-dom`, `react-router-dom`, `three`, `@react-three/fiber`, `lucide-react`, `jspdf`, `html2canvas`, `vite`.

---

## 🚀 Quickstart: Running Locally

### 1. Clone the Repository
```bash
git clone https://github.com/Hemant-hu/Artery3D.git
cd Artery3D
```

### 2. Set Up & Start the Backend
```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn main:app --reload --port 8000
```
Backend API will be accessible at `http://127.0.0.1:8000` (Interactive docs at `http://127.0.0.1:8000/docs`).

### 3. Set Up & Start the Frontend
In a new terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
Open your browser and navigate to `http://localhost:5173/`.

---

## 🐳 Docker Deployment

To spin up the entire full-stack application with a single command:
```bash
# From project root
docker compose up -d --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

---

## 🔒 Security & Privacy Flow
- Unauthenticated visitors land strictly on the public **Home Page** (`/`).
- Accessing patient hemodynamic assessments (`/dashboard`, `/new-patient`, `/report/:id`) requires clinician credentials via bcrypt JWT authentication.
- Demo physician login credentials (seeded):
  - **Email:** `dr.smith@hospital.com`
  - **Password:** `password123`
  - **Doctor Name:** `Dr. Sarah Smith`
  *(Or register a new physician account on the `/register` page).*

---

## ⚠️ Clinical Safety Disclaimer
> **Clinical Decision Support Notice:** Predictions generated by Artery3D are intended solely for clinical decision support and educational research. They do **not** constitute a formal medical diagnosis and are not a substitute for diagnostic coronary angiography, computed tomography angiography (CTA), or the clinical judgment of an attending board-certified cardiologist.
