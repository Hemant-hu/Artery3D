# Architecture

## 1. System Overview
The system will follow a client-server architecture. 
- **Frontend (Client):** A web application built with React and React Three Fiber (R3F) for rendering the 3D anatomical models and displaying the clinical dashboard.
- **Backend (Server/API):** A Python-based API (FastAPI) responsible for handling model inference, calculating SHAP values, and serving predictions to the frontend.

## 2. Components
### 2.1 Frontend (React + React Three Fiber)
- **3D Viewer Component:** Loads `.gltf`/`.glb` models, handles interactions (zoom, pan, rotate), and manages dynamic material/color updates based on risk scores.
- **Dashboard Component:** Displays numerical data, charts for feature importances, and patient input forms.
- **State Management:** Manages patient data inputs, model prediction results, and UI state.

### 2.2 Backend (Python + FastAPI)
- **Inference Engine:** Loads pre-trained ML models (e.g., Random Forest, XGBoost, or Neural Networks) using scikit-learn/PyTorch.
- **Explainability Module:** Uses SHAP or LIME to generate feature importance scores for a given prediction.
- **API Endpoints:** 
  - `POST /predict`: Accepts patient clinical features, returns predictions and SHAP values.

## 3. Data Flow
1. User (or automated system) inputs clinical data into the frontend.
2. Frontend sends a JSON payload to the Backend `/predict` endpoint.
3. Backend model predicts CAD and vessel-specific stenosis.
4. Backend explainability module computes feature contributions.
5. Backend responds with probabilities and explanations.
6. Frontend updates the 3D model colors (LAD, LCX, RCA nodes) and updates the dashboard charts.
