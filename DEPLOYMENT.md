# 🚀 Artery3D Deployment Guide

This guide covers how to deploy the **Artery3D** full-stack cardiovascular diagnostics platform (FastAPI ML backend + React 3D frontend) to production.

---

## 📋 Architecture Overview
- **Backend**: Python 3.11 + FastAPI + Scikit-Learn/XGBoost/Lifelines ML Pipeline + SQLite Database (`backend/artery.db`).
- **Frontend**: React 18 + Vite + Three.js + Tailwind/CSS (`frontend/dist`).
- **Configuration**: Dynamic API switching via `VITE_API_URL`.

---

## 🌟 Option 1: Render (Recommended - Free & Easiest)
Deploy both the backend and frontend together using the pre-configured [`render.yaml`](render.yaml) blueprint.

### Step 1: Push your code to GitHub
Make sure all your latest changes are pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure production deployment"
git push origin main
```

### Step 2: Deploy on Render
1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in with GitHub.
2. Click **New +** > **Blueprint**.
3. Connect your repository: `https://github.com/Hemant-hu/Artery3D`.
4. Render will automatically detect [`render.yaml`](render.yaml) and configure two services:
   - **`artery3d-backend`** (Python Web Service running `uvicorn main:app --host 0.0.0.0 --port $PORT`)
   - **`artery3d-frontend`** (Static Site with SPA rewrites and connected `VITE_API_URL`)
5. Click **Apply**.
6. Once deployed, Render will provide live HTTPS URLs for both your backend API and frontend website!

---

## ⚡ Option 2: Vercel (Frontend) + Render (Backend)
Ideal if you want ultra-fast global CDN for the React frontend while running the Python ML models on Render.

### Step 1: Deploy Backend on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) > **New +** > **Web Service**.
2. Connect your `Artery3D` GitHub repository.
3. Configure:
   - **Name**: `artery3d-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Click **Create Web Service**.
5. Once live, copy your backend URL (e.g., `https://artery3d-backend.onrender.com`).

### Step 2: Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New...** > **Project**.
3. Select your `Artery3D` repository.
4. In the configuration settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
5. Expand **Environment Variables**:
   - Add `VITE_API_URL` = `https://artery3d-backend.onrender.com` (your Render backend URL)
6. Click **Deploy**.
7. Vercel will build and deploy your site with full client-side routing support (via [`frontend/vercel.json`](frontend/vercel.json)).

---

## 🚂 Option 3: Railway (Fullstack with Persistent Volume)
1. Go to [railway.app](https://railway.app/) and create a new project from your GitHub repo.
2. Add a service for `backend`:
   - Set Root Directory to `backend`.
   - Railway will detect `requirements.txt` and [`Procfile`](backend/Procfile).
3. Add a service for `frontend`:
   - Set Root Directory to `frontend`.
   - Set environment variable: `VITE_API_URL` to your backend's Railway URL.

---

## 🐳 Option 4: Docker & Self-Hosted VPS (DigitalOcean / AWS / GCP)
If deploying to a virtual private server with Docker:

```bash
# Clone the repository
git clone https://github.com/Hemant-hu/Artery3D.git
cd Artery3D

# Build and start both containers in background
docker compose up -d --build
```
- Frontend will be available at `http://your-server-ip:5173`
- Backend API will be available at `http://your-server-ip:8000`

---

## 🔒 Security & Environment Notes
- **Clinician Login Protection**: Patient data routes (`/dashboard`, `/new-patient`, `/report/:id`) remain strictly protected behind clinician authentication in production.
- **CORS**: The backend is configured to accept requests from your deployed frontend domain.
