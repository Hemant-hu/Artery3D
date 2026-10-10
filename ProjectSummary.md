# Artery3D: Project Summary

## Overview
Artery3D is an advanced medical platform that bridges the gap between abstract machine learning cardiovascular predictions and intuitive clinical decision-making. By combining a predictive diagnostic pipeline trained on the Z-Alizadeh Sani dataset with interactive WebGL 3D anatomical modeling, Artery3D provides doctors and patients a literal window into their cardiovascular health.

---

## What We Have Done (Completed Milestones)

### 1. Machine Learning & Predictive Modeling
- **Data Preprocessing:** Implemented a robust data pipeline that separates features from targets, preventing data leakage. Applied `StandardScaler` to numerical features and `OneHotEncoder` to categorical features.
- **Model Training:** Successfully trained four independent Random Forest Classifiers to predict:
  1. Overall Coronary Artery Disease risk (`Cath`).
  2. Left Anterior Descending artery stenosis (`LAD`).
  3. Left Circumflex artery stenosis (`LCX`).
  4. Right Coronary Artery stenosis (`RCA`).
- **Explainability:** Integrated `shap.TreeExplainer` to extract feature importance and explain the reasoning behind every prediction.

### 2. Secure Backend Architecture (FastAPI)
- **Database Architecture:** Configured a local SQLite database (`artery.db`) using SQLAlchemy with two core models:
  - `User`: For storing registered Doctors.
  - `Patient`: For logging patient prediction data, tied relationally to a specific Doctor.
- **Authentication System:** Built a fully secure authentication flow using native `bcrypt` for password hashing and `PyJWT` for issuing JSON Web Tokens (JWT).
- **API Endpoints:**
  - `POST /register`: Allows new doctors to create an account.
  - `POST /token`: Authenticates doctors and issues an access token.
  - `POST /predict`: A protected endpoint that receives raw clinical data, runs the ML models, saves the patient record, and returns the probabilities and SHAP explanations.

### 3. Frontend & User Interface (React + Vite)
- **Routing Infrastructure:** Implemented `react-router-dom` to handle seamless Single Page Application (SPA) navigation across multiple pages.
- **Modern UI/UX Implementation:** Completely overhauled the UI to match a premium, bright, medical aesthetic using the `Montserrat` font, rounded cards, and clean layouts.
- **AI Asset Generation:** Generated and integrated high-quality, custom AI assets directly into the public folder (e.g., 3D robotic hearts, holograms, doctors, surgical rooms) to replace placeholders.
- **Developed Pages:**
  - `Home`, `About`, `Services`, `Doctors`, `Contact`: Static marketing and informational pages.
  - `Register`, `Login`: Fully styled authentication gateways.
  - `Dashboard`: The core protected workspace for doctors to input patient data and visualize results.

---

## What We Are Going To Do (Upcoming Milestones)

### 1. 3D Anatomical Rendering (Three.js / WebGL)
- **Mesh Loading:** Develop a robust React component utilizing `@react-three/fiber` and `@react-three/drei` to parse and render the 119 `.obj` mesh files (comprising the heart structure and vessels).
- **Interactive Visualization:** Allow the user (doctor) to rotate, zoom, and inspect the 3D heart model inside the `Dashboard`.

### 2. Frontend-to-Backend Integration
- **Form Wiring:** Connect the clinical data form on the `Dashboard` directly to the FastAPI `/predict` endpoint via secure authenticated `fetch` requests.
- **State Management:** Ensure that upon a successful prediction, the returned data (probabilities and SHAP values) is gracefully stored in React state.

### 3. Predictive Mapping (The Core Feature)
- **Visualizing Risk:** Dynamically map the ML predictions directly onto the 3D model. For example, if the `LAD` stenosis probability is > 70%, the specific `.obj` meshes corresponding to the Left Anterior Descending artery will glow red or change texture.
- **Data Display:** Build out the UI panels in the Dashboard to present the raw SHAP feature importances to the doctor (explaining *why* the model thinks the patient is at risk).
